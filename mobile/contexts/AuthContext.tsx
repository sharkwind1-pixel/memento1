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
import { ADMIN_EMAILS } from "@/config/constants";
import { UserProfile } from "@/types";

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
     * 표준 OAuth 흐름 — supabase-js + expo-web-browser + expo-linking
     *
     * 1) signInWithOAuth: provider URL 생성 (브라우저 열지 않음)
     * 2) openAuthSessionAsync: 인앱 브라우저로 OAuth 진행, deep link로 복귀
     * 3) exchangeCodeForSession: 받은 code를 세션으로 교환
     *
     * supabase-js가 PKCE verifier를 AsyncStorage에 저장 → 같은 supabase 인스턴스에서
     * exchangeCodeForSession 호출 시 storage에서 읽어 사용. 우리는 손대지 않는다.
     */
    async function signInWithProvider(provider: OAuthProvider): Promise<{ error: Error | null }> {
        try {
            // dev: exp://192.168.0.42:8081/--/auth/callback
            // prod: mementoani://auth/callback
            const redirectTo = Linking.createURL("/auth/callback");
            console.log(`[OAuth] provider=${provider} redirectTo=${redirectTo}`);

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

            const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
            console.log(`[OAuth] result.type=${result.type}`);

            if (result.type !== "success" || !result.url) {
                return { error: new Error(`로그인 취소 (type=${result.type})`) };
            }

            // PKCE flow: query string에서 code 추출 → 표준 exchange
            const callbackUrl = new URL(result.url);
            const code = callbackUrl.searchParams.get("code");
            const oauthError = callbackUrl.searchParams.get("error");
            const oauthErrorDesc = callbackUrl.searchParams.get("error_description");

            if (oauthError) {
                return { error: new Error(oauthErrorDesc ?? oauthError) };
            }
            if (!code) {
                return { error: new Error(`콜백에 code 없음. URL=${result.url.slice(0, 200)}`) };
            }

            const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeErr) {
                console.log(`[OAuth] exchangeCodeForSession error: ${exchangeErr.message}`);
                return { error: exchangeErr };
            }

            console.log(`[OAuth] 세션 교환 성공`);
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
