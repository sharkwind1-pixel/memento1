/**
 * 메멘토애니 디자인 토큰
 * 웹(DESIGN.md) 팔레트와 일치
 */

export const COLORS = {
    memento: {
        50: "#F0F9FF",
        100: "#E0F7FF",
        200: "#BAE6FD",
        300: "#7DD3FC",
        400: "#38BDF8",
        500: "#05B2DC",
        600: "#0891B2",
        700: "#0E7490",
    },
    memorial: {
        50: "#FFFBEB",
        100: "#FEF3C7",
        200: "#FDE68A",
        300: "#FCD34D",
        400: "#FBBF24",
        500: "#F59E0B",
        600: "#D97706",
        700: "#B45309",
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
