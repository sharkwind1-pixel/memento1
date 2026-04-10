/**
 * useSubscriptionPhase
 * 구독 라이프사이클 단계 + 단계별 권한 헬퍼
 *
 * 단계별 권한:
 * - active: 모든 기능 사용 가능
 * - readonly (D+0~30): 보기만 가능, 편집/추가 불가, 단 추모 모드 전환만 예외 허용
 * - hidden (D+31~80): 내 기록/AI 펫톡 차단, 커뮤니티/매거진은 OK
 * - countdown (D+81~89): hidden과 동일 + 매일 알림
 * - free (D+90~): 무료 한도로 회귀, 일부 데이터 보관함 이동
 *
 * 설계: docs/subscription-lifecycle.md
 */

"use client";

import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { SubscriptionPhase } from "@/types";

export interface SubscriptionPhaseInfo {
    phase: SubscriptionPhase;
    /** 보기만 가능, 편집/추가 불가 */
    isReadOnly: boolean;
    /** 내 기록/AI 펫톡 차단 (커뮤니티는 OK) */
    isHidden: boolean;
    /** 카운트다운 단계 (D-10 ~ D-1) */
    isCountdown: boolean;
    /** 회귀 완료 (무료 한도) */
    isReset: boolean;
    /** 라이프사이클 진행 중 (active 외 모든 단계) */
    isLifecycleActive: boolean;
    /** 회귀까지 남은 일 (양수면 진행 중, null이면 active) */
    daysUntilReset: number | null;
    /** 다음 단계 전환까지 남은 일 */
    daysUntilNextPhase: number | null;
    /** 회귀일 ISO */
    resetAt: string | null;
    /** 차단해야 할 액션 (편집 등) */
    blockMessage: string | null;
}

export function useSubscriptionPhase(): SubscriptionPhaseInfo {
    const { subscriptionPhase, dataReadonlyUntil, dataHiddenUntil, dataResetAt } = useAuth();

    return useMemo(() => {
        const phase = subscriptionPhase;
        const now = Date.now();

        const daysUntilReset = dataResetAt
            ? Math.max(0, Math.ceil((new Date(dataResetAt).getTime() - now) / (24 * 60 * 60 * 1000)))
            : null;

        let daysUntilNextPhase: number | null = null;
        if (phase === "readonly" && dataReadonlyUntil) {
            daysUntilNextPhase = Math.max(0, Math.ceil((new Date(dataReadonlyUntil).getTime() - now) / (24 * 60 * 60 * 1000)));
        } else if (phase === "hidden" && dataHiddenUntil) {
            daysUntilNextPhase = Math.max(0, Math.ceil((new Date(dataHiddenUntil).getTime() - now) / (24 * 60 * 60 * 1000)));
        } else if (phase === "countdown" && dataResetAt) {
            daysUntilNextPhase = daysUntilReset;
        }

        const isReadOnly = phase === "readonly";
        const isHidden = phase === "hidden" || phase === "countdown";
        const isCountdown = phase === "countdown";
        const isReset = phase === "free";
        const isLifecycleActive = phase !== "active";

        let blockMessage: string | null = null;
        if (isReadOnly) {
            blockMessage = "읽기 전용 모드입니다. 편집하려면 재구독해주세요.";
        } else if (isHidden) {
            blockMessage = "데이터가 보관 중입니다. 재구독하면 즉시 복구됩니다.";
        } else if (isReset) {
            blockMessage = "무료 플랜입니다. 추가 등록은 재구독 후 가능합니다.";
        }

        return {
            phase,
            isReadOnly,
            isHidden,
            isCountdown,
            isReset,
            isLifecycleActive,
            daysUntilReset,
            daysUntilNextPhase,
            resetAt: dataResetAt,
            blockMessage,
        };
    }, [subscriptionPhase, dataReadonlyUntil, dataHiddenUntil, dataResetAt]);
}

/**
 * 편집 액션 가드
 * 추모 모드 전환만 예외 — "죽음은 기다려주지 않으므로"
 */
export function canEditInPhase(phase: SubscriptionPhase, action: "memorial-switch" | "edit" | "add"): boolean {
    if (phase === "active") return true;
    if (phase === "readonly" && action === "memorial-switch") return true;
    return false;
}
