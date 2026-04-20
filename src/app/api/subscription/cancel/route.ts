/**
 * 구독 해지 API
 * POST /api/subscription/cancel
 *
 * **즉시 환불 + 즉시 차단 설계 (2026-04-20 재재설계)**:
 * 유저/운영 관점에서 "예약 해지(만료일까지 혜택 유지)"는 혼란 유발 +
 * 환불 CS 폭증. Netflix·카카오처럼 클릭 즉시 결제 취소·환불·유료기능 차단.
 *
 * 처리 흐름:
 * 1. 가장 최근 `paid` 결제 1건 조회 (refund source)
 * 2. PortOne V1 `/payments/cancel` 호출 → 카드사 환불 요청
 * 3. 성공 시 DB 즉시 정리:
 *    - payments.status='cancelled'
 *    - profiles: is_premium=false, tier=free, phase=active (lifecycle 정리), expires_at=null
 *    - subscriptions.status='cancelled'
 * 4. 웹훅이 뒤늦게 도착해도 idempotent (이미 cancelled면 덮어써도 상태 동일)
 *
 * 실패 처리:
 * - PortOne 환불 실패 시 DB 수정 없이 500 반환 → 유저 재시도 or CS 수동 환불
 * - "이미 환불된 결제" 응답은 성공으로 간주하고 DB만 정리
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, createServerSupabase, createAdminSupabase } from "@/lib/supabase-server";
import { sendSubscriptionCancelledEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

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
 * PortOne V1 결제 취소 (전액 환불).
 * 반환:
 *  - { ok: true }                 — 취소 성공 or 이미 취소된 상태
 *  - { ok: false, error, code }   — 카드사 거절/네트워크/인증 실패
 */
async function cancelPortOnePayment(params: {
    token: string;
    impUid: string;
    merchantUid?: string;
    reason: string;
}): Promise<{ ok: true } | { ok: false; error: string; code?: number }> {
    try {
        const res = await fetch("https://api.iamport.kr/payments/cancel", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: params.token,
            },
            body: JSON.stringify({
                imp_uid: params.impUid,
                merchant_uid: params.merchantUid,
                reason: params.reason,
                // amount 생략 = 전액 환불
            }),
        });
        const data = await res.json();
        // code 0 = 성공
        if (data.code === 0) return { ok: true };
        // 이미 취소된 건: 메시지에 "취소" 혹은 status=cancelled 포함
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

export async function POST(_request: NextRequest) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    try {
        const supabase = await createServerSupabase();
        const { data: profile, error: profileErr } = await supabase
            .from("profiles")
            .select("is_premium, premium_expires_at, subscription_tier, subscription_phase")
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

        // 1. 가장 최근 paid 결제 1건 조회 (환불 source)
        const { data: latestPaid } = await adminSb
            .from("payments")
            .select("id, merchant_uid, metadata, amount")
            .eq("user_id", user.id)
            .eq("status", "paid")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        const impUid = latestPaid && typeof latestPaid.metadata === "object" && latestPaid.metadata
            ? (latestPaid.metadata as Record<string, unknown>).imp_uid
            : null;

        // 2. PortOne 환불 요청 (imp_uid 존재 시만)
        let refundStatus: "refunded" | "skipped_no_imp_uid" | "failed" = "skipped_no_imp_uid";
        let refundError: string | null = null;
        let refundedAmount: number | null = null;

        if (latestPaid && typeof impUid === "string" && impUid) {
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
                reason: "사용자 요청 — 구독 해지",
            });
            if (!cancelResult.ok) {
                // 환불 실패 시 DB 건들지 않음 (재시도 가능 상태 유지)
                return NextResponse.json(
                    {
                        error: `환불 처리 실패: ${cancelResult.error}. 문제가 계속되면 고객센터로 문의해주세요.`,
                        code: cancelResult.code,
                    },
                    { status: 502 }
                );
            }
            refundStatus = "refunded";
            refundedAmount = latestPaid.amount || null;

            // payments 취소 반영
            await adminSb
                .from("payments")
                .update({
                    status: "cancelled",
                    metadata: {
                        ...((latestPaid.metadata as Record<string, unknown>) || {}),
                        cancelled_at: now.toISOString(),
                        cancel_reason: "사용자 요청 — 구독 해지 (즉시 환불)",
                        cancel_source: "user_cancel_api",
                    },
                })
                .eq("id", latestPaid.id);
        }

        // 3. profiles 즉시 무료화
        const { error: updateErr } = await adminSb
            .from("profiles")
            .update({
                is_premium: false,
                premium_expires_at: null,
                subscription_tier: "free",
                subscription_phase: "active", // lifecycle 리셋
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

        // 4. subscriptions 취소
        await adminSb
            .from("subscriptions")
            .update({
                status: "cancelled",
                cancelled_at: now.toISOString(),
                updated_at: now.toISOString(),
            })
            .eq("user_id", user.id);

        // 5. 이메일 (실패해도 플로우 유지)
        if (user.email) {
            const { data: profileDetail } = await adminSb
                .from("profiles")
                .select("nickname")
                .eq("id", user.id)
                .maybeSingle();
            void sendSubscriptionCancelledEmail(
                user.email,
                profileDetail?.nickname || null,
                null, // 즉시 해지이므로 만료일 없음
            );
        }

        // 6. 인앱 알림
        const notifBody =
            refundStatus === "refunded"
                ? "구독이 즉시 해지되고 결제가 환불되었습니다. 카드 환불은 카드사 영업일 기준 3~5일 이내 반영됩니다."
                : "구독이 즉시 해지되었습니다. 환불 대상 결제가 없어 환불 처리는 진행되지 않았습니다.";

        const { error: notifErr } = await adminSb.from("notifications").insert({
            user_id: user.id,
            type: "subscription_cancelled",
            title: "구독이 해지되었습니다",
            body: notifBody,
            metadata: {
                refund_status: refundStatus,
                refunded_amount: refundedAmount,
            },
            dedup_key: `sub_cancelled_${now.toISOString().slice(0, 10)}_${user.id}`,
        });
        if (notifErr && notifErr.code !== "23505") {
            console.error("[subscription/cancel] notification insert failed:", notifErr.message);
        }

        // 7. 관리자 텔레그램 알림
        void import("@/lib/telegram")
            .then(({ notifyPayment }) =>
                notifyPayment({
                    email: user.email || "(unknown)",
                    plan: `cancelled (${refundStatus})`,
                    amount: refundedAmount ? -refundedAmount : 0,
                })
            )
            .catch(() => {});

        return NextResponse.json({
            ok: true,
            refund_status: refundStatus,
            refund_error: refundError,
            refunded_amount: refundedAmount,
        });
    } catch (e) {
        const msg = e instanceof Error ? e.message : "서버 오류";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
