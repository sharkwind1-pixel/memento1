/**
 * 포트원 V1 결제 클라이언트 유틸
 * iamport.js CDN 스크립트 + IMP.request_pay 사용
 *
 * 흐름 (단건 결제):
 * 1. POST /api/payments/prepare → paymentId, orderName, amount
 * 2. requestPortOnePayment() → 결제창 오픈
 * 3. POST /api/payments/complete → 서버 검증
 *
 * 흐름 (정기 결제/구독):
 * 1. POST /api/payments/subscribe/prepare → paymentId, orderName, amount, customerUid
 * 2. requestPortOnePayment(isSubscription: true) → 배치결제창 오픈 (빌링키 발급)
 * 3. POST /api/payments/subscribe/complete → 서버 검증 + 구독 생성
 * 4. 매월 자동: POST /subscribe/payments/again (서버→서버)
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
    customer_uid?: string; // 빌링키 발급용 (정기결제)
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
const getMerchantCode = () => process.env.NEXT_PUBLIC_PORTONE_MERCHANT_CODE || "";
const getChannelKey = () => process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY || "";
const getBatchChannelKey = () => process.env.NEXT_PUBLIC_PORTONE_BATCH_CHANNEL_KEY || "";
/**
 * KCP PG 상점 ID (사이트코드) — V1 SDK에 pg 파라미터 명시용.
 * channelKey만 넘겼을 때 KCP 라우팅에서 "미등록 사이트 코드(3014)" 에러 발생 시
 * pg: "kcp.{MID}" (일반) 또는 "kcp_billing.{MID}" (정기)로 명시해서 해결.
 * 폴백 "IP6S2"는 KCP 상점관리자에서 확인된 실연동 사이트코드.
 * (이전 폴백 "A52LD"는 포트원 공용 테스트 MID였음 — 2026-04-16 포트원 Benny 답변으로 확정)
 */
const getKcpMid = () => process.env.NEXT_PUBLIC_PORTONE_KCP_MID || "IP6S2";

export interface PaymentRequest {
    paymentId: string;     // 서버에서 발급받은 결제 ID (merchant_uid)
    orderName: string;     // 상품명
    totalAmount: number;   // 결제 금액 (원)
    customerEmail?: string;
    customerName?: string;
    isSubscription?: boolean;  // 정기결제 여부
    customerUid?: string;      // 빌링키 발급용 고유 ID
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
 * 단건 결제: channelKey(인증결제) 사용
 * 정기 결제: batchChannelKey(배치결제) + customer_uid 사용
 */
export async function requestPortOnePayment(
    params: PaymentRequest
): Promise<PaymentResult> {
    const merchantCode = getMerchantCode();
    const isSubscription = params.isSubscription || false;
    const channelKey = isSubscription ? getBatchChannelKey() : getChannelKey();

    if (!merchantCode) {
        return { success: false, error: "포트원 가맹점 식별코드가 설정되지 않았습니다." };
    }
    if (!channelKey) {
        return { success: false, error: isSubscription ? "배치결제 채널 키가 설정되지 않았습니다." : "포트원 채널 키가 설정되지 않았습니다." };
    }
    if (isSubscription && !params.customerUid) {
        return { success: false, error: "정기결제에 필요한 고객 식별자가 없습니다." };
    }

    try {
        await loadIamportScript();

        const IMP = window.IMP;
        if (!IMP) {
            return { success: false, error: "포트원 SDK 초기화에 실패했습니다." };
        }

        IMP.init(merchantCode);

        return new Promise((resolve) => {
            // V1 SDK는 channelKey만으로 KCP 라우팅 시 "3014 미등록 사이트 코드" 에러가 날 수 있어
            // pg 파라미터를 명시적으로 넘긴다. kcp_billing.{MID}는 정기결제(빌링키), kcp.{MID}는 일반결제.
            const kcpMid = getKcpMid();
            const pg = isSubscription ? `kcp_billing.${kcpMid}` : `kcp.${kcpMid}`;

            const payParams: IMPRequestPayParams = {
                pg,
                channelKey,
                pay_method: "card",
                merchant_uid: params.paymentId,
                name: params.orderName,
                amount: params.totalAmount,
                buyer_email: params.customerEmail || undefined,
                buyer_name: params.customerName || undefined,
                m_redirect_url: `${window.location.origin}/api/payments/mobile-redirect`,
            };

            // 정기결제: customer_uid 추가 → 빌링키 발급
            if (isSubscription && params.customerUid) {
                payParams.customer_uid = params.customerUid;
            }

            IMP.request_pay(payParams, (response: IMPResponse) => {
                if (!response.success) {
                    const msg = response.error_msg || "";
                    const isCancelled = response.error_code === "F400"
                        || msg.includes("결제포기")
                        || msg.includes("취소")
                        || msg.includes("cancel");
                    if (isCancelled) {
                        resolve({ success: false, error: "결제가 취소되었습니다." });
                        return;
                    }
                    console.error("[PortOne V1] 결제 실패:", response.error_code, msg);
                    // KB국민카드 심사 대기 중 안내 (카드사 심사 미완료 시 응답에 카드명 노출)
                    const isKbKookmin = msg.includes("국민")
                        || msg.includes("KB")
                        || msg.includes("KOOKMIN");
                    if (isKbKookmin) {
                        resolve({
                            success: false,
                            error: "KB국민카드는 심사 진행 중이라 아직 결제할 수 없어요. 다른 카드로 시도해주세요.",
                        });
                        return;
                    }
                    resolve({
                        success: false,
                        error: msg
                            ? `결제에 실패했어요: ${msg}`
                            : "결제에 실패했습니다. 다른 카드로 시도해주세요.",
                    });
                    return;
                }

                resolve({
                    success: true,
                    paymentId: response.merchant_uid,
                    impUid: response.imp_uid || undefined,
                });
            });
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "알 수 없는 결제 오류";
        return { success: false, error: message };
    }
}
