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

/** verifier 메모리에 있는지 확인 (callback.tsx에서 race 차단용) */
export function hasStoredVerifier(): boolean {
    return Object.keys(verifierMap).length > 0;
}

/** 모든 verifier 즉시 삭제 (취소/타임아웃 시) */
export function clearStoredVerifiers(): void {
    Object.keys(verifierMap).forEach((k) => delete verifierMap[k]);
}

/**
 * RFC 7636 권장 문자셋으로 64자 random verifier 생성.
 * 우선순위:
 *  1) globalThis.crypto.getRandomValues (RN 0.76+ Hermes 지원, 안전)
 *  2) Math.random fallback (Expo Go 등 미지원 환경 — 부팅 막지 않게 약하지만 동작)
 * 운영 빌드에서는 expo-crypto 설치해서 1번만 쓰는 게 가장 좋음.
 */
function generatePKCEVerifier(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    const cryptoApi = (globalThis as { crypto?: { getRandomValues?: (arr: Uint8Array) => Uint8Array } }).crypto;
    if (cryptoApi?.getRandomValues) {
        const bytes = new Uint8Array(64);
        cryptoApi.getRandomValues(bytes);
        let result = "";
        for (let i = 0; i < 64; i++) {
            result += chars[bytes[i] % chars.length];
        }
        return result;
    }
    // Fallback: Math.random (보안 약화 — 운영 빌드 전 expo-crypto 설치 필수)
    console.warn("[Auth] crypto.getRandomValues 미지원 — Math.random fallback (보안 약화)");
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

        // 무효 refresh token을 로컬에서 정리 (서버 호출 X, 빠름).
        // 그대로 두면 부팅마다 getSession이 refresh 재시도 → 콘솔 ERROR + hang.
        const clearInvalidSession = async () => {
            try {
                await supabase.auth.signOut({ scope: "local" });
            } catch { /* 이미 비어있으면 무시 */ }
            if (mounted) {
                setSession(null);
                setUser(null);
                setProfile(null);
            }
        };

        (async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (!mounted) return;
                if (error) {
                    // Invalid/missing refresh token 등 → 무효 토큰 정리 후 로그아웃 상태로
                    console.warn("[AuthContext] getSession error → clear local session:", error.message);
                    await clearInvalidSession();
                    return;
                }
                setSession(session);
                setUser(session?.user ?? null);
                if (session?.user) {
                    await loadProfile(session.user.id);
                }
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                console.warn("[AuthContext] init error:", msg);
                // refresh token 관련 에러는 무효 토큰 정리 (재부팅 시 반복 차단)
                if (/refresh token/i.test(msg)) {
                    await clearInvalidSession();
                }
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
                // 푸시 알림 토큰 백엔드 등록은 dev build 전용 (Expo Go에서는 expo-notifications 제한).
                // session 직후 즉시 import하면 Expo Go에서 boot crash 위험 → 부팅 안정화 후 5초 지연.
                if (session.access_token && process.env.EXPO_PUBLIC_PUSH_ENABLED === "true") {
                    setTimeout(() => {
                        import("@/lib/push-notifications")
                            .then(({ registerPushTokenWithBackend }) =>
                                registerPushTokenWithBackend(session.access_token).catch(() => {}),
                            )
                            .catch(() => {});
                    }, 5000);
                }
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

    // ============================================================================
    // 실시간 프로필 동기화 — points / premium / subscription_tier 등이 다른 디바이스(웹/앱)
    // 또는 서버 프로세스(결제 webhook, cron, admin 작업)에서 바뀌면 즉시 반영.
    //
    // ⚠️ subscribe()를 mount critical path에서 호출하면 Expo Go 부팅 막힘.
    // 2초 지연 + try/catch로 안전하게 백그라운드 구독.
    // ============================================================================
    useEffect(() => {
        if (!user?.id) return;
        let channel: ReturnType<typeof supabase.channel> | null = null;
        // 부팅 + 첫 인터랙션 끝난 후 구독 시작 (cold start 부담 최소화)
        const t = setTimeout(() => {
            try {
                channel = supabase
                    .channel(`profile:${user.id}`)
                    .on(
                        "postgres_changes",
                        {
                            event: "UPDATE",
                            schema: "public",
                            table: "profiles",
                            filter: `id=eq.${user.id}`,
                        },
                        () => { loadProfile(user.id); },
                    )
                    .subscribe();
            } catch (e) {
                console.warn("[AuthContext] realtime subscribe failed:", e);
            }
        }, 5000);

        return () => {
            clearTimeout(t);
            if (channel) supabase.removeChannel(channel);
        };
    }, [user?.id]);

    async function loadProfile(userId: string) {
        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("id, nickname, avatar_url, is_premium, is_admin, points, premium_expires_at, subscription_tier, premium_plan, subscription_phase, is_beta_tester, beta_discount_until")
                .eq("id", userId)
                .single();

            if (error) {
                console.warn("[Profile] load error:", error.message, "code=", error.code);
            }

            if (data) {
                const isPremiumActive =
                    data.is_premium &&
                    (!data.premium_expires_at || new Date(data.premium_expires_at) > new Date());

                console.log(`[Profile] loaded id=${data.id} nickname=${data.nickname} points=${data.points} isAdmin=${data.is_admin} tier=${data.subscription_tier}`);

                setProfile({
                    id: data.id,
                    nickname: data.nickname,
                    avatar: data.avatar_url,
                    isPremium: isPremiumActive,
                    isAdmin: data.is_admin,
                    points: data.points ?? 0,
                    subscriptionTier: data.subscription_tier as "free" | "basic" | "premium" | undefined,
                    premiumPlan: data.premium_plan as string | undefined,
                    subscriptionPhase: data.subscription_phase as string | undefined,
                    premiumExpiresAt: data.premium_expires_at as string | undefined,
                    isBetaTester: data.is_beta_tester ?? false,
                    betaDiscountUntil: data.beta_discount_until ?? null,
                });
            } else {
                console.warn(`[Profile] no row for userId=${userId} — creating fallback profile`);
                // RLS 또는 trigger 미실행으로 row 없는 경우 빈 프로필로 폴백
                setProfile({
                    id: userId,
                    nickname: undefined,
                    avatar: undefined,
                    isPremium: false,
                    isAdmin: false,
                    points: 0,
                });
            }
        } catch (e) {
            console.warn("[Profile] exception:", (e as Error).message);
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
            // webBridge 경유: supabase의 wildcard redirect 매칭이 exp://IP:port/-- 패턴을
            // 제대로 못 잡아서 Site URL(mementoani.com)로 fallback되는 문제 회피.
            // https URL은 매칭 안정적, 페이지가 deep link로 forward.
            // Chrome 확인창("Expo Go 앱 열려고 합니다 / 계속")은 OS 보안 정책이라 못 없앰.
            //
            // **중요**: API_BASE_URL은 www.mementoani.com로 normalize되지만,
            // Supabase 대시보드에 등록된 redirect URL은 mementoani.com (no www)일 수 있음.
            // OAuth용 redirect는 raw 도메인 사용 → Vercel이 webBridge 페이지 도달 후
            // window.location.replace(deepLink)로 앱 deep link 호출.
            const oauthOrigin = API_BASE_URL.replace(
                /^https:\/\/www\.mementoani\.com/i,
                "https://mementoani.com",
            );
            const webBridge = `${oauthOrigin}/auth/callback?mobile=1&nativeUrl=${encodeURIComponent(nativeDeepLink)}`;

            // 1. PKCE verifier 생성 → 메모리 보관
            const verifier = generatePKCEVerifier();
            verifierMap[provider] = verifier;
            console.log(`[OAuth] provider=${provider} verifier=(${verifier.length} chars)`);

            // 2. Supabase authorize URL 직접 빌드 (https webBridge redirect)
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
                // 사용자가 취소(뒤로가기) — verifier 즉시 삭제해서 deep link race로
                // Chrome SSO 자동 OAuth가 callback에서 exchange 시도하는 것 차단.
                // (이게 없으면 의도치 않게 다른 Google 계정으로 자동 가입되는 보안 버그)
                delete verifierMap[provider];
                console.log(`[OAuth] dismiss — verifier 삭제 → deep link race 차단`);
                return { error: new Error("CANCELLED") };
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

    /**
     * 네이버 로그인.
     * Supabase는 Naver를 빌트인으로 지원하지 않으므로 웹 /api/auth/naver를 경유.
     *
     * 1) WebBrowser → /api/auth/naver?mobile=1&nativeUrl=...
     * 2) 네이버 OAuth → /api/auth/naver/callback (쿠키로 mobile/nativeUrl 전달)
     * 3) 콜백이 magiclink hashed_token 생성 → /auth/callback?token_hash=...&mobile=1&nativeUrl=...
     * 4) /auth/callback이 deep link로 forward → 앱 catch
     * 5) 앱에서 supabase.auth.verifyOtp({ type:"magiclink", token_hash })로 세션 교환
     */
    async function signInWithNaver(): Promise<{ error: Error | null }> {
        try {
            const nativeDeepLink = Linking.createURL("/auth/callback");
            const oauthOrigin = API_BASE_URL.replace(
                /^https:\/\/www\.mementoani\.com/i,
                "https://mementoani.com",
            );

            // 1. /api/auth/naver?mobile=1&nativeUrl=... 호출
            const naverStart = `${oauthOrigin}/api/auth/naver`
                + `?mobile=1`
                + `&nativeUrl=${encodeURIComponent(nativeDeepLink)}`;

            console.log(`[OAuth/Naver] start=${naverStart}`);

            // 2. WebBrowser로 OAuth (자동 리다이렉트 chain)
            const result = await WebBrowser.openAuthSessionAsync(
                naverStart,
                nativeDeepLink,
            );
            console.log(`[OAuth/Naver] result.type=${result.type}`);

            if (result.type !== "success" || !result.url) {
                // 사용자가 dismiss — 폴백 deep link 핸들러가 처리
                return { error: null };
            }

            // 3. callback URL에서 token_hash 추출
            const callbackUrl = new URL(result.url);
            const tokenHash = callbackUrl.searchParams.get("token_hash");
            const errMsg = callbackUrl.searchParams.get("error_description")
                ?? callbackUrl.searchParams.get("error");

            if (errMsg) return { error: new Error(decodeURIComponent(errMsg)) };
            if (!tokenHash) {
                return { error: new Error(`콜백에 token_hash 없음. URL=${result.url.slice(0, 200)}`) };
            }

            // 4. magiclink 검증으로 세션 교환
            const { error: verifyError } = await supabase.auth.verifyOtp({
                token_hash: tokenHash,
                type: "magiclink",
            });
            if (verifyError) {
                return { error: new Error(verifyError.message) };
            }

            return { error: null };
        } catch (e) {
            return { error: e as Error };
        }
    }

    async function signOut() {
        // 푸시 토큰 정리 (dev build에서만)
        const accessToken = session?.access_token;
        if (accessToken && process.env.EXPO_PUBLIC_PUSH_ENABLED === "true") {
            try {
                const { unregisterPushTokenFromBackend } = await import("@/lib/push-notifications");
                await unregisterPushTokenFromBackend(accessToken).catch(() => {});
            } catch {
                // ignore
            }
        }
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
