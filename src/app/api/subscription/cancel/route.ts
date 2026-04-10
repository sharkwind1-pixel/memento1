/**
 * 구독 해지 API
 * POST /api/subscription/cancel
 *
 * 구독을 즉시 해제하지 않고 라이프사이클 단계로 전환:
 * - subscription_phase: 'active' → 'readonly'
 * - subscription_cancelled_at: now()
 * - data_readonly_until: now() + 30일
 * - data_hidden_until: now() + 80일
 * - data_reset_at: now() + 90일
 *
 * 기존 is_premium / premium_expires_at는 유지 (원래 만료일까지 혜택 유지).
 * 라이프사이클 크론(/api/cron/subscription-lifecycle)이 매일 단계 전환 처리.
 *
 * 설계: docs/subscription-lifecycle.md
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, createServerSupabase, createAdminSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const READONLY_DAYS = 30;
const HIDDEN_DAYS = 80;
const RESET_DAYS = 90;

export async function POST(_request: NextRequest) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    try {
        // 본인의 현재 phase 확인 (이미 해지 진행 중이면 거부)
        const supabase = await createServerSupabase();
        const { data: profile, error: profileErr } = await supabase
            .from("profiles")
            .select("subscription_phase, is_premium, premium_expires_at, subscription_tier")
            .eq("id", user.id)
            .single();

        if (profileErr || !profile) {
            return NextResponse.json({ error: "프로필을 불러오지 못했습니다" }, { status: 500 });
        }

        // 이미 해지 진행 중인 경우
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

        // 라이프사이클 시작
        const now = new Date();
        const readonlyUntil = new Date(now.getTime() + READONLY_DAYS * 24 * 60 * 60 * 1000);
        const hiddenUntil = new Date(now.getTime() + HIDDEN_DAYS * 24 * 60 * 60 * 1000);
        const resetAt = new Date(now.getTime() + RESET_DAYS * 24 * 60 * 60 * 1000);

        // Service role로 업데이트 (subscription_phase 등은 RLS 우회 필요할 수 있음)
        const adminSb = createAdminSupabase();

        // 1. profiles 라이프사이클 컬럼 설정
        const { error: updateErr } = await adminSb
            .from("profiles")
            .update({
                subscription_phase: "readonly",
                subscription_cancelled_at: now.toISOString(),
                data_readonly_until: readonlyUntil.toISOString(),
                data_hidden_until: hiddenUntil.toISOString(),
                data_reset_at: resetAt.toISOString(),
                // is_premium / premium_expires_at / subscription_tier는 유지
                // 라이프사이클 크론이 D+90에 회귀 시점에 free로 변경
            })
            .eq("id", user.id);

        if (updateErr) {
            return NextResponse.json({ error: "구독 해지 처리 실패", detail: updateErr.message }, { status: 500 });
        }

        // 2. subscriptions 테이블에서 자동 갱신 비활성화
        await adminSb
            .from("subscriptions")
            .update({
                metadata: { auto_renew: "false", cancelled_at: now.toISOString() },
                updated_at: now.toISOString(),
            })
            .eq("user_id", user.id)
            .eq("status", "active");

        // 3. 인앱 알림: 해지 완료 + 라이프사이클 안내
        await adminSb.from("notifications").insert({
            user_id: user.id,
            type: "subscription_readonly_start",
            title: "구독이 해지되었습니다",
            body: "소중한 추억은 30일간 그대로 보관돼요. 30일간은 보기/추모 모드 전환만 가능하고, 새 등록과 편집은 제한됩니다. 재구독하면 즉시 모든 기능이 복구됩니다.",
            metadata: {
                phase: "readonly",
                readonly_until: readonlyUntil.toISOString(),
                hidden_until: hiddenUntil.toISOString(),
                reset_at: resetAt.toISOString(),
            },
            dedup_key: `sub_readonly_${now.toISOString().slice(0, 10)}_${user.id}`,
        });

        return NextResponse.json({
            ok: true,
            phase: "readonly",
            readonly_until: readonlyUntil.toISOString(),
            hidden_until: hiddenUntil.toISOString(),
            reset_at: resetAt.toISOString(),
        });
    } catch (e) {
        const msg = e instanceof Error ? e.message : "서버 오류";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
