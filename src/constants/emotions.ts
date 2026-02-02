/**
 * 감정 관련 상수
 * ================
 * AI 펫톡에서 사용하는 감정 타입과 아이콘 매핑
 */

import type { EmotionType } from "@/types";

/** 감정별 이모티콘 매핑 */
export const EMOTION_ICONS: Record<EmotionType, string> = {
    happy: "😊",
    sad: "😢",
    anxious: "😰",
    angry: "😠",
    grateful: "🙏",
    lonely: "💔",
    peaceful: "😌",
    excited: "🤩",
    neutral: "😐",
};

/** 감정별 한글 라벨 */
export const EMOTION_LABELS: Record<EmotionType, string> = {
    happy: "행복",
    sad: "슬픔",
    anxious: "불안",
    angry: "분노",
    grateful: "감사",
    lonely: "외로움",
    peaceful: "평화",
    excited: "설렘",
    neutral: "보통",
};

/** 감정별 색상 */
export const EMOTION_COLORS: Record<EmotionType, string> = {
    happy: "text-yellow-500",
    sad: "text-blue-500",
    anxious: "text-purple-500",
    angry: "text-red-500",
    grateful: "text-green-500",
    lonely: "text-gray-500",
    peaceful: "text-teal-500",
    excited: "text-pink-500",
    neutral: "text-gray-400",
};
