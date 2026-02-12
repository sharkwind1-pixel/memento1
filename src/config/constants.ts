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
        admin_award: 0,     // 관리자 지급 (금액은 API에서 동적 지정)
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
        admin_award: null,  // 관리자 지급은 제한 없음
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
        admin_award: "관리자 지급",
    } as const,

    /** 페이지네이션 */
    HISTORY_PAGE_SIZE: 20,
} as const;

// ===== 포인트 등급 시스템 =====
export interface PointLevel {
    level: number;
    name: string;
    minPoints: number;
    icon: string;          // 아이콘 이미지 경로 (/icons/levels/...)
    color: string;         // Tailwind gradient from
    bgColor: string;       // Tailwind gradient to
    textColor: string;     // 텍스트 색상
    hasSparkle?: boolean;  // 상위 등급 반짝이 뱃지
    hasGlow?: boolean;     // 최상위 등급 글로우 효과
}

export const POINT_LEVELS: PointLevel[] = [
    { level: 1, name: "새싹 발바닥",   minPoints: 0,       icon: "/icons/levels/level1_maltese.png",     color: "from-gray-300",    bgColor: "to-gray-400",    textColor: "text-gray-500" },
    { level: 2, name: "반짝 발바닥",   minPoints: 100,     icon: "/icons/levels/level2_pomeranian.png",  color: "from-emerald-300", bgColor: "to-emerald-500",  textColor: "text-emerald-600" },
    { level: 3, name: "든든한 발바닥", minPoints: 500,     icon: "/icons/levels/level3_corgi.png",       color: "from-pink-300",    bgColor: "to-pink-500",    textColor: "text-pink-600" },
    { level: 4, name: "다정한 친구",   minPoints: 3000,    icon: "/icons/levels/level4_shiba.png",       color: "from-sky-300",     bgColor: "to-sky-500",     textColor: "text-sky-600" },
    { level: 5, name: "따뜻한 동반자", minPoints: 10000,   icon: "/icons/levels/level5_golden.png",      color: "from-violet-400",  bgColor: "to-purple-500",  textColor: "text-violet-600", hasSparkle: true },
    { level: 6, name: "빛나는 가족",   minPoints: 30000,   icon: "/icons/levels/level6_samoyed.png",     color: "from-amber-300",   bgColor: "to-yellow-500",  textColor: "text-amber-600",  hasSparkle: true },
    { level: 7, name: "전설의 집사",   minPoints: 100000,  icon: "/icons/levels/level7_legend.png",      color: "from-rose-400",    bgColor: "to-amber-300",   textColor: "text-rose-600",   hasSparkle: true, hasGlow: true },
];

/** 포인트로 현재 등급 계산 */
export function getPointLevel(points: number): PointLevel {
    // 역순으로 탐색해서 가장 높은 등급 찾기
    for (let i = POINT_LEVELS.length - 1; i >= 0; i--) {
        if (points >= POINT_LEVELS[i].minPoints) {
            return POINT_LEVELS[i];
        }
    }
    return POINT_LEVELS[0];
}

/** 다음 등급까지 남은 포인트 */
export function getNextLevelInfo(points: number): { nextLevel: PointLevel | null; remaining: number; progress: number } {
    const currentLevel = getPointLevel(points);
    const nextIdx = POINT_LEVELS.findIndex(l => l.level === currentLevel.level) + 1;

    if (nextIdx >= POINT_LEVELS.length) {
        return { nextLevel: null, remaining: 0, progress: 100 };
    }

    const nextLevel = POINT_LEVELS[nextIdx];
    const remaining = nextLevel.minPoints - points;
    const range = nextLevel.minPoints - currentLevel.minPoints;
    const progress = Math.min(100, Math.round(((points - currentLevel.minPoints) / range) * 100));

    return { nextLevel, remaining, progress };
}

// Helper: 관리자 여부 확인
export const isAdmin = (email: string | undefined): boolean => {
    if (!email) return false;
    return ADMIN_EMAILS.includes(email);
};
