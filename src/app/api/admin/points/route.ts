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

        // 4. service_role로 직접 포인트 업데이트 (트리거 우회)
        // 현재 포인트 조회
        const { data: currentProfile, error: fetchError } = await adminSupabase
            .from("profiles")
            .select("points, total_points_earned")
            .eq("id", targetUserId)
            .single();

        if (fetchError || !currentProfile) {
            return NextResponse.json(
                { error: "대상 유저를 찾을 수 없습니다" },
                { status: 404 }
            );
        }

        const newPoints = (currentProfile.points ?? 0) + points;
        const newTotalEarned = (currentProfile.total_points_earned ?? 0) + points;

        // 포인트 업데이트 (service_role → 트리거 통과)
        const { error: updateError } = await adminSupabase
            .from("profiles")
            .update({
                points: newPoints,
                total_points_earned: newTotalEarned,
            })
            .eq("id", targetUserId);

        if (updateError) {
            console.error("[Admin Points] UPDATE 에러:", updateError);
            return NextResponse.json(
                { error: "포인트 지급에 실패했습니다" },
                { status: 500 }
            );
        }

        // 거래 내역 기록
        await adminSupabase
            .from("point_transactions")
            .insert({
                user_id: targetUserId,
                action_type: "admin_award",
                points_earned: points,
                metadata: {
                    awarded_by: adminUser.id,
                    awarded_by_email: adminUser.email || "",
                    reason: reason || "관리자 지급",
                },
            });

        return NextResponse.json({
            success: true,
            awarded: points,
            newTotal: newPoints,
            targetUserId,
        });
    } catch (err) {
        console.error("[Admin Points] 서버 오류:", err);
        return NextResponse.json({ error: "포인트 지급에 실패했습니다" }, { status: 500 });
    }
}
