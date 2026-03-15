/**
 * agent/reminders.ts - 리마인더 시스템 (케어 알림 CRUD)
 *
 * 산책, 식사, 약, 병원 등 반려동물 케어 일정 관리.
 * 대화에서 자동으로 리마인더를 추출하는 AI 기능도 포함.
 */

import { getSupabase, getOpenAI } from "./shared";
import { AI_CONFIG } from "@/config/constants";

// ---- 타입 정의 ----

export interface PetReminder {
    id?: string;
    petId: string;
    userId: string;
    type: "walk" | "meal" | "medicine" | "vaccine" | "grooming" | "vet" | "custom";
    title: string;
    description?: string;
    schedule: {
        type: "daily" | "weekly" | "monthly" | "once";
        time: string; // "09:00"
        dayOfWeek?: number; // weekly일 때
        dayOfMonth?: number; // monthly일 때
        date?: string; // once일 때 "2024-03-15"
    };
    enabled: boolean;
    lastTriggered?: string;
    createdAt?: string;
}

// ---- 리마인더 CRUD ----

/**
 * 리마인더 저장
 */
export async function saveReminder(
    userId: string,
    petId: string,
    reminder: Omit<PetReminder, "id" | "petId" | "userId" | "createdAt">
) {
    const { data, error } = await getSupabase()
        .from("pet_reminders")
        .insert({
            user_id: userId,
            pet_id: petId,
            type: reminder.type,
            title: reminder.title,
            description: reminder.description,
            schedule_type: reminder.schedule.type,
            schedule_time: reminder.schedule.time,
            schedule_day_of_week: reminder.schedule.dayOfWeek,
            schedule_day_of_month: reminder.schedule.dayOfMonth,
            schedule_date: reminder.schedule.date,
            enabled: reminder.enabled ?? true,
        })
        .select()
        .single();

    if (error) {
        return null;
    }

    return data;
}

/**
 * 리마인더 목록 조회
 */
export async function getReminders(
    userId: string,
    petId?: string
): Promise<PetReminder[]> {
    let query = getSupabase()
        .from("pet_reminders")
        .select("*")
        .eq("user_id", userId)
        .eq("enabled", true)
        .order("created_at", { ascending: false });

    if (petId) {
        query = query.eq("pet_id", petId);
    }

    const { data, error } = await query;

    if (error) {
        return [];
    }

    // DB 형식을 앱 형식으로 변환
    return (data || []).map(row => ({
        id: row.id,
        petId: row.pet_id,
        userId: row.user_id,
        type: row.type,
        title: row.title,
        description: row.description,
        schedule: {
            type: row.schedule_type,
            time: row.schedule_time,
            dayOfWeek: row.schedule_day_of_week,
            dayOfMonth: row.schedule_day_of_month,
            date: row.schedule_date,
        },
        enabled: row.enabled,
        lastTriggered: row.last_triggered,
        createdAt: row.created_at,
    }));
}

/**
 * 현재 시간에 트리거해야 할 리마인더 조회
 */
export async function getDueReminders(userId: string): Promise<PetReminder[]> {
    const now = new Date();
    const kstOffset = 9 * 60;
    const kst = new Date(now.getTime() + kstOffset * 60 * 1000);
    const currentTime = `${String(kst.getUTCHours()).padStart(2, '0')}:${String(kst.getUTCMinutes()).padStart(2, '0')}`;
    const currentDayOfWeek = kst.getUTCDay();
    const currentDayOfMonth = kst.getUTCDate();
    const todayStr = kst.toISOString().split('T')[0];

    const reminders = await getReminders(userId);

    return reminders.filter(reminder => {
        // 이미 오늘 트리거된 경우 스킵
        if (reminder.lastTriggered) {
            const lastTriggeredDate = reminder.lastTriggered.split('T')[0];
            if (lastTriggeredDate === todayStr) {
                return false;
            }
        }

        // 시간 체크 (+-5분 여유)
        const [remH, remM] = reminder.schedule.time.split(':').map(Number);
        const [curH, curM] = currentTime.split(':').map(Number);
        const remMinutes = remH * 60 + remM;
        const curMinutes = curH * 60 + curM;
        const timeDiff = Math.abs(curMinutes - remMinutes);

        if (timeDiff > 5) return false; // 5분 이상 차이나면 스킵

        // 스케줄 타입별 체크
        switch (reminder.schedule.type) {
            case "daily":
                return true;
            case "weekly":
                return reminder.schedule.dayOfWeek === currentDayOfWeek;
            case "monthly":
                return reminder.schedule.dayOfMonth === currentDayOfMonth;
            case "once":
                return reminder.schedule.date === todayStr;
            default:
                return false;
        }
    });
}

/**
 * 리마인더 트리거 기록 업데이트
 */
export async function markReminderTriggered(reminderId: string) {
    const { error } = await getSupabase()
        .from("pet_reminders")
        .update({ last_triggered: new Date().toISOString() })
        .eq("id", reminderId);

    if (error) {
        // 에러 처리
    }
}

/**
 * 리마인더 삭제
 */
export async function deleteReminder(reminderId: string) {
    const { error } = await getSupabase()
        .from("pet_reminders")
        .delete()
        .eq("id", reminderId);

    if (error) {
        return false;
    }

    return true;
}

/**
 * 리마인더 활성/비활성 토글
 */
export async function toggleReminder(reminderId: string, enabled: boolean) {
    const { error } = await getSupabase()
        .from("pet_reminders")
        .update({ enabled })
        .eq("id", reminderId);

    if (error) {
        return false;
    }

    return true;
}

/**
 * 대화에서 자동으로 리마인더 생성 제안
 */
export async function suggestReminderFromChat(
    message: string,
    petName: string
): Promise<Partial<PetReminder> | null> {
    try {
        const response = await getOpenAI().chat.completions.create({
            model: AI_CONFIG.AI_MODEL,
            messages: [
                {
                    role: "system",
                    content: `사용자의 메시지에서 리마인더를 생성할 만한 일정 정보가 있는지 분석하세요.

일정 정보가 있다면 다음 JSON 형식으로 응답:
{
    "type": "walk|meal|medicine|vaccine|grooming|vet|custom",
    "title": "리마인더 제목",
    "description": "상세 설명",
    "schedule": {
        "type": "daily|weekly|monthly|once",
        "time": "HH:MM",
        "dayOfWeek": 0-6 (weekly일 때만, 0=일요일),
        "date": "YYYY-MM-DD" (once일 때만)
    }
}

일정 정보가 없으면 null 반환

리마인더 타입:
- walk: 산책
- meal: 식사/간식
- medicine: 약/영양제
- vaccine: 예방접종
- grooming: 미용/목욕
- vet: 병원/건강검진
- custom: 기타

시간 변환:
- "아침" → "08:00"
- "점심" → "12:00"
- "저녁" → "18:00"
- "밤" → "21:00"

예시:
"매일 저녁 7시에 산책해요" → {"type": "walk", "title": "${petName} 저녁 산책", "schedule": {"type": "daily", "time": "19:00"}}
"다음 주 화요일 병원 가요" → {"type": "vet", "title": "${petName} 병원 방문", "schedule": {"type": "once", "time": "10:00", "date": "다음 화요일 날짜"}}`
                },
                { role: "user", content: message }
            ],
            max_tokens: 250,
            temperature: 0.3,
        });

        const result = response.choices[0]?.message?.content?.trim();
        if (!result || result === "null") return null;

        return JSON.parse(result);
    } catch {
        return null;
    }
}
