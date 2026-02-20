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

        // 4. 현재 포인트 확인
        const { data: profile } = await supabase
            .from("profiles")
            .select("points")
            .eq("id", user.id)
            .single();

        if (!profile || (profile.points || 0) < item.price) {
            return NextResponse.json({ error: "포인트가 부족합니다" }, { status: 400 });
        }

        // 5. 포인트 차감 (Race Condition 방지: gte 조건으로 잔액 재확인)
        const { data: updated, error: updateError } = await supabase
            .from("profiles")
            .update({ points: (profile.points || 0) - item.price })
            .eq("id", user.id)
            .gte("points", item.price)
            .select("points")
            .single();

        if (updateError || !updated) {
            return NextResponse.json({ error: "포인트가 부족합니다" }, { status: 400 });
        }

        const remainingPoints = updated.points;

        // 6. 거래 내역 기록
        await supabase.from("point_transactions").insert({
            user_id: user.id,
            action_type: "shop_purchase",
            points_earned: -item.price,
            metadata: { itemId, itemName: item.name, effect: item.effect },
        });

        // 7. 효과 적용
        if (item.effect === "chat_bonus_5" || item.effect === "chat_bonus_10") {
            const bonusAmount = item.effect === "chat_bonus_5" ? 5 : 10;
            // chat_bonus를 profiles에 저장 (또는 별도 테이블)
            // 현재는 localStorage 기반 사용량이므로 클라이언트에서 처리
            // 응답에 bonus 정보 포함
            return NextResponse.json({
                success: true,
                effect: item.effect,
                bonusAmount,
                remainingPoints,
                message: `AI 펫톡 ${bonusAmount}회가 추가되었습니다`,
            });
        }

        if (item.effect === "premium_trial_1d" || item.effect === "premium_trial_3d") {
            const days = item.effect === "premium_trial_1d" ? 1 : 3;
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + days);

            // premium_expires_at 업데이트
            const { data: currentProfile } = await supabase
                .from("profiles")
                .select("is_premium, premium_expires_at")
                .eq("id", user.id)
                .single();

            // 이미 프리미엄인 경우 만료일 연장, 아닌 경우 새로 설정
            let newExpiresAt = expiresAt;
            if (currentProfile?.is_premium && currentProfile?.premium_expires_at) {
                const currentExpiry = new Date(currentProfile.premium_expires_at);
                if (currentExpiry > new Date()) {
                    // 기존 만료일에서 연장
                    newExpiresAt = new Date(currentExpiry);
                    newExpiresAt.setDate(newExpiresAt.getDate() + days);
                }
            }

            await supabase
                .from("profiles")
                .update({
                    is_premium: true,
                    premium_expires_at: newExpiresAt.toISOString(),
                })
                .eq("id", user.id);

            return NextResponse.json({
                success: true,
                effect: item.effect,
                premiumExpiresAt: newExpiresAt.toISOString(),
                remainingPoints,
                message: `프리미엄 ${days}일 체험이 시작되었습니다!`,
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
