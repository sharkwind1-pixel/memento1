/**
 * 관리자 재가입 허용 API
 * POST: withdrawn_users에 error_resolution 레코드를 추가하여 재가입 허용
 *
 * 용도: banned 또는 abuse_concern 상태의 계정을 재가입 가능하게 변경
 *       can_rejoin RPC가 최신 레코드(created_at DESC) 기준으로 판정하므로
 *       error_resolution이 최신이면 재가입 허용됨
 *
 * 보안: 관리자 권한 필수 (service_role로 RLS 우회)
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
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!url || !serviceKey) {
            return NextResponse.json({ error: "서버 설정 오류" }, { status: 500 });
        }

        const isEmailAdmin = ADMIN_EMAILS.includes(adminUser.email || "");
        if (!isEmailAdmin) {
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
        const { email, userId: targetUserId, nickname, reason, previousReason } = body as {
            email: string;
            userId: string;
            nickname?: string | null;
            reason?: string;
            previousReason?: string;
        };

        if (!email) {
            return NextResponse.json({ error: "이메일이 필요합니다" }, { status: 400 });
        }

        const adminClient = createClient(url, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        // 4. error_resolution 레코드 INSERT (재가입 허용)
        const resolveReason = reason
            ? `[차단 해제] ${reason} (기존 사유: ${previousReason || "없음"})`
            : "[재가입 허용] 관리자 승인";

        const { error: insertError } = await adminClient
            .from("withdrawn_users")
            .insert({
                user_id: targetUserId || "00000000-0000-0000-0000-000000000000",
                email: email,
                nickname: nickname || null,
                withdrawal_type: "error_resolution",
                reason: resolveReason,
                rejoin_allowed_at: new Date().toISOString(),
                processed_by: adminUser.id,
            });

        if (insertError) {
            console.error("[Allow Rejoin] INSERT 에러:", insertError);
            return NextResponse.json({ error: "재가입 허용 처리 실패" }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            email: email,
        });
    } catch (err) {
        console.error("[Allow Rejoin] 서버 오류:", err);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
