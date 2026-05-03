/**
 * 모바일 인앱 결제 브릿지 페이지
 *
 * 모바일 앱이 react-native-webview로 이 페이지를 열어서 PortOne 결제창 호출.
 * 결제 결과는 URL 변경(/payment/mobile-callback)으로 mobile WebView가 인터셉트.
 *
 * URL 파라미터:
 *  - token: Supabase access_token (Bearer 인증)
 *  - type: "video" | "subscription"
 *  - plan: subscription일 때 "basic" | "premium"
 *  - email: 결제자 이메일 (선택)
 *  - name: 결제자 이름 (선택)
 *
 * 결제 결과 콜백:
 *  - 성공: /payment/mobile-callback?status=success&paymentId=...&impUid=...
 *  - 실패: /payment/mobile-callback?status=failed&reason=...
 *  - 취소: /payment/mobile-callback?status=cancelled
 */

"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

// IMP 전역 타입 (lib/portone.ts에 declare global로 이미 등록됨 — 중복 declaration 회피)
interface IMPRequestPayParams {
    channelKey?: string;
    pg?: string;
    pay_method: string;
    merchant_uid: string;
    name: string;
    amount: number;
    buyer_email?: string;
    buyer_name?: string;
    m_redirect_url?: string;
    customer_uid?: string;
}
interface IMPResponse {
    success: boolean;
    imp_uid: string | null;
    merchant_uid: string;
    error_code?: string;
    error_msg?: string;
}

function loadIamportScript(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (window.IMP) { resolve(); return; }
        const existing = document.querySelector('script[src*="iamport.js"]');
        if (existing) { existing.addEventListener("load", () => resolve()); return; }
        const script = document.createElement("script");
        script.src = "https://cdn.iamport.kr/v1/iamport.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("포트원 SDK 로드 실패"));
        document.head.appendChild(script);
    });
}

function MobilePaymentInner() {
    const params = useSearchParams();
    const [status, setStatus] = useState<"loading" | "preparing" | "paying" | "error">("loading");
    const [errorMsg, setErrorMsg] = useState<string>("");

    useEffect(() => {
        (async () => {
            try {
                const token = params.get("token");
                const type = params.get("type");
                const plan = params.get("plan");
                const email = params.get("email") ?? undefined;
                const name = params.get("name") ?? undefined;

                if (!token || !type) {
                    throw new Error("필수 파라미터 누락");
                }

                setStatus("preparing");

                const merchantCode = process.env.NEXT_PUBLIC_PORTONE_MERCHANT_CODE;
                const channelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY;
                const batchChannelKey = process.env.NEXT_PUBLIC_PORTONE_BATCH_CHANNEL_KEY;

                if (!merchantCode) throw new Error("결제 시스템 환경변수 누락");

                // 1. 서버에서 결제 준비 (paymentId, amount 발급)
                const isSubscription = type === "subscription";
                const prepareUrl = isSubscription
                    ? "/api/payments/subscribe/prepare"
                    : "/api/payments/video/prepare";
                const prepareBody: Record<string, unknown> = {};
                if (isSubscription && plan) prepareBody.plan = plan;

                const prepareRes = await fetch(prepareUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(prepareBody),
                });
                if (!prepareRes.ok) {
                    const err = await prepareRes.json().catch(() => ({}));
                    throw new Error(err.error || "결제 준비 실패");
                }
                const prepareData = await prepareRes.json();
                const { paymentId, orderName, amount, customerUid } = prepareData;
                if (!paymentId || !amount) throw new Error("결제 정보 응답 형식 오류");

                // 2. iamport.js 로드 + 초기화
                await loadIamportScript();
                if (!window.IMP) throw new Error("포트원 SDK 미로드");
                window.IMP.init(merchantCode);

                setStatus("paying");

                // 3. 결제창 호출
                const useChannelKey = isSubscription ? batchChannelKey : channelKey;
                if (!useChannelKey) throw new Error("결제 채널 키 누락");

                const reqParams: IMPRequestPayParams = {
                    channelKey: useChannelKey,
                    pay_method: "card",
                    merchant_uid: paymentId,
                    name: orderName || (isSubscription ? "메멘토애니 구독" : "AI 영상 1건"),
                    amount,
                    buyer_email: email,
                    buyer_name: name,
                    // mobile redirect URL (포트원이 결제 후 이동) — 같은 origin이라 WebView가 인터셉트 가능
                    m_redirect_url: `${window.location.origin}/payment/mobile-callback?type=${type}`,
                };
                if (isSubscription && customerUid) {
                    reqParams.customer_uid = customerUid;
                }

                window.IMP.request_pay(reqParams as Parameters<NonNullable<typeof window.IMP>["request_pay"]>[0], async (response: IMPResponse) => {
                    if (!response.success) {
                        // 사용자 취소 또는 실패
                        const reason = response.error_msg || "결제가 완료되지 않았습니다";
                        const isCancel = reason.includes("취소") || response.error_code === "USER_CANCEL";
                        const status = isCancel ? "cancelled" : "failed";
                        window.location.replace(
                            `${window.location.origin}/payment/mobile-callback`
                            + `?status=${status}`
                            + `&reason=${encodeURIComponent(reason)}`
                            + `&type=${type}`,
                        );
                        return;
                    }

                    // 성공 — mobile-callback으로 이동
                    window.location.replace(
                        `${window.location.origin}/payment/mobile-callback`
                        + `?status=success`
                        + `&paymentId=${encodeURIComponent(response.merchant_uid)}`
                        + `&impUid=${encodeURIComponent(response.imp_uid ?? "")}`
                        + `&type=${type}`,
                    );
                });
            } catch (e) {
                console.error("[mobile-payment]", e);
                setErrorMsg(e instanceof Error ? e.message : "결제 진행 중 오류");
                setStatus("error");
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div style={{
            minHeight: "100dvh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            padding: 24,
            background: "#FAFAFA",
            fontFamily: "system-ui, -apple-system, sans-serif",
        }}>
            <div style={{ textAlign: "center" }}>
                {status === "error" ? (
                    <>
                        <p style={{ fontSize: 16, color: "#EF4444", marginBottom: 8 }}>
                            결제를 시작할 수 없어요
                        </p>
                        <p style={{ fontSize: 13, color: "#6B7280" }}>{errorMsg}</p>
                    </>
                ) : (
                    <>
                        <div style={{
                            width: 40, height: 40,
                            border: "4px solid #E5E7EB",
                            borderTopColor: "#05B2DC",
                            borderRadius: "50%",
                            margin: "0 auto 16px",
                            animation: "spin 0.8s linear infinite",
                        }} />
                        <p style={{ fontSize: 14, color: "#374151" }}>
                            {status === "loading" && "결제 시스템 준비 중..."}
                            {status === "preparing" && "결제 정보 확인 중..."}
                            {status === "paying" && "결제창을 열고 있어요..."}
                        </p>
                    </>
                )}
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

export default function MobilePaymentPage() {
    return (
        <Suspense fallback={<div />}>
            <MobilePaymentInner />
        </Suspense>
    );
}
