/**
 * agent/helpers.ts - 순수 유틸리티 함수
 *
 * 외부 의존성 없는 순수 함수들. 날짜 계산, 라벨 변환 등.
 */

import type { EmotionType, GriefStage } from "@/types";

/** 날짜 차이 계산 (오늘 기준 몇 일 전인지) */
export function getDaysAgo(dateStr: string): number {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

/** 감정 타입 → 한국어 라벨 */
export function getEmotionLabel(emotion: EmotionType): string {
    const labels: Record<EmotionType, string> = {
        happy: "기쁨",
        sad: "슬픔",
        anxious: "불안",
        angry: "분노",
        grateful: "감사",
        lonely: "그리움",
        peaceful: "평화",
        excited: "설렘",
        neutral: "평온",
    };
    return labels[emotion] || "평온";
}

/** 애도 단계 → 한국어 라벨 */
export function getGriefStageLabel(stage: GriefStage): string {
    const labels: Record<GriefStage, string> = {
        denial: "부정 단계 (아직 받아들이기 어려움)",
        anger: "분노 단계 (화남/자책)",
        bargaining: "타협 단계 (후회/만약에)",
        depression: "슬픔 단계 (깊은 그리움)",
        acceptance: "수용 단계 (점차 회복)",
        unknown: "불명확",
    };
    return labels[stage] || "불명확";
}
