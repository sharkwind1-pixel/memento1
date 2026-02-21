/**
 * 미니미 인벤토리 API
 * GET: 내가 보유한 캐릭터 + 장착 상태 조회
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

        // 장착 상태
        const { data: profile } = await supabase
            .from("profiles")
            .select("equipped_minimi_id, minimi_pixel_data")
            .eq("id", user.id)
            .single();

        return NextResponse.json({
            characters: ownedCharacters || [],
            equipped: {
                minimiId: profile?.equipped_minimi_id || null,
                pixelData: profile?.minimi_pixel_data || null,
            },
        });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
