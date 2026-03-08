/**
 * GET /api/chat/usage
 * 현재 유저의 AI 펫톡 일일 사용량 조회 (서버 DB 기반)
 * 클라이언트 초기 로딩 시 서버 기준 남은 횟수를 동기화하기 위해 사용
 */

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/lib/supabase-server";
import { FREE_LIMITS } from "@/config/constants";

function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

export async function GET() {
    try {
        // 인증 체크
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json(
                { error: "로그인이 필요합니다." },
                { status: 401 }
            );
        }

        const supabase = getSupabase();
        if (!supabase) {
            // DB 접속 불가 시 기본값 반환
            return NextResponse.json({
                remaining: FREE_LIMITS.DAILY_CHATS,
                limit: FREE_LIMITS.DAILY_CHATS,
                used: 0,
            });
        }

        // 프리미엄 상태 확인
        const { data: profile } = await supabase
            .from("profiles")
            .select("is_premium, premium_expires_at")
            .eq("id", user.id)
            .single();

        const isPremium = profile?.is_premium &&
            (!profile.premium_expires_at || new Date(profile.premium_expires_at) > new Date());

        // 일일 제한 (프리미엄: 1000, 무료: 10)
        const limit = isPremium ? 1000 : FREE_LIMITS.DAILY_CHATS;

        // KST 기준 오늘 날짜 계산
        const now = new Date();
        const kstOffset = 9 * 60 * 60 * 1000;
        const kstDate = new Date(now.getTime() + kstOffset)
            .toISOString()
            .split("T")[0];

        // DB에서 오늘 사용량 조회 (증가 없이 읽기만)
        const { data: existing } = await supabase
            .from("user_daily_usage")
            .select("request_count")
            .eq("identifier", user.id)
            .eq("usage_type", "ai_chat")
            .eq("usage_date", kstDate)
            .maybeSingle();

        const used = existing?.request_count || 0;
        const remaining = Math.max(0, limit - used);

        return NextResponse.json({
            remaining,
            limit,
            used,
        });
    } catch (error) {
        console.error("[chat/usage]", error instanceof Error ? error.message : error);
        return NextResponse.json(
            { error: "사용량 조회 중 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}
