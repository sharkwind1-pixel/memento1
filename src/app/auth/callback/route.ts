/**
 * OAuth 콜백 처리
 * 구글/카카오 로그인 후 리다이렉트 처리
 */

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");

    if (code) {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        );

        await supabase.auth.exchangeCodeForSession(code);
    }

    // 메인 페이지로 리다이렉트
    return NextResponse.redirect(new URL("/", requestUrl.origin));
}
