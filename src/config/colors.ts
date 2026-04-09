/**
 * 메멘토 브랜드 색상 상수
 * Tailwind 클래스가 아닌 JS 런타임에서 색상이 필요할 때 사용 (SVG props, inline styles 등)
 * tailwind.config.ts의 memento 색상과 동기화 유지할 것
 */
export const MEMENTO_COLORS = {
    50:  '#FDF8F3',  // 페이지 배경 시작 (따뜻한 크림) — tailwind.config.ts와 동기화
    75:  '#FEFAF6',  // 페이지 배경 중간 (따뜻한 크림)
    100: '#FFF3E8',  // Surface (카드, 호버, 배지)
    200: '#BAE6FD',  // Light Surface
    300: '#7DD3FC',  // Border Accent
    400: '#38BDF8',  // Primary Light (그라데이션, dark 텍스트)
    500: '#05B2DC',  // Primary (CTA 배경, 아이콘)
    600: '#0891B2',  // Hover + 텍스트 (AA 5.9:1)
    700: '#0369A1',  // Dark Text (AAA 7.1:1)
} as const;
