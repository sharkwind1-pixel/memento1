/**
 * CookieConsentBanner.tsx
 * GDPR/한국 개인정보보호법 대응 쿠키 동의 배너
 *
 * localStorage에 동의 상태 저장
 * 첫 방문 시 하단에 표시, 동의 후 숨김
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Cookie, X, ChevronDown, ChevronUp } from "lucide-react";

export default function CookieConsentBanner() {
    const [visible, setVisible] = useState(false);
    const [showDetail, setShowDetail] = useState(false);

    useEffect(() => {
        // 이미 동의했으면 표시하지 않음
        try {
            const consent = localStorage.getItem("memento-cookie-consent");
            if (!consent) {
                // 약간의 딜레이 후 표시 (UX 개선)
                const timer = setTimeout(() => setVisible(true), 1500);
                return () => clearTimeout(timer);
            }
        } catch {
            // localStorage 접근 불가 시 표시하지 않음
        }
    }, []);

    const handleAcceptAll = () => {
        try {
            localStorage.setItem(
                "memento-cookie-consent",
                JSON.stringify({
                    essential: true,
                    analytics: true,
                    marketing: true,
                    acceptedAt: new Date().toISOString(),
                })
            );
        } catch {
            // localStorage 접근 불가 무시
        }
        setVisible(false);
    };

    const handleAcceptEssential = () => {
        try {
            localStorage.setItem(
                "memento-cookie-consent",
                JSON.stringify({
                    essential: true,
                    analytics: false,
                    marketing: false,
                    acceptedAt: new Date().toISOString(),
                })
            );
        } catch {
            // localStorage 접근 불가 무시
        }
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div
            className="fixed bottom-0 left-0 right-0 z-[9990] animate-in slide-in-from-bottom duration-500"
            role="dialog"
            aria-label="쿠키 사용 동의"
        >
            <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-t border-gray-200 dark:border-gray-700 shadow-2xl">
                <div className="max-w-4xl mx-auto px-4 py-4 sm:py-5">
                    <div className="flex items-start gap-3">
                        {/* 아이콘 */}
                        <div className="hidden sm:flex w-10 h-10 bg-memento-100 dark:bg-memento-900/30 rounded-xl items-center justify-center flex-shrink-0 mt-0.5">
                            <Cookie className="w-5 h-5 text-memento-600 dark:text-memento-400" />
                        </div>

                        {/* 텍스트 */}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                메멘토애니는 서비스 이용에 필요한 필수 쿠키와 사용자 경험 개선을 위한 분석 쿠키를 사용합니다.{" "}
                                <a
                                    href="/privacy"
                                    className="underline text-memento-600 dark:text-memento-400 hover:text-memento-700"
                                    target="_blank"
                                >
                                    개인정보처리방침
                                </a>
                                에서 자세한 내용을 확인하세요.
                            </p>

                            {/* 상세 보기 토글 */}
                            <button
                                onClick={() => setShowDetail(!showDetail)}
                                className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mt-1.5 transition-colors"
                            >
                                {showDetail ? (
                                    <>
                                        <ChevronUp className="w-3 h-3" />
                                        접기
                                    </>
                                ) : (
                                    <>
                                        <ChevronDown className="w-3 h-3" />
                                        쿠키 상세 보기
                                    </>
                                )}
                            </button>

                            {/* 상세 내용 */}
                            {showDetail && (
                                <div className="mt-3 space-y-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="font-medium text-gray-700 dark:text-gray-300">필수 쿠키</span>
                                            <p className="mt-0.5">로그인, 보안, 다크모드 등 서비스 운영에 필수적인 쿠키</p>
                                        </div>
                                        <span className="text-green-600 dark:text-green-400 text-xs font-medium flex-shrink-0 ml-2">
                                            항상 활성
                                        </span>
                                    </div>
                                    <div className="w-full h-px bg-gray-200 dark:bg-gray-700" />
                                    <div>
                                        <span className="font-medium text-gray-700 dark:text-gray-300">분석 쿠키</span>
                                        <p className="mt-0.5">방문 통계, 서비스 개선을 위한 익명 사용 데이터 수집</p>
                                    </div>
                                    <div className="w-full h-px bg-gray-200 dark:bg-gray-700" />
                                    <div>
                                        <span className="font-medium text-gray-700 dark:text-gray-300">마케팅 쿠키</span>
                                        <p className="mt-0.5">맞춤 광고 제공 및 마케팅 효과 측정 (향후 적용 예정)</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 버튼들 */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleAcceptEssential}
                                className="rounded-xl text-xs h-9 px-3 border-gray-300 dark:border-gray-600"
                            >
                                필수만
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleAcceptAll}
                                className="rounded-xl text-xs h-9 px-4 bg-gradient-to-r from-memento-500 to-memento-400 hover:from-blue-600 hover:to-sky-600"
                            >
                                모두 동의
                            </Button>
                            <button
                                onClick={handleAcceptEssential}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors sm:hidden"
                                aria-label="닫기"
                            >
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
