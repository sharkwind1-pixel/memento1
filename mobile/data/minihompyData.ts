/**
 * 미니홈피 데이터 — 웹 src/data/minimiPixels.ts + minihompyBackgrounds.ts 이식.
 * 이미지 URL은 절대 URL(API_BASE_URL/icons/...)로 변환해서 사용한다 (웹 정적 파일 재사용).
 */

import { API_BASE_URL } from "@/config/constants";
import type { MinimiCharacter, BackgroundTheme } from "@/types";

function abs(path: string): string {
    if (/^https?:\/\//i.test(path)) return path;
    return `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

// ============================================================================
// 미니미 카탈로그 (6종)
// ============================================================================

export const MINIMI_CATALOG: MinimiCharacter[] = [
    { slug: "maltipoo",         name: "말티푸",         category: "dog", imageUrl: abs("/icons/minimi/maltipoo_v2.png?v=11"),    price: 200, description: "곱슬곱슬 크림색 말티푸",       imageAspect: 1, footPadding: 0.02 },
    { slug: "yorkshire",        name: "요크셔테리어",   category: "dog", imageUrl: abs("/icons/minimi/yorkshire_v2.png?v=11"),   price: 200, description: "작고 용감한 요크셔테리어",     imageAspect: 1, footPadding: 0.02 },
    { slug: "golden_retriever", name: "골든리트리버",   category: "dog", imageUrl: abs("/icons/minimi/golden_v2.png?v=11"),      price: 200, description: "밝고 다정한 골든리트리버",     imageAspect: 1, footPadding: 0.02 },
    { slug: "russian_blue",     name: "러시안블루",     category: "cat", imageUrl: abs("/icons/minimi/russian_blue.png?v=11"),   price: 200, description: "영롱한 초록 눈의 러시안블루",   imageAspect: 1, footPadding: 0.02 },
    { slug: "ragdoll",          name: "랙돌",           category: "cat", imageUrl: abs("/icons/minimi/ragdoll.png?v=11"),        price: 200, description: "파란 눈의 우아한 랙돌",         imageAspect: 1, footPadding: 0.02 },
    { slug: "cheese_cat",       name: "치즈냥이",       category: "cat", imageUrl: abs("/icons/minimi/cheese_cat.png?v=11"),     price: 200, description: "따뜻한 주황빛 치즈 고양이",     imageAspect: 1, footPadding: 0.02 },
    { slug: "pomeranian",       name: "포메라니안",     category: "dog", imageUrl: abs("/icons/minimi/pomeranian.png?v=12"),     price: 200, description: "뽀송뽀송 솜사탕 포메라니안",     imageAspect: 1, footPadding: 0.02 },
    { slug: "bichon",           name: "비숑프리제",     category: "dog", imageUrl: abs("/icons/minimi/bichon.png?v=11"),         price: 200, description: "하얀 솜뭉치 비숑프리제",         imageAspect: 1, footPadding: 0.02 },
    { slug: "corgi",            name: "웰시코기",       category: "dog", imageUrl: abs("/icons/minimi/corgi.png?v=11"),          price: 200, description: "짧은 다리 엉덩이 요정 코기",     imageAspect: 1, footPadding: 0.02 },
    { slug: "shiba",            name: "시바견",         category: "dog", imageUrl: abs("/icons/minimi/shiba.png?v=11"),          price: 200, description: "도도한 표정의 시바견",           imageAspect: 1, footPadding: 0.02 },
];

export function findMinimi(slug: string): MinimiCharacter | undefined {
    return MINIMI_CATALOG.find((c) => c.slug === slug);
}

// ============================================================================
// 배경 카탈로그 (1 무료 + 8 유료)
// ============================================================================

export const BACKGROUND_CATALOG: BackgroundTheme[] = [
    { id: "bg_default_sky",      slug: "default_sky",      name: "기본 배경",      category: "nature",  price: 0,   description: "",                                                cssBackground: "#F8FAFC" },
    { id: "bg_cherry_hangang",   slug: "cherry_hangang",   name: "벚꽃 한강공원",  category: "season",  price: 200, description: "돗자리 깔고 벚꽃 구경하는 한강",                  cssBackground: "#FFB7C5", imageUrl: abs("/icons/stages/cherry_hangang.jpg") },
    { id: "bg_cherry_garden",    slug: "cherry_garden",    name: "벚꽃 정원",      category: "season",  price: 200, description: "등불과 빨간 다리가 있는 벚꽃 정원",               cssBackground: "#FFC0CB", imageUrl: abs("/icons/stages/cherry_garden.jpg") },
    { id: "bg_summer_beach",     slug: "summer_beach",     name: "여름 해변",      category: "nature",  price: 200, description: "야자수와 파도가 있는 열대 해변",                  cssBackground: "#00CED1", imageUrl: abs("/icons/stages/summer_beach.jpg") },
    { id: "bg_cozy_garden",      slug: "cozy_garden",      name: "아늑한 마당",    category: "nature",  price: 200, description: "개집, 텃밭, 해먹이 있는 포근한 마당",             cssBackground: "#90EE90", imageUrl: abs("/icons/stages/cozy_garden.jpg") },
    { id: "bg_mystic_pond",      slug: "mystic_pond",      name: "신비로운 연못",  category: "special", price: 200, description: "반딧불과 빛나는 버섯이 있는 마법의 연못",         cssBackground: "#2D1B69", imageUrl: abs("/icons/stages/mystic_pond.jpg") },
    { id: "bg_rooftop_glamping", slug: "rooftop_glamping", name: "옥상 글램핑",    category: "special", price: 200, description: "노을 지는 옥상에서 캠핑하는 밤",                  cssBackground: "#FF6347", imageUrl: abs("/icons/stages/rooftop_glamping.jpg") },
    { id: "bg_sunset_cliff",     slug: "sunset_cliff",     name: "해넘이 절벽",    category: "nature",  price: 200, description: "소나무 사이로 보이는 장엄한 해넘이",              cssBackground: "#FF8C00", imageUrl: abs("/icons/stages/sunset_cliff.jpg") },
    { id: "bg_starfall_hill",    slug: "starfall_hill",    name: "별똥별 언덕",    category: "special", price: 200, description: "캠프파이어 옆에서 별똥별을 바라보는 밤",          cssBackground: "#1A1A3E", imageUrl: abs("/icons/stages/starfall_hill.jpg") },
];

export function findBackground(slug: string): BackgroundTheme | undefined {
    return BACKGROUND_CATALOG.find((bg) => bg.slug === slug);
}

export function findBackgroundOrDefault(slug: string): BackgroundTheme {
    return findBackground(slug) || BACKGROUND_CATALOG[0];
}
