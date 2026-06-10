/**
 * 관리자 포인트 지급 API
 * POST: 관리자가 특정 유저에게 포인트 지급
 *
 * 보안: 세션 기반 인증 + 관리자 권한 검증
 * DB: service_role로 직접 profiles UPDATE (트리거 우회)
 *     + point_transactions에 거래 내역 기록
 *
 * 참고: increment_user_points RPC는 auth.uid() != p_user_id 체크가 있어서
 *       관리자가 다른 유저에게 포인트를 줄 때 unauthorized 반환됨.
 *       따라서 service_role로 직접 처리.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, createAdminSupabase } from "@/lib/supabase-server";
import { ADMIN_EMAILS } from "@/config/constants";

export const dynamic = "force-dynamic";

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
        const adminSupabase = createAdminSupabase();

        const isEmailAdmin = ADMIN_EMAILS.includes(adminUser.email || "");
        let isDbAdmin = false;

        if (!isEmailAdmin) {
            const { data: profile } = await adminSupabase
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

        // 3. 요청 파라미터 파싱 (points: 양수=지급 / 음수=차감)
        const body = await request.json();
        const { targetUserId, points, reason } = body as {
            targetUserId: string;
            points: number;
            reason?: string;
        };

        if (
            !targetUserId ||
            typeof points !== "number" ||
            !Number.isFinite(points) ||
            !Number.isInteger(points) ||
            points === 0
        ) {
            return NextResponse.json(
                { error: "유효하지 않은 요청입니다 (targetUserId, points(0이 아닌 정수) 필수)" },
                { status: 400 }
            );
        }

        if (Math.abs(points) > 1000000) {
            return NextResponse.json(
                { error: "한 번에 최대 1,000,000P까지 가감 가능합니다" },
                { status: 400 }
            );
        }

        const isDeduct = points < 0;

        // 4. 원자 RPC로 포인트 가감 (read-then-write race 제거 + GREATEST(0) 클램프 + 거래기록 일괄).
        //    SECURITY DEFINER지만 service_role 호출이라 protect_sensitive_profile_columns 트리거 통과.
        const { data: rpcData, error: rpcError } = await adminSupabase.rpc("admin_adjust_points", {
            p_user_id: targetUserId,
            p_delta: points,
            p_action_type: isDeduct ? "admin_deduct" : "admin_award",
            p_reason: reason || (isDeduct ? "관리자 차감" : "관리자 지급"),
            p_admin_id: adminUser.id,
            p_admin_email: adminUser.email || "",
        });

        if (rpcError) {
            if ((rpcError.message || "").includes("target_not_found")) {
                return NextResponse.json({ error: "대상 유저를 찾을 수 없습니다" }, { status: 404 });
            }
            console.error("[Admin Points] RPC 에러:", rpcError);
            return NextResponse.json(
                { error: isDeduct ? "포인트 차감에 실패했습니다" : "포인트 지급에 실패했습니다" },
                { status: 500 }
            );
        }

        const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
        const newPoints = Number(row?.new_points ?? 0);
        const actualDelta = Number(row?.actual_delta ?? 0);

        return NextResponse.json({
            success: true,
            delta: actualDelta,
            awarded: actualDelta, // 하위 호환(기존 클라가 awarded 참조해도 동작)
            newTotal: newPoints,
            targetUserId,
        });
    } catch (err) {
        console.error("[Admin Points] 서버 오류:", err);
        return NextResponse.json({ error: "포인트 처리에 실패했습니다" }, { status: 500 });
    }
}
