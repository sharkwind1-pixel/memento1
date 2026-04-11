/**
 * useSubscriptionPhase
 * 구독 라이프사이클 단계 + 단계별 UI 힌트
 *
 * 단계 (2026-04-11 재설계 — 3단계로 단순화):
 * - active: 평상시 (유료 구독 중 또는 무료 회원)
 * - cancelled: 해지 후 premium_expires_at 전 (유료 혜택 그대로, 만료일 안내 배너)
 * - archived: 무료 회원 + 초과 데이터 잠금 (data_reset_at까지 카운트다운)
 *
 * 주의: readonly/hidden 같은 처벌 상태는 더 이상 없음.
 * cancelled는 유료 혜택 그대로, archived는 일반 무료 회원 경험 + 초과분만 잠금.
 *
 * 설계: docs/subscription-lifecycle.md
 */

"use client";

import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { SubscriptionPhase } from "@/types";

export interface SubscriptionPhaseInfo {
    phase: SubscriptionPhase;
    /** 해지했으나 아직 premium_expires_at 전 */
    isCancelled: boolean;
    /** 무료 전환 + 초과 데이터 잠금 상태 */
    isArchived: boolean;
    /** 카운트다운 범위 (D-10 ~ D-1) */
    isCountdown: boolean;
    /** 임박 경고 (D-3 ~ D-1) — sticky 배너 */
    isCritical: boolean;
    /** 라이프사이클 진행 중 (cancelled 또는 archived) */
    isLifecycleActive: boolean;
    /** premium_expires_at까지 남은 일 (cancelled 단계에서 의미 있음) */
    daysUntilExpiry: number | null;
    /** data_reset_at(영구 삭제)까지 남은 일 (archived 단계에서 의미 있음) */
    daysUntilPurge: number | null;
    /** 영구 삭제 예정 시각 */
    resetAt: string | null;
}

export function useSubscriptionPhase(): SubscriptionPhaseInfo {
    const { subscriptionPhase, subscriptionCancelledAt, dataResetAt, isPremiumUser } = useAuth();

    // isPremiumUser는 premium_expires_at 기반으로 AuthContext에서 계산됨.
    // cancelled 유저가 premium_expires_at 지나면 DB는 아직 'cancelled'지만
    // isPremium=false가 됨 → 이 경우 프론트에서 'archived' 취급이 정확.

    return useMemo(() => {
        const now = Date.now();
        const phase = subscriptionPhase;

        // 라이프사이클 필드 파싱
        const hasResetAt = !!dataResetAt;
        const resetAtMs = dataResetAt ? new Date(dataResetAt).getTime() : null;

        // 남은 일 계산 헬퍼
        const daysFrom = (targetMs: number | null): number | null => {
            if (targetMs === null) return null;
            return Math.max(0, Math.ceil((targetMs - now) / (24 * 60 * 60 * 1000)));
        };

        // premium_expires_at은 AuthContext에서 직접 노출 안 하고 isPremiumUser로 판단
        // cancelled 단계에서 isPremium=true면 아직 만료 전, isPremium=false면 만료 후(archived 대기)
        const isCancelled = phase === "cancelled" && isPremiumUser;
        const isArchived = phase === "archived" || (phase === "cancelled" && !isPremiumUser);
        const isLifecycleActive = isCancelled || isArchived;

        const daysUntilPurge = isArchived && hasResetAt ? daysFrom(resetAtMs) : null;
        const isCountdown = daysUntilPurge !== null && daysUntilPurge >= 1 && daysUntilPurge <= 10;
        const isCritical = daysUntilPurge !== null && daysUntilPurge >= 1 && daysUntilPurge <= 3;

        // cancelled 단계에서 남은 유료 기간 (premium_expires_at 대신 subscription_cancelled_at 이후 추정 어려움)
        // 대안: data_reset_at - 40일 = premium_expires_at 역산
        let daysUntilExpiry: number | null = null;
        if (isCancelled && hasResetAt && resetAtMs !== null) {
            const expiryMs = resetAtMs - 40 * 24 * 60 * 60 * 1000;
            daysUntilExpiry = daysFrom(expiryMs);
        }

        return {
            phase,
            isCancelled,
            isArchived,
            isCountdown,
            isCritical,
            isLifecycleActive,
            daysUntilExpiry,
            daysUntilPurge,
            resetAt: dataResetAt,
        };
    }, [subscriptionPhase, subscriptionCancelledAt, dataResetAt, isPremiumUser]);
}
