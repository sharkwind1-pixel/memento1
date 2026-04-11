/**
 * 구독 해지 API
 * POST /api/subscription/cancel
 *
 * 새 설계 (2026-04-11 재설계):
 * - 해지 클릭 = 즉시 해제 X
 * - premium_expires_at까지는 기존 유료 혜택 유지 (is_premium 유지)
 * - subscription_phase = 'cancelled' (UI는 해지 예정 배너 표시)
 * - subscription_cancelled_at = now()
 * - data_reset_at = premium_expires_at + 40일 (archived 데이터 영구 삭제 예정일)
 * - subscriptions 자동 갱신 비활성화
 *
 * 이후 크론잡(/api/cron/subscription-lifecycle)이:
 * 1. premium_expires_at 도달 시 → phase='archived' + archive 실행 (대표 펫 외 모두)
 * 2. data_reset_at 도달 시 → archived 데이터 hard delete + phase='active' 복귀
 *
 * 설계: docs/subscription-lifecycle.md (재설계 반영)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, createServerSupabase, createAdminSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/** archived 단계 지속 기간 (일) — premium_expires_at 이후 영구 삭제까지 */
const ARCHIVED_DAYS = 40;

export async function POST(_request: NextRequest) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    try {
        const supabase = await createServerSupabase();
        const { data: profile, error: profileErr } = await supabase
            .from("profiles")
            .select("subscription_phase, is_premium, premium_expires_at, subscription_tier")
            .eq("id", user.id)
            .single();

        if (profileErr || !profile) {
            return NextResponse.json({ error: "프로필을 불러오지 못했습니다" }, { status: 500 });
        }

        // 이미 해지 진행 중
        if (profile.subscription_phase && profile.subscription_phase !== "active") {
            return NextResponse.json(
                { error: "이미 해지 진행 중입니다", currentPhase: profile.subscription_phase },
                { status: 409 }
            );
        }

        // 무료 유저는 해지할 게 없음
        if (!profile.is_premium) {
            return NextResponse.json({ error: "활성 구독이 없습니다" }, { status: 400 });
        }

        const now = new Date();
        // premium_expires_at이 null이면 지금 기준으로 계산 (안전 폴백)
        const expiresAt = profile.premium_expires_at
            ? new Date(profile.premium_expires_at)
            : now;
        // data_reset_at = premium_expires_at + 40일 (archived 단계 종료 = hard delete 예정일)
        const dataResetAt = new Date(expiresAt.getTime() + ARCHIVED_DAYS * 24 * 60 * 60 * 1000);

        const adminSb = createAdminSupabase();

        // 1. profiles 해지 플래그 설정 (is_premium 유지)
        const { error: updateErr } = await adminSb
            .from("profiles")
            .update({
                subscription_phase: "cancelled",
                subscription_cancelled_at: now.toISOString(),
                data_reset_at: dataResetAt.toISOString(),
                // is_premium, premium_expires_at, subscription_tier는 그대로 유지
                // → premium_expires_at까지 기존 유료 혜택 계속 사용 가능
            })
            .eq("id", user.id);

        if (updateErr) {
            return NextResponse.json({ error: "구독 해지 처리 실패", detail: updateErr.message }, { status: 500 });
        }

        // 2. subscriptions 자동 갱신 비활성화
        await adminSb
            .from("subscriptions")
            .update({
                metadata: { auto_renew: "false", cancelled_at: now.toISOString() },
                updated_at: now.toISOString(),
            })
            .eq("user_id", user.id)
            .eq("status", "active");

        // 3. 인앱 알림: 해지 완료 + 라이프사이클 안내
        const { error: notifErr } = await adminSb.from("notifications").insert({
            user_id: user.id,
            type: "subscription_cancelled",
            title: "구독이 해지되었습니다",
            body: `${expiresAt.toLocaleDateString("ko-KR")}까지 기존 유료 혜택을 이용할 수 있어요. 이후 무료 회원으로 전환되며 초과 데이터는 ${ARCHIVED_DAYS}일간 보관 후 영구 삭제됩니다. 그 전에 재구독하면 모두 복구됩니다.`,
            metadata: {
                phase: "cancelled",
                premium_expires_at: profile.premium_expires_at,
                data_reset_at: dataResetAt.toISOString(),
            },
            dedup_key: `sub_cancelled_${now.toISOString().slice(0, 10)}_${user.id}`,
        });
        if (notifErr && notifErr.code !== "23505") {
            console.error("[subscription/cancel] notification insert failed:", notifErr.message);
        }

        return NextResponse.json({
            ok: true,
            phase: "cancelled",
            premium_expires_at: profile.premium_expires_at,
            data_reset_at: dataResetAt.toISOString(),
        });
    } catch (e) {
        const msg = e instanceof Error ? e.message : "서버 오류";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
