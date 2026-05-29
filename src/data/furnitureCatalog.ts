/**
 * furnitureCatalog.ts
 * 미니홈피 가구/소품 카탈로그
 * 아이템 이미지가 추가되면 여기에 엔트리 추가
 */

import type { FurnitureItem, FurnitureCategory } from "@/types";

// ============================================
// 카탈로그 (이미지 추가 시 여기에 등록)
// ============================================

export const FURNITURE_CATALOG: FurnitureItem[] = [
    // -- 소품 (accessory) --
    {
        slug: "pet_bowl",
        name: "밥그릇 세트",
        category: "accessory",
        imageUrl: "/icons/furniture/pet_bowl.png",
        price: 60,
        description: "귀여운 밥그릇과 물그릇 세트",
        stageWidth: 50,
        stageHeight: 40,
    },
    // -- 가구 (furniture) --
    {
        slug: "pet_bed_round",
        name: "동글 방석",
        category: "furniture",
        imageUrl: "/icons/furniture/pet_bed_round.png",
        price: 120,
        description: "포근한 도넛 모양 방석",
        stageWidth: 70,
        stageHeight: 55,
    },
    {
        slug: "pet_cushion_flat",
        name: "납작 쿠션",
        category: "furniture",
        imageUrl: "/icons/furniture/pet_cushion_flat.png",
        price: 100,
        description: "넓적한 사각 쿠션",
        stageWidth: 65,
        stageHeight: 45,
    },
    {
        slug: "cat_tower",
        name: "캣타워",
        category: "furniture",
        imageUrl: "/icons/furniture/cat_tower.png",
        price: 180,
        description: "높이 올라갈 수 있는 캣타워",
        stageWidth: 55,
        stageHeight: 80,
    },
    {
        slug: "dog_house",
        name: "강아지집",
        category: "furniture",
        imageUrl: "/icons/furniture/dog_house.png",
        price: 150,
        description: "아늑한 강아지 하우스",
        stageWidth: 75,
        stageHeight: 65,
    },
];

/** 카테고리 한글 라벨 */
export const FURNITURE_CATEGORY_LABELS: Record<FurnitureCategory, string> = {
    wallpaper: "벽지",
    flooring: "바닥재",
    window: "창문/문",
    furniture: "가구",
    accessory: "소품",
};

/** 카테고리별 가격 가이드 */
export const FURNITURE_PRICE_RANGES: Record<FurnitureCategory, { min: number; max: number }> = {
    wallpaper: { min: 50, max: 100 },
    flooring: { min: 50, max: 100 },
    window: { min: 80, max: 150 },
    furniture: { min: 100, max: 200 },
    accessory: { min: 50, max: 80 },
};

export function findFurniture(slug: string): FurnitureItem | undefined {
    return FURNITURE_CATALOG.find((f) => f.slug === slug);
}

export function findFurnitureOrFallback(slug: string): FurnitureItem {
    return findFurniture(slug) ?? {
        slug,
        name: slug.replace(/_/g, " "),
        category: "accessory",
        imageUrl: `/icons/furniture/${slug}.png`,
        price: 100,
        description: "",
    };
}
