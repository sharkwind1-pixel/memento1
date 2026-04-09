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
    // script-src: nonce 기반. unsafe-inline은 iamport.js SDK가 동적 인라인 스크립트를
    // 생성하기 때문에 필요 (제거 시 모바일 결제 FAILED TO FETCH 발생 — 2026-04-07 CSP 메모리 참조).
    // style-src: unsafe-inline 유지 (Tailwind CSS + Radix UI 인라인 스타일 필요)
    const csp = [
        "default-src 'self'",
        `script-src 'self' 'nonce-${nonce}' ${isDev ? "'unsafe-eval'" : ""} https://*.iamport.kr https://*.iamport.co https://*.portone.io https://*.kcp.co.kr https://t1.kakaocdn.net 'unsafe-inline'`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: *.supabase.co *.supabase.in images.dog.ceo cdn2.thecatapi.com 25.media.tumblr.com images.unsplash.com via.placeholder.com *.fal.ai *.fal.media *.kakaocdn.net",
        "media-src 'self' blob: *.supabase.co *.supabase.in *.fal.ai *.fal.media",
        "font-src 'self'",
        "worker-src 'self'",
        "connect-src 'self' *.supabase.co *.supabase.in api.openai.com apis.data.go.kr dog.ceo api.thecatapi.com *.push.services.mozilla.com fcm.googleapis.com *.fal.ai *.fal.media https://*.iamport.co https://*.iamport.kr https://*.portone.io https://*.kcp.co.kr https://pay.kcp.co.kr https://*.kakao.com",
        "frame-src 'self' https://*.iamport.co https://*.iamport.kr https://*.portone.io https://*.kcp.co.kr https://pay.kcp.co.kr",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self' https://*.iamport.kr https://*.iamport.co https://*.portone.io https://*.kcp.co.kr https://pay.kcp.co.kr",
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
            source: "/((?!api|_next/static|_next/image|favicon\\.ico|icons|sw\\.js|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml|og-image\\.png|logo\\.png|naver.*\\.html).*)",
            // missing: 이 조건은 prefetch 요청을 포함하지 않음
        },
    ],
};
