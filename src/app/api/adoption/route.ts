/**
 * /api/adoption
 * 유기동물 입양 정보 API
 *
 * 1순위: 공공데이터포털 동물보호관리시스템 API (OPENDATA_API_KEY 필요)
 * 2순위: API 키 없으면 목업 데이터 반환
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

// 목업 데이터 생성
function getMockData(page: number, size: number, kind: string, search: string): {
    animals: AdoptionAnimal[];
    totalCount: number;
} {
    const mockAnimals: AdoptionAnimal[] = [
        {
            id: "mock-001",
            imageUrl: "",
            kind: "강아지",
            breed: "믹스견",
            color: "갈색",
            age: "2023(년생)",
            weight: "8(Kg)",
            gender: "M",
            neutered: "Y",
            specialMark: "온순함, 사람 좋아함",
            noticeNo: "서울-종로-2024-00001",
            noticeStart: "20240101",
            noticeEnd: "20240115",
            status: "보호중",
            shelterName: "서울동물보호센터",
            shelterTel: "02-1234-5678",
            shelterAddr: "서울특별시 마포구 상암동",
            region: "서울특별시",
            foundPlace: "종로구 혜화동 인근",
            foundDate: "20240101",
        },
        {
            id: "mock-002",
            imageUrl: "",
            kind: "고양이",
            breed: "코리안숏헤어",
            color: "치즈색",
            age: "2022(년생)",
            weight: "4.5(Kg)",
            gender: "F",
            neutered: "Y",
            specialMark: "겁이 많음, 실내 적응 필요",
            noticeNo: "서울-강남-2024-00002",
            noticeStart: "20240105",
            noticeEnd: "20240119",
            status: "공고중",
            shelterName: "강남구 유기동물보호소",
            shelterTel: "02-2345-6789",
            shelterAddr: "서울특별시 강남구 역삼동",
            region: "서울특별시",
            foundPlace: "강남구 역삼동 카페 앞",
            foundDate: "20240103",
        },
        {
            id: "mock-003",
            imageUrl: "",
            kind: "강아지",
            breed: "말티즈",
            color: "흰색",
            age: "2021(년생)",
            weight: "3.2(Kg)",
            gender: "F",
            neutered: "N",
            specialMark: "활발함, 짖음 있음",
            noticeNo: "경기-성남-2024-00003",
            noticeStart: "20240108",
            noticeEnd: "20240122",
            status: "보호중",
            shelterName: "성남시 동물보호센터",
            shelterTel: "031-3456-7890",
            shelterAddr: "경기도 성남시 분당구",
            region: "경기도",
            foundPlace: "분당구 정자동 공원",
            foundDate: "20240107",
        },
        {
            id: "mock-004",
            imageUrl: "",
            kind: "강아지",
            breed: "진도견",
            color: "황색",
            age: "2020(년생)",
            weight: "15(Kg)",
            gender: "M",
            neutered: "Y",
            specialMark: "충성심 강함, 낯선 사람 경계",
            noticeNo: "서울-용산-2024-00004",
            noticeStart: "20240110",
            noticeEnd: "20240124",
            status: "공고중",
            shelterName: "용산구 유기동물보호소",
            shelterTel: "02-4567-8901",
            shelterAddr: "서울특별시 용산구 이태원동",
            region: "서울특별시",
            foundPlace: "용산구 한남동",
            foundDate: "20240109",
        },
        {
            id: "mock-005",
            imageUrl: "",
            kind: "고양이",
            breed: "페르시안",
            color: "회색",
            age: "2022(년생)",
            weight: "5(Kg)",
            gender: "M",
            neutered: "N",
            specialMark: "조용함, 실내 생활 적합",
            noticeNo: "인천-남동-2024-00005",
            noticeStart: "20240112",
            noticeEnd: "20240126",
            status: "보호중",
            shelterName: "인천 남동구 보호소",
            shelterTel: "032-5678-9012",
            shelterAddr: "인천광역시 남동구 구월동",
            region: "인천광역시",
            foundPlace: "남동구 만수동 아파트 단지",
            foundDate: "20240111",
        },
        {
            id: "mock-006",
            imageUrl: "",
            kind: "강아지",
            breed: "포메라니안",
            color: "크림",
            age: "2023(년생)",
            weight: "2.5(Kg)",
            gender: "F",
            neutered: "N",
            specialMark: "소심함, 간식 좋아함",
            noticeNo: "서울-서초-2024-00006",
            noticeStart: "20240115",
            noticeEnd: "20240129",
            status: "보호중",
            shelterName: "서초구 동물보호센터",
            shelterTel: "02-6789-0123",
            shelterAddr: "서울특별시 서초구 방배동",
            region: "서울특별시",
            foundPlace: "서초구 방배동 골목",
            foundDate: "20240114",
        },
        {
            id: "mock-007",
            imageUrl: "",
            kind: "고양이",
            breed: "러시안블루",
            color: "회색",
            age: "2021(년생)",
            weight: "4(Kg)",
            gender: "F",
            neutered: "Y",
            specialMark: "사람 손길 좋아함",
            noticeNo: "경기-수원-2024-00007",
            noticeStart: "20240118",
            noticeEnd: "20240201",
            status: "공고중",
            shelterName: "수원시 동물보호센터",
            shelterTel: "031-7890-1234",
            shelterAddr: "경기도 수원시 영통구",
            region: "경기도",
            foundPlace: "영통구 아파트 단지",
            foundDate: "20240117",
        },
        {
            id: "mock-008",
            imageUrl: "",
            kind: "강아지",
            breed: "시바견",
            color: "적갈색",
            age: "2022(년생)",
            weight: "10(Kg)",
            gender: "M",
            neutered: "Y",
            specialMark: "활발, 산책 좋아함",
            noticeNo: "서울-송파-2024-00008",
            noticeStart: "20240120",
            noticeEnd: "20240203",
            status: "보호중",
            shelterName: "송파구 유기동물보호소",
            shelterTel: "02-8901-2345",
            shelterAddr: "서울특별시 송파구 잠실동",
            region: "서울특별시",
            foundPlace: "송파구 올림픽공원 인근",
            foundDate: "20240119",
        },
        {
            id: "mock-009",
            imageUrl: "",
            kind: "강아지",
            breed: "골든리트리버",
            color: "금색",
            age: "2019(년생)",
            weight: "30(Kg)",
            gender: "M",
            neutered: "Y",
            specialMark: "온순, 아이 친화적",
            noticeNo: "경기-고양-2024-00009",
            noticeStart: "20240122",
            noticeEnd: "20240205",
            status: "보호중",
            shelterName: "고양시 동물보호센터",
            shelterTel: "031-9012-3456",
            shelterAddr: "경기도 고양시 일산동구",
            region: "경기도",
            foundPlace: "일산 호수공원",
            foundDate: "20240121",
        },
        {
            id: "mock-010",
            imageUrl: "",
            kind: "강아지",
            breed: "비숑프리제",
            color: "흰색",
            age: "2023(년생)",
            weight: "5(Kg)",
            gender: "F",
            neutered: "N",
            specialMark: "사교적, 다른 강아지와 잘 어울림",
            noticeNo: "서울-마포-2024-00010",
            noticeStart: "20240125",
            noticeEnd: "20240208",
            status: "공고중",
            shelterName: "마포구 유기동물보호소",
            shelterTel: "02-0123-4567",
            shelterAddr: "서울특별시 마포구 합정동",
            region: "서울특별시",
            foundPlace: "마포구 홍대입구역 인근",
            foundDate: "20240124",
        },
        {
            id: "mock-011",
            imageUrl: "",
            kind: "고양이",
            breed: "스코티시폴드",
            color: "삼색",
            age: "2022(년생)",
            weight: "3.8(Kg)",
            gender: "F",
            neutered: "Y",
            specialMark: "조용, 무릎 위 좋아함",
            noticeNo: "부산-해운대-2024-00011",
            noticeStart: "20240128",
            noticeEnd: "20240211",
            status: "보호중",
            shelterName: "해운대구 동물보호센터",
            shelterTel: "051-1234-5678",
            shelterAddr: "부산광역시 해운대구",
            region: "부산광역시",
            foundPlace: "해운대 해변 인근",
            foundDate: "20240127",
        },
        {
            id: "mock-012",
            imageUrl: "",
            kind: "강아지",
            breed: "슈나우저",
            color: "회색",
            age: "2021(년생)",
            weight: "7(Kg)",
            gender: "M",
            neutered: "Y",
            specialMark: "영리함, 훈련 잘 됨",
            noticeNo: "대전-유성-2024-00012",
            noticeStart: "20240130",
            noticeEnd: "20240213",
            status: "공고중",
            shelterName: "유성구 동물보호센터",
            shelterTel: "042-2345-6789",
            shelterAddr: "대전광역시 유성구",
            region: "대전광역시",
            foundPlace: "유성구 봉명동",
            foundDate: "20240129",
        },
    ];

    // 필터링
    let filtered = [...mockAnimals];

    if (kind !== "all") {
        const kindMap: Record<string, string> = {
            dog: "강아지",
            cat: "고양이",
            etc: "기타",
        };
        filtered = filtered.filter((a) => a.kind === kindMap[kind]);
    }

    if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
            (a) =>
                a.breed.toLowerCase().includes(q) ||
                a.kind.toLowerCase().includes(q) ||
                a.region.toLowerCase().includes(q) ||
                a.shelterName.toLowerCase().includes(q)
        );
    }

    const totalCount = filtered.length;
    const start = (page - 1) * size;
    const paged = filtered.slice(start, start + size);

    return { animals: paged, totalCount };
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const size = parseInt(searchParams.get("size") || "20");
    const kind = searchParams.get("kind") || "all";
    const region = searchParams.get("region") || "";
    const search = searchParams.get("search") || "";
    const state = searchParams.get("state") || "all";

    const apiKey = process.env.OPENDATA_API_KEY;

    // API 키가 없으면 목업 데이터 반환
    if (!apiKey) {
        const { animals, totalCount } = getMockData(page, size, kind, search);

        // 목업 동물에 랜덤 이미지 할당 (Dog/Cat API 활용)
        const withImages = await Promise.all(
            animals.map(async (animal) => {
                if (animal.imageUrl) return animal;
                try {
                    if (animal.kind === "고양이") {
                        const res = await fetch("https://api.thecatapi.com/v1/images/search", {
                            signal: AbortSignal.timeout(3000),
                        });
                        if (res.ok) {
                            const data = await res.json();
                            return { ...animal, imageUrl: data[0]?.url || "" };
                        }
                    } else {
                        const res = await fetch("https://dog.ceo/api/breeds/image/random", {
                            signal: AbortSignal.timeout(3000),
                        });
                        if (res.ok) {
                            const data = await res.json();
                            return { ...animal, imageUrl: data.message || "" };
                        }
                    }
                } catch {
                    // 이미지 실패해도 계속 진행
                }
                return animal;
            })
        );

        return NextResponse.json({
            animals: withImages,
            totalCount,
            page,
            size,
            isMock: true,
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
        // API 실패 시 목업 데이터 폴백
        const { animals, totalCount } = getMockData(page, size, kind, search);
        return NextResponse.json({
            animals,
            totalCount,
            page,
            size,
            isMock: true,
            error: error instanceof Error ? error.message : "API 호출 실패",
        });
    }
}

