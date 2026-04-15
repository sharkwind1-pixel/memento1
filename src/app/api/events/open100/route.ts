/**
 * /api/events/open100
 * GET — Open 100 이벤트 현재 진행률 (awarded / remaining / isClosed)
 *
 * 비인증 접근 허용: 메인 배너에서 비로그인 유저에게도 "남은 자리 N/100" 표시용.
 * 캐시는 짧게만 (5초) — 실시간 카운트다운 체감 유지.
 */

import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getOpen100Status } from "@/lib/open100";

export const dynamic = "force-dynamic";
export const revalidate = 5;

export async function GET() {
    try {
        const supabase = await createServerSupabase();
        const status = await getOpen100Status(supabase);
        return NextResponse.json(status, {
            headers: { "Cache-Control": "public, max-age=5, s-maxage=5" },
        });
    } catch (err) {
        console.error("[events/open100] status error:", err instanceof Error ? err.message : err);
        return NextResponse.json(
            { awarded: 0, remaining: 100, isClosed: false, limit: 100, error: "status_failed" },
            { status: 200 },
        );
    }
}
