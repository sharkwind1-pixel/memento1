/**
 * AI 펫톡 유틸리티 — 일일 사용량 + 한국어 조사 보정 + 인사말
 * 웹 src/components/features/chat/ + src/lib/agent/helpers.ts 패턴 이식
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { Pet, TimelineEntry } from "@/types";

export const DAILY_FREE_LIMIT = 10;

function todayKey(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `chat_usage_${y}-${m}-${d}`;
}

let cachedUsage: number | null = null;
let cachedKey: string | null = null;

export async function loadDailyUsage(): Promise<number> {
    const key = todayKey();
    if (cachedKey === key && cachedUsage !== null) return cachedUsage;
    try {
        const v = await AsyncStorage.getItem(key);
        const n = v ? Number(v) : 0;
        cachedUsage = Number.isFinite(n) ? n : 0;
        cachedKey = key;
        return cachedUsage;
    } catch {
        cachedUsage = 0;
        cachedKey = key;
        return 0;
    }
}

export async function incrementDailyUsage(): Promise<number> {
    const current = await loadDailyUsage();
    const next = current + 1;
    cachedUsage = next;
    try { await AsyncStorage.setItem(todayKey(), String(next)); } catch {}
    return next;
}

export async function decrementDailyUsage(): Promise<number> {
    const current = await loadDailyUsage();
    const next = Math.max(0, current - 1);
    cachedUsage = next;
    try { await AsyncStorage.setItem(todayKey(), String(next)); } catch {}
    return next;
}

/**
 * 받침 유무 판정. 한글 음절(0xAC00~0xD7A3)이 아니면 false (영어/숫자는 받침 없음 취급).
 */
export function hasJongseong(name: string): boolean {
    if (!name) return false;
    const lastChar = name.charCodeAt(name.length - 1);
    if (lastChar < 0xAC00 || lastChar > 0xD7A3) return false;
    return (lastChar - 0xAC00) % 28 !== 0;
}

/**
 * 받침 유무에 따라 적절한 조사 선택. 작성자가 코드에서 `{name}{josa(name, "을/를")}`
 * 형태로 호출하면 자동으로 "을" 또는 "를" 반환.
 *
 * 사용 예:
 *   `${pet.name}${josa(pet.name, "을/를")} 삭제할까요?`
 *   → "꼼지를 삭제할까요?" / "메리를 삭제할까요?"
 *
 * 지원 페어: 을/를, 이/가, 은/는, 와/과, 으로/로, 이여/여, 이다/다
 */
export function josa(name: string, pair: string): string {
    const [withJong, withoutJong] = pair.split("/");
    if (!withJong || !withoutJong) return pair;
    return hasJongseong(name) ? withJong : withoutJong;
}

/**
 * 한국어 조사 자동 보정. AI가 "{name}이가" 형태로 양쪽 조사를 다 적어서 보내면
 * 받침 유무에 따라 올바른 조사 하나만 남긴다.
 */
export function fixKoreanParticles(text: string, name: string): string {
    if (!name || !text) return text;
    const jong = hasJongseong(name);
    if (!jong && !/[가-힣]$/.test(name)) return text; // 한글 음절 아니면 skip
    const map: [string, string][] = [
        ["이가", jong ? "이" : "가"],
        ["은는", jong ? "은" : "는"],
        ["을를", jong ? "을" : "를"],
        ["와과", jong ? "과" : "와"],
        ["로으로", jong ? "으로" : "로"],
    ];
    return map.reduce(
        (acc, [needle, replacement]) =>
            acc.split(`${name}${needle}`).join(`${name}${replacement}`),
        text,
    );
}

/**
 * 펫/모드/타임라인 기반 개인화 인사말. 웹 generatePersonalizedGreeting 단순 이식.
 */
export function generatePersonalizedGreeting(
    pet: Pet,
    isMemorialMode: boolean,
    timeline: TimelineEntry[] | undefined,
): string {
    const name = pet.name;
    // josa() 사용 — `${name}이...` 하드코딩이 받침 없는 이름(꼼지)에서 "꼼지이랑" 같은 잘못된 조사 만들었음.
    // 추모 톤은 잔잔하되 또렷하게 — 말줄임표("...") 금지(사용자 명시 거부).
    if (isMemorialMode) {
        const memorialGreets = [
            `안녕, 나 ${name}${josa(name, "이야/야")}. 오늘은 어떤 이야기 나눠볼까?`,
            `${name}${josa(name, "은/는")} 너 잊은 적 없어. 많이 보고 싶었어.`,
            `오늘은 ${name}${josa(name, "이랑/랑")} 무슨 얘기 할까?`,
            `와줘서 고마워. 잘 지냈어?`,
        ];
        const recentMood = timeline?.[0]?.mood;
        if (recentMood === "happy") {
            return `${name}${josa(name, "이/가")} 행복했던 그 순간들, 같이 떠올려보자.`;
        }
        const idx = Math.floor(Math.random() * memorialGreets.length);
        return memorialGreets[idx];
    }

    const dailyGreets = [
        `안녕! 나 ${name}${josa(name, "이야/야")}. 오늘은 어떤 이야기 해볼까?`,
        `${name}${josa(name, "이/가")} 왔다! 오늘 뭐 했어?`,
        `반가워! ${name}${josa(name, "은/는")} 너 보고 싶었어.`,
        `${name}${josa(name, "이야/야")}! 오늘 기분 어때?`,
    ];
    const idx = Math.floor(Math.random() * dailyGreets.length);
    return dailyGreets[idx];
}

/**
 * 장소 질문 감지 (위치 기반 추천이 필요한지). 웹 detectPlaceQueryClient 매칭 + 일반 표현 보강.
 *
 * 매칭 우선순위:
 *  1) "병원/공원/펫카페/미용/호텔/용품" 등 명시 키워드 → 해당 카테고리
 *  2) 일반 장소 질문 ("갈만한 곳/갈 데/놀 곳/시설/명소") → keyword="펫동반가능시설" (서버 일반 검색)
 */
const PLACE_PATTERNS: { pattern: RegExp; keyword: string }[] = [
    { pattern: /산책|공원|놀이터|야외|걷기|뛰기|걸을/, keyword: "공원" },
    { pattern: /병원|수의사|진료|응급|건강검진/, keyword: "동물병원" },
    { pattern: /펫카페|애견카페|펫프렌들리/, keyword: "펫카페" },
    { pattern: /미용|그루밍|목욕|트리밍/, keyword: "애견미용" },
    { pattern: /호텔|펫호텔|맡길|돌봄|위탁/, keyword: "펫호텔" },
    { pattern: /용품|사료|간식.*사|쇼핑/, keyword: "애견용품" },
    { pattern: /수영장|수영/, keyword: "애견수영장" },
    { pattern: /운동장|놀이터/, keyword: "애견운동장" },
];

// 일반 장소 질문 (특정 카테고리 없이 "어디 갈만한 곳" 같은 표현)
const GENERIC_PLACE_PATTERN = /갈만한|갈 만한|갈 데|놀 곳|놀 데|놀러|볼 만한|볼만한|시설|명소|데이트|구경/;

const SPECIFIC_LOCATION_PATTERN = /강릉|속초|양양|삼척|동해|제주|부산|대구|광주|대전|울산|세종|춘천|원주|천안|전주|목포|포항|경주|여수|통영|거제|김해|창원|안동|충주|제천|태백|정선|평창|서귀포|송정|해운대|송도|인천공항|김포공항/;

export function detectPlaceQuery(text: string): { detected: boolean; keyword?: string } {
    const questionPattern = /어디|어느|가까운|근처|주변|추천|갈까|가볼|찾아|알려|있어|있을까|있나/;
    if (!questionPattern.test(text)) return { detected: false };
    // 특정 지역명 포함 시 GPS 스킵 (AI가 지역명 기반으로 답변)
    if (SPECIFIC_LOCATION_PATTERN.test(text)) return { detected: false };
    // 1) 명시 키워드 우선
    for (const { pattern, keyword } of PLACE_PATTERNS) {
        if (pattern.test(text)) return { detected: true, keyword };
    }
    // 2) 일반 장소 질문 fallback
    if (GENERIC_PLACE_PATTERN.test(text)) {
        return { detected: true, keyword: "펫동반가능시설" };
    }
    return { detected: false };
}

/**
 * 사용자 위치 수집 — expo-location 사용.
 *
 * OS 시스템 권한 다이얼로그는 OS 언어 따름(영어 폰=영어). 우리 앱이 직접 한글로
 * 보여주려면 시스템 다이얼로그 직전에 in-app Alert를 띄워야 함.
 *
 * 흐름:
 *  1) 권한 상태 확인
 *  2) 미결정이면 한글 Alert로 "왜 필요한지" 안내 → 확인 → 시스템 권한 요청
 *  3) 거부 시 한글 Alert로 "설정에서 켜는 법" 안내 후 null
 *  4) 허용 시 5초 타임아웃 좌표 수집
 */

import { Alert, Linking } from "react-native";

function showRationaleAndAsk(): Promise<boolean> {
    return new Promise((resolve) => {
        Alert.alert(
            "위치 권한 안내",
            "근처 산책로·동물병원·펫카페를 찾으려면 현재 위치가 필요해요.\n다음 화면에서 '허용'을 눌러주세요.",
            [
                { text: "다음에", style: "cancel", onPress: () => resolve(false) },
                { text: "확인", onPress: () => resolve(true) },
            ],
            { cancelable: false },
        );
    });
}

function showSettingsGuide(): void {
    Alert.alert(
        "위치 권한이 꺼져있어요",
        "설정 → 메멘토애니 → 권한 → 위치 에서 '허용'으로 바꿔주세요.",
        [
            { text: "닫기", style: "cancel" },
            { text: "설정 열기", onPress: () => Linking.openSettings().catch(() => {}) },
        ],
    );
}

export async function getUserLocation(): Promise<{ lat: number; lng: number } | null> {
    try {
        // 1) 현재 권한 상태
        let { status } = await Location.getForegroundPermissionsAsync();

        // 2) 미결정이면 한글 안내 후 시스템 다이얼로그
        if (status === Location.PermissionStatus.UNDETERMINED) {
            const accepted = await showRationaleAndAsk();
            if (!accepted) return null;
            const req = await Location.requestForegroundPermissionsAsync();
            status = req.status;
        }

        // 3) 거부 상태면 설정 안내 후 null
        if (status !== Location.PermissionStatus.GRANTED) {
            if (status === Location.PermissionStatus.DENIED) {
                showSettingsGuide();
            }
            return null;
        }

        // 4) 좌표 수집 (5초 타임아웃, 저정확도로 빠르게)
        const positionPromise = Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
        });
        const timeoutPromise = new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), 5000),
        );
        const result = await Promise.race([positionPromise, timeoutPromise]);
        if (!result) return null;
        return {
            lat: result.coords.latitude,
            lng: result.coords.longitude,
        };
    } catch {
        return null;
    }
}
