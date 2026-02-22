/**
 * 미니미 장착/해제 API
 * POST: 캐릭터 장착/해제
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, getAuthUser } from "@/lib/supabase-server";
import { CHARACTER_CATALOG } from "@/data/minimiPixels";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
        }

        const body = await request.json();
        const { minimiSlug } = body;

        const supabase = await createServerSupabase();

        // 캐릭터 보유 확인 (null이면 해제)
        let ownedUuid: string | null = null;
        if (minimiSlug) {
            const { data: owned, error: ownedError } = await supabase
                .from("user_minimi")
                .select("id")
                .eq("user_id", user.id)
                .eq("minimi_id", minimiSlug)
                .maybeSingle();

            if (ownedError) {
                console.error("[minimi/equip] Owned check failed:", ownedError.message, ownedError.code);
                return NextResponse.json({ error: `보유 확인 실패: ${ownedError.message}` }, { status: 500 });
            }

            if (!owned) {
                return NextResponse.json({ error: "보유하지 않은 캐릭터입니다" }, { status: 400 });
            }
            ownedUuid = owned.id;
        }

        // profiles 업데이트 - user_minimi UUID를 저장 (컬럼이 UUID 타입)
        const { error: updateError } = await supabase
            .from("profiles")
            .update({ equipped_minimi_id: ownedUuid })
            .eq("id", user.id);

        if (updateError) {
            console.error("[minimi/equip] Update failed:", updateError.message, updateError.code);
            return NextResponse.json({ error: `장착 실패: ${updateError.message}` }, { status: 500 });
        }

        // 응답은 slug 기반 (클라이언트는 slug만 알면 됨)
        const character = minimiSlug ? CHARACTER_CATALOG.find(c => c.slug === minimiSlug) : null;

        return NextResponse.json({
            success: true,
            equipped: {
                minimiId: minimiSlug || null,
                imageUrl: character?.imageUrl || null,
            },
        });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
