/**
 * subscription-guard.ts
 * 서버 측 구독 라이프사이클 가드
 *
 * 새 설계 (2026-04-11):
 * - active: 모든 액션 허용
 * - cancelled: 유료 혜택 그대로 (active와 동일 동작)
 * - archived: 일반 무료 회원과 동일 (편집 가능, add는 무료 한도에 따름)
 *
 * 주의: 이전 설계의 readonly/hidden/countdown 처벌 상태 제거.
 * archived도 일반 무료 회원 경험을 유지하되 초과 데이터는 archived_at으로 잠금.
 * 잠금된 데이터의 접근은 client UI + DB 쿼리 필터로 처리 (pets/pet_media archived_at IS NULL).
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
 * 유저의 현재 구독 단계 조회 + 액션 가능 여부 판단
 *
 * 새 설계에서는 phase 기반 차단이 거의 없고, 대부분 tier(subscription_tier)
 * 기반으로 기존 한도 검증만 하면 됨. 이 함수는 호환성 유지 + 향후 확장 포인트.
 */
export async function checkSubscriptionGuard(
    userId: string,
    _action: GuardAction
): Promise<GuardResult> {
    const supabase = createAdminSupabase();
    const { data, error } = await supabase
        .from("profiles")
        .select("subscription_phase")
        .eq("id", userId)
        .maybeSingle();

    if (error || !data) {
        return { allowed: true, phase: "active" };
    }

    const phase = (data.subscription_phase as SubscriptionPhase) || "active";

    // 새 설계에서는 phase 기반 차단 없음.
    // - active: 평소
    // - cancelled: 유료 혜택 그대로 (premium_expires_at까지)
    // - archived: 일반 무료 회원 (tier='free'로 이미 설정됨, FREE_LIMITS 적용)
    //
    // 실제 기능 제한은 subscription_tier 기반(getLimitsForTier)으로 처리됨.
    return { allowed: true, phase };
}
