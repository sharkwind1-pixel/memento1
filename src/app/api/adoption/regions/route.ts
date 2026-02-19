/**
 * /api/adoption/regions
 * 시도 코드 목록 반환
 */

import { NextResponse } from "next/server";

const REGIONS = [
    { code: "", label: "전체" },
    { code: "6110000", label: "서울특별시" },
    { code: "6260000", label: "부산광역시" },
    { code: "6270000", label: "대구광역시" },
    { code: "6280000", label: "인천광역시" },
    { code: "6290000", label: "광주광역시" },
    { code: "6300000", label: "대전광역시" },
    { code: "6310000", label: "울산광역시" },
    { code: "5690000", label: "세종특별자치시" },
    { code: "6410000", label: "경기도" },
    { code: "6530000", label: "강원특별자치도" },
    { code: "6430000", label: "충청북도" },
    { code: "6440000", label: "충청남도" },
    { code: "6540000", label: "전북특별자치도" },
    { code: "6460000", label: "전라남도" },
    { code: "6470000", label: "경상북도" },
    { code: "6480000", label: "경상남도" },
    { code: "6500000", label: "제주특별자치도" },
];

export async function GET() {
    return NextResponse.json({ regions: REGIONS });
}
