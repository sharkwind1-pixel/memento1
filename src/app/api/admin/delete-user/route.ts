/**
 * 관리자 유저 삭제 API
 * POST: 관리자가 유저를 탈퇴 처리
 *
 * 보안: 세션 기반 인증 + 관리자 권한 검증
 * DB: service_role로 auth.users 삭제 (CASCADE로 profiles도 삭제됨)
 *
 * 핵심: withdrawn_users에 기록을 남겨서 OAuth 재로그인 시
 * can_rejoin RPC가 차단할 수 있도록 함
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
        const { targetUserId, reason } = body as { targetUserId: string; reason?: string };

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

        if (!serviceKey) {
            return NextResponse.json(
                { error: "서버 설정 오류 (service key)" },
                { status: 500 }
            );
        }

        const adminClient = createClient(url, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        // 4. 삭제 대상 유저 정보 조회 (이메일, 닉네임)
        let targetEmail = "";
        let targetNickname: string | null = null;

        // auth.users에서 이메일 가져오기
        const { data: targetAuthUser } = await adminClient.auth.admin.getUserById(targetUserId);
        if (targetAuthUser?.user) {
            targetEmail = targetAuthUser.user.email || "";
        }

        // profiles에서 닉네임 가져오기
        const { data: targetProfile } = await adminClient
            .from("profiles")
            .select("nickname")
            .eq("id", targetUserId)
            .single();
        if (targetProfile) {
            targetNickname = targetProfile.nickname;
        }

        // 5. withdrawn_users에 기록 (재로그인 차단용 - 반드시 auth 삭제 전에)
        // can_rejoin RPC가 이 테이블을 체크하여 OAuth 재로그인을 차단
        // 프론트엔드에서 먼저 INSERT했을 수 있으므로 기존 레코드 확인 후 INSERT
        if (targetEmail) {
            // 이미 해당 이메일로 withdrawn_users 레코드가 있는지 확인
            const { data: existingRecord } = await adminClient
                .from("withdrawn_users")
                .select("id")
                .eq("email", targetEmail)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (!existingRecord) {
                const { error: withdrawError } = await adminClient
                    .from("withdrawn_users")
                    .insert({
                        user_id: targetUserId,
                        email: targetEmail,
                        nickname: targetNickname,
                        withdrawal_type: "banned",
                        reason: reason || "관리자에 의한 계정 삭제",
                        rejoin_allowed_at: null,  // 영구 차단 (관리자가 직접 해제해야)
                        processed_by: adminUser.id,
                    });

                if (withdrawError) {
                    console.error("[Admin Delete User] withdrawn_users INSERT 에러:", withdrawError);
                    // INSERT 실패해도 auth 삭제는 진행
                }
            }
        } else {
            console.warn("[Admin Delete User] 대상 유저 이메일을 찾을 수 없음:", targetUserId);
        }

        // 6. auth.users에서 완전 삭제
        const { error: deleteError } = await adminClient.auth.admin.deleteUser(
            targetUserId
        );

        if (deleteError) {
            console.error("[Admin Delete User] auth 삭제 에러:", deleteError);
            // auth 삭제 실패해도 withdrawn_users에 기록은 남아있으므로
            // 재로그인 시 can_rejoin 체크에서 차단됨
        }

        // 7. profiles 테이블에서도 삭제 (CASCADE가 안 된 경우 대비)
        const { error: profileError } = await adminClient
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
            withdrawalRecorded: !!targetEmail,
        });
    } catch (err) {
        console.error("[Admin Delete User] 서버 오류:", err);
        return NextResponse.json(
            { error: "유저 삭제에 실패했습니다" },
            { status: 500 }
        );
    }
}
