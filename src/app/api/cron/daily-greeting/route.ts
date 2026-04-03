/**
 * 푸시 알림 크론 오케스트레이터 (매시간 실행)
 *
 * Supabase pg_cron + pg_net으로 매시간 호출.
 * 4개 Phase를 병렬 실행:
 *   Phase 1: 케어 리마인더 (/reminders)
 *   Phase 2: AI 펫톡 인사 (/greetings)
 *   Phase 3: 1년 전 오늘 타임라인 (/timeline) — 09시만
 *   Phase 4: 추모 앨범 자동 생성 (/albums) — 09시만
 *
 * 스케일 전략 (100만 유저 대응):
 * - 각 Phase가 독립 엔드포인트로 분리 → 병렬 실행
 * - 각 Phase 내부에서 커서 기반 페이지네이션 (500명씩)
 * - 인사말: 템플릿 기반 (기념일만 AI) → GPT 호출 99% 절감
 * - 푸시 발송: 50개 동시 (Promise.allSettled)
 * - DB 쿼리: .in() 200개씩 분할 → Supabase 한계 회피
 * - maxDuration=300 (5분) → Vercel Pro 기준
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret, getKstTime } from "@/lib/cron-utils";

interface PhaseResult {
    phase: string;
    [key: string]: unknown;
}

/**
 * 내부 Phase 엔드포인트 호출
 * Vercel 내부에서 자기 자신을 호출하므로 localhost 대신 NEXT_PUBLIC_SITE_URL 사용
 */
async function callPhase(
    phasePath: string,
    cronSecret: string,
    signal: AbortSignal,
): Promise<PhaseResult> {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";

    const url = `${baseUrl}/api/cron/daily-greeting/${phasePath}`;

    try {
        const res = await fetch(url, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${cronSecret}`,
            },
            signal,
        });

        if (!res.ok) {
            const body = await res.text();
            return { phase: phasePath, error: `HTTP ${res.status}: ${body}` };
        }

        return await res.json();
    } catch (err) {
        return {
            phase: phasePath,
            error: err instanceof Error ? err.message : "unknown",
        };
    }
}

export async function GET(request: NextRequest) {
    // 인증 검증
    const authErr = verifyCronSecret(request);
    if (authErr) return authErr;

    const cronSecret = process.env.CRON_SECRET!;
    const kst = getKstTime();

    // AbortController로 전체 타임아웃 관리 (4분 30초)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 270_000);

    try {
        // 5개 Phase 병렬 실행 (헬스체크 추가)
        const [reminders, greetings, timeline, albums, healthcheck] = await Promise.allSettled([
            callPhase("reminders", cronSecret, controller.signal),
            callPhase("greetings", cronSecret, controller.signal),
            callPhase("timeline", cronSecret, controller.signal),
            callPhase("albums", cronSecret, controller.signal),
            callPhase("healthcheck", cronSecret, controller.signal),
        ]);

        const results: Record<string, unknown> = {};

        for (const [name, result] of [
            ["reminders", reminders],
            ["greetings", greetings],
            ["timeline", timeline],
            ["albums", albums],
            ["healthcheck", healthcheck],
        ] as const) {
            if (result.status === "fulfilled") {
                results[name] = result.value;
            } else {
                results[name] = { error: result.reason?.message || "unknown" };
            }
        }

        // 에러가 있는 phase만 텔레그램 알림 (비동기)
        import("@/lib/telegram").then(({ notifyCronResult }) => {
            for (const [name, data] of Object.entries(results)) {
                const d = data as Record<string, unknown>;
                if (d.error || (typeof d.failed === "number" && d.failed > 0)) {
                    notifyCronResult({
                        phase: name,
                        kstHour: kst.hour,
                        error: d.error as string | undefined,
                        sent: d.sent as number | undefined,
                        failed: d.failed as number | undefined,
                    });
                }
            }
        }).catch(() => {});

        return NextResponse.json({
            message: "크론 실행 완료",
            kstHour: kst.hour,
            results,
        });
    } catch (err) {
        // 크론 전체 실패 시 텔레그램 알림
        import("@/lib/telegram").then(({ notifyError }) =>
            notifyError({ endpoint: "/api/cron/daily-greeting", error: err instanceof Error ? err.message : "unknown" })
        ).catch(() => {});

        console.error("[Cron] 오케스트레이터 오류:", err instanceof Error ? err.message : "unknown");
        return NextResponse.json(
            { error: "크론 실행 중 오류 발생" },
            { status: 500 },
        );
    } finally {
        clearTimeout(timeout);
    }
}
