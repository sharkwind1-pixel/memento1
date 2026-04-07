/**
 * 포트원 V1 결제 클라이언트 유틸
 * iamport.js CDN 스크립트 + IMP.request_pay 사용
 *
 * 흐름:
 * 1. POST /api/payments/prepare → paymentId(merchant_uid), orderName, amount
 * 2. requestPortOnePayment() → 포트원 결제창 오픈
 * 3. 결제 완료 후 POST /api/payments/complete → 서버에서 승인 검증
 */

/** IMP 전역 객체 타입 (iamport.js CDN 로드 시 window.IMP로 접근) */
interface IMPRequestPayParams {
    channelKey?: string;
    pg?: string;
    pay_method: string;
    merchant_uid: string;
    name: string;
    amount: number;
    buyer_email?: string;
    buyer_name?: string;
    buyer_tel?: string;
    m_redirect_url?: string;
}

interface IMPResponse {
    success: boolean;
    imp_uid: string | null;
    merchant_uid: string;
    error_code?: string;
    error_msg?: string;
}

interface IMPObject {
    init: (merchantId: string) => void;
    request_pay: (params: IMPRequestPayParams, callback: (response: IMPResponse) => void) => void;
}

declare global {
    interface Window {
        IMP?: IMPObject;
    }
}

/** 환경변수를 함수 호출 시점에 읽도록 getter 사용 (빌드 시점 캐싱 방지) */
const getStoreId = () => process.env.NEXT_PUBLIC_PORTONE_STORE_ID || "";
const getChannelKey = () => process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY || "";

export interface PaymentRequest {
    paymentId: string;     // 서버에서 발급받은 결제 ID (merchant_uid)
    orderName: string;     // 상품명
    totalAmount: number;   // 결제 금액 (원)
    customerEmail?: string;
    customerName?: string;
}

export interface PaymentResult {
    success: boolean;
    paymentId?: string;    // merchant_uid
    impUid?: string;       // imp_uid (V1 결제 고유 ID)
    error?: string;
}

/** iamport.js CDN 스크립트 로드 (중복 로드 방지) */
function loadIamportScript(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (window.IMP) {
            resolve();
            return;
        }

        const existing = document.querySelector('script[src*="iamport.js"]');
        if (existing) {
            existing.addEventListener("load", () => resolve());
            return;
        }

        const script = document.createElement("script");
        script.src = "https://cdn.iamport.kr/v1/iamport.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("포트원 SDK 로드에 실패했습니다."));
        document.head.appendChild(script);
    });
}

/**
 * 포트원 V1 결제창을 열고 결제 완료 시 결과를 반환
 * PC: 콜백 방식, 모바일: m_redirect_url 리다이렉트
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
        await loadIamportScript();

        const IMP = window.IMP;
        if (!IMP) {
            return { success: false, error: "포트원 SDK 초기화에 실패했습니다." };
        }

        IMP.init(storeId);

        return new Promise((resolve) => {
            IMP.request_pay(
                {
                    channelKey,
                    pay_method: "card",
                    merchant_uid: params.paymentId,
                    name: params.orderName,
                    amount: params.totalAmount,
                    buyer_email: params.customerEmail || undefined,
                    buyer_name: params.customerName || undefined,
                    m_redirect_url: `${window.location.origin}/api/payments/mobile-redirect`,
                },
                (response: IMPResponse) => {
                    if (!response.success) {
                        // 유저가 결제창을 닫은 경우
                        if (response.error_code === "F400") {
                            resolve({ success: false, error: "결제가 취소되었습니다." });
                            return;
                        }
                        console.error("[PortOne V1] 결제 실패:", response.error_code, response.error_msg);
                        resolve({
                            success: false,
                            error: response.error_msg || "결제에 실패했습니다.",
                        });
                        return;
                    }

                    resolve({
                        success: true,
                        paymentId: response.merchant_uid,
                        impUid: response.imp_uid || undefined,
                    });
                },
            );
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "알 수 없는 결제 오류";
        return { success: false, error: message };
    }
}
