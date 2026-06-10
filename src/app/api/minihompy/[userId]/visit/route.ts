/**
 * 미니홈피 방문 기록 API
 * POST: 방문 기록 (24시간 내 중복 방지)
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, getAuthUser } from "@/lib/supabase-server";
import { getClientIP, checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await params;
        const currentUser = await getAuthUser();
        const clientIP = await getClientIP();

        // 봇 행 적립 방지 (비인증 호출 가능 엔드포인트)
        const rl = checkRateLimit(clientIP, "general");
        if (!rl.allowed) return NextResponse.json({ success: false }, { status: 429 });

        // 자기 방문은 카운트하지 않음
        if (currentUser?.id === userId) {
            return NextResponse.json({ success: true, counted: false });
        }

        // admin 클라 필수: 세션(RLS) 클라로는 dedup SELECT(visits_select=owner-only)가 항상 0행이라
        // 중복방지 무력 + settings UPDATE(owner-only)가 silent fail → 카운터가 영원히 0이던 잠복버그.
        const admin = createAdminSupabase();

        // 24시간 내 중복 방문 확인 (IP + user_id 기반)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const duplicateQuery = admin
            .from("minihompy_visits")
            .select("id")
            .eq("owner_id", userId)
            .gte("visited_at", oneDayAgo);

        if (currentUser) {
            duplicateQuery.eq("visitor_id", currentUser.id);
        } else {
            duplicateQuery.eq("visitor_ip", clientIP);
        }

        const { data: duplicate } = await duplicateQuery.limit(1).maybeSingle();

        if (duplicate) {
            return NextResponse.json({ success: true, counted: false });
        }

        // 방문 기록 추가
        await admin.from("minihompy_visits").insert({
            owner_id: userId,
            visitor_id: currentUser?.id || null,
            visitor_ip: clientIP,
        });

        // today/total 카운터 업데이트 (KST 기준)
        const kstOffset = 9 * 60 * 60 * 1000;
        const today = new Date(Date.now() + kstOffset).toISOString().split("T")[0];

        const { data: settings } = await admin
            .from("minihompy_settings")
            .select("today_date, today_visitors, total_visitors")
            .eq("user_id", userId)
            .maybeSingle();

        // upsert: settings 행이 없는 유저(설정 한 번도 안 연 54%)도 카운터 동작 (없으면 1/1로 생성, 나머지 컬럼 default)
        const isSameDay = settings?.today_date === today;
        await admin
            .from("minihompy_settings")
            .upsert({
                user_id: userId,
                today_visitors: isSameDay ? (settings?.today_visitors || 0) + 1 : 1,
                total_visitors: (settings?.total_visitors || 0) + 1,
                today_date: today,
            }, { onConflict: "user_id" });

        return NextResponse.json({ success: true, counted: true });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
