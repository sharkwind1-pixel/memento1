/**
 * 미니홈피 방문 기록 API
 * POST: 방문 기록 (24시간 내 중복 방지)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, getAuthUser } from "@/lib/supabase-server";
import { getClientIP } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await params;
        const currentUser = await getAuthUser();
        const clientIP = await getClientIP();

        // 자기 방문은 카운트하지 않음
        if (currentUser?.id === userId) {
            return NextResponse.json({ success: true, counted: false });
        }

        const supabase = await createServerSupabase();

        // 24시간 내 중복 방문 확인 (IP + user_id 기반)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const duplicateQuery = supabase
            .from("minihompy_visits")
            .select("id")
            .eq("owner_id", userId)
            .gte("visited_at", oneDayAgo);

        if (currentUser) {
            duplicateQuery.eq("visitor_id", currentUser.id);
        } else {
            duplicateQuery.eq("visitor_ip", clientIP);
        }

        const { data: duplicate } = await duplicateQuery.maybeSingle();

        if (duplicate) {
            return NextResponse.json({ success: true, counted: false });
        }

        // 방문 기록 추가
        await supabase.from("minihompy_visits").insert({
            owner_id: userId,
            visitor_id: currentUser?.id || null,
            visitor_ip: clientIP,
        });

        // today/total 카운터 업데이트
        const today = new Date().toISOString().split("T")[0];

        const { data: settings } = await supabase
            .from("minihompy_settings")
            .select("today_date, today_visitors, total_visitors")
            .eq("user_id", userId)
            .maybeSingle();

        if (settings) {
            const isSameDay = settings.today_date === today;
            await supabase
                .from("minihompy_settings")
                .update({
                    today_visitors: isSameDay ? (settings.today_visitors || 0) + 1 : 1,
                    total_visitors: (settings.total_visitors || 0) + 1,
                    today_date: today,
                })
                .eq("user_id", userId);
        }

        return NextResponse.json({ success: true, counted: true });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
