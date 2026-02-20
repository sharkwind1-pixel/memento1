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
 * - 브라우저 뒤로가기/앞으로가기 지원
 * - localStorage 백업 (새로고침 시 복원)
 *
 * 최적화:
 * - Dynamic import로 각 페이지 lazy loading
 * - 초기 번들 크기 최소화
 *
 * ============================================================================
 */

"use client";

// ============================================================================
// 임포트
// ============================================================================
import { useState, useEffect, Suspense, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { TabType, CommunitySubcategory, getLegacyTabRedirect } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { usePets } from "@/contexts/PetContext";
import Layout from "@/components/common/Layout";
import { supabase } from "@/lib/supabase";
import { FullPageLoading } from "@/components/ui/PawLoading";

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
// 페이지 컴포넌트 - 정적 import로 떨림 방지
// ============================================================================
// Dynamic import 제거 - 페이지 전환 시 지연/떨림의 주요 원인
// 번들 크기가 약간 증가하지만 UX가 훨씬 부드러워짐

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
        <Suspense fallback={<FullPageLoading />}>
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
    const { user, loading } = useAuth();
    const { pets, isLoading: petsLoading } = usePets();
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

    const [showNicknameSetup, setShowNicknameSetup] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showTutorial, setShowTutorial] = useState(false);
    const [showPostGuide, setShowPostGuide] = useState(false);
    const [postGuideUserType, setPostGuideUserType] = useState<"planning" | "current" | "memorial" | null>(null);
    const [showRecordTutorial, setShowRecordTutorial] = useState(false);
    const [recordTutorialUserType, setRecordTutorialUserType] = useState<"current" | "memorial" | null>(null);

    // 현재 상태를 ref로 추적 (useEffect에서 stale closure 방지)
    const currentStateRef = useRef({ tab: selectedTab, sub: selectedSubcategory });
    currentStateRef.current = { tab: selectedTab, sub: selectedSubcategory };

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

    useEffect(() => {
        const checkNewUserFlow = async () => {
            if (!user) return;

            // 같은 유저에 대해 이미 체크 완료했으면 스킵 (크로스탭 SIGNED_IN 재트리거 방지)
            if (newUserFlowCheckedRef.current === user.id) return;

            // 1. 먼저 닉네임 설정 여부 확인
            try {
                const { data: profileData } = await supabase
                    .from("profiles")
                    .select("nickname, tutorial_completed_at, onboarding_completed_at")
                    .eq("id", user.id)
                    .single();

                // 닉네임이 없거나 이메일 앞부분과 같으면 (자동 생성된 경우) 닉네임 설정 필요
                const emailPrefix = user.email?.split("@")[0] || "";
                const needsNickname = !profileData?.nickname ||
                    profileData.nickname === emailPrefix ||
                    profileData.nickname === user.user_metadata?.full_name; // OAuth에서 가져온 이름

                if (needsNickname) {
                    setShowNicknameSetup(true);
                    return; // 닉네임 설정 후 다시 체크 (ref 마킹 안함)
                }

                // 2. DB 상태가 null이면 localStorage 동기화 (관리자 초기화 대응)
                // DB가 진실의 원천 (Source of Truth)
                if (!profileData?.tutorial_completed_at) {
                    localStorage.removeItem("memento-ani-tutorial-complete");
                }
                if (!profileData?.onboarding_completed_at) {
                    localStorage.removeItem("memento-ani-onboarding-complete");
                }

                // 3. 기존 플로우 진행 (순서 변경: 온보딩 질문 먼저 → 튜토리얼 나중에)
                const tutorialCompletedLocal = localStorage.getItem("memento-ani-tutorial-complete") === "true";
                const onboardingCompletedLocal = localStorage.getItem("memento-ani-onboarding-complete") === "true";

                // 펫이 있어도, DB에서 온보딩이 초기화되었으면 온보딩 표시
                const isOnboardingReset = !profileData?.onboarding_completed_at || !profileData?.tutorial_completed_at;

                if (pets.length > 0 && !isOnboardingReset) {
                    newUserFlowCheckedRef.current = user.id;
                    supabase
                        .from("profiles")
                        .update({ last_seen_at: new Date().toISOString() })
                        .eq("id", user.id);
                    return;
                }

                if (onboardingCompletedLocal && tutorialCompletedLocal && !isOnboardingReset) {
                    newUserFlowCheckedRef.current = user.id;
                    return;
                }

                // localStorage 동기화
                if (profileData?.onboarding_completed_at) {
                    localStorage.setItem("memento-ani-onboarding-complete", "true");
                }
                if (profileData?.tutorial_completed_at) {
                    localStorage.setItem("memento-ani-tutorial-complete", "true");
                }

                // DB 둘 다 완료 상태면 리턴
                if (profileData?.onboarding_completed_at && profileData?.tutorial_completed_at) {
                    newUserFlowCheckedRef.current = user.id;
                    return;
                }

                // 순서: 온보딩 질문 먼저!
                // 온보딩 미완료 → 온보딩 표시
                if (!profileData?.onboarding_completed_at) {
                    setShowOnboarding(true);
                    return; // ref 마킹 안함 (완료 후 재체크 필요)
                }

                // 온보딩 완료, 튜토리얼 미완료 → 튜토리얼 표시
                if (profileData?.onboarding_completed_at && !profileData?.tutorial_completed_at) {
                    setShowTutorial(true);
                    return; // ref 마킹 안함 (완료 후 재체크 필요)
                }

                newUserFlowCheckedRef.current = user.id;
                await supabase
                    .from("profiles")
                    .update({ last_seen_at: new Date().toISOString() })
                    .eq("id", user.id);
            } catch {
                // 에러 시에도 온보딩 먼저
                const onboardingCompletedLocal = localStorage.getItem("memento-ani-onboarding-complete") === "true";
                if (!onboardingCompletedLocal) {
                    setShowOnboarding(true);
                }
            }
        };

        // user가 없으면 ref 초기화 (로그아웃 대응)
        if (!user) {
            newUserFlowCheckedRef.current = null;
        }

        if (user && !petsLoading) {
            checkNewUserFlow();
        }
    }, [user, petsLoading, pets.length]);

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
            setSelectedTab(redirect.main as TabType);
            setSelectedSubcategory(redirect.sub);
            localStorage.setItem("memento-current-tab", redirect.main);
            if (redirect.sub) {
                localStorage.setItem("memento-current-subcategory", redirect.sub);
            }
            router.replace(`/?tab=${redirect.main}${redirect.sub ? `&sub=${redirect.sub}` : ""}`, { scroll: false });
            return;
        }

        // 상태 변경
        setSelectedTab(tab);
        setSelectedSubcategory(sub);

        localStorage.setItem("memento-current-tab", tab);

        if (sub) {
            localStorage.setItem("memento-current-subcategory", sub);
        } else {
            localStorage.removeItem("memento-current-subcategory");
        }

        // URL 업데이트
        if (tab === "home") {
            router.replace("/", { scroll: false });
        } else if (sub) {
            router.replace(`/?tab=${tab}&sub=${sub}`, { scroll: false });
        } else {
            router.replace(`/?tab=${tab}`, { scroll: false });
        }
    }, [router]);

    // 서브카테고리 변경 핸들러 (커뮤니티 내부에서 사용)
    const handleSubcategoryChange = useCallback((sub: CommunitySubcategory) => {
        handleTabChange("community", sub);
    }, [handleTabChange]);

    // 페이지 렌더링
    const renderPage = () => {
        switch (selectedTab) {
            case "home":
                return <HomePage setSelectedTab={handleTabChange} />;
            case "record":
                return <RecordPage setSelectedTab={handleTabChange} />;
            case "community":
                return (
                    <CommunityPage
                        subcategory={selectedSubcategory}
                        onSubcategoryChange={handleSubcategoryChange}
                    />
                );
            case "ai-chat":
                return <AIChatPage setSelectedTab={handleTabChange} />;
            case "magazine":
                return <MagazinePage setSelectedTab={handleTabChange} />;
            case "admin":
                return <AdminPage />;
            default:
                return <HomePage setSelectedTab={handleTabChange} />;
        }
    };

    if (loading && !forceShow) {
        return <FullPageLoading />;
    }

    return (
        <>
            <Layout
                selectedTab={selectedTab}
                setSelectedTab={handleTabChange}
                subcategory={selectedSubcategory}
                onSubcategoryChange={handleSubcategoryChange}
            >
                {renderPage()}
            </Layout>
            {user && (
                <>
                    <NicknameSetupModal
                        isOpen={showNicknameSetup}
                        onComplete={() => {
                            setShowNicknameSetup(false);
                            // 닉네임 설정 완료 후 온보딩 질문 시작 (순서: 온보딩 → 튜토리얼)
                            const onboardingCompletedLocal = localStorage.getItem("memento-ani-onboarding-complete") === "true";
                            if (!onboardingCompletedLocal) {
                                setShowOnboarding(true);
                            } else {
                                const tutorialCompletedLocal = localStorage.getItem("memento-ani-tutorial-complete") === "true";
                                if (!tutorialCompletedLocal) {
                                    setShowTutorial(true);
                                }
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
                            // 온보딩 완료 후 유저 타입별 분기
                            setPostGuideUserType(userType);

                            const tutorialCompletedLocal = localStorage.getItem("memento-ani-tutorial-complete") === "true";

                            if (!tutorialCompletedLocal) {
                                // 튜토리얼 미완료 → TutorialTour 먼저
                                setShowTutorial(true);
                            } else if (userType === "planning") {
                                // planning 유저: PostOnboardingGuide 표시
                                setShowPostGuide(true);
                            } else {
                                // current/memorial 유저: 바로 Record 페이지 + RecordPageTutorial
                                handleTabChange("record");
                                setTimeout(() => {
                                    setRecordTutorialUserType(userType);
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
