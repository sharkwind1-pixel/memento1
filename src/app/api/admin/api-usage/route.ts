/**
 * 관리자 API 사용량 조회
 * GET: OpenAI + fal.ai 사용량 통계 및 예상 비용
 */

import { NextResponse } from "next/server";
import { getAuthUser, createAdminSupabase } from "@/lib/supabase-server";
import { ADMIN_EMAILS } from "@/config/constants";

export const dynamic = "force-dynamic";

const COST_PER_CHAT_USD = 0.005;
const COST_PER_VIDEO_USD = 0.80;

async function verifyAdmin() {
    const user = await getAuthUser();
    if (!user) return null;

    const isEmailAdmin = ADMIN_EMAILS.includes(user.email || "");
    if (isEmailAdmin) return user;

    const adminSupabase = createAdminSupabase();
    const { data: profile } = await adminSupabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

    if (profile?.is_admin) return user;
    return null;
}

export async function GET() {
    try {
        const adminUser = await verifyAdmin();
        if (!adminUser) {
            return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 });
        }

        const now = new Date();
        const kstOffset = 9 * 60 * 60 * 1000;
        const kstNow = new Date(now.getTime() + kstOffset);
        const todayStr = kstNow.toISOString().split("T")[0];
        const monthStartStr = `${kstNow.getFullYear()}-${String(kstNow.getMonth() + 1).padStart(2, "0")}-01`;

        const adminSupabase = createAdminSupabase();

        const [
            chatTodayResult,
            chatMonthResult,
            videoTodayResult,
            videoMonthResult,
        ] = await Promise.all([
            adminSupabase
                .from("chat_messages")
                .select("*", { count: "exact", head: true })
                .gte("created_at", todayStr)
                .eq("role", "user"),
            adminSupabase
                .from("chat_messages")
                .select("*", { count: "exact", head: true })
                .gte("created_at", monthStartStr)
                .eq("role", "user"),
            adminSupabase
                .from("video_generations")
                .select("*", { count: "exact", head: true })
                .gte("created_at", todayStr)
                .eq("status", "completed"),
            adminSupabase
                .from("video_generations")
                .select("*", { count: "exact", head: true })
                .gte("created_at", monthStartStr)
                .eq("status", "completed"),
        ]);

        const chatToday = chatTodayResult.count || 0;
        const chatMonth = chatMonthResult.count || 0;
        const videoToday = videoTodayResult.count || 0;
        const videoMonth = videoMonthResult.count || 0;

        const openaiMonthlyBudget = process.env.OPENAI_MONTHLY_BUDGET
            ? parseFloat(process.env.OPENAI_MONTHLY_BUDGET)
            : null;
        const falMonthlyBudget = process.env.FAL_MONTHLY_BUDGET
            ? parseFloat(process.env.FAL_MONTHLY_BUDGET)
            : null;

        return NextResponse.json({
            openai: {
                todayCount: chatToday,
                monthCount: chatMonth,
                estimatedMonthlyCostUsd: Math.round(chatMonth * COST_PER_CHAT_USD * 100) / 100,
                budgetUsd: openaiMonthlyBudget,
            },
            fal: {
                todayCount: videoToday,
                monthCount: videoMonth,
                estimatedMonthlyCostUsd: Math.round(videoMonth * COST_PER_VIDEO_USD * 100) / 100,
                budgetUsd: falMonthlyBudget,
            },
        });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
