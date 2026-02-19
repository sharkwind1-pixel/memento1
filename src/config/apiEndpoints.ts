/**
 * apiEndpoints.ts
 * API 엔드포인트 중앙 관리
 * 모든 fetch URL을 여기에서 관리하여 오타/변경 시 일괄 수정 가능
 */

export const API = {
    // AI 채팅
    CHAT: "/api/chat",

    // 커뮤니티 게시판
    POSTS: "/api/posts",
    POST_DETAIL: (id: string) => `/api/posts/${id}`,
    POST_LIKE: (id: string) => `/api/posts/${id}/like`,
    POST_COMMENTS: (id: string) => `/api/posts/${id}/comments`,

    // 분실동물
    LOST_PETS: "/api/lost-pets",
    LOST_PET_DETAIL: (id: string) => `/api/lost-pets/${id}`,

    // 입양정보
    ADOPTION: "/api/adoption",
    ADOPTION_REGIONS: "/api/adoption/regions",

    // 지역정보
    LOCAL_POSTS: "/api/local-posts",
    LOCAL_POST_DETAIL: (id: string) => `/api/local-posts/${id}`,

    // 매거진
    MAGAZINE: "/api/magazine",
    MAGAZINE_DETAIL: (id: string) => `/api/magazine/${id}`,

    // 포인트
    POINTS: "/api/points",
    POINTS_HISTORY: "/api/points/history",
    POINTS_DAILY_CHECK: "/api/points/daily-check",
    POINTS_AWARD: "/api/points/award",
    POINTS_SHOP: "/api/points/shop",

    // 리마인더
    REMINDERS: "/api/reminders",
    REMINDER_DETAIL: (id: string) => `/api/reminders/${id}`,

    // 관리자
    ADMIN_POINTS: "/api/admin/points",
} as const;
