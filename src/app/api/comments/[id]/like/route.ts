/**
 * 댓글 좋아요 API
 * POST: 좋아요 토글 + 작성자 포인트 적립(+2P)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, getAuthUser } from "@/lib/supabase-server";
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

        // 이미 좋아요 했는지 확인
        const { data: existing } = await supabase
            .from("comment_likes")
            .select("id")
            .eq("comment_id", commentId)
            .eq("user_id", userId)
            .single();

        let liked: boolean;

        if (existing) {
            await supabase
                .from("comment_likes")
                .delete()
                .eq("comment_id", commentId)
                .eq("user_id", userId);
            liked = false;
        } else {
            await supabase
                .from("comment_likes")
                .insert([{ comment_id: commentId, user_id: userId }]);
            liked = true;

            // 댓글 작성자에게 포인트 적립
            try {
                const { data: comment } = await supabase
                    .from("post_comments")
                    .select("user_id")
                    .eq("id", commentId)
                    .single();
                if (comment && comment.user_id !== userId) {
                    await awardPoints(supabase, comment.user_id, "receive_like", { commentId });
                }
            } catch { /* 무시 */ }
        }

        // 실제 카운트
        const { count } = await supabase
            .from("comment_likes")
            .select("id", { count: "exact", head: true })
            .eq("comment_id", commentId);

        // post_comments.likes 동기화
        await supabase
            .from("post_comments")
            .update({ likes: count || 0 })
            .eq("id", commentId);

        return NextResponse.json({ liked, likes: count || 0 });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
