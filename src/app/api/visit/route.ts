/**
 * /api/visit — 방문 비콘 (게스트 포함)
 *
 * 클라이언트가 브라우저 세션당 1회 호출. visitor_id(localStorage uuid, 고유 방문자) +
 * 로그인 시 user_id를 visit_logs에 기록 → 관리자 대시보드에서 비로그인(게스트) 접속까지 집계.
 *
 * - 인증 불필요(게스트 허용). authFetch로 호출하면 로그인 유저는 토큰이 실려 user_id가 연결됨.
 * - 분석 실패가 사용자 경험을 막지 않도록 항상 fail-open.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, getAuthUser } from "@/lib/supabase-server";
import { getClientIP, checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        const ip = await getClientIP();
        const rl = checkRateLimit(ip, "general");
        if (!rl.allowed) return NextResponse.json({ ok: false }, { status: 429 });

        let visitorId = "";
        let path = "";
        try {
            const body = await request.json();
            visitorId = String(body?.visitorId || "").slice(0, 64);
            path = String(body?.path || "").slice(0, 200);
        } catch {
            // body 없으면 무시
        }
        if (!visitorId) return NextResponse.json({ ok: false }, { status: 400 });

        // 로그인 유저면 user_id 연결(토큰 있을 때). 게스트면 null.
        const user = await getAuthUser().catch(() => null);

        // IP는 저장하지 않음(쿠키 동의 배너의 "익명 사용 데이터" 약속 준수). 식별자는 무작위 visitor_id뿐.
        const admin = createAdminSupabase();
        await admin.from("visit_logs").insert({
            visitor_id: visitorId,
            user_id: user?.id ?? null,
            path: path || null,
        });

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: true });
    }
}
