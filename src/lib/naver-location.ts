/**
 * naver-location.ts - 네이버 API 기반 위치 장소 검색
 *
 * 2단계 구조:
 *   1) NCP Reverse Geocoding: GPS 좌표 → 행정구역명
 *   2) 네이버 검색 API (지역): "강남구 공원" 텍스트 검색
 *
 * 환경변수:
 *   NAVER_NCP_CLIENT_ID / NAVER_NCP_CLIENT_SECRET (NCP Reverse Geocoding)
 *   NAVER_CLIENT_ID / NAVER_CLIENT_SECRET (네이버 검색 API - OAuth 공유)
 */

import { LOCATION } from "@/config/constants";

// ---- 타입 ----

export interface NearbyPlace {
    name: string;
    category: string;
    distance: string;      // "0.8km"
    distanceMeters: number; // 정렬/필터용
    address: string;
    mapUrl?: string;
}

interface NaverSearchItem {
    title: string;
    link: string;
    category: string;
    description: string;
    telephone: string;
    address: string;
    roadAddress: string;
    mapx: string;   // KATEC X 좌표
    mapy: string;   // KATEC Y 좌표
}

// ---- 장소 질문 감지 ----

/** 유저 메시지에서 장소 질문 감지 + 검색 키워드 반환 */
const PLACE_PATTERNS: { pattern: RegExp; keyword: string }[] = [
    { pattern: /산책|공원|놀이터|야외|걷기|뛰기/, keyword: "산책로 공원" },
    { pattern: /병원|수의사|진료|응급|건강검진|예방접종/, keyword: "동물병원" },
    { pattern: /펫카페|카페|놀 곳|놀이/, keyword: "펫카페" },
    { pattern: /미용|그루밍|목욕|트리밍/, keyword: "애견미용" },
    { pattern: /호텔|펫호텔|맡길|돌봄/, keyword: "펫호텔" },
    { pattern: /용품|사료|간식.*사/, keyword: "애견용품" },
];

export function detectPlaceQuery(message: string): { detected: boolean; keyword?: string } {
    // 장소 관련 의문형 패턴이 있는지 먼저 체크
    const questionPatterns = /어디|어느|가까운|근처|주변|추천|갈까|가볼|찾아/;
    if (!questionPatterns.test(message)) {
        return { detected: false };
    }

    for (const { pattern, keyword } of PLACE_PATTERNS) {
        if (pattern.test(message)) {
            return { detected: true, keyword };
        }
    }
    return { detected: false };
}

// ---- 하버사인 거리 계산 ----

/** 두 WGS84 좌표 간 거리 (km) */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // 지구 반경 (km)
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/** 거리를 사람 읽기 형식으로 변환 */
function formatDistance(km: number): string {
    if (km < 1) {
        return `${Math.round(km * 1000)}m`;
    }
    return `${km.toFixed(1)}km`;
}

// ---- KATEC → WGS84 변환 ----

/**
 * 네이버 검색 API의 mapx/mapy는 KATEC 좌표계 (정수, 10으로 나눠야 함)
 * 간이 변환: KATEC → WGS84 (근사치, 한국 내 오차 ~50m)
 */
function katecToWGS84(mapx: string, mapy: string): { lat: number; lng: number } {
    // 네이버 검색 API는 KATEC 좌표를 정수로 반환 (소수점 없음)
    const x = parseInt(mapx, 10);
    const y = parseInt(mapy, 10);

    // KATEC → WGS84 간이 변환 공식 (한국 내 유효)
    // 참고: 정밀한 변환이 필요하면 proj4js 라이브러리 사용
    const lng = x / 10000000;
    const lat = y / 10000000;

    // 네이버 검색 API가 이미 WGS84 경위도를 정수 형태로 반환하는 경우
    // mapx가 7~8자리면 10^n으로 나누기
    if (mapx.length >= 9) {
        return { lat: y / 10000000, lng: x / 10000000 };
    } else if (mapx.length >= 6) {
        return { lat: y / 10000, lng: x / 10000 };
    }

    return { lat, lng };
}

// ---- NCP Reverse Geocoding ----

/**
 * GPS 좌표 → 행정구역명 변환 (네이버 클라우드 플랫폼)
 * @returns "서울특별시 강남구" 같은 행정구역 문자열, 실패 시 null
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
    const ncpClientId = process.env.NAVER_NCP_CLIENT_ID;
    const ncpClientSecret = process.env.NAVER_NCP_CLIENT_SECRET;

    if (!ncpClientId || !ncpClientSecret) {
        console.warn("[naver-location] NCP API 키 미설정 - Reverse Geocoding 불가");
        return null;
    }

    try {
        const url = `https://naveropenapi.apigw.ntruss.com/map-reversegeocode/v2/gc?coords=${lng},${lat}&output=json&orders=legalcode`;

        const res = await fetch(url, {
            headers: {
                "x-ncp-apigw-api-key-id": ncpClientId,
                "x-ncp-apigw-api-key": ncpClientSecret,
            },
        });

        if (!res.ok) {
            console.error(`[naver-location/reverse-geocode] HTTP ${res.status}`);
            return null;
        }

        const data = await res.json();
        const result = data?.results?.[0];
        if (!result) return null;

        const region = result.region;
        const area1 = region?.area1?.name || ""; // 시/도
        const area2 = region?.area2?.name || ""; // 구/군

        if (!area1 || !area2) return null;
        return `${area1} ${area2}`;
    } catch (err) {
        console.error("[naver-location/reverse-geocode]", err instanceof Error ? err.message : err);
        return null;
    }
}

// ---- 네이버 검색 API (지역) ----

/**
 * 네이버 지역 검색 API 호출
 * @param query 검색어 (예: "강남구 공원")
 * @param display 결과 수 (최대 5)
 */
async function searchLocal(query: string, display = 5): Promise<NaverSearchItem[]> {
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        console.warn("[naver-location] 네이버 검색 API 키 미설정");
        return [];
    }

    try {
        const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=${display}&sort=comment`;

        const res = await fetch(url, {
            headers: {
                "X-Naver-Client-Id": clientId,
                "X-Naver-Client-Secret": clientSecret,
            },
        });

        if (!res.ok) {
            console.error(`[naver-location/search] HTTP ${res.status}`);
            return [];
        }

        const data = await res.json();
        return data?.items || [];
    } catch (err) {
        console.error("[naver-location/search]", err instanceof Error ? err.message : err);
        return [];
    }
}

// ---- 통합: 주변 장소 검색 ----

/**
 * GPS 좌표 기반 주변 장소 검색 (2단계)
 * 1) Reverse Geocoding으로 행정구역 파악 (실패 시 좌표 기반 추정)
 * 2) "행정구역 + 키워드"로 네이버 검색
 * 3) 거리 계산 + 반경 필터 + 정렬
 */
export async function findNearbyPlaces(
    lat: number,
    lng: number,
    keyword: string,
): Promise<NearbyPlace[]> {
    // 1단계: 좌표 → 행정구역명
    // NCP Reverse Geocoding 시도, 실패 시 좌표 기반 추정
    let regionName = await reverseGeocode(lat, lng);
    if (!regionName) {
        regionName = estimateRegionFromCoords(lat, lng);
    }

    // 2단계: 검색 쿼리 구성 ("강남구 공원" 형태)
    const searchQuery = regionName
        ? `${regionName} ${keyword}`
        : keyword;
    const fetchCount = LOCATION.MAX_RESULTS + 5;
    const items = await searchLocal(searchQuery, fetchCount);

    if (items.length === 0) return [];

    // 카테고리 기반 필터: 검색 키워드와 무관한 결과 제외
    const EXCLUDED_CATEGORIES = /한식|중식|일식|양식|분식|육류|고기|치킨|피자|패스트푸드|카페|커피|디저트|제과|주점|술집|편의점|마트|세탁|부동산|학원|금융|보험/;
    // 단, 키워드가 카페 관련이면 카페 필터 해제
    const isPlaceCategory = keyword.includes("카페") || keyword.includes("용품");
    const filteredItems = isPlaceCategory
        ? items
        : items.filter((item) => !EXCLUDED_CATEGORIES.test(item.category));
    const searchItems = filteredItems.length > 0 ? filteredItems : items; // 필터 후 0개면 원본 사용

    // 3단계: 거리 계산 + 필터 + 정렬
    const radiusKm = LOCATION.SEARCH_RADIUS_KM;
    const places: NearbyPlace[] = searchItems
        .map((item) => {
            // HTML 태그 제거 (네이버 검색 결과에 <b> 태그 포함)
            const name = item.title.replace(/<[^>]+>/g, "");
            const coords = katecToWGS84(item.mapx, item.mapy);
            const distKm = haversineDistance(lat, lng, coords.lat, coords.lng);
            const distMeters = Math.round(distKm * 1000);

            // 네이버 지도 링크 생성
            const mapUrl = `https://map.naver.com/v5/search/${encodeURIComponent(name)}`;

            return {
                name,
                category: item.category || keyword,
                distance: formatDistance(distKm),
                distanceMeters: distMeters,
                address: item.roadAddress || item.address,
                mapUrl,
            };
        })
        // 반경 필터
        .filter((p) => p.distanceMeters <= radiusKm * 1000)
        // 거리순 정렬
        .sort((a, b) => a.distanceMeters - b.distanceMeters)
        // 최대 결과 수 제한
        .slice(0, LOCATION.MAX_RESULTS);

    // 반경 내 결과 없으면 거리순 상위 5개라도 반환 (더 넓은 범위)
    if (places.length === 0 && items.length > 0) {
        return items
            .map((item) => {
                const name = item.title.replace(/<[^>]+>/g, "");
                const coords = katecToWGS84(item.mapx, item.mapy);
                const distKm = haversineDistance(lat, lng, coords.lat, coords.lng);
                const mapUrl = `https://map.naver.com/v5/search/${encodeURIComponent(name)}`;
                return {
                    name,
                    category: item.category || keyword,
                    distance: formatDistance(distKm),
                    distanceMeters: Math.round(distKm * 1000),
                    address: item.roadAddress || item.address,
                    mapUrl,
                };
            })
            .sort((a, b) => a.distanceMeters - b.distanceMeters)
            .slice(0, LOCATION.MAX_RESULTS);
    }

    return places;
}

// ---- 좌표 기반 지역 추정 (NCP Reverse Geocoding 대안) ----

/** GPS 좌표로 대략적인 구/군 이름 추정 (서울/수도권 주요 지역) */
function estimateRegionFromCoords(lat: number, lng: number): string | null {
    // 서울 주요 구 좌표 범위 (대략적)
    const regions: { name: string; lat: [number, number]; lng: [number, number] }[] = [
        { name: "강남구", lat: [37.49, 37.53], lng: [127.01, 127.07] },
        { name: "서초구", lat: [37.47, 37.51], lng: [126.97, 127.03] },
        { name: "송파구", lat: [37.49, 37.53], lng: [127.08, 127.14] },
        { name: "강동구", lat: [37.52, 37.56], lng: [127.12, 127.17] },
        { name: "마포구", lat: [37.54, 37.57], lng: [126.89, 126.96] },
        { name: "용산구", lat: [37.52, 37.55], lng: [126.96, 127.00] },
        { name: "종로구", lat: [37.57, 37.60], lng: [126.96, 127.02] },
        { name: "중구", lat: [37.55, 37.57], lng: [126.97, 127.01] },
        { name: "성동구", lat: [37.55, 37.57], lng: [127.03, 127.06] },
        { name: "광진구", lat: [37.53, 37.56], lng: [127.07, 127.10] },
        { name: "동대문구", lat: [37.57, 37.60], lng: [127.03, 127.06] },
        { name: "중랑구", lat: [37.58, 37.61], lng: [127.07, 127.10] },
        { name: "성북구", lat: [37.58, 37.61], lng: [126.99, 127.03] },
        { name: "강북구", lat: [37.61, 37.65], lng: [126.99, 127.03] },
        { name: "도봉구", lat: [37.65, 37.69], lng: [127.01, 127.06] },
        { name: "노원구", lat: [37.63, 37.67], lng: [127.05, 127.10] },
        { name: "은평구", lat: [37.60, 37.64], lng: [126.91, 126.95] },
        { name: "서대문구", lat: [37.56, 37.59], lng: [126.93, 126.97] },
        { name: "영등포구", lat: [37.51, 37.54], lng: [126.89, 126.93] },
        { name: "동작구", lat: [37.49, 37.52], lng: [126.93, 126.98] },
        { name: "관악구", lat: [37.46, 37.49], lng: [126.93, 126.97] },
        { name: "금천구", lat: [37.44, 37.47], lng: [126.89, 126.92] },
        { name: "구로구", lat: [37.48, 37.51], lng: [126.85, 126.90] },
        { name: "양천구", lat: [37.51, 37.54], lng: [126.85, 126.89] },
        { name: "강서구", lat: [37.54, 37.58], lng: [126.81, 126.86] },
        // 수도권 주요 도시
        { name: "성남시 분당구", lat: [37.35, 37.40], lng: [127.05, 127.14] },
        { name: "수원시 영통구", lat: [37.25, 37.30], lng: [127.04, 127.09] },
        { name: "고양시 일산동구", lat: [37.66, 37.70], lng: [126.75, 126.80] },
        { name: "인천시 남동구", lat: [37.40, 37.44], lng: [126.72, 126.76] },
        { name: "용인시 수지구", lat: [37.30, 37.34], lng: [127.07, 127.11] },
    ];

    for (const r of regions) {
        if (lat >= r.lat[0] && lat <= r.lat[1] && lng >= r.lng[0] && lng <= r.lng[1]) {
            return r.name;
        }
    }

    // 매칭 안 되면 가장 가까운 지역 반환
    let closest = regions[0];
    let minDist = Infinity;
    for (const r of regions) {
        const centerLat = (r.lat[0] + r.lat[1]) / 2;
        const centerLng = (r.lng[0] + r.lng[1]) / 2;
        const d = haversineDistance(lat, lng, centerLat, centerLng);
        if (d < minDist) {
            minDist = d;
            closest = r;
        }
    }
    // 50km 이내면 가장 가까운 지역 반환
    if (minDist < 50) return closest.name;
    return null;
}
