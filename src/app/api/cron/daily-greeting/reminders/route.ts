/**
 * Phase 1: 케어 리마인더 푸시 알림
 *
 * 현재 KST 시간에 해당하는 리마인더를 조회하여 푸시 발송.
 * 커서 기반 페이지네이션으로 대량 유저 처리.
 *
 * - 스케줄 타입: daily / weekly / monthly / once
 * - once는 발송 후 자동 비활성화
 * - 추모 모드 펫의 리마인더는 스킵
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

interface ReminderWithPet {
    id: string;
    pet_id: string;
    type: string;
    title: string;
    schedule_type: string;
    schedule_time: string;
    schedule_day_of_week: number | null;
    schedule_day_of_month: number | null;
    schedule_date: string | null;
    pets: { user_id: string; name: string; status: string };
}

export async function GET(request: NextRequest) {
    const authErr = verifyCronSecret(request);
    if (authErr) return authErr;

    try {
        setupVapid();
    } catch {
        return NextResponse.json({ error: "VAPID_NOT_CONFIGURED" }, { status: 500 });
    }

    const supabase = getServiceSupabase();
    const kst = getKstTime();
    const hourStr = String(kst.hour).padStart(2, "0");
    const timeFrom = `${hourStr}:00:00`;
    const timeTo = `${hourStr}:59:59`;

    let totalSent = 0;
    let totalFailed = 0;
    let totalExpiredCleaned = 0;
    const allExpiredEndpoints: string[] = [];
    const onceReminderIds: string[] = [];
    const triggeredIds: string[] = [];

    // 커서 기반 페이지네이션: id 기준 오름차순
    let cursor: string | null = null;
    let hasMore = true;

    while (hasMore) {
        // 리마인더 조회 (active 펫만, 현재 시간 매칭)
        let query = supabase
            .from("pet_reminders")
            .select(`
                id, pet_id, type, title,
                schedule_type, schedule_time,
                schedule_day_of_week, schedule_day_of_month, schedule_date,
                pets!inner(user_id, name, status)
            `)
            .eq("enabled", true)
            .eq("pets.status", "active")
            .gte("schedule_time", timeFrom)
            .lte("schedule_time", timeTo)
            .order("id", { ascending: true })
            .limit(PAGE_SIZE);

        if (cursor) {
            query = query.gt("id", cursor);
        }

        const { data: reminders, error } = await query;

        if (error) {
            console.error("[Cron/Reminders] 조회 실패:", error.message);
            break;
        }

        if (!reminders || reminders.length === 0) {
            hasMore = false;
            break;
        }

        // 다음 페이지 커서
        cursor = reminders[reminders.length - 1].id;
        if (reminders.length < PAGE_SIZE) hasMore = false;

        // 스케줄 타입별 필터링
        const matched = (reminders as unknown as ReminderWithPet[]).filter((r) => {
            switch (r.schedule_type) {
                case "daily":
                    return true;
                case "weekly":
                    return r.schedule_day_of_week === kst.dayOfWeek;
                case "monthly":
                    return r.schedule_day_of_month === kst.day;
                case "once":
                    return r.schedule_date === kst.dateStr;
                default:
                    return false;
            }
        });

        if (matched.length === 0) continue;

        // 유저별 구독 조회
        const userIds = Array.from(new Set(matched.map((r) => r.pets.user_id)));
        const userSubsMap = await fetchSubsForUsers(supabase, userIds);

        // 푸시 발송 배치 구성
        const pushItems: { sub: { endpoint: string; p256dh: string; auth: string }; payload: { title: string; body: string; url: string } }[] = [];

        for (const reminder of matched) {
            const userId = reminder.pets.user_id;
            const petName = reminder.pets.name;
            const subs = userSubsMap.get(userId);
            if (!subs) continue;

            for (const sub of subs) {
                pushItems.push({
                    sub,
                    payload: {
                        title: `${petName} 케어 알림`,
                        body: reminder.title,
                        url: "/?tab=record",
                    },
                });
            }

            triggeredIds.push(reminder.id);
            if (reminder.schedule_type === "once") {
                onceReminderIds.push(reminder.id);
            }
        }

        // 배치 발송
        const result = await sendPushBatch(pushItems);
        totalSent += result.sent;
        totalFailed += result.failed;
        allExpiredEndpoints.push(...result.expiredEndpoints);
    }

    // last_triggered 업데이트 (200개씩 분할)
    for (let i = 0; i < triggeredIds.length; i += 200) {
        const chunk = triggeredIds.slice(i, i + 200);
        await supabase
            .from("pet_reminders")
            .update({ last_triggered: new Date().toISOString() })
            .in("id", chunk);
    }

    // once 리마인더 비활성화
    for (let i = 0; i < onceReminderIds.length; i += 200) {
        const chunk = onceReminderIds.slice(i, i + 200);
        await supabase
            .from("pet_reminders")
            .update({ enabled: false, last_triggered: new Date().toISOString() })
            .in("id", chunk);
    }

    // 만료 구독 정리
    totalExpiredCleaned = await cleanupExpiredSubscriptions(supabase, allExpiredEndpoints);

    return NextResponse.json({
        phase: "reminders",
        kstHour: kst.hour,
        sent: totalSent,
        failed: totalFailed,
        expiredCleaned: totalExpiredCleaned,
        remindersProcessed: triggeredIds.length,
        onceDisabled: onceReminderIds.length,
    });
}
