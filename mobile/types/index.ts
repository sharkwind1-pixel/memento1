/**
 * 메멘토애니 모바일 타입 정의
 * 웹(src/types/index.ts)과 공유되는 핵심 타입들
 */

// ============================================
// 1. 반려동물 관련
// ============================================

export type PetStatus = "active" | "memorial";
export type PetType = "강아지" | "고양이" | "기타";
export type PetGender = "남아" | "여아";
export type MediaType = "image" | "video";
export type HowWeMet = "펫샵" | "분양" | "보호소" | "지인" | "길에서" | "기타";

export interface PetPhoto {
    id: string;
    url: string;
    storagePath?: string;
    type: MediaType;
    caption: string;
    date: string;
    thumbnailUrl?: string;
    uploadedAt?: string;
}

export interface Pet {
    id: string;
    userId?: string;
    name: string;
    type: PetType;
    breed: string;
    gender: PetGender;
    birthday?: string;
    weight?: string;
    personality?: string;
    profileImage?: string;
    photos: PetPhoto[];
    status: PetStatus;
    memorialDate?: string;
    isPrimary?: boolean;
    createdAt?: string;
    updatedAt?: string;
    adoptedDate?: string;
    howWeMet?: HowWeMet;
    nicknames?: string;
    specialHabits?: string;
    favoriteFood?: string;
    favoriteActivity?: string;
    favoritePlace?: string;
    togetherPeriod?: string;
    memorableMemory?: string;
}

// ============================================
// 2. 타임라인
// ============================================

export type TimelineEntryType =
    | "diary"
    | "photo"
    | "health"
    | "milestone"
    | "memory";

export interface TimelineEntry {
    id: string;
    petId: string;
    type?: TimelineEntryType;
    title: string;
    content?: string;
    date: string;
    photos?: PetPhoto[];
    createdAt?: string;
    isAiGenerated?: boolean;
    mood?: "happy" | "normal" | "sad" | "sick";
    category?: string;
    mediaIds?: string[];
}

// ============================================
// 3. AI 펫톡
// ============================================

export interface ChatMessage {
    id: string;
    role: "user" | "pet" | "system";
    content: string;
    timestamp: Date;
    emotion?: string;
    emotionScore?: number;
    isError?: boolean;
    isStreaming?: boolean;
    type?: "reminder-suggestion" | "crisis-alert";
    matchedPhoto?: { url: string; caption?: string };
    matchedTimeline?: { date: string; title: string; content: string };
    nearbyPlaces?: Array<{ name: string; address?: string; distance?: number | string; phone?: string; mapUrl?: string; category?: string }>;
    crisisAlert?: {
        message: string;
        resources?: Array<{ name: string; phone: string; description?: string }>;
    };
    suggestedReminder?: {
        title: string;
        type: string;
        schedule: { type: string; time: string; dayOfWeek?: number; dayOfMonth?: number };
    };
    retryMessage?: string;
}

export type EmotionType =
    | "happy" | "sad" | "anxious" | "angry"
    | "grateful" | "lonely" | "peaceful" | "excited" | "neutral";

// ============================================
// 4. 커뮤니티
// ============================================

export type CommunitySubcategory = "free" | "memorial" | "adoption" | "local" | "lost";

export type PostTag =
    | "정보" | "일상" | "질문"
    | "강아지" | "고양이"
    | "햄스터" | "토끼" | "작은포유류"
    | "새" | "파충류" | "물고기";

export interface CommunityPost {
    id?: string | number;
    title: string;
    content?: string;
    author: string;
    authorId?: string;
    authorAvatar?: string;
    likes: number;
    comments: number;
    views?: number;
    category?: string;
    subcategory?: CommunitySubcategory;
    tag?: PostTag;
    isLiked?: boolean;
    isPinned?: boolean;
    preview?: string;
    time?: string;
    createdAt?: string;
    images?: string[];
}

// ============================================
// 5. 유저 프로필
// ============================================

export interface UserProfile {
    id: string;
    nickname?: string;
    avatar?: string;
    bio?: string;
    isPremium?: boolean;
    isAdmin?: boolean;
    points?: number;
    createdAt?: string;
}

// ============================================
// 6. 구독
// ============================================

export type SubscriptionPhase = "active" | "cancelled" | "archived";

// ============================================
// 7. 입양정보 (공공데이터 동물보호관리시스템)
// ============================================

export interface AdoptionAnimal {
    id: string;             // desertionNo
    kind: string;           // 강아지 / 고양이 / 기타
    breed?: string;
    color?: string;
    age?: string;
    weight?: string;
    gender?: string;
    neutered?: string;
    specialMark?: string;
    noticeNo?: string;
    noticeStart?: string;
    noticeEnd?: string;
    status?: string;        // 공고중 / 보호중 / 종료
    shelterName?: string;
    shelterTel?: string;
    shelterAddr?: string;
    foundPlace?: string;
    foundDate?: string;
    imageUrl?: string;
    thumbnailUrl?: string;
}

// ============================================
// 8. 분실/발견 동물
// ============================================

export type LostPetType = "lost" | "found";

export interface LostPet {
    id: string;
    userId?: string;
    type: LostPetType;
    title: string;
    petType?: string;
    breed?: string;
    color?: string;
    gender?: string;
    age?: string;
    region?: string;
    district?: string;
    locationDetail?: string;
    date?: string;
    description?: string;
    contact?: string;
    reward?: string;
    imageUrl?: string;
    views?: number;
    status?: "active" | "resolved";
    createdAt?: string;
    updatedAt?: string;
}

// ============================================
// 9.7 관리자 — 신고 (웹 admin/types.ts 매칭)
// ============================================

export type ReportStatus = "pending" | "reviewing" | "resolved" | "rejected";
export type ReportTargetType = "post" | "comment" | "user" | "pet_memorial";

export interface ReportRow {
    id: string;
    reporter_id: string;
    reporter_email?: string;
    target_type: ReportTargetType;
    target_id: string;
    reason: string;
    description: string | null;
    status: ReportStatus;
    resolution_note: string | null;
    resolved_at: string | null;
    resolved_by: string | null;
    created_at: string;
}

export const REPORT_REASON_LABELS: Record<string, string> = {
    spam: "스팸/광고",
    abuse: "욕설/비방",
    inappropriate: "부적절한 콘텐츠",
    harassment: "괴롭힘",
    misinformation: "허위정보",
    copyright: "저작권 침해",
    other: "기타",
};

export const REPORT_TARGET_LABELS: Record<ReportTargetType, string> = {
    post: "게시물",
    comment: "댓글",
    user: "회원",
    pet_memorial: "기억공간",
};

export type AdminTab =
    | "dashboard" | "reports" | "users" | "posts"
    | "messages" | "inquiries" | "withdrawals" | "magazine";

// ============================================
// 9. 지역정보
// ============================================

// ============================================
// 9.5 미니홈피 / 미니미
// ============================================

export type MinimiCategory = "dog" | "cat";

export interface MinimiCharacter {
    slug: string;
    name: string;
    category: MinimiCategory;
    imageUrl: string;
    price: number;
    description?: string;
    imageAspect?: number;
    footPadding?: number;
}

export interface MinimiCatalogItem extends MinimiCharacter {
    id: string;
    resellPrice: number;
    isAvailable: boolean;
    releasedAt?: string;
    sortOrder?: number;
}

export interface UserMinimiRow {
    id: string;            // user_minimi PK (UUID)
    minimi_id: string;     // catalog slug
    purchased_at?: string;
    purchase_price?: number;
}

export type BackgroundCategory = "nature" | "season" | "special";

export interface BackgroundTheme {
    id: string;
    slug: string;
    name: string;
    category: BackgroundCategory;
    price: number;
    description: string;
    cssBackground: string;
    imageUrl?: string;
}

export interface MinihompySettings {
    isPublic: boolean;
    backgroundSlug: string;
    greeting: string;
    todayVisitors?: number;
    totalVisitors?: number;
    totalLikes?: number;
    placedMinimi?: PlacedMinimi[];
}

/** 스테이지에 자유 배치된 미니미 (x/y는 5~95 범위 %) */
export interface PlacedMinimi {
    slug: string;
    x: number;
    y: number;
    zIndex: number;
}

export interface GuestbookEntry {
    id: string;
    writerId: string;
    writerNickname?: string;
    writerAvatar?: string;
    content: string;
    createdAt: string;
}

export type LocalPostCategory = "hospital" | "walk" | "share" | "trade" | "meet" | "place";
export type LocalPostBadge = "질문" | "모집중" | "나눔" | "판매" | "후기" | "정보" | "기타";

export interface LocalPost {
    id: string;
    userId?: string;
    category: LocalPostCategory;
    title: string;
    content?: string;
    region?: string;
    district?: string;
    badge?: LocalPostBadge;
    imageUrl?: string;
    likesCount?: number;
    commentsCount?: number;
    views?: number;
    status?: "active" | "hidden";
    createdAt?: string;
    updatedAt?: string;
}
