/**
 * 헬스체크 Phase
 * GET /api/cron/daily-greeting/healthcheck
 *
 * 매시간 크론에서 호출되어 서비스 상태를 점검:
 * 1. DB 연결 (Supabase)
 * 2. 주요 테이블 접근
 * 3. OpenAI API 연결 (6시간마다)
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
    openai: "ok" | "error" | "skip";
    errors: string[];
}

export async function GET(request: NextRequest) {
    const authError = verifyCronSecret(request);
    if (authError) return authError;

    const result: HealthResult = {
        db: "ok",
        tables: {},
        openai: "skip",
        errors: [],
    };

    try {
        const supabase = getServiceSupabase();

        // 1. DB 연결 + 주요 테이블 체크
        const tables = ["profiles", "pets", "pet_media", "community_posts", "chat_messages", "pet_reminders"];
        for (const table of tables) {
            try {
                const { error } = await supabase.from(table).select("id").limit(1);
                result.tables[table] = error ? "error" : "ok";
                if (error) result.errors.push(`${table}: ${error.message}`);
            } catch (e) {
                result.tables[table] = "error";
                result.errors.push(`${table}: ${e instanceof Error ? e.message : "unknown"}`);
            }
        }

        // 2. OpenAI API 체크 (매 6시간마다만 - 비용 절약)
        const kstHour = (new Date().getUTCHours() + 9) % 24;
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

        // 일일 요약은 /api/cron/daily-summary로 분리됨

        // 4. 에러가 있으면 텔레그램 알림
        if (result.errors.length > 0) {
            result.db = "error";
            await notifyError({
                endpoint: "/healthcheck",
                error: result.errors.join(" | "),
            });
        }

        return NextResponse.json({
            phase: "healthcheck",
            status: result.errors.length === 0 ? "healthy" : "degraded",
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
