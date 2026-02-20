/**
 * 배경 구매 API
 * POST: 배경 테마 구매 (포인트 차감)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, getAuthUser } from "@/lib/supabase-server";
import { getClientIP, checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { BACKGROUND_CATALOG, findBackground } from "@/data/minihompyBackgrounds";
import { PG_ERROR_CODES } from "@/config/constants";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        const clientIP = await getClientIP();
        const rateLimit = checkRateLimit(clientIP, "write");
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
                { status: 429, headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn) }
            );
        }

        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
        }

        const body = await request.json();
        const { slug } = body;

        if (!slug) {
            return NextResponse.json({ error: "배경을 선택해주세요" }, { status: 400 });
        }

        // 배경 검증
        const bg = findBackground(slug);
        if (!bg) {
            return NextResponse.json({ error: "존재하지 않는 배경입니다" }, { status: 400 });
        }

        if (bg.price === 0) {
            return NextResponse.json({ error: "무료 배경은 구매할 필요 없습니다" }, { status: 400 });
        }

        const supabase = await createServerSupabase();

        // 중복 구매 체크
        const { data: existing } = await supabase
            .from("minihompy_user_backgrounds")
            .select("id")
            .eq("user_id", user.id)
            .eq("background_slug", slug)
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ error: "이미 보유한 배경입니다" }, { status: 400 });
        }

        // 포인트 확인 + 차감 (Race Condition 방지)
        const { data: profile } = await supabase
            .from("profiles")
            .select("points")
            .eq("id", user.id)
            .single();

        if (!profile || (profile.points || 0) < bg.price) {
            return NextResponse.json({ error: "포인트가 부족합니다" }, { status: 400 });
        }

        const { data: updated, error: updateError } = await supabase
            .from("profiles")
            .update({ points: (profile.points || 0) - bg.price })
            .eq("id", user.id)
            .gte("points", bg.price)
            .select("points")
            .single();

        if (updateError || !updated) {
            return NextResponse.json({ error: "포인트가 부족합니다" }, { status: 400 });
        }

        // 배경 추가
        const { error: insertError } = await supabase
            .from("minihompy_user_backgrounds")
            .insert({
                user_id: user.id,
                background_slug: slug,
                purchase_price: bg.price,
            });

        if (insertError) {
            if (insertError.code === PG_ERROR_CODES.UNIQUE_VIOLATION) {
                // 이미 보유 → 포인트 복구
                await supabase
                    .from("profiles")
                    .update({ points: (updated.points || 0) + bg.price })
                    .eq("id", user.id);
                return NextResponse.json({ error: "이미 보유한 배경입니다" }, { status: 400 });
            }

            // 기타 에러 → 포인트 복구
            await supabase
                .from("profiles")
                .update({ points: (updated.points || 0) + bg.price })
                .eq("id", user.id);
            return NextResponse.json({ error: "구매에 실패했습니다" }, { status: 500 });
        }

        // 거래 내역 기록
        await supabase.from("point_transactions").insert({
            user_id: user.id,
            action_type: "bg_purchase",
            points_earned: -bg.price,
            metadata: { slug, name: bg.name },
        });

        return NextResponse.json({
            success: true,
            remainingPoints: updated.points,
            message: `${bg.name} 배경을 구매했습니다!`,
        });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
