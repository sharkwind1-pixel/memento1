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

        const { data, error } = await supabase.rpc("increment_user_points", {
            p_user_id: userId,
            p_action_type: actionType,
            p_points: points,
            p_daily_cap: dailyCap,
            p_is_one_time: isOneTime,
            p_metadata: metadata ? metadata : null,
        });

        if (error) {
            console.error(`[Points] 적립 실패 (${actionType}):`, error.message);
            return { success: false, points: 0 };
        }

        return {
            success: data?.success ?? false,
            reason: data?.reason,
            points: data?.points ?? 0,
            totalEarned: data?.total_earned,
            earned: data?.earned,
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
