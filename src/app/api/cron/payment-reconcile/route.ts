/**
 * /api/cron/payment-reconcile
 *
 * 결제 상태 재검증 크론 (매시간).
 *
 * 목적:
 * - 포트원 웹훅이 실패·누락됐을 때를 위한 안전망.
 * - 최근 60일 `payments.status='paid'` 결제를 포트원 API로 재조회해
 *   실제 cancelled 상태면 DB 강제 동기화(결제/프리미엄/구독 모두 정리).
 * - 이로써 어떤 경로의 환불(카드사 분쟁, KCP 직접 취소, 포트원 콘솔 등)도
 *   최대 1시간 내 반드시 반영됨.
 *
 * 보안: CRON_SECRET 인증 필수.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronSecret } from "@/lib/cron-utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getAdminSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("SUPABASE_CONFIG_MISSING");
    return createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

async function getPortOneToken(): Promise<string | null> {
    const imp_key = process.env.PORTONE_REST_API_KEY;
    const imp_secret = process.env.PORTONE_API_SECRET;
    if (!imp_key || !imp_secret) return null;

    const res = await fetch("https://api.iamport.kr/users/getToken", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imp_key, imp_secret }),
        cache: "no-store",
    });
    const data = await res.json();
    return data?.response?.access_token || null;
}

interface PaidRow {
    id: string;
    user_id: string;
    merchant_uid: string | null;
    metadata: Record<string, unknown> | null;
}

export async function GET(request: NextRequest) {
    const authError = verifyCronSecret(request);
    if (authError) return authError;

    const supabase = getAdminSupabase();

    // 최근 90일 paid 결제 조회 (KCP 카드사 분쟁 기간 60~90일 커버).
    // NOTE: Vercel Hobby cron 하루 1회 제약 → 최대 24h 지연 가능.
    // Pro 전환 또는 다른 크론에서 호출 보강 필요.
    const windowStart = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: paid, error: fetchErr } = await supabase
        .from("payments")
        .select("id, user_id, merchant_uid, metadata")
        .eq("status", "paid")
        .gte("created_at", windowStart)
        .limit(500);

    if (fetchErr) {
        return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    const rows = (paid as PaidRow[] | null) || [];
    if (rows.length === 0) {
        return NextResponse.json({ ok: true, checked: 0, reconciled: 0 });
    }

    const token = await getPortOneToken();
    if (!token) {
        return NextResponse.json({ error: "PORTONE_TOKEN_FAILED" }, { status: 500 });
    }

    let reconciled = 0;
    let errors = 0;
    let missingImpUid = 0;
    const reconciledIds: string[] = [];

    for (const row of rows) {
        const impUid = typeof row.metadata?.imp_uid === "string" ? row.metadata.imp_uid : "";
        if (!impUid) {
            // metadata.imp_uid가 없는 row는 포트원 재조회 불가 → 수동 조사 필요.
            // 신규 결제 파이프라인은 imp_uid를 항상 저장하지만, 구형/마이그레이션 누락 row 가능.
            missingImpUid++;
            continue;
        }

        try {
            const res = await fetch(
                `https://api.iamport.kr/payments/${encodeURIComponent(impUid)}`,
                { headers: { Authorization: token }, cache: "no-store" },
            );
            const data = await res.json();
            if (data.code !== 0 || !data.response) continue;

            const portoneStatus = data.response.status;
            if (portoneStatus !== "cancelled") continue;

            // 부분 취소(pro-rata 환불) vs 전액 취소 구분.
            // - 전액 취소: 유료 기능 전부 해제
            // - 부분 취소: payments 상태만 동기화 (profile은 premium 유지; 남은 기간 사용)
            const cancelAmount = Number(data.response.cancel_amount) || 0;
            const totalAmount = Number(data.response.amount) || 0;
            const isFullCancel = cancelAmount >= totalAmount && totalAmount > 0;

            await supabase
                .from("payments")
                .update({
                    status: "cancelled",
                    metadata: {
                        ...(row.metadata || {}),
                        reconcile_cancelled_at: new Date().toISOString(),
                        reconcile_source: "cron",
                        cancel_reason: data.response.cancel_reason || null,
                        portone_cancel_amount: cancelAmount,
                        portone_original_amount: totalAmount,
                        is_full_cancel: isFullCancel,
                    },
                })
                .eq("id", row.id);

            if (isFullCancel) {
                // 전액 환불이 확인된 경우에만 프로필/구독도 정리
                await supabase
                    .from("profiles")
                    .update({
                        is_premium: false,
                        premium_expires_at: null,
                        subscription_tier: "free",
                        subscription_phase: "active",
                        subscription_cancelled_at: null,
                    })
                    .eq("id", row.user_id);

                await supabase
                    .from("subscriptions")
                    .update({
                        status: "cancelled",
                        cancelled_at: new Date().toISOString(),
                    })
                    .eq("user_id", row.user_id);
            }
            // 부분 취소는 payments만 cancelled 로 표시하고, 유저는 premium_expires_at까지 기존 혜택 유지.
            // (pro-rata 환불 정책상 이미 일수만큼 돈 받은 상태라 현재 남은 기간 쓰는 게 맞음)

            reconciled++;
            reconciledIds.push(row.id);
        } catch (err) {
            console.error(`[payment-reconcile] ${row.id} 재검증 실패:`, err);
            errors++;
        }
    }

    // 실제로 동기화된 건/에러/imp_uid 누락 건 중 하나라도 있으면 텔레그램 알림
    if (reconciled > 0 || errors > 0 || missingImpUid > 0) {
        const errorParts: string[] = [];
        if (errors > 0) errorParts.push(`${errors}건 재검증 실패`);
        if (missingImpUid > 0) errorParts.push(`${missingImpUid}건 imp_uid 누락 (수동 조사 필요)`);
        import("@/lib/telegram").then(({ notifyCronResult }) =>
            notifyCronResult({
                phase: "payment-reconcile",
                kstHour: new Date().getUTCHours() + 9,
                sent: reconciled,
                failed: errors + missingImpUid,
                error: errorParts.length > 0 ? errorParts.join(" / ") : undefined,
            }),
        ).catch(() => {});
    }

    return NextResponse.json({
        ok: true,
        checked: rows.length,
        reconciled,
        reconciled_ids: reconciledIds,
        errors,
        missing_imp_uid: missingImpUid,
    });
}
