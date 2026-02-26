/**
 * chatTypes.ts
 * AI 펫톡 채팅 관련 타입, 상수, 유틸리티
 * AIChatPage에서 분리 - 공유 타입과 상수 정의
 */

// ChatMessage 타입은 types/index.ts에서 중앙 관리
export type { ChatMessage } from "@/types";

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
