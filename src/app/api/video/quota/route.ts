/**
 * 영상 생성 쿼터 조회 API
 * GET: 현재 사용자의 영상 생성 잔여 횟수 및 구독 등급 조회
 *
 * 보안:
 * - 세션 기반 인증 필수
 *
 * 쿼터 정책:
 * - 무료 회원: 평생 1회 (FREE_LIFETIME)
 * - 프리미엄 회원: 월 3회 (BASIC_MONTHLY)
 */

import { NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase, getAuthUser } from "@/lib/supabase-server";
import { VIDEO, type SubscriptionTier, getVideoMonthlyQuota } from "@/config/constants";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        // 1. 인증 확인
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json(
                { error: "로그인이 필요합니다." },
                { status: 401 }
            );
        }

        const supabase = await createServerSupabase();

        // 2. 프리미엄/구독 등급 확인
        const { data: profile } = await supabase
            .from("profiles")
            .select("is_premium, premium_expires_at, subscription_tier")
            .eq("id", user.id)
            .single();

        const isPremium = profile?.is_premium &&
            (!profile.premium_expires_at || new Date(profile.premium_expires_at) > new Date());

        // subscription_tier 결정
        const subscriptionTier: SubscriptionTier = isPremium
            ? ((profile?.subscription_tier as SubscriptionTier) || "premium")
            : "free";
        const monthlyQuota = getVideoMonthlyQuota(subscriptionTier);

        // 3. 이번 달 생성 횟수 (실패 제외, KST 기준)
        const kstOffset = 9 * 60 * 60 * 1000;
        const kstNow = new Date(Date.now() + kstOffset);
        const monthStart = new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), 1) - kstOffset).toISOString();

        const { count: monthlyCount } = await supabase
            .from("video_generations")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .neq("status", "failed")
            .gte("created_at", monthStart);

        // 4. 전체 생성 횟수 (실패 제외)
        const { count: lifetimeCount } = await supabase
            .from("video_generations")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .neq("status", "failed");

        // 5. 단건 구매 보너스 크레딧 조회
        const adminSupabase = createAdminSupabase();
        let bonusCredits = 0;

        if (subscriptionTier !== "free") {
            // 유료 유저: 이번 달 구매 건수만 카운트
            const { count: bonusCount } = await adminSupabase
                .from("payments")
                .select("id", { count: "exact", head: true })
                .eq("user_id", user.id)
                .eq("plan", "video_single")
                .eq("status", "paid")
                .gte("paid_at", monthStart);
            bonusCredits = bonusCount ?? 0;
        } else {
            // 무료 유저: 전체 기간 구매 건수
            const { count: bonusCount } = await adminSupabase
                .from("payments")
                .select("id", { count: "exact", head: true })
                .eq("user_id", user.id)
                .eq("plan", "video_single")
                .eq("status", "paid");
            bonusCredits = bonusCount ?? 0;
        }

        // 6. 쿼터 응답 구성
        const safeMonthlyCount = monthlyCount ?? 0;
        const safeLifetimeCount = lifetimeCount ?? 0;

        if (subscriptionTier !== "free") {
            // 베이직/프리미엄 회원: 월간 쿼터 + 보너스
            return NextResponse.json({
                used: safeMonthlyCount,
                limit: monthlyQuota + bonusCredits,
                tier: subscriptionTier,
                isLifetimeFree: false,
                lifetimeFreeUsed: true,
                bonusCredits,
            });
        } else {
            // 무료 회원: 평생 쿼터 + 보너스
            const totalLimit = VIDEO.FREE_LIFETIME + bonusCredits;
            return NextResponse.json({
                used: safeLifetimeCount,
                limit: totalLimit,
                tier: "free",
                isLifetimeFree: bonusCredits === 0,
                lifetimeFreeUsed: safeLifetimeCount >= totalLimit,
                bonusCredits,
            });
        }
    } catch (err) {
        console.error("[Video Quota] 서버 오류:", err);
        return NextResponse.json(
            { error: "쿼터 조회 중 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}
