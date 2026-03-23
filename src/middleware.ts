/**
 * CSP Nonce Middleware
 * 매 요청마다 랜덤 nonce를 생성하여 CSP 헤더에 삽입.
 * script-src에서 'unsafe-inline' 대신 nonce를 사용하여 XSS 방어 강화.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isDev = process.env.NODE_ENV === "development";

export function middleware(request: NextRequest) {
    const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

    // CSP 헤더 구성
    // script-src: nonce 기반 + strict-dynamic (nonce가 있는 스크립트가 로드한 스크립트도 허용)
    // style-src: unsafe-inline 유지 (Tailwind CSS + Radix UI 인라인 스타일 필요)
    const csp = [
        "default-src 'self'",
        `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${isDev ? "'unsafe-eval'" : ""}`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: *.supabase.co *.supabase.in images.dog.ceo cdn2.thecatapi.com 25.media.tumblr.com images.unsplash.com via.placeholder.com *.fal.ai *.fal.media",
        "media-src 'self' blob: *.supabase.co *.supabase.in *.fal.ai *.fal.media",
        "font-src 'self'",
        "worker-src 'self'",
        "connect-src 'self' *.supabase.co *.supabase.in api.openai.com apis.data.go.kr dog.ceo api.thecatapi.com *.push.services.mozilla.com fcm.googleapis.com *.fal.ai *.fal.media",
        "frame-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "upgrade-insecure-requests",
    ].join("; ");

    // nonce를 요청 헤더에 전달 (Server Component에서 읽기 위함)
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-nonce", nonce);

    const response = NextResponse.next({
        request: { headers: requestHeaders },
    });

    // CSP 헤더 설정
    response.headers.set("Content-Security-Policy", csp);

    return response;
}

// 정적 에셋, API, 이미지 최적화 등은 미들웨어에서 제외
export const config = {
    matcher: [
        {
            source: "/((?!api|_next/static|_next/image|favicon\\.ico|icons|sw\\.js|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml|og-image\\.png|logo\\.png).*)",
            // missing: 이 조건은 prefetch 요청을 포함하지 않음
        },
    ],
};
