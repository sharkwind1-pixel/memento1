/**
 * minihompyBackgrounds.ts
 * 미니홈피 배경 테마 카탈로그
 * - 픽셀아트 이미지 배경 8종, 200포인트 통일
 * - imageUrl이 있으면 이미지 배경, 없으면 CSS gradient
 */

import type { BackgroundTheme } from "@/types";

export const BACKGROUND_CATALOG: BackgroundTheme[] = [
    // ============================================
    // 기본 배경 (무료)
    // ============================================
    {
        id: "bg_default_sky",
        slug: "default_sky",
        name: "기본 배경",
        category: "nature",
        price: 0,
        description: "",
        cssBackground: "linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)",
    },
    // ============================================
    // 픽셀아트 이미지 배경 (8종, 200포인트 통일)
    // ============================================
    {
        id: "bg_cherry_hangang",
        slug: "cherry_hangang",
        name: "벚꽃 한강공원",
        category: "season",
        price: 200,
        description: "돗자리 깔고 벚꽃 구경하는 한강",
        cssBackground: "linear-gradient(180deg, #87CEEB 0%, #FFB7C5 30%, #90EE90 70%, #228B22 100%)",
        imageUrl: "/icons/stages/cherry_hangang.jpg",
    },
    {
        id: "bg_cherry_garden",
        slug: "cherry_garden",
        name: "벚꽃 정원",
        category: "season",
        price: 200,
        description: "등불과 빨간 다리가 있는 벚꽃 정원",
        cssBackground: "linear-gradient(180deg, #FFB7C5 0%, #FFC0CB 30%, #90EE90 70%, #228B22 100%)",
        imageUrl: "/icons/stages/cherry_garden.jpg",
    },
    {
        id: "bg_summer_beach",
        slug: "summer_beach",
        name: "여름 해변",
        category: "nature",
        price: 200,
        description: "야자수와 파도가 있는 열대 해변",
        cssBackground: "linear-gradient(180deg, #87CEEB 0%, #00CED1 40%, #F4D03F 70%, #DEB887 100%)",
        imageUrl: "/icons/stages/summer_beach.jpg",
    },
    {
        id: "bg_cozy_garden",
        slug: "cozy_garden",
        name: "아늑한 마당",
        category: "nature",
        price: 200,
        description: "개집, 텃밭, 해먹이 있는 포근한 마당",
        cssBackground: "linear-gradient(180deg, #87CEEB 0%, #228B22 40%, #8B7355 70%, #90EE90 100%)",
        imageUrl: "/icons/stages/cozy_garden.jpg",
    },
    {
        id: "bg_mystic_pond",
        slug: "mystic_pond",
        name: "신비로운 연못",
        category: "special",
        price: 200,
        description: "반딧불과 빛나는 버섯이 있는 마법의 연못",
        cssBackground: "linear-gradient(180deg, #1a1a3e 0%, #2d1b69 30%, #4a2d8e 60%, #1a3a2a 100%)",
        imageUrl: "/icons/stages/mystic_pond.jpg",
    },
    {
        id: "bg_rooftop_glamping",
        slug: "rooftop_glamping",
        name: "옥상 글램핑",
        category: "special",
        price: 200,
        description: "노을 지는 옥상에서 캠핑하는 밤",
        cssBackground: "linear-gradient(180deg, #4a3070 0%, #FF6347 30%, #FF8C00 50%, #8B4513 80%, #2F1B14 100%)",
        imageUrl: "/icons/stages/rooftop_glamping.jpg",
    },
    {
        id: "bg_sunset_cliff",
        slug: "sunset_cliff",
        name: "해넘이 절벽",
        category: "nature",
        price: 200,
        description: "소나무 사이로 보이는 장엄한 해넘이",
        cssBackground: "linear-gradient(180deg, #87CEEB 0%, #FF6B6B 25%, #FF8C00 50%, #4682B4 75%, #2F4F4F 100%)",
        imageUrl: "/icons/stages/sunset_cliff.jpg",
    },
    {
        id: "bg_starfall_hill",
        slug: "starfall_hill",
        name: "별똥별 언덕",
        category: "special",
        price: 200,
        description: "캠프파이어 옆에서 별똥별을 바라보는 밤",
        cssBackground: "linear-gradient(180deg, #1a1a3e 0%, #2d1b69 30%, #3a5a3a 60%, #228B22 100%)",
        imageUrl: "/icons/stages/starfall_hill.jpg",
    },
];

/** slug으로 배경 테마 찾기 (삭제된 배경 slug이면 첫 번째 배경 폴백) */
export function findBackground(slug: string): BackgroundTheme | undefined {
    return BACKGROUND_CATALOG.find((bg) => bg.slug === slug);
}

/** 기본 배경 (첫 번째 카탈로그 항목) */
export function getDefaultBackground(): BackgroundTheme {
    return BACKGROUND_CATALOG[0];
}

/** 배경 조회 + 폴백 (삭제된 배경이면 기본 배경 반환) */
export function findBackgroundOrDefault(slug: string): BackgroundTheme {
    return findBackground(slug) || getDefaultBackground();
}
