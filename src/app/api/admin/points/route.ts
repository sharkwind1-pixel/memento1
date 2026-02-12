/**
 * 관리자 포인트 지급 API
 * POST: 관리자가 특정 유저에게 포인트 지급
 *
 * 보안: 세션 기반 인증 + 관리자 권한 검증
 * DB: increment_user_points RPC (SECURITY DEFINER)로 원자적 처리
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/lib/supabase-server";
import { ADMIN_EMAILS } from "@/config/constants";

export const dynamic = "force-dynamic";

function getServiceSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase 환경변수 없음 (SERVICE_ROLE_KEY 필요)");
    return createClient(url, key);
}

export async function POST(request: NextRequest) {
    try {
        // 1. 인증 확인
        const adminUser = await getAuthUser();
        if (!adminUser) {
            return NextResponse.json(
                { error: "로그인이 필요합니다" },
                { status: 401 }
            );
        }

        // 2. 관리자 권한 확인 (이메일 하드코딩 + DB is_admin)
        const supabase = getServiceSupabase();

        const isEmailAdmin = ADMIN_EMAILS.includes(adminUser.email || "");
        let isDbAdmin = false;

        if (!isEmailAdmin) {
            const { data: profile } = await supabase
                .from("profiles")
                .select("is_admin")
                .eq("id", adminUser.id)
                .single();
            isDbAdmin = profile?.is_admin === true;
        }

        if (!isEmailAdmin && !isDbAdmin) {
            return NextResponse.json(
                { error: "관리자 권한이 필요합니다" },
                { status: 403 }
            );
        }

        // 3. 요청 파라미터 파싱
        const body = await request.json();
        const { targetUserId, points, reason } = body as {
            targetUserId: string;
            points: number;
            reason?: string;
        };

        if (!targetUserId || !points || points <= 0) {
            return NextResponse.json(
                { error: "유효하지 않은 요청입니다 (targetUserId, points 필수)" },
                { status: 400 }
            );
        }

        if (points > 1000000) {
            return NextResponse.json(
                { error: "최대 1,000,000P까지 지급 가능합니다" },
                { status: 400 }
            );
        }

        // 4. RPC로 포인트 지급 (원자적 처리 + 트랜잭션 기록)
        const metadata = {
            awarded_by: adminUser.id,
            awarded_by_email: adminUser.email || "",
            reason: reason || "관리자 지급",
        };

        const { data, error } = await supabase.rpc("increment_user_points", {
            p_user_id: targetUserId,
            p_action_type: "admin_award",
            p_points: points,
            p_daily_cap: null,      // 관리자 지급은 일일 제한 없음
            p_one_time: false,      // 중복 지급 허용
            p_metadata: JSON.stringify(metadata),
        });

        if (error) {
            console.error("[Admin Points] RPC 에러:", error.message);
            return NextResponse.json(
                { error: "포인트 지급에 실패했습니다: " + error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            awarded: points,
            newTotal: data?.points || 0,
            targetUserId,
        });
    } catch (err) {
        console.error("[Admin Points] 서버 오류:", err);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
