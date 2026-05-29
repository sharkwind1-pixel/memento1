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
    // 예시 구조 (이미지 준비되면 활성화):
    // {
    //     slug: "pet_bed_basic",
    //     name: "기본 방석",
    //     category: "furniture",
    //     imageUrl: "/icons/furniture/pet_bed_basic.png",
    //     price: 150,
    //     description: "포근한 반려동물 방석",
    //     stageWidth: 70,
    //     stageHeight: 50,
    // },
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
