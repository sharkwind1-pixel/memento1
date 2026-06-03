/**
 * 구독 환불 계산 순수함수 테스트 (src/lib/refund-calc.ts)
 *
 * 돈이 직접 오가는 로직 + cancel/refund-preview 양쪽이 공유하는 단일 소스라
 * 회귀 시 "보여준 환불액 ≠ 실제 환불"·과다/과소 환불로 직결. 경계값 위주로 고정.
 */
import { describe, it, expect } from "vitest";
import { computeRefund, computeVideoDeduction, DAY_MS, COOLING_OFF_MS } from "@/lib/refund-calc";
import { VIDEO } from "@/config/constants";

const T0 = 1_700_000_000_000; // 고정 기준 시각(ms) — Date.now() 미사용
const d = (ms: number) => new Date(ms);

describe("computeRefund — 구독 pro-rata 환불", () => {
    it("숙려기간(24h) 이내 해지 → 전액 환불", () => {
        const r = computeRefund({
            amount: 9900,
            paidAt: d(T0),
            expiresAt: d(T0 + 30 * DAY_MS),
            now: d(T0 + 60 * 60 * 1000), // 1시간 사용
        });
        expect(r.refund).toBe(9900);
        expect(r.isFullRefund).toBe(true);
    });

    it("숙려기간 경계(정확히 24h) → 전액 아님, pro-rata 진입", () => {
        const r = computeRefund({
            amount: 9900,
            paidAt: d(T0),
            expiresAt: d(T0 + 30 * DAY_MS),
            now: d(T0 + COOLING_OFF_MS),
        });
        expect(r.isFullRefund).toBe(false);
        expect(r.refund).toBe(
            Math.floor((9900 * (30 * DAY_MS - COOLING_OFF_MS)) / (30 * DAY_MS)),
        );
    });

    it("절반 사용 → 약 50% 환불(floor)", () => {
        const r = computeRefund({
            amount: 9900,
            paidAt: d(T0),
            expiresAt: d(T0 + 30 * DAY_MS),
            now: d(T0 + 15 * DAY_MS),
        });
        expect(r.isFullRefund).toBe(false);
        expect(r.refund).toBe(4950); // floor(9900 * 15/30)
    });

    it("만료 지난 결제 → 0원", () => {
        const r = computeRefund({
            amount: 9900,
            paidAt: d(T0),
            expiresAt: d(T0 + 30 * DAY_MS),
            now: d(T0 + 31 * DAY_MS),
        });
        expect(r.refund).toBe(0);
        expect(r.isFullRefund).toBe(false);
    });

    it("만료 정각(remaining=0) → 0원 (쿨오프보다 만료 분기가 우선)", () => {
        const r = computeRefund({
            amount: 9900,
            paidAt: d(T0),
            expiresAt: d(T0 + 30 * DAY_MS),
            now: d(T0 + 30 * DAY_MS),
        });
        expect(r.refund).toBe(0);
    });

    it("환불액은 amount를 절대 초과하지 않음", () => {
        const r = computeRefund({
            amount: 9900,
            paidAt: d(T0),
            expiresAt: d(T0 + 1000 * DAY_MS),
            now: d(T0 + 2 * DAY_MS), // 쿨오프 지남 + 잔여 거의 전체
        });
        expect(r.refund).toBeLessThanOrEqual(9900);
        expect(r.refund).toBeGreaterThanOrEqual(0);
    });

    it("days 필드: 30일 구독 15일차", () => {
        const r = computeRefund({
            amount: 9900,
            paidAt: d(T0),
            expiresAt: d(T0 + 30 * DAY_MS),
            now: d(T0 + 15 * DAY_MS),
        });
        expect(r.daysTotal).toBe(30);
        expect(r.daysUsed).toBe(15);
        expect(r.daysRemaining).toBe(15);
    });
});

describe("computeVideoDeduction — 영상 사용분 차감", () => {
    it("쿼터 이내 사용분만큼 차감", () => {
        const r = computeVideoDeduction(9900, 2, 3);
        expect(r.videosUsedCharged).toBe(2);
        expect(r.videoDeduction).toBe(2 * VIDEO.SINGLE_PRICE);
        expect(r.refundable).toBe(Math.max(0, 9900 - 2 * VIDEO.SINGLE_PRICE));
    });

    it("쿼터 초과분은 상한까지만 과금(단품 이중차감 방지)", () => {
        const r = computeVideoDeduction(50000, 10, 3);
        expect(r.videosUsedCharged).toBe(3);
        expect(r.videoDeduction).toBe(3 * VIDEO.SINGLE_PRICE);
    });

    it("영상 미사용 → 차감 0, gross 그대로", () => {
        const r = computeVideoDeduction(9900, 0, 3);
        expect(r.videoDeduction).toBe(0);
        expect(r.refundable).toBe(9900);
    });

    it("차감이 gross보다 크면 환불 0 (음수 방지)", () => {
        const r = computeVideoDeduction(1000, 3, 3); // 3 × 4900 > 1000
        expect(r.refundable).toBe(0);
    });

    it("무료 등급(쿼터 0) → 차감 0", () => {
        const r = computeVideoDeduction(9900, 5, 0);
        expect(r.videosUsedCharged).toBe(0);
        expect(r.videoDeduction).toBe(0);
        expect(r.refundable).toBe(9900);
    });
});
