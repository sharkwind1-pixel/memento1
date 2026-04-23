/**
 * AuthContext — 모바일 인증 상태 관리
 * Supabase Auth + SecureStore 세션 유지
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { ADMIN_EMAILS } from "@/config/constants";
import { UserProfile } from "@/types";

interface AuthContextValue {
    session: Session | null;
    user: User | null;
    profile: UserProfile | null;
    isLoading: boolean;
    isPremium: boolean;
    isAdminUser: boolean;
    points: number;
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
    signUp: (email: string, password: string, nickname: string) => Promise<{ error: Error | null }>;
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
        // 초기 세션 로드
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) loadProfile(session.user.id);
            else setIsLoading(false);
        });

        // 세션 변경 리스닝
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) loadProfile(session.user.id);
            else {
                setProfile(null);
                setIsLoading(false);
            }
        });

        return () => subscription.unsubscribe();
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

    async function signIn(email: string, password: string) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error as Error | null };
    }

    async function signUp(email: string, password: string, nickname: string) {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { nickname },
            },
        });
        return { error: error as Error | null };
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
            signIn, signUp, signOut, refreshProfile,
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
