/**
 * 텔레그램 알림 테스트 API
 * GET /api/admin/telegram-test
 * 관리자만 접근 가능
 */

import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase-server";
import { ADMIN_EMAILS } from "@/config/constants";
import { notifyTest } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function GET() {
    const user = await getAuthUser();
    if (!user || !ADMIN_EMAILS.includes(user.email || "")) {
        return NextResponse.json({ error: "관리자 전용" }, { status: 403 });
    }

    const result = await notifyTest();
    return NextResponse.json({
        success: result,
        message: result ? "텔레그램 알림 전송 성공" : "전송 실패 (환경변수 확인)",
    });
}
