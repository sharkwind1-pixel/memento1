/**
 * 미니미 구매 API
 * POST: 캐릭터 구매
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

        // 3. 아이템 검증
        if (type !== "character") {
            return NextResponse.json({ error: "잘못된 아이템 유형입니다" }, { status: 400 });
        }

        const character = CHARACTER_CATALOG.find(c => c.slug === itemSlug);
        if (!character) {
            return NextResponse.json({ error: "존재하지 않는 캐릭터입니다" }, { status: 400 });
        }
        const itemName = character.name;
        const itemPrice = character.price;

        const supabase = await createServerSupabase();

        // 4. RPC로 원자적 구매 처리
        const { data, error: rpcError } = await supabase.rpc("purchase_minimi_item", {
            p_user_id: user.id,
            p_minimi_id: itemSlug,
            p_item_name: itemName,
            p_item_price: itemPrice,
        });

        if (rpcError) {
            console.error("[minimi/purchase] RPC error:", rpcError.message);
            return NextResponse.json({ error: "구매 처리 중 오류가 발생했습니다" }, { status: 500 });
        }

        if (!data?.success) {
            const errMap: Record<string, { msg: string; status: number }> = {
                already_owned: { msg: "이미 보유한 캐릭터입니다", status: 400 },
                user_not_found: { msg: "사용자 정보를 찾을 수 없습니다", status: 400 },
                insufficient_points: { msg: "포인트가 부족합니다", status: 400 },
            };
            const err = errMap[data?.error] || { msg: "구매에 실패했습니다", status: 500 };
            return NextResponse.json({ error: err.msg }, { status: err.status });
        }

        return NextResponse.json({
            success: true,
            remainingPoints: data.remaining_points,
            resellPrice: Math.ceil(itemPrice * MINIMI.RESELL_RATIO),
            message: `${itemName}을(를) 구매했습니다!`,
        });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
