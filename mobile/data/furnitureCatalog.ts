/**
 * furnitureCatalog.ts (mobile)
 * 펫홈 가구/소품 카탈로그
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
    // -- 소품 (accessory) --
    {
        slug: "pet_bowl",
        name: "밥그릇 세트",
        category: "accessory",
        imageUrl: abs("/icons/furniture/pet_bowl.png?v=2"),
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
        imageUrl: abs("/icons/furniture/pet_bed_round.png?v=2"),
        price: 120,
        description: "포근한 도넛 모양 방석",
        stageWidth: 70,
        stageHeight: 55,
    },
    {
        slug: "pet_cushion_flat",
        name: "납작 쿠션",
        category: "furniture",
        imageUrl: abs("/icons/furniture/pet_cushion_flat.png?v=2"),
        price: 100,
        description: "넓적한 사각 쿠션",
        stageWidth: 65,
        stageHeight: 45,
    },
    {
        slug: "cat_tower",
        name: "캣타워",
        category: "furniture",
        imageUrl: abs("/icons/furniture/cat_tower.png?v=2"),
        price: 180,
        description: "높이 올라갈 수 있는 캣타워",
        stageWidth: 55,
        stageHeight: 80,
    },
    {
        slug: "dog_house",
        name: "강아지집",
        category: "furniture",
        imageUrl: abs("/icons/furniture/dog_house.png?v=2"),
        price: 150,
        description: "아늑한 강아지 하우스",
        stageWidth: 75,
        stageHeight: 65,
    },
    {
        slug: "sofa_mint",
        name: "민트 소파",
        category: "furniture",
        imageUrl: abs("/icons/furniture/sofa_mint.png?v=2"),
        price: 160,
        description: "민트색 쿠션이 올려진 아늑한 소파",
        stageWidth: 75,
        stageHeight: 60,
    },
    {
        slug: "galaxy_bed",
        name: "우주 방석",
        category: "furniture",
        imageUrl: abs("/icons/furniture/galaxy_bed.png?v=2"),
        price: 200,
        description: "은하수가 담긴 신비로운 방석",
        stageWidth: 65,
        stageHeight: 50,
    },
    {
        slug: "blanket_basket",
        name: "담요 바구니",
        category: "furniture",
        imageUrl: abs("/icons/furniture/blanket_basket.png?v=2"),
        price: 130,
        description: "포근한 담요가 담긴 라탄 바구니",
        stageWidth: 65,
        stageHeight: 55,
    },
    // -- 소품 (accessory) 추가 --
    {
        slug: "succulent_pot",
        name: "다육이 화분",
        category: "accessory",
        imageUrl: abs("/icons/furniture/succulent_pot.png?v=2"),
        price: 50,
        description: "분홍 화분에 심은 귀여운 다육이",
        stageWidth: 40,
        stageHeight: 45,
    },
    {
        slug: "treat_jar",
        name: "간식 항아리",
        category: "accessory",
        imageUrl: abs("/icons/furniture/treat_jar.png?v=2"),
        price: 70,
        description: "뼈다귀 간식이 가득한 유리 항아리",
        stageWidth: 40,
        stageHeight: 50,
    },
    // -- 창문 (window) --
    // 아치 창문: 이미지가 정면 뷰라 아이소메트릭(30도) 스테이지와 각도가 안 맞음.
    // 코드(크기/회전/skew)로는 해결 불가 → 아이소메트릭 각도로 재생성 시 복구.
    // 파일은 public/icons/furniture/arch_window.png 보존.
    // {
    //     slug: "arch_window",
    //     name: "아치 창문",
    //     category: "window",
    //     imageUrl: abs("/icons/furniture/arch_window.png?v=2"),
    //     price: 120,
    //     description: "구름이 보이는 아치형 창문",
    //     stageWidth: 32,
    //     stageHeight: 48,
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

export function findFurniture(slug: string): FurnitureItem | undefined {
    return FURNITURE_CATALOG.find((f) => f.slug === slug);
}

export function findFurnitureOrFallback(slug: string): FurnitureItem {
    return findFurniture(slug) ?? {
        slug,
        name: slug.replace(/_/g, " "),
        category: "accessory" as FurnitureCategory,
        imageUrl: abs(`/icons/furniture/${slug}.png?v=2`),
        price: 100,
        description: "",
    };
}
