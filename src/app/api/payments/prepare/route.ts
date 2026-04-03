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
import { randomUUID } from "crypto";
import { getAuthUser, createAdminSupabase } from "@/lib/supabase-server";
import { PRICING } from "@/config/constants";
import { getClientIP, checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";

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
        // 0. Rate Limit (결제 남용 방지)
        const clientIP = await getClientIP();
        const rateLimit = checkRateLimit(clientIP, "write");
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
                { status: 429, headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn) }
            );
        }

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

        // 4. paymentId 생성 (예측 불가능한 UUID 사용)
        const paymentId = `memento_${randomUUID()}`;

        // 5. 기존 pending 레코드 정리 (반복 클릭으로 인한 orphaned 레코드 방지)
        await adminSupabase
            .from("payments")
            .update({ status: "cancelled" })
            .eq("user_id", user.id)
            .eq("plan", plan)
            .eq("status", "pending");

        // 6. payments 테이블에 pending 레코드 생성
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

        // 7. 클라이언트에 필요한 정보 반환
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
