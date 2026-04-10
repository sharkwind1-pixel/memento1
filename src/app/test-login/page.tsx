/**
 * KCP 심사용 테스트 로그인 페이지
 *
 * 소셜 로그인만 지원하는 서비스에서, PG사 담당자가 결제 경로를
 * 확인할 수 있도록 이메일/비밀번호 로그인을 제공하는 숨겨진 페이지.
 *
 * - 기존 AuthContext.signIn() 메서드 그대로 활용
 * - 기존 소셜 로그인 코드 일절 수정 없음
 * - 심사 완료 후 이 파일 삭제하면 끝
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function TestLoginPage() {
    const { user, loading, signIn } = useAuth();
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 이미 로그인된 상태면 메인으로 이동
    useEffect(() => {
        if (!loading && user) {
            router.push("/");
        }
    }, [user, loading, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!email || !password) {
            setError("이메일과 비밀번호를 입력해주세요.");
            return;
        }

        setIsSubmitting(true);

        try {
            const { error: signInError } = await signIn(email, password);
            if (signInError) {
                setError("로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.");
            } else {
                router.push("/");
            }
        } catch {
            setError("로그인 중 오류가 발생했습니다.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-gray-500">로딩 중...</p>
            </div>
        );
    }

    if (user) {
        return null;
    }

    return (
        <>
            {/* 검색엔진 노출 방지 */}
            <meta name="robots" content="noindex, nofollow" />

            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-xl font-bold text-gray-900">
                            메멘토애니
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            테스트 계정 로그인
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-gray-700 mb-1"
                            >
                                이메일
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="test@example.com"
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-memento-400 focus:border-transparent"
                                autoComplete="email"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-gray-700 mb-1"
                            >
                                비밀번호
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="비밀번호 입력"
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-memento-400 focus:border-transparent"
                                autoComplete="current-password"
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-red-500 text-center">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3 bg-memento-500 text-white font-medium rounded-xl hover:bg-memento-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? "로그인 중..." : "로그인"}
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
}
