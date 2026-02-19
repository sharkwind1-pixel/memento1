/**
 * OAuth 콜백 처리
 * 구글/카카오 로그인 후 리다이렉트 처리
 */

export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const error = requestUrl.searchParams.get("error");
    const errorDescription = requestUrl.searchParams.get("error_description");

    // 오류가 있으면 로깅 후 메인으로 리다이렉트
    if (error) {
        console.error("[auth/callback] OAuth error:", error, errorDescription);
        return NextResponse.redirect(
            new URL(`/?auth_error=${encodeURIComponent(error)}`, requestUrl.origin)
        );
    }

    // 코드가 있으면 세션 교환 시도
    if (code) {
        try {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

            if (!supabaseUrl || !supabaseKey) {
                console.error("[auth/callback] Missing Supabase env vars");
                return NextResponse.redirect(
                    new URL("/?auth_error=config", requestUrl.origin)
                );
            }

            const supabase = createClient(supabaseUrl, supabaseKey);

            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

            if (exchangeError) {
                console.error("[auth/callback] Code exchange failed:", exchangeError.message);
            }
        } catch (err) {
            console.error("[auth/callback] Unexpected error:", err instanceof Error ? err.message : err);
        }
    }

    // 항상 메인 페이지로 리다이렉트 (오류 있어도)
    return NextResponse.redirect(new URL("/", requestUrl.origin));
}
