/**
 * communityTypes.ts
 * 커뮤니티 관련 타입, 상수, 유틸리티
 * CommunityPage에서 분리 - 공유 타입과 상수 정의
 */

import {
    Coffee,
    Cloud,
    Heart,
    MapPin,
    AlertTriangle,
} from "lucide-react";
import type { CommunitySubcategory, PostTag } from "@/types";

/** DB 연동 게시글 타입 */
export interface Post {
    id: string;
    userId: string;
    subcategory: CommunitySubcategory;
    tag?: PostTag;
    badge: string;
    title: string;
    content: string;
    authorName: string;
    likes: number;
    views: number;
    comments: number;
    imageUrls?: string[];
    createdAt: string;
    isPublic?: boolean;
    isPinned?: boolean; // 상단 고정 (공지)
    noticeScope?: "board" | "global" | null; // 공지 범위
    region?: string; // 지역 (지역정보 게시판)
    authorMinimiSlug?: string | null; // 작성자 미니미 slug (미니홈피 아바타 표시용)
    authorPoints?: number; // 작성자 포인트 (등급 아이콘 표시용)
    authorIsAdmin?: boolean; // 작성자 관리자 여부 (관리자 아이콘 표시용)
}

// 서브카테고리 정의 (5개)
export const SUBCATEGORIES: {
    id: CommunitySubcategory;
    label: string;
    icon: React.ElementType;
    color: string;
    description: string;
    memorialOnly?: boolean;
}[] = [
    {
        id: "free",
        label: "자유게시판",
        icon: Coffee,
        color: "blue",
        description: "일상, 정보, 질문 등 자유로운 이야기",
    },
    {
        id: "memorial",
        label: "기억게시판",
        icon: Cloud,
        color: "violet",
        description: "함께했던 기억을 나누고 위로받는 공간",
        memorialOnly: true,
    },
    {
        id: "adoption",
        label: "입양정보",
        icon: Heart,
        color: "rose",
        description: "새 가족을 기다리는 친구들",
    },
    {
        id: "local",
        label: "지역정보",
        icon: MapPin,
        color: "emerald",
        description: "우리 동네 반려동물 정보",
    },
    {
        id: "lost",
        label: "분실동물",
        icon: AlertTriangle,
        color: "amber",
        description: "분실/발견 동물 찾기",
    },
];

// 자유게시판 말머리(태그) 옵션
export const POST_TAGS: { id: PostTag; label: string; color: string }[] = [
    { id: "일상", label: "일상", color: "sky" },
    { id: "정보", label: "정보", color: "emerald" },
    { id: "질문", label: "질문", color: "amber" },
    { id: "강아지", label: "강아지", color: "orange" },
    { id: "고양이", label: "고양이", color: "pink" },
    { id: "새", label: "새", color: "cyan" },
    { id: "물고기", label: "물고기", color: "blue" },
    { id: "토끼", label: "토끼", color: "rose" },
    { id: "파충류", label: "파충류", color: "green" },
];

// 자유게시판 뱃지(게시글 유형) 필터 옵션
// "함께 보기"는 독립 뷰로 분리됨 (ShowcaseGalleryView)
export const FREE_BADGES: { id: string; label: string; color: string }[] = [
    { id: "일상", label: "일상", color: "sky" },
    { id: "질문", label: "질문", color: "amber" },
    { id: "수다", label: "수다", color: "pink" },
    { id: "꿀팁", label: "꿀팁", color: "emerald" },
];

// 분실동물 게시판 뱃지(분실/발견) 필터 옵션
export const LOST_BADGES: { id: string; label: string; color: string }[] = [
    { id: "분실", label: "분실", color: "red" },
    { id: "발견", label: "발견", color: "emerald" },
];

// 지역정보 게시판 지역 필터 옵션 (17개 시/도)
export const LOCAL_REGIONS: { id: string; label: string }[] = [
    { id: "서울", label: "서울" },
    { id: "경기", label: "경기" },
    { id: "부산", label: "부산" },
    { id: "대구", label: "대구" },
    { id: "인천", label: "인천" },
    { id: "광주", label: "광주" },
    { id: "대전", label: "대전" },
    { id: "울산", label: "울산" },
    { id: "세종", label: "세종" },
    { id: "강원", label: "강원" },
    { id: "충북", label: "충북" },
    { id: "충남", label: "충남" },
    { id: "전북", label: "전북" },
    { id: "전남", label: "전남" },
    { id: "경북", label: "경북" },
    { id: "경남", label: "경남" },
    { id: "제주", label: "제주" },
];

// 배지 색상 (서브카테고리별)
export const getBadgeStyle = (badge: string, subcategory: CommunitySubcategory) => {
    // 공지 뱃지 (모든 게시판 공통)
    if (badge === "공지") {
        return "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 border border-red-200 dark:border-red-700";
    }
    if (subcategory === "memorial") {
        switch (badge) {
            case "위로":
                return "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300";
            case "추억":
                return "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300";
            case "정보":
                return "bg-memento-200 text-memento-700 dark:bg-blue-900/50 dark:text-blue-300";
            case "고민":
                return "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300";
            default:
                return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
        }
    }
    if (subcategory === "free") {
        switch (badge) {
            case "자랑":
                return "bg-memento-200 text-memento-700 dark:bg-blue-900/50 dark:text-blue-300";
            case "일상":
                return "bg-memento-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300";
            case "질문":
                return "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300";
            case "꿀팁":
                return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300";
            default:
                return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
        }
    }
    if (subcategory === "adoption") {
        switch (badge) {
            case "입양":
                return "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300";
            case "긴급":
                return "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300";
            case "분양":
                return "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300";
            default:
                return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
        }
    }
    if (subcategory === "local") {
        switch (badge) {
            case "추천":
                return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300";
            case "정보":
                return "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300";
            case "모임":
                return "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300";
            default:
                return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
        }
    }
    if (subcategory === "lost") {
        switch (badge) {
            case "분실":
                return "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300";
            case "발견":
                return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300";
            case "완료":
                return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
            default:
                return "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300";
        }
    }
    return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
};

// 말머리 태그 색상
export const getTagColor = (color: string) => {
    const colors: Record<string, string> = {
        sky: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 border-sky-200 dark:border-sky-700",
        emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700",
        amber: "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300 border-amber-200 dark:border-amber-700",
        orange: "bg-orange-100 text-orange-700 dark:bg-gray-700/30 dark:text-orange-300 border-orange-200 dark:border-orange-700",
        pink: "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300 border-pink-200 dark:border-pink-700",
        cyan: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300 border-cyan-200 dark:border-cyan-700",
        blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-blue-200 dark:border-blue-700",
        rose: "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 border-rose-200 dark:border-rose-700",
        green: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 border-green-200 dark:border-green-700",
    };
    return colors[color] || colors.sky;
};

// 카테고리 색상
export const getCategoryColor = (color: string) => {
    switch (color) {
        case "violet":
            return {
                bg: "from-violet-500 to-purple-500",
                text: "text-violet-600 dark:text-violet-400",
                border: "border-violet-200 dark:border-violet-700",
                light: "bg-violet-50 dark:bg-violet-900/30",
            };
        case "blue":
            return {
                bg: "from-memento-500 to-memento-400",
                text: "text-memento-600 dark:text-memento-400",
                border: "border-memento-300 dark:border-memento-700",
                light: "bg-memento-100 dark:bg-blue-900/30",
            };
        case "emerald":
            return {
                bg: "from-emerald-500 to-teal-500",
                text: "text-emerald-600 dark:text-emerald-400",
                border: "border-emerald-200 dark:border-emerald-700",
                light: "bg-emerald-50 dark:bg-emerald-900/30",
            };
        case "amber":
            return {
                bg: "from-amber-500 to-orange-500",
                text: "text-amber-600 dark:text-amber-400",
                border: "border-amber-200 dark:border-amber-700",
                light: "bg-amber-50 dark:bg-amber-400/10",
            };
        case "rose":
            return {
                bg: "from-rose-500 to-pink-500",
                text: "text-rose-600 dark:text-rose-400",
                border: "border-rose-200 dark:border-rose-700",
                light: "bg-rose-50 dark:bg-rose-900/30",
            };
        default:
            return {
                bg: "from-gray-500 to-gray-600",
                text: "text-gray-600 dark:text-gray-400",
                border: "border-gray-200 dark:border-gray-700",
                light: "bg-gray-50 dark:bg-gray-900/30",
            };
    }
};

/** 시간 포맷 */
export function formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "방금 전";
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString("ko-KR");
}
