/**
 * 신고 API
 * POST: 게시물/댓글/회원 신고
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, getAuthUser } from "@/lib/supabase-server";
import { getClientIP, checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        const clientIP = await getClientIP();
        const rateLimit = checkRateLimit(clientIP, "write");
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "요청이 너무 많습니다" },
                { status: 429, headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn) }
            );
        }

        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
        }

        const body = await request.json();
        const { targetType, targetId, reason, description } = body;

        if (!targetType || !targetId || !reason) {
            return NextResponse.json({ error: "필수 항목이 누락되었습니다" }, { status: 400 });
        }

        const supabase = createAdminSupabase();

        const { error } = await supabase.from("reports").insert({
            reporter_id: user.id,
            target_type: targetType,
            target_id: targetId,
            reason,
            description: description?.trim() || null,
        });

        if (error) {
            if (error.code === "23505") {
                return NextResponse.json({ error: "이미 신고한 콘텐츠입니다" }, { status: 409 });
            }
            console.error("[reports] INSERT error:", error.message);
            return NextResponse.json({ error: "신고 처리에 실패했습니다" }, { status: 500 });
        }

        // 텔레그램 관리자 알림 (비동기, 실패 무시)
        import("@/lib/telegram").then(({ notifyReport }) =>
            notifyReport({ reporterEmail: user.email, targetType, targetId, reason })
        ).catch(() => {});

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
