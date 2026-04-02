/**
 * 포트원 V2 결제 클라이언트 유틸
 * @portone/browser-sdk를 사용한 결제 요청 래퍼
 *
 * 흐름:
 * 1. POST /api/payments/prepare → paymentId, orderName, amount
 * 2. requestPortOnePayment() → 포트원 결제창 오픈
 * 3. 결제 완료 후 POST /api/payments/complete → 서버에서 승인 검증
 */

import * as PortOne from "@portone/browser-sdk/v2";

/** 환경변수를 함수 호출 시점에 읽도록 getter 사용 (빌드 시점 캐싱 방지) */
const getStoreId = () => process.env.NEXT_PUBLIC_PORTONE_STORE_ID || "";
const getChannelKey = () => process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY || "";

export interface PaymentRequest {
    paymentId: string;     // 서버에서 발급받은 결제 ID
    orderName: string;     // 상품명
    totalAmount: number;   // 결제 금액 (원)
    customerEmail?: string;
    customerName?: string;
}

export interface PaymentResult {
    success: boolean;
    paymentId?: string;
    error?: string;
}

/**
 * 포트원 결제창을 열고 결제 완료 시 결과를 반환
 * 팝업/리다이렉트 방식 자동 처리 (모바일은 리다이렉트)
 */
export async function requestPortOnePayment(
    params: PaymentRequest
): Promise<PaymentResult> {
    const storeId = getStoreId();
    const channelKey = getChannelKey();

    if (!storeId) {
        return { success: false, error: "포트원 Store ID가 설정되지 않았습니다." };
    }
    if (!channelKey) {
        return { success: false, error: "포트원 채널 키가 설정되지 않았습니다." };
    }

    try {
        const response = await PortOne.requestPayment({
            storeId,
            channelKey,
            paymentId: params.paymentId,
            orderName: params.orderName,
            totalAmount: params.totalAmount,
            currency: "CURRENCY_KRW",
            payMethod: "CARD",
            customer: {
                email: params.customerEmail,
                fullName: params.customerName,
            },
            // redirectUrl은 모바일 리다이렉트 결제 시 사용
            // PC에서는 팝업으로 결과가 바로 반환됨
            redirectUrl: `${window.location.origin}/api/payments/mobile-redirect`,
        });

        if (!response) {
            return { success: false, error: "결제 응답이 없습니다." };
        }

        // 유저가 결제창을 닫은 경우
        if (response.code === "FAILURE_TYPE_PG") {
            return { success: false, error: "결제가 취소되었습니다." };
        }

        if (response.code != null) {
            return {
                success: false,
                error: response.message || "결제에 실패했습니다.",
            };
        }

        // 결제 성공 → paymentId 반환
        return {
            success: true,
            paymentId: response.paymentId,
        };
    } catch (err) {
        const message = err instanceof Error ? err.message : "알 수 없는 결제 오류";
        return { success: false, error: message };
    }
}
