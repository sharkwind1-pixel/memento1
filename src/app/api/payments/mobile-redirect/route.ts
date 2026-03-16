/**
 * 모바일 결제 리다이렉트 핸들러
 * GET /api/payments/mobile-redirect
 *
 * 모바일에서 포트원 결제 완료 후 리다이렉트되는 엔드포인트
 * paymentId를 쿼리 파라미터로 받아서 메인 페이지로 리다이렉트
 * (실제 결제 검증은 클라이언트에서 /api/payments/complete로 처리)
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const paymentId = searchParams.get("paymentId") || "";
    const code = searchParams.get("code") || "";

    // 결제 실패/취소인 경우
    if (code && code !== "PAYMENT_PAID") {
        const message = searchParams.get("message") || "결제가 완료되지 않았습니다.";
        const redirectUrl = new URL("/", request.url);
        redirectUrl.searchParams.set("payment", "failed");
        redirectUrl.searchParams.set("reason", message);
        return NextResponse.redirect(redirectUrl);
    }

    // 결제 성공 → 클라이언트에서 complete API 호출하도록
    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams.set("payment", "mobile-complete");
    redirectUrl.searchParams.set("paymentId", paymentId);
    return NextResponse.redirect(redirectUrl);
}
