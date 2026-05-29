/**
 * furnitureCatalog.ts (mobile)
 * 미니홈피 가구/소품 카탈로그
 * 웹 src/data/furnitureCatalog.ts 이식. 이미지 URL은 절대 경로.
 */

import { API_BASE_URL } from "@/config/constants";
import type { FurnitureItem, FurnitureCategory } from "@/types";

function abs(path: string): string {
    if (/^https?:\/\//i.test(path)) return path;
    return `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

// ============================================
// 카탈로그 (이미지 추가 시 여기에 등록)
// ============================================

export const FURNITURE_CATALOG: FurnitureItem[] = [
    // 이미지 준비되면 여기에 추가
];

/** 카테고리 한글 라벨 */
export const FURNITURE_CATEGORY_LABELS: Record<FurnitureCategory, string> = {
    wallpaper: "벽지",
    flooring: "바닥재",
    window: "창문/문",
    furniture: "가구",
    accessory: "소품",
};

export function findFurniture(slug: string): FurnitureItem | undefined {
    return FURNITURE_CATALOG.find((f) => f.slug === slug);
}

export function findFurnitureOrFallback(slug: string): FurnitureItem {
    return findFurniture(slug) ?? {
        slug,
        name: slug.replace(/_/g, " "),
        category: "accessory" as FurnitureCategory,
        imageUrl: abs(`/icons/furniture/${slug}.png`),
        price: 100,
        description: "",
    };
}
