/**
 * Open 100 이벤트 서버 유틸.
 * 미션 완주 시 eligibility 체크 + RPC(`award_open100`) 호출 + 텔레그램 알림.
 */

import { DAILY_QUESTS, MEMORIAL_QUESTS, OPEN100_EVENT_START_AT, OPEN100_LIMIT, TRUSTED_EMAILS } from "@/config/constants";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface Open100Status {
    awarded: number;
    remaining: number;
    isClosed: boolean;
    limit: number;
}

/** 현재 지급 현황 조회 (UI용) */
export async function getOpen100Status(supabase: SupabaseClient): Promise<Open100Status> {
    const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .not("open100_awarded_at", "is", null);
    const awarded = count ?? 0;
    return {
        awarded,
        remaining: Math.max(0, OPEN100_LIMIT - awarded),
        isClosed: awarded >= OPEN100_LIMIT,
        limit: OPEN100_LIMIT,
    };
}

/** 온보딩 미션 전체 완주(일상 5 OR 추모 4) 여부 판정 */
export function isAllQuestsCompleted(progress: Record<string, string>): boolean {
    const dailyDone = DAILY_QUESTS.every((q) => progress[q.id]);
    const memorialDone = MEMORIAL_QUESTS.every((q) => progress[q.id]);
    return dailyDone || memorialDone;
}

/**
 * 이벤트 참여 자격 체크.
 * - TRUSTED_EMAILS는 카운트 제외
 * - created_at이 이벤트 시작 이후여야 함
 */
export function isEligibleForOpen100(opts: {
    email: string | null;
    createdAt: string | null;
    alreadyAwarded: boolean;
}): boolean {
    if (!opts.email || !opts.createdAt) return false;
    if (opts.alreadyAwarded) return false;
    if (TRUSTED_EMAILS.includes(opts.email)) return false;
    const eventStart = new Date(OPEN100_EVENT_START_AT).getTime();
    const userJoined = new Date(opts.createdAt).getTime();
    return userJoined >= eventStart;
}

/**
 * 미션 완주 지급 시도.
 * RPC는 advisory lock으로 경쟁 방지 + 100명 초과 시 false 반환.
 * 텔레그램 알림은 실패 무시.
 */
export async function tryAwardOpen100(
    supabase: SupabaseClient,
    userId: string,
    userEmail: string | null,
): Promise<{ awarded: boolean; awardedCount?: number; remaining?: number; reason?: string }> {
    try {
        const { data, error } = await supabase.rpc("award_open100", { p_user_id: userId });
        if (error || !data) {
            return { awarded: false, reason: error?.message || "rpc_failed" };
        }

        const result = data as { awarded: boolean; awarded_count?: number; remaining?: number; reason?: string };
        if (!result.awarded) {
            return { awarded: false, reason: result.reason };
        }

        // 비동기 텔레그램 알림 (실패해도 지급은 유지)
        if (result.awarded_count != null && result.remaining != null) {
            import("@/lib/telegram")
                .then(({ notifyOpen100Award }) =>
                    notifyOpen100Award({
                        email: userEmail || "unknown",
                        awardedCount: result.awarded_count!,
                        remaining: result.remaining!,
                    }),
                )
                .catch(() => {});
        }

        return { awarded: true, awardedCount: result.awarded_count, remaining: result.remaining };
    } catch (err) {
        return { awarded: false, reason: err instanceof Error ? err.message : "unknown" };
    }
}
