/**
 * ============================================================================
 * page.tsx (메인 페이지)
 * ============================================================================
 *
 * 메멘토애니 SPA 라우팅 컨트롤러
 *
 * 라우팅 구조:
 * - 5개 메인 탭: home, record, community, ai-chat, magazine
 * - 커뮤니티 서브카테고리: free, memorial, adoption, local, lost
 * - 레거시 탭 리다이렉트: adoption/local/lost → community?sub=xxx
 *
 * URL 동기화:
 * - ?tab=xxx&sub=yyy 형태로 상태 관리
 * - router.push로 탭 전환 히스토리 기록 → 브라우저 뒤로가기/앞으로가기 지원
 * - localStorage 백업 (새로고침 시 복원)
 *
 * 최적화:
 * - 모든 페이지 정적 import (dynamic import는 탭 전환 시 unmount/remount 유발하여 깜빡임 발생)
 * - CLAUDE.md: "Dynamic Import 사용 금지" 원칙 준수
 *
 * ============================================================================
 */

"use client";

// ============================================================================
// 임포트
// ============================================================================
import { useState, useEffect, Suspense, useCallback, useRef, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { TabType, CommunitySubcategory, getLegacyTabRedirect } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
// 주의: usePets()를 여기서 호출하면 PetContext consumer가 되어
// timeline/pets 변경 시 전체 HomeContent + 모든 자식 페이지가 리렌더됨
// → 온보딩 체크는 직접 Supabase 조회로 대체
import Layout from "@/components/common/Layout";
import { supabase } from "@/lib/supabase";


// ============================================================================
// 상수 및 유틸리티
// ============================================================================

/** 메인 카테고리 (5개 + admin) */
const MAIN_TABS: TabType[] = ["home", "record", "community", "ai-chat", "magazine", "admin"];

/** 레거시 탭 포함 (하위 호환용 - v1에서 사용하던 탭들) */
const VALID_TABS: TabType[] = [...MAIN_TABS, "adoption", "local", "lost"];

/** 유효한 탭인지 검증 */
const isValidTab = (tab: string | null): tab is TabType => {
    return tab !== null && VALID_TABS.includes(tab as TabType);
};

const isValidSubcategory = (sub: string | null): sub is CommunitySubcategory => {
    return sub !== null && ["free", "memorial", "adoption", "local", "lost"].includes(sub);
};

// ============================================================================
// 페이지 컴포넌트 - 모두 정적 import (dynamic import 금지)
// ============================================================================
// dynamic import는 탭 전환마다 unmount → skeleton → remount 사이클을 유발하여
// 모바일에서 이미지/버튼/아이콘이 껐다 켜졌다하는 깜빡임의 주범이었음
// CLAUDE.md: "즉각적인 반응이 UX에 더 중요 - dynamic import 사용하지 않음"

import HomePage from "@/components/pages/HomePage";
import CommunityPage from "@/components/pages/CommunityPage";
import AIChatPage from "@/components/pages/AIChatPage";
import MagazinePage from "@/components/pages/MagazinePage";
import RecordPage from "@/components/pages/RecordPage";
import AdminPage from "@/components/pages/AdminPage";

// 모달 컴포넌트 - 정적 import
import NicknameSetupModal from "@/components/Auth/NicknameSetupModal";
import OnboardingModal from "@/components/features/onboarding/OnboardingModal";
import TutorialTour from "@/components/features/onboarding/TutorialTour";
import PostOnboardingGuide from "@/components/features/onboarding/PostOnboardingGuide";
import RecordPageTutorial from "@/components/features/onboarding/RecordPageTutorial";

// ============================================================================
// 메인 컴포넌트
// ============================================================================

/** Suspense 래퍼 - useSearchParams는 Suspense 내부에서만 사용 가능 */
export default function Home() {
    return (
        <Suspense fallback={
            // Layout 배경과 동일한 색상으로 빈 화면 (색상 전환 번쩍임 방지)
            <div className="min-h-screen bg-gradient-to-b from-memento-50 via-memento-75 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />
        }>
            <HomeContent />
        </Suspense>
    );
}

/**
 * 실제 페이지 컨텐츠
 * - URL 파라미터 기반 탭 상태 관리
 * - 온보딩/튜토리얼 플로우 제어
 */
function HomeContent() {
    // ========================================================================
    // Context & Hooks
    // ========================================================================
    const { user, loading, profileLoaded } = useAuth();
    // 주의: usePets()를 호출하면 PetContext consumer가 되어 timeline 등 변경 시 전체 리렌더
    // 온보딩 체크에만 필요하므로 별도 effect에서 직접 Supabase 조회로 대체
    const router = useRouter();
    const searchParams = useSearchParams();

    // 로딩 안전장치: AuthContext가 실패하더라도 5초 후 강제 표시
    const [forceShow, setForceShow] = useState(false);
    useEffect(() => {
        if (!loading) return;
        const timer = setTimeout(() => setForceShow(true), 5000);
        return () => clearTimeout(timer);
    }, [loading]);

    // ========================================================================
    // 초기 상태 결정 (URL > localStorage > 기본값)
    // ========================================================================
    const getInitialState = (): { tab: TabType; sub?: CommunitySubcategory } => {
        // 1. URL에서 확인
        const tabFromUrl = searchParams.get("tab");
        const subFromUrl = searchParams.get("sub");

        if (isValidTab(tabFromUrl)) {
            // 레거시 탭 처리 (adoption, local, lost → community/sub)
            const redirect = getLegacyTabRedirect(tabFromUrl);
            if (redirect) {
                return { tab: redirect.main as TabType, sub: redirect.sub };
            }
            // 일반 탭
            if (tabFromUrl === "community" && isValidSubcategory(subFromUrl)) {
                return { tab: tabFromUrl, sub: subFromUrl };
            }
            return { tab: tabFromUrl };
        }

        // 2. localStorage에서 확인
        if (typeof window !== "undefined") {
            const savedTab = localStorage.getItem("memento-current-tab");
            const savedSub = localStorage.getItem("memento-current-subcategory");
            if (isValidTab(savedTab)) {
                const redirect = getLegacyTabRedirect(savedTab);
                if (redirect) {
                    return { tab: redirect.main as TabType, sub: redirect.sub };
                }
                if (savedTab === "community" && isValidSubcategory(savedSub)) {
                    return { tab: savedTab, sub: savedSub };
                }
                return { tab: savedTab };
            }
        }

        return { tab: "home" };
    };

    const [selectedTab, setSelectedTab] = useState<TabType>(() => getInitialState().tab);
    const [selectedSubcategory, setSelectedSubcategory] = useState<CommunitySubcategory | undefined>(() => getInitialState().sub);

    // 방문한 탭 유지: 한 번 mount된 페이지는 display:none으로 숨기기만 (unmount 방지)
    const [mountedTabs, setMountedTabs] = useState<Set<TabType>>(() => new Set([getInitialState().tab]));
    const [, startTransition] = useTransition();

    const [showNicknameSetup, setShowNicknameSetup] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showTutorial, setShowTutorial] = useState(false);
    const [showPostGuide, setShowPostGuide] = useState(false);
    const [postGuideUserType, setPostGuideUserType] = useState<"planning" | "current" | "memorial" | null>(null);
    const [showRecordTutorial, setShowRecordTutorial] = useState(false);
    const [recordTutorialUserType, setRecordTutorialUserType] = useState<"current" | "memorial" | null>(null);
    // 온보딩 플로우 1회 트리거 여부 (세션 내 중복 방지)
    const onboardingTriggeredRef = useRef(false);

    // 현재 상태를 ref로 추적 (useEffect에서 stale closure 방지)
    const currentStateRef = useRef({ tab: selectedTab, sub: selectedSubcategory });
    currentStateRef.current = { tab: selectedTab, sub: selectedSubcategory };

    // 방문한 탭 추적: selectedTab 변경 시 mountedTabs에 추가
    useEffect(() => {
        setMountedTabs(prev => {
            if (prev.has(selectedTab)) return prev;
            return new Set(prev).add(selectedTab);
        });
    }, [selectedTab]);

    // URL 변경 시 탭/서브카테고리 동기화 (브라우저 뒤로가기/앞으로가기 처리)
    useEffect(() => {
        const tabFromUrl = searchParams.get("tab");
        const subFromUrl = searchParams.get("sub");

        // 현재 상태와 URL이 같으면 무시 (무한 루프 방지)
        const currentTab = currentStateRef.current.tab;
        const currentSub = currentStateRef.current.sub;

        const targetTab = tabFromUrl || "home";
        const targetSub = tabFromUrl === "community" && isValidSubcategory(subFromUrl) ? subFromUrl : undefined;

        // 이미 같은 상태면 아무것도 하지 않음
        if (targetTab === currentTab && targetSub === currentSub) {
            return;
        }

        if (isValidTab(tabFromUrl)) {
            // 레거시 탭 처리
            const redirect = getLegacyTabRedirect(tabFromUrl);
            if (redirect) {
                setSelectedTab(redirect.main as TabType);
                setSelectedSubcategory(redirect.sub);
                localStorage.setItem("memento-current-tab", redirect.main);
                if (redirect.sub) {
                    localStorage.setItem("memento-current-subcategory", redirect.sub);
                }
                // URL 정규화는 handleTabChange에서 처리하도록 위임
                return;
            }

            setSelectedTab(tabFromUrl);
            localStorage.setItem("memento-current-tab", tabFromUrl);

            if (tabFromUrl === "community" && isValidSubcategory(subFromUrl)) {
                setSelectedSubcategory(subFromUrl);
                localStorage.setItem("memento-current-subcategory", subFromUrl);
            } else {
                setSelectedSubcategory(undefined);
            }
        } else if (!tabFromUrl && currentTab !== "home") {
            // URL에 tab이 없고 현재 home이 아니면 home으로
            setSelectedTab("home");
            setSelectedSubcategory(undefined);
            localStorage.setItem("memento-current-tab", "home");
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    // 신규 유저 플로우
    // 순서: 1. 닉네임 설정 → 2. 온보딩 질문 → 3. 튜토리얼 투어 → 4. 가이드
    // 크로스탭 재트리거 방지: 같은 user.id에 대해 한 번만 체크
    const newUserFlowCheckedRef = useRef<string | null>(null);
    // 모달 중복 방지: 어떤 모달이든 열려 있으면 재진입 차단
    const modalOpenRef = useRef(false);
    useEffect(() => {
        modalOpenRef.current = showNicknameSetup || showOnboarding || showTutorial || showPostGuide || showRecordTutorial;
    }, [showNicknameSetup, showOnboarding, showTutorial, showPostGuide, showRecordTutorial]);

    useEffect(() => {
        const checkNewUserFlow = async () => {
            if (!user) return;

            // 같은 유저에 대해 이미 체크 완료했으면 스킵
            if (newUserFlowCheckedRef.current === user.id) return;

            // 이미 모달이 열려 있으면 중복 방지
            if (modalOpenRef.current) return;

            // 이번 세션에서 이미 온보딩을 한 번 트리거했으면 다시 안 띄움
            if (onboardingTriggeredRef.current) {
                newUserFlowCheckedRef.current = user.id;
                return;
            }

            try {
                const { data: profileData, error: profileError } = await supabase
                    .from("profiles")
                    .select("nickname, tutorial_completed_at, onboarding_completed_at, user_type")
                    .eq("id", user.id)
                    .single();

                // 프로필 조회 실패 시 (RLS/세션 문제 등) → 온보딩 강제 안 함
                if (profileError || !profileData) {
                    console.error("[checkNewUserFlow] 프로필 조회 실패:", profileError?.message);
                    newUserFlowCheckedRef.current = user.id;
                    return;
                }

                // 1. 닉네임이 없으면 설정 필요
                if (!profileData.nickname) {
                    setShowNicknameSetup(true);
                    return;
                }

                // 2. 온보딩 완료 여부: DB 또는 localStorage
                const onboardingDone = !!profileData?.onboarding_completed_at ||
                    localStorage.getItem("memento-ani-onboarding-complete") === "true";
                const tutorialDone = !!profileData?.tutorial_completed_at ||
                    localStorage.getItem("memento-ani-tutorial-complete") === "true";

                // DB ↔ localStorage 동기화
                if (profileData?.onboarding_completed_at) {
                    localStorage.setItem("memento-ani-onboarding-complete", "true");
                }
                if (profileData?.tutorial_completed_at) {
                    localStorage.setItem("memento-ani-tutorial-complete", "true");
                }

                // 3. 온보딩 완료된 유저 → 통과
                if (onboardingDone) {
                    newUserFlowCheckedRef.current = user.id;
                    supabase.from("profiles").update({
                        last_seen_at: new Date().toISOString(),
                    }).eq("id", user.id);
                    return;
                }

                // 4. 펫이 있고 user_type이 있으면 기존 유저 → 온보딩 건너뛰기
                // (user_type이 NULL이면 관리자가 리셋한 것이므로 온보딩 다시 표시)
                if (profileData?.user_type) {
                    const { count: petCount } = await supabase
                        .from("pets")
                        .select("id", { count: "exact", head: true })
                        .eq("user_id", user.id);

                    if ((petCount ?? 0) > 0) {
                        newUserFlowCheckedRef.current = user.id;
                        // 펫 있는 기존 유저 → DB에 완료 기록
                        supabase.from("profiles").update({
                            onboarding_completed_at: new Date().toISOString(),
                            last_seen_at: new Date().toISOString(),
                        }).eq("id", user.id);
                        localStorage.setItem("memento-ani-onboarding-complete", "true");
                        return;
                    }
                }

                // 5. 신규 유저: 온보딩 표시 (1회만)
                onboardingTriggeredRef.current = true;
                setShowOnboarding(true);
            } catch {
                // 에러 시 → 온보딩 건너뛰기 (무한 루프 방지)
                newUserFlowCheckedRef.current = user?.id || null;
            }
        };

        if (!user) {
            newUserFlowCheckedRef.current = null;
            onboardingTriggeredRef.current = false;
        }

        if (user && !loading && profileLoaded) {
            checkNewUserFlow();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, loading, profileLoaded]);

    // ========================================================================
    // 탭 변경 핸들러
    // ========================================================================
    const handleTabChange = useCallback((tab: TabType, sub?: CommunitySubcategory) => {
        // 스크롤을 맨 위로 리셋
        window.scrollTo({ top: 0, behavior: 'instant' });
        // main-content 요소도 스크롤 리셋
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.scrollTop = 0;
        }

        // 레거시 탭 처리
        const redirect = getLegacyTabRedirect(tab);
        if (redirect) {
            startTransition(() => {
                setSelectedTab(redirect.main as TabType);
                setSelectedSubcategory(redirect.sub);
            });
            localStorage.setItem("memento-current-tab", redirect.main);
            if (redirect.sub) {
                localStorage.setItem("memento-current-subcategory", redirect.sub);
            }
            router.replace(`/?tab=${redirect.main}${redirect.sub ? `&sub=${redirect.sub}` : ""}`, { scroll: false });
            return;
        }

        // 상태 변경 (startTransition으로 비긴급 업데이트 처리)
        startTransition(() => {
            setSelectedTab(tab);
            setSelectedSubcategory(sub);
        });

        localStorage.setItem("memento-current-tab", tab);

        if (sub) {
            localStorage.setItem("memento-current-subcategory", sub);
        } else {
            localStorage.removeItem("memento-current-subcategory");
        }

        // URL 업데이트 (push로 히스토리 기록 → 브라우저 뒤로가기 지원)
        if (tab === "home") {
            router.push("/", { scroll: false });
        } else if (sub) {
            router.push(`/?tab=${tab}&sub=${sub}`, { scroll: false });
        } else {
            router.push(`/?tab=${tab}`, { scroll: false });
        }
    }, [router, startTransition]);

    // 서브카테고리 변경 핸들러 (커뮤니티 내부에서 사용)
    const handleSubcategoryChange = useCallback((sub: CommunitySubcategory) => {
        handleTabChange("community", sub);
    }, [handleTabChange]);

    // 페이지 렌더링 - 방문한 탭은 display:none으로 유지 (unmount 방지)
    // 한 번 방문한 페이지는 다시 갈 때 즉시 표시됨 (API 재호출 없음)
    const renderPages = () => (
        <>
            {mountedTabs.has("home") && (
                <div style={{ display: selectedTab === "home" ? "block" : "none" }}>
                    <HomePage setSelectedTab={handleTabChange} />
                </div>
            )}
            {mountedTabs.has("record") && (
                <div style={{ display: selectedTab === "record" ? "block" : "none" }}>
                    <RecordPage setSelectedTab={handleTabChange} />
                </div>
            )}
            {mountedTabs.has("community") && (
                <div style={{ display: selectedTab === "community" ? "block" : "none" }}>
                    <CommunityPage
                        subcategory={selectedSubcategory}
                        onSubcategoryChange={handleSubcategoryChange}
                        isActive={selectedTab === "community"}
                    />
                </div>
            )}
            {mountedTabs.has("ai-chat") && (
                <div style={{ display: selectedTab === "ai-chat" ? "block" : "none" }}>
                    <AIChatPage setSelectedTab={handleTabChange} />
                </div>
            )}
            {mountedTabs.has("magazine") && (
                <div style={{ display: selectedTab === "magazine" ? "block" : "none" }}>
                    <MagazinePage setSelectedTab={handleTabChange} />
                </div>
            )}
            {mountedTabs.has("admin") && (
                <div style={{ display: selectedTab === "admin" ? "block" : "none" }}>
                    <AdminPage />
                </div>
            )}
        </>
    );

    // Layout은 항상 렌더 → auth 로딩 중에도 헤더/네비/사이드바 유지
    // 콘텐츠 영역만 스켈레톤으로 대체하여 FOUC 방지
    const isContentLoading = loading && !forceShow;

    return (
        <>
            <Layout
                selectedTab={selectedTab}
                setSelectedTab={handleTabChange}
                subcategory={selectedSubcategory}
                onSubcategoryChange={handleSubcategoryChange}
            >
                {isContentLoading ? (
                    <div className="space-y-4 py-4">
                        <div className="rounded-2xl bg-gray-100/60 dark:bg-gray-800/40 h-48 w-full" />
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="rounded-xl bg-gray-100/60 dark:bg-gray-800/40 h-28" />
                            ))}
                        </div>
                    </div>
                ) : (
                    renderPages()
                )}
            </Layout>
            {user && (
                <>
                    <NicknameSetupModal
                        isOpen={showNicknameSetup}
                        onComplete={() => {
                            setShowNicknameSetup(false);
                            // 닉네임 설정 완료 → 온보딩 시작
                            if (localStorage.getItem("memento-ani-onboarding-complete") !== "true") {
                                onboardingTriggeredRef.current = true;
                                setShowOnboarding(true);
                            }
                        }}
                    />
                    <OnboardingModal
                        isOpen={showOnboarding}
                        onClose={() => setShowOnboarding(false)}
                        onGoToRecord={() => handleTabChange("record")}
                        onGoToHome={() => handleTabChange("home")}
                        onGoToAIChat={() => handleTabChange("ai-chat")}
                        onShowPostGuide={(userType) => {
                            // 온보딩 완료 → 유저 타입별 다음 단계 직접 실행
                            setPostGuideUserType(userType);
                            newUserFlowCheckedRef.current = user?.id || null;

                            const tutDone = localStorage.getItem("memento-ani-tutorial-complete") === "true";
                            if (!tutDone) {
                                setShowTutorial(true);
                            } else if (userType === "planning") {
                                setShowPostGuide(true);
                            } else {
                                handleTabChange("record");
                                setTimeout(() => {
                                    setRecordTutorialUserType(userType as "current" | "memorial");
                                    setShowRecordTutorial(true);
                                }, 500);
                            }
                        }}
                    />
                    <PostOnboardingGuide
                        isOpen={showPostGuide}
                        userType={postGuideUserType}
                        onClose={() => setShowPostGuide(false)}
                        onGoToHome={() => handleTabChange("home")}
                        onGoToRecord={() => handleTabChange("record")}
                        onGoToAIChat={() => handleTabChange("ai-chat")}
                        onStartRecordTutorial={(type) => {
                            setRecordTutorialUserType(type);
                            setShowRecordTutorial(true);
                        }}
                    />
                    {recordTutorialUserType && (
                        <RecordPageTutorial
                            isOpen={showRecordTutorial}
                            userType={recordTutorialUserType}
                            onClose={() => {
                                setShowRecordTutorial(false);
                                setRecordTutorialUserType(null);
                            }}
                            onGoToAIChat={() => handleTabChange("ai-chat")}
                        />
                    )}
                </>
            )}
            <TutorialTour
                isOpen={showTutorial}
                onClose={() => {
                    setShowTutorial(false);
                    // 튜토리얼 완료 후 유저 타입별 분기
                    if (postGuideUserType === "planning") {
                        // planning 유저: PostOnboardingGuide 표시
                        setTimeout(() => setShowPostGuide(true), 300);
                    } else if (postGuideUserType === "current" || postGuideUserType === "memorial") {
                        // current/memorial 유저: 바로 Record 페이지 + RecordPageTutorial
                        handleTabChange("record");
                        setTimeout(() => {
                            setRecordTutorialUserType(postGuideUserType);
                            setShowRecordTutorial(true);
                        }, 500);
                    }
                }}
                onNavigate={(tab) => handleTabChange(tab as TabType)}
                userId={user?.id}
            />
        </>
    );
}
