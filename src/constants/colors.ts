/**
 * 색상 관련 상수
 * ================
 * 브랜드 색상, 테마 색상 등
 */

/** 메인 브랜드 색상 */
export const BRAND_COLORS = {
    primary: "#05B2DC",
    primaryLight: "#38BDF8",
    primaryDark: "#0891B2",
    secondary: "#A78BFA",
    accent: "#FBBF24",
} as const;

/** 일상 모드 색상 */
export const DAILY_MODE_COLORS = {
    background: "from-[#F0F9FF] via-[#FAFCFF] to-white",
    backgroundDark: "from-gray-900 via-gray-800 to-gray-900",
    accent: "#05B2DC",
    accentLight: "#E0F7FF",
    gradient: "from-[#05B2DC] to-[#38BDF8]",
} as const;

/** 추모 모드 색상 */
export const MEMORIAL_MODE_COLORS = {
    background: "from-amber-50 via-orange-50 to-yellow-50",
    backgroundDark: "from-amber-950 via-orange-950 to-gray-900",
    accent: "#F59E0B",
    accentLight: "#FEF3C7",
    gradient: "from-amber-500 to-orange-500",
} as const;

/** 카테고리별 색상 */
export const CATEGORY_COLORS = {
    violet: {
        bg: "from-violet-500 to-purple-500",
        text: "text-violet-600 dark:text-violet-400",
        border: "border-violet-200 dark:border-violet-700",
        light: "bg-violet-50 dark:bg-violet-900/30",
    },
    blue: {
        bg: "from-[#05B2DC] to-[#38BDF8]",
        text: "text-[#0891B2] dark:text-[#38BDF8]",
        border: "border-[#7DD3FC] dark:border-[#0369A1]",
        light: "bg-[#E0F7FF] dark:bg-blue-900/30",
    },
    emerald: {
        bg: "from-emerald-500 to-teal-500",
        text: "text-emerald-600 dark:text-emerald-400",
        border: "border-emerald-200 dark:border-emerald-700",
        light: "bg-emerald-50 dark:bg-emerald-900/30",
    },
    amber: {
        bg: "from-amber-500 to-orange-500",
        text: "text-amber-600 dark:text-amber-400",
        border: "border-amber-200 dark:border-amber-700",
        light: "bg-amber-50 dark:bg-amber-900/30",
    },
} as const;

/** 색상 유틸리티 함수 */
export const getCategoryColor = (color: string) => {
    return (
        CATEGORY_COLORS[color as keyof typeof CATEGORY_COLORS] || {
            bg: "from-gray-500 to-gray-600",
            text: "text-gray-600 dark:text-gray-400",
            border: "border-gray-200 dark:border-gray-700",
            light: "bg-gray-50 dark:bg-gray-900/30",
        }
    );
};
