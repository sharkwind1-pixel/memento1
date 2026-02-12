/**
 * 사용자 포인트 조회 API
 * GET: 현재 포인트 + 랭킹
 *
 * 보안: 세션 기반 인증
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Supabase 환경변수 없음");
    return createClient(url, key);
}

export async function GET() {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json(
                { error: "로그인이 필요합니다" },
                { status: 401 }
            );
        }

        const supabase = getSupabase();

        // RPC로 포인트 + 랭킹 한번에 조회
        const { data, error } = await supabase.rpc("get_user_points_with_rank", {
            p_user_id: user.id,
        });

        if (error) {
            console.error("[Points API] RPC 에러:", error.message);

            // RPC 없으면 직접 조회 (폴백)
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

            // 랭킹 계산
            const { count: higherCount } = await supabase
                .from("profiles")
                .select("id", { count: "exact", head: true })
                .gt("points", profile.points || 0);

            return NextResponse.json({
                userId: user.id,
                points: profile.points || 0,
                totalEarned: profile.total_points_earned || 0,
                rank: (higherCount || 0) + 1,
            });
        }

        return NextResponse.json({
            userId: data?.user_id || user.id,
            points: data?.points || 0,
            totalEarned: data?.total_earned || 0,
            rank: data?.rank || 0,
        });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
