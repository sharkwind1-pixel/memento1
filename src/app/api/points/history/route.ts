/**
 * 포인트 내역 조회 API
 * GET: 사용자의 포인트 획득 기록 (페이지네이션)
 *
 * 보안: 세션 기반 인증
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/lib/supabase-server";
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
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json(
                { error: "로그인이 필요합니다" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const limit = Math.min(
            parseInt(searchParams.get("limit") || String(POINTS.HISTORY_PAGE_SIZE)),
            50
        );
        const offset = parseInt(searchParams.get("offset") || "0");

        const supabase = getSupabase();

        const { data, error, count } = await supabase
            .from("point_transactions")
            .select("*", { count: "exact" })
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error("[Points History] 조회 에러:", error.message);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // snake_case → camelCase 변환
        const transactions = (data || []).map((tx) => ({
            id: tx.id,
            userId: tx.user_id,
            actionType: tx.action_type,
            pointsEarned: tx.points_earned,
            metadata: tx.metadata,
            createdAt: tx.created_at,
        }));

        return NextResponse.json({
            transactions,
            total: count || 0,
            hasMore: (offset + limit) < (count || 0),
        });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
