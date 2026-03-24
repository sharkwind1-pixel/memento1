/**
 * 댓글 비추천 API
 * POST: 비추천 토글 + 작성자 포인트 차감(-2P)
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

        const supabase = await createServerSupabase();
        const { id: commentId } = await params;
        const userId = user.id;

        // 이미 비추천 했는지 확인
        const { data: existing } = await supabase
            .from("comment_dislikes")
            .select("id")
            .eq("comment_id", commentId)
            .eq("user_id", userId)
            .single();

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
                        p_points: -2,
                        p_daily_cap: null,
                        p_one_time: false,
                        p_metadata: { commentId },
                    });
                }
            } catch { /* 무시 */ }
        }

        // 실제 카운트
        const { count } = await supabase
            .from("comment_dislikes")
            .select("id", { count: "exact", head: true })
            .eq("comment_id", commentId);

        // post_comments.dislikes 동기화
        await supabase
            .from("post_comments")
            .update({ dislikes: count || 0 })
            .eq("id", commentId);

        return NextResponse.json({ disliked, dislikes: count || 0 });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
