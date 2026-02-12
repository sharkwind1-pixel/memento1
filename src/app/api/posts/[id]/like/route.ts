/**
 * 게시글 좋아요 API
 * POST: 좋아요 토글
 *
 * 보안: 세션 기반 인증, Rate Limiting, VPN 차단
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabase, getAuthUser } from "@/lib/supabase-server";
import { awardPoints } from "@/lib/points";
import {
    getClientIP,
    checkRateLimit,
    getRateLimitHeaders,
    checkVPN,
    getVPNBlockResponse
} from "@/lib/rate-limit";

function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Supabase 환경변수 없음");
    return createClient(url, key);
}

export const dynamic = "force-dynamic";

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
            console.warn(`[Security] VPN blocked on like: ${clientIP} - ${vpnCheck.reason}`);
            return NextResponse.json(getVPNBlockResponse(), { status: 403 });
        }

        // 3. 세션 기반 인증 (body에서 userId 받지 않음!)
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
        }

        const supabase = await createServerSupabase();
        const { id: postId } = await params;
        const userId = user.id;  // 세션에서 가져온 안전한 userId

        // 이미 좋아요 했는지 확인
        const { data: existing } = await supabase
            .from("post_likes")
            .select("id")
            .eq("post_id", postId)
            .eq("user_id", userId)
            .single();

        let liked: boolean;

        if (existing) {
            // 좋아요 취소
            await supabase
                .from("post_likes")
                .delete()
                .eq("post_id", postId)
                .eq("user_id", userId);

            // 카운트 감소
            await supabase
                .from("community_posts")
                .update({ likes: supabase.rpc("decrement_like", { x: 1 }) })
                .eq("id", postId);

            // 직접 업데이트 (RPC 없을 경우)
            const { data: post } = await supabase
                .from("community_posts")
                .select("likes")
                .eq("id", postId)
                .single();

            if (post) {
                await supabase
                    .from("community_posts")
                    .update({ likes: Math.max(0, (post.likes || 1) - 1) })
                    .eq("id", postId);
            }

            liked = false;
        } else {
            // 좋아요 추가
            await supabase
                .from("post_likes")
                .insert([{ post_id: postId, user_id: userId }]);

            // 카운트 증가
            const { data: post } = await supabase
                .from("community_posts")
                .select("likes")
                .eq("id", postId)
                .single();

            if (post) {
                await supabase
                    .from("community_posts")
                    .update({ likes: (post.likes || 0) + 1 })
                    .eq("id", postId);
            }

            liked = true;

            // 글쓴이에게 포인트 적립 (자기 글 좋아요 제외)
            try {
                const { data: postData } = await supabase
                    .from("community_posts")
                    .select("user_id")
                    .eq("id", postId)
                    .single();

                if (postData && postData.user_id !== userId) {
                    const pointsSupabase = getSupabase();
                    await awardPoints(pointsSupabase, postData.user_id, "receive_like", { postId });
                }
            } catch {
                // 포인트 적립 실패 무시
            }
        }

        // 현재 좋아요 수 가져오기
        const { data: updatedPost } = await supabase
            .from("community_posts")
            .select("likes")
            .eq("id", postId)
            .single();

        return NextResponse.json({
            liked,
            likes: updatedPost?.likes || 0,
        });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
