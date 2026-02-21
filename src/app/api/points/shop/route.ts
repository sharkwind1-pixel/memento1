/**
 * 포인트 상점 API
 * POST: 아이템 구매 (포인트 차감 + 효과 적용)
 * RPC 시도 → 없으면 다단계 폴백
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

        // 5. RPC 시도
        const { data: rpcData, error: rpcError } = await supabase.rpc("purchase_shop_item", {
            p_user_id: user.id,
            p_item_id: itemId,
            p_item_name: item.name,
            p_item_price: item.price,
            p_effect: item.effect,
            p_bonus_days: bonusDays,
        });

        if (!rpcError && rpcData) {
            if (!rpcData.success) {
                const errMap: Record<string, { msg: string; status: number }> = {
                    user_not_found: { msg: "사용자 정보를 찾을 수 없습니다", status: 400 },
                    insufficient_points: { msg: "포인트가 부족합니다", status: 400 },
                };
                const err = errMap[rpcData.error] || { msg: "구매에 실패했습니다", status: 500 };
                return NextResponse.json({ error: err.msg }, { status: err.status });
            }

            return buildSuccessResponse(item, rpcData.remaining_points, bonusDays, rpcData.premium_expires_at);
        }

        // RPC 없음 → 다단계 폴백
        console.warn("[points/shop] RPC unavailable, using fallback:", rpcError?.message);

        // 5a. 포인트 확인
        const { data: profile } = await supabase
            .from("profiles")
            .select("points, is_premium, premium_expires_at")
            .eq("id", user.id)
            .single();

        if (!profile) {
            return NextResponse.json({ error: "사용자 정보를 찾을 수 없습니다" }, { status: 400 });
        }

        if (profile.points < item.price) {
            return NextResponse.json({ error: "포인트가 부족합니다" }, { status: 400 });
        }

        // 5b. 포인트 차감
        const newPoints = profile.points - item.price;
        await supabase.from("profiles").update({ points: newPoints }).eq("id", user.id);

        // 5c. 거래 내역
        try {
            await supabase.from("point_transactions").insert({
                user_id: user.id,
                action_type: "shop_purchase",
                points_earned: -item.price,
                metadata: { itemId, itemName: item.name },
            });
        } catch { /* 무시 */ }

        // 5d. 프리미엄 체험 적용
        let premiumExpiresAt: string | null = null;
        if (bonusDays !== null) {
            const now = new Date();
            let expiresDate: Date;
            if (profile.is_premium && profile.premium_expires_at && new Date(profile.premium_expires_at) > now) {
                expiresDate = new Date(profile.premium_expires_at);
            } else {
                expiresDate = now;
            }
            expiresDate.setDate(expiresDate.getDate() + bonusDays);
            premiumExpiresAt = expiresDate.toISOString();

            await supabase.from("profiles").update({
                is_premium: true,
                premium_expires_at: premiumExpiresAt,
            }).eq("id", user.id);
        }

        return buildSuccessResponse(item, newPoints, bonusDays, premiumExpiresAt);
    } catch (error) {
        console.error("[points/shop] Unexpected error:", error);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

function buildSuccessResponse(
    item: { effect: string },
    remainingPoints: number,
    bonusDays: number | null,
    premiumExpiresAt?: string | null,
) {
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
            premiumExpiresAt,
            remainingPoints,
            message: `프리미엄 ${bonusDays}일 체험이 시작되었습니다!`,
        });
    }

    return NextResponse.json({
        success: true,
        effect: item.effect,
        remainingPoints,
    });
}
