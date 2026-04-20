/**
 * /api/cron/stuck-refund-check
 *
 * 환불 이상 상태 감지 크론 (매 6시간).
 *
 * 목적:
 * - 이번 사고처럼 KCP 매입요청 hold, 네트워크 장애, 감사 로그의 failed 이벤트 등
 *   "DB는 완료로 기록됐지만 실제 환불이 안 흘러간" 건을 자동으로 포착.
 * - 감지 시 관리자 텔레그램(TELEGRAM_CHAT_PAYMENT)로 즉시 에스컬레이션.
 *
 * 감지 룰:
 *  A) DB cancelled + metadata.refunded_amount > 0 지만 포트원 cancel_amount < refunded_amount
 *     (= KCP 쪽에 반영 실패 혹은 부분만 반영)
 *  B) 감사 로그의 portone_cancel_failed / portone_token_failed / exception 이벤트
 *     중 최근 24h 내 발생 건 미처리
 *
 * 재시도 대상이 아니므로 감지만 함. 실제 보정은 관리자 UI에서 수동.
 *
 * 보안: CRON_SECRET 인증.
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
    });
    const data = await res.json();
    return data?.response?.access_token || null;
}

async function fetchPortOnePayment(token: string, impUid: string): Promise<{
    status: string;
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

interface SuspectPayment {
    id: string;
    user_id: string;
    amount: number | null;
    merchant_uid: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
}

interface Finding {
    imp_uid: string;
    payment_id: string;
    user_id: string;
    db_refunded: number;
    portone_cancel_amount: number;
    portone_status: string;
    diff: number;
    age_hours: number;
    already_alerted: boolean;
}

export async function GET(request: NextRequest) {
    const authError = verifyCronSecret(request);
    if (authError) return authError;

    const supabase = getAdminSupabase();

    // 최근 30일 cancelled 결제 중 refunded_amount 기록된 것만
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: cancelledPayments, error: fetchErr } = await supabase
        .from("payments")
        .select("id, user_id, amount, merchant_uid, metadata, created_at")
        .eq("status", "cancelled")
        .gte("created_at", thirtyDaysAgo)
        .limit(300);

    if (fetchErr) {
        return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    const rows = (cancelledPayments as SuspectPayment[] | null) || [];
    const findings: Finding[] = [];

    const token = await getPortOneToken();
    if (!token) {
        return NextResponse.json({ error: "PORTONE_TOKEN_FAILED" }, { status: 500 });
    }

    // 24h 내에 이미 경보 보낸 imp_uid는 중복 알림 스킵 (dedup)
    const dedupSince = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentlyAlerted } = await supabase
        .from("subscription_cancel_audit")
        .select("imp_uid")
        .eq("action", "stuck_refund_alerted")
        .gte("created_at", dedupSince);
    const dedupSet = new Set(
        (recentlyAlerted ?? [])
            .map((r: { imp_uid: string | null }) => r.imp_uid)
            .filter(Boolean) as string[],
    );

    for (const row of rows) {
        const md = row.metadata || {};
        const impUid = typeof md.imp_uid === "string" ? md.imp_uid : "";
        // JSONB는 number/string 구분 유지하지만 과거 데이터 중 string 저장된 것도 있을 수 있음 → Number() 강제 변환
        const dbRefunded = Number(md.refunded_amount) || 0;
        if (!impUid || dbRefunded <= 0) continue;

        const portone = await fetchPortOnePayment(token, impUid);
        if (!portone) continue;
        const portoneCancelAmount = portone.cancel_amount || 0;

        // DB가 더 큰 환불액을 기록했는데 포트원은 덜 환불한 상태 = 누락
        if (portoneCancelAmount < dbRefunded) {
            const ageHours = (Date.now() - new Date(row.created_at).getTime()) / (60 * 60 * 1000);
            const alreadyAlerted = dedupSet.has(impUid);
            findings.push({
                imp_uid: impUid,
                payment_id: row.id,
                user_id: row.user_id,
                db_refunded: dbRefunded,
                portone_cancel_amount: portoneCancelAmount,
                portone_status: portone.status,
                diff: dbRefunded - portoneCancelAmount,
                age_hours: Math.round(ageHours * 10) / 10,
                already_alerted: alreadyAlerted,
            });
        }
    }

    // 감사 로그의 최근 24h 실패 이벤트도 수집
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentFailures } = await supabase
        .from("subscription_cancel_audit")
        .select("id, user_id, user_email, imp_uid, action, error_message, created_at, portone_code")
        .eq("success", false)
        .gte("created_at", dayAgo)
        .order("created_at", { ascending: false })
        .limit(50);

    // 24h 이내 이미 알린 건은 제외 (dedup)
    const newFindings = findings.filter((f) => !f.already_alerted);

    // 텔레그램 알림 (신규 이상만)
    if (newFindings.length > 0 || (recentFailures && recentFailures.length > 0)) {
        const lines: string[] = ["🚨 환불 이상 감지 (stuck-refund-check)"];
        if (newFindings.length > 0) {
            lines.push(`\n[A] DB/포트원 환불액 불일치: ${newFindings.length}건 신규`);
            for (const f of newFindings.slice(0, 10)) {
                lines.push(
                    `• imp_uid: ${f.imp_uid}\n  DB: ${f.db_refunded.toLocaleString()}원 / 포트원: ${f.portone_cancel_amount.toLocaleString()}원 (차이 ${f.diff.toLocaleString()}원)\n  status: ${f.portone_status}, 경과: ${f.age_hours}h`,
                );
            }
            // dedup 기록 — 다음 실행부터 같은 imp_uid는 24h 스킵
            await supabase.from("subscription_cancel_audit").insert(
                newFindings.map((f) => ({
                    user_id: f.user_id,
                    imp_uid: f.imp_uid,
                    action: "stuck_refund_alerted",
                    success: false,
                    refunded_amount: f.db_refunded,
                    error_message: `포트원 cancel_amount=${f.portone_cancel_amount}, DB=${f.db_refunded}, 차이=${f.diff}`,
                    metadata: {
                        portone_status: f.portone_status,
                        age_hours: f.age_hours,
                    },
                })),
            );
        }
        if (recentFailures && recentFailures.length > 0) {
            lines.push(`\n[B] 감사 로그 24h 내 실패 이벤트: ${recentFailures.length}건`);
            for (const f of recentFailures.slice(0, 10)) {
                lines.push(
                    `• ${f.action} (${f.created_at.slice(0, 19)})\n  user: ${f.user_email || f.user_id}, imp_uid: ${f.imp_uid || "-"}\n  error: ${f.error_message || "-"}, code: ${f.portone_code ?? "-"}`,
                );
            }
        }
        const body = lines.join("\n");
        void import("@/lib/telegram")
            .then(({ notifyError }) =>
                notifyError({ endpoint: "/api/cron/stuck-refund-check", error: body.slice(0, 2000) }),
            )
            .catch(() => {});
    }

    return NextResponse.json({
        ok: true,
        checked: rows.length,
        findings_count: findings.length,
        new_findings_count: newFindings.length,
        deduped_count: findings.length - newFindings.length,
        failed_audit_count: recentFailures?.length ?? 0,
        findings,
    });
}
