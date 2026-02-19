/**
 * Error Boundary - 전역 에러 처리
 * React 컴포넌트 크래시 시 복구 UI 표시
 */
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // 프로덕션 에러 로깅 (향후 Sentry 등 연동 가능)
        if (process.env.NODE_ENV === "production") {
            // TODO: 에러 모니터링 서비스 연동
        }
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F0F9FF] via-[#FAFCFF] to-white p-4">
            <div className="max-w-md w-full bg-white/80 backdrop-blur-sm rounded-3xl border border-white/50 shadow-xl p-8 text-center">
                <div className="w-16 h-16 bg-sky-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg
                        className="w-8 h-8 text-sky-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                        />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">
                    잠깐, 문제가 생겼어요
                </h2>
                <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                    일시적인 오류가 발생했습니다.
                    <br />
                    아래 버튼을 눌러 다시 시도해주세요.
                </p>
                <div className="flex gap-3 justify-center">
                    <Button
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => window.location.href = "/"}
                    >
                        홈으로
                    </Button>
                    <Button
                        className="rounded-xl bg-gradient-to-r from-sky-500 to-blue-500"
                        onClick={() => reset()}
                    >
                        다시 시도
                    </Button>
                </div>
            </div>
        </div>
    );
}
