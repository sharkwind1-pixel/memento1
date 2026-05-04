/**
 * 베타 코드 사용 API
 * POST /api/beta/redeem  { code }
 *
 * - 인증 필수
 * - DB에서 atomic하게 redeem_beta_code RPC 호출
 *   · is_beta_tester = true
 *   · beta_redeemed_at = now
 *   · beta_discount_until = now + 3 months
 *   · beta_code_used = code
 *   · 포인트 +3000 지급 (point_transactions 기록)
 *   · 코드 used_count++
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, getAuthUser } from "@/lib/supabase-server";
import { getClientIP, checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
    try {
        const clientIP = await getClientIP();
        const rateLimit = checkRateLimit(clientIP, "write");
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
                { status: 429, headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn) }
            );
        }

        const body = await request.json().catch(() => ({}));
        const code = String(body?.code ?? "").trim().toUpperCase();
        if (!code || code.length < 4 || code.length > 32) {
            return NextResponse.json({ error: "올바른 베타 코드를 입력해주세요." }, { status: 400 });
        }

        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
        }

        const supabase = await createServerSupabase();

        // RPC 호출 (SECURITY DEFINER, 내부에서 auth.uid() 검증)
        const { data, error } = await supabase.rpc("redeem_beta_code", { _code: code });
        if (error) {
            const msg = error.message ?? "베타 코드 사용에 실패했습니다.";
            const code409 = msg.includes("already") || msg.includes("used") ? 409 : 400;
            return NextResponse.json({ error: msg }, { status: code409 });
        }

        return NextResponse.json({ success: true, result: data });
    } catch (err) {
        console.error("[beta/redeem] 에러:", err instanceof Error ? err.message : err);
        return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
    }
}
