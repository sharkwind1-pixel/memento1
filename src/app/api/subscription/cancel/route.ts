/**
 * 구독 해지 API
 * POST /api/subscription/cancel
 *
 * **숙려기간(24h) 전액 환불 + 이후 Pro-rata + 즉시 차단 (2026-04-20 최종)**:
 * - 결제 후 24h 이내 해지: **전액 환불** (전자상거래법 숙려기간 + 유저 기대)
 * - 24h 이후 해지: **일할 환불** (ms 비율, abuse 방지)
 * - 어느 경우든 **즉시 유료 기능 차단**
 *
 * 환불 금액 계산:
 *   usedMs < COOLING_OFF_MS  → refund = amount (전액)
 *   usedMs >= COOLING_OFF_MS → refund = amount × (remainingMs / totalMs)
 *
 * 처리 흐름:
 * 1. 최근 paid 결제 + profiles.premium_expires_at 조회
 * 2. 환불 금액 계산
 * 3. PortOne /payments/cancel 호출 (amount 명시)
 * 4. DB 즉시 정리 (is_premium=false, tier=free, payments/subscriptions 반영)
 *
 * 실패 처리:
 * - PortOne 환불 실패 시 DB 수정 없이 502 반환
 * - 이미 취소된 결제는 성공으로 간주
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, createServerSupabase, createAdminSupabase } from "@/lib/supabase-server";
import { sendSubscriptionCancelledEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const DAY_MS = 24 * 60 * 60 * 1000;
/** 숙려기간: 이 시간 이내 해지 시 무조건 전액 환불 */
const COOLING_OFF_MS = 24 * 60 * 60 * 1000;

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
/**
 * PortOne V1 결제 단건 조회 — cancel 호출 전 현재 status 확인용.
 * 이미 cancelled 면 우리 쪽에서 재호출하지 않아야 부분취소 중첩 안 남.
 */
async function fetchPortOnePayment(token: string, impUid: string): Promise<{
    status: "ready" | "paid" | "cancelled" | "failed";
    cancel_amount?: number;
    amount?: number;
} | null> {
    try {
        const res = await fetch(`https://api.iamport.kr/payments/${encodeURIComponent(impUid)}`, {
            headers: { Authorization: token },
        });
        const data = await res.json();
        if (data.code !== 0 || !data.response) return null;
        return data.response;
    } catch {
        return null;
    }
}

async function cancelPortOnePayment(params: {
    token: string;
    impUid: string;
    merchantUid?: string;
    /** 부분 환불일 때만 지정. 전액 환불이면 undefined로 두어 PortOne이 clean 승인취소 처리 */
    amount?: number;
    reason: string;
}): Promise<{ ok: true } | { ok: false; error: string; code?: number }> {
    try {
        const body: Record<string, unknown> = {
            imp_uid: params.impUid,
            merchant_uid: params.merchantUid,
            reason: params.reason,
        };
        // amount 생략 시 전액 승인취소 (당일 결제면 카드사 매입 전이라 즉시 반영)
        if (typeof params.amount === "number" && params.amount > 0) {
            body.amount = params.amount;
        }
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
 * 환불 금액 계산.
 * - 결제 후 COOLING_OFF_MS 이내 해지 → 전액 환불 (isFullRefund=true)
 * - 그 이후 해지 → ms 비율 pro-rata (abuse 방지)
 * - 만료 지난 결제: 0원
 */
function computeRefund(params: {
    amount: number;
    paidAt: Date;
    expiresAt: Date;
    now: Date;
}): {
    refund: number;
    isFullRefund: boolean;
    daysUsed: number;
    daysTotal: number;
    daysRemaining: number;
} {
    const { amount, paidAt, expiresAt, now } = params;
    const totalMs = Math.max(1, expiresAt.getTime() - paidAt.getTime());
    const usedMs = Math.max(0, now.getTime() - paidAt.getTime());
    const remainingMs = Math.max(0, expiresAt.getTime() - now.getTime());

    const daysTotal = Math.max(1, Math.round(totalMs / DAY_MS));
    const daysUsed = Math.max(0, Math.floor(usedMs / DAY_MS));
    const daysRemaining = Math.max(0, Math.round(remainingMs / DAY_MS));

    if (remainingMs <= 0) {
        return { refund: 0, isFullRefund: false, daysUsed, daysTotal, daysRemaining };
    }
    // 숙려기간 내 → 전액 환불
    if (usedMs < COOLING_OFF_MS) {
        return { refund: amount, isFullRefund: true, daysUsed, daysTotal, daysRemaining };
    }
    // 이후 → 일할 환불 (ms 비율)
    const refund = Math.min(amount, Math.max(0, Math.floor((amount * remainingMs) / totalMs)));
    return { refund, isFullRefund: false, daysUsed, daysTotal, daysRemaining };
}

export async function POST(_request: NextRequest) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const adminSb = createAdminSupabase();
    const now = new Date();
    const claimedAt = now.toISOString();

    /**
     * 롤백 헬퍼: 포트원 cancel 실패했을 때 claim 풀어서 유저가 재시도 가능하게.
     * claimedAt 과 일치할 때만 null 로 되돌림 (타 요청이 덮어썼으면 그대로 둠)
     */
    async function rollbackClaim() {
        try {
            await adminSb
                .from("profiles")
                .update({ subscription_cancelled_at: null })
                .eq("id", user!.id)
                .eq("subscription_cancelled_at", claimedAt);
        } catch (e) {
            console.error("[cancel] rollback claim failed:", e);
        }
    }

    /** 환불 실패/이상 상태 시 관리자 텔레그램 알림 (비동기) */
    function alertAdmin(subject: string, detail: string) {
        void import("@/lib/telegram")
            .then(({ notifyError }) =>
                notifyError({
                    endpoint: "/api/subscription/cancel",
                    error: `${subject}\n${detail}`,
                    userId: user!.id,
                }),
            )
            .catch(() => {});
    }

    /**
     * 감사 로그 기록. 분쟁 대응 + 버그 추적용.
     * 실패해도 메인 플로우 영향 없게 try/catch 삼킴.
     */
    async function audit(entry: {
        action: string;
        success?: boolean;
        imp_uid?: string | null;
        merchant_uid?: string | null;
        payment_id?: string | null;
        amount?: number | null;
        refunded_amount?: number | null;
        is_full_refund?: boolean | null;
        days_used?: number | null;
        days_total?: number | null;
        error_message?: string | null;
        portone_code?: number | null;
        metadata?: Record<string, unknown>;
    }) {
        try {
            await adminSb.from("subscription_cancel_audit").insert({
                user_id: user!.id,
                user_email: user!.email ?? null,
                action: entry.action,
                success: entry.success ?? true,
                imp_uid: entry.imp_uid ?? null,
                merchant_uid: entry.merchant_uid ?? null,
                payment_id: entry.payment_id ?? null,
                amount: entry.amount ?? null,
                refunded_amount: entry.refunded_amount ?? null,
                is_full_refund: entry.is_full_refund ?? null,
                days_used: entry.days_used ?? null,
                days_total: entry.days_total ?? null,
                error_message: entry.error_message ?? null,
                portone_code: entry.portone_code ?? null,
                metadata: entry.metadata ?? {},
            });
        } catch (e) {
            console.error("[cancel] audit log insert failed:", e);
        }
    }

    try {
        // ========================================================================
        // 1. 원자적 락 획득
        //   - is_premium=true AND subscription_cancelled_at IS NULL 조건에서만 claim
        //   - 동시 요청/더블클릭: 둘 중 하나만 통과, 나머지는 409
        //   - 이미 해지 완료: is_premium=false → 조건 불일치 → 409
        //   - 이전 사고처럼 "부분취소 누적" 원천 차단
        // ========================================================================
        const { data: profile, error: claimErr } = await adminSb
            .from("profiles")
            .update({ subscription_cancelled_at: claimedAt })
            .eq("id", user.id)
            .eq("is_premium", true)
            .is("subscription_cancelled_at", null)
            .select("is_premium, premium_expires_at, premium_started_at, subscription_tier, subscription_phase")
            .maybeSingle();

        if (claimErr) {
            await audit({ action: "lock_failed", success: false, error_message: claimErr.message });
            return NextResponse.json({ error: "프로필 조회 실패", detail: claimErr.message }, { status: 500 });
        }
        if (!profile) {
            // 조건에 맞는 행이 없음 — 이미 해지되었거나 다른 요청이 진행 중
            await audit({ action: "lock_failed", success: false, error_message: "already_cancelling_or_cancelled" });
            return NextResponse.json(
                { error: "이미 해지 처리 중이거나 완료됐습니다. 잠시 후 다시 확인해주세요." },
                { status: 409 }
            );
        }

        await audit({
            action: "started",
            metadata: { tier: profile.subscription_tier, expires_at: profile.premium_expires_at },
        });

        // 2. 최근 paid 결제 조회 (환불 source)
        const { data: latestPaid } = await adminSb
            .from("payments")
            .select("id, merchant_uid, metadata, amount, created_at, status")
            .eq("user_id", user.id)
            .in("status", ["paid", "cancelled"])  // cancelled 도 조회해서 이중취소 방지 판단
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        // 이미 cancelled 상태면 다시 포트원 호출하지 않음 (DB/포트원 싱크만 맞춤)
        if (latestPaid && latestPaid.status === "cancelled") {
            alertAdmin(
                "최근 결제가 이미 cancelled 상태 — 포트원 재호출 없이 DB 정리만 진행",
                `user: ${user.email || user.id}, payment: ${latestPaid.id}`,
            );
        }

        const impUid = latestPaid && typeof latestPaid.metadata === "object" && latestPaid.metadata
            ? (latestPaid.metadata as Record<string, unknown>).imp_uid
            : null;

        // 2. 환불 금액 계산
        let refundStatus: "refunded_full" | "refunded_prorata" | "skipped_no_payment" | "skipped_no_remaining" | "skipped_no_imp_uid" = "skipped_no_payment";
        let refundedAmount = 0;
        let isFullRefund = false;
        let daysUsed = 0;
        let daysRemaining = 0;
        let daysTotal = 0;

        if (latestPaid) {
            const paidAt = new Date(latestPaid.created_at);
            const expiresAt = profile.premium_expires_at
                ? new Date(profile.premium_expires_at)
                : new Date(paidAt.getTime() + 30 * DAY_MS); // 폴백: 결제일 +30일
            const calc = computeRefund({
                amount: latestPaid.amount || 0,
                paidAt,
                expiresAt,
                now,
            });
            daysUsed = calc.daysUsed;
            daysRemaining = calc.daysRemaining;
            daysTotal = calc.daysTotal;
            refundedAmount = calc.refund;
            isFullRefund = calc.isFullRefund;

            if (refundedAmount <= 0) {
                refundStatus = "skipped_no_remaining";
            } else if (typeof impUid !== "string" || !impUid) {
                refundStatus = "skipped_no_imp_uid";
            } else {
                // 3. PortOne 환불 호출 (숙려기간 내면 전액, 아니면 부분)
                const token = await getPortOneToken();
                if (!token) {
                    await rollbackClaim();
                    await audit({
                        action: "portone_token_failed",
                        success: false,
                        imp_uid: impUid,
                        merchant_uid: latestPaid.merchant_uid,
                        payment_id: latestPaid.id,
                    });
                    alertAdmin("PortOne 토큰 발급 실패", `user: ${user.email || user.id}`);
                    return NextResponse.json(
                        { error: "결제 시스템 인증 실패 — 잠시 후 다시 시도해주세요" },
                        { status: 500 }
                    );
                }

                // 3-1. 포트원 현재 상태 선조회 — 이미 cancelled 면 재호출하지 않음 (부분취소 중첩 방지)
                const remoteStatus = await fetchPortOnePayment(token, impUid);
                if (remoteStatus?.status === "cancelled") {
                    // 포트원은 이미 cancelled, DB만 맞지 않았던 상태
                    refundStatus = (remoteStatus.cancel_amount ?? 0) >= (latestPaid.amount ?? 0)
                        ? "refunded_full"
                        : "refunded_prorata";
                    refundedAmount = remoteStatus.cancel_amount ?? refundedAmount;
                    await audit({
                        action: "portone_already_cancelled",
                        imp_uid: impUid,
                        merchant_uid: latestPaid.merchant_uid,
                        payment_id: latestPaid.id,
                        amount: latestPaid.amount,
                        refunded_amount: refundedAmount,
                    });
                    alertAdmin(
                        "포트원 이미 cancelled — 재호출 생략",
                        `user: ${user.email || user.id}, imp_uid: ${impUid}, cancel_amount: ${refundedAmount}`,
                    );
                } else {
                    const cancelResult = await cancelPortOnePayment({
                        token,
                        impUid,
                        merchantUid: latestPaid.merchant_uid || undefined,
                        // 전액 환불이면 amount 생략 → clean 승인취소 (KCP 매입요청 단계에 묶이지 않음)
                        // 부분 환불(24h 이후)일 때만 amount 명시
                        amount: isFullRefund ? undefined : refundedAmount,
                        reason: isFullRefund
                            ? `사용자 요청 — 24h 이내 해지 (전액 승인취소)`
                            : `사용자 요청 — 구독 해지 (사용 ${daysUsed}일 / 총 ${daysTotal}일 일할 환불)`,
                    });
                    if (!cancelResult.ok) {
                        // 실패: claim 롤백 + 관리자 경보 + 502
                        await rollbackClaim();
                        await audit({
                            action: "portone_cancel_failed",
                            success: false,
                            imp_uid: impUid,
                            merchant_uid: latestPaid.merchant_uid,
                            payment_id: latestPaid.id,
                            amount: latestPaid.amount,
                            refunded_amount: refundedAmount,
                            is_full_refund: isFullRefund,
                            days_used: daysUsed,
                            days_total: daysTotal,
                            error_message: cancelResult.error,
                            portone_code: cancelResult.code ?? null,
                        });
                        alertAdmin(
                            "PortOne cancel 실패 — 유저 재시도 가능 상태로 롤백",
                            `user: ${user.email || user.id}, imp_uid: ${impUid}, amount: ${refundedAmount}, error: ${cancelResult.error}, code: ${cancelResult.code ?? "n/a"}`,
                        );
                        return NextResponse.json(
                            {
                                error: `환불 처리 실패: ${cancelResult.error}. 문제가 계속되면 고객센터로 문의해주세요.`,
                                code: cancelResult.code,
                            },
                            { status: 502 }
                        );
                    }
                    refundStatus = isFullRefund ? "refunded_full" : "refunded_prorata";
                    await audit({
                        action: "portone_cancel_success",
                        imp_uid: impUid,
                        merchant_uid: latestPaid.merchant_uid,
                        payment_id: latestPaid.id,
                        amount: latestPaid.amount,
                        refunded_amount: refundedAmount,
                        is_full_refund: isFullRefund,
                        days_used: daysUsed,
                        days_total: daysTotal,
                    });
                }

                // payments 취소 반영 + 메타데이터
                await adminSb
                    .from("payments")
                    .update({
                        status: "cancelled",
                        metadata: {
                            ...((latestPaid.metadata as Record<string, unknown>) || {}),
                            cancelled_at: now.toISOString(),
                            cancel_reason: isFullRefund ? "사용자 해지 (숙려기간 전액 환불)" : "사용자 해지 (일할 환불)",
                            cancel_source: "user_cancel_api",
                            refunded_amount: refundedAmount,
                            original_amount: latestPaid.amount,
                            is_full_refund: isFullRefund,
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
            await audit({
                action: "db_updated",
                success: false,
                error_message: updateErr.message,
            });
            alertAdmin("profiles 갱신 실패 (포트원 cancel은 성공했을 수 있음, 수동 확인 필요)", `user: ${user.email || user.id}, error: ${updateErr.message}`);
            return NextResponse.json(
                { error: "프로필 갱신 실패", detail: updateErr.message },
                { status: 500 }
            );
        }
        await audit({ action: "db_updated" });

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
            refundStatus === "refunded_full"
                ? `구독이 해지되고 ${refundedAmount.toLocaleString()}원이 전액 환불되었습니다 (24시간 이내 해지). 카드 환불은 카드사 영업일 기준 3~5일 이내 반영됩니다.`
                : refundStatus === "refunded_prorata"
                ? `구독이 해지되고 ${refundedAmount.toLocaleString()}원이 환불되었습니다 (사용 ${daysUsed}일 / 총 ${daysTotal}일 일할 계산). 카드 환불은 카드사 영업일 기준 3~5일 이내 반영됩니다.`
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

        await audit({
            action: refundedAmount > 0 ? "completed" : "completed_no_refund",
            refunded_amount: refundedAmount,
            is_full_refund: isFullRefund,
            days_used: daysUsed,
            days_total: daysTotal,
            metadata: { refund_status: refundStatus },
        });

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
        await audit({ action: "exception", success: false, error_message: msg });
        alertAdmin("cancel route 예외 발생", `user: ${user.email || user.id}, error: ${msg}`);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
