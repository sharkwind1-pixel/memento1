/**
 * 네이버 OAuth 시작 - 네이버 로그인 페이지로 리다이렉트
 *
 * Query params:
 *  - mobile=1 + nativeUrl=mementoani://... → 모바일 앱에서 호출.
 *    state 쿠키와 함께 mobile/nativeUrl 쿠키도 저장 → callback이 auth/callback?mobile=1&nativeUrl=...
 *    형태로 forward → /auth/callback이 deep link로 token_hash 전달.
 */
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { isAllowedNativeUrl } from "@/lib/native-url";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const clientId = process.env.NAVER_CLIENT_ID;
    if (!clientId) {
        return NextResponse.json(
            { error: "NAVER_CLIENT_ID not configured" },
            { status: 500 },
        );
    }

    const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL || "https://mementoani.com";
    const redirectUri = encodeURIComponent(
        `${siteUrl}/api/auth/naver/callback`,
    );
    const state = crypto.randomBytes(16).toString("hex");

    // 모바일 앱 브릿지 파라미터 (있으면 쿠키로 저장 → callback에서 사용)
    const { searchParams } = new URL(request.url);
    const mobile = searchParams.get("mobile");
    const nativeUrl = searchParams.get("nativeUrl");

    const naverAuthUrl =
        `https://nid.naver.com/oauth2.0/authorize` +
        `?response_type=code` +
        `&client_id=${clientId}` +
        `&redirect_uri=${redirectUri}` +
        `&state=${state}`;

    const response = NextResponse.redirect(naverAuthUrl);
    response.cookies.set("naver_oauth_state", state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 600,
        path: "/",
    });
    if (mobile === "1" && nativeUrl && isAllowedNativeUrl(nativeUrl)) {
        response.cookies.set("naver_oauth_mobile", "1", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 600,
            path: "/",
        });
        response.cookies.set("naver_oauth_nativeurl", nativeUrl, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 600,
            path: "/",
        });
    }

    return response;
}
