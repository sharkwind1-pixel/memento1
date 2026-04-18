/**
 * magazine-generator.ts
 * AI 매거진 기사 자동 생성 모듈
 *
 * GPT-4o-mini로 반려동물 관련 매거진 기사를 생성하고,
 * Unsplash에서 썸네일 이미지를 가져온다.
 * 카테고리/배지 로테이션으로 편중 방지.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type OpenAI from "openai";
import { MAGAZINE_AUTO, AI_CONFIG } from "@/config/constants";
import { type PetSpecies, SPECIES_CONTEXT, isExoticSpecies } from "@/lib/species-context";

/**
 * 매거진의 ANIMAL_TYPES.id → species-context.ts의 PetSpecies 매핑
 * 매거진은 자체 ANIMAL_TYPES을 쓰지만, 콘텐츠 생성 시에는 공통 SPECIES_CONTEXT를 사용한다.
 */
const ANIMAL_ID_TO_SPECIES: Record<string, PetSpecies> = {
    dog: "강아지",
    cat: "고양이",
    parrot: "앵무새",
    turtle: "거북이",
    gecko: "게코",
    hamster: "햄스터",
    rabbit: "토끼",
    fish: "물고기",
    hedgehog: "고슴도치",
    ferret: "페럿",
    // 종 평등: 아래 8종은 이전에 매거진 자동 생성에서 빠져있었음
    guineapig: "기니피그",
    chinchilla: "친칠라",
    java_sparrow: "문조",
    canary: "카나리아",
    iguana: "이구아나",
    lizard: "도마뱀",
    shrimp: "새우",
};

// ===== 상수 =====

const CATEGORIES = ["health", "food", "behavior", "grooming", "living", "travel"] as const;
const BADGES = ["beginner", "companion", "senior"] as const;

// ===== 동물 종 로테이션 (70% 개/고양이, 30% 기타) =====

const ANIMAL_TYPES = {
    /** 70% 확률로 선택되는 주요 동물 */
    major: [
        { id: "dog", name: "강아지", searchKeyword: "dog puppy" },
        { id: "cat", name: "고양이", searchKeyword: "cat kitten" },
    ],
    /**
     * 30% 확률로 선택되는 기타 동물 (종 평등: 15종 커버)
     * 매거진 자동 생성 로테이션에서 특정 종만 편중되지 않도록 모든 엑조틱 포함
     */
    minor: [
        { id: "parrot", name: "앵무새", searchKeyword: "pet parrot bird" },
        { id: "java_sparrow", name: "문조", searchKeyword: "java sparrow finch" },
        { id: "canary", name: "카나리아", searchKeyword: "canary bird pet" },
        { id: "turtle", name: "거북이", searchKeyword: "pet turtle tortoise" },
        { id: "gecko", name: "겍코/파충류", searchKeyword: "pet gecko reptile" },
        { id: "lizard", name: "도마뱀", searchKeyword: "pet lizard bearded dragon" },
        { id: "iguana", name: "이구아나", searchKeyword: "green iguana pet" },
        { id: "hamster", name: "햄스터", searchKeyword: "pet hamster" },
        { id: "guineapig", name: "기니피그", searchKeyword: "guinea pig cavy pet" },
        { id: "rabbit", name: "토끼", searchKeyword: "pet rabbit bunny" },
        { id: "chinchilla", name: "친칠라", searchKeyword: "pet chinchilla" },
        { id: "fish", name: "관상어", searchKeyword: "aquarium tropical fish" },
        { id: "shrimp", name: "관상새우", searchKeyword: "cherry shrimp aquarium" },
        { id: "hedgehog", name: "고슴도치", searchKeyword: "pet hedgehog" },
        { id: "ferret", name: "페릿", searchKeyword: "pet ferret" },
    ],
} as const;

type AnimalInfo = { id: string; name: string; searchKeyword: string };

const CATEGORY_NAMES: Record<string, string> = {
    health: "건강/의료",
    food: "사료/영양",
    behavior: "행동/훈련",
    grooming: "미용/위생",
    living: "생활/용품",
    travel: "여행/외출",
};

const BADGE_CONTEXTS: Record<string, string> = {
    beginner: "처음 반려동물을 키우기 시작한 초보 보호자를 위한 기초 가이드",
    companion: "반려동물과 함께 성장하고 있는 보호자를 위한 일상 케어 정보",
    senior: "오래된 반려동물(시니어)을 돌보는 보호자를 위한 심화 케어 정보",
};

/** Unsplash 카테고리별 검색 키워드 */
const CATEGORY_IMAGE_KEYWORDS: Record<string, string[]> = {
    health: ["pet health care", "veterinary pet", "healthy puppy"],
    food: ["pet food bowl", "dog eating", "cat food nutrition"],
    behavior: ["dog training", "puppy playing", "cat behavior"],
    grooming: ["pet grooming", "dog bath", "cat grooming salon"],
    living: ["cozy pet home", "pet accessories", "dog bed home"],
    travel: ["pet travel outdoor", "dog adventure", "pet car travel"],
};

/** 실질적 고민 주제 풀 (계절 무관, 보호자가 실제로 검색하는 주제) */
const PRACTICAL_TOPICS: Record<string, string[]> = {
    health: [
        "예방접종 스케줄과 필수 접종 가이드",
        "구토/설사 시 응급 대처법",
        "슬개골 탈구 초기 증상과 관리",
        "피부병/알러지 원인과 해결법",
        "중성화 수술 시기와 장단점",
        "노령 동물 건강 검진 체크리스트",
        "귀 염증(외이염) 예방과 치료",
        "치석 제거와 구강 관리",
        "비만 관리와 적정 체중 유지",
        "심장사상충 예방의 모든 것",
    ],
    food: [
        "사료 성분표 읽는 법 (초보 가이드)",
        "수제 간식 만들기와 주의사항",
        "절대 먹이면 안 되는 음식 TOP 10",
        "연령별 사료 전환 시기와 방법",
        "알러지 사료 선택 가이드",
        "습식 vs 건식 사료 장단점",
        "급여량 계산하는 정확한 방법",
        "영양 보충제가 필요한 경우",
        "물 섭취량과 건강의 관계",
        "다이어트 사료 올바르게 먹이는 법",
    ],
    behavior: [
        "배변 훈련 완벽 가이드 (실패 원인까지)",
        "분리불안 증상과 단계별 교정법",
        "산책 중 리드줄 당기는 습관 교정",
        "과도한 짖음 원인별 해결법",
        "입질/물기 행동 교정 방법",
        "사회화 훈련 골든 타임과 방법",
        "다견/다묘 가정 합사 가이드",
        "공격성 원인 분석과 대처법",
        "기본 명령어(앉아/기다려/이리와) 교육법",
        "스트레스 신호 읽는 법",
    ],
    grooming: [
        "집에서 목욕 시키는 올바른 방법",
        "발톱 깎기 두려움 극복 가이드",
        "귀 청소 주기와 올바른 방법",
        "털 엉킴 방지와 브러싱 방법",
        "양치질 훈련 시작하기",
        "눈물자국 원인과 관리법",
        "발바닥 패드 케어 방법",
        "환절기 털갈이 관리",
        "피부 트러블 시 목욕 주의사항",
        "미용 주기와 미용사에게 말해야 할 것들",
    ],
    living: [
        "반려동물 보험 비교와 선택 가이드",
        "처음 입양할 때 필수 준비물 체크리스트",
        "안전한 집 만들기 (위험 요소 제거)",
        "여름 냉방/겨울 난방 적정 온도",
        "홀로 집에 두는 시간 관리",
        "다른 동물과의 첫 만남 주의사항",
        "이사할 때 스트레스 줄이는 법",
        "장난감 선택 가이드 (안전한 소재)",
        "반려동물 등록과 의무 사항",
        "비용 현실: 월별 양육비 분석",
    ],
    travel: [
        "반려동물 동반 카페/식당 에티켓",
        "차량 이동 시 멀미 예방법",
        "비행기 탑승 가이드 (국내선/국제선)",
        "펜션/호텔 선택 시 체크리스트",
        "산책 코스 난이도별 추천 방법",
        "여름 산책 시 발바닥 화상 예방",
        "장거리 이동 준비물 리스트",
        "반려동물 놀이공원/공원 매너",
        "캠핑 시 주의사항과 준비물",
        "해외여행 시 검역 절차 안내",
    ],
};

/** Unsplash 폴백 이미지 (API 실패 시) */
const FALLBACK_IMAGES: Record<string, string> = {
    health: "https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=800&q=80",
    food: "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=800&q=80",
    behavior: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=80",
    grooming: "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=800&q=80",
    living: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&q=80",
    travel: "https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?w=800&q=80",
};

// ===== 타입 =====

export interface GeneratedArticle {
    title: string;
    summary: string;
    content: string;
    tags: string[];
    readTime: string;
}

export interface GenerationResult {
    success: boolean;
    category?: string;
    badge?: string;
    title?: string;
    error?: string;
}

// ===== 카테고리/배지/동물 종 로테이션 =====

/**
 * 다음 기사의 동물 종을 결정한다.
 * - 70% 확률: 개/고양이 (major)
 * - 30% 확률: 앵무새/거북이/겍코/햄스터/토끼/관상어/고슴도치/페릿 (minor)
 * - 최근 10편에서 가장 적게 나온 종을 우선 선택하여 다양성 확보
 */
export function pickAnimalType(recentAnimalIds: string[]): AnimalInfo {
    const roll = Math.random();
    const isMajor = roll < 0.7;

    const pool = isMajor ? [...ANIMAL_TYPES.major] : [...ANIMAL_TYPES.minor];

    // 최근 기사에서 가장 적게 등장한 동물 우선
    const counts = new Map<string, number>();
    pool.forEach((a) => counts.set(a.id, 0));
    recentAnimalIds.forEach((id) => {
        if (counts.has(id)) counts.set(id, (counts.get(id) || 0) + 1);
    });

    const sorted = pool.sort((a, b) => (counts.get(a.id) || 0) - (counts.get(b.id) || 0));
    const minCount = counts.get(sorted[0].id) || 0;
    const candidates = sorted.filter((a) => (counts.get(a.id) || 0) === minCount);

    return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * 최근 기사 분석 후 다음에 쓸 카테고리, 배지, 동물 종을 결정한다.
 * - 카테고리: 최근 6편에서 가장 적게 다룬 카테고리 우선
 * - 배지: 마지막 배지의 다음 순서 (순환)
 * - 동물 종: 70% 개/고양이, 30% 기타 동물 (로테이션)
 */
export async function getNextCategoryAndBadge(
    supabase: SupabaseClient
): Promise<{ category: string; badge: string; animalType: AnimalInfo }> {
    const { data: recent } = await supabase
        .from("magazine_articles")
        .select("category, badge, tags")
        .eq("author", MAGAZINE_AUTO.AUTHOR_NAME)
        .order("created_at", { ascending: false })
        .limit(10);

    // 카테고리 분포 → 가장 적은 것 선택
    const categoryCounts = new Map<string, number>();
    CATEGORIES.forEach((c) => categoryCounts.set(c, 0));
    recent?.forEach((a) => {
        const cur = categoryCounts.get(a.category) || 0;
        categoryCounts.set(a.category, cur + 1);
    });

    const sorted = Array.from(categoryCounts.entries()).sort((a, b) => a[1] - b[1]);
    // 동일 빈도면 랜덤 선택
    const minCount = sorted[0][1];
    const candidates = sorted.filter(([, count]) => count === minCount);
    const category = candidates[Math.floor(Math.random() * candidates.length)][0];

    // 배지 순환 (기존 기사가 없으면 beginner부터 시작 — 초보 보호자 시리즈 우선)
    const recentBadges = recent?.map((a) => a.badge).filter(Boolean) || [];
    let badge: string;
    if (recentBadges.length === 0) {
        badge = "beginner"; // 첫 시작은 초보 보호자 시리즈
    } else {
        const lastBadge = recentBadges[0] || "senior";
        const badgeIndex = BADGES.indexOf(lastBadge as typeof BADGES[number]);
        badge = BADGES[(badgeIndex + 1) % BADGES.length];
    }

    // 동물 종 로테이션: tags에서 동물 종 ID 추출
    const allAnimalIds: string[] = [...ANIMAL_TYPES.major, ...ANIMAL_TYPES.minor].map((a) => a.id);
    const recentAnimalIds: string[] = (recent || [])
        .flatMap((a) => (a.tags as string[]) || [])
        .filter((tag: string) => allAnimalIds.includes(tag));
    const animalType = pickAnimalType(recentAnimalIds);

    return { category, badge, animalType };
}

// ===== 중복 방지 =====

/** 최근 20편 제목을 가져와 AI 프롬프트에 넘겨서 중복 주제를 피하게 한다 */
export async function getRecentTitles(supabase: SupabaseClient): Promise<string[]> {
    const { data } = await supabase
        .from("magazine_articles")
        .select("title")
        .order("created_at", { ascending: false })
        .limit(20);

    return data?.map((a) => a.title) || [];
}

// ===== AI 프롬프트 =====

export function buildArticlePrompt(
    category: string,
    badge: string,
    recentTitles: string[],
    animalType?: AnimalInfo
): string {
    // 중복 방지 강화: 제목뿐 아니라 서론·소제목·CTA 패턴까지 회피 지시
    const avoidClause =
        recentTitles.length > 0
            ? `\n\n## 중복 방지 (매우 중요)
다음 기존 기사와 **제목·주제·서론·소제목·CTA 모두** 겹치지 않도록 완전히 다른 앵글로 작성하세요:
${recentTitles.map((t) => `- ${t}`).join("\n")}

구체 회피 지시:
- 서론을 "많은 반려인들은 ~" / "반려동물은 우리의 ~" 같은 전형 오프닝으로 시작하지 마세요.
- "슬픔을 부정하지 말고 받아들이기", "감정 정리를 위한 활동" 같은 반복되는 소제목 표현 금지.
- 마무리 CTA는 매번 같은 문구가 되지 않도록 글 주제에 맞춰 자연스럽게 변주하세요 (메멘토애니 언급 1회는 유지).
- 첫 문장을 "-입니다" / "-됩니다"로 끝내는 평서문 대신 이 글만의 구체적 상황/질문/사례로 시작하세요.
- 구체적 수치·최신 연구·한국 현실 데이터를 1개 이상 포함해 범용 글이 아닌 "이 주제만의" 글을 만드세요.`
            : "";

    // 계절 전환기(3월, 6월, 9월, 12월)에만 계절 힌트 제공
    // 그 외 달에는 계절 언급 없음 → 실질적 주제에 집중
    const month = new Date().getMonth() + 1;
    const SEASON_TRANSITION: Record<number, string> = {
        3: "봄이 다가오는 시기",
        6: "여름이 다가오는 시기",
        9: "가을이 다가오는 시기",
        12: "겨울이 다가오는 시기",
    };
    const seasonHint = SEASON_TRANSITION[month] || "";

    // 동물 종 컨텍스트
    const animalName = animalType?.name || "강아지/고양이";
    const isMajorAnimal = ANIMAL_TYPES.major.some((a) => a.id === animalType?.id);

    // species-context.ts의 SPECIES_CONTEXT 주입 (블로그/AI펫톡과 일관성)
    const species: PetSpecies = animalType?.id
        ? (ANIMAL_ID_TO_SPECIES[animalType.id] || "공통")
        : "공통";
    const speciesContextBlock = SPECIES_CONTEXT[species] || "";
    const isExotic = isExoticSpecies(species);

    // 실질적 고민 주제 풀에서 랜덤 3개 추천
    const topicPool = PRACTICAL_TOPICS[category] || [];
    const shuffled = [...topicPool].sort(() => Math.random() - 0.5);
    const suggestedTopics = shuffled.slice(0, 3);

    const topicSuggestionClause = suggestedTopics.length > 0
        ? `\n\n## 추천 주제 (이 중에서 선택하거나 비슷한 실질적 고민 주제를 다루세요)\n${suggestedTopics.map((t) => `- ${t}`).join("\n")}\n위 주제는 예시입니다. 보호자가 실제로 자주 검색하고 고민하는 실용적 주제를 다루세요. 계절/날씨 이야기만으로 채우지 마세요.`
        : "";

    // 종별 핵심 컨텍스트 (한국에서 잘못 알려진 정보 교정 + 분류학적 특성)
    const speciesContextClause = speciesContextBlock
        ? `\n\n## 종별 핵심 사실 (반드시 본문에 반영)\n${speciesContextBlock}`
        : "";

    // 기타 동물이면 해당 동물 전문 기사 요청 + 엑조틱 작성 지침
    const animalSpecificGuide = isMajorAnimal
        ? `- 대상 동물: ${animalName} (가장 보편적인 반려동물 케어 정보)`
        : `- 대상 동물: **${animalName}** (이 동물 종에 특화된 전문 정보를 다루세요)
- 중요: 개/고양이가 아닌 **${animalName}** 전용 기사입니다. ${animalName}의 특성, 사육 환경, 먹이, 건강 관리 등 해당 종에 맞는 구체적 정보를 작성하세요.
- ${animalName} 보호자가 실제로 궁금해하는 실용 정보에 집중하세요.${isExotic ? `
- 한국에서 잘못 알려진 정보를 정확히 교정하세요 (예: "예전에는 ~라고 알려졌지만, 최신 연구는 ~")
- 일반 동물병원이 아닌 "엑조틱 전문 동물병원"이 필요한 경우 명시
- 분류학적 특성(야행성/주행성, 사회성/단독성, 변온/항온)을 자연스럽게 녹이세요
- "강아지/고양이만 반려동물"이라는 뉘앙스 절대 금지` : ""}`;

    return `당신은 반려동물 전문 매거진 에디터입니다.
다음 조건으로 한국어 매거진 기사를 작성하세요.

## 조건
- 주제 분야: ${CATEGORY_NAMES[category] || category}
- 대상 독자: ${BADGE_CONTEXTS[badge] || badge}
${animalSpecificGuide}${seasonHint ? `\n- 계절 참고: ${seasonHint}이므로, 계절 전환과 관련된 주제를 다뤄도 좋습니다 (예: 환절기 건강 관리, 온도 변화 대비). 단, 계절 이야기만으로 채우지 말고 실용 정보 중심으로 작성하세요.` : `\n- 계절/날씨 관련 기사는 쓰지 마세요. "○○철 주의사항", "○○철 건강관리" 같은 계절 반복 주제 금지.`}
- 주제 선택 원칙: **보호자가 실제로 고민하는 실용적 주제**를 다루세요. 배변 훈련, 사료 선택, 건강 이상 징후, 행동 교정, 사육 환경 등 구체적이고 실질적인 정보를 담으세요.
- 톤: 밝고 따뜻하며 전문적. 친근하지만 신뢰감 있는 문체.
- 언어: 한국어만 사용
- 이모지/이모티콘 사용 금지
- 죽음/사망 직접 언급 금지. 필요하면 "무지개다리"로 완곡하게 표현
- 수의학적 정보는 정확하게 작성하되, 가정에서 실천할 수 있는 실용적 팁 위주
- 특정 상품 브랜드 언급 금지 (제품 유형으로만 추천)
- "~입니다", "~합니다" 체로 작성
${speciesContextClause}${topicSuggestionClause}

## 출력 형식 (반드시 이 JSON 구조로)
{
  "title": "기사 제목 (25~35자, 호기심을 유발하되 낚시성이 아닌 스타일)",
  "summary": "기사 요약 (60~100자, 핵심 메시지를 담은 한 문장)",
  "content": "HTML 본문. 5~7개 카드로 구성하며, 각 카드는 <hr> 태그로 구분. 각 카드는 하나의 완결된 소주제를 담는다. 첫 카드는 도입부, 마지막 카드는 마무리. 사용 가능 태그: <h2>, <h3>, <p>, <ul>, <li>, <strong>. 각 카드 분량: 150~250자. 전체 1200~1800자.",
  "tags": ["${animalType?.id || "dog"}", "태그2", "태그3", "태그4"],
  "readTime": "N분"
}

주의: tags 배열의 첫 번째 항목은 반드시 "${animalType?.id || "dog"}"(동물 종 ID)로 고정하세요.

## 본문 구성 가이드 (카드뉴스 형식)
이 기사는 인스타그램 카드뉴스처럼 한 장씩 스와이프하며 읽습니다.
각 카드(챕터)를 반드시 <hr> 태그로 구분하세요.

카드 구성 (5~7장):
1장: 도입 - 공감 가는 상황 묘사. <h2> 없이 <p>만 사용 (1~2문장)
2장: 첫 번째 소주제 - <h2>로 소제목 시작, <p>와 <ul>로 핵심 정보 (2~3개 블록)
3장: 두 번째 소주제 - <h2>로 소제목 시작, 실용적 팁 위주 (2~3개 블록)
4장: 세 번째 소주제 - <h2>로 소제목 시작, 구체적 예시나 방법 (2~3개 블록)
5~6장: (선택) 추가 소주제, 체크리스트, 주의사항
마지막 장: 따뜻한 마무리 메시지 (<p>만 사용, <h2> 없이)

중요: 각 카드 사이에 반드시 <hr> 태그를 넣으세요. <hr> 없이 이어쓰면 안 됩니다.
각 카드는 스마트폰 화면 한 장에 표시되므로 150~250자가 적당합니다.${avoidClause}`;
}

// ===== GPT-4o-mini 호출 =====

export async function generateArticle(
    openai: OpenAI,
    category: string,
    badge: string,
    recentTitles: string[],
    animalType?: AnimalInfo
): Promise<GeneratedArticle> {
    const prompt = buildArticlePrompt(category, badge, recentTitles, animalType);

    const completion = await openai.chat.completions.create({
        model: AI_CONFIG.AI_MODEL,
        temperature: 0.85,
        max_tokens: 2500,
        response_format: { type: "json_object" },
        messages: [
            {
                role: "system",
                content: "당신은 반려동물 전문 매거진 에디터입니다. 요청받은 JSON 형식으로만 응답하세요.",
            },
            { role: "user", content: prompt },
        ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
        throw new Error("AI 응답이 비어있습니다");
    }

    const parsed = JSON.parse(raw) as GeneratedArticle;

    // 기본 유효성 검사
    if (!parsed.title || !parsed.summary || !parsed.content) {
        throw new Error("AI 응답에 필수 필드(title, summary, content)가 없습니다");
    }

    // tags가 배열이 아니면 빈 배열로
    if (!Array.isArray(parsed.tags)) {
        parsed.tags = [];
    }

    // readTime 기본값
    if (!parsed.readTime) {
        parsed.readTime = "5분";
    }

    return parsed;
}

// ===== Unsplash 이미지 =====

export async function fetchUnsplashImage(category: string, animalType?: AnimalInfo): Promise<string> {
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
        // API 키 없으면 폴백 이미지
        return FALLBACK_IMAGES[category] || FALLBACK_IMAGES.health;
    }

    try {
        // 기타 동물이면 동물 종 키워드 우선 사용
        let keyword: string;
        if (animalType && !ANIMAL_TYPES.major.some((a) => a.id === animalType.id)) {
            keyword = animalType.searchKeyword;
        } else {
            const keywords = CATEGORY_IMAGE_KEYWORDS[category] || ["cute pet"];
            keyword = keywords[Math.floor(Math.random() * keywords.length)];
        }

        const res = await fetch(
            `https://api.unsplash.com/photos/random?query=${encodeURIComponent(keyword)}&orientation=landscape`,
            {
                headers: { Authorization: `Client-ID ${accessKey}` },
                signal: AbortSignal.timeout(5000),
            }
        );

        if (!res.ok) {
            return FALLBACK_IMAGES[category] || FALLBACK_IMAGES.health;
        }

        const data = await res.json();
        // 중간 해상도 (regular ~1080px) 사용
        return data.urls?.regular || data.urls?.small || FALLBACK_IMAGES[category] || FALLBACK_IMAGES.health;
    } catch {
        return FALLBACK_IMAGES[category] || FALLBACK_IMAGES.health;
    }
}
