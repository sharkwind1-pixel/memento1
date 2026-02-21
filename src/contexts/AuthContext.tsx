/**
 * AuthContext.tsx
 * 인증 상태 관리 Context + 포인트 시스템
 */

"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    useMemo,
    ReactNode,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { ADMIN_EMAILS, type PetIconType } from "@/config/constants";
import type { OnboardingData, MinimiEquipState } from "@/types";
import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";
import { toast } from "sonner";
import { CHARACTER_CATALOG } from "@/data/minimiPixels";

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
    // 권한 상태 (DB + 이메일 기반 통합 체크)
    isAdminUser: boolean;
    isPremiumUser: boolean;
    refreshProfile: () => Promise<void>;
    // 프로필 로딩 완료 플래그
    profileLoaded: boolean;
    // 사용자 반려동물 타입 (아이콘용)
    userPetType: PetIconType;
    // 온보딩 데이터 (개인화용)
    onboardingData: OnboardingData | null;
    // 포인트 시스템
    points: number;
    pointsLoaded: boolean;
    refreshPoints: () => Promise<void>;
    // 미니미 장착 상태
    minimiEquip: MinimiEquipState;
    refreshMinimi: () => Promise<void>;
    // 인증 메서드
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
    const [isAdminUser, setIsAdminUser] = useState(false);
    const [isPremiumUser, setIsPremiumUser] = useState(false);
    const [points, setPoints] = useState(0);
    const [pointsLoaded, setPointsLoaded] = useState(false);
    const [profileLoaded, setProfileLoaded] = useState(false);
    const [userPetType, setUserPetType] = useState<PetIconType>("dog");
    const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
    const [minimiEquip, setMinimiEquip] = useState<MinimiEquipState>({
        minimiId: null,
        accessoryIds: [],
        pixelData: null,
        accessoriesData: [],
        imageUrl: null,
    });

    // 프로필에서 관리자/프리미엄 상태 조회
    // 프로필+포인트 통합 조회 (단일 쿼리)
    const refreshProfile = useCallback(async () => {
        try {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (!currentUser) {
                setIsAdminUser(false);
                setIsPremiumUser(false);
                setProfileLoaded(true);
                return;
            }

            const { data, error } = await supabase
                .from("profiles")
                .select("is_admin, is_premium, premium_expires_at, points, onboarding_data, equipped_minimi_id, equipped_accessories, minimi_pixel_data, minimi_accessories_data")
                .eq("id", currentUser.id)
                .single();

            // 관리자 체크
            const emailAdmin = ADMIN_EMAILS.includes(currentUser.email || "");
            const dbAdmin = !error && data?.is_admin === true;
            setIsAdminUser(emailAdmin || dbAdmin);

            // 프리미엄 체크
            if (!error && data?.is_premium === true) {
                const expiresAt = data.premium_expires_at;
                setIsPremiumUser(!expiresAt || new Date(expiresAt) > new Date());
            } else {
                setIsPremiumUser(false);
            }

            // 포인트도 같이 설정
            setPoints(!error ? (data?.points ?? 0) : 0);

            // 미니미 장착 상태 설정
            if (!error && data) {
                const equippedSlug = data.equipped_minimi_id || null;
                const catalogItem = equippedSlug ? CHARACTER_CATALOG.find(c => c.slug === equippedSlug) : null;
                setMinimiEquip({
                    minimiId: equippedSlug,
                    accessoryIds: data.equipped_accessories || [],
                    pixelData: data.minimi_pixel_data || null,
                    accessoriesData: data.minimi_accessories_data || [],
                    imageUrl: catalogItem?.imageUrl || null,
                    displayScale: catalogItem?.displayScale ?? 1.0,
                });
            }

            // 온보딩 데이터 설정 + petType 추출
            if (!error && data?.onboarding_data) {
                const obData = data.onboarding_data as OnboardingData;
                setOnboardingData(obData);
                const pt = obData.petType;
                if (pt === "cat") setUserPetType("cat");
                else if (pt === "other") setUserPetType("other");
                else setUserPetType("dog");
            } else {
                setOnboardingData(null);
            }

            setPointsLoaded(true);
            setProfileLoaded(true);
        } catch {
            setPointsLoaded(true);
            setProfileLoaded(true);
        }
    }, []);

    // 포인트만 새로고침 (포인트 변경 후 호출용)
    const refreshPoints = useCallback(async () => {
        try {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (!currentUser) return;

            const { data: profile } = await supabase
                .from("profiles")
                .select("points")
                .eq("id", currentUser.id)
                .single();

            setPoints(profile?.points ?? 0);
            setPointsLoaded(true);
        } catch {
            setPointsLoaded(true);
        }
    }, []);

    // 미니미 장착 상태만 새로고침 (장착/구매/판매 후 호출용)
    const refreshMinimi = useCallback(async () => {
        try {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (!currentUser) return;

            const { data } = await supabase
                .from("profiles")
                .select("equipped_minimi_id, equipped_accessories, minimi_pixel_data, minimi_accessories_data")
                .eq("id", currentUser.id)
                .single();

            if (data) {
                const equippedSlug = data.equipped_minimi_id || null;
                const catalogItem = equippedSlug ? CHARACTER_CATALOG.find(c => c.slug === equippedSlug) : null;
                setMinimiEquip({
                    minimiId: equippedSlug,
                    accessoryIds: data.equipped_accessories || [],
                    pixelData: data.minimi_pixel_data || null,
                    accessoriesData: data.minimi_accessories_data || [],
                    imageUrl: catalogItem?.imageUrl || null,
                });
            }
        } catch {
            // 미니미 새로고침 실패해도 앱 사용에 영향 없음
        }
    }, []);

    // 출석 체크 (API 엔드포인트 사용 - 서버 인증으로 RLS 우회)
    const checkDailyLogin = useCallback(async () => {
        try {
            const today = new Date().toISOString().split("T")[0];
            const lastCheck = localStorage.getItem("lastDailyCheck");
            if (lastCheck === today) return;

            const response = await authFetch(API.POINTS_DAILY_CHECK, {
                method: "POST",
            });

            if (!response.ok) return;

            const data = await response.json();
            localStorage.setItem("lastDailyCheck", today);

            if (data.success && data.earned > 0) {
                await refreshPoints();
                toast.success(`출석 체크 완료! +${data.earned}P`);
            }
        } catch {
            // 출석 체크 실패해도 앱 사용에 영향 없음
        }
    }, [refreshPoints]);

    useEffect(() => {
        // 현재 세션 가져오기
        const getSession = async () => {
            try {
                const {
                    data: { session },
                } = await supabase.auth.getSession();
                setSession(session);
                setUser(session?.user ?? null);

                // 세션 확인 즉시 로딩 해제 (UI를 빠르게 표시)
                setLoading(false);

                // 로그인 상태면 프로필+포인트를 백그라운드에서 로드 (UI 블로킹 없음)
                if (session?.user) {
                    refreshProfile().then(() => checkDailyLogin());
                }
            } catch {
                // 세션 로드 실패해도 앱은 비로그인 상태로 동작
                setSession(null);
                setUser(null);
                setLoading(false);
            }
        };

        getSession();

        // 안전장치: 5초 이내에 로딩이 끝나지 않으면 강제로 비로그인 상태로 진입
        const safetyTimer = setTimeout(() => {
            setLoading((prev) => {
                if (prev) {
                    setSession(null);
                    setUser(null);
                    setProfileLoaded(true);
                    setPointsLoaded(true);
                }
                return false;
            });
        }, 5000);

        // 인증 상태 변경 리스너
        // 주의: onAuthStateChange 콜백은 Supabase 내부 lock 안에서 호출된다.
        // 여기서 await로 supabase.auth API를 호출하면 재진입 데드락이 발생하므로
        // 프로필 로드 등은 setTimeout으로 lock 바깥에서 실행한다.
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);

            // 로그인 시 프로필+포인트 통합 로드 + 출석 체크
            // (lock 바깥에서 비동기 실행하여 데드락 방지)
            if (event === "SIGNED_IN" && session?.user) {
                setTimeout(() => {
                    refreshProfile().then(() => checkDailyLogin());
                }, 0);
            }

            // 로그아웃 시 상태 초기화
            if (event === "SIGNED_OUT") {
                setPoints(0);
                setPointsLoaded(false);
                setProfileLoaded(false);
                setIsAdminUser(false);
                setIsPremiumUser(false);
                setUserPetType("dog");
                setOnboardingData(null);
                setMinimiEquip({
                    minimiId: null,
                    accessoryIds: [],
                    pixelData: null,
                    accessoriesData: [],
                    imageUrl: null,
                });
            }
        });

        return () => {
            clearTimeout(safetyTimer);
            subscription.unsubscribe();
        };
    }, [refreshProfile, refreshPoints, checkDailyLogin]);

    // 삭제된 계정 체크 (재가입 쿨다운 확인) - 기존 호환성 유지
    const checkDeletedAccount = useCallback(async (email: string): Promise<DeletedAccountCheck | null> => {
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
    }, []);

    // 새로운 탈퇴 유형별 재가입 가능 여부 체크
    const checkCanRejoin = useCallback(async (email: string): Promise<RejoinCheck> => {
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
    }, []);

    // 이메일 회원가입
    const signUp = useCallback(async (
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
    }, [checkCanRejoin, checkDeletedAccount]);

    // 이메일 로그인
    const signIn = useCallback(async (email: string, password: string) => {
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            return { error };
        } catch (error) {
            return { error: error as Error };
        }
    }, []);

    // 로그아웃
    const signOut = useCallback(async () => {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error("[Auth] 로그아웃 실패:", error);
        }
    }, []);

    // 구글 로그인
    const signInWithGoogle = useCallback(async () => {
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
    }, []);

    // 카카오 로그인
    const signInWithKakao = useCallback(async () => {
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
    }, []);

    // 프로필 업데이트
    const updateProfile = useCallback(async (data: { nickname?: string }) => {
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
    }, []);

    // 닉네임 중복 체크
    const checkNickname = useCallback(async (nickname: string) => {
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
    }, []);

    const value = useMemo(() => ({
        user,
        session,
        loading,
        isAdminUser,
        isPremiumUser,
        refreshProfile,
        profileLoaded,
        userPetType,
        onboardingData,
        points,
        pointsLoaded,
        refreshPoints,
        minimiEquip,
        refreshMinimi,
        checkDeletedAccount,
        checkCanRejoin,
        signUp,
        signIn,
        signOut,
        signInWithGoogle,
        signInWithKakao,
        updateProfile,
        checkNickname,
    }), [
        user, session, loading, isAdminUser, isPremiumUser, refreshProfile,
        profileLoaded, userPetType, onboardingData, points, pointsLoaded,
        refreshPoints, minimiEquip, refreshMinimi,
        checkDeletedAccount, checkCanRejoin, signUp, signIn,
        signOut, signInWithGoogle, signInWithKakao, updateProfile, checkNickname,
    ]);

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
