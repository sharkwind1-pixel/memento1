/**
 * 메멘토애니 디자인 토큰
 * 웹 tailwind.config.ts memento/memorial 팔레트와 1:1 매칭.
 * 50/75/100은 의도적으로 따뜻한 크림(브랜드 페이지 배경), 200부터 sky 계열.
 */

export const COLORS = {
    memento: {
        50:  "#FDF8F3",  // 페이지 배경 시작 (따뜻한 크림) — 웹과 일치
        75:  "#FEFAF6",  // 페이지 배경 중간 (따뜻한 크림) — 웹과 일치
        100: "#FFF3E8",  // Surface 카드/호버/배지 — 웹과 일치
        200: "#BAE6FD",  // Light Surface (= sky-200)
        300: "#7DD3FC",  // Border Accent (= sky-300)
        400: "#38BDF8",  // Primary Light (= sky-400)
        500: "#05B2DC",  // Primary (CTA 배경, 아이콘)
        600: "#0891B2",  // Hover + 텍스트 (AA 5.9:1)
        700: "#0369A1",  // Dark Text (AAA 7.1:1) — 웹은 #0369A1
        800: "#075985",  // Dark mode 텍스트
        900: "#0C4A6E",  // Dark mode 배경
        950: "#082F49",  // 최심 다크 배경
    },
    memorial: {
        50:  "#FFFBEB",  // 추모 배경 (가장 밝은 금빛)
        100: "#FEF3C7",  // 추모 Surface
        200: "#FDE68A",  // 추모 Light
        300: "#FCD34D",  // 추모 Accent
        400: "#FBBF24",  // 추모 Primary Light
        500: "#F59E0B",  // 추모 Primary
        600: "#D97706",  // 추모 Hover
        700: "#B45309",  // 추모 Dark Text
        800: "#92400E",  // 추모 Dark mode
        900: "#78350F",  // 추모 Dark bg
        950: "#451A03",  // 추모 최심 다크
    },
    gray: {
        50: "#F9FAFB",
        100: "#F3F4F6",
        200: "#E5E7EB",
        300: "#D1D5DB",
        400: "#9CA3AF",
        500: "#6B7280",
        600: "#4B5563",
        700: "#374151",
        800: "#1F2937",
        900: "#111827",
        950: "#030712",
    },
    red: {
        50: "#FEF2F2",
        100: "#FEE2E2",
        200: "#FECACA",
        500: "#EF4444",
        600: "#DC2626",
    },
    white: "#FFFFFF",
    black: "#000000",
} as const;

export const SPACING = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
} as const;

export const RADIUS = {
    sm: 6,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
} as const;
