/**
 * 댓글 비추천 API
 * POST: 비추천 토글 + 작성자 포인트 차감(-2P)
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

export const dynamic = "force-dynamic";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const clientIP = await getClientIP();
        const rateLimit = checkRateLimit(clientIP, "write");
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "요청이 너무 많습니다." },
                { status: 429, headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn) }
            );
        }

        const vpnCheck = await checkVPN(clientIP);
        if (vpnCheck.blocked) {
            return NextResponse.json(getVPNBlockResponse(), { status: 403 });
        }

        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
        }

        // admin 클라이언트로 RLS 우회 (인증은 getAuthUser로 검증됨).
        // 세션(RLS) 클라이언트는 post_comments.dislikes 동기화가 "작성자만" 정책에 막혀 stored가 stale가 됨.
        const supabase = createAdminSupabase();
        const { id: commentId } = await params;
        const userId = user.id;

        // 이미 비추천 했는지 확인
        const { data: existing } = await supabase
            .from("comment_dislikes")
            .select("id")
            .eq("comment_id", commentId)
            .eq("user_id", userId)
            .maybeSingle();

        let disliked: boolean;

        if (existing) {
            await supabase
                .from("comment_dislikes")
                .delete()
                .eq("comment_id", commentId)
                .eq("user_id", userId);
            disliked = false;
        } else {
            await supabase
                .from("comment_dislikes")
                .insert([{ comment_id: commentId, user_id: userId }]);
            disliked = true;

            // 상호 배타: 같은 댓글에 기존 좋아요가 있으면 해제 (좋아요/비추천 동시 활성 방지)
            await supabase
                .from("comment_likes")
                .delete()
                .eq("comment_id", commentId)
                .eq("user_id", userId);

            // 댓글 작성자 포인트 차감
            try {
                const { data: comment } = await supabase
                    .from("post_comments")
                    .select("user_id")
                    .eq("id", commentId)
                    .single();
                if (comment && comment.user_id !== userId) {
                    await supabase.rpc("increment_user_points", {
                        p_user_id: comment.user_id,
                        p_action_type: "receive_dislike",
                        p_points: -5,
                        p_daily_cap: null,
                        p_one_time: false,
                        p_metadata: { commentId },
                    });
                }
            } catch { /* 무시 */ }
        }

        // 양쪽 카운트 재집계 + 현재 유저의 좋아요 상태
        const [{ count: dislikeCount }, { count: likeCount }, { data: likeRow }] = await Promise.all([
            supabase.from("comment_dislikes").select("id", { count: "exact", head: true }).eq("comment_id", commentId),
            supabase.from("comment_likes").select("id", { count: "exact", head: true }).eq("comment_id", commentId),
            supabase.from("comment_likes").select("id").eq("comment_id", commentId).eq("user_id", userId).maybeSingle(),
        ]);

        // post_comments.dislikes/likes 동기화 (좋아요도 같이 변할 수 있으므로 양쪽 sync)
        await supabase
            .from("post_comments")
            .update({ dislikes: dislikeCount || 0, likes: likeCount || 0 })
            .eq("id", commentId);

        return NextResponse.json({
            disliked,
            dislikes: dislikeCount || 0,
            liked: !!likeRow,
            likes: likeCount || 0,
        });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
