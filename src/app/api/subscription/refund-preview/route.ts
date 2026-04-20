/**
 * 환불 예상액 미리보기
 * GET /api/subscription/refund-preview
 *
 * 해지 확인 모달에 "이만큼 환불됩니다" 투명하게 노출하기 위한 read-only 엔드포인트.
 * PortOne 호출 없이 DB만 조회 → 실제 환불액과 동일한 계산식.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, createAdminSupabase } from "@/lib/supabase-server";
import { VIDEO, type SubscriptionTier, getVideoMonthlyQuota } from "@/config/constants";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;
/** 숙려기간: 이 시간 이내 해지면 전액 환불 */
const COOLING_OFF_MS = 24 * 60 * 60 * 1000;

export async function GET(_request: NextRequest) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    try {
        const adminSb = createAdminSupabase();
        const { data: profile } = await adminSb
            .from("profiles")
            .select("is_premium, premium_expires_at, subscription_tier")
            .eq("id", user.id)
            .maybeSingle();

        if (!profile?.is_premium) {
            return NextResponse.json({
                is_premium: false,
                refundable_amount: 0,
                is_full_refund: false,
                days_used: 0,
                days_total: 0,
                days_remaining: 0,
                original_amount: 0,
            });
        }

        // 단품(video_*) 제외. allowlist 대신 denylist로 향후 신규 플랜 자동 포함.
        const { data: latestPaid } = await adminSb
            .from("payments")
            .select("amount, created_at, plan")
            .eq("user_id", user.id)
            .eq("status", "paid")
            .not("plan", "like", "video_%")
            .not("plan", "like", "%_single")
            .not("plan", "is", null)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (!latestPaid) {
            return NextResponse.json({
                is_premium: true,
                refundable_amount: 0,
                is_full_refund: false,
                days_used: 0,
                days_total: 0,
                days_remaining: 0,
                original_amount: 0,
                gross_refund: 0,
                video_deduction: 0,
                videos_used_charged: 0,
                note: "최근 결제 기록 없음",
            });
        }

        const now = new Date();
        const paidAt = new Date(latestPaid.created_at);
        const expiresAt = profile.premium_expires_at
            ? new Date(profile.premium_expires_at)
            : new Date(paidAt.getTime() + 30 * DAY_MS);

        // cancel route와 동일 로직: 24h 이내 → 전액, 이후 → ms 비율
        const totalMs = Math.max(1, expiresAt.getTime() - paidAt.getTime());
        const usedMs = Math.max(0, now.getTime() - paidAt.getTime());
        const remainingMs = Math.max(0, expiresAt.getTime() - now.getTime());

        const daysTotal = Math.max(1, Math.round(totalMs / DAY_MS));
        const daysUsed = Math.max(0, Math.floor(usedMs / DAY_MS));
        const daysRemaining = Math.max(0, Math.round(remainingMs / DAY_MS));
        const original = latestPaid.amount || 0;

        let grossRefund = 0;
        let isFullRefund = false;
        if (remainingMs <= 0) {
            grossRefund = 0;
        } else if (usedMs < COOLING_OFF_MS) {
            grossRefund = original; // 숙려기간 전액
            isFullRefund = true;
        } else {
            grossRefund = Math.min(original, Math.max(0, Math.floor((original * remainingMs) / totalMs)));
        }

        // 영상 사용량 차감 (cancel route와 동일 로직)
        const { count: videosSincePaid } = await adminSb
            .from("video_generations")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .neq("status", "failed")
            .gte("created_at", paidAt.toISOString());
        // tier 판정: plan 매칭 실패 시 profile.subscription_tier fallback
        const planStr = typeof latestPaid.plan === "string" ? latestPaid.plan.toLowerCase() : "";
        const profileTier = profile?.subscription_tier === "premium" ? "premium" : "basic";
        const tier: SubscriptionTier = planStr.startsWith("premium")
            ? "premium"
            : planStr.startsWith("basic")
            ? "basic"
            : (profileTier as SubscriptionTier);
        const monthlyQuota = getVideoMonthlyQuota(tier);
        const videosUsedCharged = Math.min(videosSincePaid ?? 0, monthlyQuota);
        const videoDeduction = videosUsedCharged * VIDEO.SINGLE_PRICE;
        const refundable = Math.max(0, grossRefund - videoDeduction);

        return NextResponse.json({
            is_premium: true,
            original_amount: original,
            refundable_amount: refundable,
            gross_refund: grossRefund,
            video_deduction: videoDeduction,
            videos_used_charged: videosUsedCharged,
            video_unit_price: VIDEO.SINGLE_PRICE,
            is_full_refund: isFullRefund,
            days_used: daysUsed,
            days_total: daysTotal,
            days_remaining: daysRemaining,
        });
    } catch (e) {
        const msg = e instanceof Error ? e.message : "서버 오류";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
