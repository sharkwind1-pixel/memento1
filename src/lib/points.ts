/**
 * 포인트 시스템 유틸리티
 * - 서버 사이드에서 Supabase RPC를 통한 포인트 적립
 * - 활동별 라벨, 포맷 헬퍼
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { POINTS } from "@/config/constants";
import type { PointAction, PointAwardResult } from "@/types";

/**
 * 포인트 적립 (서버 사이드 전용)
 * 기존 API 라우트 내에서 직접 호출
 * 실패해도 원본 기능에 영향 없도록 try-catch 처리
 */
export async function awardPoints(
    supabase: SupabaseClient,
    userId: string,
    actionType: PointAction,
    metadata?: Record<string, string>
): Promise<PointAwardResult> {
    try {
        const points = POINTS.ACTIONS[actionType];
        const dailyCap = POINTS.DAILY_CAPS[actionType];
        const isOneTime = (POINTS.ONE_TIME as readonly string[]).includes(actionType);

        // p_is_one_time 시그니처 = 신규 오버로드(RETURNS TABLE, auth.uid() 가드 없음 — service_role 전용으로 DB에서 잠금).
        // 과거 p_one_time(레거시 jsonb 오버로드)은 auth.uid() != p_user_id 가드 때문에 service_role/타인적립이
        // 전부 'unauthorized'로 silent 실패해 포인트 적립이 수개월 죽어 있었음 (2026-06-10 전수검수 발견).
        // 호출부는 반드시 admin(service_role) 클라이언트를 주입할 것 — API에서 getAuthUser()로 이미 검증함.
        const { data, error } = await supabase.rpc("increment_user_points", {
            p_user_id: userId,
            p_action_type: actionType,
            p_points: points,
            p_daily_cap: dailyCap,
            p_is_one_time: isOneTime,
            p_metadata: metadata ? metadata : {},
        });

        if (error) {
            console.error(`[Points] 적립 실패 (${actionType}):`, error.message);
            return { success: false, points: 0 };
        }

        // RETURNS TABLE → 배열로 옴 (단일 행)
        const row = Array.isArray(data) ? data[0] : data;
        return {
            success: row?.success ?? false,
            reason: row?.reason,
            points: row?.new_points ?? 0,
            totalEarned: row?.new_total,
            earned: row?.earned,
        };
    } catch (err) {
        console.error(`[Points] 적립 예외 (${actionType}):`, err);
        return { success: false, points: 0 };
    }
}

/** 활동 타입의 한글 라벨 반환 */
export function getActionLabel(actionType: PointAction): string {
    return POINTS.LABELS[actionType] || actionType;
}

/** 포인트 숫자 포맷 (1,234P) */
export function formatPoints(points: number): string {
    return `${points.toLocaleString("ko-KR")}P`;
}
