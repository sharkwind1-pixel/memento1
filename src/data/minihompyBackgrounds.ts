/**
 * minihompyBackgrounds.ts
 * 미니홈피 배경 테마 카탈로그
 * - CSS gradient/pattern으로 표현 (이미지 파일 없음)
 * - 무료 기본 1종 + 유료 7종 = 총 8종
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
];

/** slug으로 배경 테마 찾기 */
export function findBackground(slug: string): BackgroundTheme | undefined {
    return BACKGROUND_CATALOG.find((bg) => bg.slug === slug);
}

/** 기본 배경 */
export function getDefaultBackground(): BackgroundTheme {
    return BACKGROUND_CATALOG[0];
}
