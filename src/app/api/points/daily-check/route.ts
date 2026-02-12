/**
 * 일일 출석 체크 API
 * POST: 오늘 첫 로그인 시 출석 포인트 적립
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

export async function POST() {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json(
                { error: "로그인이 필요합니다" },
                { status: 401 }
            );
        }

        const supabase = getSupabase();

        // RPC로 출석 체크 (원자적 처리)
        const { data, error } = await supabase.rpc("daily_login_check", {
            p_user_id: user.id,
        });

        if (error) {
            console.error("[Daily Check] RPC 에러:", error.message);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: data?.success ?? false,
            reason: data?.reason,
            points: data?.points ?? 0,
            earned: data?.earned ?? 0,
        });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
