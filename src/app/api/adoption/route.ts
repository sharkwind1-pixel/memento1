/**
 * /api/adoption
 * 유기동물 입양 정보 API
 *
 * 공공데이터포털 동물보호관리시스템 API (OPENDATA_API_KEY 필요)
 * API 키 없으면 빈 결과 반환
 *
 * 쿼리 파라미터:
 * - page: 페이지 번호 (기본 1)
 * - size: 페이지 크기 (기본 20)
 * - kind: "dog" | "cat" | "etc" | "all" (기본 "all")
 * - region: 시도 코드 (예: "6110000" 서울)
 * - search: 검색어 (품종명)
 * - state: "notice" | "protect" | "all" (공고중/보호중/전체)
 */

import { NextRequest, NextResponse } from "next/server";
import { getClientIP, checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// 공공 API 응답 타입
interface PublicAPIAnimal {
    desertionNo: string;
    filename: string;
    happenDt: string;
    happenPlace: string;
    kindCd: string;
    colorCd: string;
    age: string;
    weight: string;
    noticeNo: string;
    noticeSdt: string;
    noticeEdt: string;
    popfile: string;
    processState: string;
    sexCd: string;
    neuterYn: string;
    specialMark: string;
    careNm: string;
    careTel: string;
    careAddr: string;
    orgNm: string;
    chargeNm: string;
    officetel: string;
}

// 프론트엔드용 정규화된 동물 타입
export interface AdoptionAnimal {
    id: string;
    imageUrl: string;
    kind: string; // "강아지", "고양이", "기타"
    breed: string; // "믹스견", "말티즈" 등
    color: string;
    age: string;
    weight: string;
    gender: "M" | "F" | "Q"; // 남/여/미상
    neutered: "Y" | "N" | "U"; // 중성화 여부
    specialMark: string;
    noticeNo: string;
    noticeStart: string;
    noticeEnd: string;
    status: string; // "공고중", "보호중" 등
    shelterName: string;
    shelterTel: string;
    shelterAddr: string;
    region: string;
    foundPlace: string;
    foundDate: string;
}

// 시도 코드 매핑
const REGION_CODES: Record<string, string> = {
    서울특별시: "6110000",
    부산광역시: "6260000",
    대구광역시: "6270000",
    인천광역시: "6280000",
    광주광역시: "6290000",
    대전광역시: "6300000",
    울산광역시: "6310000",
    세종특별자치시: "5690000",
    경기도: "6410000",
    강원특별자치도: "6530000",
    충청북도: "6430000",
    충청남도: "6440000",
    전북특별자치도: "6540000",
    전라남도: "6460000",
    경상북도: "6470000",
    경상남도: "6480000",
    제주특별자치도: "6500000",
};

// 종류 코드 변환
function getKindCode(kind: string): string | undefined {
    switch (kind) {
        case "dog":
            return "417000";
        case "cat":
            return "422400";
        case "etc":
            return "429900";
        default:
            return undefined;
    }
}

// 공공 API 응답 → 프론트엔드 타입 변환
function normalizeAnimal(raw: PublicAPIAnimal): AdoptionAnimal {
    // kindCd 파싱: "[개] 믹스견" → { kind: "강아지", breed: "믹스견" }
    const kindMatch = raw.kindCd?.match(/\[(.+?)\]\s*(.*)/);
    let kind = "기타";
    let breed = raw.kindCd || "정보없음";

    if (kindMatch) {
        const typeStr = kindMatch[1];
        breed = kindMatch[2] || typeStr;
        if (typeStr === "개") kind = "강아지";
        else if (typeStr === "고양이") kind = "고양이";
        else kind = "기타";
    }

    return {
        id: raw.desertionNo,
        imageUrl: raw.popfile || raw.filename || "",
        kind,
        breed,
        color: raw.colorCd || "",
        age: raw.age || "정보없음",
        weight: raw.weight || "",
        gender: (raw.sexCd as "M" | "F" | "Q") || "Q",
        neutered: (raw.neuterYn as "Y" | "N" | "U") || "U",
        specialMark: raw.specialMark || "",
        noticeNo: raw.noticeNo || "",
        noticeStart: raw.noticeSdt || "",
        noticeEnd: raw.noticeEdt || "",
        status: raw.processState || "",
        shelterName: raw.careNm || "",
        shelterTel: raw.careTel || "",
        shelterAddr: raw.careAddr || "",
        region: raw.orgNm || "",
        foundPlace: raw.happenPlace || "",
        foundDate: raw.happenDt || "",
    };
}

export async function GET(request: NextRequest) {
    const clientIP = await getClientIP();
    const rateLimit = checkRateLimit(clientIP, "general");
    if (!rateLimit.allowed) {
        return NextResponse.json(
            { error: "요청이 너무 많습니다." },
            { status: 429, headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn) }
        );
    }

    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const size = parseInt(searchParams.get("size") || "20");
    const kind = searchParams.get("kind") || "all";
    const region = searchParams.get("region") || "";
    const search = searchParams.get("search") || "";
    const state = searchParams.get("state") || "all";

    const apiKey = process.env.OPENDATA_API_KEY;

    // API 키가 없으면 빈 결과 반환
    if (!apiKey) {
        return NextResponse.json({
            animals: [],
            totalCount: 0,
            page,
            size,
            isMock: false,
            error: "OPENDATA_API_KEY가 설정되지 않았습니다.",
        });
    }

    // 공공데이터 API 호출
    try {
        const baseUrl = "http://apis.data.go.kr/1543061/abandonmentPublicSrvc/abandonmentPublic";
        const params = new URLSearchParams({
            serviceKey: apiKey,
            pageNo: page.toString(),
            numOfRows: size.toString(),
            _type: "json",
        });

        // 종류 필터
        const kindCode = getKindCode(kind);
        if (kindCode) {
            params.set("upkind", kindCode);
        }

        // 시도 필터
        if (region) {
            params.set("upr_cd", region);
        }

        // 상태 필터
        if (state === "notice") {
            params.set("state", "notice");
        } else if (state === "protect") {
            params.set("state", "protect");
        }

        const res = await fetch(`${baseUrl}?${params.toString()}`, {
            signal: AbortSignal.timeout(10000),
            next: { revalidate: 300 }, // 5분 캐시
        });

        if (!res.ok) {
            throw new Error(`API 응답 오류: ${res.status}`);
        }

        const data = await res.json();
        const body = data?.response?.body;

        if (!body) {
            throw new Error("API 응답 형식 오류");
        }

        const items = body.items?.item || [];
        const itemList = Array.isArray(items) ? items : [items];

        let animals = itemList.map(normalizeAnimal);

        // 검색 필터 (API에서 지원하지 않으므로 서버에서 필터)
        if (search) {
            const q = search.toLowerCase();
            animals = animals.filter(
                (a) =>
                    a.breed.toLowerCase().includes(q) ||
                    a.kind.toLowerCase().includes(q) ||
                    a.region.toLowerCase().includes(q) ||
                    a.shelterName.toLowerCase().includes(q) ||
                    a.foundPlace.toLowerCase().includes(q)
            );
        }

        return NextResponse.json({
            animals,
            totalCount: body.totalCount || 0,
            page,
            size,
            isMock: false,
        });
    } catch (error) {
        return NextResponse.json({
            animals: [],
            totalCount: 0,
            page,
            size,
            isMock: false,
            error: error instanceof Error ? error.message : "API 호출 실패",
        });
    }
}

