/**
 * 관리자 유저 삭제 API
 * POST: 관리자가 탈퇴 처리된 유저의 auth 계정을 삭제
 *
 * 보안: 세션 기반 인증 + 관리자 권한 검증
 * DB: service_role로 auth.users 삭제 (CASCADE로 profiles도 삭제됨)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/lib/supabase-server";
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

        // 2. 관리자 권한 확인 (이메일 + DB is_admin)
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!url || !anonKey) {
            return NextResponse.json(
                { error: "서버 설정 오류" },
                { status: 500 }
            );
        }

        // anon key로 관리자 권한 확인
        const anonClient = createClient(url, anonKey, {
            global: {
                headers: { Authorization: `Bearer ${request.headers.get("authorization")?.replace("Bearer ", "") || ""}` },
            },
        });

        const isEmailAdmin = ADMIN_EMAILS.includes(adminUser.email || "");
        let isDbAdmin = false;

        if (!isEmailAdmin) {
            // user_metadata에서도 이메일 확인
            const metaEmail = adminUser.user_metadata?.email as string | undefined;
            const identityEmails = (adminUser.identities || [])
                .map((id: { identity_data?: { email?: string } }) => id.identity_data?.email)
                .filter(Boolean) as string[];
            const allEmails = [adminUser.email, metaEmail, ...identityEmails].filter(Boolean) as string[];
            const metaAdmin = allEmails.some(e => ADMIN_EMAILS.includes(e!));

            if (!metaAdmin) {
                const { data: profile } = await anonClient
                    .from("profiles")
                    .select("is_admin")
                    .eq("id", adminUser.id)
                    .single();
                isDbAdmin = profile?.is_admin === true;
            } else {
                isDbAdmin = true;
            }
        }

        if (!isEmailAdmin && !isDbAdmin) {
            return NextResponse.json(
                { error: "관리자 권한이 필요합니다" },
                { status: 403 }
            );
        }

        // 3. 요청 파라미터
        const body = await request.json();
        const { targetUserId } = body as { targetUserId: string };

        if (!targetUserId) {
            return NextResponse.json(
                { error: "삭제할 유저 ID가 필요합니다" },
                { status: 400 }
            );
        }

        // 자기 자신은 삭제 불가
        if (targetUserId === adminUser.id) {
            return NextResponse.json(
                { error: "자기 자신은 삭제할 수 없습니다" },
                { status: 400 }
            );
        }

        // 4. service_role 키가 있으면 auth.users에서 완전 삭제
        if (serviceKey) {
            const adminClient = createClient(url, serviceKey, {
                auth: { autoRefreshToken: false, persistSession: false },
            });

            const { error: deleteError } = await adminClient.auth.admin.deleteUser(
                targetUserId
            );

            if (deleteError) {
                console.error("[Admin Delete User] auth 삭제 에러:", deleteError);
                // auth 삭제 실패해도 profiles는 삭제 시도
            }
        }

        // 5. profiles 테이블에서도 삭제 (CASCADE가 안 된 경우 대비)
        const { error: profileError } = await anonClient
            .from("profiles")
            .delete()
            .eq("id", targetUserId);

        if (profileError) {
            console.error("[Admin Delete User] profiles 삭제 에러:", profileError);
            // service_role로 auth 삭제가 성공했으면 CASCADE로 이미 삭제됐을 수 있음
        }

        return NextResponse.json({
            success: true,
            deletedUserId: targetUserId,
        });
    } catch (err) {
        console.error("[Admin Delete User] 서버 오류:", err);
        return NextResponse.json(
            { error: "유저 삭제에 실패했습니다" },
            { status: 500 }
        );
    }
}
