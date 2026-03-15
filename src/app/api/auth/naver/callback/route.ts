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
import { getClientIP } from "@/lib/rate-limit";
import { ADMIN_EMAILS } from "@/config/constants";

function getSupabaseAdmin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
        throw new Error("SUPABASE_CONFIG_MISSING");
    }
    return createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

/**
 * 이메일로 Supabase 유저를 페이지네이션 조회
 * (Supabase Admin API에 getUserByEmail이 없으므로 페이지별 검색)
 */
async function findUserByEmail(
    supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
    email: string,
) {
    let page = 1;
    const perPage = 100;
    while (true) {
        const { data: userPage } = await supabaseAdmin.auth.admin.listUsers({
            page,
            perPage,
        });
        if (!userPage?.users?.length) return null;
        const match = userPage.users.find((u) => u.email === email);
        if (match) return match;
        if (userPage.users.length < perPage) return null;
        page++;
    }
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL || "https://memento-ani.vercel.app";
    const savedState = request.cookies.get("naver_oauth_state")?.value;

    // CSRF 검증
    if (!state || state !== savedState) {
        console.error("[Naver Auth] State mismatch");
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
        // 환경변수 검증
        const clientId = process.env.NAVER_CLIENT_ID;
        const clientSecret = process.env.NAVER_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
            console.error("[Naver Auth] NAVER_CLIENT_ID or NAVER_CLIENT_SECRET not configured");
            throw new Error("NAVER_CONFIG_MISSING");
        }

        // 1. code -> access_token 교환
        const tokenRes = await fetch(
            `https://nid.naver.com/oauth2.0/token` +
            `?grant_type=authorization_code` +
            `&client_id=${clientId}` +
            `&client_secret=${clientSecret}` +
            `&code=${encodeURIComponent(code)}` +
            `&state=${encodeURIComponent(state)}`,
        );
        const tokenData = await tokenRes.json();

        if (tokenData.error || !tokenData.access_token) {
            console.error("[Naver Auth] Token exchange failed:", tokenData.error);
            throw new Error("TOKEN_EXCHANGE_FAILED");
        }

        // 2. access_token으로 유저 프로필 조회
        const profileRes = await fetch("https://openapi.naver.com/v1/nid/me", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const profileData = await profileRes.json();

        if (profileData.resultcode !== "00") {
            console.error("[Naver Auth] Profile fetch failed, resultcode:", profileData.resultcode);
            throw new Error("PROFILE_FETCH_FAILED");
        }

        const naverUser = profileData.response;
        const naverEmail = naverUser.email;
        const naverId = naverUser.id;

        if (!naverEmail) {
            throw new Error("네이버 계정에 이메일이 없습니다. 네이버 로그인 시 이메일 제공을 허용해주세요.");
        }

        // 3. Supabase에서 유저 찾기/생성
        const supabaseAdmin = getSupabaseAdmin();
        let userId: string;

        // 먼저 createUser 시도 (새 유저면 성공, 기존 유저면 에러)
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
            // 이미 존재하는 유저 -> 이메일로 조회
            const existingUser = await findUserByEmail(supabaseAdmin, naverEmail);

            if (!existingUser) {
                console.error("[Naver Auth] User exists but lookup failed");
                throw new Error("USER_LOOKUP_FAILED");
            }

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
            userId = newUser.user!.id;
        }

        // 3.5 IP 기반 다중 계정 제한 체크 (관리자 예외)
        const clientIP = await getClientIP();
        const isNaverAdmin = ADMIN_EMAILS.includes(naverEmail);

        if (!isNaverAdmin && clientIP !== "unknown") {
            // 같은 IP를 사용하는 다른 비관리자 계정이 있는지 확인
            // last_ip 컬럼이 DB에 없을 수 있으므로 에러 시 건너뜀
            try {

                const { data: ipConflict } = await (supabaseAdmin as any)
                    .from("profiles")
                    .select("id, email, is_admin")
                    .eq("last_ip", clientIP)
                    .neq("id", userId);

                if (ipConflict) {
                    const hasNonAdminConflict = (ipConflict as Array<{ id: string; email: string; is_admin: boolean }>).some(p => {
                        if (p.is_admin === true) return false;
                        if (p.email && ADMIN_EMAILS.includes(p.email)) return false;
                        return true;
                    });

                    if (hasNonAdminConflict) {
                        console.warn(`[Naver Auth] IP conflict: ip=${clientIP}, userId=${userId}`);
                        return NextResponse.redirect(
                            `${siteUrl}/?error=${encodeURIComponent("이 네트워크에서 이미 다른 계정이 사용 중입니다.")}`,
                        );
                    }
                }
            } catch {
                // last_ip 컬럼이 없을 경우 무시
            }
        }

        // IP 기록 갱신 (last_ip 컬럼이 없으면 실패하지만 무시)
        if (clientIP !== "unknown") {
            try {

                await (supabaseAdmin as any)
                    .from("profiles")
                    .update({ last_ip: clientIP })
                    .eq("id", userId);
            } catch {
                // last_ip 컬럼 없을 경우 무시
            }
        }

        // 4. 매직링크 생성하여 세션 발급
        const { data: linkData, error: linkError } =
            await supabaseAdmin.auth.admin.generateLink({
                type: "magiclink",
                email: naverEmail,
            });

        if (linkError) {
            console.error("[Naver Auth] Magic link generation failed");
            throw new Error("SESSION_CREATION_FAILED");
        }

        const hashedToken = linkData.properties?.hashed_token;
        if (!hashedToken) {
            throw new Error("SESSION_CREATION_FAILED");
        }

        // auth/callback 페이지로 리다이렉트 (token_hash + type으로 세션 교환)
        const redirectUrl =
            `${siteUrl}/auth/callback` +
            `?token_hash=${hashedToken}&type=magiclink`;

        const response = NextResponse.redirect(redirectUrl);
        response.cookies.delete("naver_oauth_state");
        return response;
    } catch (err) {
        console.error("[Naver Auth] Error:", err instanceof Error ? err.message : "unknown");
        // 사용자에게는 일반적인 에러 메시지만 반환 (내부 정보 노출 방지)
        return NextResponse.redirect(
            `${siteUrl}/?error=${encodeURIComponent("네이버 로그인에 실패했습니다")}`,
        );
    }
}
