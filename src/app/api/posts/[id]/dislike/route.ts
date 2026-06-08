/**
 * 게시글 비추천 API
 * POST: 비추천 토글
 * - 비추천 20개 이상 누적 시 게시글 자동 숨김(is_hidden=true)
 *
 * 보안: 세션 기반 인증, Rate Limiting, VPN 차단
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, getAuthUser } from "@/lib/supabase-server";
import {
    getClientIP,
    checkRateLimit,
    getRateLimitHeaders,
    checkVPN,
    getVPNBlockResponse
} from "@/lib/rate-limit";
import { MODERATION } from "@/config/constants";
import { awardPoints } from "@/lib/points";

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
            return NextResponse.json(getVPNBlockResponse(), { status: 403 });
        }

        // 3. 세션 기반 인증
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
        }

        const supabase = createAdminSupabase();
        const { id: postId } = await params;
        const userId = user.id;

        // 자기 글 비추천 방지
        const { data: postData } = await supabase
            .from("community_posts")
            .select("user_id")
            .eq("id", postId)
            .single();

        if (postData && postData.user_id === userId) {
            return NextResponse.json({ error: "자신의 글에는 비추천할 수 없습니다" }, { status: 400 });
        }

        // 이미 비추천 했는지 확인
        const { data: existing } = await supabase
            .from("post_dislikes")
            .select("id")
            .eq("post_id", postId)
            .eq("user_id", userId)
            .maybeSingle();

        let disliked: boolean;

        if (existing) {
            // 비추천 취소
            await supabase
                .from("post_dislikes")
                .delete()
                .eq("post_id", postId)
                .eq("user_id", userId);
            disliked = false;
        } else {
            // 비추천 추가
            await supabase
                .from("post_dislikes")
                .insert([{ post_id: postId, user_id: userId }]);
            disliked = true;

            // 상호 배타: 같은 글에 기존 좋아요가 있으면 해제 (좋아요/비추천 동시 활성 방지)
            await supabase
                .from("post_likes")
                .delete()
                .eq("post_id", postId)
                .eq("user_id", userId);

            // 글쓴이 포인트 차감 (-5P, 자기 글 제외는 위에서 이미 검증)
            // awardPoints 헬퍼 사용 (lib/points.ts) — POINTS.ACTIONS.receive_dislike = -5
            if (postData && postData.user_id !== userId) {
                await awardPoints(supabase, postData.user_id, "receive_dislike", { postId });
            }
        }

        // 양쪽 카운트 재집계 + 현재 유저의 좋아요 상태 (상호 배타 후 정확한 값으로 클라이언트 보정)
        const [{ count: dislikesCount }, { count: likesCount }, { data: likeRow }] = await Promise.all([
            supabase.from("post_dislikes").select("id", { count: "exact", head: true }).eq("post_id", postId),
            supabase.from("post_likes").select("id", { count: "exact", head: true }).eq("post_id", postId),
            supabase.from("post_likes").select("id").eq("post_id", postId).eq("user_id", userId).maybeSingle(),
        ]);

        const finalCount = dislikesCount || 0;

        // community_posts.dislikes/likes 동기화 (좋아요도 같이 변할 수 있으므로 양쪽 sync)
        const updateData: Record<string, unknown> = { dislikes: finalCount, likes: likesCount || 0 };

        // 비추천 임계값 이상이면 자동 숨김
        if (finalCount >= MODERATION.AUTO_HIDE_DISLIKE_THRESHOLD) {
            updateData.is_hidden = true;
            updateData.moderation_status = "rejected";
            updateData.moderation_reason = `비추천 ${finalCount}개 누적 자동 숨김`;
        }

        await supabase
            .from("community_posts")
            .update(updateData)
            .eq("id", postId);

        return NextResponse.json({
            disliked,
            dislikes: finalCount,
            liked: !!likeRow,
            likes: likesCount || 0,
        });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
