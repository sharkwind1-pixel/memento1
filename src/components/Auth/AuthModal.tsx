/**
 * AuthModal.tsx
 * 로그인/회원가입 모달
 */

"use client";

import { useState } from "react";
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
    AlertCircle,
} from "lucide-react";

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type AuthMode = "login" | "signup";

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
    const { signIn, signUp, signInWithGoogle, signInWithKakao } = useAuth();

    const [mode, setMode] = useState<AuthMode>("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [nickname, setNickname] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    if (!isOpen) return null;

    const resetForm = () => {
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setNickname("");
        setError(null);
        setSuccess(null);
    };

    const switchMode = (newMode: AuthMode) => {
        setMode(newMode);
        resetForm();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        // 유효성 검사
        if (!email || !password) {
            setError("이메일과 비밀번호를 입력해주세요.");
            return;
        }

        if (mode === "signup") {
            if (password !== confirmPassword) {
                setError("비밀번호가 일치하지 않습니다.");
                return;
            }
            if (password.length < 6) {
                setError("비밀번호는 6자 이상이어야 합니다.");
                return;
            }
        }

        setLoading(true);

        try {
            if (mode === "login") {
                const { error } = await signIn(email, password);
                if (error) {
                    if (error.message.includes("Invalid login")) {
                        setError("이메일 또는 비밀번호가 올바르지 않습니다.");
                    } else {
                        setError(error.message);
                    }
                } else {
                    onClose();
                }
            } else {
                const { error } = await signUp(email, password, nickname);
                if (error) {
                    if (error.message.includes("already registered")) {
                        setError("이미 가입된 이메일입니다.");
                    } else {
                        setError(error.message);
                    }
                } else {
                    setSuccess(
                        "가입 확인 이메일을 발송했습니다. 이메일을 확인해주세요.",
                    );
                }
            }
        } catch (err) {
            setError("오류가 발생했습니다. 다시 시도해주세요.");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        const { error } = await signInWithGoogle();
        if (error) {
            setError(error.message);
        }
        setLoading(false);
    };

    const handleKakaoLogin = async () => {
        setLoading(true);
        const { error } = await signInWithKakao();
        if (error) {
            setError(error.message);
        }
        setLoading(false);
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
                <div className="relative bg-gradient-to-r from-blue-500 to-sky-500 p-6 text-white">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <span className="text-2xl font-bold">M</span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">
                                {mode === "login" ? "로그인" : "회원가입"}
                            </h2>
                            <p className="text-white/80 text-sm">
                                메멘토애니에 오신 것을 환영합니다
                            </p>
                        </div>
                    </div>
                </div>

                {/* 폼 */}
                <div className="p-6">
                    {/* 에러/성공 메시지 */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-red-600 dark:text-red-400">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}
                    {success && (
                        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl text-green-600 dark:text-green-400">
                            <span className="text-sm">{success}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* 닉네임 (회원가입만) */}
                        {mode === "signup" && (
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input
                                    type="text"
                                    placeholder="닉네임"
                                    value={nickname}
                                    onChange={(e) =>
                                        setNickname(e.target.value)
                                    }
                                    className="pl-11 h-12 rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                />
                            </div>
                        )}

                        {/* 이메일 */}
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                                type="email"
                                placeholder="이메일"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="pl-11 h-12 rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                            />
                        </div>

                        {/* 비밀번호 */}
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="비밀번호"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-11 pr-11 h-12 rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
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

                        {/* 비밀번호 확인 (회원가입만) */}
                        {mode === "signup" && (
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="비밀번호 확인"
                                    value={confirmPassword}
                                    onChange={(e) =>
                                        setConfirmPassword(e.target.value)
                                    }
                                    className="pl-11 h-12 rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                />
                            </div>
                        )}

                        {/* 제출 버튼 */}
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 rounded-xl text-white font-medium"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : mode === "login" ? (
                                "로그인"
                            ) : (
                                "회원가입"
                            )}
                        </Button>
                    </form>

                    {/* 구분선 */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-3 bg-white dark:bg-gray-900 text-gray-500">
                                또는
                            </span>
                        </div>
                    </div>

                    {/* 소셜 로그인 */}
                    <div className="space-y-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className="w-full h-12 rounded-xl border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
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
                            onClick={handleKakaoLogin}
                            disabled={loading}
                            className="w-full h-12 rounded-xl bg-[#FEE500] hover:bg-[#FDD800] border-[#FEE500] text-[#191919] font-medium"
                        >
                            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                                <path
                                    fill="#191919"
                                    d="M12 3c5.8 0 10.5 3.66 10.5 8.18 0 4.52-4.7 8.18-10.5 8.18-1.04 0-2.04-.1-3-.3l-4.23 2.9.9-4.2C3.56 16.16 1.5 14.3 1.5 11.18 1.5 6.66 6.2 3 12 3z"
                                />
                            </svg>
                            카카오로 계속하기
                        </Button>
                    </div>

                    {/* 모드 전환 */}
                    <div className="mt-6 text-center text-sm text-gray-500">
                        {mode === "login" ? (
                            <>
                                아직 계정이 없으신가요?{" "}
                                <button
                                    type="button"
                                    onClick={() => switchMode("signup")}
                                    className="text-blue-500 hover:text-blue-600 font-medium"
                                >
                                    회원가입
                                </button>
                            </>
                        ) : (
                            <>
                                이미 계정이 있으신가요?{" "}
                                <button
                                    type="button"
                                    onClick={() => switchMode("login")}
                                    className="text-blue-500 hover:text-blue-600 font-medium"
                                >
                                    로그인
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
