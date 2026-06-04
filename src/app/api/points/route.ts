/**
 * 사용자 포인트 조회 API
 * GET: 현재 포인트 조회
 *
 * 보안: 세션 기반 인증
 */

import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { withAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export const GET = withAuth(async ({ user }) => {
    try {
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
}, { message: "로그인이 필요합니다" });
