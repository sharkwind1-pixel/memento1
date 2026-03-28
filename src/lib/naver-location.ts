/**
 * naver-location.ts - 네이버 API 기반 위치 장소 검색
 *
 * GPS 좌표 기반 주변 장소 검색:
 *   1) 좌표 → 가까운 동 3개 매칭 (100+ 동 좌표 DB)
 *   2) "동이름 + 키워드"로 네이버 검색 API 병렬 호출
 *   3) 거리 계산(하버사인) → 반경 필터 → 거리순 정렬
 *
 * 환경변수:
 *   NAVER_CLIENT_ID / NAVER_CLIENT_SECRET (네이버 검색 API)
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
/** keyword를 배열로 바꿔 복수 검색어 지원 (네이버 검색은 단일 키워드가 결과 품질이 좋음) */
const PLACE_PATTERNS: { pattern: RegExp; keyword: string; altKeyword?: string }[] = [
    { pattern: /산책|공원|놀이터|야외|걷기|뛰기/, keyword: "공원", altKeyword: "산책로" },
    { pattern: /병원|수의사|진료|응급|건강검진|예방접종/, keyword: "동물병원" },
    { pattern: /펫카페|카페|놀 곳|놀이/, keyword: "펫카페" },
    { pattern: /미용|그루밍|목욕|트리밍/, keyword: "애견미용" },
    { pattern: /호텔|펫호텔|맡길|돌봄/, keyword: "펫호텔" },
    { pattern: /용품|사료|간식.*사/, keyword: "애견용품" },
    { pattern: /장례|장묘|화장|납골|추모공원|장의사|수습|유골/, keyword: "반려동물장례", altKeyword: "펫장례식장" },
];

/**
 * 메시지에 특정 지역명이 포함되어 있는지 검사
 * GPS 좌표(현재 위치) 기반 검색이 아닌 지역을 언급하는 경우 → GPS 검색 스킵
 */
const SPECIFIC_LOCATION_PATTERN = /강릉|속초|양양|삼척|동해|제주|부산|대구|광주|대전|울산|세종|춘천|원주|천안|전주|목포|포항|경주|여수|통영|거제|김해|창원|안동|충주|제천|태백|정선|평창|서귀포|송정|해운대|송도|인천공항|김포공항/;

export function detectPlaceQuery(message: string): { detected: boolean; keyword?: string; altKeyword?: string; hasSpecificLocation?: boolean; locationName?: string } {
    // 장소 관련 의문형 패턴이 있는지 먼저 체크
    const questionPatterns = /어디|어느|가까운|근처|주변|추천|갈까|가볼|찾아|코스|갈만|산책/;
    // 장례/장묘 키워드는 의문형 없어도 장소 검색 트리거 (추모 모드 핵심 기능)
    const memorialPlacePatterns = /장례.*어디|장례.*해야|장묘|화장.*해야|장례식장|납골|추모공원/;
    if (!questionPatterns.test(message) && !memorialPlacePatterns.test(message)) {
        return { detected: false };
    }

    // 특정 지역명 추출
    const locationMatch = message.match(SPECIFIC_LOCATION_PATTERN);
    const hasSpecificLocation = !!locationMatch;
    const locationName = locationMatch ? locationMatch[0] : undefined;

    for (const { pattern, keyword, altKeyword } of PLACE_PATTERNS) {
        if (pattern.test(message)) {
            return { detected: true, keyword, altKeyword, hasSpecificLocation, locationName };
        }
    }

    // 여행/산책 코스 질문이면 "공원"/"산책로" 키워드로 감지
    if (hasSpecificLocation && /여행|코스|갈만|산책|걷|나들이|외출/.test(message)) {
        return { detected: true, keyword: "공원", altKeyword: "산책로", hasSpecificLocation, locationName };
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

// ---- 동 단위 지역 목록 (좌표 기반 근접 검색용) ----

/** 서울 주요 동 + 수도권 중심 좌표 */
const DONG_LIST: { name: string; lat: number; lng: number }[] = [
    // 노원구
    { name: "월계동", lat: 37.6200, lng: 127.0589 },
    { name: "공릉동", lat: 37.6257, lng: 127.0725 },
    { name: "하계동", lat: 37.6380, lng: 127.0660 },
    { name: "중계동", lat: 37.6445, lng: 127.0740 },
    { name: "상계동", lat: 37.6570, lng: 127.0700 },
    // 강북구
    { name: "미아동", lat: 37.6280, lng: 127.0280 },
    { name: "번동", lat: 37.6370, lng: 127.0350 },
    { name: "수유동", lat: 37.6430, lng: 127.0170 },
    { name: "우이동", lat: 37.6600, lng: 127.0120 },
    // 도봉구
    { name: "창동", lat: 37.6530, lng: 127.0440 },
    { name: "쌍문동", lat: 37.6480, lng: 127.0340 },
    { name: "방학동", lat: 37.6630, lng: 127.0390 },
    { name: "도봉동", lat: 37.6790, lng: 127.0440 },
    // 성북구
    { name: "석관동", lat: 37.6095, lng: 127.0645 },
    { name: "하월곡동", lat: 37.6020, lng: 127.0360 },
    { name: "길음동", lat: 37.6035, lng: 127.0230 },
    { name: "돈암동", lat: 37.5920, lng: 127.0180 },
    { name: "정릉동", lat: 37.6050, lng: 126.9995 },
    { name: "장위동", lat: 37.6150, lng: 127.0530 },
    // 중랑구
    { name: "면목동", lat: 37.5820, lng: 127.0850 },
    { name: "상봉동", lat: 37.5960, lng: 127.0870 },
    { name: "중화동", lat: 37.6020, lng: 127.0780 },
    { name: "묵동", lat: 37.6115, lng: 127.0780 },
    { name: "망우동", lat: 37.6040, lng: 127.1070 },
    { name: "신내동", lat: 37.6130, lng: 127.1050 },
    // 동대문구
    { name: "전농동", lat: 37.5800, lng: 127.0560 },
    { name: "답십리동", lat: 37.5700, lng: 127.0570 },
    { name: "장안동", lat: 37.5700, lng: 127.0680 },
    { name: "이문동", lat: 37.5960, lng: 127.0560 },
    { name: "휘경동", lat: 37.5890, lng: 127.0580 },
    // 광진구
    { name: "구의동", lat: 37.5430, lng: 127.0870 },
    { name: "자양동", lat: 37.5350, lng: 127.0710 },
    { name: "군자동", lat: 37.5560, lng: 127.0790 },
    { name: "중곡동", lat: 37.5600, lng: 127.0870 },
    // 성동구
    { name: "옥수동", lat: 37.5430, lng: 127.0170 },
    { name: "행당동", lat: 37.5580, lng: 127.0350 },
    { name: "왕십리", lat: 37.5615, lng: 127.0370 },
    { name: "성수동", lat: 37.5445, lng: 127.0560 },
    // 강남구
    { name: "역삼동", lat: 37.5010, lng: 127.0370 },
    { name: "삼성동", lat: 37.5145, lng: 127.0630 },
    { name: "논현동", lat: 37.5115, lng: 127.0280 },
    { name: "청담동", lat: 37.5240, lng: 127.0480 },
    { name: "대치동", lat: 37.4950, lng: 127.0630 },
    { name: "개포동", lat: 37.4830, lng: 127.0510 },
    // 서초구
    { name: "서초동", lat: 37.4940, lng: 127.0070 },
    { name: "방배동", lat: 37.4820, lng: 126.9900 },
    { name: "잠원동", lat: 37.5125, lng: 127.0100 },
    { name: "양재동", lat: 37.4700, lng: 127.0360 },
    // 송파구
    { name: "잠실동", lat: 37.5130, lng: 127.0820 },
    { name: "가락동", lat: 37.4970, lng: 127.1190 },
    { name: "문정동", lat: 37.4860, lng: 127.1230 },
    { name: "방이동", lat: 37.5130, lng: 127.1130 },
    // 강동구
    { name: "천호동", lat: 37.5400, lng: 127.1250 },
    { name: "길동", lat: 37.5320, lng: 127.1380 },
    { name: "명일동", lat: 37.5500, lng: 127.1400 },
    { name: "암사동", lat: 37.5570, lng: 127.1310 },
    // 마포구
    { name: "합정동", lat: 37.5490, lng: 126.9130 },
    { name: "상암동", lat: 37.5780, lng: 126.8890 },
    { name: "연남동", lat: 37.5650, lng: 126.9240 },
    { name: "망원동", lat: 37.5560, lng: 126.9050 },
    // 용산구
    { name: "이태원동", lat: 37.5340, lng: 126.9940 },
    { name: "한남동", lat: 37.5340, lng: 127.0030 },
    { name: "용산동", lat: 37.5310, lng: 126.9710 },
    // 종로구
    { name: "삼청동", lat: 37.5830, lng: 126.9820 },
    { name: "혜화동", lat: 37.5870, lng: 127.0010 },
    { name: "부암동", lat: 37.5930, lng: 126.9650 },
    // 중구
    { name: "충무로", lat: 37.5610, lng: 126.9990 },
    { name: "신당동", lat: 37.5650, lng: 127.0100 },
    // 서대문구
    { name: "신촌동", lat: 37.5600, lng: 126.9370 },
    { name: "연희동", lat: 37.5660, lng: 126.9300 },
    { name: "홍은동", lat: 37.5830, lng: 126.9410 },
    // 은평구
    { name: "응암동", lat: 37.5930, lng: 126.9230 },
    { name: "역촌동", lat: 37.6020, lng: 126.9210 },
    { name: "불광동", lat: 37.6100, lng: 126.9310 },
    { name: "진관동", lat: 37.6380, lng: 126.9200 },
    // 영등포구
    { name: "여의도동", lat: 37.5250, lng: 126.9240 },
    { name: "영등포동", lat: 37.5150, lng: 126.9050 },
    { name: "당산동", lat: 37.5330, lng: 126.9020 },
    // 동작구
    { name: "사당동", lat: 37.4860, lng: 126.9820 },
    { name: "노량진동", lat: 37.5140, lng: 126.9420 },
    { name: "흑석동", lat: 37.5060, lng: 126.9620 },
    // 관악구
    { name: "신림동", lat: 37.4840, lng: 126.9290 },
    { name: "봉천동", lat: 37.4780, lng: 126.9560 },
    // 금천구
    { name: "시흥동", lat: 37.4500, lng: 126.9020 },
    { name: "독산동", lat: 37.4680, lng: 126.8950 },
    // 구로구
    { name: "구로동", lat: 37.4950, lng: 126.8870 },
    { name: "신도림동", lat: 37.5090, lng: 126.8910 },
    // 양천구
    { name: "목동", lat: 37.5240, lng: 126.8750 },
    { name: "신정동", lat: 37.5220, lng: 126.8560 },
    // 강서구
    { name: "화곡동", lat: 37.5390, lng: 126.8390 },
    { name: "등촌동", lat: 37.5520, lng: 126.8610 },
    { name: "마곡동", lat: 37.5610, lng: 126.8310 },
    // 수도권 주요 지역
    { name: "분당", lat: 37.3825, lng: 127.1195 },
    { name: "수원 영통", lat: 37.2636, lng: 127.0286 },
    { name: "일산", lat: 37.6584, lng: 126.7717 },
    { name: "인천 부평", lat: 37.5076, lng: 126.7219 },
    { name: "용인 수지", lat: 37.3219, lng: 127.0980 },
    { name: "하남 미사", lat: 37.5610, lng: 127.2060 },
    { name: "구리", lat: 37.5943, lng: 127.1296 },
    { name: "의정부", lat: 37.7381, lng: 127.0338 },
    { name: "남양주 다산", lat: 37.6100, lng: 127.1500 },
];

/**
 * 좌표에서 가장 가까운 동 이름 N개 반환
 * 구 단위가 아닌 동 단위로 검색해야 정확도가 높음
 */
function getNearbyDongs(lat: number, lng: number, count: number): string[] {
    const withDist = DONG_LIST.map((d) => ({
        name: d.name,
        dist: haversineDistance(lat, lng, d.lat, d.lng),
    }));
    withDist.sort((a, b) => a.dist - b.dist);
    return withDist.slice(0, count).map((d) => d.name);
}

// ---- 통합: 주변 장소 검색 ----

/**
 * GPS 좌표 기반 주변 장소 검색
 * 구 이름이 아닌 동 이름으로 검색하여 정확도 향상
 * 가장 가까운 동 3개로 병렬 검색 → 거리순 정렬
 */
export async function findNearbyPlaces(
    lat: number,
    lng: number,
    keyword: string,
    altKeyword?: string,
): Promise<NearbyPlace[]> {
    // 가까운 동 3개로 병렬 검색 (경계 지역 커버)
    const nearbyDongs = getNearbyDongs(lat, lng, 3);

    // 동 이름 + 키워드 조합으로 검색 쿼리 생성
    // altKeyword가 있으면 가장 가까운 동에 대해 추가 검색
    const searchQueries: string[] = [];
    if (nearbyDongs.length > 0) {
        for (const d of nearbyDongs) {
            searchQueries.push(`${d} ${keyword}`);
        }
        // altKeyword는 가장 가까운 동 1개에만 적용 (API 호출 수 제한)
        if (altKeyword) {
            searchQueries.push(`${nearbyDongs[0]} ${altKeyword}`);
        }
    } else {
        searchQueries.push(keyword);
        if (altKeyword) searchQueries.push(altKeyword);
    }

    const fetchCount = LOCATION.MAX_RESULTS + 3;
    const searchResults = await Promise.all(
        searchQueries.map(q => searchLocal(q, fetchCount))
    );

    // 검색 결과 합치기 (중복 제거: 이름+주소 기준)
    const seen = new Set<string>();
    const items: NaverSearchItem[] = [];
    for (const result of searchResults) {
        for (const item of result) {
            const cleanName = item.title.replace(/<[^>]+>/g, "");
            const key = `${cleanName}|${(item.roadAddress || item.address).trim()}`;
            if (!seen.has(key)) {
                seen.add(key);
                items.push(item);
            }
        }
    }

    if (items.length === 0) return [];

    // 카테고리 기반 필터: 검색 키워드와 무관한 결과 제외
    const EXCLUDED_CATEGORIES = /한식|중식|일식|양식|분식|육류|고기|치킨|피자|패스트푸드|카페|커피|디저트|제과|주점|술집|편의점|마트|세탁|부동산|학원|금융|보험|주차장|주차/;
    const isPlaceCategory = keyword.includes("카페") || keyword.includes("용품");
    const filteredItems = isPlaceCategory
        ? items
        : items.filter((item) => !EXCLUDED_CATEGORIES.test(item.category));
    const searchItems = filteredItems.length > 0 ? filteredItems : items;

    // 거리 계산 + 정렬 (GPS 좌표 기반 실제 거리)
    const radiusKm = LOCATION.SEARCH_RADIUS_KM;
    const allPlaces: NearbyPlace[] = searchItems.map((item) => {
        const name = item.title.replace(/<[^>]+>/g, "");
        const coords = katecToWGS84(item.mapx, item.mapy);
        const distKm = haversineDistance(lat, lng, coords.lat, coords.lng);
        const distMeters = Math.round(distKm * 1000);
        const mapUrl = `https://map.naver.com/v5/search/${encodeURIComponent(name)}`;

        return {
            name,
            category: item.category || keyword,
            distance: formatDistance(distKm),
            distanceMeters: distMeters,
            address: item.roadAddress || item.address,
            mapUrl,
        };
    });

    // 거리순 정렬
    allPlaces.sort((a, b) => a.distanceMeters - b.distanceMeters);

    // 반경 내 결과 우선, 없으면 가장 가까운 것들 반환
    const withinRadius = allPlaces.filter((p) => p.distanceMeters <= radiusKm * 1000);
    const result = withinRadius.length > 0
        ? withinRadius.slice(0, LOCATION.MAX_RESULTS)
        : allPlaces.slice(0, LOCATION.MAX_RESULTS);

    return result;
}

// ---- 여행지 지역명 기반 장소 검색 ----

/**
 * 특정 지역명(강릉, 제주 등)으로 산책/공원 장소를 검색
 * GPS 좌표 없이 지역명 + 키워드로 네이버 검색 API 호출
 * 거리 정보 대신 주소만 표시
 */
export async function findPlacesByLocation(
    locationName: string,
    keyword: string,
    altKeyword?: string,
): Promise<NearbyPlace[]> {
    const searchQueries = [
        `${locationName} ${keyword}`,
        `${locationName} ${altKeyword || "산책로"}`,
    ];

    const fetchCount = LOCATION.MAX_RESULTS + 3;
    const searchResults = await Promise.all(
        searchQueries.map(q => searchLocal(q, fetchCount))
    );

    // 검색 결과 합치기 (중복 제거)
    const seen = new Set<string>();
    const items: NaverSearchItem[] = [];
    for (const result of searchResults) {
        for (const item of result) {
            const cleanName = item.title.replace(/<[^>]+>/g, "");
            const key = `${cleanName}|${(item.roadAddress || item.address).trim()}`;
            if (!seen.has(key)) {
                seen.add(key);
                items.push(item);
            }
        }
    }

    if (items.length === 0) return [];

    // 카테고리 필터: 음식점/카페/주점 등 제외
    const EXCLUDED_CATEGORIES = /한식|중식|일식|양식|분식|육류|고기|치킨|피자|패스트푸드|카페|커피|디저트|제과|주점|술집|편의점|마트|세탁|부동산|학원|금융|보험|주차장|주차/;
    const filteredItems = items.filter((item) => !EXCLUDED_CATEGORIES.test(item.category));
    const searchItems = filteredItems.length > 0 ? filteredItems : items;

    const places: NearbyPlace[] = searchItems.map((item) => {
        const name = item.title.replace(/<[^>]+>/g, "");
        const mapUrl = `https://map.naver.com/v5/search/${encodeURIComponent(name + " " + locationName)}`;

        return {
            name,
            category: item.category || keyword,
            distance: locationName,  // GPS 없으므로 지역명 표시
            distanceMeters: 0,
            address: item.roadAddress || item.address,
            mapUrl,
        };
    });

    return places.slice(0, LOCATION.MAX_RESULTS);
}

