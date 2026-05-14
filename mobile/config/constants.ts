/**
 * 앱 전역 상수 — 웹과 동일한 제한/가격 정책
 */

export const FREE_LIMITS = {
    PETS: 1,
    PHOTOS_PER_PET: 50,
    DAILY_CHATS: 10,
} as const;

export const BASIC_LIMITS = {
    PETS: 3,
    PHOTOS_PER_PET: 200,
    DAILY_CHATS: 50,
} as const;

export const PREMIUM_LIMITS = {
    PETS: 10,
    PHOTOS_PER_PET: 1000,
    DAILY_CHATS: Infinity,
} as const;

export const PRICING = {
    BASIC_MONTHLY: 9900,         // deprecated, 단일 프리미엄 통합 (2026-05-15) — 잔존 가입자 자연 만료
    PREMIUM_MONTHLY: 9900,       // 프리미엄 월 구독
    PREMIUM_ANNUAL: 88800,       // 프리미엄 연 구독 (월 환산 7,400원, 정확히 25% 할인 + 30,000원 절약)
} as const;

export type BillingCycle = "monthly" | "annual";

/** 연 결제 할인율 계산 (월 결제 12회 vs 연 결제) */
export function calculateAnnualSavings(): { saved: number; percent: number } {
    const monthlyTotal = PRICING.PREMIUM_MONTHLY * 12;
    const saved = monthlyTotal - PRICING.PREMIUM_ANNUAL;
    const percent = Math.round((saved / monthlyTotal) * 100);
    return { saved, percent };
}

export const ADMIN_EMAILS = ["sharkwind1@gmail.com"] as const;

export const APP_NAME = "메멘토애니";
export const APP_TAGLINE = "특별한 매일을 함께";

// API base — 웹 백엔드 재사용
//
// **중요**: Vercel이 mementoani.com → www.mementoani.com 으로 307 redirect.
// RN fetch는 POST + Authorization 헤더 redirect 시 헤더 drop → 401.
// RN Image는 redirect를 일부 환경에서 못 따라감.
// 그래서 raw 도메인을 www로 자동 normalize.
const _rawBase = process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://www.mementoani.com";
export const API_BASE_URL = _rawBase.replace(
    /^https?:\/\/mementoani\.com/i,
    "https://www.mementoani.com",
);

// 영상 생성 폴링 + 가격 (웹 src/config/constants.ts VIDEO와 동일)
export const VIDEO = {
    POLL_INTERVAL_MS: 15000,    // 15초
    MAX_POLL_COUNT: 60,         // 15분 (60 × 15초)
    FREE_LIFETIME: 1,           // 무료 평생 1회
    PREMIUM_MONTHLY: 3,         // 프리미엄 월 3회
    SINGLE_PRICE: 4900,         // 단품 1회
    BUNDLE_5_PRICE: 19900,      // 5회 묶음 (영상당 3,980원)
    BUNDLE_10_PRICE: 34900,     // 10회 묶음 (영상당 3,490원)
} as const;

// ===== 포인트 시스템 (웹 src/config/constants.ts POINTS와 동일) =====
// 활동 라벨 + 페이지 사이즈만 모바일에서 직접 참조. 적립 로직은 백엔드.
export const POINTS = {
    LABELS: {
        daily_login: "출석 체크",
        write_post: "게시글 작성",
        write_comment: "댓글 작성",
        receive_like: "좋아요 받기",
        receive_dislike: "비추천 받기",
        ai_chat: "AI 펫톡",
        pet_registration: "반려동물 등록",
        timeline_entry: "타임라인 기록",
        photo_upload: "사진 업로드",
        admin_award: "관리자 지급",
        write_guestbook: "방명록 작성",
        receive_guestbook: "방명록 수신",
    } as const,
    HISTORY_PAGE_SIZE: 20,
} as const;

export type PointActionType =
    | "daily_login" | "write_post" | "write_comment" | "receive_like" | "receive_dislike"
    | "ai_chat" | "pet_registration" | "timeline_entry" | "photo_upload"
    | "admin_award" | "write_guestbook" | "receive_guestbook";

// ===== 포인트 등급 (웹 POINT_LEVELS과 동일) =====
export interface PointLevel {
    level: number;
    minPoints: number;
    label: string;        // 모바일은 아이콘 없이 라벨로 표현
    color: string;        // accentBg
}

export const POINT_LEVELS: PointLevel[] = [
    { level: 1, minPoints: 0,      label: "새싹",   color: "#9CA3AF" },
    { level: 2, minPoints: 100,    label: "친구",   color: "#10B981" },
    { level: 3, minPoints: 500,    label: "단골",   color: "#EC4899" },
    { level: 4, minPoints: 3000,   label: "이웃",   color: "#0EA5E9" },
    { level: 5, minPoints: 10000,  label: "후원자", color: "#8B5CF6" },
    { level: 6, minPoints: 30000,  label: "수호자", color: "#F59E0B" },
    { level: 7, minPoints: 100000, label: "전설",   color: "#F43F5E" },
];

export function getPointLevel(points: number): PointLevel {
    for (let i = POINT_LEVELS.length - 1; i >= 0; i--) {
        if (points >= POINT_LEVELS[i].minPoints) return POINT_LEVELS[i];
    }
    return POINT_LEVELS[0];
}

export function getNextPointLevel(points: number): PointLevel | null {
    for (const lvl of POINT_LEVELS) {
        if (points < lvl.minPoints) return lvl;
    }
    return null;
}
