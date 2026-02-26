/**
 * adoptionTypes.ts
 * 입양 정보 페이지에서 사용하는 상수와 유틸 함수
 */

// 성별 라벨
export function genderLabel(g: string): string {
    if (g === "M") return "수컷";
    if (g === "F") return "암컷";
    return "미상";
}

// 중성화 라벨
export function neuterLabel(n: string): string {
    if (n === "Y") return "완료";
    if (n === "N") return "미완료";
    return "미상";
}

// 날짜 포맷
export function formatDate(d: string): string {
    if (!d || d.length !== 8) return d;
    return `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6, 8)}`;
}

// 지역 목록
export const REGIONS = [
    { code: "", label: "전체 지역" },
    { code: "6110000", label: "서울" },
    { code: "6260000", label: "부산" },
    { code: "6270000", label: "대구" },
    { code: "6280000", label: "인천" },
    { code: "6290000", label: "광주" },
    { code: "6300000", label: "대전" },
    { code: "6310000", label: "울산" },
    { code: "5690000", label: "세종" },
    { code: "6410000", label: "경기" },
    { code: "6530000", label: "강원" },
    { code: "6430000", label: "충북" },
    { code: "6440000", label: "충남" },
    { code: "6540000", label: "전북" },
    { code: "6460000", label: "전남" },
    { code: "6470000", label: "경북" },
    { code: "6480000", label: "경남" },
    { code: "6500000", label: "제주" },
];
