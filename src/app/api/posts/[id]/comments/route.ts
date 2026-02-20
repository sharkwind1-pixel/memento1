/**
 * 댓글 API
 * POST: 댓글 작성 + 포인트 적립
 *
 * 보안: 세션 기반 인증, Rate Limiting, VPN 차단, 입력값 검증
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, getAuthUser } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { awardPoints } from "@/lib/points";
import {
    getClientIP,
    checkRateLimit,
    getRateLimitHeaders,
    sanitizeInput,
    checkVPN,
    getVPNBlockResponse,
} from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function getPointsSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return createClient(url, key);
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // 1. Rate Limit 체크
        const clientIP = await getClientIP();
        const rateLimit = checkRateLimit(clientIP, "write");
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
                { status: 429, headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn) }
            );
        }

        // 2. VPN 체크
        const vpnCheck = await checkVPN(clientIP);
        if (vpnCheck.blocked) {
            return NextResponse.json(getVPNBlockResponse(), { status: 403 });
        }

        // 3. 세션 기반 인증
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
        }

        const supabase = await createServerSupabase();
        const { id: postId } = await params;
        const body = await request.json();
        const { content } = body;

        // 4. 입력값 검증
        if (!content || typeof content !== "string" || content.trim().length === 0) {
            return NextResponse.json({ error: "댓글 내용을 입력해주세요" }, { status: 400 });
        }

        const sanitizedContent = sanitizeInput(content).slice(0, 2000);

        // 5. 게시글 존재 확인
        const { data: post, error: postError } = await supabase
            .from("community_posts")
            .select("id")
            .eq("id", postId)
            .single();

        if (postError || !post) {
            return NextResponse.json({ error: "게시글을 찾을 수 없습니다" }, { status: 404 });
        }

        // 6. 프로필에서 닉네임 가져오기
        const { data: profile } = await supabase
            .from("profiles")
            .select("nickname, avatar_url")
            .eq("id", user.id)
            .single();

        // 7. 댓글 저장
        const { data: comment, error: commentError } = await supabase
            .from("post_comments")
            .insert([{
                post_id: postId,
                user_id: user.id,
                content: sanitizedContent,
                author_nickname: profile?.nickname || "익명",
                author_avatar: profile?.avatar_url || null,
            }])
            .select()
            .single();

        if (commentError) {
            console.error("[Comments] 댓글 저장 실패:", commentError.message);
            return NextResponse.json({ error: "댓글 작성에 실패했습니다" }, { status: 500 });
        }

        // 8. 게시글 댓글 수 증가
        try {
            const { error: rpcErr } = await supabase.rpc("increment_field", {
                table_name: "community_posts",
                field_name: "comments",
                row_id: postId,
                amount: 1,
            });
            if (rpcErr) {
                // RPC 없으면 현재 값 조회 후 +1
                const { data: currentPost } = await supabase
                    .from("community_posts")
                    .select("comments")
                    .eq("id", postId)
                    .single();
                await supabase
                    .from("community_posts")
                    .update({ comments: ((currentPost as { comments?: number })?.comments || 0) + 1 })
                    .eq("id", postId);
            }
        } catch {
            // 댓글 수 증가 실패해도 댓글 자체는 저장됨
        }

        // 9. 포인트 적립: 댓글 작성 (+3P, 일 50회 상한)
        const pointsSb = getPointsSupabase();
        if (pointsSb) {
            awardPoints(pointsSb, user.id, "write_comment", { postId }).catch(() => {});
        }

        return NextResponse.json({
            comment: {
                id: comment.id,
                postId: comment.post_id,
                userId: comment.user_id,
                content: comment.content,
                authorNickname: comment.author_nickname,
                authorAvatar: comment.author_avatar,
                createdAt: comment.created_at,
            },
        });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
