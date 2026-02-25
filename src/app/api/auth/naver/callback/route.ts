/**
 * 네이버 OAuth 콜백
 *
 * 1. 네이버에서 code를 받아 access_token 교환
 * 2. access_token으로 유저 프로필 조회
 * 3. Supabase admin API로 유저 생성/조회
 * 4. 매직링크 세션 발급 후 auth/callback으로 리다이렉트
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
        throw new Error("Supabase 환경변수가 설정되지 않았습니다 (URL 또는 SERVICE_ROLE_KEY)");
    }
    return createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const savedState = request.cookies.get("naver_oauth_state")?.value;

    // CSRF 검증
    if (!state || state !== savedState) {
        console.error("[Naver Auth] State mismatch:", { state, savedState });
        return NextResponse.redirect(
            `${siteUrl}/?error=invalid_state`,
        );
    }

    if (error || !code) {
        console.error("[Naver Auth] OAuth error:", error);
        return NextResponse.redirect(
            `${siteUrl}/?error=naver_auth_failed`,
        );
    }

    try {
        // 1. code → access_token 교환
        const clientId = process.env.NAVER_CLIENT_ID!;
        const clientSecret = process.env.NAVER_CLIENT_SECRET!;

        const tokenRes = await fetch(
            `https://nid.naver.com/oauth2.0/token` +
            `?grant_type=authorization_code` +
            `&client_id=${clientId}` +
            `&client_secret=${clientSecret}` +
            `&code=${code}` +
            `&state=${state}`,
        );
        const tokenData = await tokenRes.json();

        if (tokenData.error || !tokenData.access_token) {
            console.error("[Naver Auth] Token exchange failed:", tokenData);
            throw new Error(tokenData.error_description || "Token exchange failed");
        }

        // 2. access_token으로 유저 프로필 조회
        const profileRes = await fetch("https://openapi.naver.com/v1/nid/me", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const profileData = await profileRes.json();

        if (profileData.resultcode !== "00") {
            console.error("[Naver Auth] Profile fetch failed:", profileData);
            throw new Error("Failed to fetch Naver profile");
        }

        const naverUser = profileData.response;
        const naverEmail = naverUser.email;
        const naverId = naverUser.id;

        if (!naverEmail) {
            throw new Error("네이버 계정에 이메일이 없습니다. 네이버 로그인 시 이메일 제공을 허용해주세요.");
        }

        // 3. Supabase에서 유저 찾기/생성
        const supabaseAdmin = getSupabaseAdmin();

        // 이메일로 기존 유저 검색
        const { data: userList } = await supabaseAdmin.auth.admin.listUsers({
            page: 1,
            perPage: 1000,
        });

        const existingUser = userList?.users?.find(
            (u) => u.email === naverEmail,
        );

        let userId: string;

        if (existingUser) {
            userId = existingUser.id;
            // 네이버 정보 업데이트
            await supabaseAdmin.auth.admin.updateUserById(userId, {
                user_metadata: {
                    ...existingUser.user_metadata,
                    naver_id: naverId,
                    avatar_url:
                        existingUser.user_metadata?.avatar_url ||
                        naverUser.profile_image,
                    nickname:
                        existingUser.user_metadata?.nickname ||
                        naverUser.nickname,
                },
            });
        } else {
            // 새 유저 생성
            const { data: newUser, error: createError } =
                await supabaseAdmin.auth.admin.createUser({
                    email: naverEmail,
                    email_confirm: true,
                    user_metadata: {
                        naver_id: naverId,
                        nickname:
                            naverUser.nickname ||
                            naverEmail.split("@")[0],
                        avatar_url: naverUser.profile_image,
                        full_name: naverUser.name,
                        provider: "naver",
                    },
                });

            if (createError) {
                console.error("[Naver Auth] User creation failed:", createError);
                throw createError;
            }
            userId = newUser.user!.id;
        }

        // 4. 매직링크 생성하여 세션 발급
        const { data: linkData, error: linkError } =
            await supabaseAdmin.auth.admin.generateLink({
                type: "magiclink",
                email: naverEmail,
            });

        if (linkError) {
            console.error("[Naver Auth] Magic link generation failed:", linkError);
            throw linkError;
        }

        const hashedToken = linkData.properties?.hashed_token;
        if (!hashedToken) {
            throw new Error("Magic link token not generated");
        }

        // auth/callback 페이지로 리다이렉트 (token_hash + type으로 세션 교환)
        const redirectUrl =
            `${siteUrl}/auth/callback` +
            `?token_hash=${hashedToken}&type=magiclink`;

        const response = NextResponse.redirect(redirectUrl);
        response.cookies.delete("naver_oauth_state");
        return response;
    } catch (err) {
        console.error("[Naver Auth] Error:", err);
        const message = err instanceof Error ? err.message : "naver_login_failed";
        return NextResponse.redirect(
            `${siteUrl}/?error=${encodeURIComponent(message)}`,
        );
    }
}
