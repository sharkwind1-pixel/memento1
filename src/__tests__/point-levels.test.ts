/**
 * 포인트 등급 계산 테스트 (src/config/constants.ts getPointLevel/getNextLevelInfo)
 *
 * 게임화 핵심 — 등급/진행도 오류는 UX·보상에 직결. 임계값은 POINT_LEVELS에서
 * 직접 읽어 비교(하드코딩 매직넘버 회피 → 임계값 바뀌어도 로직 검증 유지).
 */
import { describe, it, expect } from "vitest";
import { getPointLevel, getNextLevelInfo, POINT_LEVELS } from "@/config/constants";

const FIRST = POINT_LEVELS[0];
const LAST = POINT_LEVELS[POINT_LEVELS.length - 1];

describe("getPointLevel", () => {
    it("0점 → 최하 등급", () => {
        expect(getPointLevel(0).level).toBe(FIRST.level);
    });
    it("음수도 최하 등급으로 클램프", () => {
        expect(getPointLevel(-500).level).toBe(FIRST.level);
    });
    it("매우 높은 점수 → 최고 등급", () => {
        expect(getPointLevel(LAST.minPoints + 999999).level).toBe(LAST.level);
    });
    it("각 등급 임계값 정각에서 그 등급으로 진입(경계 포함)", () => {
        for (const lvl of POINT_LEVELS) {
            expect(getPointLevel(lvl.minPoints).level).toBe(lvl.level);
        }
    });
    it("임계값 -1점은 직전 등급", () => {
        if (POINT_LEVELS.length >= 2) {
            const second = POINT_LEVELS[1];
            expect(getPointLevel(second.minPoints - 1).level).toBe(FIRST.level);
        }
    });
});

describe("getNextLevelInfo", () => {
    it("최고 등급에서는 nextLevel null, progress 100", () => {
        const info = getNextLevelInfo(LAST.minPoints);
        expect(info.nextLevel).toBeNull();
        expect(info.progress).toBe(100);
        expect(info.remaining).toBe(0);
    });
    it("0점: 다음 등급 = 2단계, remaining = 2단계 임계값, progress 0", () => {
        if (POINT_LEVELS.length >= 2) {
            const info = getNextLevelInfo(0);
            expect(info.nextLevel?.level).toBe(POINT_LEVELS[1].level);
            expect(info.remaining).toBe(POINT_LEVELS[1].minPoints);
            expect(info.progress).toBe(0);
        }
    });
    it("progress는 항상 0~100", () => {
        for (const p of [0, 50, 250, 1500, 5000, 20000, 60000, 200000]) {
            const info = getNextLevelInfo(p);
            expect(info.progress).toBeGreaterThanOrEqual(0);
            expect(info.progress).toBeLessThanOrEqual(100);
        }
    });
});
