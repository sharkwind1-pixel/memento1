/**
 * /api/quests
 * GET  — 본인 미션 진행 상태 조회
 * POST — 미션 완료 처리 (멱등성 보장, 보너스 포인트 적립)
 *
 * 트리거 호출 패턴:
 *   await authFetch(API.QUESTS, { method: "POST", body: JSON.stringify({ questId: "register_pet" }) });
 */

import { NextResponse } from "next/server";
import { createServerSupabase, getAuthUser } from "@/lib/supabase-server";
import { DAILY_QUESTS, MEMORIAL_QUESTS, QuestId } from "@/config/constants";

const ALL_QUESTS = [...DAILY_QUESTS, ...MEMORIAL_QUESTS];

export async function GET() {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createServerSupabase();
    const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_quests")
        .eq("id", user.id)
        .single();

    return NextResponse.json({
        progress: (profile?.onboarding_quests as Record<string, string>) || {},
    });
}

export async function POST(request: Request) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const questId = body.questId as QuestId;
    if (!questId) {
        return NextResponse.json({ error: "questId required" }, { status: 400 });
    }

    const quest = ALL_QUESTS.find((q) => q.id === questId);
    if (!quest) {
        return NextResponse.json({ error: "Unknown quest" }, { status: 400 });
    }

    const supabase = await createServerSupabase();

    // 현재 진행 상태 조회
    const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_quests")
        .eq("id", user.id)
        .single();

    const progress = (profile?.onboarding_quests as Record<string, string>) || {};

    // 멱등성: 이미 완료한 미션은 통과 (중복 보너스 X)
    if (progress[questId]) {
        return NextResponse.json({
            success: true,
            alreadyCompleted: true,
            progress,
        });
    }

    // 완료 시각 기록
    const updated = { ...progress, [questId]: new Date().toISOString() };
    const { error: updateError } = await supabase
        .from("profiles")
        .update({ onboarding_quests: updated })
        .eq("id", user.id);

    if (updateError) {
        return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    // 보너스 포인트 적립 (RPC 직접 호출 — 가변 금액 지원)
    let bonusEarned = 0;
    if (quest.bonusPoints > 0) {
        try {
            const { data: rpcResult } = await supabase.rpc("increment_user_points", {
                p_user_id: user.id,
                p_action_type: "admin_award",
                p_points: quest.bonusPoints,
                p_daily_cap: null,
                p_one_time: false,
                p_metadata: { source: `quest_${questId}`, quest_id: questId },
            });
            if (rpcResult?.success) bonusEarned = quest.bonusPoints;
        } catch {
            // 보너스 실패해도 미션 완료는 유지
        }
    }

    return NextResponse.json({
        success: true,
        alreadyCompleted: false,
        progress: updated,
        bonusEarned,
        nextQuestId: quest.nextQuestId,
    });
}
