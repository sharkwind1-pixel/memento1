/**
 * 사용자 자기 계정 삭제 API
 * POST: 로그인된 사용자가 자기 자신의 auth.users를 삭제
 *
 * 보안: 세션 기반 인증 (자기 자신만 삭제 가능)
 * DB: service_role로 auth.users 삭제 + withdrawn_users에 기록
 *
 * 핵심 수정:
 * 1. auth.users 삭제 (카카오/구글이 기존 계정으로 인식하지 못하도록)
 * 2. withdrawn_users에 기록 (can_rejoin RPC가 체크할 수 있도록)
 *    - RLS가 관리자만 INSERT 허용하므로, service_role 클라이언트 사용
 * 3. 카카오 OAuth가 같은 이메일로 새 계정을 자동생성해도
 *    auth/callback에서 withdrawn_users 체크로 차단됨
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

        const adminClient = createClient(url, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        // 요청 바디에서 추가 정보 (닉네임 등)
        let nickname: string | null = null;
        try {
            const body = await request.json();
            nickname = body.nickname || null;
        } catch {
            // body 없어도 OK
        }

        const userEmail = currentUser.email || "";

        // 2. withdrawn_users에 탈퇴 기록 추가 (service_role로 RLS 우회)
        // can_rejoin RPC가 이 테이블을 체크하므로 반드시 필요
        const { error: withdrawError } = await adminClient
            .from("withdrawn_users")
            .insert({
                user_id: currentUser.id,
                email: userEmail,
                nickname: nickname || currentUser.user_metadata?.nickname || null,
                withdrawal_type: "abuse_concern",  // 사용자 자발적 탈퇴 = 30일 대기
                reason: "사용자 자발적 탈퇴",
                rejoin_allowed_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                processed_by: null,  // 관리자가 아닌 본인이 처리
            });

        if (withdrawError) {
            console.error("[Delete Account] withdrawn_users INSERT 에러:", withdrawError);
            // INSERT 실패해도 auth 삭제는 진행 (최소한 계정은 삭제)
        }

        // 3. auth.users에서 완전 삭제
        const { error: deleteError } = await adminClient.auth.admin.deleteUser(
            currentUser.id
        );

        if (deleteError) {
            console.error("[Delete Account] auth 삭제 에러:", deleteError);
            // auth 삭제 실패해도 withdrawn_users에 기록은 남아있으므로
            // 재로그인 시 can_rejoin 체크에서 차단됨
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
