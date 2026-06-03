/**
 * refund-calc.ts
 *
 * 구독 환불 금액 계산 — **순수 함수**. (DB/네트워크 의존 없음 → 단위 테스트 가능)
 *
 * 그동안 동일 계산식이 두 곳에 흩어져 있었다:
 *   - `subscription/cancel`  : 실제 환불 실행
 *   - `subscription/refund-preview` : 해지 모달의 "이만큼 환불됩니다" 미리보기
 * 둘이 드리프트하면 "보여준 금액 ≠ 실제 환불"이라 신뢰/분쟁 문제가 된다.
 * 단일 소스로 묶고 테스트로 고정한다.
 *
 * 정책 (2026-04-20 최종):
 *   - 결제 후 COOLING_OFF_MS(24h) 이내 해지 → 전액 환불 (isFullRefund)
 *   - 이후 해지 → ms 비율 pro-rata (abuse 방지)
 *   - 만료(remaining<=0) 지난 결제 → 0원
 *   - 그 위에 영상 사용분(구독 쿼터 한도까지) × VIDEO.SINGLE_PRICE 차감
 */
import { VIDEO } from "@/config/constants";

export const DAY_MS = 24 * 60 * 60 * 1000;
/** 숙려기간: 이 시간 이내 해지 시 무조건 전액 환불 */
export const COOLING_OFF_MS = 24 * 60 * 60 * 1000;

export interface RefundParams {
    amount: number;
    paidAt: Date;
    expiresAt: Date;
    now: Date;
}

export interface RefundBreakdown {
    /** 영상 차감 전 환불액(gross) */
    refund: number;
    isFullRefund: boolean;
    daysUsed: number;
    daysTotal: number;
    daysRemaining: number;
}

/**
 * 구독 pro-rata 환불 계산 (영상 차감 전 gross).
 * - COOLING_OFF_MS 이내 → 전액
 * - 이후 → amount × (remainingMs / totalMs), floor + [0, amount] 클램프
 * - 만료 지남 → 0
 */
export function computeRefund({ amount, paidAt, expiresAt, now }: RefundParams): RefundBreakdown {
    const totalMs = Math.max(1, expiresAt.getTime() - paidAt.getTime());
    const usedMs = Math.max(0, now.getTime() - paidAt.getTime());
    const remainingMs = Math.max(0, expiresAt.getTime() - now.getTime());

    const daysTotal = Math.max(1, Math.round(totalMs / DAY_MS));
    const daysUsed = Math.max(0, Math.floor(usedMs / DAY_MS));
    const daysRemaining = Math.max(0, Math.round(remainingMs / DAY_MS));

    if (remainingMs <= 0) {
        return { refund: 0, isFullRefund: false, daysUsed, daysTotal, daysRemaining };
    }
    // 숙려기간 내 → 전액 환불
    if (usedMs < COOLING_OFF_MS) {
        return { refund: amount, isFullRefund: true, daysUsed, daysTotal, daysRemaining };
    }
    // 이후 → 일할 환불 (ms 비율)
    const refund = Math.min(amount, Math.max(0, Math.floor((amount * remainingMs) / totalMs)));
    return { refund, isFullRefund: false, daysUsed, daysTotal, daysRemaining };
}

export interface VideoDeductionResult {
    /** 차감 대상 영상 수 (구독 쿼터 한도까지만) */
    videosUsedCharged: number;
    videoDeduction: number;
    /** 영상 차감 후 최종 환불액 (음수 방지) */
    refundable: number;
}

/**
 * 영상 사용분 차감.
 * - 결제 후 생성 영상 중 **월 쿼터 한도까지만** 과금 (초과분은 단품으로 이미 별도 결제 → 이중차감 방지)
 * - 차감액 = 대상 수 × VIDEO.SINGLE_PRICE
 * - 최종 환불 = max(0, gross - 차감)
 */
export function computeVideoDeduction(
    grossRefund: number,
    videosUsed: number,
    monthlyQuota: number,
): VideoDeductionResult {
    const videosUsedCharged = Math.min(videosUsed, monthlyQuota);
    const videoDeduction = videosUsedCharged * VIDEO.SINGLE_PRICE;
    const refundable = Math.max(0, grossRefund - videoDeduction);
    return { videosUsedCharged, videoDeduction, refundable };
}
