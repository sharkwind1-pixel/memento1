/**
 * lostTypes.ts
 * 분실동물 페이지 공유 타입 및 상수
 */

/** API 응답의 분실동물 게시글 타입 (camelCase) */
export interface LostPetPost {
    id: string;
    userId: string;
    type: "lost" | "found";
    title: string;
    petType: string;
    breed: string;
    color: string;
    gender: string;
    age: string;
    region: string;
    district: string;
    locationDetail: string;
    date: string;
    description: string;
    contact: string;
    reward: string | null;
    imageUrl: string | null;
    imageStoragePath: string | null;
    views: number;
    status: string;
    createdAt: string;
    updatedAt: string;
}

/** 게시글 작성 폼 데이터 */
export interface PostFormData {
    type: "lost" | "found";
    title: string;
    petType: string;
    breed: string;
    color: string;
    gender: string;
    age: string;
    region: string;
    district: string;
    locationDetail: string;
    date: string;
    description: string;
    contact: string;
    reward: string;
}

// 시/도 데이터
export const REGIONS: Record<string, string[]> = {
    전체: [],
    서울: [
        "강남구", "강동구", "강북구", "강서구", "관악구", "광진구",
        "구로구", "금천구", "노원구", "도봉구", "동대문구", "동작구",
        "마포구", "서대문구", "서초구", "성동구", "성북구", "송파구",
        "양천구", "영등포구", "용산구", "은평구", "종로구", "중구", "중랑구",
    ],
    경기: [
        "고양시", "과천시", "광명시", "광주시", "구리시", "군포시",
        "김포시", "남양주시", "부천시", "성남시", "수원시", "안산시",
        "안양시", "용인시", "의정부시", "파주시", "평택시", "화성시",
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
    강원: ["강릉시", "동해시", "속초시", "원주시", "춘천시"],
    충북: ["청주시", "충주시", "제천시"],
    충남: ["천안시", "아산시", "서산시", "당진시"],
    전북: ["전주시", "군산시", "익산시"],
    전남: ["목포시", "여수시", "순천시"],
    경북: ["포항시", "경주시", "구미시", "안동시"],
    경남: ["창원시", "진주시", "김해시", "양산시"],
    제주: ["제주시", "서귀포시"],
};

export const INITIAL_FORM: PostFormData = {
    type: "lost",
    title: "",
    petType: "강아지",
    breed: "",
    color: "",
    gender: "",
    age: "",
    region: "",
    district: "",
    locationDetail: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    contact: "",
    reward: "",
};

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

/** 위치 표시 */
export function formatLocation(region: string, district: string, detail: string): string {
    const parts = [region, district, detail].filter(Boolean);
    return parts.join(" ") || "미지정";
}
