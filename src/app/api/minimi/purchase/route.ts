/**
 * 미니미 구매 API
 * POST: 캐릭터 또는 악세서리 구매
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, getAuthUser } from "@/lib/supabase-server";
import { getClientIP, checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { CHARACTER_CATALOG, ACCESSORY_CATALOG } from "@/data/minimiPixels";
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

        // 3. 아이템 검증
        let itemName: string;
        let itemPrice: number;

        if (type === "character") {
            const character = CHARACTER_CATALOG.find(c => c.slug === itemSlug);
            if (!character) {
                return NextResponse.json({ error: "존재하지 않는 캐릭터입니다" }, { status: 400 });
            }
            itemName = character.name;
            itemPrice = character.price;
        } else if (type === "accessory") {
            const accessory = ACCESSORY_CATALOG.find(a => a.slug === itemSlug);
            if (!accessory) {
                return NextResponse.json({ error: "존재하지 않는 악세서리입니다" }, { status: 400 });
            }
            itemName = accessory.name;
            itemPrice = accessory.price;
        } else {
            return NextResponse.json({ error: "잘못된 아이템 유형입니다" }, { status: 400 });
        }

        const supabase = await createServerSupabase();

        // 4. 중복 구매 체크
        if (type === "character") {
            const { data: existing } = await supabase
                .from("user_minimi")
                .select("id")
                .eq("user_id", user.id)
                .eq("minimi_id", itemSlug)
                .maybeSingle();
            if (existing) {
                return NextResponse.json({ error: "이미 보유한 캐릭터입니다" }, { status: 400 });
            }
        } else {
            const { data: existing } = await supabase
                .from("user_minimi_accessories")
                .select("id")
                .eq("user_id", user.id)
                .eq("accessory_id", itemSlug)
                .maybeSingle();
            if (existing) {
                return NextResponse.json({ error: "이미 보유한 악세서리입니다" }, { status: 400 });
            }
        }

        // 5. 포인트 확인 + 차감 (Race Condition 방지)
        const { data: profile } = await supabase
            .from("profiles")
            .select("points")
            .eq("id", user.id)
            .single();

        if (!profile || (profile.points || 0) < itemPrice) {
            return NextResponse.json({ error: "포인트가 부족합니다" }, { status: 400 });
        }

        const { data: updated, error: updateError } = await supabase
            .from("profiles")
            .update({ points: (profile.points || 0) - itemPrice })
            .eq("id", user.id)
            .gte("points", itemPrice)
            .select("points")
            .single();

        if (updateError || !updated) {
            return NextResponse.json({ error: "포인트가 부족합니다" }, { status: 400 });
        }

        // 6. 아이템 추가
        if (type === "character") {
            const { error: insertError } = await supabase
                .from("user_minimi")
                .insert({
                    user_id: user.id,
                    minimi_id: itemSlug,
                    purchase_price: itemPrice,
                });
            if (insertError) {
                // 롤백: 포인트 복구
                await supabase
                    .from("profiles")
                    .update({ points: (updated.points || 0) + itemPrice })
                    .eq("id", user.id);
                return NextResponse.json({ error: "구매에 실패했습니다" }, { status: 500 });
            }
        } else {
            const { error: insertError } = await supabase
                .from("user_minimi_accessories")
                .insert({
                    user_id: user.id,
                    accessory_id: itemSlug,
                    purchase_price: itemPrice,
                });
            if (insertError) {
                await supabase
                    .from("profiles")
                    .update({ points: (updated.points || 0) + itemPrice })
                    .eq("id", user.id);
                return NextResponse.json({ error: "구매에 실패했습니다" }, { status: 500 });
            }
        }

        // 7. 거래 내역 기록
        await supabase.from("point_transactions").insert({
            user_id: user.id,
            action_type: "minimi_purchase",
            points_earned: -itemPrice,
            metadata: { type, itemSlug, itemName },
        });

        return NextResponse.json({
            success: true,
            remainingPoints: updated.points,
            resellPrice: Math.ceil(itemPrice * MINIMI.RESELL_RATIO),
            message: `${itemName}을(를) 구매했습니다!`,
        });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
