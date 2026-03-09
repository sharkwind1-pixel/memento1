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

/**
 * 탈퇴/차단 계정인지 체크하고, 해당 시 강제 로그아웃
 * @returns 차단된 경우 에러 메시지, 아니면 null
 */
async function checkWithdrawnAndBlock(email: string | undefined): Promise<string | null> {
    if (!email) return null;

    try {
        // 1. withdrawn_users 체크 (can_rejoin RPC)
        const { data: rejoinData } = await supabase.rpc("can_rejoin", {
            check_email: email,
            check_ip: null,
        });

        if (rejoinData && rejoinData.length > 0) {
            const record = rejoinData[0];
            if (!record.can_join) {
                // 차단/대기 중 — 강제 로그아웃
                await supabase.auth.signOut();

                if (record.block_reason === "영구 차단된 계정입니다.") {
                    return "이용이 제한된 계정입니다.";
                }
                if (record.wait_until) {
                    const waitDate = new Date(record.wait_until);
                    const now = new Date();
                    const diffDays = Math.ceil(
                        (waitDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                    );
                    if (diffDays > 0) {
                        return `탈퇴 후 ${diffDays}일 후에 재가입 가능합니다.`;
                    }
                }
                return record.block_reason || "가입이 제한되었 계정입니다.";
            }
        }

        // 2. deleted_accounts 체크 (기존 호환성)
        const { data: deletedData } = await supabase.rpc("check_deleted_account", {
            check_email: email,
        });

        if (deletedData && deletedData.length > 0) {
            const record = deletedData[0];
            if (!record.can_rejoin) {
                await supabase.auth.signOut();
                return `탈퇴 후 ${record.days_until_rejoin}일 후에 재가입 가능합니다.`;
            }
        }

        return null; // 문제 없음
    } catch {
        // 체크 실패 시 로그인 허용 (가용성 우선)
        return null;
    }
}

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

            // OAuth 에러 처리
            if (authError) {
                console.error("[auth/callback] OAuth error:", authError, errorDescription);
                setError(errorDescription || authError);
                setTimeout(() => router.replace("/"), 2000);
                return;
            }

            // 네이버 로그인: token_hash + magiclink으로 세션 교환
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
                }

                // 탈퇴/차단 계정 체크
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    const blockMsg = await checkWithdrawnAndBlock(session.user.email);
                    if (blockMsg) {
                        setError(blockMsg);
                        setTimeout(() => router.replace("/"), 3000);
                        return;
                    }
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

                // 탈퇴/차단 계정 체크
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    const blockMsg = await checkWithdrawnAndBlock(session.user.email);
                    if (blockMsg) {
                        setError(blockMsg);
                        setTimeout(() => router.replace("/"), 3000);
                        return;
                    }
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
