/**
 * minimiPixels.ts
 * 16x16 픽셀 미니미 캐릭터 데이터
 * CSS box-shadow로 렌더링
 *
 * 디자인 원칙 (레퍼런스 기반 리팩토링):
 * - 실루엣 우선: 색 없이 형태만으로 동물 구분 가능
 * - 눈: 1px 검정 점 (작은 해상도에선 1px = 충분한 표현)
 * - 색상 제한: 캐릭터당 3~5색 (base, shadow, highlight, accent)
 * - 광원: 좌상단 고정 (왼쪽 위 하이라이트, 오른쪽 아래 그림자)
 * - SD 비율: 머리 크게 (5~7행), 몸 (4~5행), 다리 짧게 (2행)
 * - 각 동물별 고유 시그니처 (귀, 코, 꼬리, 체형)
 */

import type { PixelData } from "@/types";

// ============================================
// 헬퍼: 2D 배열 -> box-shadow 문자열 변환
// ============================================

function gridToPixels(grid: (string | null)[][]): string {
    const shadows: string[] = [];
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            const color = grid[y][x];
            if (color) {
                shadows.push(`${x}px ${y}px ${color}`);
            }
        }
    }
    return shadows.join(",");
}

const _ = null;

// ============================================
// 공통 색상
// ============================================
const BK = "#222222"; // 외곽선/눈/코 공통 (순검정은 피하고 차콜)
const WH = "#ffffff"; // 하이라이트
const PK = "#ff9999"; // 핑크 (혀, 볼, 코)

// ============================================
// 1) 말티푸 - 포메라니안같은 뭉실뭉실 실루엣
// ============================================
// 특징: 둥글둥글 곱슬 아웃라인, 큰 머리, 짧은 다리
// 실루엣만으로 알 수 있는 것: 곱슬거리는 윤곽선
const mA = "#f5e0c0"; // cream base
const mB = "#dcc49a"; // cream shadow
const mC = "#c4a878"; // cream dark (outline)

const maltipooGrid: (string | null)[][] = [
    [_, _, _, _, _, mC, mB, mC, mB, mC, _, _, _, _, _, _],
    [_, _, _, mC, mA, mA, mA, mA, mA, mA, mA, mC, _, _, _, _],
    [_, _, mC, mA, mA, mA, mA, mA, mA, mA, mA, mA, mC, _, _, _],
    [_, mC, mB, mA, mA, mA, mA, mA, mA, mA, mA, mA, mB, mC, _, _],
    [_, mC, mA, mA, mA, BK, mA, mA, mA, BK, mA, mA, mA, mC, _, _],
    [_, mC, mA, mA, mA, mA, mA, mA, mA, mA, mA, mA, mA, mC, _, _],
    [_, _, mC, mA, mA, mA, mA, BK, mA, mA, mA, mA, mC, _, _, _],
    [_, _, _, mC, mA, mA, PK, PK, mA, mA, mA, mC, _, _, _, _],
    [_, _, _, _, mC, mB, mB, mB, mB, mB, mC, _, _, _, _, _],
    [_, _, _, _, mC, mA, mA, mA, mA, mA, mC, _, _, _, _, _],
    [_, _, _, _, mC, mA, mA, WH, mA, mA, mC, _, _, _, _, _],
    [_, _, _, _, mC, mA, mA, mA, mA, mA, mC, _, _, _, _, _],
    [_, _, _, _, mC, mC, _, _, _, mC, mC, _, _, _, _, _],
    [_, _, _, _, mB, mB, _, _, _, mB, mB, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, mC, mB, mC, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, mC, _, _, _],
];

export const MALTIPOO: PixelData = { width: 16, height: 16, pixels: gridToPixels(maltipooGrid) };

// ============================================
// 2) 요크셔테리어 - 리본 + 긴 실키 털
// ============================================
// 특징: 머리 위 빨간 리본, 양옆으로 흘러내리는 긴 털, 가운데 가르마
const yA = "#b8956a"; // tan light
const yB = "#7b5b3a"; // brown mid
const yC = "#4a3020"; // brown dark
const yR = "#ff3355"; // ribbon red

const yorkshireGrid: (string | null)[][] = [
    [_, _, _, _, _, _, _, yR, yR, _, _, _, _, _, _, _],
    [_, _, _, _, _, yC, yB, yR, yR, yB, yC, _, _, _, _, _],
    [_, _, _, yC, yB, yA, yA, yA, yA, yA, yB, yC, _, _, _, _],
    [_, _, yC, yB, yA, yA, yA, yA, yA, yA, yA, yB, yC, _, _, _],
    [_, yC, yB, yA, BK, yA, yA, yA, yA, BK, yA, yA, yB, yC, _, _],
    [_, yC, yB, yA, yA, yA, yA, yA, yA, yA, yA, yA, yB, yC, _, _],
    [_, yC, _, yC, yA, yA, yA, BK, yA, yA, yC, _, yC, _, _, _],
    [_, yC, _, _, yC, yA, PK, PK, yA, yC, _, _, yC, _, _, _],
    [_, yC, _, _, _, yC, yB, yB, yC, _, _, _, yC, _, _, _],
    [_, yC, _, _, yC, yA, yA, yA, yA, yC, _, _, yC, _, _, _],
    [_, _, yC, _, yC, yA, yA, yA, yA, yC, _, yC, _, _, _, _],
    [_, _, yC, _, yC, yB, yB, yB, yB, yC, _, yC, _, _, _, _],
    [_, _, _, yC, _, yC, _, _, yC, _, yC, _, _, _, _, _],
    [_, _, _, _, _, yC, _, _, yC, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, yB, yC, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
];

export const YORKSHIRE: PixelData = { width: 16, height: 16, pixels: gridToPixels(yorkshireGrid) };

// ============================================
// 3) 골든리트리버 - 크고 듬직 + 혀 내밀기
// ============================================
// 특징: 넓은 체형, 축 처진 귀, 혀 내밀고 웃는 표정
const gA = "#f0c860"; // gold light
const gB = "#d4a030"; // gold mid
const gC = "#b07820"; // gold dark
const gW = "#fff0c0"; // belly cream
const gT = "#ff6b7b"; // tongue

const goldenGrid: (string | null)[][] = [
    [_, _, _, gC, gB, gB, gB, gB, gB, gB, gB, gC, _, _, _, _],
    [_, _, gC, gA, gA, gA, gA, gA, gA, gA, gA, gA, gC, _, _, _],
    [_, gC, gB, gA, gA, gA, gA, gA, gA, gA, gA, gA, gB, gC, _, _],
    [gC, gB, gA, gA, BK, gA, gA, gA, gA, BK, gA, gA, gA, gB, gC, _],
    [gC, gB, gA, gA, gA, gA, gA, gA, gA, gA, gA, gA, gA, gB, gC, _],
    [_, gC, gB, gA, gA, gA, gA, BK, gA, gA, gA, gA, gB, gC, _, _],
    [_, _, gC, gA, gA, gA, gT, gT, gA, gA, gA, gC, _, _, _, _],
    [_, _, _, gC, gA, gA, gT, gT, gA, gA, gC, _, _, _, _, _],
    [_, _, gC, gB, gB, gB, gB, gB, gB, gB, gB, gC, _, _, _, _],
    [_, _, gC, gA, gA, gW, gW, gW, gW, gA, gA, gC, _, _, _, _],
    [_, gC, gA, gA, gW, gW, gW, gW, gW, gW, gA, gA, gC, _, _, _],
    [_, gC, gA, gA, gA, gW, gW, gW, gA, gA, gA, gA, gC, _, _, _],
    [_, _, gC, gC, _, _, gC, gC, _, _, gC, gC, _, _, _, _],
    [_, _, gC, gC, _, _, gC, gC, _, _, gC, gC, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, gA, gB, gC, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, gA, gC, _, _],
];

export const GOLDEN_RETRIEVER: PixelData = { width: 16, height: 16, pixels: gridToPixels(goldenGrid) };

// ============================================
// 악세서리 (3종)
// ============================================

/** 빨간 모자 */
const redHatGrid: (string | null)[][] = [
    [_, _, _, _, _, "#CC0000", "#CC0000", "#CC0000", "#CC0000", "#CC0000", _, _, _, _, _, _],
    [_, _, _, "#CC0000", "#FF0000", "#FF3333", "#FF3333", "#FF3333", "#FF3333", "#FF0000", "#CC0000", _, _, _, _, _],
    [_, _, "#8B0000", "#8B0000", "#8B0000", "#8B0000", "#8B0000", "#8B0000", "#8B0000", "#8B0000", "#8B0000", "#8B0000", _, _, _, _],
    ...(Array(13).fill([_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _]) as (string | null)[][]),
];
export const RED_HAT: PixelData = { width: 16, height: 16, pixels: gridToPixels(redHatGrid) };

/** 선글라스 */
const sunglassesGrid: (string | null)[][] = [
    ...(Array(4).fill([_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _]) as (string | null)[][]),
    [_, _, "#1a1a1a", "#1a1a1a", "#1a1a1a", "#1a1a1a", "#1a1a1a", "#1a1a1a", "#1a1a1a", "#1a1a1a", "#1a1a1a", "#1a1a1a", _, _, _, _],
    [_, _, "#1a1a1a", "#333333", "#222222", "#1a1a1a", "#1a1a1a", "#1a1a1a", "#222222", "#333333", "#1a1a1a", "#1a1a1a", _, _, _, _],
    ...(Array(10).fill([_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _]) as (string | null)[][]),
];
export const SUNGLASSES: PixelData = { width: 16, height: 16, pixels: gridToPixels(sunglassesGrid) };

/** 꽃 왕관 */
const flowerCrownGrid: (string | null)[][] = [
    [_, _, _, "#FF69B4", _, "#FFD700", _, _, "#FFD700", _, "#FF69B4", _, _, _, _, _],
    [_, _, "#FF69B4", "#FF1493", "#FF69B4", "#FFC107", "#FF69B4", "#FF69B4", "#FFC107", "#FF69B4", "#FF1493", "#FF69B4", _, _, _, _],
    [_, _, "#4CAF50", "#4CAF50", "#4CAF50", "#4CAF50", "#4CAF50", "#4CAF50", "#4CAF50", "#4CAF50", "#4CAF50", "#4CAF50", _, _, _, _],
    ...(Array(13).fill([_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _]) as (string | null)[][]),
];
export const FLOWER_CROWN: PixelData = { width: 16, height: 16, pixels: gridToPixels(flowerCrownGrid) };

// ============================================
// 카탈로그
// ============================================

export const CHARACTER_CATALOG = [
    { slug: "maltipoo", name: "말티푸", category: "dog" as const, pixelData: MALTIPOO, imageUrl: "/icons/minimi/maltipoo.png", price: 100, description: "곱슬곱슬 크림색 말티푸" },
    { slug: "yorkshire", name: "요크셔테리어", category: "dog" as const, pixelData: YORKSHIRE, imageUrl: "/icons/minimi/yorkshire.png", price: 100, description: "작고 용감한 요크셔테리어" },
    { slug: "golden_retriever", name: "골든리트리버", category: "dog" as const, pixelData: GOLDEN_RETRIEVER, imageUrl: "/icons/minimi/golden.png", price: 100, description: "밝고 다정한 골든리트리버" },
] as const;

export const ACCESSORY_CATALOG = [
    { slug: "red_hat", name: "빨간 모자", category: "hat" as const, layer: "top" as const, pixelData: RED_HAT, price: 100, description: "클래식 빨간 모자" },
    { slug: "sunglasses", name: "선글라스", category: "glasses" as const, layer: "face" as const, pixelData: SUNGLASSES, price: 80, description: "멋진 선글라스" },
    { slug: "flower_crown", name: "꽃 왕관", category: "hat" as const, layer: "top" as const, pixelData: FLOWER_CROWN, price: 120, description: "봄날의 꽃 왕관" },
] as const;
