/**
 * AuthContext.tsx
 * 인증 상태 관리 Context
 */

"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signUp: (
        email: string,
        password: string,
        nickname?: string,
    ) => Promise<{ error: Error | null }>;
    signIn: (
        email: string,
        password: string,
    ) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
    signInWithGoogle: () => Promise<{ error: Error | null }>;
    signInWithKakao: () => Promise<{ error: Error | null }>;
    updateProfile: (data: { nickname?: string }) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 현재 세션 가져오기
        const getSession = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        };

        getSession();

        // 인증 상태 변경 리스너
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // 이메일 회원가입
    const signUp = async (
        email: string,
        password: string,
        nickname?: string,
    ) => {
        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        nickname: nickname || email.split("@")[0],
                    },
                },
            });
            return { error };
        } catch (error) {
            return { error: error as Error };
        }
    };

    // 이메일 로그인
    const signIn = async (email: string, password: string) => {
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            return { error };
        } catch (error) {
            return { error: error as Error };
        }
    };

    // 로그아웃
    const signOut = async () => {
        await supabase.auth.signOut();
    };

    // 구글 로그인
    const signInWithGoogle = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                    queryParams: {
                        prompt: "select_account", // 매번 계정 선택 화면 표시
                    },
                },
            });
            return { error };
        } catch (error) {
            return { error: error as Error };
        }
    };

    // 카카오 로그인
    const signInWithKakao = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "kakao",
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                    scopes: "profile_nickname profile_image",
                },
            });
            return { error };
        } catch (error) {
            return { error: error as Error };
        }
    };

    // 프로필 업데이트
    const updateProfile = async (data: { nickname?: string }) => {
        try {
            const { error } = await supabase.auth.updateUser({
                data: {
                    nickname: data.nickname,
                },
            });
            return { error };
        } catch (error) {
            return { error: error as Error };
        }
    };

    const value = {
        user,
        session,
        loading,
        signUp,
        signIn,
        signOut,
        signInWithGoogle,
        signInWithKakao,
        updateProfile,
    };

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
