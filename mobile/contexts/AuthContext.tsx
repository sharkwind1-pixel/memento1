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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { ADMIN_EMAILS, API_BASE_URL } from "@/config/constants";
import { UserProfile } from "@/types";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const PROJECT_REF = SUPABASE_URL.replace(/^https?:\/\//, "").split(".")[0];
// supabase-js가 PKCE verifier를 저장하는 기본 키 + 우리가 만드는 백업 키
export const SUPABASE_VERIFIER_KEY = `sb-${PROJECT_REF}-auth-token-code-verifier`;
export const VERIFIER_BACKUP_KEY = "mementoani-pkce-verifier-backup";

const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * supabase-js가 exchangeCodeForSession 시 자기 키로 verifier를 찾는데,
 * cold start로 잃어버린 경우 우리 백업을 supabase 키로 복원해서 발견되게 함.
 */
export async function ensureVerifierInStorage(): Promise<boolean> {
    const current = await AsyncStorage.getItem(SUPABASE_VERIFIER_KEY);
    if (current) return true;

    const backup = await AsyncStorage.getItem(VERIFIER_BACKUP_KEY);
    if (!backup) return false;

    await AsyncStorage.setItem(SUPABASE_VERIFIER_KEY, backup);
    console.log(`[OAuth] supabase verifier 키 복원 완료 (${backup.length} chars)`);
    return true;
}

/**
 * 표준 exchange 시도 → 실패 시 백업 verifier로 직접 token endpoint POST 폴백.
 * supabase-js의 PKCE 구현이 React Native에서 storage 읽기 race condition을 가질 때
 * 우리가 보관한 verifier로 직접 토큰 교환.
 *
 * 자동 경로(signInWithProvider)와 deep-link 경로(callback.tsx) 양쪽에서 사용.
 */
export async function exchangeCodeWithFallback(code: string): Promise<{ error: Error | null }> {
    // 1단계: supabase 키 복원 + 표준 exchange
    await ensureVerifierInStorage();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (!exchangeError) {
        await AsyncStorage.removeItem(VERIFIER_BACKUP_KEY);
        console.log(`[Auth] 표준 exchange 성공`);
        return { error: null };
    }
    console.log(`[Auth] 표준 exchange 실패: ${exchangeError.message} → 직접 token POST 폴백`);

    // 2단계: 백업 verifier로 직접 /auth/v1/token?grant_type=pkce POST
    const verifier = await AsyncStorage.getItem(VERIFIER_BACKUP_KEY);
    if (!verifier) {
        return { error: new Error("PKCE verifier가 없습니다. 다시 로그인해주세요.") };
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
            return { error: new Error(`token endpoint 실패 (${tokenRes.status}): ${errText.slice(0, 100)}`) };
        }

        const tokens = await tokenRes.json() as { access_token: string; refresh_token: string };
        await AsyncStorage.removeItem(VERIFIER_BACKUP_KEY);
        await AsyncStorage.removeItem(SUPABASE_VERIFIER_KEY);

        const { error: setErr } = await supabase.auth.setSession({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
        });
        if (setErr) return { error: setErr };

        console.log(`[Auth] 직접 token POST 폴백으로 세션 교환 성공`);
        return { error: null };
    } catch (e) {
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
     * OAuth 흐름 — Chrome Custom Tabs는 mementoani:// / exp:// 직접 redirect를 차단하므로
     * 웹 브릿지(https mementoani.com/auth/callback)를 경유한다.
     *
     * 흐름:
     * 1) signInWithOAuth → provider URL 받음
     * 2) openAuthSessionAsync로 인앱 브라우저 열기 (redirectTo = 웹 브릿지 URL)
     * 3) Provider → Supabase → 웹 브릿지 → window.location.replace(deepLink) 시도
     *    - 자동 redirect 성공: 인앱 브라우저가 deepLink 감지 → success 반환
     *    - Chrome Custom Tabs 차단 시: 사용자가 "앱으로 돌아가기" 버튼 탭 → deepLink 발동
     *      → mobile/app/auth/callback.tsx 라우트가 code 받음 → exchangeCodeForSession
     * 4) 어느 경로든 supabase가 PKCE verifier를 AsyncStorage에 저장했으므로 exchange 가능
     */
    async function signInWithProvider(provider: OAuthProvider): Promise<{ error: Error | null }> {
        try {
            // dev: exp://192.168.0.42:8081/--/auth/callback
            // prod: mementoani://auth/callback
            const nativeDeepLink = Linking.createURL("/auth/callback");
            // 웹 브릿지 경유: Custom Tabs가 차단하면 사용자 수동 탭으로 deepLink 발동
            const redirectTo = `${API_BASE_URL}/auth/callback?mobile=1&nativeUrl=${encodeURIComponent(nativeDeepLink)}`;
            console.log(`[OAuth] provider=${provider} nativeDeepLink=${nativeDeepLink}`);

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo,
                    skipBrowserRedirect: true,
                    ...(provider === "kakao"
                        ? { scopes: "profile_nickname profile_image account_email" }
                        : {}),
                },
            });

            if (error) return { error };
            if (!data?.url) return { error: new Error("OAuth URL을 받지 못했습니다.") };

            // PKCE verifier 백업: 앱이 deep link로 cold start될 때 supabase-js가 verifier를
            // 잃어버리는 케이스 방어. supabase가 저장한 키를 즉시 우리 키로 복사.
            // (AsyncStorage write race를 피하려고 짧게 retry)
            for (let i = 0; i < 5; i++) {
                const v = await AsyncStorage.getItem(SUPABASE_VERIFIER_KEY);
                if (v) {
                    await AsyncStorage.setItem(VERIFIER_BACKUP_KEY, v);
                    console.log(`[OAuth] verifier 백업 완료 (${v.length} chars)`);
                    break;
                }
                if (i === 4) {
                    console.warn("[OAuth] supabase가 verifier를 storage에 저장 안 함 — backup 실패");
                }
                await new Promise((r) => setTimeout(r, 50));
            }

            // 인앱 브라우저: nativeDeepLink를 감지해서 자동 닫힘
            // 자동 안 되면 사용자가 웹 브릿지 화면에서 "앱으로 돌아가기" 탭 → deepLink 발동
            //   → app/auth/callback.tsx 라우트가 code 받아 exchangeCodeForSession 처리
            const result = await WebBrowser.openAuthSessionAsync(data.url, nativeDeepLink);
            console.log(`[OAuth] result.type=${result.type}`);

            // 자동 redirect 경로: result.url에 code 있음
            if (result.type === "success" && result.url) {
                const callbackUrl = new URL(result.url);
                const code = callbackUrl.searchParams.get("code");
                const oauthError = callbackUrl.searchParams.get("error");
                const oauthErrorDesc = callbackUrl.searchParams.get("error_description");

                if (oauthError) return { error: new Error(oauthErrorDesc ?? oauthError) };
                if (!code) {
                    return { error: new Error(`콜백에 code 없음. URL=${result.url.slice(0, 200)}`) };
                }

                // 표준 exchange + 직접 token POST 2단계 시도
                return await exchangeCodeWithFallback(code);
            }

            // 수동 폴백 경로: 사용자가 "앱으로 돌아가기" 탭 → app/auth/callback.tsx가 처리
            // openAuthSessionAsync는 dismiss로 끝났지만 deep link 핸들러가 별도로 작동 중
            // onAuthStateChange가 SIGNED_IN을 캐치하면 자동으로 세션 set됨
            console.log(`[OAuth] 인앱 브라우저 dismiss — deep link 핸들러 대기`);
            return { error: null };
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
