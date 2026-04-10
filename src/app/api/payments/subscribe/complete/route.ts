/**
 * 정기결제(구독) 완료 검증 API
 * POST /api/payments/subscribe/complete
 *
 * 첫 결제 검증 + 빌링키 저장 + 구독 생성 + 프리미엄 부여
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, createAdminSupabase } from "@/lib/supabase-server";
import { PLAN_DURATION_DAYS } from "@/config/constants";
import { getClientIP, checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";

const PORTONE_API_SECRET = process.env.PORTONE_API_SECRET || "";

/** 포트원 V1 액세스 토큰 발급 */
async function getPortoneAccessToken(): Promise<string | null> {
    try {
        const res = await fetch("https://api.iamport.kr/users/getToken", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                imp_key: process.env.PORTONE_REST_API_KEY || "",
                imp_secret: PORTONE_API_SECRET,
            }),
        });
        const data = await res.json();
        if (data.code === 0 && data.response?.access_token) {
            return data.response.access_token;
        }
        console.error("[subscribe/complete] 토큰 발급 실패:", data.message);
        return null;
    } catch (err) {
        console.error("[subscribe/complete] 토큰 발급 에러:", err);
        return null;
    }
}

/** 포트원 V1 결제 단건 조회 */
async function getPortonePayment(impUid: string, accessToken: string) {
    const res = await fetch(`https://api.iamport.kr/payments/${encodeURIComponent(impUid)}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (data.code === 0 && data.response) {
        return data.response;
    }
    throw new Error(data.message || "포트원 결제 조회 실패");
}

export async function POST(request: NextRequest) {
    try {
        const clientIP = await getClientIP();
        const rateLimit = checkRateLimit(clientIP, "write");
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "요청이 너무 많습니다." },
                { status: 429, headers: getRateLimitHeaders(rateLimit.remaining, rateLimit.resetIn) }
            );
        }

        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
        }

        const body = await request.json();
        const { paymentId, impUid } = body;

        if (!paymentId || typeof paymentId !== "string") {
            return NextResponse.json({ error: "결제 ID가 필요합니다." }, { status: 400 });
        }
        if (!impUid || typeof impUid !== "string") {
            return NextResponse.json({ error: "포트원 결제 ID가 필요합니다." }, { status: 400 });
        }

        const adminSupabase = createAdminSupabase();

        // Atomic UPDATE: pending → verifying
        const { data: claimedPayments, error: claimError } = await adminSupabase
            .from("payments")
            .update({ status: "verifying" })
            .eq("merchant_uid", paymentId)
            .eq("user_id", user.id)
            .eq("status", "pending")
            .select("*");

        if (claimError || !claimedPayments || claimedPayments.length === 0) {
            return NextResponse.json(
                { error: "결제 내역을 찾을 수 없거나 이미 처리된 결제입니다." },
                { status: 409 }
            );
        }

        const payment = claimedPayments[0];

        if (!PORTONE_API_SECRET) {
            await adminSupabase
                .from("payments")
                .update({ status: "failed", metadata: { ...payment.metadata, error: "API_SECRET 미설정" } })
                .eq("id", payment.id);
            return NextResponse.json({ error: "결제 검증 설정 오류" }, { status: 500 });
        }

        const accessToken = await getPortoneAccessToken();
        if (!accessToken) {
            await adminSupabase
                .from("payments")
                .update({ status: "failed", metadata: { ...payment.metadata, error: "토큰 발급 실패" } })
                .eq("id", payment.id);
            return NextResponse.json({ error: "결제 검증 서버 오류" }, { status: 500 });
        }

        let portoneData;
        try {
            portoneData = await getPortonePayment(impUid, accessToken);
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : "알 수 없는 오류";
            await adminSupabase
                .from("payments")
                .update({ status: "failed", metadata: { ...payment.metadata, portone_api_error: errMsg } })
                .eq("id", payment.id);
            return NextResponse.json({ error: "결제 검증에 실패했습니다." }, { status: 500 });
        }

        // 결제 상태 확인
        if (portoneData.status !== "paid") {
            await adminSupabase
                .from("payments")
                .update({ status: "failed", metadata: { ...payment.metadata, portone_status: portoneData.status } })
                .eq("id", payment.id);
            return NextResponse.json({ error: `결제가 완료되지 않았습니다. (${portoneData.status})` }, { status: 400 });
        }

        // 금액 검증
        if (portoneData.amount !== payment.amount) {
            await adminSupabase
                .from("payments")
                .update({ status: "failed", metadata: { ...payment.metadata, amount_mismatch: true } })
                .eq("id", payment.id);
            return NextResponse.json({ error: "결제 금액이 일치하지 않습니다." }, { status: 400 });
        }

        const customerUid = payment.metadata?.customer_uid || `memento_sub_${user.id}`;
        const nextBillingDate = new Date();
        nextBillingDate.setDate(nextBillingDate.getDate() + 30);

        // payments 상태 업데이트 → paid
        const { error: updateError } = await adminSupabase
            .from("payments")
            .update({
                status: "paid",
                payment_id: impUid,
                paid_at: new Date().toISOString(),
                metadata: {
                    ...payment.metadata,
                    imp_uid: impUid,
                    customer_uid: customerUid,
                    is_subscription: true,
                    next_billing_date: nextBillingDate.toISOString(),
                    portone_method: portoneData.pay_method,
                    portone_card: portoneData.card_name,
                },
            })
            .eq("id", payment.id)
            .eq("status", "verifying");

        if (updateError) {
            return NextResponse.json({ error: "결제 상태 업데이트에 실패했습니다." }, { status: 500 });
        }

        // 프리미엄 부여
        const plan = payment.plan;
        const durationDays = PLAN_DURATION_DAYS[plan as keyof typeof PLAN_DURATION_DAYS] || 30;

        const { error: grantError } = await adminSupabase.rpc("grant_premium", {
            p_user_id: user.id,
            p_plan: plan,
            p_duration_days: durationDays,
            p_granted_by: null,
            p_reason: `정기결제 첫 결제 (${impUid})`,
        });

        if (grantError) {
            await adminSupabase
                .from("payments")
                .update({ metadata: { ...payment.metadata, grant_failed: true, grant_error: grantError.message } })
                .eq("id", payment.id);
            return NextResponse.json({
                error: "결제는 완료되었으나 프리미엄 활성화에 실패했습니다.",
                paymentCompleted: true,
                grantFailed: true,
            }, { status: 500 });
        }

        // 구독 정보를 subscriptions 테이블에 저장 (있으면)
        await adminSupabase
            .from("subscriptions")
            .upsert({
                user_id: user.id,
                plan,
                status: "active",
                last_payment_id: payment.id,
                metadata: {
                    customer_uid: customerUid,
                    next_billing_date: nextBillingDate.toISOString(),
                    auto_renew: true,
                },
            }, { onConflict: "user_id" })
            .select()
            .single();

        // 라이프사이클 복구 (해지 후 재구독 시 archived 데이터 복원)
        try {
            const { restoreFromLifecycle } = await import("@/lib/subscription-restore");
            const restoreResult = await restoreFromLifecycle(adminSupabase, user.id);
            if (restoreResult.wasLifecycleActive) {
                console.log(
                    `[subscribe/complete] 라이프사이클 복구: pets=${restoreResult.restoredPets} media=${restoreResult.restoredMedia}`
                );
            }
        } catch (restoreErr) {
            console.error("[subscribe/complete] 라이프사이클 복구 실패 (결제는 정상):", restoreErr);
        }

        // 텔레그램 알림
        import("@/lib/telegram").then(({ notifyPayment }) =>
            notifyPayment({ email: user.email || "", plan, amount: payment.amount })
        ).catch(() => {});

        return NextResponse.json({
            success: true,
            plan,
            isSubscription: true,
            nextBillingDate: nextBillingDate.toISOString(),
            message: "정기구독이 시작되었습니다!",
        });
    } catch (err) {
        console.error("[subscribe/complete] 에러:", err instanceof Error ? err.message : err);
        return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
    }
}
