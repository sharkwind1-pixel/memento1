/**
 * apiEndpoints.ts
 * API 엔드포인트 중앙 관리
 * 모든 fetch URL을 여기에서 관리하여 오타/변경 시 일괄 수정 가능
 */

export const API = {
    // AI 채팅
    CHAT: "/api/chat",
    CHAT_SUMMARY: "/api/chat/summary",
    CHAT_USAGE: "/api/chat/usage",

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

    // 미니미
    MINIMI_CATALOG: "/api/minimi/catalog",
    MINIMI_INVENTORY: "/api/minimi/inventory",
    MINIMI_PURCHASE: "/api/minimi/purchase",
    MINIMI_EQUIP: "/api/minimi/equip",
    MINIMI_SELL: "/api/minimi/sell",

    // 미니홈피
    MINIHOMPY_SETTINGS: "/api/minihompy/settings",
    MINIHOMPY_VIEW: (userId: string) => `/api/minihompy/${userId}`,
    MINIHOMPY_GUESTBOOK: (userId: string) => `/api/minihompy/${userId}/guestbook`,
    MINIHOMPY_LIKE: (userId: string) => `/api/minihompy/${userId}/like`,
    MINIHOMPY_VISIT: (userId: string) => `/api/minihompy/${userId}/visit`,
    MINIHOMPY_PLACED_MINIMI: "/api/minihompy/settings/placed-minimi",
    MINIHOMPY_BG_CATALOG: "/api/minihompy/backgrounds",
    MINIHOMPY_BG_PURCHASE: "/api/minihompy/backgrounds/purchase",

    // 푸시 알림
    NOTIFICATIONS_SUBSCRIBE: "/api/notifications/subscribe",

    // 추억 앨범
    MEMORY_ALBUMS: "/api/memory-albums",
    MEMORY_ALBUM_READ: (id: string) => `/api/memory-albums/${id}/read`,

    // AI 영상 생성
    VIDEO_GENERATE: "/api/video/generate",
    VIDEO_WEBHOOK: "/api/video/webhook",
    VIDEO_STATUS: (id: string) => `/api/video/status/${id}`,
    VIDEO_LIST: "/api/video/list",
    VIDEO_QUOTA: "/api/video/quota",

    // 크론
    CRON_MAGAZINE_GENERATE: "/api/cron/magazine-generate",

    // 인증/보안
    AUTH_RECORD_IP: "/api/auth/record-ip",
    AUTH_DELETE_ACCOUNT: "/api/auth/delete-account",
    AUTH_CLEANUP_BLOCKED: "/api/auth/cleanup-blocked",

    // 유저 차단
    BLOCKS: "/api/blocks",

    // 결제
    PAYMENT_PREPARE: "/api/payments/prepare",
    PAYMENT_COMPLETE: "/api/payments/complete",

    // 관리자
    ADMIN_POINTS: "/api/admin/points",
    ADMIN_DELETE_USER: "/api/admin/delete-user",
    ADMIN_BLOCK_EMAIL: "/api/admin/block-email",
    ADMIN_ALLOW_REJOIN: "/api/admin/allow-rejoin",
    ADMIN_UPDATE_PROFILE: "/api/admin/update-profile",

    // 추모 펫 위로 리액션
    PET_CONDOLENCE: (petId: string) => `/api/pets/${petId}/condolence`,

    // 치유의 여정 (추모 모드 감정 추이)
    HEALING_JOURNEY: (petId: string) => `/api/healing-journey?petId=${petId}`,
} as const;
