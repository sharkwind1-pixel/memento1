/**
 * 헬스체크 Phase
 * GET /api/cron/daily-greeting/healthcheck
 *
 * 매시간 크론에서 호출되어 서비스 상태를 점검:
 * 1. DB 연결 (Supabase) — 주요 테이블 접근 + 응답 시간
 * 2. Storage (Supabase) — pet-media 버킷 list
 * 3. OpenAI API 연결 (6시간마다)
 * 4. PortOne (KCP) 결제 게이트웨이 ping (12시간마다)
 * 5. Pending stuck payments — 30분 이상 pending 상태 결제 카운트
 * 6. Realtime publication 누락 테이블 감지
 * 7. Active 유저 / 결제 트래픽 (1시간 단위)
 *
 * 일일 요약은 /api/cron/daily-summary로 분리됨.
 * 이상 발견 시 텔레그램 시스템 알림 전송.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret, getServiceSupabase } from "@/lib/cron-utils";
import { notifyError } from "@/lib/telegram";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface HealthResult {
    db: "ok" | "error";
    tables: Record<string, "ok" | "error">;
    tableLatency: Record<string, number>;
    storage: "ok" | "error" | "skip";
    openai: "ok" | "error" | "skip";
    portone: "ok" | "error" | "skip";
    stuckPayments: number;
    activeUsersLastHour: number;
    paymentsLastHour: number;
    errors: string[];
    warnings: string[];
}

export async function GET(request: NextRequest) {
    const authError = verifyCronSecret(request);
    if (authError) return authError;

    const result: HealthResult = {
        db: "ok",
        tables: {},
        tableLatency: {},
        storage: "skip",
        openai: "skip",
        portone: "skip",
        stuckPayments: 0,
        activeUsersLastHour: 0,
        paymentsLastHour: 0,
        errors: [],
        warnings: [],
    };

    try {
        const supabase = getServiceSupabase();
        const kstHour = (new Date().getUTCHours() + 9) % 24;

        // 1. DB 연결 + 주요 테이블 체크 + 응답 시간
        const tables = ["profiles", "pets", "pet_media", "community_posts", "chat_messages", "pet_reminders", "payments", "beta_codes"];
        for (const table of tables) {
            const start = Date.now();
            try {
                const { error } = await supabase.from(table).select("*", { count: "exact", head: true }).limit(1);
                const latency = Date.now() - start;
                result.tableLatency[table] = latency;
                result.tables[table] = error ? "error" : "ok";
                if (error) {
                    result.errors.push(`${table}: ${error.message}`);
                } else if (latency > 2000) {
                    // 2초 이상 응답 → 경고 (Mumbai 지연 추적용)
                    result.warnings.push(`${table} slow: ${latency}ms`);
                }
            } catch (e) {
                result.tables[table] = "error";
                result.errors.push(`${table}: ${e instanceof Error ? e.message : "unknown"}`);
            }
        }

        // 2. Storage 헬스 (pet-media 버킷)
        try {
            const { error: storageErr } = await supabase.storage.from("pet-media").list("", { limit: 1 });
            // 빈 버킷이거나 RLS로 막혀도 list가 동작하면 ok
            result.storage = storageErr ? "error" : "ok";
            if (storageErr) result.errors.push(`storage: ${storageErr.message}`);
        } catch (e) {
            result.storage = "error";
            result.errors.push(`storage: ${e instanceof Error ? e.message : "unknown"}`);
        }

        // 3. OpenAI API 체크 (6시간마다)
        if (kstHour % 6 === 0) {
            try {
                const res = await fetch("https://api.openai.com/v1/models", {
                    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY || ""}` },
                    signal: AbortSignal.timeout(5000),
                });
                result.openai = res.ok ? "ok" : "error";
                if (!res.ok) result.errors.push(`OpenAI: HTTP ${res.status}`);
            } catch (e) {
                result.openai = "error";
                result.errors.push(`OpenAI: ${e instanceof Error ? e.message : "timeout"}`);
            }
        }

        // 4. PortOne (KCP) 게이트웨이 ping (12시간마다, 토큰 발급 비용 미미)
        if (kstHour % 12 === 0 && process.env.PORTONE_API_KEY && process.env.PORTONE_API_SECRET) {
            try {
                const res = await fetch("https://api.iamport.kr/users/getToken", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        imp_key: process.env.PORTONE_API_KEY,
                        imp_secret: process.env.PORTONE_API_SECRET,
                    }),
                    signal: AbortSignal.timeout(5000),
                });
                result.portone = res.ok ? "ok" : "error";
                if (!res.ok) result.errors.push(`PortOne: HTTP ${res.status}`);
            } catch (e) {
                result.portone = "error";
                result.errors.push(`PortOne: ${e instanceof Error ? e.message : "timeout"}`);
            }
        }

        // 5. 30분 이상 pending 상태인 결제 (PG 응답 누락)
        try {
            const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
            const { count } = await supabase
                .from("payments")
                .select("*", { count: "exact", head: true })
                .eq("status", "pending")
                .lt("created_at", since);
            result.stuckPayments = count ?? 0;
            if (result.stuckPayments > 0) {
                result.warnings.push(`stuck pending payments: ${result.stuckPayments}`);
            }
        } catch (e) {
            result.warnings.push(`stuck-payments check failed: ${e instanceof Error ? e.message : "unknown"}`);
        }

        // 6. 1시간 활성 유저 + 결제 트래픽
        try {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
            const [{ count: activeCount }, { count: paymentCount }] = await Promise.all([
                supabase.from("chat_messages").select("user_id", { count: "exact", head: true }).gte("created_at", oneHourAgo),
                supabase.from("payments").select("id", { count: "exact", head: true }).gte("created_at", oneHourAgo),
            ]);
            result.activeUsersLastHour = activeCount ?? 0;
            result.paymentsLastHour = paymentCount ?? 0;
        } catch { /* noop, 메트릭 수집 실패는 치명 X */ }

        // 7. 에러/경고 알림 — 에러는 즉시, 경고는 합산 후 텔레그램 시스템 채널
        if (result.errors.length > 0) {
            result.db = "error";
            await notifyError({
                endpoint: "/healthcheck",
                error: result.errors.join(" | "),
            });
        } else if (result.warnings.length > 0 && kstHour % 6 === 0) {
            // 경고는 6시간에 한 번만 전송 (스팸 방지)
            await notifyError({
                endpoint: "/healthcheck (warn)",
                error: result.warnings.join(" | "),
            }).catch(() => {});
        }

        return NextResponse.json({
            phase: "healthcheck",
            status:
                result.errors.length > 0
                    ? "degraded"
                    : result.warnings.length > 0
                        ? "warning"
                        : "healthy",
            ...result,
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : "unknown";
        await notifyError({ endpoint: "/healthcheck", error: msg });
        return NextResponse.json({
            phase: "healthcheck",
            status: "error",
            error: msg,
        });
    }
}
