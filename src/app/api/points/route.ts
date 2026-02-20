/**
 * 사용자 포인트 조회 API
 * GET: 현재 포인트 조회
 *
 * 보안: 세션 기반 인증
 */

import { NextResponse } from "next/server";
import { createServerSupabase, getAuthUser } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json(
                { error: "로그인이 필요합니다" },
                { status: 401 }
            );
        }

        const supabase = await createServerSupabase();

        const { data: profile } = await supabase
            .from("profiles")
            .select("points, total_points_earned")
            .eq("id", user.id)
            .single();

        if (!profile) {
            return NextResponse.json(
                { error: "사용자를 찾을 수 없습니다" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            userId: user.id,
            points: profile.points || 0,
            totalEarned: profile.total_points_earned || 0,
        });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
