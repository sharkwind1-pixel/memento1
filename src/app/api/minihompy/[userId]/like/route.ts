/**
 * 미니홈피 좋아요 API
 * POST: 좋아요 토글
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase, getAuthUser } from "@/lib/supabase-server";
import { getClientIP, checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { PG_ERROR_CODES } from "@/config/constants";

export const dynamic = "force-dynamic";

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
            return NextResponse.json({ error: "자신의 펫홈에는 좋아요를 할 수 없습니다" }, { status: 400 });
        }

        const supabase = await createServerSupabase();
        // 카운트 집계/settings 갱신용 — 세션(RLS) 클라로는 settings UPDATE(owner-only)가 silent fail이라
        // total_likes가 영원히 0이던 잠복버그(visit 카운터와 동일 패턴). 본인 like 행 조작은 세션 클라 유지.
        const admin = createAdminSupabase();

        // 기존 좋아요 확인
        const { data: existing } = await supabase
            .from("minihompy_likes")
            .select("id")
            .eq("owner_id", userId)
            .eq("user_id", user.id)
            .maybeSingle();

        if (existing) {
            // 좋아요 취소
            await supabase
                .from("minihompy_likes")
                .delete()
                .eq("id", existing.id);

            // 직접 카운트 업데이트 (admin + upsert — settings 행 없는 유저도 반영, RLS 무관 정확 집계)
            const { count } = await admin
                .from("minihompy_likes")
                .select("id", { count: "exact", head: true })
                .eq("owner_id", userId);

            await admin
                .from("minihompy_settings")
                .upsert({ user_id: userId, total_likes: count || 0 }, { onConflict: "user_id" });

            return NextResponse.json({ liked: false, totalLikes: count || 0 });
        } else {
            // 좋아요 추가
            const { error: insertError } = await supabase
                .from("minihompy_likes")
                .insert({
                    owner_id: userId,
                    user_id: user.id,
                });

            if (insertError) {
                if (insertError.code === PG_ERROR_CODES.UNIQUE_VIOLATION) {
                    return NextResponse.json({ error: "이미 좋아요를 눌렀습니다" }, { status: 400 });
                }
                return NextResponse.json({ error: "좋아요 실패" }, { status: 500 });
            }

            // 직접 카운트 업데이트 (admin + upsert — settings 행 없는 유저도 반영, RLS 무관 정확 집계)
            const { count } = await admin
                .from("minihompy_likes")
                .select("id", { count: "exact", head: true })
                .eq("owner_id", userId);

            await admin
                .from("minihompy_settings")
                .upsert({ user_id: userId, total_likes: count || 0 }, { onConflict: "user_id" });

            return NextResponse.json({ liked: true, totalLikes: count || 0 });
        }
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
