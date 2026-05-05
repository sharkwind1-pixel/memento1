/**
 * 결제 완료 페이지 (Thank-You / Conversion 페이지)
 *
 * 용도:
 * 1) 사용자에게 결제 완료 시각화
 * 2) Google Ads / GA4 / Meta 등의 conversion tracking 트리거 URL
 *
 * 진입 경로:
 * - 웹 PremiumModal 결제 성공 → window.location.href = "/payment/thank-you?type=subscribe&plan=basic"
 * - 웹 VideoPurchaseModal 결제 성공 → window.location.href = "/payment/thank-you?type=video"
 *
 * Query params:
 * - type: subscribe | video | other
 * - plan: basic | premium (subscribe일 때)
 * - amount: 결제 금액 (선택)
 *
 * Conversion tracking은 기본적으로 페이지 도달 = 완료로 간주.
 * 광고 매니저가 GTM 또는 gtag('event', 'purchase', ...) 추가 시 여기에 주입.
 */

"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function ThankYouInner() {
    const router = useRouter();
    const params = useSearchParams();
    const type = params.get("type") ?? "other";
    const plan = params.get("plan");
    const amount = params.get("amount");

    const heading = (() => {
        if (type === "subscribe") {
            if (plan === "premium") return "프리미엄 구독이 시작되었어요";
            if (plan === "basic") return "베이직 구독이 시작되었어요";
            return "정기구독이 시작되었어요";
        }
        if (type === "video") return "AI 영상 생성이 준비됐어요";
        return "결제가 완료되었어요";
    })();

    const subheading = (() => {
        if (type === "subscribe") return "이제 메멘토애니의 모든 기능을 자유롭게 즐겨보세요";
        if (type === "video") return "내 기록 → AI 영상에서 생성을 시작할 수 있어요";
        return "감사합니다";
    })();

    // 12초 후 홈 자동 이동 (수동 클릭으로도 가능)
    useEffect(() => {
        const t = setTimeout(() => router.replace("/"), 12000);
        return () => clearTimeout(t);
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-gradient-to-br from-memento-50 to-white dark:from-gray-900 dark:to-gray-950">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-memento-400 to-memento-600 flex items-center justify-center">
                    <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </div>

                <h1 className="text-xl font-bold text-gray-800 dark:text-white">{heading}</h1>
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{subheading}</p>

                {amount && (
                    <p className="mt-4 text-base font-semibold text-memento-600 dark:text-memento-400">
                        결제 금액 {Number(amount).toLocaleString()}원
                    </p>
                )}

                <div className="mt-8 flex flex-col gap-2">
                    <Link
                        href="/"
                        className="block w-full bg-memento-500 hover:bg-memento-600 text-white font-semibold rounded-xl px-4 py-3 transition"
                    >
                        홈으로 돌아가기
                    </Link>
                    <p className="text-xs text-gray-400">12초 후 자동으로 홈으로 이동합니다</p>
                </div>

                <p className="mt-6 text-[11px] text-gray-400">
                    영수증과 결제 내역은 설정 → 구독 관리에서 확인할 수 있어요
                </p>
            </div>

            {/* Conversion 추적용 데이터 속성 (GTM/광고 매니저가 읽음) */}
            <div
                data-conversion-event="purchase"
                data-conversion-type={type}
                data-conversion-plan={plan ?? ""}
                data-conversion-amount={amount ?? ""}
                style={{ display: "none" }}
                aria-hidden
            />
        </div>
    );
}

export default function ThankYouPage() {
    return (
        <Suspense fallback={<div className="min-h-screen" />}>
            <ThankYouInner />
        </Suspense>
    );
}
