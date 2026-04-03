/**
 * 관리자 신고 상태 업데이트 API
 * PATCH: 신고 상태 변경 (검토중, 처리완료, 반려)
 * DELETE: 신고된 콘텐츠 삭제 + 신고 resolved 처리
 *
 * 클라이언트 Supabase로는 reports UPDATE가 RLS에 막히므로
 * service_role key로 우회. 반드시 관리자 권한 검증 후 사용.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, createAdminSupabase } from "@/lib/supabase-server";
import { ADMIN_EMAILS } from "@/config/constants";

export const dynamic = "force-dynamic";

/** 관리자 권한 검증 헬퍼 */
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

/** PATCH: 신고 상태 변경 */
export async function PATCH(request: NextRequest) {
    try {
        const adminUser = await verifyAdmin();
        if (!adminUser) {
            return NextResponse.json(
                { error: "관리자 권한이 필요합니다" },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { reportId, status, adminNotes } = body as {
            reportId: string;
            status: string;
            adminNotes?: string;
        };

        if (!reportId || !status) {
            return NextResponse.json(
                { error: "reportId와 status가 필요합니다" },
                { status: 400 }
            );
        }

        const VALID_STATUSES = ["pending", "reviewing", "resolved", "rejected"];
        if (!VALID_STATUSES.includes(status)) {
            return NextResponse.json(
                { error: "잘못된 상태값입니다" },
                { status: 400 }
            );
        }

        const updateData: Record<string, unknown> = {
            status,
            resolved_by: adminUser.id,
            resolved_at: new Date().toISOString(),
        };
        if (adminNotes) {
            updateData.admin_notes = adminNotes;
        }

        const adminSupabase = createAdminSupabase();
        const { error } = await adminSupabase
            .from("reports")
            .update(updateData)
            .eq("id", reportId);

        if (error) {
            console.error("[Admin Reports] UPDATE error:", error);
            return NextResponse.json(
                { error: `상태 업데이트 실패: ${error.message}` },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[Admin Reports] 서버 오류:", err);
        return NextResponse.json(
            { error: "서버 오류가 발생했습니다" },
            { status: 500 }
        );
    }
}

/** DELETE: 신고된 콘텐츠 삭제 + 신고 resolved 처리 */
export async function DELETE(request: NextRequest) {
    try {
        const adminUser = await verifyAdmin();
        if (!adminUser) {
            return NextResponse.json(
                { error: "관리자 권한이 필요합니다" },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { reportId, targetType, targetId } = body as {
            reportId: string;
            targetType: string;
            targetId: string;
        };

        if (!reportId || !targetType || !targetId) {
            return NextResponse.json(
                { error: "reportId, targetType, targetId가 필요합니다" },
                { status: 400 }
            );
        }

        const tableMap: Record<string, string> = {
            post: "community_posts",
            comment: "comments",
            pet_memorial: "pet_memorials",
        };

        const tableName = tableMap[targetType];
        if (!tableName) {
            return NextResponse.json(
                { error: "삭제할 수 없는 대상입니다" },
                { status: 400 }
            );
        }

        const adminSupabase = createAdminSupabase();

        // 1. 콘텐츠 삭제
        const { error: deleteError } = await adminSupabase
            .from(tableName)
            .delete()
            .eq("id", targetId);

        if (deleteError) {
            console.error("[Admin Reports] DELETE content error:", deleteError);
            return NextResponse.json(
                { error: `콘텐츠 삭제 실패: ${deleteError.message}` },
                { status: 500 }
            );
        }

        // 2. 신고 상태를 resolved로 업데이트
        const { error: updateError } = await adminSupabase
            .from("reports")
            .update({
                status: "resolved",
                admin_notes: "콘텐츠 삭제 처리",
                resolved_by: adminUser.id,
                resolved_at: new Date().toISOString(),
            })
            .eq("id", reportId);

        if (updateError) {
            console.error("[Admin Reports] UPDATE after delete error:", updateError);
            // 콘텐츠는 이미 삭제됨 - 에러 로깅만 하고 성공 반환
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[Admin Reports] 서버 오류:", err);
        return NextResponse.json(
            { error: "서버 오류가 발생했습니다" },
            { status: 500 }
        );
    }
}
