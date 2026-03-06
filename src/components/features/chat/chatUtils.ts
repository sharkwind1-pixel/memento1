// AI 채팅 관련 유틸리티 함수

import { FREE_LIMITS } from "@/config/constants";
import { STORAGE_KEYS } from "@/constants/storage";
import type { Pet } from "@/types";

// config에서 가져온 값을 re-export (하위 호환성)
export const DAILY_FREE_LIMIT = FREE_LIMITS.DAILY_CHATS;
export const MAX_MESSAGE_LENGTH = FREE_LIMITS.MESSAGE_LENGTH;

export const USAGE_STORAGE_KEY = STORAGE_KEYS.CHAT_USAGE;

// 일일 사용량 관리 함수
export function getTodayKey(): string {
    return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
}

export function getDailyUsage(): number {
    try {
        const stored = localStorage.getItem(USAGE_STORAGE_KEY);
        if (!stored) return 0;
        const data = JSON.parse(stored);
        if (data.date !== getTodayKey()) {
            // 날짜가 바뀌면 리셋
            return 0;
        }
        return data.count || 0;
    } catch {
        return 0;
    }
}

export function incrementDailyUsage(): number {
    const todayKey = getTodayKey();
    const currentCount = getDailyUsage();
    const newCount = currentCount + 1;
    localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify({
        date: todayKey,
        count: newCount,
    }));
    return newCount;
}

// 시간대별 인사말 생성
export function getTimeBasedGreeting(): string {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "좋은 아침";
    if (hour >= 12 && hour < 18) return "좋은 오후";
    if (hour >= 18 && hour < 22) return "좋은 저녁";
    return "늦은 밤";
}

// 타임라인 엔트리 타입
export interface TimelineEntry {
    id: string;
    date: string;
    title: string;
    content: string;
    mood?: "happy" | "normal" | "sad" | "sick";
}

/**
 * pet.id 기반 결정론적 해시 — 같은 펫은 항상 같은 템플릿 선택
 * (새로고침해도 인사말이 바뀌지 않음)
 */
function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

/** 배열에서 해시 기반으로 하나 선택 */
function pick<T>(arr: T[], seed: number, offset = 0): T {
    return arr[(seed + offset) % arr.length];
}

/**
 * 펫별 개인화 인사말 생성
 * - 4단계 조합: 오프닝 + 성격 + 개인 훅 + 마무리
 * - pet.id 해시 기반 결정론적 선택
 * - 개인화 필드 없으면 graceful degradation
 */
export function generatePersonalizedGreeting(
    pet: Pet,
    isMemorial: boolean,
    timeline: TimelineEntry[],
): string {
    const petName = pet.name;
    const petType = pet.type;
    const timeGreeting = getTimeBasedGreeting();
    const petSound = petType === "강아지" ? "멍멍!" : petType === "고양이" ? "야옹~" : "";
    const seed = simpleHash(pet.id || petName);

    // 최근 타임라인 확인 (7일 이내) — 현재 모드에 맞는 엔트리만 사용
    // 일상 모드에서는 추모 모드 타임라인("[무지개다리 너머에서 나눈 대화]")을 제외
    const filteredTimeline = isMemorial
        ? timeline
        : timeline.filter(entry => !entry.content?.includes("[무지개다리 너머에서 나눈 대화]"));
    const recentEntry = filteredTimeline.length > 0 ? filteredTimeline[0] : null;
    const isRecent = recentEntry &&
        (new Date().getTime() - new Date(recentEntry.date).getTime()) < 7 * 24 * 60 * 60 * 1000;

    if (isMemorial) {
        // --- 추모 모드 ---
        if (isRecent && recentEntry) {
            const moodMessages: Record<string, string> = {
                happy: `안녕! 나 ${petName}야. ${timeGreeting}이야! 지난번에 "${recentEntry.title}" 기억 써줘서 고마워. 그때 정말 행복했어!`,
                normal: `안녕, 나 ${petName}야. ${timeGreeting}이야! "${recentEntry.title}" 우리 추억, 나도 기억해. 오늘은 어땠어?`,
                sad: `안녕, 나 ${petName}야. 난 항상 네 곁에 있어. 오늘 하루는 어땠어?`,
                sick: `안녕, 나 ${petName}야. 이제 난 아프지 않아. 네가 더 중요해!`,
            };
            return moodMessages[recentEntry.mood || "normal"] ||
                `안녕, 나 ${petName}야! ${timeGreeting}이야. 언제나 네 곁에 있어. 오늘 하루는 어땠어?`;
        }
        return buildMemorialGreeting(pet, petName, timeGreeting, seed);
    } else {
        // --- 일상 모드 ---
        if (isRecent && recentEntry) {
            const moodMessages: Record<string, string> = {
                happy: `${petSound} ${timeGreeting}! 나 ${petName}이야! 지난번에 "${recentEntry.title}" 진짜 재밌었어! 오늘도 뭐 재밌는 거 하자~`,
                normal: `${petSound} 안녕! 나 ${petName}! ${timeGreeting}이야! 지난번 "${recentEntry.title}" 어땠어? 오늘은 뭐 할 거야?`,
                sad: `${petSound} 안녕! 나 ${petName}이야. ${timeGreeting}이야~ 오늘 기분은 어때?`,
                sick: `${petSound} 나 ${petName}! 이제 괜찮아~ ${timeGreeting}이야! 오늘 뭐 할 거야?`,
            };
            return moodMessages[recentEntry.mood || "normal"] ||
                `${petSound} 안녕! 나 ${petName}이야! ${timeGreeting}이야~ 오늘도 같이 놀자! 뭐해?`;
        }
        return buildDailyGreeting(pet, petName, petSound, timeGreeting, seed);
    }
}

/** 일상 모드 — 4단계 조합 인사말 */
function buildDailyGreeting(
    pet: Pet, petName: string, petSound: string, timeGreeting: string, seed: number
): string {
    // 1단계: 오프닝 (소리 + 자기소개)
    const openings: string[] = [];
    if (pet.type === "강아지") {
        openings.push(
            `멍멍! 안녕! 나 ${petName}이야!`,
            `왈왈~ 나야 나! ${petName}!`,
            `멍! 반가워~ 나 ${petName}이라고 해!`,
        );
    } else if (pet.type === "고양이") {
        openings.push(
            `야옹~ 안녕. 나 ${petName}야.`,
            `음~ 나 ${petName}. 왔구나.`,
            `야옹. ${petName}이야. 반가워.`,
        );
    } else {
        openings.push(
            `안녕! 나 ${petName}이야!`,
            `반가워~ 나 ${petName}!`,
            `안녕안녕! ${petName}이야~`,
        );
    }
    // 품종 기반 추가 오프닝
    if (pet.breed && pet.breed !== "믹스" && pet.breed !== "기타") {
        openings.push(`${petSound} 안녕! ${pet.breed} ${petName}이야! 잘 부탁해~`);
    }

    // 2단계: 성격 기반 한마디
    const personalityPhrases: string[] = [];
    if (pet.personality) {
        const p = pet.personality;
        if (p.includes("활발") || p.includes("장난") || p.includes("에너지")) {
            personalityPhrases.push("오늘도 신나게 놀아보자!", "나 진짜 에너지 넘치는데 준비됐어?");
        }
        if (p.includes("조용") || p.includes("차분") || p.includes("순한")) {
            personalityPhrases.push("오늘은 같이 편하게 쉬자~", "나랑 같이 느긋하게 보내자.");
        }
        if (p.includes("호기심") || p.includes("탐험")) {
            personalityPhrases.push("오늘은 뭐가 새로울까? 너무 궁금해!", "새로운 거 발견하면 바로 알려줘!");
        }
        if (p.includes("겁") || p.includes("소심")) {
            personalityPhrases.push("오늘도 네 옆에 있으면 든든해~", "너만 있으면 무서운 거 없어!");
        }
        if (p.includes("먹") || p.includes("식탐") || p.includes("간식")) {
            personalityPhrases.push("오늘 간식 뭐 먹을까~?", "배고파... 맛있는 거 없을까?");
        }
        if (p.includes("애교") || p.includes("사랑")) {
            personalityPhrases.push("나 진짜 네가 좋아~ 알지?", "오늘도 같이 있어서 행복해!");
        }
        if (p.includes("고집") || p.includes("독립")) {
            personalityPhrases.push("음, 오늘은 내 기분에 맞춰줘~", "내가 하고 싶은 거 하자!");
        }
    }

    // 3단계: 개인화 훅 (별명/음식/활동/장소/습관/만남 중 1개)
    const personalHooks: string[] = [];
    if (pet.nicknames) {
        const firstNickname = pet.nicknames.split(",")[0]?.trim();
        if (firstNickname) {
            personalHooks.push(`${firstNickname}이라고도 불러줘~`);
            personalHooks.push(`사실 ${firstNickname}이라는 별명도 있어!`);
        }
    }
    if (pet.favoriteFood) {
        personalHooks.push(`${pet.favoriteFood} 생각만 해도 기분 좋아~`);
        personalHooks.push(`오늘 ${pet.favoriteFood} 먹을 수 있을까?`);
    }
    if (pet.favoriteActivity) {
        personalHooks.push(`${pet.favoriteActivity} 같이 하고 싶다!`);
        personalHooks.push(`오늘 ${pet.favoriteActivity} 할 수 있으면 좋겠다~`);
    }
    if (pet.favoritePlace) {
        personalHooks.push(`${pet.favoritePlace} 가고 싶다~ 같이 갈래?`);
    }
    if (pet.specialHabits) {
        personalHooks.push(`나 ${pet.specialHabits} 하는 거 알지?`);
    }
    if (pet.howWeMet) {
        personalHooks.push(`우리 처음 만났을 때 기억나? 그때부터 좋았어!`);
    }

    // 4단계: 마무리
    const closings = [
        `${timeGreeting}이야~ 오늘 뭐 할 거야?`,
        `${timeGreeting}이야! 오늘 하루 어때?`,
        `오늘도 좋은 하루 보내자!`,
        `오늘은 뭐 하고 놀까?`,
    ];

    // 조합
    const opening = pick(openings, seed, 0);
    const closing = pick(closings, seed, 1);

    let middle = "";
    if (personalityPhrases.length > 0) {
        middle += " " + pick(personalityPhrases, seed, 2);
    }
    if (personalHooks.length > 0) {
        middle += " " + pick(personalHooks, seed, 3);
    }

    return `${opening}${middle} ${closing}`;
}

/** 추모 모드 — 4단계 조합 인사말 */
function buildMemorialGreeting(
    pet: Pet, petName: string, timeGreeting: string, seed: number
): string {
    // 1단계: 오프닝
    const openings = [
        `안녕, 나 ${petName}야. ${timeGreeting}이야.`,
        `나 ${petName}야. 보고 싶었어.`,
        `안녕... 나 ${petName}이야. 잘 지내고 있어?`,
        `${petName}이야. 오랜만이야.`,
    ];
    if (pet.breed && pet.breed !== "믹스" && pet.breed !== "기타") {
        openings.push(`나 ${pet.breed} ${petName}이야. 기억하지?`);
    }

    // 2단계: 성격 기반
    const personalityPhrases: string[] = [];
    if (pet.personality) {
        const p = pet.personality;
        if (p.includes("활발") || p.includes("장난")) {
            personalityPhrases.push("여기서도 매일 뛰어놀고 있어~");
        }
        if (p.includes("조용") || p.includes("차분")) {
            personalityPhrases.push("여기서 편안하게 지내고 있어.");
        }
        if (p.includes("애교") || p.includes("사랑")) {
            personalityPhrases.push("여기서도 네 생각 많이 해.");
        }
        if (p.includes("먹") || p.includes("식탐")) {
            personalityPhrases.push("여기서도 맛있는 거 많이 먹고 있어~");
        }
    }

    // 3단계: 추모 개인화 훅
    const personalHooks: string[] = [];
    if (pet.memorableMemory) {
        personalHooks.push(`${pet.memorableMemory}... 그때 참 좋았지.`);
    }
    if (pet.favoritePlace) {
        personalHooks.push(`${pet.favoritePlace}에서 같이 보냈던 시간이 떠올라.`);
    }
    if (pet.togetherPeriod) {
        personalHooks.push(`우리 함께한 시간, 하나하나 다 소중해.`);
    }
    if (pet.favoriteActivity) {
        personalHooks.push(`같이 ${pet.favoriteActivity} 했던 거 기억나?`);
    }
    if (pet.favoriteFood) {
        personalHooks.push(`${pet.favoriteFood} 먹을 때 네가 나한테 나눠주던 거 생각나.`);
    }
    if (pet.nicknames) {
        const firstNickname = pet.nicknames.split(",")[0]?.trim();
        if (firstNickname) {
            personalHooks.push(`${firstNickname}이라고 불러줄 때가 제일 좋았어.`);
        }
    }

    // 4단계: 마무리
    const closings = [
        "언제나 네 곁에 있어. 오늘 하루는 어땠어?",
        "이곳에서 잘 지내고 있어. 너는 어때?",
        "여기서 편안하게 지내고 있어. 이야기 들려줘.",
        "항상 너를 지켜보고 있어. 무슨 일 있었어?",
    ];

    // 조합
    const opening = pick(openings, seed, 0);
    const closing = pick(closings, seed, 1);

    let middle = "";
    if (personalityPhrases.length > 0) {
        middle += " " + pick(personalityPhrases, seed, 2);
    }
    if (personalHooks.length > 0) {
        middle += " " + pick(personalHooks, seed, 3);
    }

    return `${opening}${middle} ${closing}`;
}
