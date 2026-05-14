/**
 * 정기결제(구독) 준비 API
 * POST /api/payments/subscribe/prepare
 *
 * 1. 인증 확인
 * 2. 이미 구독 중인지 체크
 * 3. customer_uid 생성 (빌링키 발급용)
 * 4. payments 테이블에 pending 레코드 생성
 * 5. paymentId, orderName, amount, customerUid 반환
 */

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAuthUser, createAdminSupabase } from "@/lib/supabase-server";
import { PRICING, type BillingCycle } from "@/config/constants";
import { getClientIP, checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";

/** 플랜 + 결제 주기별 금액. 단일 프리미엄 통합 정책 (2026-05-15) — basic은 premium으로 자동 매핑 (직접 호출 방어). */
const PLAN_AMOUNT: Record<string, number> = {
    premium: PRICING.PREMIUM_MONTHLY,
    premium_annual: PRICING.PREMIUM_ANNUAL,
};

const PLAN_NAME: Record<string, string> = {
    premium: "메멘토애니 프리미엄 정기구독 (월)",
    premium_annual: "메멘토애니 프리미엄 연간구독 (12개월)",
};

/** plan → billing_cycle 매핑 */
function getBillingCycle(plan: string): BillingCycle {
    return plan === "premium_annual" ? "annual" : "monthly";
}

/** 단일 프리미엄 정책: basic 요청 → premium으로 매핑 (외부 직접 호출 방어). */
function normalizePlan(plan: string): string {
    return plan === "basic" ? "premium" : plan;
}

export async function POST(request: NextRequest) {
    try {
        const clientIP = await getClientIP();
        const rateLimit = checkRateLimit(clientIP, "write");
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
                { status: 429, headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn) }
            );
        }

        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
        }

        const body = await request.json();
        const plan = normalizePlan(body.plan as string);

        if (!plan || !PLAN_AMOUNT[plan]) {
            return NextResponse.json({ error: "잘못된 플랜입니다." }, { status: 400 });
        }

        const baseAmount = PLAN_AMOUNT[plan];
        const baseOrderName = PLAN_NAME[plan];

        const adminSupabase = createAdminSupabase();

        // 이미 프리미엄인지 + 베타 테스터 할인 체크
        const { data: profile } = await adminSupabase
            .from("profiles")
            .select("is_premium, premium_expires_at, is_beta_tester, beta_discount_until")
            .eq("id", user.id)
            .single();

        if (profile?.is_premium) {
            const expiresAt = profile.premium_expires_at;
            if (!expiresAt || new Date(expiresAt) > new Date()) {
                return NextResponse.json(
                    { error: "이미 프리미엄 회원입니다." },
                    { status: 400 }
                );
            }
        }

        // 베타 테스터 할인 적용 (3개월간 50% off — beta_codes_system 마이그레이션)
        let amount = baseAmount;
        let orderName = baseOrderName;
        let betaDiscountApplied = false;
        const BETA_DISCOUNT_PERCENT = 50;
        const now = new Date();
        const betaUntil = profile?.beta_discount_until ? new Date(profile.beta_discount_until) : null;
        if (profile?.is_beta_tester && betaUntil && betaUntil > now) {
            amount = Math.floor(baseAmount * (100 - BETA_DISCOUNT_PERCENT) / 100);
            // 100원 단위 절사 (PG 호환)
            amount = Math.floor(amount / 100) * 100;
            if (amount < 100) amount = 100;
            orderName = `${baseOrderName} (베타 ${BETA_DISCOUNT_PERCENT}% 할인)`;
            betaDiscountApplied = true;
        }

        // customer_uid: 유저별 고유 (동일 유저는 동일 customer_uid로 빌링키 관리)
        const customerUid = `memento_sub_${user.id}`;
        const paymentId = `sub_${randomUUID()}`;

        // 기존 pending 구독 레코드 정리
        await adminSupabase
            .from("payments")
            .update({ status: "cancelled" })
            .eq("user_id", user.id)
            .eq("status", "pending")
            .like("merchant_uid", "sub_%");

        // 결제 주기 (monthly 또는 annual)
        const billingCycle = getBillingCycle(plan);

        // payments 테이블에 pending 레코드 생성
        const { error: insertError } = await adminSupabase
            .from("payments")
            .insert({
                user_id: user.id,
                amount,
                plan,
                merchant_uid: paymentId,
                status: "pending",
                metadata: {
                    orderName,
                    is_subscription: true,
                    billing_cycle: billingCycle,
                    customer_uid: customerUid,
                    base_amount: baseAmount,
                    beta_discount_applied: betaDiscountApplied,
                },
            });

        if (insertError) {
            console.error("[subscribe/prepare] DB 오류:", insertError.message);
            return NextResponse.json({ error: "구독 준비에 실패했습니다." }, { status: 500 });
        }

        return NextResponse.json({
            paymentId,
            orderName,
            amount,
            customerUid,
        });
    } catch (err) {
        console.error("[subscribe/prepare] 에러:", err instanceof Error ? err.message : err);
        return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
    }
}
