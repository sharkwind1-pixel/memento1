/**
 * 앱 전역 상수
 * 하드코딩 값들을 한 곳에서 관리
 */

// ===== 관리자 설정 =====
export const ADMIN_EMAILS = ["sharkwind1@gmail.com"];

// ===== 무료/프리미엄 제한 =====
export const FREE_LIMITS = {
    PETS: 1,                    // 무료 회원 반려동물 등록 수
    PHOTOS_PER_PET: 100,        // 무료 회원 펫당 사진 수
    DAILY_CHATS: 10,            // 무료 회원 일일 AI 펫톡 횟수
    MESSAGE_LENGTH: 200,        // 무료 회원 메시지 글자 수
} as const;

export const PREMIUM_LIMITS = {
    PETS: 10,                   // 프리미엄 회원 반려동물 등록 수
    PHOTOS_PER_PET: 1000,       // 프리미엄 회원 펫당 사진 수
    DAILY_CHATS: Infinity,      // 프리미엄 회원 무제한
    MESSAGE_LENGTH: 1000,       // 프리미엄 회원 메시지 글자 수
} as const;

// ===== 가격 (원) =====
export const PRICING = {
    PREMIUM_MONTHLY: 7900,      // 프리미엄 월 구독
    PREMIUM_YEARLY: 79000,      // 프리미엄 연 구독 (2개월 무료)
} as const;

// ===== UI 설정 =====
export const UI = {
    DEBOUNCE_MS: 300,           // 검색 디바운스 시간
    TOAST_DURATION: 3000,       // 토스트 표시 시간
    MAX_SEARCH_RESULTS: 5,      // 검색 결과 최대 표시 수
    MAX_NICKNAME_LENGTH: 20,    // 닉네임 최대 길이
    MIN_NICKNAME_LENGTH: 2,     // 닉네임 최소 길이
} as const;

// ===== 파일 업로드 =====
export const UPLOAD = {
    MAX_IMAGE_SIZE: 10 * 1024 * 1024,  // 10MB
    MAX_VIDEO_SIZE: 50 * 1024 * 1024,  // 50MB
    ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    ALLOWED_VIDEO_TYPES: ["video/mp4", "video/webm", "video/quicktime"],
} as const;

// ===== API 설정 =====
export const API = {
    AI_MODEL: "gpt-4o-mini",    // AI 펫톡 모델
    AI_MAX_TOKENS: 500,         // AI 응답 최대 토큰
    AI_TEMPERATURE: 0.8,        // AI 창의성 (0-1)
} as const;

// ===== 포인트 시스템 =====
export const POINTS = {
    /** 활동별 적립 포인트 */
    ACTIONS: {
        daily_login: 10,
        write_post: 10,
        write_comment: 3,
        receive_like: 2,
        ai_chat: 1,
        pet_registration: 50,
        timeline_entry: 5,
        photo_upload: 3,
    } as const,

    /** 일일 상한선 (null = 무제한) */
    DAILY_CAPS: {
        daily_login: 1,
        write_post: 5,
        write_comment: 50,
        receive_like: null,
        ai_chat: 10,
        pet_registration: null,
        timeline_entry: 10,
        photo_upload: 10,
    } as const,

    /** 일회성 활동 (평생 1회만) */
    ONE_TIME: ["pet_registration"] as const,

    /** 활동별 한글 라벨 */
    LABELS: {
        daily_login: "출석 체크",
        write_post: "게시글 작성",
        write_comment: "댓글 작성",
        receive_like: "좋아요 받기",
        ai_chat: "AI 펫톡",
        pet_registration: "반려동물 등록",
        timeline_entry: "타임라인 기록",
        photo_upload: "사진 업로드",
    } as const,

    /** 페이지네이션 */
    HISTORY_PAGE_SIZE: 20,
    LEADERBOARD_SIZE: 100,
} as const;

// Helper: 관리자 여부 확인
export const isAdmin = (email: string | undefined): boolean => {
    if (!email) return false;
    return ADMIN_EMAILS.includes(email);
};
