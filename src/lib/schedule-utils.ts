/**
 * 리마인더 스케줄 텍스트 생성 유틸리티
 * ReminderPanel(클라이언트)과 chat/route(서버) 양쪽에서 사용
 */

/** 요일 라벨 */
export const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

interface ScheduleInfo {
    type: string;
    time?: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
    date?: string;
}

/**
 * 스케줄 정보를 한국어 텍스트로 변환
 * @param schedule - 스케줄 정보
 * @param weeklyFormat - 매주 포맷 ("매주" | "요일마다", 기본값 "매주")
 */
export function formatScheduleText(
    schedule: ScheduleInfo,
    weeklyFormat: "매주" | "요일마다" = "매주"
): string {
    const time = (schedule.time || "00:00").slice(0, 5);
    switch (schedule.type) {
        case "daily":
            return `매일 ${time}`;
        case "weekly": {
            const day = schedule.dayOfWeek !== undefined
                ? DAY_LABELS[schedule.dayOfWeek]
                : "월";
            if (weeklyFormat === "요일마다") {
                return `${day}요일마다 ${time}`;
            }
            return `매주 ${day}요일 ${time}`;
        }
        case "monthly": {
            const dayOfMonth = schedule.dayOfMonth || 1;
            return `매월 ${dayOfMonth}일 ${time}`;
        }
        case "once":
            return `${schedule.date || ""} ${time}`.trim();
        default:
            return time;
    }
}
