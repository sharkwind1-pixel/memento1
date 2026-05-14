/**
 * 타임라인 패턴 분석 (AI 케어 어시스턴트)
 *
 * 블로그/매거진 글 약속:
 *   "꾸준한 기록이 임상 증상이 뚜렷하지 않은 초기 단계에서도
 *    건강 문제를 조기에 발견할 수 있는 강력한 단서가 됩니다."
 *
 * timeline_entries의 mood / category / 날짜 분포를 분석해
 * 보호자가 놓칠 수 있는 신호를 감지.
 *
 * 감지 패턴 (모두 정량적, 거짓 양성 최소화):
 *  1. mood="sick" 7일 내 3회 이상 → "최근 컨디션 저하 빈번"
 *  2. mood="sad" 14일 내 5회 이상 → "최근 감정 저조 패턴"
 *  3. category="배변" 7일 내 3회 이상 → "배변 이슈 빈도 높음"
 *  4. category="사료" 7일 내 5회 이상 → "식사 변화 자주 기록 중"
 *  5. 최근 14일 기록 0건 + 이전엔 활발 → "기록 공백 (사용자 케어 약화 신호)"
 *  6. category="건강" 30일 내 3회 이상 → "건강 이슈 누적"
 *
 * AI 펫톡에서 자동 감지 → 시스템 메시지 또는 첫 인사에 자연스럽게 언급.
 * 별도 알림 없음 (스팸 방지). 사용자가 직접 보거나 채팅에서 받음.
 */

import type { TimelineEntry } from "@/types";

export type PatternSeverity = "info" | "warn" | "alert";

export interface TimelinePattern {
    /** 패턴 종류 식별자 */
    code:
        | "sick_frequent"
        | "sad_pattern"
        | "poop_issue"
        | "meal_change"
        | "record_gap"
        | "health_accum";
    /** 보호자에게 보여줄 메시지 (펫 인격 톤 X, 정보 톤) */
    message: string;
    /** 수의사 상담 권장 여부 */
    needsVetConsult: boolean;
    /** 심각도 */
    severity: PatternSeverity;
    /** 감지 근거 (entry id 목록 — 디버깅/표시용) */
    relatedEntryIds: string[];
    /** 감지 기간 (며칠) */
    windowDays: number;
}

/** 날짜 문자열(YYYY-MM-DD)을 KST 자정 Date로 변환 */
function parseDate(s: string): Date {
    return new Date(s + "T00:00:00+09:00");
}

/** N일 전 ~ 오늘 사이의 entry만 필터 */
function withinDays(entries: TimelineEntry[], days: number): TimelineEntry[] {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split("T")[0];
    return entries.filter((e) => e.date >= sinceStr);
}

/**
 * 타임라인 패턴 분석.
 * 입력: 펫의 timeline_entries 배열 (최신순 정렬 가정).
 * 출력: 감지된 패턴 배열 (없으면 빈 배열).
 *
 * 비용: O(n). 클라이언트/서버 어디서나 호출 가능, 외부 API 호출 0.
 */
export function analyzeTimelinePatterns(entries: TimelineEntry[]): TimelinePattern[] {
    if (entries.length === 0) return [];

    const patterns: TimelinePattern[] = [];

    // 1. mood="sick" 7일 내 3회+
    const sick7 = withinDays(entries.filter((e) => e.mood === "sick"), 7);
    if (sick7.length >= 3) {
        patterns.push({
            code: "sick_frequent",
            message: `최근 7일 동안 컨디션이 안 좋다고 ${sick7.length}번 기록됐어요. 수의사 상담을 고려해보세요.`,
            needsVetConsult: true,
            severity: "alert",
            relatedEntryIds: sick7.map((e) => e.id),
            windowDays: 7,
        });
    }

    // 2. mood="sad" 14일 내 5회+
    const sad14 = withinDays(entries.filter((e) => e.mood === "sad"), 14);
    if (sad14.length >= 5) {
        patterns.push({
            code: "sad_pattern",
            message: `최근 2주 동안 기분이 가라앉은 날이 ${sad14.length}번이에요. 환경 변화나 활동량을 살펴봐주세요.`,
            needsVetConsult: false,
            severity: "warn",
            relatedEntryIds: sad14.map((e) => e.id),
            windowDays: 14,
        });
    }

    // 3. category="배변" 7일 내 3회+
    const poop7 = withinDays(entries.filter((e) => e.category === "배변"), 7);
    if (poop7.length >= 3) {
        patterns.push({
            code: "poop_issue",
            message: `최근 7일 동안 배변 관련 기록이 ${poop7.length}번이에요. 식이/소화 문제 가능성, 수의사와 상담 권장.`,
            needsVetConsult: true,
            severity: "alert",
            relatedEntryIds: poop7.map((e) => e.id),
            windowDays: 7,
        });
    }

    // 4. category="사료" 7일 내 5회+ (식사 변화 잦음)
    const meal7 = withinDays(entries.filter((e) => e.category === "사료"), 7);
    if (meal7.length >= 5) {
        patterns.push({
            code: "meal_change",
            message: `최근 7일 동안 사료/식사 관련 기록이 ${meal7.length}번이에요. 식습관 변화를 꾸준히 살펴봐주세요.`,
            needsVetConsult: false,
            severity: "warn",
            relatedEntryIds: meal7.map((e) => e.id),
            windowDays: 7,
        });
    }

    // 5. 최근 14일 기록 0건 + 이전 14일엔 3건 이상 (사용자 케어 약화 가능 신호)
    const recent14 = withinDays(entries, 14);
    if (recent14.length === 0) {
        const prev = entries.filter((e) => {
            const d = parseDate(e.date);
            const since = new Date();
            since.setDate(since.getDate() - 28);
            const until = new Date();
            until.setDate(until.getDate() - 14);
            return d >= since && d < until;
        });
        if (prev.length >= 3) {
            patterns.push({
                code: "record_gap",
                message: "최근 2주 동안 기록이 멈춰있어요. 한 줄이라도 다시 시작해보세요. 작은 기록이 큰 단서가 됩니다.",
                needsVetConsult: false,
                severity: "info",
                relatedEntryIds: prev.map((e) => e.id),
                windowDays: 14,
            });
        }
    }

    // 6. category="건강" 30일 내 3회+
    const health30 = withinDays(entries.filter((e) => e.category === "건강"), 30);
    if (health30.length >= 3) {
        patterns.push({
            code: "health_accum",
            message: `최근 한 달 동안 건강 관련 기록이 ${health30.length}번이에요. 정기 건강검진을 고려해보세요.`,
            needsVetConsult: true,
            severity: "warn",
            relatedEntryIds: health30.map((e) => e.id),
            windowDays: 30,
        });
    }

    return patterns;
}

/**
 * 가장 시급한 패턴 1개만 반환 (UI에 1개씩 보여줄 때).
 * 우선순위: alert > warn > info, 동일 severity면 최근 entry 많은 것.
 */
export function getTopPattern(entries: TimelineEntry[]): TimelinePattern | null {
    const patterns = analyzeTimelinePatterns(entries);
    if (patterns.length === 0) return null;

    const severityRank = { alert: 3, warn: 2, info: 1 };
    return patterns.sort((a, b) => {
        const sDiff = severityRank[b.severity] - severityRank[a.severity];
        if (sDiff !== 0) return sDiff;
        return b.relatedEntryIds.length - a.relatedEntryIds.length;
    })[0];
}
