/**
 * AuthContext — 모바일 인증 상태 관리
 *
 * V2 인계 후 표준 패턴으로 재작성:
 * - redirectTo: 웹 브릿지 X, 직접 deep link (Linking.createURL)
 * - 표준 3단계: signInWithOAuth → openAuthSessionAsync → exchangeCodeForSession
 * - hash/query 분기, 직접 token endpoint POST, AsyncStorage verifier 직접 읽기 → 전부 제거
 *
 * 전제 조건 (코드로 우회 불가):
 *   Supabase 대시보드 → Authentication → URL Configuration → Redirect URLs에
 *   `exp://**` 와 `mementoani://**` 두 줄 추가되어 있어야 함.
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";
import { ADMIN_EMAILS, API_BASE_URL } from "@/config/constants";
import { UserProfile } from "@/types";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// ============================================================================
// PKCE 직접 처리 — supabase-js의 PKCE 구현 우회
//
// supabase-js의 signInWithOAuth/exchangeCodeForSession은 verifier를
// AsyncStorage에 저장/읽지만 React Native에서 read-after-write race 또는
// 메모리 의존성으로 verifier not found 에러 발생.
//
// 대신 우리가 직접:
//   1. verifier 생성 → 모듈 변수에 메모리 보관
//   2. Supabase authorize URL 빌드 (?code_challenge=verifier&code_challenge_method=plain)
//   3. WebBrowser로 OAuth → code 받음
//   4. /auth/v1/token?grant_type=pkce 직접 POST (verifier는 우리 메모리에서)
//   5. supabase.auth.setSession으로 토큰 적용
//
// verifier는 메모리에만 → storage race 없음. WebBrowser는 같은 JS 컨텍스트에서
// promise 반환하므로 메모리 유지됨.
// ============================================================================

/** 모듈 레벨에 verifier 보관 (provider별로 키) */
const verifierMap: Record<string, string> = {};

/** RFC 7636 권장 문자셋으로 64자 random verifier 생성 */
function generatePKCEVerifier(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    let result = "";
    for (let i = 0; i < 64; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
}

// 사용된 code 추적 — 같은 code로 두 번 token endpoint POST 안 가도록 차단
const usedCodes = new Set<string>();

/**
 * 메모리에 보관된 verifier로 /auth/v1/token POST → setSession.
 * 같은 code로 중복 호출 방지 (자동 경로 + callback.tsx 동시 실행 race).
 */
export async function exchangeWithStoredVerifier(
    providerOrAny: string | undefined,
    code: string,
): Promise<{ error: Error | null }> {
    // 같은 code 중복 호출 차단 (flow_state_not_found 에러 방지)
    if (usedCodes.has(code)) {
        console.log(`[Auth] 이 code는 이미 처리됨 → skip`);
        return { error: null };
    }
    usedCodes.add(code);

    // 1. 정확한 provider 키로 시도, 없으면 verifierMap에 있는 아무거나
    const verifier =
        (providerOrAny && verifierMap[providerOrAny]) ||
        Object.values(verifierMap)[0];

    if (!verifier) {
        return { error: new Error("PKCE verifier가 메모리에 없습니다. 다시 로그인해주세요.") };
    }

    try {
        const tokenRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=pkce`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
        });

        if (!tokenRes.ok) {
            const errText = await tokenRes.text();
            console.log(`[Auth] token endpoint ${tokenRes.status}: ${errText.slice(0, 300)}`);
            // 실패하면 used 표시 풀어서 재시도 가능하게
            usedCodes.delete(code);
            return { error: new Error(`token endpoint ${tokenRes.status}: ${errText.slice(0, 100)}`) };
        }

        const tokens = (await tokenRes.json()) as { access_token: string; refresh_token: string };
        // verifier 1회용
        if (providerOrAny) delete verifierMap[providerOrAny];
        else Object.keys(verifierMap).forEach((k) => delete verifierMap[k]);

        const { error: setErr } = await supabase.auth.setSession({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
        });
        if (setErr) return { error: setErr };

        console.log(`[Auth] PKCE 직접 처리로 세션 교환 성공`);
        return { error: null };
    } catch (e) {
        usedCodes.delete(code);
        return { error: e as Error };
    }
}

WebBrowser.maybeCompleteAuthSession();

type OAuthProvider = "google" | "kakao";

interface AuthContextValue {
    session: Session | null;
    user: User | null;
    profile: UserProfile | null;
    isLoading: boolean;
    isPremium: boolean;
    isAdminUser: boolean;
    points: number;
    signInWithGoogle: () => Promise<{ error: Error | null }>;
    signInWithKakao: () => Promise<{ error: Error | null }>;
    signInWithNaver: () => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        // 무한 로딩 방지 hard guard (cold start AsyncStorage I/O 여유 4초)
        const hardGuard = setTimeout(() => {
            if (mounted) {
                console.warn("[AuthContext] hard guard fired");
                setIsLoading(false);
            }
        }, 4000);

        (async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!mounted) return;
                setSession(session);
                setUser(session?.user ?? null);
                if (session?.user) {
                    await loadProfile(session.user.id);
                }
            } catch (e) {
                console.warn("[AuthContext] init error:", e);
            } finally {
                if (mounted) setIsLoading(false);
            }
        })();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log(`[Auth] event=${event} hasSession=${!!session}`);
            if (!mounted) return;
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                loadProfile(session.user.id);
            } else {
                setProfile(null);
                setIsLoading(false);
            }
        });

        return () => {
            mounted = false;
            clearTimeout(hardGuard);
            subscription.unsubscribe();
        };
    }, []);

    async function loadProfile(userId: string) {
        try {
            const { data } = await supabase
                .from("profiles")
                .select("id, nickname, avatar_url, bio, is_premium, is_admin, points, premium_expires_at")
                .eq("id", userId)
                .single();

            if (data) {
                const isPremiumActive =
                    data.is_premium &&
                    (!data.premium_expires_at || new Date(data.premium_expires_at) > new Date());

                setProfile({
                    id: data.id,
                    nickname: data.nickname,
                    avatar: data.avatar_url,
                    bio: data.bio,
                    isPremium: isPremiumActive,
                    isAdmin: data.is_admin,
                    points: data.points ?? 0,
                });
            }
        } catch {
            // 프로필 로드 실패해도 앱 동작 유지
        } finally {
            setIsLoading(false);
        }
    }

    /**
     * 직접 PKCE 처리 OAuth — supabase-js 우회.
     *
     * 1) verifier 생성 → 메모리에 보관 (verifierMap)
     * 2) Supabase authorize URL 직접 빌드 (provider, redirect_to, code_challenge)
     * 3) WebBrowser.openAuthSessionAsync로 OAuth
     * 4) result에서 code 추출
     * 5) /auth/v1/token?grant_type=pkce 직접 POST (메모리의 verifier 사용)
     * 6) supabase.auth.setSession으로 토큰 적용
     */
    async function signInWithProvider(provider: OAuthProvider): Promise<{ error: Error | null }> {
        try {
            const nativeDeepLink = Linking.createURL("/auth/callback");
            // 웹 브릿지 경유: Chrome Custom Tabs가 deep link 자동 redirect 차단할 때
            // 사용자 탭 가능 버튼 표시 + window.location.replace로 시도
            const webBridge = `${API_BASE_URL}/auth/callback?mobile=1&nativeUrl=${encodeURIComponent(nativeDeepLink)}`;

            // 1. PKCE verifier 생성 → 메모리 보관
            const verifier = generatePKCEVerifier();
            verifierMap[provider] = verifier;
            console.log(`[OAuth] provider=${provider} verifier=(${verifier.length} chars)`);

            // 2. Supabase authorize URL 직접 빌드
            const authorizeUrl = new URL(`${SUPABASE_URL}/auth/v1/authorize`);
            authorizeUrl.searchParams.set("provider", provider);
            authorizeUrl.searchParams.set("redirect_to", webBridge);
            authorizeUrl.searchParams.set("code_challenge", verifier);
            authorizeUrl.searchParams.set("code_challenge_method", "plain");
            if (provider === "kakao") {
                authorizeUrl.searchParams.set("scopes", "profile_nickname profile_image account_email");
            }

            // 3. 인앱 브라우저로 OAuth
            const result = await WebBrowser.openAuthSessionAsync(
                authorizeUrl.toString(),
                nativeDeepLink,
            );
            console.log(`[OAuth] result.type=${result.type}`);

            // 자동 경로: 인앱 브라우저가 deepLink 감지 → result.url에 code
            if (result.type !== "success" || !result.url) {
                console.log(`[OAuth] 인앱 브라우저 dismiss — deep link 핸들러 대기`);
                // 폴백: 사용자가 "앱으로 돌아가기" 수동 탭 → app/auth/callback.tsx에서 처리
                return { error: null };
            }

            const callbackUrl = new URL(result.url);
            const code = callbackUrl.searchParams.get("code");
            const oauthError = callbackUrl.searchParams.get("error");
            const oauthErrorDesc = callbackUrl.searchParams.get("error_description");

            if (oauthError) return { error: new Error(oauthErrorDesc ?? oauthError) };
            if (!code) {
                return { error: new Error(`콜백에 code 없음. URL=${result.url.slice(0, 200)}`) };
            }

            return await exchangeWithStoredVerifier(provider, code);
        } catch (e) {
            return { error: e as Error };
        }
    }

    async function signInWithGoogle() {
        return signInWithProvider("google");
    }

    async function signInWithKakao() {
        return signInWithProvider("kakao");
    }

    async function signInWithNaver(): Promise<{ error: Error | null }> {
        // 웹 API (/api/auth/naver)는 쿠키 기반 세션이라 모바일 미호환
        // 추후 모바일 친화 엔드포인트 또는 Supabase custom OIDC provider 등록 후 구현
        return { error: new Error("네이버 로그인은 현재 준비 중입니다. 카카오 또는 구글을 이용해주세요.") };
    }

    async function signOut() {
        await supabase.auth.signOut();
        setProfile(null);
    }

    async function refreshProfile() {
        if (user) await loadProfile(user.id);
    }

    const isPremium = profile?.isPremium ?? false;
    const isAdminUser =
        (user?.email ? ADMIN_EMAILS.includes(user.email as typeof ADMIN_EMAILS[number]) : false) ||
        (profile?.isAdmin ?? false);
    const points = profile?.points ?? 0;

    return (
        <AuthContext.Provider value={{
            session, user, profile, isLoading,
            isPremium, isAdminUser, points,
            signInWithGoogle, signInWithKakao, signInWithNaver,
            signOut, refreshProfile,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
