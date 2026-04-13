/**
 * 일일 출석 체크 API
 * POST: 오늘 첫 로그인 시 출석 포인트 적립
 *
 * 보안: 세션 기반 인증 + VPN 체크 + Rate Limit
 */

import { NextResponse } from "next/server";
import { createServerSupabase, getAuthUser } from "@/lib/supabase-server";
import { getClientIP, checkRateLimit, getRateLimitHeaders, checkVPN, getVPNBlockResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST() {
    try {
        // 1. Rate Limit
        const clientIP = await getClientIP();
        const rateLimit = checkRateLimit(clientIP, "write");
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
                { status: 429, headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn) }
            );
        }

        // 2. VPN 체크 (포인트 어뷰징 방지)
        const vpnResult = await checkVPN(clientIP);
        if (vpnResult.isVPN) {
            const vpnErr = getVPNBlockResponse();
            return NextResponse.json({ error: vpnErr.error }, { status: 403 });
        }

        // 3. 인증
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json(
                { error: "로그인이 필요합니다" },
                { status: 401 }
            );
        }

        const supabase = await createServerSupabase();

        // RPC로 출석 체크 (원자적 처리)
        const { data, error } = await supabase.rpc("daily_login_check", {
            p_user_id: user.id,
        });

        if (error) {
            console.error("[Daily Check] RPC 에러:", error);
            return NextResponse.json({ error: "포인트 처리 중 오류가 발생했습니다" }, { status: 500 });
        }

        // 연속 출석 정보 조회
        const row = Array.isArray(data) ? data[0] : data;
        let streak = 0;
        if (row?.success) {
            const { data: profile } = await supabase
                .from("profiles")
                .select("login_streak")
                .eq("id", user.id)
                .single();
            streak = profile?.login_streak ?? 0;
        }

        return NextResponse.json({
            success: row?.success ?? false,
            reason: row?.reason,
            points: row?.points ?? 0,
            earned: row?.earned ?? 0,
            streak,
        });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
