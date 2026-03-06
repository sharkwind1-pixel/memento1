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
    { pattern: /산책|공원|놀이터|야외|걷기|뛰기/, keyword: "공원" },
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
        const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=${display}&sort=random`;

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
 * 1) Reverse Geocoding으로 행정구역 파악
 * 2) "행정구역 + 키워드"로 네이버 검색
 * 3) 거리 계산 + 반경 필터 + 정렬
 */
export async function findNearbyPlaces(
    lat: number,
    lng: number,
    keyword: string,
): Promise<NearbyPlace[]> {
    // 1단계: 좌표 → 행정구역명
    const regionName = await reverseGeocode(lat, lng);
    if (!regionName) {
        // NCP 키 없으면 빈 배열 반환 (graceful degradation)
        return [];
    }

    // 2단계: "강남구 공원" 같은 키워드로 검색
    const searchQuery = `${regionName.split(" ").pop()} ${keyword}`;
    const items = await searchLocal(searchQuery, LOCATION.MAX_RESULTS + 3); // 여분 확보 (거리 필터 후 줄어들 수 있음)

    if (items.length === 0) return [];

    // 3단계: 거리 계산 + 필터 + 정렬
    const places: NearbyPlace[] = items
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
        // 반경 필터 (설정된 km 이내만)
        .filter((p) => p.distanceMeters <= LOCATION.SEARCH_RADIUS_KM * 1000)
        // 거리순 정렬
        .sort((a, b) => a.distanceMeters - b.distanceMeters)
        // 최대 결과 수 제한
        .slice(0, LOCATION.MAX_RESULTS);

    return places;
}
