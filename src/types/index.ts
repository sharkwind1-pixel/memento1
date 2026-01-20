/**
 * 메멘토애니 프로젝트 타입 정의
 */

// 탭 타입 - 메인 네비게이션
export type TabType =
    | "home"
    | "community"
    | "ai-chat"
    | "adoption"
    | "local"
    | "lost" // 분실동물
    | "magazine" // 펫매거진 (구 petcare)
    | "record"; // 우리의 기록 (구 memorial)

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

// 입양 동물 타입
export interface AdoptionPost {
    title: string;
    location: string;
    age: string;
    badge: string;
}

// 펫매거진 가이드 타입 (구 PetcareGuide)
export interface MagazinePost {
    title: string;
    category: string;
    difficulty: string;
    badge: string;
}

// 기록 카드 타입 (구 MemorialCard)
export interface RecordCard {
    name: string;
    pet: string;
    years: string;
    message: string;
    emoji?: string;
}

// 분실동물 타입
export interface LostPet {
    id: number;
    type: "lost" | "found"; // 실종 / 발견
    title: string;
    petType: string; // 강아지, 고양이 등
    breed: string; // 품종
    color: string; // 색상
    gender: string; // 성별
    age: string; // 나이
    location: string; // 실종/발견 장소
    date: string; // 실종/발견 날짜
    description: string; // 상세 설명
    contact: string; // 연락처
    author: string;
    time: string;
    image?: string;
    reward?: string; // 사례금
}

// 이미지 상태 타입
export interface ImageState {
    [key: string]: string | null;
}

// 게시글 컬렉션 타입
export interface PostCollections {
    community: CommunityPost[];
    adoption: AdoptionPost[];
    magazine: MagazinePost[];
}
