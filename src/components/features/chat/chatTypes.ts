/**
 * chatTypes.ts
 * AI 펫톡 채팅 관련 타입, 상수, 유틸리티
 * AIChatPage에서 분리 - 공유 타입과 상수 정의
 */

// ChatMessage 타입은 types/index.ts에서 중앙 관리
export type { ChatMessage } from "@/types";

/** 감정별 이모티콘 매핑 */
export const emotionIcons: Record<string, string> = {
    happy: "\u{1F60A}",
    sad: "\u{1F622}",
    anxious: "\u{1F630}",
    angry: "\u{1F620}",
    grateful: "\u{1F64F}",
    lonely: "\u{1F494}",
    peaceful: "\u{1F60C}",
    excited: "\u{1F929}",
    neutral: "\u{1F610}",
};

/** 감정별 펫 메시지 버블 배경색 (미묘한 틴트) */
export const emotionBubbleTint: Record<string, string> = {
    happy: "bg-yellow-50 border-yellow-100",
    sad: "bg-purple-50 border-purple-100",
    anxious: "bg-gray-100 border-gray-200",
    grateful: "bg-pink-50 border-pink-100",
    excited: "bg-yellow-50 border-yellow-100",
    peaceful: "bg-green-50 border-green-100",
};

/** 감정 라벨 (한국어) */
export const emotionLabels: Record<string, string> = {
    happy: "\uAE30\uC068",
    sad: "\uC2AC\uD514",
    anxious: "\uAC71\uC815",
    angry: "\uD654\uB0A8",
    grateful: "\uAC10\uC0AC",
    lonely: "\uC678\uB85C\uC6C0",
    peaceful: "\uD3C9\uC628",
    excited: "\uC2E0\uB0A8",
    neutral: "",
};

/**
 * 시간을 한국어 형식으로 포맷 (오전/오후 HH:MM)
 */
export function formatTimestamp(date: Date): string {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours < 12 ? "\uC624\uC804" : "\uC624\uD6C4";
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const displayMinutes = minutes.toString().padStart(2, "0");
    return `${period} ${displayHours}:${displayMinutes}`;
}

/**
 * 두 메시지 사이의 시간 간격이 5분 이상인지 확인
 */
export function hasTimeGap(prev: Date, curr: Date): boolean {
    return Math.abs(curr.getTime() - prev.getTime()) > 5 * 60 * 1000;
}
