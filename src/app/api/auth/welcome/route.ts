/**
 * POST /api/auth/welcome
 *
 * 가입 환영 이메일을 발송하고 profiles.welcome_email_sent_at를 갱신.
 * 중복 발송 방지 — 이미 보낸 사용자는 silent skip.
 *
 * 호출 시점:
 *  - AuthContext가 프로필 로드 후 welcome_email_sent_at이 NULL이면 호출
 *  - /auth/callback 직후
 *  - 모바일 첫 로그인 후
 *
 * Idempotent — 여러 번 호출해도 한 번만 발송됨.
 */

import { NextResponse } from "next/server";
import { getAuthUser, createAdminSupabase } from "@/lib/supabase-server";
import { sendWelcomeEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST() {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
        }
        if (!user.email) {
            // 카카오 가입 + 이메일 미동의 케이스 — 메일 발송 불가
            return NextResponse.json({ ok: true, skipped: "no_email" });
        }

        const adminSupabase = createAdminSupabase();

        // 1. 이미 보냈는지 확인 + 베타 상태 조회
        const { data: profile, error: fetchError } = await adminSupabase
            .from("profiles")
            .select("welcome_email_sent_at, nickname, is_beta_tester, beta_discount_until")
            .eq("id", user.id)
            .single();

        if (fetchError) {
            return NextResponse.json({ error: "프로필 조회 실패" }, { status: 500 });
        }

        if (profile?.welcome_email_sent_at) {
            // 이미 보냄 — silent skip
            return NextResponse.json({ ok: true, skipped: "already_sent" });
        }

        // 2. 베타 프로모션 적용 여부
        const isBetaActive = profile?.is_beta_tester &&
            (!profile.beta_discount_until || new Date(profile.beta_discount_until) > new Date());

        // 3. 메일 발송
        const result = await sendWelcomeEmail(
            user.email,
            profile?.nickname ?? null,
            { betaPromotion: isBetaActive, betaPoints: 3000, betaDiscountPercent: 50 },
        );

        // 4. 발송 성공/실패 무관하게 sent_at 기록 (실패 시 재시도는 다음 가입자만)
        // 실패해도 무한 재시도 안 하도록 sent_at 기록
        const { error: updateError } = await adminSupabase
            .from("profiles")
            .update({ welcome_email_sent_at: new Date().toISOString() })
            .eq("id", user.id);

        if (updateError) {
            console.warn("[welcome] sent_at 업데이트 실패:", updateError.message);
        }

        return NextResponse.json({
            ok: true,
            sent: result.success,
            error: result.error,
            messageId: result.messageId,
        });
    } catch (err) {
        console.error("[welcome] 에러:", err);
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
