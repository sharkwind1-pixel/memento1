/**
 * 미니미 인벤토리 API
 * GET: 내가 보유한 캐릭터 + 장착 상태 조회
 */

import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { withAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export const GET = withAuth(async ({ user }) => {
    try {
        const supabase = await createServerSupabase();

        // 보유 캐릭터
        const { data: ownedCharacters } = await supabase
            .from("user_minimi")
            .select("id, minimi_id, purchased_at, purchase_price")
            .eq("user_id", user.id);

        // 장착 상태 (equipped_minimi_id는 user_minimi UUID → slug로 변환)
        const { data: profile } = await supabase
            .from("profiles")
            .select("equipped_minimi_id, minimi_pixel_data")
            .eq("id", user.id)
            .single();

        let equippedSlug: string | null = null;
        if (profile?.equipped_minimi_id) {
            const equippedRow = (ownedCharacters || []).find(
                (c: { id: string }) => c.id === profile.equipped_minimi_id
            );
            equippedSlug = equippedRow?.minimi_id || null;
        }

        return NextResponse.json({
            characters: ownedCharacters || [],
            equipped: {
                minimiId: equippedSlug,
                pixelData: profile?.minimi_pixel_data || null,
            },
        });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}, { message: "로그인이 필요합니다" });
