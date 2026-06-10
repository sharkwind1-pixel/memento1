/**
 * GET /api/chat/usage
 * 현재 유저의 AI 펫톡 일일 사용량 조회 (서버 DB 기반)
 * 클라이언트 초기 로딩 시 서버 기준 남은 횟수를 동기화하기 위해 사용
 */

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withAuth } from "@/lib/api-auth";
import { FREE_LIMITS, type SubscriptionTier, getLimitsForTier } from "@/config/constants";

function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

export const GET = withAuth(async ({ user }) => {
    try {
        const supabase = getSupabase();
        if (!supabase) {
            // DB 접속 불가 시 기본값 반환
            return NextResponse.json({
                remaining: FREE_LIMITS.DAILY_CHATS,
                limit: FREE_LIMITS.DAILY_CHATS,
                used: 0,
            });
        }

        // 프리미엄 상태 확인
        const { data: profile } = await supabase
            .from("profiles")
            .select("is_premium, premium_expires_at, subscription_tier, subscription_phase")
            .eq("id", user.id)
            .single();

        const isPremium = profile?.is_premium &&
            (!profile.premium_expires_at || new Date(profile.premium_expires_at) > new Date());

        // subscription_tier 결정
        // is_premium = true 이지만 tier가 NULL/"free" 같은 모순 상태 보정 (관리자 부여 시 tier 누락 대응)
        const rawTier = profile?.subscription_tier as SubscriptionTier | null | undefined;
        const subscriptionTier: SubscriptionTier = isPremium
            ? (rawTier === "basic" ? "basic" : "premium")
            : "free";
        const tierLimits = getLimitsForTier(subscriptionTier);

        // 기본 일일 제한 (tier별)
        let baseLimit: number = tierLimits.DAILY_CHATS;

        // 라이프사이클 단계별 추가 제한 (chat-pipeline.ts checkSecurityLimits와 동일 로직)
        // hidden / countdown: 일 3회로 강제 제한 (감정 의존 유저 보호 + 비용 통제)
        const subscriptionPhase = profile?.subscription_phase || "active";
        if (subscriptionPhase === "hidden" || subscriptionPhase === "countdown") {
            baseLimit = 3;
        }

        // KST 기준 오늘 날짜 계산
        const now = new Date();
        const kstOffset = 9 * 60 * 60 * 1000;
        const kstDate = new Date(now.getTime() + kstOffset)
            .toISOString()
            .split("T")[0];

        // 오늘 구매한 채팅 보너스 조회
        let chatBonus = 0;
        try {
            const { data: bonusTxns } = await supabase
                .from("point_transactions")
                .select("metadata")
                .eq("user_id", user.id)
                .eq("action_type", "shop_purchase")
                .gte("created_at", kstDate + "T00:00:00+09:00")
                .lte("created_at", kstDate + "T23:59:59+09:00");

            for (const tx of (bonusTxns || [])) {
                const meta = tx.metadata as Record<string, unknown> | null;
                if (meta?.itemId === "extra_chat_5") chatBonus += 5;
                if (meta?.itemId === "extra_chat_10") chatBonus += 10;
            }
        } catch { /* 보너스 조회 실패 시 기본 제한 적용 */ }

        const limit = baseLimit + chatBonus;

        // DB에서 오늘 사용량 조회 (증가 없이 읽기만)
        const { data: existing } = await supabase
            .from("user_daily_usage")
            .select("request_count")
            .eq("identifier", user.id)
            .eq("usage_type", "ai_chat")
            .eq("usage_date", kstDate)
            .maybeSingle();

        const used = existing?.request_count || 0;
        const remaining = Math.max(0, limit - used);

        return NextResponse.json({
            remaining,
            limit,
            used,
        });
    } catch (error) {
        console.error("[chat/usage]", error instanceof Error ? error.message : error);
        return NextResponse.json(
            { error: "사용량 조회 중 오류가 발생했습니다." },
            { status: 500 }
        );
    }
});
