/**
 * 관리자 이메일 차단 API
 * POST: 특정 이메일을 withdrawn_users에 추가하여 OAuth 재로그인 차단
 *
 * 용도: 이미 삭제된 계정이 withdrawn_users에 기록 없이 삭제된 경우
 *       수동으로 이메일을 차단 목록에 추가
 *
 * 보안: 관리자 권한 필수
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

        // 2. 관리자 권한 확인
        const isEmailAdmin = ADMIN_EMAILS.includes(adminUser.email || "");
        if (!isEmailAdmin) {
            // DB is_admin 체크
            const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            if (!url || !serviceKey) {
                return NextResponse.json({ error: "서버 설정 오류" }, { status: 500 });
            }
            const adminClient = createClient(url, serviceKey, {
                auth: { autoRefreshToken: false, persistSession: false },
            });
            const { data: profile } = await adminClient
                .from("profiles")
                .select("is_admin")
                .eq("id", adminUser.id)
                .single();
            if (!profile?.is_admin) {
                return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 });
            }
        }

        // 3. 요청 파라미터
        const body = await request.json();
        const { email, reason, withdrawalType } = body as {
            email: string;
            reason?: string;
            withdrawalType?: "banned" | "abuse_concern";
        };

        if (!email) {
            return NextResponse.json({ error: "이메일이 필요합니다" }, { status: 400 });
        }

        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!url || !serviceKey) {
            return NextResponse.json({ error: "서버 설정 오류" }, { status: 500 });
        }

        const adminClient = createClient(url, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        // 4. 기존 레코드 모두 삭제 후 새로 banned INSERT (중복 방지)
        await adminClient
            .from("withdrawn_users")
            .delete()
            .eq("email", email);

        // 5. withdrawn_users에 추가
        const type = withdrawalType || "banned";
        const rejoinDate = type === "abuse_concern"
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            : null;

        // user_id는 NOT NULL이므로 더미 UUID 사용 (이미 삭제된 계정)
        const dummyUserId = "00000000-0000-0000-0000-000000000000";

        const { error: insertError } = await adminClient
            .from("withdrawn_users")
            .insert({
                user_id: dummyUserId,
                email: email,
                nickname: null,
                withdrawal_type: type,
                reason: reason || "관리자에 의한 이메일 차단",
                rejoin_allowed_at: rejoinDate,
                processed_by: adminUser.id,
            });

        if (insertError) {
            console.error("[Block Email] INSERT 에러:", insertError);
            return NextResponse.json({ error: "차단 처리 실패" }, { status: 500 });
        }

        // 6. 이 이메일로 현재 profiles가 존재하면 해당 유저의 auth.users + profiles 삭제
        //    (이전에 삭제했지만 잔여 데이터가 남아있는 경우 정리)
        const { data: profileData } = await adminClient
            .from("profiles")
            .select("id")
            .eq("email", email)
            .maybeSingle();

        let authUserDeleted = false;
        if (profileData) {
            // auth.users 삭제 → CASCADE로 profiles도 삭제됨
            const { error: delErr } = await adminClient.auth.admin.deleteUser(profileData.id);
            if (delErr) {
                // auth.users가 이미 없을 수 있음 → profiles만 직접 삭제
                await adminClient.from("profiles").delete().eq("id", profileData.id);
            }
            authUserDeleted = true;
        }

        // profiles.email이 없는 경우 auth.users에서도 검색
        if (!authUserDeleted) {
            const { data: { users } } = await adminClient.auth.admin.listUsers({
                page: 1,
                perPage: 50,
            });
            const matchedUser = users?.find(u => u.email === email);
            if (matchedUser) {
                await adminClient.auth.admin.deleteUser(matchedUser.id);
            }
        }

        return NextResponse.json({
            success: true,
            blockedEmail: email,
            withdrawalType: type,
            dataCleanedUp: authUserDeleted,
        });
    } catch (err) {
        console.error("[Block Email] 서버 오류:", err);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
