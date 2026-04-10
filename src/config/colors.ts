/**
 * 메멘토 브랜드 색상 상수 — 일상 모드 (Cyan-Blue)
 * Tailwind 클래스가 아닌 JS 런타임에서 색상이 필요할 때 사용 (SVG props, inline styles 등)
 * tailwind.config.ts의 memento 색상과 동기화 유지할 것
 */
export const MEMENTO_COLORS = {
    50:  '#FDF8F3',  // 페이지 배경 시작 (따뜻한 크림)
    75:  '#FEFAF6',  // 페이지 배경 중간 (따뜻한 크림)
    100: '#FFF3E8',  // Surface (카드, 호버, 배지)
    200: '#BAE6FD',  // Light Surface (= memento-200)
    300: '#7DD3FC',  // Border Accent (= memento-300)
    400: '#38BDF8',  // Primary Light (= memento-400)
    500: '#05B2DC',  // Primary (CTA 배경, 아이콘)
    600: '#0891B2',  // Hover + 텍스트 (AA 5.9:1)
    700: '#0369A1',  // Dark Text (AAA 7.1:1)
    800: '#075985',  // Dark mode 텍스트
    900: '#0C4A6E',  // Dark mode 배경
    950: '#082F49',  // 최심 다크 배경
} as const;

/**
 * 추모 모드 색상 상수 — Memorial (Amber-Gold)
 * tailwind.config.ts의 memorial 색상과 동기화 유지할 것
 */
export const MEMORIAL_COLORS = {
    50:  '#FFFBEB',  // 추모 배경 (가장 밝은 금빛)
    100: '#FEF3C7',  // 추모 Surface
    200: '#FDE68A',  // 추모 Light
    300: '#FCD34D',  // 추모 Accent
    400: '#FBBF24',  // 추모 Primary Light
    500: '#F59E0B',  // 추모 Primary
    600: '#D97706',  // 추모 Hover
    700: '#B45309',  // 추모 Dark Text
    800: '#92400E',  // 추모 Dark mode
    900: '#78350F',  // 추모 Dark bg
    950: '#451A03',  // 추모 최심 다크
} as const;
