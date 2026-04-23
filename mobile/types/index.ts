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
    type: TimelineEntryType;
    title: string;
    content?: string;
    date: string;
    photos?: PetPhoto[];
    createdAt?: string;
    isAiGenerated?: boolean;
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
    isError?: boolean;
    isStreaming?: boolean;
    matchedPhoto?: { url: string; caption: string };
    matchedTimeline?: { date: string; title: string; content: string };
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
    id?: number;
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
