/**
 * 모바일 결제 콜백 페이지
 *
 * react-native-webview의 onShouldStartLoadWithRequest가 이 URL을 인터셉트해서
 * paymentId/impUid/status를 추출하고 모달을 닫음. 따라서 이 페이지 자체는
 * 잠깐만 보였다 사라짐. PortOne의 m_redirect_url(POST 또는 GET 둘 다 처리됨)에서도 사용.
 *
 * URL 파라미터:
 *  - status: success | failed | cancelled
 *  - paymentId: merchant_uid
 *  - impUid: PortOne 고유 ID
 *  - reason: 실패 사유
 *  - type: video | subscription
 *
 * PortOne V1 m_redirect_url은 GET 또는 POST로 callback해서 imp_uid/merchant_uid/imp_success
 * 파라미터 전달 → 둘 다 처리하기 위해 useSearchParams로 양쪽 파라미터 모두 인식.
 */

"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function MobileCallbackInner() {
    const params = useSearchParams();

    useEffect(() => {
        // PortOne V1 콜백 파라미터(snake_case) + 우리 페이지에서 다시 redirect한 파라미터(camelCase) 둘 다 인식
        const impSuccess = params.get("imp_success");
        const explicitStatus = params.get("status");

        let status = explicitStatus;
        if (!status) {
            // PortOne V1: imp_success === "true" 면 성공
            status = impSuccess === "true" ? "success" : (impSuccess === "false" ? "failed" : "unknown");
        }

        const paymentId = params.get("paymentId") ?? params.get("merchant_uid") ?? "";
        const impUid = params.get("impUid") ?? params.get("imp_uid") ?? "";
        const reason = params.get("reason") ?? params.get("error_msg") ?? "";

        // mobile WebView가 인터셉트하는 sentinel URL로 다시 navigate
        // (이미 이 페이지에 있어도 한번 더 navigate해서 onShouldStartLoadWithRequest 트리거)
        const sentinel = new URL(window.location.origin + "/payment/mobile-callback");
        sentinel.searchParams.set("status", status);
        if (paymentId) sentinel.searchParams.set("paymentId", paymentId);
        if (impUid) sentinel.searchParams.set("impUid", impUid);
        if (reason) sentinel.searchParams.set("reason", reason);
        if (window.location.search.includes("type=")) {
            const t = params.get("type");
            if (t) sentinel.searchParams.set("type", t);
        }

        // params normalize 후 한번 더 replace해서 mobile WebView가 정규화된 URL을 보게 함.
        // (이미 정규화되어 있으면 idempotent)
        if (window.location.search !== sentinel.search) {
            window.location.replace(sentinel.toString());
        }
    }, [params]);

    const status = params.get("status") ?? params.get("imp_success");
    const isSuccess = status === "success" || status === "true";
    const reason = params.get("reason") ?? params.get("error_msg");

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
                {isSuccess ? (
                    <>
                        <p style={{ fontSize: 32 }}>✓</p>
                        <p style={{ fontSize: 16, color: "#10B981", marginTop: 8 }}>
                            결제 완료
                        </p>
                        <p style={{ fontSize: 13, color: "#6B7280", marginTop: 8 }}>
                            앱으로 자동 복귀 중...
                        </p>
                    </>
                ) : (
                    <>
                        <p style={{ fontSize: 16, color: "#6B7280" }}>
                            결제를 완료하지 못했어요
                        </p>
                        {reason && (
                            <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 8 }}>{reason}</p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default function MobilePaymentCallbackPage() {
    return (
        <Suspense fallback={<div />}>
            <MobileCallbackInner />
        </Suspense>
    );
}
