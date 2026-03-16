/**
 * Phase 3: "1년 전 오늘" 타임라인 알림
 *
 * 매일 09시(KST)에 실행.
 * 1년 전 타임라인 기록이 있는 유저에게 푸시 발송.
 * 커서 기반 페이지네이션으로 대량 처리.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import {
    verifyCronSecret,
    getServiceSupabase,
    setupVapid,
    getKstTime,
    sendPushBatch,
    cleanupExpiredSubscriptions,
    fetchSubsForUsers,
    PAGE_SIZE,
} from "@/lib/cron-utils";

export async function GET(request: NextRequest) {
    const authErr = verifyCronSecret(request);
    if (authErr) return authErr;

    const kst = getKstTime();

    // 09시(KST)에만 실행
    if (kst.hour !== 9) {
        return NextResponse.json({
            phase: "timeline",
            skipped: true,
            reason: `현재 KST ${kst.hour}시 (09시에만 실행)`,
        });
    }

    try {
        setupVapid();
    } catch {
        return NextResponse.json({ error: "VAPID_NOT_CONFIGURED" }, { status: 500 });
    }

    const supabase = getServiceSupabase();

    // 1년 전 날짜 계산
    const oneYearAgo = new Date(kst.now);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const targetDate = oneYearAgo.toISOString().slice(0, 10);

    let totalSent = 0;
    const allExpiredEndpoints: string[] = [];

    // 커서 기반: timeline_entries.id 기준
    let cursor: string | null = null;
    let hasMore = true;

    while (hasMore) {
        let query = supabase
            .from("timeline_entries")
            .select("id, user_id, pet_id, title, pets!inner(name)")
            .eq("date", targetDate)
            .order("id", { ascending: true })
            .limit(PAGE_SIZE);

        if (cursor) {
            query = query.gt("id", cursor);
        }

        const { data: entries, error } = await query;

        if (error) {
            console.error("[Cron/Timeline] 조회 실패:", error.message);
            break;
        }

        if (!entries || entries.length === 0) {
            hasMore = false;
            break;
        }

        cursor = entries[entries.length - 1].id;
        if (entries.length < PAGE_SIZE) hasMore = false;

        // 유저별 첫 번째 엔트리만 (중복 방지)
        const userEntryMap = new Map<string, { petName: string; title: string }>();
        for (const entry of entries) {
            const pet = entry.pets as unknown as { name: string };
            if (!userEntryMap.has(entry.user_id)) {
                userEntryMap.set(entry.user_id, { petName: pet.name, title: entry.title });
            }
        }

        const userIds = Array.from(userEntryMap.keys());
        const userSubsMap = await fetchSubsForUsers(supabase, userIds);

        // 푸시 배치 구성
        const pushItems: { sub: { endpoint: string; p256dh: string; auth: string }; payload: { title: string; body: string; url: string } }[] = [];

        for (const userId of Array.from(userEntryMap.keys())) {
            const entry = userEntryMap.get(userId)!;
            const subs = userSubsMap.get(userId);
            if (!subs) continue;

            for (const sub of subs) {
                pushItems.push({
                    sub,
                    payload: {
                        title: `1년 전 오늘, ${entry.petName}과(와)의 기록`,
                        body: `"${entry.title}" - 이 날의 추억을 다시 만나보세요`,
                        url: "/?tab=record",
                    },
                });
            }
        }

        const result = await sendPushBatch(pushItems);
        totalSent += result.sent;
        allExpiredEndpoints.push(...result.expiredEndpoints);
    }

    const expiredCleaned = await cleanupExpiredSubscriptions(supabase, allExpiredEndpoints);

    return NextResponse.json({
        phase: "timeline",
        targetDate,
        sent: totalSent,
        expiredCleaned,
    });
}
