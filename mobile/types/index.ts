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
// 9. 지역정보
// ============================================

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
