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
    useRef,
    ReactNode,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { ADMIN_EMAILS, type PetIconType, type SubscriptionTier } from "@/config/constants";
import type { OnboardingData, MinimiEquipState } from "@/types";
import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";
import { toast } from "sonner";
import { CHARACTER_CATALOG } from "@/data/minimiPixels";
import { safeGetItem, safeSetItem, safeRemoveItem, safeSessionGetItem, safeSessionSetItem } from "@/lib/safe-storage";

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
    subscriptionTier: SubscriptionTier;
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
    signInWithNaver: () => void;
    updateProfile: (data: { nickname?: string }) => Promise<{ error: Error | null }>;
    checkNickname: (nickname: string) => Promise<{ available: boolean; error: Error | null }>;
    // 간편모드
    isSimpleMode: boolean;
    toggleSimpleMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdminUser, setIsAdminUser] = useState(false);
    const [isPremiumUser, setIsPremiumUser] = useState(false);
    const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>("free");
    const [points, setPoints] = useState(0);
    const [pointsLoaded, setPointsLoaded] = useState(false);
    const [profileLoaded, setProfileLoaded] = useState(false);
    const [userPetType, setUserPetType] = useState<PetIconType>("dog");
    const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
    // 초기 세션 복원 완료 플래그 — onAuthStateChange가 getSession 결과를 덮어쓰는 것을 방지
    const initialSessionHandledRef = useRef(false);
    const [minimiEquip, setMinimiEquip] = useState<MinimiEquipState>({
        minimiId: null,
        accessoryIds: [],
        pixelData: null,
        accessoriesData: [],
        imageUrl: null,
    });
    const [isSimpleMode, setIsSimpleModeState] = useState(false);
    // hydration 후 localStorage에서 간편모드 복원
    useEffect(() => {
        const saved = safeGetItem("memento-simple-mode");
        if (saved === "true") setIsSimpleModeState(true);
    }, []);

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

            // 탈퇴/차단 계정 체크 (관리자 포함 — 반드시 프로필 로드 전에 수행)
            if (currentUser.email) {
                try {
                    const { data: rejoinCheck } = await supabase.rpc("can_rejoin", {
                        check_email: currentUser.email,
                        check_ip: null,
                    });
                    if (rejoinCheck && rejoinCheck.length > 0 && !rejoinCheck[0].can_join) {
                        setIsAdminUser(false);
                        setIsPremiumUser(false);
                        setProfileLoaded(true);
                        await supabase.auth.signOut();
                        return;
                    }
                } catch {
                    // RPC 실패 시에도 로그인은 허용 (네트워크 오류 등)
                }
            }

            // profiles, user_minimi, 첫 번째 펫을 병렬 조회
            const [profileResult, minimiListResult, firstPetResult] = await Promise.all([
                supabase
                    .from("profiles")
                    .select("is_admin, is_premium, premium_expires_at, points, onboarding_data, equipped_minimi_id, equipped_accessories, minimi_pixel_data, minimi_accessories_data, is_simple_mode, subscription_tier")
                    .eq("id", currentUser.id)
                    .single(),
                supabase
                    .from("user_minimi")
                    .select("id, minimi_id")
                    .eq("user_id", currentUser.id),
                supabase
                    .from("pets")
                    .select("type")
                    .eq("user_id", currentUser.id)
                    .order("created_at", { ascending: true })
                    .limit(1)
                    .maybeSingle(),
            ]);

            let { data, error } = profileResult;
            const minimiList = minimiListResult.data || [];
            const { data: firstPet, error: firstPetError } = firstPetResult;

            // 프로필 없으면 자동 생성 (카카오 등 소셜 로그인 시 트리거 실패 대비)
            if (error && error.code === "PGRST116") {
                const { data: newProfile, error: insertErr } = await supabase
                    .from("profiles")
                    .upsert({
                        id: currentUser.id,
                        email: currentUser.email || null,
                        points: 0,
                        total_points_earned: 0,
                        is_premium: false,
                        is_admin: false,
                        is_banned: false,
                    }, { onConflict: "id" })
                    .select("is_admin, is_premium, premium_expires_at, points, onboarding_data, equipped_minimi_id, equipped_accessories, minimi_pixel_data, minimi_accessories_data, is_simple_mode, subscription_tier")
                    .single();
                if (!insertErr && newProfile) {
                    data = newProfile;
                    error = null;
                }
            }

            // 관리자 체크
            // 1) auth.users.email 기반
            const emailAdmin = ADMIN_EMAILS.includes(currentUser.email || "");
            // 2) user_metadata/identities에서 이메일 추출 (카카오 등 소셜 로그인 시 email이 null일 수 있음)
            const metaEmail = currentUser.user_metadata?.email as string | undefined;
            const identityEmails = (currentUser.identities || [])
                .map(id => id.identity_data?.email as string | undefined)
                .filter(Boolean) as string[];
            const allEmails = [currentUser.email, metaEmail, ...identityEmails].filter(Boolean) as string[];
            const metaAdmin = allEmails.some(e => ADMIN_EMAILS.includes(e));
            // 3) profiles.is_admin DB 기반
            const dbAdmin = !error && data?.is_admin === true;
            setIsAdminUser(emailAdmin || metaAdmin || dbAdmin);

            // 프리미엄 체크 + 구독 티어
            if (!error && data?.is_premium === true) {
                const expiresAt = data.premium_expires_at;
                const isActive = !expiresAt || new Date(expiresAt) > new Date();
                setIsPremiumUser(isActive);
                if (isActive) {
                    const tier = (data.subscription_tier as SubscriptionTier) || "premium";
                    setSubscriptionTier(tier === "free" ? "premium" : tier);
                } else {
                    setSubscriptionTier("free");
                }
            } else {
                setIsPremiumUser(false);
                setSubscriptionTier("free");
            }

            // 포인트도 같이 설정
            setPoints(!error ? (data?.points ?? 0) : 0);

            // 간편모드 설정 (localStorage 우선 → DB 동기화)
            // DB update가 실패할 수 있으므로 (마이그레이션 미실행, 네트워크 등)
            // localStorage를 source of truth로 사용하고, DB는 백업용
            if (!error && data) {
                const localValue = safeGetItem("memento-simple-mode");
                // localStorage에 명시적인 값이 있으면 그걸 우선 (유저가 직접 토글한 결과)
                // localStorage에 값이 없으면 DB 값 사용 (다른 기기에서 설정한 경우)
                const resolvedValue = localValue !== null
                    ? localValue === "true"
                    : data.is_simple_mode === true;
                setIsSimpleModeState(resolvedValue);
                safeSetItem("memento-simple-mode", String(resolvedValue));
                if (resolvedValue) {
                    document.documentElement.classList.add("simple-mode");
                } else {
                    document.documentElement.classList.remove("simple-mode");
                }
                // localStorage와 DB가 다르면 DB를 localStorage 값으로 맞춤
                if (data.is_simple_mode !== resolvedValue) {
                    supabase.from("profiles").update({ is_simple_mode: resolvedValue }).eq("id", currentUser.id).then();
                }
            }

            // 미니미 장착 상태 설정 (equipped_minimi_id는 user_minimi UUID → slug 변환 필요)
            if (!error && data) {
                let equippedSlug: string | null = null;
                const equippedUuid = data.equipped_minimi_id || null;

                if (equippedUuid) {
                    // 이미 병렬로 조회한 minimiList에서 찾기 (추가 API 호출 없음)
                    const minimiRow = minimiList.find(m => m.id === equippedUuid);
                    equippedSlug = minimiRow?.minimi_id || null;
                }

                const catalogItem = equippedSlug ? CHARACTER_CATALOG.find(c => c.slug === equippedSlug) : null;
                const newAccessoryIds = data.equipped_accessories || [];
                const newAccessoriesData = data.minimi_accessories_data || [];
                const newImageUrl = catalogItem?.imageUrl || null;

                // 구조적 비교: 값이 실제로 변경된 경우에만 setState 호출
                // (매번 새 객체/배열 생성하면 context value useMemo가 깨져서 모든 consumer 재렌더)
                setMinimiEquip(prev => {
                    if (
                        prev.minimiId === equippedSlug &&
                        prev.imageUrl === newImageUrl &&
                        prev.pixelData === (data.minimi_pixel_data || null) &&
                        JSON.stringify(prev.accessoryIds) === JSON.stringify(newAccessoryIds) &&
                        JSON.stringify(prev.accessoriesData) === JSON.stringify(newAccessoriesData)
                    ) {
                        return prev; // 같은 레퍼런스 유지 → 재렌더 없음
                    }
                    return {
                        minimiId: equippedSlug,
                        accessoryIds: newAccessoryIds,
                        pixelData: data.minimi_pixel_data || null,
                        accessoriesData: newAccessoriesData,
                        imageUrl: newImageUrl,
                    };
                });
            }

            // 온보딩 데이터 설정 + petType 추출
            // 우선순위: (1) onboarding_data.petType → (2) pets.type → (3) 기본값 "dog"
            let petTypeResolved = false;
            if (!error && data?.onboarding_data) {
                const obData = data.onboarding_data as OnboardingData;
                setOnboardingData(obData);
                const pt = obData.petType;
                if (pt === "cat" || pt === "dog" || pt === "other") {
                    setUserPetType(pt);
                    petTypeResolved = true;
                }
            } else {
                setOnboardingData(null);
            }
            // onboarding_data에서 petType을 못 찾으면 등록된 펫의 type으로 결정
            if (!petTypeResolved) {
                // firstPetError는 무시 (서버 API fallback으로 처리)
                // 병렬 쿼리 결과로 펫 타입 설정
                if (firstPet?.type) {
                    const t = firstPet.type;
                    if (t === "고양이") setUserPetType("cat");
                    else if (t === "강아지") setUserPetType("dog");
                    else setUserPetType("other");
                    petTypeResolved = true;
                }
                // 클라이언트 쿼리 실패 시 서버 API로 fallback (RLS 문제 우회)
                if (!petTypeResolved) {
                    try {
                        const { data: { session: currentSession } } = await supabase.auth.getSession();
                        if (currentSession?.access_token) {
                            const res = await fetch(API.ME_PET_TYPE, {
                                headers: { Authorization: `Bearer ${currentSession.access_token}` },
                            });
                            if (res.ok) {
                                const { petType: serverPetType } = await res.json();
                                if (serverPetType === "cat" || serverPetType === "dog" || serverPetType === "other") {
                                    setUserPetType(serverPetType);
                                }
                            }
                        }
                    } catch { /* 서버 API도 실패하면 기본값 유지 */ }
                }
            }

            setPointsLoaded(true);
            setProfileLoaded(true);
        } catch (err) {
            console.error("[AuthContext] refreshProfile failed:", err instanceof Error ? err.message : err);
            // refreshProfile 실패 시에도 petType 최소 복구 시도 (고양이 유저에게 강아지 아이콘이 보이는 버그 방지)
            try {
                const { data: { user: fallbackUser } } = await supabase.auth.getUser();
                if (fallbackUser) {
                    const { data: fallbackPet } = await supabase
                        .from("pets")
                        .select("type")
                        .eq("user_id", fallbackUser.id)
                        .order("created_at", { ascending: true })
                        .limit(1)
                        .maybeSingle();
                    if (fallbackPet?.type) {
                        const t = fallbackPet.type;
                        if (t === "고양이") setUserPetType("cat");
                        else if (t === "강아지") setUserPetType("dog");
                        else setUserPetType("other");
                    }
                }
            } catch { /* petType 복구도 실패하면 기본값 유지 */ }
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

            const newPoints = profile?.points ?? 0;
            // 값이 같으면 setState skip → context value 재생성 방지
            setPoints(prev => prev === newPoints ? prev : newPoints);
            setPointsLoaded(prev => prev ? prev : true);
        } catch (err) {
            console.error("[AuthContext] refreshPoints failed:", err instanceof Error ? err.message : err);
            setPointsLoaded(prev => prev ? prev : true);
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
                let equippedSlug: string | null = null;
                const equippedUuid = data.equipped_minimi_id || null;

                if (equippedUuid) {
                    const { data: minimiRow } = await supabase
                        .from("user_minimi")
                        .select("minimi_id")
                        .eq("id", equippedUuid)
                        .maybeSingle();
                    equippedSlug = minimiRow?.minimi_id || null;
                }

                const catalogItem = equippedSlug ? CHARACTER_CATALOG.find(c => c.slug === equippedSlug) : null;
                const newAccessoryIds = data.equipped_accessories || [];
                const newAccessoriesData = data.minimi_accessories_data || [];
                const newImageUrl = catalogItem?.imageUrl || null;

                setMinimiEquip(prev => {
                    if (
                        prev.minimiId === equippedSlug &&
                        prev.imageUrl === newImageUrl &&
                        prev.pixelData === (data.minimi_pixel_data || null) &&
                        JSON.stringify(prev.accessoryIds) === JSON.stringify(newAccessoryIds) &&
                        JSON.stringify(prev.accessoriesData) === JSON.stringify(newAccessoriesData)
                    ) {
                        return prev;
                    }
                    return {
                        minimiId: equippedSlug,
                        accessoryIds: newAccessoryIds,
                        pixelData: data.minimi_pixel_data || null,
                        accessoriesData: newAccessoriesData,
                        imageUrl: newImageUrl,
                    };
                });
            }
        } catch {
            // 미니미 새로고침 실패해도 앱 사용에 영향 없음
        }
    }, []);

    // 간편모드 토글 (DB + localStorage + html 클래스 동기화)
    const toggleSimpleMode = useCallback(async () => {
        const newValue = !isSimpleMode;
        setIsSimpleModeState(newValue);
        safeSetItem("memento-simple-mode", String(newValue));
        // html 클래스 동기화 (전체 폰트 크기 제어)
        if (newValue) {
            document.documentElement.classList.add("simple-mode");
        } else {
            document.documentElement.classList.remove("simple-mode");
        }
        try {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (currentUser) {
                const { error: updateError } = await supabase.from("profiles").update({ is_simple_mode: newValue }).eq("id", currentUser.id);
                if (updateError) {
                    console.error("[SimpleMode] DB 업데이트 실패:", updateError.message);
                }
            }
        } catch {
            // DB 업데이트 실패해도 로컬 상태는 유지
        }
    }, [isSimpleMode]);

    // 출석 체크 (API 엔드포인트 사용 - 서버 인증으로 RLS 우회)
    const checkDailyLogin = useCallback(async () => {
        try {
            const kstOffset = 9 * 60 * 60 * 1000;
            const today = new Date(Date.now() + kstOffset).toISOString().split("T")[0];
            const lastCheck = safeGetItem("lastDailyCheck");
            if (lastCheck === today) return;

            const response = await authFetch(API.POINTS_DAILY_CHECK, {
                method: "POST",
            });

            if (!response.ok) return;

            const data = await response.json();
            safeSetItem("lastDailyCheck", today);

            if (data.success && data.earned > 0) {
                await refreshPoints();
                const streakMsg = data.streak > 1 ? ` (${data.streak}일 연속)` : "";
                toast.success(`출석 체크 완료! +${data.earned}P${streakMsg}`);
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

                if (session?.user) {
                    // 로그인 상태: 프로필 로드 완료 후 로딩 해제
                    // (프로필 로드 전에 UI 표시하면 닉네임 설정창, Lv1 아이콘 등 깜빡임 발생)
                    await refreshProfile();
                    initialSessionHandledRef.current = true;
                    setLoading(false);
                    checkDailyLogin();
                } else {
                    // 비로그인 상태: 즉시 로딩 해제
                    initialSessionHandledRef.current = true;
                    setLoading(false);
                }
            } catch (err) {
                // 세션 로드 실패해도 앱은 비로그인 상태로 동작
                console.error("[AuthContext] getSession failed:", err instanceof Error ? err.message : err);
                setSession(null);
                setUser(null);
                setLoading(false);
            }
        };

        getSession();

        // 안전장치: 10초 이내에 로딩이 끝나지 않으면 강제로 비로그인 상태로 진입
        // (느린 네트워크 환경 고려하여 5초 → 10초로 여유 확보)
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
        }, 10000);

        // 인증 상태 변경 리스너
        // 주의: onAuthStateChange 콜백은 Supabase 내부 lock 안에서 호출된다.
        // 여기서 await로 supabase.auth API를 호출하면 재진입 데드락이 발생하므로
        // 프로필 로드 등은 setTimeout으로 lock 바깥에서 실행한다.
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            // 로그인 이벤트일 때는 차단/탈퇴 체크가 끝날 때까지 loading 유지
            // 체크 통과 후에야 user/session을 설정하고 loading을 false로 전환
            if (event === "SIGNED_IN" && session?.user) {
                // 초기 getSession에서 이미 동일 유저를 처리했으면 중복 프로필 리셋 건너뜀
                // (모바일에서 profileLoaded false→true→false→true 깜빡임 방지)
                const alreadyHandledSameUser = initialSessionHandledRef.current;
                if (!alreadyHandledSameUser) {
                    setProfileLoaded(false);
                }

                setTimeout(async () => {
                    // getSession에서 이미 처리된 세션이면 세션/유저만 갱신하고 차단 체크 생략
                    if (alreadyHandledSameUser) {
                        setSession(session);
                        setUser(session.user);
                        setLoading(false);
                        return;
                    }

                    try {
                        // 1. 탈퇴 계정 체크 (withdrawn_users — can_rejoin RPC)
                        const email = session.user.email;
                        let isBlocked = false;
                        let rejoinData: { can_join: boolean; block_reason: string | null; wait_until: string | null; has_record?: boolean }[] | null = null;

                        if (email) {
                            const { data: _rejoinData } = await supabase.rpc("can_rejoin", {
                                check_email: email,
                                check_ip: null,
                            });
                            rejoinData = _rejoinData;
                            if (rejoinData && rejoinData.length > 0 && !rejoinData[0].can_join) {
                                isBlocked = true;
                                const reason = rejoinData[0].block_reason;
                                toast.error(reason || "이용이 제한된 계정입니다.");
                                try {
                                    const token = session.access_token;
                                    if (token) {
                                        await fetch(API.AUTH_CLEANUP_BLOCKED, {
                                            method: "POST",
                                            headers: { Authorization: `Bearer ${token}` },
                                        });
                                    }
                                } catch { /* 정리 실패해도 signOut 진행 */ }
                                await supabase.auth.signOut();
                                // signOut이 SIGNED_OUT 이벤트를 발생시켜 상태 초기화됨
                                return;
                            }

                            // 1-2. 기존 deleted_accounts도 체크 (호환성)
                            const { data: deletedData } = await supabase.rpc("check_deleted_account", {
                                check_email: email,
                            });
                            if (deletedData && deletedData.length > 0 && !deletedData[0].can_rejoin) {
                                isBlocked = true;
                                toast.error(`탈퇴 후 ${deletedData[0].days_until_rejoin}일 후에 재가입 가능합니다.`);
                                try {
                                    const token = session.access_token;
                                    if (token) {
                                        await fetch(API.AUTH_CLEANUP_BLOCKED, {
                                            method: "POST",
                                            headers: { Authorization: `Bearer ${token}` },
                                        });
                                    }
                                } catch { /* 정리 실패해도 signOut 진행 */ }
                                await supabase.auth.signOut();
                                return;
                            }
                        }

                        // 2. is_banned + 온보딩 상태 체크 (프로필에서 1회 조회)
                        let { data: profileCheck } = await supabase
                            .from("profiles")
                            .select("is_banned, onboarding_completed_at")
                            .eq("id", session.user.id)
                            .single();

                        // 프로필이 없으면 자동 생성 (트리거 실패 대비)
                        if (!profileCheck) {
                            const { data: created } = await supabase
                                .from("profiles")
                                .upsert({
                                    id: session.user.id,
                                    email: session.user.email || null,
                                    points: 0,
                                    total_points_earned: 0,
                                    is_premium: false,
                                    is_admin: false,
                                    is_banned: false,
                                }, { onConflict: "id" })
                                .select("is_banned, onboarding_completed_at")
                                .single();
                            if (created) profileCheck = created;
                        }

                        if (profileCheck?.is_banned) {
                            toast.error("이용이 제한된 계정입니다.");
                            await supabase.auth.signOut();
                            return;
                        }

                        // === 차단 체크 통과 — 이제 로그인 상태를 설정 ===

                        // 재가입 유저 온보딩 리셋 — sessionStorage 플래그로 세션당 1회만
                        // SIGNED_IN은 OAuth 콜백, 토큰 갱신 등에서 여러 번 발동 가능
                        // sessionStorage는 탭 종료 시 자동 삭제 → 다음 방문 시 정상 작동
                        const hasRecord = rejoinData?.[0]?.has_record === true;
                        const resetKey = `memento-rejoin-reset-${session.user.id}`;
                        let alreadyReset = false;
                        try {
                            alreadyReset = typeof window !== 'undefined' && !!safeSessionGetItem(resetKey);
                        } catch { /* iOS Safari Private Mode: sessionStorage 접근 불가 */ }

                        if (hasRecord && !alreadyReset && !profileCheck?.onboarding_completed_at) {
                            const { error: resetError } = await supabase.from("profiles").update({
                                nickname: null,
                                onboarding_completed_at: null,
                                tutorial_completed_at: null,
                                user_type: null,
                                onboarding_data: null,
                            }).eq("id", session.user.id);

                            if (resetError) {
                                console.error("[AuthContext] 재가입 온보딩 리셋 실패:", resetError.message);
                            }

                            // 이 세션에서는 리셋 완료 — 새로고침/토큰 갱신 시 재실행 방지
                            try {
                                if (typeof window !== 'undefined') {
                                    safeSessionSetItem(resetKey, 'true');
                                }
                            } catch { /* iOS Safari Private Mode */ }

                            try {
                                safeRemoveItem("memento-ani-onboarding-complete");
                                safeRemoveItem("memento-ani-tutorial-complete");
                                safeRemoveItem("memento-ani-record-tutorial-complete");
                            } catch { /* storage 접근 불가 시 무시 */ }
                        }

                        setSession(session);
                        setUser(session.user);
                        setLoading(false);

                        // 프로필 로드 + 출석 체크
                        Promise.all([refreshProfile(), checkDailyLogin()]).catch((err) => { console.error("[AuthContext] post-login tasks failed:", err instanceof Error ? err.message : err); });

                        // 3. 디바이스 핑거프린트 + IP 기록
                        const token = session.access_token;
                        let fingerprint: string | null = null;
                        try {
                            const { generateDeviceFingerprint } = await import("@/lib/device-fingerprint");
                            fingerprint = await generateDeviceFingerprint();
                        } catch { /* 핑거프린트 실패해도 로그인은 허용 */ }

                        const res = await fetch(API.AUTH_RECORD_IP, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                            },
                            body: JSON.stringify({ fingerprint }),
                        });
                        const result = await res.json();
                        if (result.allowed === false) {
                            toast.error(result.reason || "접근이 제한되었습니다.");
                            await supabase.auth.signOut();
                        }
                    } catch {
                        // 체크 실패 시 로그인 허용 (가용성 우선)
                        setSession(session);
                        setUser(session?.user ?? null);
                        setLoading(false);
                        Promise.all([refreshProfile(), checkDailyLogin()]).catch((err) => { console.error("[AuthContext] post-login tasks failed:", err instanceof Error ? err.message : err); });
                    }
                }, 0);

                // Service Worker 등록 (푸시 알림 준비)
                if (typeof window !== "undefined" && "serviceWorker" in navigator) {
                    navigator.serviceWorker.register("/sw.js").catch(() => {});
                }
            } else if (event === "TOKEN_REFRESHED" && session?.user) {
                // 토큰 갱신 시에는 차단 체크 없이 세션 업데이트
                setSession(session);
                setUser(session.user);
                setLoading(false);
            } else if (event === "INITIAL_SESSION" && session?.user) {
                // 페이지 새로고침 시 기존 세션 복원 — 차단 체크 필요
                // getSession에서 이미 처리했으면 중복 작업 방지
                if (initialSessionHandledRef.current) {
                    setSession(session);
                    setUser(session.user);
                    setLoading(false);
                    return;
                }
                setProfileLoaded(false);
                setTimeout(async () => {
                    try {
                        const email = session.user.email;
                        if (email) {
                            const { data: rejoinData } = await supabase.rpc("can_rejoin", {
                                check_email: email,
                                check_ip: null,
                            });
                            if (rejoinData && rejoinData.length > 0 && !rejoinData[0].can_join) {
                                toast.error(rejoinData[0].block_reason || "이용이 제한된 계정입니다.");
                                try {
                                    const token = session.access_token;
                                    if (token) {
                                        await fetch(API.AUTH_CLEANUP_BLOCKED, {
                                            method: "POST",
                                            headers: { Authorization: `Bearer ${token}` },
                                        });
                                    }
                                } catch { /* */ }
                                await supabase.auth.signOut();
                                return;
                            }
                        }
                        // is_banned 체크
                        let { data: profileCheck } = await supabase
                            .from("profiles")
                            .select("is_banned")
                            .eq("id", session.user.id)
                            .single();

                        // 프로필이 없으면 자동 생성 (트리거 실패 대비)
                        if (!profileCheck) {
                            const { data: created } = await supabase
                                .from("profiles")
                                .upsert({
                                    id: session.user.id,
                                    email: session.user.email || null,
                                    points: 0,
                                    total_points_earned: 0,
                                    is_premium: false,
                                    is_admin: false,
                                    is_banned: false,
                                }, { onConflict: "id" })
                                .select("is_banned")
                                .single();
                            if (created) profileCheck = created;
                        }

                        if (profileCheck?.is_banned) {
                            toast.error("이용이 제한된 계정입니다.");
                            await supabase.auth.signOut();
                            return;
                        }
                        // 통과 — 로그인 상태 설정
                        setSession(session);
                        setUser(session.user);
                        setLoading(false);
                        Promise.all([refreshProfile(), checkDailyLogin()]).catch((err) => { console.error("[AuthContext] post-login tasks failed:", err instanceof Error ? err.message : err); });
                    } catch {
                        setSession(session);
                        setUser(session.user);
                        setLoading(false);
                        Promise.all([refreshProfile(), checkDailyLogin()]).catch((err) => { console.error("[AuthContext] post-login tasks failed:", err instanceof Error ? err.message : err); });
                    }
                }, 0);
            } else if (event !== "SIGNED_IN") {
                // SIGNED_OUT, INITIAL_SESSION(세션 없음) 등
                setSession(session);
                setUser(session?.user ?? null);
                setLoading(false);
            }

            // 로그아웃 시 상태 초기화 + 홈으로 이동
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
                setIsSimpleModeState(false);
                safeRemoveItem("memento-simple-mode");
                try { localStorage.removeItem("memento-memorial-mode"); } catch { /* */ }
                safeRemoveItem("memento-current-tab");
                document.documentElement.classList.remove("simple-mode");

                // 홈 화면으로 이동
                if (typeof window !== "undefined") {
                    const url = new URL(window.location.href);
                    url.searchParams.delete("tab");
                    window.history.replaceState({}, "", url.pathname);
                    window.dispatchEvent(new CustomEvent("navigateToHome"));
                }
            }
        });

        // Realtime WebSocket 제거 — iOS Safari에서 "The operation is insecure" 크래시 유발
        // .subscribe() 내부의 비동기 WebSocket 연결 실패가 unhandledrejection으로 전파되어
        // try-catch로도 잡을 수 없음. visibilitychange 폴백으로 동일 기능 대체.
        //
        // 탭 포커스 복귀 시 차단/탈퇴 체크 (Realtime 대체)
        const handleVisibilityChange = async () => {
            if (document.visibilityState !== "visible") return;

            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (!currentSession?.user?.email) return;

            try {
                const { data: rejoinData } = await supabase.rpc("can_rejoin", {
                    check_email: currentSession.user.email,
                    check_ip: null,
                });
                if (rejoinData && rejoinData.length > 0 && !rejoinData[0].can_join) {
                    toast.error(rejoinData[0].block_reason || "이용이 제한된 계정입니다.");
                    await supabase.auth.signOut();
                }
            } catch { /* 체크 실패 시 무시 (가용성 우선) */ }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            clearTimeout(safetyTimer);
            subscription.unsubscribe();
            document.removeEventListener("visibilitychange", handleVisibilityChange);
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
        } catch (err) {
            console.error("[AuthContext] checkDeletedAccount failed:", err instanceof Error ? err.message : err);
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
        } catch (err) {
            // 오류 시 가입 허용 (관리자가 직접 관리)
            console.error("[AuthContext] checkCanRejoin failed:", err instanceof Error ? err.message : err);
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
                    scopes: "profile_nickname profile_image account_email",
                },
            });
            return { error };
        } catch (error) {
            return { error: error as Error };
        }
    }, []);

    // 네이버 로그인 (커스텀 OAuth → API 라우트로 리다이렉트)
    const signInWithNaver = useCallback(() => {
        window.location.href = "/api/auth/naver";
    }, []);

    // 프로필 업데이트 (auth.users + profiles 동시 갱신)
    // 닉네임은 auth.users.user_metadata와 profiles 테이블 양쪽에 저장됨
    // 한쪽만 업데이트되면 화면마다 다른 닉네임이 표시되므로 양쪽 모두 성공해야 함
    const updateProfile = useCallback(async (data: { nickname?: string }) => {
        try {
            // user.id를 미리 캡처 (auth.updateUser 후 getUser 재호출 시 토큰 갱신 타이밍 이슈 방지)
            const userId = user?.id;
            if (!userId) return { error: new Error("로그인이 필요합니다.") };

            // 1. auth.users user_metadata 업데이트
            const { error } = await supabase.auth.updateUser({
                data: {
                    nickname: data.nickname,
                },
            });
            if (error) return { error };

            // 2. profiles 테이블도 동시 업데이트 (닉네임 불일치 방지)
            // 주의: getUser() 재호출 대신 미리 캡처한 userId 사용 (토큰 갱신 타이밍 이슈 방지)
            if (data.nickname) {
                const { error: profileError } = await supabase
                    .from("profiles")
                    .update({ nickname: data.nickname })
                    .eq("id", userId);
                if (profileError) {
                    console.error("[Auth] profiles 닉네임 동기화 실패:", profileError.message);
                    return { error: new Error("닉네임 저장에 실패했어요. 다시 시도해주세요.") };
                }
            }

            // 3. React 상태의 user 객체도 즉시 동기화
            setUser(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    user_metadata: {
                        ...prev.user_metadata,
                        nickname: data.nickname,
                    },
                };
            });

            return { error: null };
        } catch (error) {
            return { error: error as Error };
        }
    }, [user?.id]);

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
        signInWithNaver,
        updateProfile,
        checkNickname,
        isSimpleMode,
        toggleSimpleMode,
        subscriptionTier,
    }), [
        user, session, loading, isAdminUser, isPremiumUser, refreshProfile,
        profileLoaded, userPetType, onboardingData, points, pointsLoaded,
        refreshPoints, minimiEquip, refreshMinimi,
        checkDeletedAccount, checkCanRejoin, signUp, signIn,
        signOut, signInWithGoogle, signInWithKakao, signInWithNaver, updateProfile, checkNickname,
        isSimpleMode, toggleSimpleMode, subscriptionTier,
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
