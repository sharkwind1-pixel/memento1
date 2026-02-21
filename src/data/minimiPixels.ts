/**
 * minimiPixels.ts
 * 미니미 캐릭터 카탈로그
 * PNG 이미지 기반 렌더링
 *
 * PNG 이미지는 256x256 캔버스에 트림+리사이즈 처리됨
 * 요크셔는 원본 비율이 가로:세로 2:1이라 다른 캐릭터보다 작게 보임
 */

// ============================================
// 카탈로그 (PNG 이미지 기반)
// ============================================

export const CHARACTER_CATALOG = [
    {
        slug: "maltipoo",
        name: "말티푸",
        category: "dog" as const,
        imageUrl: "/icons/minimi/maltipoo_v2.png?v=2",
        price: 200,
        description: "곱슬곱슬 크림색 말티푸",
    },
    {
        slug: "yorkshire",
        name: "요크셔테리어",
        category: "dog" as const,
        imageUrl: "/icons/minimi/yorkshire_v2.png?v=2",
        price: 200,
        description: "작고 용감한 요크셔테리어",
    },
    {
        slug: "golden_retriever",
        name: "골든리트리버",
        category: "dog" as const,
        imageUrl: "/icons/minimi/golden_v2.png?v=2",
        price: 250,
        description: "밝고 다정한 골든리트리버",
    },
] as const;
