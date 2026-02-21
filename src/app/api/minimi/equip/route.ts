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
        let minimiPixelData = null;
        if (minimiSlug) {
            const { data: owned } = await supabase
                .from("user_minimi")
                .select("id")
                .eq("user_id", user.id)
                .eq("minimi_id", minimiSlug)
                .maybeSingle();

            if (!owned) {
                return NextResponse.json({ error: "보유하지 않은 캐릭터입니다" }, { status: 400 });
            }

            // 픽셀 데이터 조회
            const character = CHARACTER_CATALOG.find(c => c.slug === minimiSlug);
            if (character) {
                minimiPixelData = character.pixelData;
            }
        }

        // profiles 업데이트 (장착 상태 + 캐시)
        const { error: updateError } = await supabase
            .from("profiles")
            .update({
                equipped_minimi_id: minimiSlug || null,
                minimi_pixel_data: minimiPixelData,
            })
            .eq("id", user.id);

        if (updateError) {
            return NextResponse.json({ error: "장착에 실패했습니다" }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            equipped: {
                minimiId: minimiSlug || null,
                pixelData: minimiPixelData,
            },
        });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
