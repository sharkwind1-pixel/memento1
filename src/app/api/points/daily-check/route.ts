/**
 * 일일 출석 체크 API
 * POST: 오늘 첫 로그인 시 출석 포인트 적립
 *
 * 보안: 세션 기반 인증 + VPN 체크 + Rate Limit
 */

import { NextResponse } from "next/server";
import { createAdminSupabase, getAuthUser } from "@/lib/supabase-server";
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

        // admin 클라 — daily_login_check는 service_role 전용 잠금 (위에서 getAuthUser로 본인 검증, 본인 id만 전달)
        const supabase = createAdminSupabase();

        // RPC로 출석 체크 (원자적 처리)
        const { data, error } = await supabase.rpc("daily_login_check", {
            p_user_id: user.id,
        });

        if (error) {
            console.error("[Daily Check] RPC 에러:", error);
            return NextResponse.json({ error: "포인트 처리 중 오류가 발생했습니다" }, { status: 500 });
        }

        // daily_login_check는 SETOF(TABLE) 반환 → data가 단일 행 배열. 언랩 없이는 항상 success:false가 되어
        // 출석 토스트/포인트 갱신이 사일런트 실패하던 잠복버그 (2026-06-10 재검증 발견).
        const row = Array.isArray(data) ? data[0] : data;
        return NextResponse.json({
            success: row?.success ?? false,
            reason: row?.reason,
            points: row?.points ?? 0,
            earned: row?.earned ?? 0,
        });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
