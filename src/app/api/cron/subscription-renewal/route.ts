/**
 * 정기결제 자동 갱신 크론잡
 * GET /api/cron/subscription-renewal
 *
 * 매일 KST 07:00 실행 (UTC 22:00)
 * 1. subscriptions 테이블에서 오늘 갱신 예정인 active 구독 조회
 * 2. 포트원 V1 /subscribe/payments/again API로 빌링키 결제
 * 3. 성공 시 프리미엄 연장 + 다음 결제일 갱신
 * 4. 실패 시 재시도 카운트 + 텔레그램 알림
 * 5. 3회 실패 시 구독 만료 처리
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret, getServiceSupabase } from "@/lib/cron-utils";
import { PRICING, PLAN_DURATION_DAYS } from "@/config/constants";
import { randomUUID } from "crypto";

const MAX_RETRY = 3;

/** 포트원 V1 액세스 토큰 발급 */
async function getPortoneAccessToken(): Promise<string | null> {
    try {
        const res = await fetch("https://api.iamport.kr/users/getToken", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                imp_key: process.env.PORTONE_REST_API_KEY || "",
                imp_secret: process.env.PORTONE_API_SECRET || "",
            }),
        });
        const data = await res.json();
        if (data.code === 0 && data.response?.access_token) {
            return data.response.access_token;
        }
        return null;
    } catch {
        return null;
    }
}

/** 포트원 V1 빌링키 재결제 (subscribe/payments/again) */
async function chargeSubscription(
    accessToken: string,
    customerUid: string,
    merchantUid: string,
    amount: number,
    name: string,
): Promise<{ success: boolean; impUid?: string; error?: string }> {
    try {
        const res = await fetch("https://api.iamport.kr/subscribe/payments/again", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                customer_uid: customerUid,
                merchant_uid: merchantUid,
                amount,
                name,
            }),
        });
        const data = await res.json();
        if (data.code === 0 && data.response?.status === "paid") {
            return { success: true, impUid: data.response.imp_uid };
        }
        return {
            success: false,
            error: data.response?.fail_reason || data.message || "결제 실패",
        };
    } catch (err) {
        return {
            success: false,
            error: err instanceof Error ? err.message : "네트워크 오류",
        };
    }
}

/** 텔레그램 시스템 알림 (비동기, 실패 무시) */
async function notifySystem(text: string) {
    try {
        const { notifyCronResult } = await import("@/lib/telegram");
        await notifyCronResult({ phase: "subscription-renewal", kstHour: 7, error: text });
    } catch {
        // 무시
    }
}

function getPlanAmount(plan: string): number {
    if (plan === "premium") return PRICING.PREMIUM_MONTHLY;
    return PRICING.BASIC_MONTHLY;
}

function getPlanLabel(plan: string): string {
    return plan === "premium" ? "프리미엄" : "베이직";
}

export async function GET(request: NextRequest) {
    const authError = verifyCronSecret(request);
    if (authError) return authError;

    const supabase = getServiceSupabase();
    const now = new Date();
    const results = { renewed: 0, failed: 0, expired: 0, skipped: 0, errors: [] as string[] };

    try {
        // 1. 오늘까지 갱신 예정인 active 구독 조회
        //    metadata->next_billing_date 가 현재 시각 이전인 것
        const { data: subscriptions, error: fetchError } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("status", "active")
            .not("metadata->auto_renew", "eq", "false");

        if (fetchError) {
            return NextResponse.json({ error: "구독 조회 실패", detail: fetchError.message }, { status: 500 });
        }

        // metadata->next_billing_date 필터 (JSON 필드라 서버에서 필터)
        const dueSubscriptions = (subscriptions || []).filter((sub) => {
            const nextBilling = sub.metadata?.next_billing_date;
            if (!nextBilling) return false;
            return new Date(nextBilling) <= now;
        });

        if (dueSubscriptions.length === 0) {
            return NextResponse.json({ message: "갱신 대상 없음", ...results });
        }

        // 2. 포트원 토큰 발급
        const accessToken = await getPortoneAccessToken();
        if (!accessToken) {
            await notifySystem("포트원 토큰 발급 실패 - 정기결제 갱신 중단");
            return NextResponse.json({ error: "포트원 토큰 발급 실패" }, { status: 500 });
        }

        // 유저 이메일 일괄 조회 (알림용)
        const userIds = dueSubscriptions.map((s) => s.user_id);
        const { data: profiles } = await supabase
            .from("profiles")
            .select("id, email")
            .in("id", userIds);
        const emailMap = new Map((profiles || []).map((p) => [p.id, p.email]));

        // 3. 각 구독별 재결제 처리
        for (const sub of dueSubscriptions) {
            const customerUid = sub.metadata?.customer_uid;
            if (!customerUid) {
                results.skipped++;
                results.errors.push(`${sub.user_id}: customer_uid 없음`);
                continue;
            }

            const retryCount = sub.metadata?.retry_count || 0;
            const plan = sub.plan;
            const amount = getPlanAmount(plan);
            const merchantUid = `sub_renew_${randomUUID()}`;
            const orderName = `메멘토애니 ${getPlanLabel(plan)} 정기구독 갱신`;
            const userEmail = emailMap.get(sub.user_id) || sub.user_id;

            // 빌링키 재결제
            const charge = await chargeSubscription(accessToken, customerUid, merchantUid, amount, orderName);

            if (charge.success) {
                const durationDays = PLAN_DURATION_DAYS[plan as keyof typeof PLAN_DURATION_DAYS] || 30;
                const nextBillingDate = new Date();
                nextBillingDate.setDate(nextBillingDate.getDate() + durationDays);

                // payments 레코드 생성
                const { data: newPayment } = await supabase
                    .from("payments")
                    .insert({
                        user_id: sub.user_id,
                        amount,
                        plan,
                        merchant_uid: merchantUid,
                        payment_id: charge.impUid,
                        imp_uid: charge.impUid,
                        status: "paid",
                        paid_at: now.toISOString(),
                        metadata: {
                            customer_uid: customerUid,
                            is_subscription: true,
                            is_renewal: true,
                            next_billing_date: nextBillingDate.toISOString(),
                            portone_method: "card",
                        },
                    })
                    .select("id")
                    .single();

                // 프리미엄 연장 (profiles 직접 업데이트 - grant_premium은 subscription INSERT하므로 사용 안 함)
                const premiumExpiresAt = new Date();
                premiumExpiresAt.setDate(premiumExpiresAt.getDate() + durationDays);
                await supabase
                    .from("profiles")
                    .update({
                        is_premium: true,
                        premium_expires_at: premiumExpiresAt.toISOString(),
                        premium_plan: plan,
                        subscription_tier: plan,
                    })
                    .eq("id", sub.user_id);

                // 구독 정보 업데이트 (기존 행 갱신)
                await supabase
                    .from("subscriptions")
                    .update({
                        last_payment_id: newPayment?.id || null,
                        expires_at: premiumExpiresAt.toISOString(),
                        metadata: {
                            ...sub.metadata,
                            next_billing_date: nextBillingDate.toISOString(),
                            retry_count: 0,
                            last_renewal: now.toISOString(),
                        },
                        updated_at: now.toISOString(),
                    })
                    .eq("id", sub.id);

                results.renewed++;

                // 결제 알림
                try {
                    const { notifyPayment } = await import("@/lib/telegram");
                    await notifyPayment({ email: userEmail, plan, amount });
                } catch {
                    // 무시
                }
            } else {
                // 결제 실패
                const newRetryCount = retryCount + 1;

                if (newRetryCount >= MAX_RETRY) {
                    // 3회 실패 -> 구독 만료 + 프리미엄 해제
                    await supabase
                        .from("subscriptions")
                        .update({
                            status: "expired",
                            metadata: {
                                ...sub.metadata,
                                retry_count: newRetryCount,
                                last_failure: charge.error,
                                expired_reason: "payment_failed_max_retry",
                                expired_at: now.toISOString(),
                            },
                            updated_at: now.toISOString(),
                        })
                        .eq("id", sub.id);

                    await supabase
                        .from("profiles")
                        .update({
                            is_premium: false,
                            premium_expires_at: now.toISOString(),
                            premium_plan: null,
                            subscription_tier: "free",
                        })
                        .eq("id", sub.user_id);

                    results.expired++;
                    await notifySystem(
                        `구독 만료: ${userEmail} (${getPlanLabel(plan)}) - ${MAX_RETRY}회 결제 실패`
                    );
                } else {
                    // 재시도 카운트 증가 (다음 날 크론에서 다시 시도)
                    await supabase
                        .from("subscriptions")
                        .update({
                            metadata: {
                                ...sub.metadata,
                                retry_count: newRetryCount,
                                last_failure: charge.error,
                                last_failure_at: now.toISOString(),
                            },
                            updated_at: now.toISOString(),
                        })
                        .eq("id", sub.id);

                    results.failed++;
                    results.errors.push(
                        `${userEmail}: ${charge.error} (${newRetryCount}/${MAX_RETRY})`
                    );
                }
            }
        }

        // 4. 결과 요약 알림 (실패가 있을 때만)
        if (results.failed > 0 || results.expired > 0) {
            await notifySystem(
                `갱신: ${results.renewed}건, 실패: ${results.failed}건, 만료: ${results.expired}건`
            );
        }

        return NextResponse.json({ message: "정기결제 갱신 완료", ...results });
    } catch (err) {
        const msg = err instanceof Error ? err.message : "알 수 없는 오류";
        await notifySystem(`정기결제 크론 에러: ${msg}`);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
