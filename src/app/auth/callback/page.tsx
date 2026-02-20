/**
 * OAuth 콜백 페이지 (클라이언트 사이드)
 *
 * 구글/카카오 로그인 후 리다이렉트되는 페이지.
 * Supabase 클라이언트 SDK가 URL의 code 파라미터를 감지하여
 * 자동으로 세션 교환(exchangeCodeForSession)을 수행한다.
 *
 * 서버 Route Handler에서 별도 Supabase 인스턴스를 생성하면
 * Web Locks API 충돌(AbortError)이 발생하므로,
 * 클라이언트 사이드에서 단일 인스턴스로 처리한다.
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleCallback = async () => {
            const params = new URLSearchParams(window.location.search);
            const code = params.get("code");
            const authError = params.get("error");
            const errorDescription = params.get("error_description");

            // OAuth 에러 처리
            if (authError) {
                console.error("[auth/callback] OAuth error:", authError, errorDescription);
                setError(errorDescription || authError);
                setTimeout(() => router.replace("/"), 2000);
                return;
            }

            // code가 있으면 세션 교환
            if (code) {
                try {
                    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

                    if (exchangeError) {
                        console.error("[auth/callback] Code exchange failed:", exchangeError.message);
                        setError(exchangeError.message);
                        setTimeout(() => router.replace("/"), 2000);
                        return;
                    }
                } catch (err) {
                    console.error("[auth/callback] Unexpected error:", err);
                    // 에러가 나도 메인으로 이동 (onAuthStateChange가 처리할 수 있음)
                }
            }

            // 성공 시 메인으로
            router.replace("/");
        };

        handleCallback();
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-50 to-white">
            <div className="text-center space-y-3">
                {error ? (
                    <>
                        <p className="text-red-500 text-sm">로그인 중 문제가 발생했습니다</p>
                        <p className="text-gray-400 text-xs">{error}</p>
                        <p className="text-gray-400 text-xs">잠시 후 메인 페이지로 이동합니다...</p>
                    </>
                ) : (
                    <>
                        <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-gray-500 text-sm">로그인 처리 중...</p>
                    </>
                )}
            </div>
        </div>
    );
}
