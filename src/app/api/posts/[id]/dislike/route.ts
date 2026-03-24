/**
 * 게시글 비추천 API
 * POST: 비추천 토글
 * - 비추천 20개 이상 누적 시 게시글 자동 숨김(is_hidden=true)
 *
 * 보안: 세션 기반 인증, Rate Limiting, VPN 차단
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, getAuthUser } from "@/lib/supabase-server";
import {
    getClientIP,
    checkRateLimit,
    getRateLimitHeaders,
    checkVPN,
    getVPNBlockResponse
} from "@/lib/rate-limit";
import { MODERATION } from "@/config/constants";

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

        const supabase = await createServerSupabase();
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
            .single();

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

            // 글쓴이 포인트 차감 (-5P, 자기 글 제외는 위에서 이미 검증)
            if (postData && postData.user_id !== userId) {
                try {
                    await supabase.rpc("increment_user_points", {
                        p_user_id: postData.user_id,
                        p_action_type: "receive_dislike",
                        p_points: -5,
                        p_daily_cap: null,
                        p_one_time: false,
                        p_metadata: { postId },
                    });
                } catch {
                    // 포인트 차감 실패해도 비추천은 정상 처리
                }
            }
        }

        // post_dislikes에서 실제 카운트 집계
        const { count: dislikesCount } = await supabase
            .from("post_dislikes")
            .select("id", { count: "exact", head: true })
            .eq("post_id", postId);

        const finalCount = dislikesCount || 0;

        // community_posts.dislikes 동기화
        const updateData: Record<string, unknown> = { dislikes: finalCount };

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
        });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
