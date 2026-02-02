/**
 * 커뮤니티 관련 상수
 * ==================
 * 게시판 카테고리, 정렬 옵션 등
 */

import { Coffee, Lightbulb, Heart, PawPrint } from "lucide-react";

/** 게시판 카테고리 정의 */
export const BOARD_CATEGORIES = [
    {
        id: "free",
        label: "자유게시판",
        icon: Coffee,
        color: "blue",
        description: "일상과 자랑, 자유로운 이야기",
        memorialOnly: false,
    },
    {
        id: "info",
        label: "정보 게시판",
        icon: Lightbulb,
        color: "emerald",
        description: "유용한 정보와 꿀팁 공유",
        memorialOnly: false,
    },
    {
        id: "pets",
        label: "동물 전용",
        icon: PawPrint,
        color: "amber",
        description: "우리 아이들의 귀여운 일상",
        memorialOnly: false,
    },
    {
        id: "healing",
        label: "치유 게시판",
        icon: Heart,
        color: "violet",
        description: "슬픔을 나누고 위로받는 공간",
        memorialOnly: true,
    },
] as const;

/** 게시판 ID 타입 */
export type BoardId = (typeof BOARD_CATEGORIES)[number]["id"];

/** 정렬 옵션 */
export const SORT_OPTIONS = [
    { id: "latest", label: "최신순", icon: "clock" },
    { id: "popular", label: "인기순", icon: "trending-up" },
    { id: "comments", label: "댓글순", icon: "message-circle" },
] as const;

/** 커뮤니티 카테고리 목록 */
export const COMMUNITY_CATEGORIES = [
    "전체",
    "일상공유",
    "질문답변",
    "정보공유",
    "병원후기",
    "훈련팁",
    "자유게시판",
] as const;

/** 공지사항 목록 */
export const NOTICE_LIST = [
    "커뮤니티 이용규칙 안내",
    "반려동물 응급상황 신고 가이드",
    "허위 분양글 신고 방법",
    "메멘토애니 새 기능 업데이트",
] as const;

/** 배지 스타일 (게시판별) */
export const BADGE_STYLES = {
    free: {
        자랑: "bg-[#BAE6FD] text-[#0369A1] dark:bg-blue-900/50 dark:text-blue-300",
        일상: "bg-[#E0F7FF] text-sky-700 dark:bg-sky-900/50 dark:text-sky-300",
        질문: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
        default: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    },
    info: {
        꿀팁: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
        자료: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300",
        정보: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300",
        추천: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
        default: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    },
    pets: {
        먹방: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
        일상: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
        케미: "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300",
        귀여움: "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300",
        default: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    },
    healing: {
        위로: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300",
        추억: "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300",
        정보: "bg-[#BAE6FD] text-[#0369A1] dark:bg-blue-900/50 dark:text-blue-300",
        고민: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
        default: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    },
} as const;
