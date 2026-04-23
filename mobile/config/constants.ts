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
export const API_BASE_URL =
    process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://mementoani.com";
