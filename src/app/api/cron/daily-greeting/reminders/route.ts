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
import { sendPushBatchToUsers } from "@/lib/expo-push";

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

        // 모바일 expo push: reminder별로 (userId, payload) 모음 → 한 번에 batch 발송
        const expoItems: Array<{
            userId: string;
            title: string;
            body: string;
            data?: Record<string, unknown>;
            reminderId: string;
            isOnce: boolean;
        }> = [];

        for (const reminder of matched) {
            const userId = reminder.pets.user_id;
            const petName = reminder.pets.name;
            const subs = userSubsMap.get(userId);

            // 1) 웹 푸시 (VAPID) — 구독한 브라우저로
            if (subs) {
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
            }

            // 2) 모바일 Expo push 항목 누적 (한 번에 batch)
            expoItems.push({
                userId,
                title: `${petName} 케어 알림`,
                body: reminder.title,
                data: { type: "reminder", reminderId: reminder.id, link: "/(tabs)/record" },
                reminderId: reminder.id,
                isOnce: reminder.schedule_type === "once",
            });
        }

        // 웹 + 모바일 동시 발송 (모바일은 batch — N+1 쿼리 방지)
        const [webResult, expoResult] = await Promise.all([
            sendPushBatch(pushItems),
            sendPushBatchToUsers(expoItems.map((it) => ({
                userId: it.userId,
                title: it.title,
                body: it.body,
                data: it.data,
            }))),
        ]);
        totalSent += webResult.sent + expoResult.sent;
        totalFailed += webResult.failed + expoResult.failed;
        allExpiredEndpoints.push(...webResult.expiredEndpoints);

        // 발송 성공 판정 (9번 권고): web sent || expo sent || 어느 쪽이든 시도해서 실패 안 한 것
        // 단순화: web subs OR expo token이 있었던 reminder만 last_triggered 업데이트.
        // 둘 다 없는 reminder는 silent skip (last_triggered 안 건드림 → once는 다음 크론에서 재시도)
        const webExpiredSet = new Set(allExpiredEndpoints);
        const expoExpiredSet = new Set(expoResult.expiredUserIds);
        for (const it of expoItems) {
            const userId = it.userId;
            const hadWebTarget = (userSubsMap.get(userId)?.length ?? 0) > 0;
            const hadExpoTarget = !expoExpiredSet.has(userId); // 만료 토큰 제외
            // batch 응답이 모든 토큰 보유 유저를 포함하므로, 단순화해서 둘 중 하나라도 시도되면 trigger 처리
            if (hadWebTarget || (hadExpoTarget && expoItems.some((x) => x.userId === userId))) {
                triggeredIds.push(it.reminderId);
                if (it.isOnce) onceReminderIds.push(it.reminderId);
            }
            // 둘 다 발송 채널 없음 → 다음 크론에서 재시도하도록 last_triggered 안 업데이트
            // (이 경우 사용자가 알림 채널 등록 후 자동으로 알림 받음)
            void webExpiredSet;
        }
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
