/**
 * 사용자 자기 계정 삭제 API
 * POST: 로그인된 사용자가 자기 자신의 auth.users를 삭제
 *
 * 보안: 세션 기반 인증 (자기 자신만 삭제 가능)
 * DB: service_role로 auth.users 삭제 (CASCADE로 profiles도 삭제됨)
 *
 * AccountSettingsModal에서 회원탈퇴 시 호출.
 * 기존에는 profiles만 삭제하고 signOut()만 호출했으나,
 * auth.users가 남아있어 카카오/구글 OAuth로 다시 로그인 가능했던 버그 수정.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        // 1. 인증 확인 (자기 자신)
        const currentUser = await getAuthUser();
        if (!currentUser) {
            return NextResponse.json(
                { error: "로그인이 필요합니다" },
                { status: 401 }
            );
        }

        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!url || !serviceKey) {
            return NextResponse.json(
                { error: "서버 설정 오류" },
                { status: 500 }
            );
        }

        // 2. service_role로 auth.users에서 완전 삭제
        const adminClient = createClient(url, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        const { error: deleteError } = await adminClient.auth.admin.deleteUser(
            currentUser.id
        );

        if (deleteError) {
            console.error("[Delete Account] auth 삭제 에러:", deleteError);
            return NextResponse.json(
                { error: "계정 삭제에 실패했습니다" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            deletedUserId: currentUser.id,
        });
    } catch (err) {
        console.error("[Delete Account] 서버 오류:", err);
        return NextResponse.json(
            { error: "계정 삭제에 실패했습니다" },
            { status: 500 }
        );
    }
}
