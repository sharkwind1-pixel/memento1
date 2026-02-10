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

// 삭제 계정 체크 결과 타입 (기존 호환성)
interface DeletedAccountCheck {
    canRejoin: boolean;
    daysUntilRejoin: number;
    previousAiUsage: number;
    wasPremium: boolean;
}

// 새로운 탈퇴자 재가입 체크 결과 타입
interface RejoinCheck {
    canJoin: boolean;
    blockReason: string | null;
    waitUntil: string | null; // ISO timestamp
}

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    checkDeletedAccount: (email: string) => Promise<DeletedAccountCheck | null>;
    checkCanRejoin: (email: string) => Promise<RejoinCheck>;
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
    checkNickname: (nickname: string) => Promise<{ available: boolean; error: Error | null }>;
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

    // 삭제된 계정 체크 (재가입 쿨다운 확인) - 기존 호환성 유지
    const checkDeletedAccount = async (email: string): Promise<DeletedAccountCheck | null> => {
        try {
            const { data, error } = await supabase.rpc("check_deleted_account", {
                check_email: email,
            });

            if (error || !data || data.length === 0) {
                return null; // 삭제된 계정 없음
            }

            const record = data[0];
            return {
                canRejoin: record.can_rejoin,
                daysUntilRejoin: record.days_until_rejoin,
                previousAiUsage: record.previous_ai_usage,
                wasPremium: record.was_premium,
            };
        } catch {
            return null;
        }
    };

    // 새로운 탈퇴 유형별 재가입 가능 여부 체크
    const checkCanRejoin = async (email: string): Promise<RejoinCheck> => {
        try {
            const { data, error } = await supabase.rpc("can_rejoin", {
                check_email: email,
                check_ip: null, // 클라이언트에서는 IP를 가져올 수 없음
            });

            if (error || !data || data.length === 0) {
                // 오류 또는 데이터 없음 = 가입 가능
                return { canJoin: true, blockReason: null, waitUntil: null };
            }

            const record = data[0];
            return {
                canJoin: record.can_join,
                blockReason: record.block_reason,
                waitUntil: record.wait_until,
            };
        } catch {
            // 오류 시 가입 허용 (관리자가 직접 관리)
            return { canJoin: true, blockReason: null, waitUntil: null };
        }
    };

    // 이메일 회원가입
    const signUp = async (
        email: string,
        password: string,
        nickname?: string,
    ) => {
        try {
            // 1. 새로운 탈퇴 유형별 재가입 체크 (withdrawn_users 테이블)
            const rejoinCheck = await checkCanRejoin(email);
            if (!rejoinCheck.canJoin) {
                // 차단 사유에 따른 에러 메시지
                let errorMessage = rejoinCheck.blockReason || "가입이 제한되었습니다.";

                // 재가입 대기 기간인 경우 남은 일수 계산
                if (rejoinCheck.waitUntil) {
                    const waitDate = new Date(rejoinCheck.waitUntil);
                    const now = new Date();
                    const diffTime = waitDate.getTime() - now.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays > 0) {
                        errorMessage = `${diffDays}일 후에 재가입 가능합니다.`;
                    }
                }

                return { error: new Error(errorMessage) };
            }

            // 2. 기존 삭제된 계정 체크 (deleted_accounts 테이블 - 호환성)
            const deletedCheck = await checkDeletedAccount(email);
            if (deletedCheck && !deletedCheck.canRejoin) {
                return {
                    error: new Error(
                        `탈퇴 후 ${deletedCheck.daysUntilRejoin}일 후에 재가입 가능합니다.`
                    ),
                };
            }

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        nickname: nickname || email.split("@")[0],
                    },
                },
            });

            // 재가입인 경우 기록 업데이트
            if (!error && data.user && deletedCheck) {
                await supabase.rpc("mark_account_rejoined", {
                    p_email: email,
                    p_new_user_id: data.user.id,
                });
            }

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

    // 닉네임 중복 체크
    const checkNickname = async (nickname: string) => {
        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("id")
                .eq("nickname", nickname)
                .maybeSingle();

            if (error) {
                return { available: false, error };
            }

            // data가 null이면 사용 가능 (중복 없음)
            return { available: data === null, error: null };
        } catch (error) {
            return { available: false, error: error as Error };
        }
    };

    const value = {
        user,
        session,
        loading,
        checkDeletedAccount,
        checkCanRejoin,
        signUp,
        signIn,
        signOut,
        signInWithGoogle,
        signInWithKakao,
        updateProfile,
        checkNickname,
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
