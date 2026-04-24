/**
 * OAuth 콜백 페이지 (클라이언트 사이드)
 *
 * 구글/카카오 로그인 후 리다이렉트되는 페이지.
 * Supabase 클라이언트 SDK가 URL의 code 파라미터를 감지하여
 * 자동으로 세션 교환(exchangeCodeForSession)을 수행한다.
 *
 * 네이버 로그인은 token_hash + type=magiclink 파라미터로 처리.
 *
 * 서버 Route Handler에서 별도 Supabase 인스턴스를 생성하면
 * Web Locks API 충돌(AbortError)이 발생하므로,
 * 클라이언트 사이드에서 단일 인스턴스로 처리한다.
 *
 * 세션 교환 후 withdrawn_users/deleted_accounts 체크:
 * 탈퇴/차단된 계정이면 강제 로그아웃 후 에러 메시지 표시.
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
            const tokenHash = params.get("token_hash");
            const type = params.get("type");
            const authError = params.get("error");
            const errorDescription = params.get("error_description");

            // ── 모바일 앱 브릿지 ──
            // Supabase Redirect URLs allowlist에 mementoani:// / exp:// 를 추가하지 않아도
            // 동작하도록, 모바일 앱이 redirectTo를 `https://mementoani.com/auth/callback?mobile=1&nativeUrl=...`로
            // 지정하면 이 페이지가 code를 딥링크 URL에 붙여 앱으로 넘긴다.
            // PKCE code_verifier가 앱의 SecureStore에 있으므로 웹에서는 exchange하지 않는다.
            const isMobile = params.get("mobile") === "1";
            const nativeUrlRaw = params.get("nativeUrl");
            if (isMobile && nativeUrlRaw) {
                const decoded = decodeURIComponent(nativeUrlRaw);
                const separator = decoded.includes("?") ? "&" : "?";
                const forwardParams: string[] = [];
                if (code) forwardParams.push(`code=${encodeURIComponent(code)}`);
                if (tokenHash) forwardParams.push(`token_hash=${encodeURIComponent(tokenHash)}`);
                if (type) forwardParams.push(`type=${encodeURIComponent(type)}`);
                if (authError) forwardParams.push(`error=${encodeURIComponent(authError)}`);
                if (errorDescription) forwardParams.push(`error_description=${encodeURIComponent(errorDescription)}`);
                const deepLink = `${decoded}${separator}${forwardParams.join("&")}`;
                window.location.href = deepLink;
                return;
            }

            // OAuth 에러 처리
            if (authError) {
                console.error("[auth/callback] OAuth error:", authError, errorDescription);
                setError(errorDescription || authError);
                setTimeout(() => router.replace("/"), 2000);
                return;
            }

            // 네이버 로그인: token_hash + magiclink으로 세션 교환
            // 탈퇴/차단 체크는 AuthContext의 onAuthStateChange(SIGNED_IN)가 수행하므로 여기선 스킵
            if (tokenHash && type === "magiclink") {
                try {
                    const { error: verifyError } = await supabase.auth.verifyOtp({
                        token_hash: tokenHash,
                        type: "magiclink",
                    });

                    if (verifyError) {
                        console.error("[auth/callback] Magic link verify failed:", verifyError.message);
                        setError(verifyError.message);
                        setTimeout(() => router.replace("/"), 2000);
                        return;
                    }
                } catch (err) {
                    console.error("[auth/callback] Magic link error:", err);
                    setError("로그인 처리 중 오류가 발생했습니다");
                    setTimeout(() => router.replace("/"), 2000);
                    return;
                }

                router.replace("/");
                return;
            }

            // Google/카카오: code가 있으면 세션 교환
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

            // 성공 시 메인으로 (탈퇴/차단 체크는 AuthContext가 처리)
            router.replace("/");
        };

        handleCallback();
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-memento-200 to-white">
            <div className="text-center space-y-3">
                {error ? (
                    <>
                        <p className="text-red-500 text-sm">로그인 중 문제가 발생했습니다</p>
                        <p className="text-gray-400 text-xs">{error}</p>
                        <p className="text-gray-400 text-xs">잠시 후 메인 페이지로 이동합니다...</p>
                    </>
                ) : (
                    <>
                        <div className="w-8 h-8 border-2 border-memento-400 border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-gray-500 text-sm">로그인 처리 중...</p>
                    </>
                )}
            </div>
        </div>
    );
}
