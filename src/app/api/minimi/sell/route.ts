/**
 * 미니미 되팔기 API
 * POST: 보유한 캐릭터를 1/3 가격에 되팔기
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, getAuthUser } from "@/lib/supabase-server";
import { getClientIP, checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { CHARACTER_CATALOG } from "@/data/minimiPixels";
import { MINIMI } from "@/config/constants";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        // 1. Rate Limit
        const clientIP = await getClientIP();
        const rateLimit = checkRateLimit(clientIP, "write");
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
                { status: 429, headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn) }
            );
        }

        // 2. 인증
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
        }

        const body = await request.json();
        const { type, itemSlug } = body;

        if (!type || !itemSlug) {
            return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 });
        }

        if (type !== "character") {
            return NextResponse.json({ error: "잘못된 아이템 유형입니다" }, { status: 400 });
        }

        const supabase = await createServerSupabase();

        // 캐릭터 되팔기
        const character = CHARACTER_CATALOG.find(c => c.slug === itemSlug);
        if (!character) {
            return NextResponse.json({ error: "존재하지 않는 캐릭터입니다" }, { status: 400 });
        }
        const itemName = character.name;
        const resellPrice = Math.ceil(character.price * MINIMI.RESELL_RATIO);

        // 보유 확인
        const { data: owned } = await supabase
            .from("user_minimi")
            .select("id")
            .eq("user_id", user.id)
            .eq("minimi_id", itemSlug)
            .maybeSingle();

        if (!owned) {
            return NextResponse.json({ error: "보유하지 않은 캐릭터입니다" }, { status: 400 });
        }

        // 장착 중이면 해제
        const { data: profile } = await supabase
            .from("profiles")
            .select("equipped_minimi_id")
            .eq("id", user.id)
            .single();

        if (profile?.equipped_minimi_id === itemSlug) {
            await supabase
                .from("profiles")
                .update({
                    equipped_minimi_id: null,
                    minimi_pixel_data: null,
                })
                .eq("id", user.id);
        }

        // 삭제
        const { error: deleteError } = await supabase
            .from("user_minimi")
            .delete()
            .eq("user_id", user.id)
            .eq("minimi_id", itemSlug);

        if (deleteError) {
            return NextResponse.json({ error: "되팔기에 실패했습니다" }, { status: 500 });
        }

        // 포인트 환급
        const { error: pointError } = await supabase.rpc("increment_field", {
            table_name: "profiles",
            field_name: "points",
            row_id: user.id,
            amount: resellPrice,
        });

        // RPC 실패 시 수동 업데이트
        let remainingPoints = 0;
        if (pointError) {
            const { data: fallbackProfile } = await supabase
                .from("profiles")
                .select("points")
                .eq("id", user.id)
                .single();
            const newPoints = (fallbackProfile?.points || 0) + resellPrice;
            await supabase
                .from("profiles")
                .update({ points: newPoints })
                .eq("id", user.id);
            remainingPoints = newPoints;
        } else {
            // RPC 후 포인트 조회
            const { data: updatedProfile } = await supabase
                .from("profiles")
                .select("points")
                .eq("id", user.id)
                .single();
            remainingPoints = updatedProfile?.points || 0;
        }

        // 거래 내역 기록
        await supabase.from("point_transactions").insert({
            user_id: user.id,
            action_type: "minimi_sell",
            points_earned: resellPrice,
            metadata: { type, itemSlug, itemName },
        });

        return NextResponse.json({
            success: true,
            refundedPoints: resellPrice,
            remainingPoints,
            message: `${itemName}을(를) ${resellPrice}P에 되팔았습니다`,
        });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
