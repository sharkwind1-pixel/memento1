/**
 * 관리자 방문자 통계 (게스트 포함)
 * GET: visit_logs를 get_visit_stats RPC로 일별 집계 → 오늘 지표 + 최근 7일 추이.
 *
 * 보안: 관리자(ADMIN_EMAILS 또는 profiles.is_admin)만. visit_logs는 RLS로 service_role 전용이라
 *       admin 클라이언트로만 접근.
 */

import { NextResponse } from "next/server";
import { getAuthUser, createAdminSupabase } from "@/lib/supabase-server";
import { ADMIN_EMAILS } from "@/config/constants";

export const dynamic = "force-dynamic";

async function verifyAdmin() {
    const user = await getAuthUser();
    if (!user) return null;
    if (ADMIN_EMAILS.includes(user.email || "")) return user;
    const admin = createAdminSupabase();
    const { data } = await admin
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();
    return data?.is_admin ? user : null;
}

interface VisitStatRow {
    day: string; // YYYY-MM-DD (KST)
    total_visits: number;
    unique_visitors: number;
    guest_visitors: number;
    member_visitors: number;
}

export async function GET() {
    try {
        const adminUser = await verifyAdmin();
        if (!adminUser) {
            return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 });
        }

        const admin = createAdminSupabase();
        const { data, error } = await admin.rpc("get_visit_stats", { p_days: 7 });
        if (error) throw error;

        const rows = (data || []) as VisitStatRow[];

        // 가입 전환 퍼널 (최근 7일, 단계별 고유 방문자 → drop-off)
        const { data: funnelData } = await admin.rpc("get_funnel_stats", { p_days: 7 });
        const funnelMap = new Map(
            ((funnelData || []) as { event: string; visitors: number }[]).map((r) => [r.event, Number(r.visitors)]),
        );
        const FUNNEL_STEPS: Array<{ key: string; label: string }> = [
            { key: "landing", label: "방문" },
            { key: "scroll", label: "둘러봄" },
            { key: "cta", label: "가입 클릭" },
            // signup = 세션 내 인증 완료(신규가입 + 게스트의 재로그인 포함). 신규가입만 아님 → 정직한 라벨.
            { key: "signup", label: "로그인·가입" },
        ];
        const funnel = FUNNEL_STEPS.map((s) => ({ step: s.label, visitors: funnelMap.get(s.key) ?? 0 }));

        // KST 기준 오늘/최근 7일 (api-usage와 동일한 +9h 트릭)
        const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
        const todayStr = kstNow.toISOString().split("T")[0];
        const todayRow = rows.find((r) => r.day === todayStr);

        const daily = Array.from({ length: 7 }, (_, idx) => {
            const d = new Date(kstNow);
            d.setDate(d.getDate() - (6 - idx));
            const ds = d.toISOString().split("T")[0];
            const r = rows.find((x) => x.day === ds);
            return {
                date: `${d.getMonth() + 1}/${d.getDate()}`,
                방문자: Number(r?.unique_visitors ?? 0),
                비로그인: Number(r?.guest_visitors ?? 0),
            };
        });

        return NextResponse.json({
            today: {
                totalVisits: Number(todayRow?.total_visits ?? 0),
                uniqueVisitors: Number(todayRow?.unique_visitors ?? 0),
                guestVisitors: Number(todayRow?.guest_visitors ?? 0),
                memberVisitors: Number(todayRow?.member_visitors ?? 0),
            },
            daily,
            funnel,
        });
    } catch {
        return NextResponse.json({ error: "방문자 통계 조회 실패" }, { status: 500 });
    }
}
