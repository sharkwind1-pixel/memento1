/**
 * localTypes.ts
 * 지역 게시판 관련 타입, 상수, 유틸리티
 * LocalPage에서 분리 - 공유 타입과 상수 정의
 */

import {
    MapPin,
    Stethoscope,
    Dog,
    Gift,
    ShoppingBag,
    Users,
    Coffee,
} from "lucide-react";

/** API 응답의 지역 게시글 타입 (camelCase) */
export interface LocalPost {
    id: string;
    userId: string;
    category: string;
    title: string;
    content: string;
    region: string;
    district: string;
    badge: string;
    imageUrl: string | null;
    imageStoragePath: string | null;
    likesCount: number;
    commentsCount: number;
    views: number;
    status: string;
    createdAt: string;
    updatedAt: string;
}

/** 게시글 작성 폼 데이터 */
export interface PostFormData {
    category: string;
    title: string;
    content: string;
    region: string;
    district: string;
    badge: string;
}

// 시/도 데이터
export const REGIONS: Record<string, string[]> = {
    서울: [
        "강남구", "강동구", "강북구", "강서구", "관악구", "광진구",
        "구로구", "금천구", "노원구", "도봉구", "동대문구", "동작구",
        "마포구", "서대문구", "서초구", "성동구", "성북구", "송파구",
        "양천구", "영등포구", "용산구", "은평구", "종로구", "중구", "중랑구",
    ],
    경기: [
        "고양시", "과천시", "광명시", "광주시", "구리시", "군포시",
        "김포시", "남양주시", "동두천시", "부천시", "성남시", "수원시",
        "시흥시", "안산시", "안성시", "안양시", "양주시", "오산시",
        "용인시", "의왕시", "의정부시", "이천시", "파주시", "평택시",
        "포천시", "하남시", "화성시",
    ],
    부산: [
        "강서구", "금정구", "남구", "동구", "동래구", "부산진구",
        "북구", "사상구", "사하구", "서구", "수영구", "연제구",
        "영도구", "중구", "해운대구",
    ],
    대구: ["남구", "달서구", "동구", "북구", "서구", "수성구", "중구"],
    인천: ["계양구", "남동구", "동구", "미추홀구", "부평구", "서구", "연수구", "중구"],
    광주: ["광산구", "남구", "동구", "북구", "서구"],
    대전: ["대덕구", "동구", "서구", "유성구", "중구"],
    울산: ["남구", "동구", "북구", "울주군", "중구"],
    세종: ["세종시"],
    강원: ["강릉시", "동해시", "삼척시", "속초시", "원주시", "춘천시", "태백시"],
    충북: ["청주시", "충주시", "제천시"],
    충남: ["천안시", "아산시", "서산시", "논산시", "당진시"],
    전북: ["전주시", "군산시", "익산시", "정읍시", "남원시"],
    전남: ["목포시", "여수시", "순천시", "광양시"],
    경북: ["포항시", "경주시", "김천시", "안동시", "구미시"],
    경남: ["창원시", "진주시", "통영시", "김해시", "양산시"],
    제주: ["제주시", "서귀포시"],
};

// 카테고리 데이터
export const CATEGORIES = [
    { id: "all", label: "전체", icon: MapPin },
    { id: "hospital", label: "동물병원 추천", icon: Stethoscope },
    { id: "walk", label: "산책 메이트", icon: Dog },
    { id: "share", label: "무료 나눔", icon: Gift },
    { id: "trade", label: "중고거래", icon: ShoppingBag },
    { id: "meet", label: "모임/정모", icon: Users },
    { id: "place", label: "장소 추천", icon: Coffee },
];

export const BADGE_OPTIONS = ["질문", "모집중", "나눔", "판매", "후기", "정보", "기타"];

export const INITIAL_FORM: PostFormData = {
    category: "hospital",
    title: "",
    content: "",
    region: "",
    district: "",
    badge: "정보",
};

/** 배지 색상 */
export function getBadgeStyle(badge: string): string {
    switch (badge) {
        case "모집중": return "bg-green-500 text-white";
        case "나눔": return "bg-purple-500 text-white";
        case "판매": return "bg-orange-500 text-white";
        case "후기": return "bg-blue-500 text-white";
        case "질문": return "bg-sky-500 text-white";
        case "정보": return "bg-teal-500 text-white";
        default: return "bg-gray-500 text-white";
    }
}

/** 카테고리 라벨 */
export function getCategoryLabel(categoryId: string): string {
    const cat = CATEGORIES.find(c => c.id === categoryId);
    return cat?.label || categoryId;
}

/** 시간 포맷 */
export function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "방금 전";
    if (minutes < 60) return `${minutes}분 전`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}일 전`;
    return date.toLocaleDateString("ko-KR");
}
