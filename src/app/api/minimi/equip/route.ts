/**
 * 미니미 장착/해제 API
 * POST: 캐릭터 장착/해제 + 악세서리 장착
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, getAuthUser } from "@/lib/supabase-server";
import { CHARACTER_CATALOG, ACCESSORY_CATALOG } from "@/data/minimiPixels";
import { MINIMI } from "@/config/constants";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
        }

        const body = await request.json();
        const { minimiSlug, accessorySlugs = [] } = body;

        const supabase = await createServerSupabase();

        // 악세서리 개수 제한
        if (accessorySlugs.length > MINIMI.MAX_EQUIPPED_ACCESSORIES) {
            return NextResponse.json(
                { error: `악세서리는 최대 ${MINIMI.MAX_EQUIPPED_ACCESSORIES}개까지 장착 가능합니다` },
                { status: 400 }
            );
        }

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

        // 악세서리 보유 확인
        const accessoriesData: object[] = [];
        for (const slug of accessorySlugs) {
            const { data: owned } = await supabase
                .from("user_minimi_accessories")
                .select("id")
                .eq("user_id", user.id)
                .eq("accessory_id", slug)
                .maybeSingle();

            if (!owned) {
                return NextResponse.json({ error: `보유하지 않은 악세서리입니다: ${slug}` }, { status: 400 });
            }

            const accessory = ACCESSORY_CATALOG.find(a => a.slug === slug);
            if (accessory) {
                accessoriesData.push(accessory.pixelData);
            }
        }

        // profiles 업데이트 (장착 상태 + 캐시)
        const { error: updateError } = await supabase
            .from("profiles")
            .update({
                equipped_minimi_id: minimiSlug || null,
                equipped_accessories: accessorySlugs,
                minimi_pixel_data: minimiPixelData,
                minimi_accessories_data: accessoriesData.length > 0 ? accessoriesData : null,
            })
            .eq("id", user.id);

        if (updateError) {
            return NextResponse.json({ error: "장착에 실패했습니다" }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            equipped: {
                minimiId: minimiSlug || null,
                accessoryIds: accessorySlugs,
                pixelData: minimiPixelData,
                accessoriesData,
            },
        });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
