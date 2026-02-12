/**
 * 메멘토애니 프로젝트 타입 정의
 * ================================
 * 모든 타입 정의를 한 곳에서 관리합니다.
 *
 * @description
 * - 컴포넌트에서 interface/type 정의 금지
 * - 새 타입 추가 시 적절한 섹션에 추가
 * - 관련 타입끼리 그룹화하여 관리
 */

// ============================================
// 1. 네비게이션 & 라우팅 타입
// ============================================

/** 메인 카테고리 (5개) - 새 네비게이션 구조 */
export type MainCategory = "home" | "record" | "community" | "ai-chat" | "magazine";

/** 커뮤니티 서브카테고리 (5개) */
export type CommunitySubcategory = "free" | "memorial" | "adoption" | "local" | "lost";

/** 자유게시판 말머리(태그) */
export type PostTag = "정보" | "강아지" | "고양이" | "일상" | "질문" | "새" | "물고기" | "토끼" | "파충류";

/** 메인 네비게이션 탭 타입 (레거시 호환 포함) */
export type TabType =
    | "home"
    | "community"
    | "ai-chat"
    | "adoption"  // 레거시: community/adoption으로 리다이렉트
    | "local"     // 레거시: community/local으로 리다이렉트
    | "lost"      // 레거시: community/lost으로 리다이렉트
    | "magazine"
    | "record"
    | "admin";

/** 레거시 탭을 서브카테고리로 변환 */
export function getLegacyTabRedirect(tab: TabType): { main: MainCategory; sub?: CommunitySubcategory } | null {
    switch (tab) {
        case "adoption":
            return { main: "community", sub: "adoption" };
        case "local":
            return { main: "community", sub: "local" };
        case "lost":
            return { main: "community", sub: "lost" };
        default:
            return null;
    }
}

/** 관리자 관련 - config에서 re-export */
export { ADMIN_EMAILS, isAdmin } from "@/config/constants";

// ============================================
// 2. 반려동물 관련 타입
// ============================================

/** 반려동물 상태 */
export type PetStatus = "active" | "memorial";

/** 반려동물 종류 */
export type PetType = "강아지" | "고양이" | "기타";

/** 반려동물 성별 */
export type PetGender = "남아" | "여아";

/** 미디어 타입 */
export type MediaType = "image" | "video";

/** 어떻게 만났는지 */
export type HowWeMet = "펫샵" | "분양" | "보호소" | "지인" | "길에서" | "기타";

/** 이미지 크롭 위치 (scale 포함) */
export interface CropPosition {
    x: number;
    y: number;
    scale: number;
}

/** 반려동물 사진/영상 */
export interface PetPhoto {
    id: string;
    url: string;
    storagePath?: string;
    type: MediaType;
    caption: string;
    date: string;
    cropPosition?: CropPosition;
    thumbnailUrl?: string;
    uploadedAt?: string;
}

/** 반려동물 정보 (전체) - Single Source of Truth */
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
    profileCropPosition?: CropPosition;
    photos: PetPhoto[];
    status: PetStatus;
    memorialDate?: string;
    isPrimary?: boolean;
    createdAt?: string;
    updatedAt?: string;

    // AI 펫톡 개인화를 위한 추가 정보
    adoptedDate?: string;
    howWeMet?: HowWeMet;
    nicknames?: string;
    specialHabits?: string;
    favoriteFood?: string;
    favoriteActivity?: string;
    favoritePlace?: string;

    // 추모 관련 추가 정보
    togetherPeriod?: string;
    memorableMemory?: string;
}

/** 반려동물 등록/수정용 데이터 */
export interface PetFormData {
    name: string;
    type: PetType;
    breed: string;
    gender: PetGender;
    birthday?: string;
    weight?: string;
    personality?: string;
    status?: PetStatus;
    memorialDate?: string;

    // AI 펫톡 개인화 필드
    adoptedDate?: string;
    howWeMet?: HowWeMet;
    nicknames?: string;
    specialHabits?: string;
    favoriteFood?: string;
    favoriteActivity?: string;
    favoritePlace?: string;

    // 추모 필드
    togetherPeriod?: string;
    memorableMemory?: string;
}

// ============================================
// 3. AI 펫톡 관련 타입
// ============================================

/** AI 채팅 메시지 */
export interface ChatMessage {
    id: string;
    role: "user" | "pet";
    content: string;
    timestamp: Date;
    emotion?: EmotionType;
    emotionScore?: number;
}

/** 감정 타입 */
export type EmotionType =
    | "happy"
    | "sad"
    | "anxious"
    | "angry"
    | "grateful"
    | "lonely"
    | "peaceful"
    | "excited"
    | "neutral";

/** AI API 요청용 펫 정보 (Pet에서 필요한 필드만 추출) */
export interface PetInfoForAPI {
    id?: string;
    name: string;
    type: PetType;
    breed: string;
    gender: PetGender;
    personality?: string;
    birthday?: string;
    status: PetStatus;
    memorialDate?: string;

    // AI 펫톡 개인화
    nicknames?: string;
    specialHabits?: string;
    favoriteFood?: string;
    favoriteActivity?: string;
    favoritePlace?: string;

    // 추모 정보
    togetherPeriod?: string;
    memorableMemory?: string;
}

// ============================================
// 4. 커뮤니티 관련 타입
// ============================================

/** 커뮤니티 게시글 */
export interface CommunityPost {
    id?: number;
    title: string;
    content?: string;
    author: string;
    likes: number;
    comments: number;
    badge: string;
    views?: number;
    category?: string;
    subcategory?: CommunitySubcategory;  // 서브카테고리 (free, memorial, adoption, local, lost)
    tag?: PostTag;                        // 말머리 (자유게시판용)
    isPublic?: boolean;                   // 공개 여부 (추모 게시판용)
    preview?: string;
    time?: string;
    avatar?: string;
}

/** 댓글 */
export interface Comment {
    id: number;
    author: string;
    content: string;
    time: string;
    likes: number;
}

/** 게시판 카테고리 */
export interface BoardCategory {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    description: string;
    memorialOnly?: boolean;
}

// ============================================
// 5. 입양/분실동물 관련 타입
// ============================================

/** 입양 게시글 */
export interface AdoptionPost {
    id?: number;
    title: string;
    location: string;
    age: string;
    badge: string;
    image?: string;
    petType?: string;
    breed?: string;
    gender?: string;
    description?: string;
}

/** 분실동물 게시글 */
export interface LostPet {
    id: number;
    type: "lost" | "found";
    title: string;
    petType: string;
    breed: string;
    color: string;
    gender: string;
    age: string;
    location: string;
    date: string;
    description: string;
    contact: string;
    author: string;
    time: string;
    image?: string;
    reward?: string;
}

// ============================================
// 6. 매거진/정보 관련 타입
// ============================================

/** 펫매거진 게시글 */
export interface MagazinePost {
    id?: number;
    title: string;
    category: string;
    difficulty: string;
    badge: string;
    content?: string;
    image?: string;
}

/** 펫케어 가이드 (레거시 호환) */
export type PetcareGuide = MagazinePost;

// ============================================
// 7. 추모/기록 관련 타입
// ============================================

/** 추모 카드 */
export interface MemorialCard {
    name: string;
    pet: string;
    years: string;
    message: string;
    emoji?: string;
    image?: string;
}

/** 기록 카드 (레거시 호환) */
export type RecordCard = MemorialCard;

/** 추모 게시글 */
export interface MemorialPost {
    id: string;
    userId: string;
    petId: string;
    title: string;
    content: string;
    imageUrl?: string;
    isPublic: boolean;
    likesCount: number;
    commentsCount: number;
    createdAt: string;
    updatedAt: string;
    pet?: Pet;
    user?: {
        nickname?: string;
    };
}

/** 타임라인 엔트리 */
export interface TimelineEntry {
    id: string;
    petId: string;
    date: string;
    title: string;
    content?: string;
    photos?: string[];
    category: TimelineCategory;
    createdAt?: string;
}

/** 타임라인 카테고리 */
export type TimelineCategory =
    | "일상"
    | "건강"
    | "여행"
    | "기념일"
    | "특별한날"
    | "기타";

// ============================================
// 8. UI 공통 타입
// ============================================

/** 라이트박스 아이템 */
export interface LightboxItem {
    title: string;
    subtitle?: string;
    meta?: string;
    src: string;
}

/** 자동 스크롤 훅 반환 타입 */
export interface SmoothAutoScrollReturn {
    communityScrollRef: React.RefObject<HTMLDivElement>;
    adoptionScrollRef: React.RefObject<HTMLDivElement>;
    petcareScrollRef: React.RefObject<HTMLDivElement>;
    memorialScrollRef: React.RefObject<HTMLDivElement>;
    startAutoScroll?: (start?: boolean) => void | (() => void);
}

/** 이미지 상태 맵 */
export interface ImageState {
    [key: string]: string | null;
}

// ============================================
// 9. 페이지 Props 타입
// ============================================

/** 공통 페이지 Props (탭 네비게이션) */
export interface PageProps {
    setSelectedTab?: (tab: TabType) => void;
}

/** HomePage Props */
export interface HomePageProps extends PageProps {}

/** AIChatPage Props */
export interface AIChatPageProps extends PageProps {}

/** CommunityPage Props */
export interface CommunityPageProps extends PageProps {
    subcategory?: CommunitySubcategory;
    onSubcategoryChange?: (sub: CommunitySubcategory) => void;
}

/** AdoptionPage Props */
export interface AdoptionPageProps extends PageProps {}

/** LocalPage Props */
export interface LocalPageProps extends PageProps {}

/** LostPage Props */
export interface LostPageProps extends PageProps {}

/** MagazinePage Props */
export interface MagazinePageProps extends PageProps {}

/** RecordPage Props */
export interface RecordPageProps extends PageProps {}

// ============================================
// 10. API 응답 타입
// ============================================

/** API 에러 응답 */
export interface APIError {
    code: number;
    error_code: string;
    msg: string;
}

/** AI 채팅 API 응답 */
export interface AIChatResponse {
    reply: string;
    emotion?: EmotionType;
    emotionScore?: number;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

// ============================================
// 11. 컬렉션/유틸 타입
// ============================================

/** 게시글 컬렉션 */
export interface PostCollections {
    community: CommunityPost[];
    adoption: AdoptionPost[];
    petcare: MagazinePost[];
}

/** 정렬 옵션 */
export type SortOption = "latest" | "popular" | "comments";

/** 필터 옵션 */
export interface FilterOption {
    id: string;
    label: string;
    value: string;
}

// ============================================
// 12. 포인트 시스템 타입
// ============================================

/** 포인트 활동 타입 */
export type PointAction =
    | "daily_login"
    | "write_post"
    | "write_comment"
    | "receive_like"
    | "ai_chat"
    | "pet_registration"
    | "timeline_entry"
    | "photo_upload"
    | "admin_award";

/** 포인트 거래 기록 */
export interface PointTransaction {
    id: string;
    userId: string;
    actionType: PointAction;
    pointsEarned: number;
    metadata?: Record<string, string>;
    createdAt: string;
}

/** 사용자 포인트 정보 */
export interface UserPoints {
    userId: string;
    points: number;
    totalEarned: number;
    rank: number;
}

/** 랭킹 항목 */
export interface LeaderboardEntry {
    rank: number;
    userId: string;
    nickname: string;
    points: number;
    avatarUrl?: string;
}

/** 포인트 적립 결과 (RPC 응답) */
export interface PointAwardResult {
    success: boolean;
    reason?: "daily_cap_reached" | "already_earned";
    points: number;
    totalEarned?: number;
    earned?: number;
}
