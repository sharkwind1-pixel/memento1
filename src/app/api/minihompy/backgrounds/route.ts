/**
 * 배경 카탈로그 API
 * GET: 배경 테마 목록 + 보유 여부
 */

import { NextResponse } from "next/server";
import { createServerSupabase, getAuthUser } from "@/lib/supabase-server";
import { BACKGROUND_CATALOG } from "@/data/minihompyBackgrounds";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const user = await getAuthUser();

        let ownedSlugs: string[] = [];

        if (user) {
            const supabase = await createServerSupabase();
            const { data: owned } = await supabase
                .from("minihompy_user_backgrounds")
                .select("background_slug")
                .eq("user_id", user.id);

            ownedSlugs = (owned || []).map(o => o.background_slug);
        }

        const catalog = BACKGROUND_CATALOG.map(bg => ({
            ...bg,
            owned: bg.price === 0 || ownedSlugs.includes(bg.slug),
        }));

        return NextResponse.json({ catalog });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
