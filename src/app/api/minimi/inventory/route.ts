/**
 * 미니미 인벤토리 API
 * GET: 내가 보유한 캐릭터/악세서리 + 장착 상태 조회
 */

import { NextResponse } from "next/server";
import { createServerSupabase, getAuthUser } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
        }

        const supabase = await createServerSupabase();

        // 보유 캐릭터
        const { data: ownedCharacters } = await supabase
            .from("user_minimi")
            .select("id, minimi_id, purchased_at, purchase_price")
            .eq("user_id", user.id);

        // 보유 악세서리
        const { data: ownedAccessories } = await supabase
            .from("user_minimi_accessories")
            .select("id, accessory_id, purchased_at, purchase_price")
            .eq("user_id", user.id);

        // 장착 상태
        const { data: profile } = await supabase
            .from("profiles")
            .select("equipped_minimi_id, equipped_accessories, minimi_pixel_data, minimi_accessories_data")
            .eq("id", user.id)
            .single();

        return NextResponse.json({
            characters: ownedCharacters || [],
            accessories: ownedAccessories || [],
            equipped: {
                minimiId: profile?.equipped_minimi_id || null,
                accessoryIds: profile?.equipped_accessories || [],
                pixelData: profile?.minimi_pixel_data || null,
                accessoriesData: profile?.minimi_accessories_data || [],
            },
        });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
