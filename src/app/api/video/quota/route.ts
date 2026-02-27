/**
 * 영상 생성 쿼터 조회 API
 * GET: 현재 사용자의 영상 생성 잔여 횟수 및 구독 등급 조회
 *
 * 보안:
 * - 세션 기반 인증 필수
 *
 * 쿼터 정책:
 * - 무료 회원: 평생 1회 (FREE_LIFETIME)
 * - 프리미엄 회원: 월 3회 (BASIC_MONTHLY)
 */

import { NextResponse } from "next/server";
import { createServerSupabase, getAuthUser } from "@/lib/supabase-server";
import { VIDEO } from "@/config/constants";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        // 1. 인증 확인
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json(
                { error: "로그인이 필요합니다." },
                { status: 401 }
            );
        }

        const supabase = await createServerSupabase();

        // 2. 프리미엄 여부 확인
        const { data: profile } = await supabase
            .from("profiles")
            .select("is_premium, premium_expires_at")
            .eq("id", user.id)
            .single();

        const isPremium = profile?.is_premium &&
            (!profile.premium_expires_at || new Date(profile.premium_expires_at) > new Date());

        // 3. 이번 달 생성 횟수 (실패 제외)
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const { count: monthlyCount } = await supabase
            .from("video_generations")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .neq("status", "failed")
            .gte("created_at", monthStart);

        // 4. 전체 생성 횟수 (실패 제외)
        const { count: lifetimeCount } = await supabase
            .from("video_generations")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .neq("status", "failed");

        // 5. 쿼터 응답 구성
        const safeMonthlyCount = monthlyCount ?? 0;
        const safeLifetimeCount = lifetimeCount ?? 0;

        if (isPremium) {
            // 프리미엄 회원: 월간 쿼터 기준
            return NextResponse.json({
                used: safeMonthlyCount,
                limit: VIDEO.BASIC_MONTHLY,
                tier: "basic",
                isLifetimeFree: false,
                lifetimeFreeUsed: true,
            });
        } else {
            // 무료 회원: 평생 쿼터 기준
            return NextResponse.json({
                used: safeLifetimeCount,
                limit: VIDEO.FREE_LIFETIME,
                tier: "free",
                isLifetimeFree: true,
                lifetimeFreeUsed: safeLifetimeCount >= VIDEO.FREE_LIFETIME,
            });
        }
    } catch (err) {
        console.error("[Video Quota] 서버 오류:", err);
        return NextResponse.json(
            { error: "쿼터 조회 중 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}
