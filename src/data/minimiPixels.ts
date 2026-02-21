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
const mA = "#f0c090"; // apricot base (살구색 - 실제 말티푸 색)
const mB = "#d49860"; // apricot shadow
const mC = "#a07040"; // apricot dark (outline)

const maltipooGrid: (string | null)[][] = [
    //0     1     2     3     4     5     6     7     8     9    10    11    12    13    14    15
    [_, _, _, _, _, mC, mB, mC, mB, mC, _, _, _, _, _, _],  // row0: 곱슬 머리 꼭대기 (cols 5-9)
    [_, _, _, _, mC, mA, mA, mA, mA, mA, mC, _, _, _, _, _],  // row1: 머리 상단
    [_, _, _, mC, mA, mA, mA, mA, mA, mA, mA, mC, _, _, _, _],  // row2: 머리
    [_, _, mC, mB, mA, mA, mA, mA, mA, mA, mA, mB, mC, _, _, _],  // row3: 머리 (귀 포함)
    [_, _, mC, mA, BK, mA, mA, mA, mA, BK, mA, mA, mC, _, _, _],  // row4: 눈
    [_, _, mC, mB, mA, mA, mA, mA, mA, mA, mA, mB, mC, _, _, _],  // row5: 볼
    [_, _, _, mC, mA, mA, mA, BK, mA, mA, mA, mC, _, _, _, _],  // row6: 코
    [_, _, _, _, mC, mA, PK, PK, mA, mA, mC, _, _, _, _, _],  // row7: 입
    [_, _, _, _, mC, mB, mB, mB, mB, mB, mC, _, _, _, _, _],  // row8: 목
    [_, _, _, mC, mA, mA, WH, WH, mA, mA, mA, mC, _, _, _, _],  // row9: 몸통 상단
    [_, _, _, mC, mA, WH, WH, WH, WH, mA, mA, mC, _, _, _, _],  // row10: 배 (하이라이트)
    [_, _, _, mC, mA, mA, WH, WH, mA, mA, mA, mC, _, _, _, _],  // row11: 몸통 하단
    [_, _, _, _, mC, _, _, _, _, _, mC, _, _, _, _, _],  // row12: 다리 상단
    [_, _, _, _, mB, _, _, _, _, _, mB, _, _, _, _, _],  // row13: 발
    [_, _, _, _, _, _, _, _, _, _, _, mC, mB, _, _, _],  // row14: 꼬리
    [_, _, _, _, _, _, _, _, _, _, _, _, mC, _, _, _],  // row15: 꼬리 끝
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
    //0     1     2     3     4     5     6     7     8     9    10    11    12    13    14    15
    [_, _, _, _, _, _, yR, yR, yR, yR, _, _, _, _, _, _],  // row0: 리본 (크게)
    [_, _, _, _, yC, yR, yR, yR, yR, yR, yR, yC, _, _, _, _],  // row1: 리본 아래
    [_, _, yC, yB, yA, yA, yA, yA, yA, yA, yA, yA, yB, yC, _, _],  // row2: 머리 상단
    [_, yC, yB, yA, yA, yA, yA, yA, yA, yA, yA, yA, yA, yB, yC, _],  // row3: 머리 (15col)
    [yC, yB, yA, yA, BK, yA, yA, yA, yA, yA, BK, yA, yA, yB, yC, _],  // row4: 눈 (15col)
    [yC, yB, yA, yA, yA, yA, yA, yA, yA, yA, yA, yA, yA, yB, yC, _],  // row5: 볼 (15col)
    [yC, yC, _, yC, yA, yA, yA, BK, yA, yA, yA, yC, _, yC, yC, _],  // row6: 코 + 양옆 긴 털
    [yC, yC, _, _, yC, yA, PK, PK, PK, yA, yC, _, _, yC, yC, _],  // row7: 입
    [yC, yC, _, _, yC, yB, yB, yB, yB, yB, yC, _, _, yC, yC, _],  // row8: 목 + 양옆 긴 털
    [yC, yC, _, yC, yB, yA, yA, yA, yA, yA, yB, yC, _, yC, yC, _],  // row9: 몸통 + 털
    [_, yC, yC, yC, yB, yA, yA, yA, yA, yA, yB, yC, yC, yC, _, _],  // row10: 몸통
    [_, _, yC, yC, yB, yB, yB, yB, yB, yB, yB, yC, yC, _, _, _],  // row11: 몸통 하단
    [_, _, _, yC, yC, yB, _, _, _, yB, yC, yC, _, _, _, _],  // row12: 다리
    [_, _, _, _, yC, yC, _, _, _, yC, yC, _, _, _, _, _],  // row13: 발
    [_, _, _, _, _, _, _, _, _, _, _, _, yB, yC, _, _],  // row14: 꼬리
    [_, _, _, _, _, _, _, _, _, _, _, _, _, yB, _, _],  // row15: 꼬리 끝
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
    //0     1     2     3     4     5     6     7     8     9    10    11    12    13    14    15
    [_, _, gC, gB, gB, gB, gB, gB, gB, gB, gB, gB, gB, gC, _, _],  // row0: 머리 꼭대기 (12col)
    [_, gC, gA, gA, gA, gA, gA, gA, gA, gA, gA, gA, gA, gA, gC, _],  // row1: 머리 상단 (14col)
    [gC, gA, gA, gA, gA, gA, gA, gA, gA, gA, gA, gA, gA, gA, gA, gC],  // row2: 머리 (풀 16col!)
    [gC, gB, gA, gA, BK, gA, gA, gA, gA, gA, gA, BK, gA, gA, gB, gC],  // row3: 눈 (풀 16col!)
    [gC, gB, gA, gA, gA, gA, gA, gA, gA, gA, gA, gA, gA, gA, gB, gC],  // row4: 볼 (풀 16col, 축 처진 귀)
    [_, gC, gB, gA, gA, gA, gA, BK, gA, gA, gA, gA, gA, gB, gC, _],  // row5: 코
    [_, _, gC, gA, gA, gA, gT, gT, gT, gA, gA, gA, gA, gC, _, _],  // row6: 혀 (시그니처)
    [_, _, _, gC, gA, gA, gT, gT, gT, gA, gA, gC, _, _, _, _],  // row7: 혀 아래
    [_, gC, gB, gB, gB, gB, gB, gB, gB, gB, gB, gB, gB, gB, gC, _],  // row8: 목 (넓고 두꺼운)
    [gC, gA, gA, gA, gW, gW, gW, gW, gW, gW, gW, gA, gA, gA, gA, gC],  // row9: 몸통 (풀 16col!)
    [gC, gA, gA, gW, gW, gW, gW, gW, gW, gW, gW, gW, gA, gA, gA, gC],  // row10: 배 (풀 16col!)
    [gC, gA, gA, gA, gW, gW, gW, gW, gW, gW, gW, gA, gA, gA, gA, gC],  // row11: 몸통 하단 (풀 16col!)
    [_, gC, gC, gB, _, _, _, _, _, _, _, _, gB, gC, gC, _],  // row12: 다리 (넓게 벌림)
    [_, gC, gC, _, _, _, _, _, _, _, _, _, _, gC, gC, _],  // row13: 발
    [_, _, _, _, _, _, _, _, _, _, _, _, gB, gC, _, _],  // row14: 꼬리
    [_, _, _, _, _, _, _, _, _, _, _, _, _, gB, _, _],  // row15: 꼬리 끝
];

export const GOLDEN_RETRIEVER: PixelData = { width: 16, height: 16, pixels: gridToPixels(goldenGrid) };

// ============================================
// 카탈로그
// ============================================

export const CHARACTER_CATALOG = [
    { slug: "maltipoo", name: "말티푸", category: "dog" as const, pixelData: MALTIPOO, imageUrl: "/icons/minimi/maltipoo.png", price: 100, description: "곱슬곱슬 크림색 말티푸" },
    { slug: "yorkshire", name: "요크셔테리어", category: "dog" as const, pixelData: YORKSHIRE, imageUrl: "/icons/minimi/yorkshire.png", price: 100, description: "작고 용감한 요크셔테리어" },
    { slug: "golden_retriever", name: "골든리트리버", category: "dog" as const, pixelData: GOLDEN_RETRIEVER, imageUrl: "/icons/minimi/golden.png", price: 100, description: "밝고 다정한 골든리트리버" },
] as const;
