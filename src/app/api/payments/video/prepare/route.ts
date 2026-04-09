/**
 * AI 영상 단건 결제 준비 API
 * POST /api/payments/video/prepare
 *
 * 영상 1건 구매 (3,500원)
 * 프리미엄 여부와 무관하게 추가 구매 가능
 */

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAuthUser, createAdminSupabase } from "@/lib/supabase-server";
import { VIDEO } from "@/config/constants";
import { getClientIP, checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";

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

        // suppress unused variable warning
        void request;

        const amount = VIDEO.SINGLE_PRICE;
        const orderName = "AI 영상 1건";
        const paymentId = `memento_video_${randomUUID()}`;

        const adminSupabase = createAdminSupabase();

        // 기존 pending 정리
        await adminSupabase
            .from("payments")
            .update({ status: "cancelled" })
            .eq("user_id", user.id)
            .eq("plan", "video_single")
            .eq("status", "pending");

        // pending 레코드 생성
        const { error: insertError } = await adminSupabase
            .from("payments")
            .insert({
                user_id: user.id,
                amount,
                plan: "video_single",
                merchant_uid: paymentId,
                status: "pending",
                metadata: { orderName },
            });

        if (insertError) {
            console.error("[payments/video/prepare] DB 오류:", insertError.message);
            return NextResponse.json({ error: "결제 준비에 실패했습니다." }, { status: 500 });
        }

        return NextResponse.json({ paymentId, orderName, amount });
    } catch (err) {
        console.error("[payments/video/prepare] 에러:", err instanceof Error ? err.message : err);
        return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
    }
}
