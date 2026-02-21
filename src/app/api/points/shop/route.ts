/**
 * 포인트 상점 API
 * POST: 아이템 구매 (포인트 차감 + 효과 적용)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, getAuthUser } from "@/lib/supabase-server";
import { getClientIP, checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// 상점 아이템 정의 (서버 사이드 검증용)
const SHOP_ITEMS: Record<string, {
    name: string;
    price: number;
    effect: string;
    available: boolean;
}> = {
    extra_chat_5: {
        name: "AI 펫톡 +5회",
        price: 150,
        effect: "chat_bonus_5",
        available: true,
    },
    extra_chat_10: {
        name: "AI 펫톡 +10회",
        price: 250,
        effect: "chat_bonus_10",
        available: true,
    },
    premium_trial_1d: {
        name: "프리미엄 1일 체험",
        price: 500,
        effect: "premium_trial_1d",
        available: true,
    },
    premium_trial_3d: {
        name: "프리미엄 3일 체험",
        price: 1200,
        effect: "premium_trial_3d",
        available: true,
    },
};

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
        const { itemId } = body;

        // 3. 아이템 검증
        const item = SHOP_ITEMS[itemId];
        if (!item || !item.available) {
            return NextResponse.json({ error: "유효하지 않은 아이템입니다" }, { status: 400 });
        }

        const supabase = await createServerSupabase();

        // 4. 보너스 일수 계산 (프리미엄 체험인 경우)
        let bonusDays: number | null = null;
        if (item.effect === "premium_trial_1d") bonusDays = 1;
        if (item.effect === "premium_trial_3d") bonusDays = 3;

        // 5. RPC로 원자적 구매 처리
        const { data, error: rpcError } = await supabase.rpc("purchase_shop_item", {
            p_user_id: user.id,
            p_item_id: itemId,
            p_item_name: item.name,
            p_item_price: item.price,
            p_effect: item.effect,
            p_bonus_days: bonusDays,
        });

        if (rpcError) {
            console.error("[points/shop] RPC error:", rpcError.message);
            return NextResponse.json({ error: "구매 처리 중 오류가 발생했습니다" }, { status: 500 });
        }

        if (!data?.success) {
            const errMap: Record<string, { msg: string; status: number }> = {
                user_not_found: { msg: "사용자 정보를 찾을 수 없습니다", status: 400 },
                insufficient_points: { msg: "포인트가 부족합니다", status: 400 },
            };
            const err = errMap[data?.error] || { msg: "구매에 실패했습니다", status: 500 };
            return NextResponse.json({ error: err.msg }, { status: err.status });
        }

        const remainingPoints = data.remaining_points;

        // 6. 효과별 응답 분기
        if (item.effect === "chat_bonus_5" || item.effect === "chat_bonus_10") {
            const bonusAmount = item.effect === "chat_bonus_5" ? 5 : 10;
            return NextResponse.json({
                success: true,
                effect: item.effect,
                bonusAmount,
                remainingPoints,
                message: `AI 펫톡 ${bonusAmount}회가 추가되었습니다`,
            });
        }

        if (bonusDays !== null) {
            return NextResponse.json({
                success: true,
                effect: item.effect,
                premiumExpiresAt: data.premium_expires_at,
                remainingPoints,
                message: `프리미엄 ${bonusDays}일 체험이 시작되었습니다!`,
            });
        }

        return NextResponse.json({
            success: true,
            effect: item.effect,
            remainingPoints,
        });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
