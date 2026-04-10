/**
 * subscription-guard.ts
 * 서버 측 구독 라이프사이클 가드
 *
 * 클라이언트 가드(useSubscriptionPhase)는 우회 가능하므로
 * API 라우트에서 반드시 이 함수로 권한 검증해야 한다.
 *
 * 단계별 차단 정책:
 * - active: 모든 액션 허용
 * - readonly: 보기만, 편집/추가 차단 (단 추모 모드 전환만 예외)
 * - hidden, countdown: 모든 데이터 액션 차단 (커뮤니티는 OK)
 * - free: 추가 차단 (편집은 무료 한도 내에서 OK)
 *
 * 설계: docs/subscription-lifecycle.md
 */

import { createAdminSupabase } from "@/lib/supabase-server";
import type { SubscriptionPhase } from "@/types";

export type GuardAction = "edit" | "add" | "memorial-switch" | "delete";

export interface GuardResult {
    allowed: boolean;
    phase: SubscriptionPhase;
    reason?: string;
}

/**
 * 유저의 현재 구독 단계를 조회하고 액션 가능 여부를 판단
 * 401/403 응답이 필요한 경우 caller가 GuardResult.allowed === false 보고 처리
 */
export async function checkSubscriptionGuard(
    userId: string,
    action: GuardAction
): Promise<GuardResult> {
    const supabase = createAdminSupabase();
    const { data, error } = await supabase
        .from("profiles")
        .select("subscription_phase")
        .eq("id", userId)
        .maybeSingle();

    if (error || !data) {
        // 프로필 조회 실패 시 보수적으로 허용 (기존 동작 유지)
        return { allowed: true, phase: "active" };
    }

    const phase = (data.subscription_phase as SubscriptionPhase) || "active";

    if (phase === "active") {
        return { allowed: true, phase };
    }

    if (phase === "readonly") {
        // readonly 단계에서는 추모 전환만 허용
        if (action === "memorial-switch") {
            return { allowed: true, phase };
        }
        return {
            allowed: false,
            phase,
            reason: "읽기 전용 모드입니다. 편집하려면 재구독해주세요.",
        };
    }

    if (phase === "hidden" || phase === "countdown") {
        // 모든 데이터 액션 차단
        return {
            allowed: false,
            phase,
            reason: "데이터가 보관 중입니다. 재구독하면 즉시 복구됩니다.",
        };
    }

    if (phase === "free") {
        // free 단계에서는 add만 차단 (무료 한도 초과)
        // edit/delete는 기존 무료 유저 정책과 동일
        if (action === "add") {
            return {
                allowed: false,
                phase,
                reason: "무료 플랜은 반려동물 1마리만 등록할 수 있습니다. 재구독해주세요.",
            };
        }
        return { allowed: true, phase };
    }

    return { allowed: true, phase };
}
