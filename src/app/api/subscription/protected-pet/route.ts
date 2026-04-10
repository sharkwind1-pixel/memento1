/**
 * 대표 펫 지정 API
 * POST /api/subscription/protected-pet { petId }
 *
 * 구독 해지 후 회귀 시 보관될 1마리 펫 지정.
 * - 본인 소유의 펫만 가능 (RLS 검증)
 * - 추모 펫도 가능 (데이터 앵커 원칙)
 * - 라이프사이클 어느 단계에서든 변경 가능 (free 단계 제외)
 *
 * 설계: docs/subscription-lifecycle.md
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, createAdminSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    try {
        const { petId } = await request.json();
        if (!petId || typeof petId !== "string") {
            return NextResponse.json({ error: "petId가 필요합니다" }, { status: 400 });
        }

        const supabase = createAdminSupabase();

        // 1. 본인 소유의 펫인지 확인 (회귀 후에도 보존될 수 있는 펫 = archived_at IS NULL)
        const { data: pet, error: petErr } = await supabase
            .from("pets")
            .select("id, name, status, user_id, archived_at")
            .eq("id", petId)
            .eq("user_id", user.id)
            .maybeSingle();

        if (petErr || !pet) {
            return NextResponse.json({ error: "펫을 찾을 수 없습니다" }, { status: 404 });
        }

        if (pet.archived_at) {
            return NextResponse.json({ error: "보관함의 펫은 대표로 지정할 수 없습니다" }, { status: 400 });
        }

        // 2. profiles.protected_pet_id 업데이트
        const { error: updErr } = await supabase
            .from("profiles")
            .update({ protected_pet_id: petId })
            .eq("id", user.id);

        if (updErr) {
            return NextResponse.json({ error: "대표 펫 지정 실패", detail: updErr.message }, { status: 500 });
        }

        return NextResponse.json({
            ok: true,
            protected_pet_id: petId,
            pet: { id: pet.id, name: pet.name, status: pet.status },
        });
    } catch (e) {
        const msg = e instanceof Error ? e.message : "서버 오류";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
