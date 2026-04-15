/**
 * /api/admin/open100
 * GET — 관리자 전용. 이벤트 진행률 + 지급자 목록.
 */

import { NextResponse } from "next/server";
import { createAdminSupabase, getAuthUser } from "@/lib/supabase-server";
import { ADMIN_EMAILS, OPEN100_LIMIT } from "@/config/constants";

export const dynamic = "force-dynamic";

export async function GET() {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 이메일/DB 둘 다 체크 (AuthContext 패턴과 일치)
    const admin = createAdminSupabase();
    const { data: profile } = await admin
        .from("profiles")
        .select("is_admin, email")
        .eq("id", user.id)
        .single();

    const emailAdmin = ADMIN_EMAILS.includes(profile?.email ?? user.email ?? "");
    const dbAdmin = profile?.is_admin === true;
    if (!emailAdmin && !dbAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 지급자 목록 (최신순)
    const { data: awardedList, error } = await admin
        .from("profiles")
        .select("id, email, nickname, open100_awarded_at, points")
        .not("open100_awarded_at", "is", null)
        .order("open100_awarded_at", { ascending: false })
        .limit(100);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const awarded = awardedList?.length ?? 0;
    return NextResponse.json({
        awarded,
        remaining: Math.max(0, OPEN100_LIMIT - awarded),
        isClosed: awarded >= OPEN100_LIMIT,
        limit: OPEN100_LIMIT,
        users: awardedList || [],
    });
}
