/**
 * 구독 해지 API
 * POST /api/subscription/cancel
 *
 * **Pro-rata 환불 + 즉시 차단 (2026-04-20 재재재설계)**:
 * 전액 환불은 abuse vector. 사용자가 29일 쓰고 해지해도 전액 돌려주면
 * 매달 공짜 premium 가능. Korean 표준(Netflix/웨이브 등)은 사용 일수 차감
 * 또는 예약 해지. 메멘토애니는 pro-rata 채택 (공정 + abuse 방지).
 *
 * 환불 금액 계산:
 *   refund = amount × (남은일수 / 총일수)
 *   - 총일수 = 결제일 ~ premium_expires_at (보통 30일)
 *   - 남은일수 = 지금 ~ premium_expires_at
 *   - 당일 해지: 거의 전액 환불
 *   - 29일 사용 후 해지: 1/30만 환불
 *   - floor 단위 (원 단위 내림)
 *
 * 처리 흐름:
 * 1. 최근 paid 결제 + profiles.premium_expires_at 조회
 * 2. pro-rata 환불 금액 계산 (0원이면 환불 스킵)
 * 3. PortOne /payments/cancel 호출 (amount 명시 = 부분 환불)
 * 4. 성공 시 DB 즉시 정리 (profiles 무료화, subscriptions/payments 기록)
 *
 * 실패 처리:
 * - PortOne 환불 실패 시 DB 건들지 않음 → 502 (재시도 or 수동 환불)
 * - 이미 취소된 결제는 성공으로 간주
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, createServerSupabase, createAdminSupabase } from "@/lib/supabase-server";
import { sendSubscriptionCancelledEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/** PortOne V1 토큰 발급 */
async function getPortOneToken(): Promise<string | null> {
    const imp_key = process.env.PORTONE_REST_API_KEY;
    const imp_secret = process.env.PORTONE_API_SECRET;
    if (!imp_key || !imp_secret) return null;

    const res = await fetch("https://api.iamport.kr/users/getToken", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imp_key, imp_secret }),
    });
    const data = await res.json();
    return data?.response?.access_token || null;
}

/**
 * PortOne V1 결제 취소. amount 명시 시 부분 환불, 생략 시 전액 환불.
 * 반환:
 *  - { ok: true }                 — 취소 성공 or 이미 취소된 상태
 *  - { ok: false, error, code }   — 카드사 거절/네트워크/인증 실패
 */
async function cancelPortOnePayment(params: {
    token: string;
    impUid: string;
    merchantUid?: string;
    amount: number;
    reason: string;
}): Promise<{ ok: true } | { ok: false; error: string; code?: number }> {
    try {
        const body: Record<string, unknown> = {
            imp_uid: params.impUid,
            merchant_uid: params.merchantUid,
            reason: params.reason,
            amount: params.amount,
        };
        const res = await fetch("https://api.iamport.kr/payments/cancel", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: params.token,
            },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.code === 0) return { ok: true };
        const msg = String(data.message || "");
        if (msg.includes("이미") || msg.includes("취소") || data.response?.status === "cancelled") {
            return { ok: true };
        }
        return { ok: false, error: msg || "PortOne 취소 실패", code: data.code };
    } catch (e) {
        const msg = e instanceof Error ? e.message : "PortOne 네트워크 실패";
        return { ok: false, error: msg };
    }
}

/**
 * Pro-rata 환불 금액 계산.
 * **핵심**: 정수 일 단위 비율이 아니라 **밀리초 비율**로 계산해야 정확.
 *   정수 ceil을 쓰면 30일 + 1ms 차이로 total=31 되어 9900 → 9580원 환불되는 버그.
 *
 * - refund = amount × (remainingMs / totalMs) floor
 * - remainingMs ≤ 0 이면 0 (만료 임박/지남)
 * - daysUsed/daysTotal/daysRemaining은 표시용 (UI)
 */
function computeProrataRefund(params: {
    amount: number;
    paidAt: Date;
    expiresAt: Date;
    now: Date;
}): { refund: number; daysUsed: number; daysTotal: number; daysRemaining: number } {
    const { amount, paidAt, expiresAt, now } = params;
    const totalMs = Math.max(1, expiresAt.getTime() - paidAt.getTime());
    const usedMs = Math.max(0, now.getTime() - paidAt.getTime());
    const remainingMs = Math.max(0, expiresAt.getTime() - now.getTime());

    // 표시용 정수 일수 (round로 30일±몇ms 부동소수 오차 흡수)
    const daysTotal = Math.max(1, Math.round(totalMs / DAY_MS));
    const daysUsed = Math.max(0, Math.floor(usedMs / DAY_MS));
    const daysRemaining = Math.max(0, Math.round(remainingMs / DAY_MS));

    if (remainingMs <= 0) {
        return { refund: 0, daysUsed, daysTotal, daysRemaining };
    }
    // 실제 환불액은 ms 비율 (정수 일수 변환 없이)
    const refund = Math.min(amount, Math.max(0, Math.floor((amount * remainingMs) / totalMs)));
    return { refund, daysUsed, daysTotal, daysRemaining };
}

export async function POST(_request: NextRequest) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    try {
        const supabase = await createServerSupabase();
        const { data: profile, error: profileErr } = await supabase
            .from("profiles")
            .select("is_premium, premium_expires_at, premium_started_at, subscription_tier, subscription_phase")
            .eq("id", user.id)
            .single();

        if (profileErr || !profile) {
            return NextResponse.json({ error: "프로필을 불러오지 못했습니다" }, { status: 500 });
        }
        if (!profile.is_premium) {
            return NextResponse.json({ error: "활성 구독이 없습니다" }, { status: 400 });
        }

        const adminSb = createAdminSupabase();
        const now = new Date();

        // 1. 최근 paid 결제 조회 (환불 source)
        const { data: latestPaid } = await adminSb
            .from("payments")
            .select("id, merchant_uid, metadata, amount, created_at")
            .eq("user_id", user.id)
            .eq("status", "paid")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        const impUid = latestPaid && typeof latestPaid.metadata === "object" && latestPaid.metadata
            ? (latestPaid.metadata as Record<string, unknown>).imp_uid
            : null;

        // 2. pro-rata 환불 금액 계산
        let refundStatus: "refunded" | "skipped_no_payment" | "skipped_no_remaining" | "skipped_no_imp_uid" = "skipped_no_payment";
        let refundedAmount = 0;
        let daysUsed = 0;
        let daysRemaining = 0;
        let daysTotal = 0;

        if (latestPaid) {
            const paidAt = new Date(latestPaid.created_at);
            const expiresAt = profile.premium_expires_at
                ? new Date(profile.premium_expires_at)
                : new Date(paidAt.getTime() + 30 * DAY_MS); // 폴백: 결제일 +30일
            const calc = computeProrataRefund({
                amount: latestPaid.amount || 0,
                paidAt,
                expiresAt,
                now,
            });
            daysUsed = calc.daysUsed;
            daysRemaining = calc.daysRemaining;
            daysTotal = calc.daysTotal;
            refundedAmount = calc.refund;

            if (refundedAmount <= 0) {
                refundStatus = "skipped_no_remaining";
            } else if (typeof impUid !== "string" || !impUid) {
                refundStatus = "skipped_no_imp_uid";
            } else {
                // 3. PortOne 부분 환불 호출
                const token = await getPortOneToken();
                if (!token) {
                    return NextResponse.json(
                        { error: "결제 시스템 인증 실패 — 잠시 후 다시 시도해주세요" },
                        { status: 500 }
                    );
                }
                const cancelResult = await cancelPortOnePayment({
                    token,
                    impUid,
                    merchantUid: latestPaid.merchant_uid || undefined,
                    amount: refundedAmount,
                    reason: `사용자 요청 — 구독 해지 (사용 ${daysUsed}일 / 총 ${daysTotal}일)`,
                });
                if (!cancelResult.ok) {
                    return NextResponse.json(
                        {
                            error: `환불 처리 실패: ${cancelResult.error}. 문제가 계속되면 고객센터로 문의해주세요.`,
                            code: cancelResult.code,
                        },
                        { status: 502 }
                    );
                }
                refundStatus = "refunded";

                // payments: 부분 환불은 status 유지(paid)하고 metadata에 환불액 기록하는 게 일반적이지만
                // 우리 모델은 "이 결제 건이 해지됨" 트래킹이 우선 → status=cancelled + refunded_amount 기록
                await adminSb
                    .from("payments")
                    .update({
                        status: "cancelled",
                        metadata: {
                            ...((latestPaid.metadata as Record<string, unknown>) || {}),
                            cancelled_at: now.toISOString(),
                            cancel_reason: `사용자 해지 (pro-rata)`,
                            cancel_source: "user_cancel_api",
                            refunded_amount: refundedAmount,
                            original_amount: latestPaid.amount,
                            days_used: daysUsed,
                            days_total: daysTotal,
                            days_remaining: daysRemaining,
                        },
                    })
                    .eq("id", latestPaid.id);
            }
        }

        // 4. profiles 즉시 무료화 (환불 성공/스킵 무관, 해지는 즉시 반영)
        const { error: updateErr } = await adminSb
            .from("profiles")
            .update({
                is_premium: false,
                premium_expires_at: null,
                subscription_tier: "free",
                subscription_phase: "active",
                subscription_cancelled_at: now.toISOString(),
                data_reset_at: null,
                protected_pet_id: null,
                premium_plan: null,
            })
            .eq("id", user.id);

        if (updateErr) {
            return NextResponse.json(
                { error: "프로필 갱신 실패", detail: updateErr.message },
                { status: 500 }
            );
        }

        // 5. subscriptions 취소
        await adminSb
            .from("subscriptions")
            .update({
                status: "cancelled",
                cancelled_at: now.toISOString(),
                updated_at: now.toISOString(),
            })
            .eq("user_id", user.id);

        // 6. 이메일 (실패해도 플로우 유지)
        if (user.email) {
            const { data: profileDetail } = await adminSb
                .from("profiles")
                .select("nickname")
                .eq("id", user.id)
                .maybeSingle();
            void sendSubscriptionCancelledEmail(
                user.email,
                profileDetail?.nickname || null,
                null,
            );
        }

        // 7. 인앱 알림
        const notifBody =
            refundStatus === "refunded"
                ? `구독이 해지되고 ${refundedAmount.toLocaleString()}원이 환불되었습니다. (사용 ${daysUsed}일 / 총 ${daysTotal}일 기준 일할 계산) 카드 환불은 카드사 영업일 기준 3~5일 이내 반영됩니다.`
                : refundStatus === "skipped_no_remaining"
                ? "구독이 해지되었습니다. 이용 기간이 거의 끝나 환불 금액은 발생하지 않았습니다."
                : "구독이 해지되었습니다. 환불 대상 결제 정보가 없어 자동 환불이 진행되지 않았습니다.";

        const { error: notifErr } = await adminSb.from("notifications").insert({
            user_id: user.id,
            type: "subscription_cancelled",
            title: "구독이 해지되었습니다",
            body: notifBody,
            metadata: {
                refund_status: refundStatus,
                refunded_amount: refundedAmount,
                days_used: daysUsed,
                days_total: daysTotal,
            },
            dedup_key: `sub_cancelled_${now.toISOString().slice(0, 10)}_${user.id}`,
        });
        if (notifErr && notifErr.code !== "23505") {
            console.error("[subscription/cancel] notification insert failed:", notifErr.message);
        }

        // 8. 관리자 텔레그램
        void import("@/lib/telegram")
            .then(({ notifyPayment }) =>
                notifyPayment({
                    email: user.email || "(unknown)",
                    plan: `cancelled (${refundStatus}, ${daysUsed}/${daysTotal}일)`,
                    amount: refundedAmount ? -refundedAmount : 0,
                })
            )
            .catch(() => {});

        return NextResponse.json({
            ok: true,
            refund_status: refundStatus,
            refunded_amount: refundedAmount,
            days_used: daysUsed,
            days_total: daysTotal,
            days_remaining: daysRemaining,
        });
    } catch (e) {
        const msg = e instanceof Error ? e.message : "서버 오류";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
