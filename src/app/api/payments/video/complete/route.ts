/**
 * AI 영상 단건 결제 완료 검증 API
 * POST /api/payments/video/complete
 *
 * 포트원 V1 API로 결제 검증 후 영상 보너스 크레딧 부여
 * payments 테이블에 plan='video_single', status='paid' 레코드로 크레딧 추적
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, createAdminSupabase } from "@/lib/supabase-server";
import { VIDEO } from "@/config/constants";
import { getClientIP, checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";

const PORTONE_API_SECRET = process.env.PORTONE_API_SECRET || "";

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
        return null;
    } catch {
        return null;
    }
}

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

        // Atomic claim: pending → verifying
        const { data: claimedPayments, error: claimError } = await adminSupabase
            .from("payments")
            .update({ status: "verifying" })
            .eq("merchant_uid", paymentId)
            .eq("user_id", user.id)
            .eq("status", "pending")
            .select("*");

        if (claimError || !claimedPayments?.length) {
            return NextResponse.json(
                { error: "결제 내역을 찾을 수 없거나 이미 처리된 결제입니다." },
                { status: 409 }
            );
        }

        const payment = claimedPayments[0];

        // 포트원 검증
        if (!PORTONE_API_SECRET) {
            await adminSupabase.from("payments").update({ status: "failed" }).eq("id", payment.id);
            return NextResponse.json({ error: "결제 검증 설정 오류" }, { status: 500 });
        }

        const accessToken = await getPortoneAccessToken();
        if (!accessToken) {
            await adminSupabase.from("payments").update({ status: "failed" }).eq("id", payment.id);
            return NextResponse.json({ error: "결제 검증 서버 오류" }, { status: 500 });
        }

        let portoneData;
        try {
            portoneData = await getPortonePayment(impUid, accessToken);
        } catch {
            await adminSupabase.from("payments").update({ status: "failed" }).eq("id", payment.id);
            return NextResponse.json({ error: "결제 검증에 실패했습니다." }, { status: 500 });
        }

        if (portoneData.status !== "paid") {
            await adminSupabase.from("payments").update({ status: "failed" }).eq("id", payment.id);
            return NextResponse.json({ error: `결제가 완료되지 않았습니다. (${portoneData.status})` }, { status: 400 });
        }

        // 금액 검증
        if (portoneData.amount !== VIDEO.SINGLE_PRICE) {
            await adminSupabase.from("payments").update({ status: "failed" }).eq("id", payment.id);
            return NextResponse.json({ error: "결제 금액이 일치하지 않습니다." }, { status: 400 });
        }

        // 성공: paid로 업데이트
        await adminSupabase
            .from("payments")
            .update({
                status: "paid",
                payment_id: impUid,
                paid_at: new Date().toISOString(),
                metadata: {
                    ...payment.metadata,
                    imp_uid: impUid,
                    portone_method: portoneData.pay_method,
                    portone_card: portoneData.card_name,
                },
            })
            .eq("id", payment.id)
            .eq("status", "verifying");

        // 텔레그램 알림 (비동기)
        import("@/lib/telegram").then(({ notifyPayment }) =>
            notifyPayment({ email: user.email || "", plan: "video_single", amount: VIDEO.SINGLE_PRICE })
        ).catch(() => {});

        return NextResponse.json({
            success: true,
            message: "AI 영상 1건이 추가되었습니다!",
        });
    } catch (err) {
        console.error("[payments/video/complete] 에러:", err instanceof Error ? err.message : err);
        return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
    }
}
