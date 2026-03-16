/**
 * 결제 준비 API
 * POST /api/payments/prepare
 *
 * 1. 인증 확인
 * 2. 이미 프리미엄인지 체크
 * 3. 금액은 서버에서 결정 (클라이언트 금액 위변조 방지)
 * 4. payments 테이블에 pending 레코드 생성
 * 5. paymentId, orderName, amount 반환
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, createAdminSupabase } from "@/lib/supabase-server";
import { PRICING } from "@/config/constants";

// plan → 금액 매핑 (서버에서만 관리)
const PLAN_AMOUNT: Record<string, number> = {
    basic: PRICING.BASIC_MONTHLY,
    premium: PRICING.PREMIUM_MONTHLY,
};

const PLAN_NAME: Record<string, string> = {
    basic: "메멘토애니 베이직 (1개월)",
    premium: "메멘토애니 프리미엄 (1개월)",
};

export async function POST(request: NextRequest) {
    try {
        // 1. 인증 확인
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
        }

        // 2. 요청 파싱
        const body = await request.json();
        const plan = body.plan as string;

        if (!plan || !PLAN_AMOUNT[plan]) {
            return NextResponse.json(
                { error: "잘못된 플랜입니다." },
                { status: 400 }
            );
        }

        const amount = PLAN_AMOUNT[plan];
        const orderName = PLAN_NAME[plan];

        // 3. 프리미엄 여부 체크
        const adminSupabase = createAdminSupabase();
        const { data: profile } = await adminSupabase
            .from("profiles")
            .select("is_premium, premium_expires_at")
            .eq("id", user.id)
            .single();

        if (profile?.is_premium) {
            const expiresAt = profile.premium_expires_at;
            if (!expiresAt || new Date(expiresAt) > new Date()) {
                return NextResponse.json(
                    { error: "이미 프리미엄 회원입니다." },
                    { status: 400 }
                );
            }
        }

        // 4. paymentId 생성
        const timestamp = Date.now();
        const userSuffix = user.id.slice(0, 6);
        const paymentId = `memento_${timestamp}_${userSuffix}`;

        // 5. payments 테이블에 pending 레코드 생성
        const { error: insertError } = await adminSupabase
            .from("payments")
            .insert({
                user_id: user.id,
                amount,
                plan,
                merchant_uid: paymentId,
                status: "pending",
                metadata: { orderName },
            });

        if (insertError) {
            console.error("[payments/prepare] DB 오류:", insertError.message);
            return NextResponse.json(
                { error: "결제 준비에 실패했습니다." },
                { status: 500 }
            );
        }

        // 6. 클라이언트에 필요한 정보 반환
        return NextResponse.json({
            paymentId,
            orderName,
            amount,
        });
    } catch (err) {
        console.error("[payments/prepare] 에러:", err instanceof Error ? err.message : err);
        return NextResponse.json(
            { error: "서버 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}
