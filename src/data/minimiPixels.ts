/**
 * minimiPixels.ts
 * 미니미 캐릭터 카탈로그
 * PNG 이미지 기반 렌더링
 *
 * footPadding: 이미지 하단 투명 영역 비율 (PIL getbbox 기준 실측값)
 * imageAspect: 원본 가로/세로 비율 (object-contain 그림자 보정용)
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
        imageAspect: 1,
        footPadding: 0.047,
    },
    {
        slug: "yorkshire",
        name: "요크셔테리어",
        category: "dog" as const,
        imageUrl: "/icons/minimi/yorkshire_v2.png?v=5",
        price: 200,
        description: "작고 용감한 요크셔테리어",
        imageAspect: 1,
        footPadding: 0.023,
    },
    {
        slug: "golden_retriever",
        name: "골든리트리버",
        category: "dog" as const,
        imageUrl: "/icons/minimi/golden_v2.png?v=2",
        price: 200,
        description: "밝고 다정한 골든리트리버",
        imageAspect: 1,
        footPadding: 0.023,
    },
    {
        slug: "russian_blue",
        name: "러시안블루",
        category: "cat" as const,
        imageUrl: "/icons/minimi/russian_blue.png?v=3",
        price: 200,
        description: "영롱한 초록 눈의 러시안블루",
        imageAspect: 1,
        footPadding: 0.023,
    },
    {
        slug: "ragdoll",
        name: "랙돌",
        category: "cat" as const,
        imageUrl: "/icons/minimi/ragdoll.png?v=3",
        price: 200,
        description: "파란 눈의 우아한 랙돌",
        imageAspect: 1,
        footPadding: 0.023,
    },
    {
        slug: "cheese_cat",
        name: "치즈냥이",
        category: "cat" as const,
        imageUrl: "/icons/minimi/cheese_cat.png?v=3",
        price: 200,
        description: "따뜻한 주황빛 치즈 고양이",
        imageAspect: 1,
        footPadding: 0.023,
    },
] as const;
