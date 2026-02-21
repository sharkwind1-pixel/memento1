/**
 * minimiPixels.ts
 * 미니미 캐릭터 카탈로그
 * PNG 이미지 기반 렌더링
 */

// ============================================
// 카탈로그 (PNG 이미지 기반)
// ============================================

export const CHARACTER_CATALOG = [
    {
        slug: "maltipoo",
        name: "말티푸",
        category: "dog" as const,
        imageUrl: "/icons/minimi/maltipoo.png",
        price: 200,
        description: "곱슬곱슬 크림색 말티푸",
    },
    {
        slug: "yorkshire",
        name: "요크셔테리어",
        category: "dog" as const,
        imageUrl: "/icons/minimi/yorkshire.png",
        price: 200,
        description: "작고 용감한 요크셔테리어",
    },
    {
        slug: "golden_retriever",
        name: "골든리트리버",
        category: "dog" as const,
        imageUrl: "/icons/minimi/golden.png",
        price: 250,
        description: "밝고 다정한 골든리트리버",
    },
] as const;
