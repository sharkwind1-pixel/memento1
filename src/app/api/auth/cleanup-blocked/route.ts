/**
 * 차단된 계정 auth.users 정리 API
 * POST: 차단/탈퇴 대기 중인 사용자가 OAuth로 새 auth.users를 만들었을 때
 *       해당 auth.users를 삭제하여 재로그인을 완전 차단
 *
 * 호출 시점: auth/callback 또는 AuthContext에서 can_rejoin 체크 후 차단 판정 시
 *
 * 보안: 세션 기반 인증 (자기 자신의 auth.users만 삭제)
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST() {
    try {
        const currentUser = await getAuthUser();
        if (!currentUser) {
            return NextResponse.json(
                { error: "인증 정보 없음" },
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

        const adminClient = createClient(url, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        // auth.users에서 삭제 (service_role 권한)
        const { error } = await adminClient.auth.admin.deleteUser(currentUser.id);

        if (error) {
            console.error("[Cleanup Blocked] auth 삭제 실패:", error);
            return NextResponse.json(
                { error: "정리 실패" },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[Cleanup Blocked] 서버 오류:", err);
        return NextResponse.json(
            { error: "서버 오류" },
            { status: 500 }
        );
    }
}
