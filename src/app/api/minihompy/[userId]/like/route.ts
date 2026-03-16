/**
 * 미니홈피 좋아요 API
 * POST: 좋아요 토글 (insert-first 패턴으로 race condition 방지)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, getAuthUser } from "@/lib/supabase-server";
import { getClientIP, checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { PG_ERROR_CODES } from "@/config/constants";

export const dynamic = "force-dynamic";

/** 좋아요 수 카운트 후 settings 업데이트, 카운트 반환 */
async function refreshLikeCount(
    supabase: Awaited<ReturnType<typeof createServerSupabase>>,
    ownerId: string,
): Promise<number> {
    const { count } = await supabase
        .from("minihompy_likes")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", ownerId);

    const total = count ?? 0;

    await supabase
        .from("minihompy_settings")
        .update({ total_likes: total })
        .eq("user_id", ownerId);

    return total;
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const clientIP = await getClientIP();
        const rateLimit = checkRateLimit(clientIP, "general");
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "요청이 너무 많습니다." },
                { status: 429, headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn) }
            );
        }

        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
        }

        const { userId } = await params;

        // 자기 미니홈피 좋아요 불가
        if (user.id === userId) {
            return NextResponse.json({ error: "자신의 미니홈피에는 좋아요를 할 수 없습니다" }, { status: 400 });
        }

        const supabase = await createServerSupabase();

        // Insert-first: UNIQUE 제약 조건이 중복을 막아줌
        const { error: insertError } = await supabase
            .from("minihompy_likes")
            .insert({ owner_id: userId, user_id: user.id });

        if (!insertError) {
            // 새 좋아요 성공
            const totalLikes = await refreshLikeCount(supabase, userId);
            return NextResponse.json({ liked: true, totalLikes });
        }

        if (insertError.code === PG_ERROR_CODES.UNIQUE_VIOLATION) {
            // 이미 좋아요 상태 → 취소 (토글)
            await supabase
                .from("minihompy_likes")
                .delete()
                .eq("owner_id", userId)
                .eq("user_id", user.id);

            const totalLikes = await refreshLikeCount(supabase, userId);
            return NextResponse.json({ liked: false, totalLikes });
        }

        // 기타 DB 에러
        return NextResponse.json({ error: "좋아요 실패" }, { status: 500 });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
