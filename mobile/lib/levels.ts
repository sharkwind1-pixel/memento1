/**
 * 포인트 레벨 시스템 (웹 src/config/constants.ts POINT_LEVELS 매칭)
 *
 * Lv.1 ~ Lv.7 + 어드민. 반려동물 타입(dog/cat/other)별로 다른 아이콘.
 */

export type PetIconType = "dog" | "cat" | "other";

export interface PointLevel {
    level: number;
    minPoints: number;
    icons: Record<PetIconType, number>; // require()의 결과
    color: string;
    hasSparkle?: boolean;
    hasGlow?: boolean;
}

export const POINT_LEVELS: PointLevel[] = [
    {
        level: 1,
        minPoints: 0,
        icons: {
            dog: require("../assets/levels/dog_lv1.png"),
            cat: require("../assets/levels/cat_lv1.png"),
            other: require("../assets/levels/other_lv1.png"),
        },
        color: "#9CA3AF",
    },
    {
        level: 2,
        minPoints: 100,
        icons: {
            dog: require("../assets/levels/dog_lv2.png"),
            cat: require("../assets/levels/cat_lv2.png"),
            other: require("../assets/levels/other_lv2.png"),
        },
        color: "#10B981",
    },
    {
        level: 3,
        minPoints: 500,
        icons: {
            dog: require("../assets/levels/dog_lv3.png"),
            cat: require("../assets/levels/cat_lv3.png"),
            other: require("../assets/levels/other_lv3.png"),
        },
        color: "#EC4899",
    },
    {
        level: 4,
        minPoints: 3000,
        icons: {
            dog: require("../assets/levels/dog_lv4.png"),
            cat: require("../assets/levels/cat_lv4.png"),
            other: require("../assets/levels/other_lv4.png"),
        },
        color: "#05B2DC",
    },
    {
        level: 5,
        minPoints: 10000,
        icons: {
            dog: require("../assets/levels/dog_lv5.png"),
            cat: require("../assets/levels/cat_lv5.png"),
            other: require("../assets/levels/other_lv5.png"),
        },
        color: "#8B5CF6",
        hasSparkle: true,
    },
    {
        level: 6,
        minPoints: 30000,
        icons: {
            dog: require("../assets/levels/dog_lv6.png"),
            cat: require("../assets/levels/cat_lv6.png"),
            other: require("../assets/levels/other_lv6.png"),
        },
        color: "#F59E0B",
        hasSparkle: true,
    },
    {
        level: 7,
        minPoints: 100000,
        icons: {
            dog: require("../assets/levels/dog_lv7.png"),
            cat: require("../assets/levels/cat_lv7.png"),
            other: require("../assets/levels/other_lv7.png"),
        },
        color: "#F43F5E",
        hasSparkle: true,
        hasGlow: true,
    },
];

export const ADMIN_ICONS: Record<PetIconType, number> = {
    dog: require("../assets/levels/dog_admin.png"),
    cat: require("../assets/levels/cat_admin.png"),
    other: require("../assets/levels/dog_admin.png"),
};

export function getPointLevel(points: number): PointLevel {
    for (let i = POINT_LEVELS.length - 1; i >= 0; i--) {
        if (points >= POINT_LEVELS[i].minPoints) return POINT_LEVELS[i];
    }
    return POINT_LEVELS[0];
}

export function getLevelIcon(points: number, petType: PetIconType, isAdmin: boolean): number {
    if (isAdmin) return ADMIN_ICONS[petType];
    return getPointLevel(points).icons[petType];
}
