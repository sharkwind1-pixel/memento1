/**
 * 메멘토애니 프로젝트 타입 정의
 * 모든 컴포넌트에서 사용하는 타입들을 중앙에서 관리
 */

// 탭 타입 - 메인 네비게이션에서 사용
export type TabType =
    | "home"
    | "community"
    | "ai-chat"
    | "adoption"
    | "local"
    | "petcare"
    | "memorial";

// 커뮤니티 게시글 타입
export interface CommunityPost {
    title: string;
    author: string;
    likes: number;
    comments: number;
    badge: string;
    views?: number;
    category?: string;
    preview?: string;
    time?: string;
}

// 입양 정보 타입
export interface AdoptionPost {
    title: string;
    location: string;
    age: string;
    badge: string;
}

// 펫케어 가이드 타입
export interface PetcareGuide {
    title: string;
    category: string;
    difficulty: string;
    badge: string;
}

// 추모 카드 타입
export interface MemorialCard {
    name: string;
    pet: string;
    years: string;
    message: string;
    emoji: string;
}

// 이미지 상태 타입
export interface ImageState {
    [key: string]: string | null;
}

// 게시글 모음 타입
export interface PostCollections {
    community: CommunityPost[];
    adoption: AdoptionPost[];
    petcare: PetcareGuide[];
}
