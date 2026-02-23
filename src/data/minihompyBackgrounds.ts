/**
 * minihompyBackgrounds.ts
 * 미니홈피 배경 테마 카탈로그
 * - CSS gradient 기본 8종 + 픽셀아트 이미지 8종 = 총 16종
 * - imageUrl이 있으면 이미지 배경, 없으면 CSS gradient
 */

import type { BackgroundTheme } from "@/types";

export const BACKGROUND_CATALOG: BackgroundTheme[] = [
    {
        id: "bg_default",
        slug: "default_sky",
        name: "맑은 하늘",
        category: "sky",
        price: 0,
        description: "기본 배경 - 맑은 하늘과 푸른 들판",
        cssBackground: "linear-gradient(180deg, #87CEEB 0%, #E0F7FF 40%, #A8E6CF 75%, #228B22 100%)",
    },
    {
        id: "bg_sunset",
        slug: "sunset_beach",
        name: "노을 해변",
        category: "nature",
        price: 150,
        description: "따뜻한 석양이 물드는 바닷가",
        cssBackground: "linear-gradient(180deg, #FF6B6B 0%, #FFA07A 25%, #FFD700 50%, #FFF8DC 65%, #DEB887 80%, #C2B280 100%)",
    },
    {
        id: "bg_cherry",
        slug: "cherry_blossom",
        name: "벚꽃",
        category: "season",
        price: 200,
        description: "연분홍 벚꽃이 흩날리는 봄날",
        cssBackground: "linear-gradient(180deg, #FFB7C5 0%, #FFC0CB 30%, #FFE4E1 60%, #FAFAD2 80%, #90EE90 100%)",
    },
    {
        id: "bg_starry",
        slug: "starry_night",
        name: "밤하늘",
        category: "sky",
        price: 200,
        description: "별이 쏟아지는 고요한 밤",
        cssBackground: "linear-gradient(180deg, #0C0E2B 0%, #1B1F4B 30%, #2C3E7A 60%, #4A5D8B 80%, #2D4A3E 100%)",
    },
    {
        id: "bg_cloud",
        slug: "cloud_kingdom",
        name: "구름 왕국",
        category: "sky",
        price: 150,
        description: "폭신폭신한 구름 위의 세상",
        cssBackground: "linear-gradient(180deg, #87CEEB 0%, #B0E2FF 30%, #FFFFFF 50%, #E8F4FD 70%, #F0F8FF 100%)",
    },
    {
        id: "bg_meadow",
        slug: "meadow",
        name: "초원",
        category: "nature",
        price: 150,
        description: "끝없이 펼쳐진 푸른 초원",
        cssBackground: "linear-gradient(180deg, #87CEEB 0%, #B0E2FF 25%, #98FB98 55%, #3CB371 75%, #228B22 100%)",
    },
    {
        id: "bg_rainbow",
        slug: "rainbow_bridge",
        name: "무지개다리",
        category: "special",
        price: 300,
        description: "따뜻한 빛으로 이어지는 무지개다리",
        cssBackground: "linear-gradient(180deg, #FFF8DC 0%, #FFE4B5 20%, #FFD700 35%, #FF8C00 50%, #FF6347 60%, #DA70D6 70%, #9370DB 80%, #87CEEB 90%, #F5F5DC 100%)",
    },
    {
        id: "bg_winter",
        slug: "winter_snow",
        name: "겨울 눈밭",
        category: "season",
        price: 200,
        description: "하얀 눈이 소복이 쌓인 겨울 풍경",
        cssBackground: "linear-gradient(180deg, #B0C4DE 0%, #D6E6F2 30%, #F0F8FF 55%, #FFFAFA 75%, #FFFFFF 100%)",
    },
    // ============================================
    // 픽셀아트 이미지 배경 (8종)
    // ============================================
    {
        id: "bg_cherry_hangang",
        slug: "cherry_hangang",
        name: "벚꽃 한강공원",
        category: "season",
        price: 300,
        description: "돗자리 깔고 벚꽃 구경하는 한강",
        cssBackground: "linear-gradient(180deg, #87CEEB 0%, #FFB7C5 30%, #90EE90 70%, #228B22 100%)",
        imageUrl: "/icons/stages/cherry_hangang.jpg",
    },
    {
        id: "bg_cherry_garden",
        slug: "cherry_garden",
        name: "벚꽃 정원",
        category: "season",
        price: 300,
        description: "등불과 빨간 다리가 있는 벚꽃 정원",
        cssBackground: "linear-gradient(180deg, #FFB7C5 0%, #FFC0CB 30%, #90EE90 70%, #228B22 100%)",
        imageUrl: "/icons/stages/cherry_garden.jpg",
    },
    {
        id: "bg_summer_beach",
        slug: "summer_beach",
        name: "여름 해변",
        category: "nature",
        price: 300,
        description: "야자수와 파도가 있는 열대 해변",
        cssBackground: "linear-gradient(180deg, #87CEEB 0%, #00CED1 40%, #F4D03F 70%, #DEB887 100%)",
        imageUrl: "/icons/stages/summer_beach.jpg",
    },
    {
        id: "bg_cozy_garden",
        slug: "cozy_garden",
        name: "아늑한 마당",
        category: "nature",
        price: 250,
        description: "개집, 텃밭, 해먹이 있는 포근한 마당",
        cssBackground: "linear-gradient(180deg, #87CEEB 0%, #228B22 40%, #8B7355 70%, #90EE90 100%)",
        imageUrl: "/icons/stages/cozy_garden.jpg",
    },
    {
        id: "bg_mystic_pond",
        slug: "mystic_pond",
        name: "신비로운 연못",
        category: "special",
        price: 350,
        description: "반딧불과 빛나는 버섯이 있는 마법의 연못",
        cssBackground: "linear-gradient(180deg, #1a1a3e 0%, #2d1b69 30%, #4a2d8e 60%, #1a3a2a 100%)",
        imageUrl: "/icons/stages/mystic_pond.jpg",
    },
    {
        id: "bg_rooftop_glamping",
        slug: "rooftop_glamping",
        name: "옥상 글램핑",
        category: "special",
        price: 350,
        description: "노을 지는 옥상에서 캠핑하는 밤",
        cssBackground: "linear-gradient(180deg, #4a3070 0%, #FF6347 30%, #FF8C00 50%, #8B4513 80%, #2F1B14 100%)",
        imageUrl: "/icons/stages/rooftop_glamping.jpg",
    },
    {
        id: "bg_sunset_cliff",
        slug: "sunset_cliff",
        name: "해넘이 절벽",
        category: "nature",
        price: 300,
        description: "소나무 사이로 보이는 장엄한 해넘이",
        cssBackground: "linear-gradient(180deg, #87CEEB 0%, #FF6B6B 25%, #FF8C00 50%, #4682B4 75%, #2F4F4F 100%)",
        imageUrl: "/icons/stages/sunset_cliff.jpg",
    },
    {
        id: "bg_starfall_hill",
        slug: "starfall_hill",
        name: "별똥별 언덕",
        category: "special",
        price: 350,
        description: "캠프파이어 옆에서 별똥별을 바라보는 밤",
        cssBackground: "linear-gradient(180deg, #1a1a3e 0%, #2d1b69 30%, #3a5a3a 60%, #228B22 100%)",
        imageUrl: "/icons/stages/starfall_hill.jpg",
    },
];

/** slug으로 배경 테마 찾기 */
export function findBackground(slug: string): BackgroundTheme | undefined {
    return BACKGROUND_CATALOG.find((bg) => bg.slug === slug);
}

/** 기본 배경 */
export function getDefaultBackground(): BackgroundTheme {
    return BACKGROUND_CATALOG[0];
}
