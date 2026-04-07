/**
 * 모바일 결제 리다이렉트 핸들러
 * GET /api/payments/mobile-redirect
 *
 * 모바일에서 포트원 V1 결제 완료 후 리다이렉트되는 엔드포인트
 * V1 쿼리 파라미터: imp_uid, merchant_uid, imp_success, error_msg
 * 메인 페이지로 리다이렉트하여 클라이언트에서 /api/payments/complete 호출
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;

    // V1 파라미터
    const impUid = searchParams.get("imp_uid") || "";
    const merchantUid = searchParams.get("merchant_uid") || "";
    const impSuccess = searchParams.get("imp_success");
    const errorMsg = searchParams.get("error_msg") || "";

    // 결제 실패/취소
    if (impSuccess === "false") {
        const redirectUrl = new URL("/", request.url);
        redirectUrl.searchParams.set("payment", "failed");
        redirectUrl.searchParams.set("reason", errorMsg || "결제가 완료되지 않았습니다.");
        return NextResponse.redirect(redirectUrl);
    }

    // 결제 성공 → 클라이언트에서 complete API 호출하도록
    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams.set("payment", "mobile-complete");
    redirectUrl.searchParams.set("paymentId", merchantUid);
    redirectUrl.searchParams.set("impUid", impUid);
    return NextResponse.redirect(redirectUrl);
}
