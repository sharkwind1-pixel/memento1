/**
 * pending → paid 로 "승격(보정)"된 구독 결제에 프리미엄을 부여하는 공용 로직.
 *
 * 호출처:
 * - /api/payments/webhook (complete 경로 놓친 결제를 웹훅이 paid로 보정할 때)
 * - /api/cron/payment-reconcile (웹훅마저 놓친 pending 을 cron 이 paid 로 승격할 때)
 *
 * 왜 grant_premium 만으로는 부족한가:
 * grant_premium RPC 는 profiles(is_premium·tier·expires)와 subscriptions row 자체는
 * 만들지만 **subscriptions.metadata(next_billing_date·customer_uid·auto_renew)와
 * billing_cycle 은 채우지 않는다.** 그러면 subscription-renewal 크론이 next_billing_date·
 * customer_uid 가 없는 유저를 건너뛰어, 결제는 됐는데 30일 뒤 조용히 만료 + 재청구 불가가 된다.
 * → 정상 경로(subscribe/complete)와 동일하게 subscriptions upsert + billing_cycle 까지 미러링한다.
 *
 * 영상 단건 결제는 호출하면 안 된다(프리미엄 잘못 부여). is_subscription 게이트로 차단.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

interface PromotedPayment {
    id: string;
    user_id: string;
    merchant_uid?: string | null;
    plan?: string | null;
    metadata?: unknown;
}

interface GrantResult {
    granted: boolean;
    skipped?: boolean;
    error?: string;
}

export async function grantPremiumForPromotedSubscription(
    admin: SupabaseClient,
    payment: PromotedPayment,
    source: string,
): Promise<GrantResult> {
    const meta = (payment.metadata ?? {}) as Record<string, unknown>;

    // 구독 판별: metadata.is_subscription 또는 merchant_uid 'sub_' 접두사 (belt-and-suspenders).
    // 영상 단건/일회성 결제는 둘 다 아니므로 자동 제외.
    const isSubscription =
        meta.is_subscription === true ||
        (typeof payment.merchant_uid === "string" && payment.merchant_uid.startsWith("sub_"));
    if (!isSubscription) {
        return { granted: false, skipped: true };
    }

    const billingCycle: "monthly" | "annual" =
        meta.billing_cycle === "annual" ? "annual" : "monthly";
    const cycleDays = billingCycle === "annual" ? 365 : 30;

    // 플랜: 컬럼 우선, 없으면 metadata, 둘 다 없으면 premium. premium_annual 등은 premium 으로 매핑.
    const rawPlan =
        (typeof payment.plan === "string" && payment.plan) ||
        (typeof meta.plan === "string" && meta.plan) ||
        "premium";
    const grantPlan = rawPlan === "basic" ? "basic" : "premium";

    const customerUid =
        typeof meta.customer_uid === "string" && meta.customer_uid
            ? meta.customer_uid
            : `memento_sub_${payment.user_id}`;

    const nextBillingDate = new Date();
    nextBillingDate.setDate(nextBillingDate.getDate() + cycleDays);

    // 1. 프리미엄 부여 (profiles + subscriptions row 생성)
    const { error: grantError } = await admin.rpc("grant_premium", {
        p_user_id: payment.user_id,
        p_plan: grantPlan,
        p_duration_days: cycleDays,
        p_granted_by: null,
        p_reason: `pending→paid 승격 보정 (${source})`,
    });

    if (grantError) {
        await admin
            .from("payments")
            .update({
                metadata: { ...meta, grant_failed: true, grant_error: grantError.message, grant_source: source },
            })
            .eq("id", payment.id);
        import("@/lib/telegram")
            .then(({ notifyError }) =>
                notifyError({
                    endpoint: `/promote/${source}`,
                    error: `grant_premium 실패: ${grantError.message}`,
                    userId: payment.user_id,
                }),
            )
            .catch(() => {});
        return { granted: false, error: grantError.message };
    }

    // 2. profiles.subscription_billing_cycle (annual 표시·로직용)
    await admin
        .from("profiles")
        .update({ subscription_billing_cycle: billingCycle })
        .eq("id", payment.user_id);

    // 3. subscriptions.metadata 채우기 — renewal 크론이 읽는 필수 필드(없으면 갱신 누락)
    const { error: subErr } = await admin
        .from("subscriptions")
        .upsert(
            {
                user_id: payment.user_id,
                plan: grantPlan,
                billing_cycle: billingCycle,
                status: "active",
                last_payment_id: payment.id,
                metadata: {
                    customer_uid: customerUid,
                    billing_cycle: billingCycle,
                    next_billing_date: nextBillingDate.toISOString(),
                    auto_renew: true,
                },
            },
            { onConflict: "user_id" },
        );

    if (subErr) {
        import("@/lib/telegram")
            .then(({ notifyError }) =>
                notifyError({
                    endpoint: `/promote/${source}`,
                    error: `subscriptions upsert 실패 (renewal 크론 누락 위험): ${subErr.message}`,
                    userId: payment.user_id,
                }),
            )
            .catch(() => {});
    }

    // 4. 라이프사이클 복구 (해지 후 재구독 시 archived 데이터 복원) — 비치명
    try {
        const { restoreFromLifecycle } = await import("@/lib/subscription-restore");
        await restoreFromLifecycle(admin, payment.user_id);
    } catch {
        // 결제·프리미엄은 정상. 복구 실패는 무시.
    }

    return { granted: true };
}
