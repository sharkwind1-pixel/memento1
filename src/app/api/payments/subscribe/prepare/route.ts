/**
 * 정기결제(구독) 준비 API
 * POST /api/payments/subscribe/prepare
 *
 * 1. 인증 확인
 * 2. 이미 구독 중인지 체크
 * 3. customer_uid 생성 (빌링키 발급용)
 * 4. payments 테이블에 pending 레코드 생성
 * 5. paymentId, orderName, amount, customerUid 반환
 */

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAuthUser, createAdminSupabase } from "@/lib/supabase-server";
import { PRICING } from "@/config/constants";
import { getClientIP, checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";

const PLAN_AMOUNT: Record<string, number> = {
    basic: PRICING.BASIC_MONTHLY,
    premium: PRICING.PREMIUM_MONTHLY,
};

const PLAN_NAME: Record<string, string> = {
    basic: "메멘토애니 베이직 정기구독 (월)",
    premium: "메멘토애니 프리미엄 정기구독 (월)",
};

export async function POST(request: NextRequest) {
    try {
        const clientIP = await getClientIP();
        const rateLimit = checkRateLimit(clientIP, "write");
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
                { status: 429, headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn) }
            );
        }

        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
        }

        const body = await request.json();
        const plan = body.plan as string;

        if (!plan || !PLAN_AMOUNT[plan]) {
            return NextResponse.json({ error: "잘못된 플랜입니다." }, { status: 400 });
        }

        const amount = PLAN_AMOUNT[plan];
        const orderName = PLAN_NAME[plan];

        const adminSupabase = createAdminSupabase();

        // 이미 프리미엄인지 체크
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

        // customer_uid: 유저별 고유 (동일 유저는 동일 customer_uid로 빌링키 관리)
        const customerUid = `memento_sub_${user.id}`;
        const paymentId = `sub_${randomUUID()}`;

        // 기존 pending 구독 레코드 정리
        await adminSupabase
            .from("payments")
            .update({ status: "cancelled" })
            .eq("user_id", user.id)
            .eq("status", "pending")
            .like("merchant_uid", "sub_%");

        // payments 테이블에 pending 레코드 생성
        const { error: insertError } = await adminSupabase
            .from("payments")
            .insert({
                user_id: user.id,
                amount,
                plan,
                merchant_uid: paymentId,
                status: "pending",
                metadata: {
                    orderName,
                    is_subscription: true,
                    customer_uid: customerUid,
                },
            });

        if (insertError) {
            console.error("[subscribe/prepare] DB 오류:", insertError.message);
            return NextResponse.json({ error: "구독 준비에 실패했습니다." }, { status: 500 });
        }

        return NextResponse.json({
            paymentId,
            orderName,
            amount,
            customerUid,
        });
    } catch (err) {
        console.error("[subscribe/prepare] 에러:", err instanceof Error ? err.message : err);
        return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
    }
}
