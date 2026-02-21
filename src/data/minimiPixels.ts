/**
 * minimiPixels.ts
 * 미니미 캐릭터 카탈로그
 * PNG 이미지 기반 렌더링
 *
 * displayScale: 각 캐릭터 PNG 내 도트 점유율이 다르므로
 * 렌더링 시 크기를 보정하는 배율 (1.0 = 기본)
 * - 말티푸: PNG 내 90% 차지 → 0.55로 축소
 * - 요크셔: PNG 내 45% 차지 → 1.0 기본
 * - 골든:   PNG 내 55% 차지 → 1.0 기본
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
        displayScale: 0.55,
        price: 200,
        description: "곱슬곱슬 크림색 말티푸",
    },
    {
        slug: "yorkshire",
        name: "요크셔테리어",
        category: "dog" as const,
        imageUrl: "/icons/minimi/yorkshire.png",
        displayScale: 1.0,
        price: 200,
        description: "작고 용감한 요크셔테리어",
    },
    {
        slug: "golden_retriever",
        name: "골든리트리버",
        category: "dog" as const,
        imageUrl: "/icons/minimi/golden.png",
        displayScale: 1.0,
        price: 250,
        description: "밝고 다정한 골든리트리버",
    },
] as const;
