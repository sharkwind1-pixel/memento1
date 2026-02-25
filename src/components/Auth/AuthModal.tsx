/**
 * AuthModal.tsx
 * 소셜 로그인 모달 (Google / 카카오 / 네이버)
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import { X, AlertCircle, Loader2 } from "lucide-react";

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
    const { signInWithGoogle, signInWithKakao, signInWithNaver } = useAuth();
    useEscapeClose(isOpen, onClose);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 모달이 열릴 때 상태 초기화
    useEffect(() => {
        if (isOpen) {
            setError(null);
            setLoading(false);
        }
    }, [isOpen]);

    // 페이지가 다시 보일 때 (OAuth 리다이렉트 후) 로딩 리셋
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible" && isOpen) {
                setLoading(false);
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange,
            );
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSocialLogin = async (provider: "google" | "kakao" | "naver") => {
        setLoading(true);
        setError(null);

        try {
            if (provider === "google") {
                await signInWithGoogle();
            } else if (provider === "kakao") {
                await signInWithKakao();
            } else {
                // 네이버는 window.location.href로 리다이렉트 (페이지 이동)
                signInWithNaver();
                return;
            }
        } catch (err) {
            setError("소셜 로그인에 실패했습니다. 다시 시도해주세요.");
            setLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[9999] overflow-y-auto bg-black/50"
            style={
                { WebkitOverflowScrolling: "touch" } as React.CSSProperties
            }
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="min-h-full flex items-start justify-center pt-16 pb-20 px-4">
                <div
                    className="w-full max-w-md sm:max-w-lg bg-white dark:bg-gray-900 rounded-3xl shadow-2xl relative"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="auth-modal-title"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* 헤더 */}
                    <div className="relative bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] p-6 rounded-t-3xl text-white">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                            aria-label="닫기"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <h2
                            id="auth-modal-title"
                            className="text-2xl font-bold"
                        >
                            시작하기
                        </h2>
                        <p className="text-white/80 mt-1">
                            메멘토애니에 오신 것을 환영합니다
                        </p>
                    </div>

                    {/* 본문 */}
                    <div className="p-6 space-y-4">
                        {/* 에러 메시지 */}
                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        {/* 안내 문구 */}
                        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                            소셜 계정으로 간편하게 시작하세요
                        </p>

                        {/* 소셜 로그인 버튼 */}
                        <div className="space-y-3">
                            {/* 네이버 */}
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleSocialLogin("naver")}
                                disabled={loading}
                                className="w-full h-12 rounded-xl bg-[#03C75A] hover:bg-[#02b351] border-[#03C75A] text-white hover:text-white"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                ) : (
                                    <svg
                                        className="w-5 h-5 mr-2"
                                        viewBox="0 0 24 24"
                                        fill="white"
                                    >
                                        <path d="M16.273 12.845 7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z" />
                                    </svg>
                                )}
                                네이버로 계속하기
                            </Button>

                            {/* 카카오 */}
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleSocialLogin("kakao")}
                                disabled={loading}
                                className="w-full h-12 rounded-xl bg-[#FEE500] hover:bg-[#FDD835] border-[#FEE500] text-[#191919]"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                ) : (
                                    <svg
                                        className="w-5 h-5 mr-2"
                                        viewBox="0 0 24 24"
                                        fill="#191919"
                                    >
                                        <path d="M12 3C6.477 3 2 6.463 2 10.691c0 2.738 1.82 5.135 4.55 6.48-.168.607-.61 2.198-.7 2.543-.112.428.157.422.33.307.135-.09 2.15-1.46 3.02-2.048.57.083 1.16.127 1.8.127 5.523 0 10-3.463 10-7.409C22 6.463 17.523 3 12 3z" />
                                    </svg>
                                )}
                                카카오로 계속하기
                            </Button>

                            {/* 구글 */}
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleSocialLogin("google")}
                                disabled={loading}
                                className="w-full h-12 rounded-xl"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                ) : (
                                    <svg
                                        className="w-5 h-5 mr-2"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            fill="#4285F4"
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        />
                                        <path
                                            fill="#34A853"
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        />
                                        <path
                                            fill="#FBBC05"
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        />
                                        <path
                                            fill="#EA4335"
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        />
                                    </svg>
                                )}
                                Google로 계속하기
                            </Button>
                        </div>

                        {/* 약관 안내 */}
                        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
                            계속 진행하면{" "}
                            <a
                                href="/terms"
                                target="_blank"
                                className="underline hover:text-sky-500"
                            >
                                이용약관
                            </a>{" "}
                            및{" "}
                            <a
                                href="/privacy"
                                target="_blank"
                                className="underline hover:text-sky-500"
                            >
                                개인정보처리방침
                            </a>
                            에 동의하는 것으로 간주됩니다.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
