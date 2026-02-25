/**
 * 네이버 OAuth 시작 - 네이버 로그인 페이지로 리다이렉트
 */
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET() {
    const clientId = process.env.NAVER_CLIENT_ID;
    if (!clientId) {
        return NextResponse.json(
            { error: "NAVER_CLIENT_ID not configured" },
            { status: 500 },
        );
    }

    const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL || "https://www.mementoani.com";
    const redirectUri = encodeURIComponent(
        `${siteUrl}/api/auth/naver/callback`,
    );
    const state = crypto.randomBytes(16).toString("hex");

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

    return response;
}
