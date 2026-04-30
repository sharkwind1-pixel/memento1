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
    BASIC_MONTHLY: 9900,
    PREMIUM_MONTHLY: 18900,
} as const;

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

// 영상 생성 폴링 (웹 src/config/constants.ts VIDEO와 동일)
export const VIDEO = {
    POLL_INTERVAL_MS: 15000, // 15초
    MAX_POLL_COUNT: 60,      // 15분 (60 × 15초)
} as const;
