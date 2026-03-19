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

// ===== 상수 =====

const CATEGORIES = ["health", "food", "behavior", "grooming", "living", "travel"] as const;
const BADGES = ["beginner", "companion", "senior"] as const;

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

// ===== 카테고리/배지 로테이션 =====

/**
 * 최근 기사 분석 후 다음에 쓸 카테고리와 배지를 결정한다.
 * - 카테고리: 최근 6편에서 가장 적게 다룬 카테고리 우선
 * - 배지: 마지막 배지의 다음 순서 (순환)
 */
export async function getNextCategoryAndBadge(
    supabase: SupabaseClient
): Promise<{ category: string; badge: string }> {
    const { data: recent } = await supabase
        .from("magazine_articles")
        .select("category, badge")
        .eq("author", MAGAZINE_AUTO.AUTHOR_NAME)
        .order("created_at", { ascending: false })
        .limit(6);

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

    return { category, badge };
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
    recentTitles: string[]
): string {
    const avoidClause =
        recentTitles.length > 0
            ? `\n\n## 중복 방지\n다음 기존 기사와 겹치지 않는 완전히 새로운 주제를 선택하세요:\n${recentTitles.map((t) => `- ${t}`).join("\n")}`
            : "";

    // 현재 월로 계절 힌트
    const month = new Date().getMonth() + 1;
    let seasonHint = "";
    if (month >= 3 && month <= 5) seasonHint = "봄철";
    else if (month >= 6 && month <= 8) seasonHint = "여름철";
    else if (month >= 9 && month <= 11) seasonHint = "가을철";
    else seasonHint = "겨울철";

    return `당신은 반려동물 전문 매거진 에디터입니다.
다음 조건으로 한국어 매거진 기사를 작성하세요.

## 조건
- 주제 분야: ${CATEGORY_NAMES[category] || category}
- 대상 독자: ${BADGE_CONTEXTS[badge] || badge}
- 현재 계절: ${seasonHint} (시의성 있는 주제를 다루세요)
- 톤: 밝고 따뜻하며 전문적. 친근하지만 신뢰감 있는 문체.
- 언어: 한국어만 사용
- 이모지/이모티콘 사용 금지
- 죽음/사망 직접 언급 금지. 필요하면 "무지개다리"로 완곡하게 표현
- 수의학적 정보는 정확하게 작성하되, 가정에서 실천할 수 있는 실용적 팁 위주
- 특정 상품 브랜드 언급 금지 (제품 유형으로만 추천)
- "~입니다", "~합니다" 체로 작성

## 출력 형식 (반드시 이 JSON 구조로)
{
  "title": "기사 제목 (25~35자, 호기심을 유발하되 낚시성이 아닌 스타일)",
  "summary": "기사 요약 (60~100자, 핵심 메시지를 담은 한 문장)",
  "content": "HTML 본문. 5~7개 카드로 구성하며, 각 카드는 <hr> 태그로 구분. 각 카드는 하나의 완결된 소주제를 담는다. 첫 카드는 도입부, 마지막 카드는 마무리. 사용 가능 태그: <h2>, <h3>, <p>, <ul>, <li>, <strong>. 각 카드 분량: 150~250자. 전체 1200~1800자.",
  "tags": ["태그1", "태그2", "태그3", "태그4"],
  "readTime": "N분"
}

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
    recentTitles: string[]
): Promise<GeneratedArticle> {
    const prompt = buildArticlePrompt(category, badge, recentTitles);

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

export async function fetchUnsplashImage(category: string): Promise<string> {
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
        // API 키 없으면 폴백 이미지
        return FALLBACK_IMAGES[category] || FALLBACK_IMAGES.health;
    }

    try {
        const keywords = CATEGORY_IMAGE_KEYWORDS[category] || ["cute pet"];
        const keyword = keywords[Math.floor(Math.random() * keywords.length)];

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
