/**
 * 일일 요약 크론잡
 * GET /api/cron/daily-summary
 *
 * 매일 KST 09:00 (UTC 00:00) 실행
 * - 전체 회원 수, 오늘 가입자, AI 대화, 게시글, 신고 건수 집계
 * - 텔레그램 시스템 채널로 요약 발송
 * - 실패 시 명시적 에러 알림 (조용히 실패 방지)
 *
 * 수동 호출도 가능 (디버그/테스트용)
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret, getServiceSupabase, getKstTime } from "@/lib/cron-utils";
import { notifyDailySummary, notifyError } from "@/lib/telegram";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
    const authError = verifyCronSecret(request);
    if (authError) return authError;

    const kst = getKstTime();
    const todayStart = `${kst.dateStr}T00:00:00+09:00`;

    try {
        const supabase = getServiceSupabase();

        // 각 쿼리를 독립적으로 실행 (하나 실패해도 나머지 수집)
        const [usersRes, newUsersRes, chatsRes, postsRes, reportsRes] = await Promise.allSettled([
            supabase.from("profiles").select("id", { count: "estimated", head: true }),
            supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
            supabase.from("chat_messages").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
            supabase.from("community_posts").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
            supabase.from("reports").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
        ]);

        const getCount = (r: PromiseSettledResult<{ count: number | null }>) =>
            r.status === "fulfilled" ? (r.value.count ?? 0) : 0;

        const errors: string[] = [];
        for (const [name, r] of [
            ["users", usersRes],
            ["newUsers", newUsersRes],
            ["chats", chatsRes],
            ["posts", postsRes],
            ["reports", reportsRes],
        ] as const) {
            if (r.status === "rejected") {
                errors.push(`${name}: ${r.reason?.message || "unknown"}`);
            }
        }

        const summary = {
            totalUsers: getCount(usersRes),
            newUsers: getCount(newUsersRes),
            totalChats: getCount(chatsRes),
            totalPosts: getCount(postsRes),
            reports: getCount(reportsRes),
        };

        // 텔레그램 발송
        const sent = await notifyDailySummary(summary);

        if (!sent) {
            // 텔레그램 발송 실패는 별도 에러 알림 시도 (같은 채널로 한 번 더)
            await notifyError({
                endpoint: "/api/cron/daily-summary",
                error: `notifyDailySummary returned false - TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_SYSTEM 누락 가능`,
            }).catch(() => {});
        }

        // 쿼리 에러 있으면 별도 알림
        if (errors.length > 0) {
            await notifyError({
                endpoint: "/api/cron/daily-summary",
                error: `일부 쿼리 실패: ${errors.join(" | ")}`,
            }).catch(() => {});
        }

        return NextResponse.json({
            success: sent,
            kstDate: kst.dateStr,
            summary,
            queryErrors: errors,
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : "unknown";
        await notifyError({
            endpoint: "/api/cron/daily-summary",
            error: msg,
        }).catch(() => {});
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
