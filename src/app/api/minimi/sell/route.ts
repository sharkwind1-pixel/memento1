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

        // 캐릭터 검증
        const character = CHARACTER_CATALOG.find(c => c.slug === itemSlug);
        if (!character) {
            return NextResponse.json({ error: "존재하지 않는 캐릭터입니다" }, { status: 400 });
        }
        const itemName = character.name;
        const resellPrice = Math.ceil(character.price * MINIMI.RESELL_RATIO);

        // RPC로 원자적 되팔기 처리
        const { data, error: rpcError } = await supabase.rpc("sell_minimi_item", {
            p_user_id: user.id,
            p_minimi_id: itemSlug,
            p_item_name: itemName,
            p_resell_price: resellPrice,
        });

        if (rpcError) {
            console.error("[minimi/sell] RPC error:", rpcError.message);
            return NextResponse.json({ error: "되팔기 처리 중 오류가 발생했습니다" }, { status: 500 });
        }

        if (!data?.success) {
            const errMap: Record<string, { msg: string; status: number }> = {
                not_owned: { msg: "보유하지 않은 캐릭터입니다", status: 400 },
            };
            const err = errMap[data?.error] || { msg: "되팔기에 실패했습니다", status: 500 };
            return NextResponse.json({ error: err.msg }, { status: err.status });
        }

        return NextResponse.json({
            success: true,
            refundedPoints: resellPrice,
            remainingPoints: data.remaining_points,
            message: `${itemName}을(를) ${resellPrice}P에 되팔았습니다`,
        });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
