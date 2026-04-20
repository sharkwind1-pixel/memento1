/**
 * /api/payments/webhook
 *
 * 포트원 V1 결제 웹훅 수신 엔드포인트.
 * 포트원 콘솔 > 고객사 관리 > 결제 알림(Webhook) 관리에 이 URL을 등록해야 동작.
 * URL: https://mementoani.com/api/payments/webhook
 *
 * 목적:
 * - KCP/카드사에서 발생한 **비동기 이벤트** (취소, 환불, 실패, 카드 만료 등)를
 *   실시간으로 우리 DB에 반영.
 * - 이 엔드포인트 없이는 KCP 상점관리자에서 승인취소해도 우리 서비스는
 *   프리미엄을 계속 제공하는 구조적 결함.
 *
 * 보안:
 * - body만으로는 신뢰 불가 (위변조 가능). 반드시 `imp_uid`로 포트원 API 재조회해서
 *   실제 결제 상태를 확인한 뒤 DB 반영.
 * - 포트원이 명시적 서명 헤더를 제공하지 않으므로 서명 검증은 생략, 재조회가 진실.
 *
 * 이벤트별 처리:
 * - paid: payments.status 확인, 이미 처리됐으면 skip
 * - cancelled / refund: payments.status='cancelled' + 프리미엄 해제 + subscription cancel
 * - failed: payments.status='failed' + 관리자 알림
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface PortOneV1Payment {
    imp_uid: string;
    merchant_uid: string;
    status: "ready" | "paid" | "cancelled" | "failed";
    amount: number;
    cancel_amount?: number;
    cancelled_at?: number;
    cancel_reason?: string;
    fail_reason?: string;
    pay_method?: string;
    card_name?: string;
    paid_at?: number;
}

function getAdminSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("SUPABASE_CONFIG_MISSING");
    return createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

/** 포트원 V1 REST API 토큰 발급 */
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

/** imp_uid로 포트원 결제 정보 재조회 (위변조 방지 핵심) */
async function fetchPortOnePayment(impUid: string, token: string): Promise<PortOneV1Payment | null> {
    const res = await fetch(`https://api.iamport.kr/payments/${encodeURIComponent(impUid)}`, {
        headers: { Authorization: token },
    });
    const data = await res.json();
    if (data.code !== 0 || !data.response) return null;
    return data.response as PortOneV1Payment;
}

export async function POST(request: NextRequest) {
    let bodyJson: Record<string, unknown> = {};
    try {
        bodyJson = await request.json();
    } catch {
        return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    // 디버깅을 위해 포트원 원본 payload 기록 — 포맷이 V1인지 V2인지 파악 + 필드 누락 감지
    console.log("[webhook] incoming body:", JSON.stringify(bodyJson).slice(0, 800));

    // 포트원 V1 포맷: { imp_uid, merchant_uid, status }
    // 포트원 V2 포맷: { type: "Transaction.*", data: { paymentId, transactionId, ... } }
    let impUid = "";
    let merchantUid = "";
    if (typeof bodyJson.imp_uid === "string" && bodyJson.imp_uid) {
        impUid = bodyJson.imp_uid;
        merchantUid = typeof bodyJson.merchant_uid === "string" ? bodyJson.merchant_uid : "";
    } else if (typeof bodyJson.type === "string" && bodyJson.data && typeof bodyJson.data === "object") {
        const data = bodyJson.data as Record<string, unknown>;
        // V2는 paymentId(우리 merchant_uid)와 transactionId 둘 다 존재 가능
        merchantUid = typeof data.paymentId === "string" ? data.paymentId : "";
        impUid = typeof data.transactionId === "string" ? data.transactionId : merchantUid;
    }

    if (!impUid || !merchantUid) {
        console.error("[webhook] missing ids, body keys:", Object.keys(bodyJson));
        return NextResponse.json({ error: "missing_ids" }, { status: 400 });
    }

    try {
        // 1. 포트원 API 토큰 + 재조회
        const token = await getPortOneToken();
        if (!token) {
            console.error("[webhook] PortOne token 발급 실패");
            return NextResponse.json({ error: "token_failed" }, { status: 500 });
        }

        const payment = await fetchPortOnePayment(impUid, token);
        if (!payment) {
            console.error(`[webhook] payment not found in PortOne: ${impUid}`);
            return NextResponse.json({ error: "payment_not_found" }, { status: 404 });
        }

        // 2. DB에서 해당 payment row 조회.
        // payments.id(UUID)와 payments.merchant_uid("memento_xxx")가 별도 컬럼이므로
        // 포트원이 돌려준 merchant_uid는 merchant_uid 컬럼으로 조회해야 매칭됨.
        // 구형 결제나 포맷 변화 대비 imp_uid 컬럼도 fallback 시도.
        const supabase = getAdminSupabase();
        let { data: dbPayment, error: fetchErr } = await supabase
            .from("payments")
            .select("id, user_id, status, metadata")
            .eq("merchant_uid", merchantUid)
            .maybeSingle();

        if (!dbPayment && impUid) {
            const fallback = await supabase
                .from("payments")
                .select("id, user_id, status, metadata")
                .eq("imp_uid", impUid)
                .maybeSingle();
            dbPayment = fallback.data;
            fetchErr = fallback.error;
        }

        if (fetchErr || !dbPayment) {
            console.error(`[webhook] DB payment not found: ${merchantUid}`, fetchErr);
            // 404여도 200 반환: 포트원이 재시도하지 않도록 (데이터 정합 문제면 수동 조사)
            return NextResponse.json({ ack: true, note: "db_row_missing" });
        }

        // 3. 실제 포트원 status 기반 처리
        const actualStatus = payment.status;

        if (actualStatus === "cancelled") {
            // 취소/환불: payments + profiles + subscriptions 모두 정리
            await supabase
                .from("payments")
                .update({
                    status: "cancelled",
                    metadata: {
                        ...(dbPayment.metadata as Record<string, unknown> || {}),
                        webhook_cancelled_at: new Date().toISOString(),
                        cancel_reason: payment.cancel_reason || null,
                        cancel_amount: payment.cancel_amount || null,
                    },
                })
                .eq("id", dbPayment.id);

            await supabase
                .from("profiles")
                .update({
                    is_premium: false,
                    premium_expires_at: null,
                    subscription_tier: "free",
                    subscription_phase: "active",
                    subscription_cancelled_at: null,
                })
                .eq("id", dbPayment.user_id);

            await supabase
                .from("subscriptions")
                .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
                .eq("user_id", dbPayment.user_id);

            // 관리자 알림 (비동기)
            import("@/lib/telegram").then(({ notifyPayment }) =>
                notifyPayment({
                    email: "(webhook)",
                    plan: "cancelled",
                    amount: -(payment.cancel_amount || payment.amount),
                }),
            ).catch(() => {});

            return NextResponse.json({ ack: true, handled: "cancelled" });
        }

        if (actualStatus === "failed") {
            await supabase
                .from("payments")
                .update({
                    status: "failed",
                    metadata: {
                        ...(dbPayment.metadata as Record<string, unknown> || {}),
                        webhook_failed_at: new Date().toISOString(),
                        fail_reason: payment.fail_reason || null,
                    },
                })
                .eq("id", dbPayment.id);

            import("@/lib/telegram").then(({ notifyError }) =>
                notifyError({
                    endpoint: "/api/payments/webhook",
                    error: `결제 실패 알림: ${payment.fail_reason || "unknown"}`,
                    userId: dbPayment.user_id,
                }),
            ).catch(() => {});

            return NextResponse.json({ ack: true, handled: "failed" });
        }

        if (actualStatus === "paid") {
            // 이미 complete 경로에서 paid로 처리됐을 가능성 높음.
            // DB status가 'pending'/'verifying'으로 남아있으면 강제 보정.
            if (dbPayment.status !== "paid") {
                await supabase
                    .from("payments")
                    .update({
                        status: "paid",
                        metadata: {
                            ...(dbPayment.metadata as Record<string, unknown> || {}),
                            webhook_paid_at: new Date().toISOString(),
                            note: "complete 경로 놓친 결제를 웹훅이 보정",
                        },
                    })
                    .eq("id", dbPayment.id);
            }
            return NextResponse.json({ ack: true, handled: "paid", already: dbPayment.status === "paid" });
        }

        // ready 등 중간 상태
        return NextResponse.json({ ack: true, handled: "noop", portone_status: actualStatus });
    } catch (err) {
        console.error("[webhook] 서버 오류:", err);
        return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
}

export async function GET() {
    // 포트원이 가끔 GET으로 핑 찌를 수 있음
    return NextResponse.json({ ok: true, endpoint: "payment webhook" });
}
