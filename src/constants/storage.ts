/**
 * 스토리지 관련 상수
 * ==================
 * localStorage, sessionStorage 키 정의
 */

/** localStorage 키 */
export const STORAGE_KEYS = {
    /** AI 펫톡 대화 기록 */
    CHAT_HISTORY: "memento-ani-chat-history",

    /** 사용자 설정 */
    USER_SETTINGS: "memento-ani-user-settings",

    /** 최근 본 게시글 */
    RECENT_POSTS: "memento-ani-recent-posts",

    /** 테마 설정 */
    THEME: "memento-ani-theme",

    /** 선택된 펫 ID */
    SELECTED_PET_ID: "memento-ani-selected-pet",

    /** 온보딩 완료 여부 */
    ONBOARDING_COMPLETED: "memento-ani-onboarding",
} as const;

/** 스토리지 키 타입 */
export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
