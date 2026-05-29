/**
 * 가구/소품 인벤토리 API
 * GET: 보유 가구 목록 조회
 */

import { NextResponse } from "next/server";
import { createAdminSupabase, getAuthUser } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
        }

        const supabase = createAdminSupabase();

        const { data: items, error } = await supabase
            .from("user_furniture")
            .select("id, furniture_id, purchased_at, purchase_price")
            .eq("user_id", user.id)
            .order("purchased_at", { ascending: false });

        if (error) {
            console.error("[furniture/inventory] Query failed:", error.message);
            return NextResponse.json({ error: "인벤토리 조회 실패" }, { status: 500 });
        }

        return NextResponse.json({ items: items || [] });
    } catch (error) {
        console.error("[furniture/inventory] Unexpected error:", error);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
