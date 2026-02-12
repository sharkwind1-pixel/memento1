/**
 * 포인트 랭킹 조회 API
 * GET: 상위 포인트 사용자 목록
 *
 * 공개 API (인증 불필요)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { POINTS } from "@/config/constants";

export const dynamic = "force-dynamic";

function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Supabase 환경변수 없음");
    return createClient(url, key);
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = Math.min(
            parseInt(searchParams.get("limit") || String(POINTS.LEADERBOARD_SIZE)),
            100
        );

        const supabase = getSupabase();

        const { data, error } = await supabase
            .from("profiles")
            .select("id, nickname, points, avatar_url")
            .gt("points", 0)
            .order("points", { ascending: false })
            .limit(limit);

        if (error) {
            console.error("[Leaderboard] 조회 에러:", error.message);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const leaderboard = (data || []).map((user, index) => ({
            rank: index + 1,
            userId: user.id,
            nickname: user.nickname || "익명",
            points: user.points || 0,
            avatarUrl: user.avatar_url,
        }));

        return NextResponse.json({ leaderboard });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
