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

    // 오류가 있으면 메인으로 리다이렉트 (에러 파라미터 전달 X)
    if (error) {
        console.error("OAuth Error:", error, errorDescription);
        return NextResponse.redirect(new URL("/", requestUrl.origin));
    }

    // 코드가 있으면 세션 교환 시도
    if (code) {
        try {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            );

            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

            if (exchangeError) {
                console.error("Session exchange error:", exchangeError);
                // 이미 사용된 코드거나 만료된 코드 - 조용히 메인으로
            }
        } catch (e) {
            console.error("Auth callback error:", e);
        }
    }

    // 항상 메인 페이지로 리다이렉트 (오류 있어도)
    return NextResponse.redirect(new URL("/", requestUrl.origin));
}
