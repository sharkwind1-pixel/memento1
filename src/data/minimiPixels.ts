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
        scale: 1,
    },
    {
        slug: "yorkshire",
        name: "요크셔테리어",
        category: "dog" as const,
        imageUrl: "/icons/minimi/yorkshire_v2.png?v=2",
        price: 200,
        description: "작고 용감한 요크셔테리어",
        scale: 1.6,
    },
    {
        slug: "golden_retriever",
        name: "골든리트리버",
        category: "dog" as const,
        imageUrl: "/icons/minimi/golden_v2.png?v=2",
        price: 200,
        description: "밝고 다정한 골든리트리버",
        scale: 1,
    },
] as const;

/**
 * slug로 캐릭터의 scale 값 조회
 * 캐릭터마다 원본 이미지 크기가 달라 보이므로 scale로 보정
 */
export function getMinimiScale(slug: string): number {
    const character = CHARACTER_CATALOG.find(c => c.slug === slug);
    return character?.scale ?? 1;
}
