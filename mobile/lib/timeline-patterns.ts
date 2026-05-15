/**
 * 타임라인 패턴 분석 (모바일) — 웹 src/lib/agent/timeline-patterns.ts와 동일 룰.
 *
 * 블로그/매거진 글 약속:
 *   "꾸준한 기록이 임상 증상이 뚜렷하지 않은 초기 단계에서도
 *    건강 문제를 조기에 발견할 수 있는 강력한 단서가 됩니다."
 *
 * 룰 6종 (웹과 동일):
 *  1. mood="sick" 7일 내 3회+ → "최근 컨디션 저하 빈번"
 *  2. mood="sad" 14일 내 5회+ → "최근 감정 저조 패턴"
 *  3. category="배변" 7일 내 3회+ → "배변 이슈 빈도 높음"
 *  4. category="사료" 7일 내 5회+ → "식사 변화 자주 기록 중"
 *  5. (모바일 단순화: record_gap 룰은 인앱 자체 표시 빈도가 낮아 생략)
 *  6. category="건강" 30일 내 3회+ → "건강 이슈 누적"
 *
 * 모바일은 record.tsx 인라인 IIFE에서 추출. 웹과 다른 점:
 *  - record_gap 미적용 (모바일 푸시 채널이 더 적합)
 *  - 같은 우선순위 정렬 (alert > warn > info)
 *
 * 9번 팩트체커 권고: 코드 중복 제거 (record.tsx ~50줄 → import 1줄).
 */

export type TimelinePatternSeverity = "info" | "warn" | "alert";

export interface TimelinePatternMobile {
    code: "sick_frequent" | "sad_pattern" | "poop_issue" | "meal_change" | "health_accum";
    message: string;
    severity: TimelinePatternSeverity;
    needsVetConsult: boolean;
}

export interface TimelineEntryForPattern {
    date: string;
    mood?: "happy" | "normal" | "sad" | "sick" | string;
    category?: string;
}

/**
 * 가장 시급한 패턴 1개만 반환. 우선순위는 코드 순서 = 중요도 순.
 * (alert > warn은 자연스럽게 코드 순서로 결정 — sick_frequent/poop_issue가 alert,
 *  health_accum/sad_pattern/meal_change가 warn)
 */
export function getTopTimelinePattern(
    entries: TimelineEntryForPattern[],
): TimelinePatternMobile | null {
    if (entries.length === 0) return null;

    const within = (days: number) => {
        const since = new Date();
        since.setDate(since.getDate() - days);
        const sinceStr = since.toISOString().split("T")[0];
        return entries.filter((e) => e.date >= sinceStr);
    };

    // 1. mood="sick" 7일 내 3회+ → alert
    const sick7 = within(7).filter((e) => e.mood === "sick");
    if (sick7.length >= 3) {
        return {
            code: "sick_frequent",
            message: `최근 7일 동안 컨디션이 안 좋다고 ${sick7.length}번 기록됐어요. 수의사 상담을 고려해보세요.`,
            severity: "alert",
            needsVetConsult: true,
        };
    }

    // 2. category="배변" 7일 내 3회+ → alert
    const poop7 = within(7).filter((e) => e.category === "배변");
    if (poop7.length >= 3) {
        return {
            code: "poop_issue",
            message: `최근 7일 동안 배변 관련 기록이 ${poop7.length}번이에요. 식이/소화 문제 가능성, 수의사와 상담 권장.`,
            severity: "alert",
            needsVetConsult: true,
        };
    }

    // 3. category="건강" 30일 내 3회+ → warn
    const health30 = within(30).filter((e) => e.category === "건강");
    if (health30.length >= 3) {
        return {
            code: "health_accum",
            message: `최근 한 달 동안 건강 관련 기록이 ${health30.length}번이에요. 정기 건강검진을 고려해보세요.`,
            severity: "warn",
            needsVetConsult: true,
        };
    }

    // 4. mood="sad" 14일 내 5회+ → warn
    const sad14 = within(14).filter((e) => e.mood === "sad");
    if (sad14.length >= 5) {
        return {
            code: "sad_pattern",
            message: `최근 2주 동안 기분이 가라앉은 날이 ${sad14.length}번이에요. 환경 변화나 활동량을 살펴봐주세요.`,
            severity: "warn",
            needsVetConsult: false,
        };
    }

    // 5. category="사료" 7일 내 5회+ → warn
    const meal7 = within(7).filter((e) => e.category === "사료");
    if (meal7.length >= 5) {
        return {
            code: "meal_change",
            message: `최근 7일 동안 사료/식사 관련 기록이 ${meal7.length}번이에요. 식습관 변화를 꾸준히 살펴봐주세요.`,
            severity: "warn",
            needsVetConsult: false,
        };
    }

    return null;
}
