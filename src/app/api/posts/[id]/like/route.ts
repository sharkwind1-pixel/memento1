/**
 * 게시글 좋아요 API
 * POST: 좋아요 토글
 *
 * 보안: 세션 기반 인증, Rate Limiting, VPN 차단
 * 수정: 이중 감소 버그 제거, post_likes count 기반 정확한 집계
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, getAuthUser } from "@/lib/supabase-server";
import { awardPoints } from "@/lib/points";
import {
    getClientIP,
    checkRateLimit,
    getRateLimitHeaders,
    checkVPN,
    getVPNBlockResponse
} from "@/lib/rate-limit";

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

        const supabase = createAdminSupabase();
        const { id: postId } = await params;
        const userId = user.id;  // 세션에서 가져온 안전한 userId

        // 이미 좋아요 했는지 확인
        const { data: existing } = await supabase
            .from("post_likes")
            .select("id")
            .eq("post_id", postId)
            .eq("user_id", userId)
            .maybeSingle();

        let liked: boolean;

        if (existing) {
            // 좋아요 취소: 레코드 삭제
            await supabase
                .from("post_likes")
                .delete()
                .eq("post_id", postId)
                .eq("user_id", userId);

            liked = false;
        } else {
            // 좋아요 추가: 레코드 삽입
            await supabase
                .from("post_likes")
                .insert([{ post_id: postId, user_id: userId }]);

            liked = true;

            // 상호 배타: 같은 글에 기존 비추천이 있으면 해제 (좋아요/비추천 동시 활성 방지).
            // 서버가 반대 반응을 지우지 않으면 GET 재계산 시 비추천이 부활해 클라이언트 낙관적 해제가 되돌아감.
            await supabase
                .from("post_dislikes")
                .delete()
                .eq("post_id", postId)
                .eq("user_id", userId);

            // 글쓴이에게 포인트 적립 (자기 글 좋아요 제외)
            try {
                const { data: postData } = await supabase
                    .from("community_posts")
                    .select("user_id")
                    .eq("id", postId)
                    .single();

                if (postData && postData.user_id !== userId) {
                    await awardPoints(supabase, postData.user_id, "receive_like", { postId });
                }
            } catch {
                // 포인트 적립 실패 무시
            }
        }

        // 양쪽 카운트 재집계 + 현재 유저의 비추천 상태 (상호 배타 후 정확한 값으로 클라이언트 보정)
        const [{ count: likesCount }, { count: dislikesCount }, { data: dislikeRow }] = await Promise.all([
            supabase.from("post_likes").select("id", { count: "exact", head: true }).eq("post_id", postId),
            supabase.from("post_dislikes").select("id", { count: "exact", head: true }).eq("post_id", postId),
            supabase.from("post_dislikes").select("id").eq("post_id", postId).eq("user_id", userId).maybeSingle(),
        ]);

        // community_posts.likes/dislikes 동기화 (비추천도 같이 변할 수 있으므로 양쪽 sync)
        await supabase
            .from("community_posts")
            .update({ likes: likesCount || 0, dislikes: dislikesCount || 0 })
            .eq("id", postId);

        return NextResponse.json({
            liked,
            likes: likesCount || 0,
            disliked: !!dislikeRow,
            dislikes: dislikesCount || 0,
        });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
