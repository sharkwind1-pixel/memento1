/**
 * AuthModal.tsx
 * 로그인/회원가입 모달
 * initialMode prop으로 시작 모드 설정 가능
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import {
    X,
    Mail,
    Lock,
    User,
    Eye,
    EyeOff,
    Loader2,
    CheckCircle,
    AlertCircle,
} from "lucide-react";

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialMode?: "login" | "signup";
}

export default function AuthModal({
    isOpen,
    onClose,
    initialMode = "login",
}: AuthModalProps) {
    const { signIn, signUp, signInWithGoogle, signInWithKakao } = useAuth();

    const [mode, setMode] = useState<"login" | "signup">(initialMode);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [nickname, setNickname] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // initialMode가 변경될 때 mode 업데이트
    useEffect(() => {
        setMode(initialMode);
    }, [initialMode]);

    // 모달이 열릴 때 상태 초기화
    useEffect(() => {
        if (isOpen) {
            setEmail("");
            setPassword("");
            setNickname("");
            setError(null);
            setSuccess(null);
            setLoading(false);
        }
    }, [isOpen]);

    // 페이지가 다시 보일 때 (OAuth 뒤로가기 등) 로딩 리셋
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible" && isOpen) {
                setLoading(false);
            }
        };

        const handleFocus = () => {
            if (isOpen) {
                setLoading(false);
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("focus", handleFocus);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("focus", handleFocus);
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            if (mode === "signup") {
                // 회원가입
                const { error } = await signUp(email, password, nickname);
                if (error) {
                    setError(getErrorMessage(error.message));
                } else {
                    setSuccess(
                        "회원가입이 완료되었습니다! 이메일을 확인해주세요.",
                    );
                    // 3초 후 로그인 모드로 전환
                    setTimeout(() => {
                        setMode("login");
                        setSuccess(null);
                        setPassword("");
                    }, 3000);
                }
            } else {
                // 로그인
                const { error } = await signIn(email, password);
                if (error) {
                    setError(getErrorMessage(error.message));
                } else {
                    onClose();
                }
            }
        } catch (err) {
            setError("오류가 발생했습니다. 다시 시도해주세요.");
        } finally {
            setLoading(false);
        }
    };

    const handleSocialLogin = async (provider: "google" | "kakao") => {
        setLoading(true);
        setError(null);

        try {
            if (provider === "google") {
                await signInWithGoogle();
            } else {
                await signInWithKakao();
            }
        } catch (err) {
            setError("소셜 로그인에 실패했습니다.");
            setLoading(false);
        }
    };

    const getErrorMessage = (message: string) => {
        if (message.includes("Invalid login credentials")) {
            return "이메일 또는 비밀번호가 올바르지 않습니다.";
        }
        if (message.includes("Email not confirmed")) {
            return "이메일 인증이 필요합니다. 이메일을 확인해주세요.";
        }
        if (message.includes("User already registered")) {
            return "이미 가입된 이메일입니다.";
        }
        if (message.includes("Password should be at least")) {
            return "비밀번호는 최소 6자 이상이어야 합니다.";
        }
        return message;
    };

    return (
        <div
            className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden">
                {/* 헤더 */}
                <div className="relative bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] p-6 text-white">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <h2 className="text-2xl font-bold">
                        {mode === "login" ? "로그인" : "회원가입"}
                    </h2>
                    <p className="text-white/80 mt-1">
                        {mode === "login"
                            ? "메멘토애니에 오신 것을 환영합니다"
                            : "반려동물과의 소중한 순간을 기록하세요"}
                    </p>
                </div>

                {/* 폼 */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* 에러 메시지 */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* 성공 메시지 */}
                    {success && (
                        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl text-sm">
                            <CheckCircle className="w-4 h-4 flex-shrink-0" />
                            {success}
                        </div>
                    )}

                    {/* 닉네임 (회원가입만) */}
                    {mode === "signup" && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                닉네임
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input
                                    type="text"
                                    placeholder="닉네임을 입력하세요"
                                    value={nickname}
                                    onChange={(e) =>
                                        setNickname(e.target.value)
                                    }
                                    className="pl-10 h-12 rounded-xl"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {/* 이메일 */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            이메일
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                                type="email"
                                placeholder="이메일을 입력하세요"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="pl-10 h-12 rounded-xl"
                                required
                            />
                        </div>
                    </div>

                    {/* 비밀번호 */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            비밀번호
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="비밀번호를 입력하세요"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-10 pr-10 h-12 rounded-xl"
                                required
                                minLength={6}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? (
                                    <EyeOff className="w-5 h-5" />
                                ) : (
                                    <Eye className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                        {mode === "signup" && (
                            <p className="text-xs text-gray-500">
                                최소 6자 이상 입력해주세요
                            </p>
                        )}
                    </div>

                    {/* 제출 버튼 */}
                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] hover:from-blue-600 hover:to-sky-600 rounded-xl text-base"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : mode === "login" ? (
                            "로그인"
                        ) : (
                            "회원가입"
                        )}
                    </Button>

                    {/* 구분선 */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white dark:bg-gray-900 text-gray-500">
                                또는
                            </span>
                        </div>
                    </div>

                    {/* 소셜 로그인 */}
                    <div className="space-y-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleSocialLogin("google")}
                            disabled={loading}
                            className="w-full h-12 rounded-xl"
                        >
                            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
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
                            Google로 계속하기
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleSocialLogin("kakao")}
                            disabled={loading}
                            className="w-full h-12 rounded-xl bg-[#FEE500] hover:bg-[#FDD835] border-[#FEE500] text-[#191919]"
                        >
                            <svg
                                className="w-5 h-5 mr-2"
                                viewBox="0 0 24 24"
                                fill="#191919"
                            >
                                <path d="M12 3C6.477 3 2 6.463 2 10.691c0 2.738 1.82 5.135 4.55 6.48-.168.607-.61 2.198-.7 2.543-.112.428.157.422.33.307.135-.09 2.15-1.46 3.02-2.048.57.083 1.16.127 1.8.127 5.523 0 10-3.463 10-7.409C22 6.463 17.523 3 12 3z" />
                            </svg>
                            카카오로 계속하기
                        </Button>
                    </div>

                    {/* 모드 전환 */}
                    <p className="text-center text-sm text-gray-500 mt-6">
                        {mode === "login" ? (
                            <>
                                계정이 없으신가요?{" "}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMode("signup");
                                        setError(null);
                                        setSuccess(null);
                                    }}
                                    className="text-[#05B2DC] hover:underline font-medium"
                                >
                                    회원가입
                                </button>
                            </>
                        ) : (
                            <>
                                이미 계정이 있으신가요?{" "}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMode("login");
                                        setError(null);
                                        setSuccess(null);
                                    }}
                                    className="text-[#05B2DC] hover:underline font-medium"
                                >
                                    로그인
                                </button>
                            </>
                        )}
                    </p>
                </form>
            </div>
        </div>
    );
}
