/**
 * 메멘토애니 메인 페이지
 * - Dynamic import로 페이지 컴포넌트 lazy loading
 * - 초기 번들 크기 최적화
 * - v2: 5개 메인 카테고리 + 커뮤니티 서브카테고리 구조
 */

"use client";

import { useState, useEffect, Suspense, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { TabType, CommunitySubcategory, getLegacyTabRedirect } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { usePets } from "@/contexts/PetContext";
import Layout from "@/components/common/Layout";
import { supabase } from "@/lib/supabase";
import { SectionLoading, FullPageLoading } from "@/components/ui/PawLoading";

// 메인 카테고리 (5개 + admin)
const MAIN_TABS: TabType[] = ["home", "record", "community", "ai-chat", "magazine", "admin"];

// 레거시 탭 포함 (하위 호환용)
const VALID_TABS: TabType[] = [...MAIN_TABS, "adoption", "local", "lost"];

const isValidTab = (tab: string | null): tab is TabType => {
    return tab !== null && VALID_TABS.includes(tab as TabType);
};

const isValidSubcategory = (sub: string | null): sub is CommunitySubcategory => {
    return sub !== null && ["free", "memorial", "adoption", "local", "lost"].includes(sub);
};

// Dynamic imports - 각 페이지를 lazy load
const HomePage = dynamic(() => import("@/components/pages/HomePage"), {
    loading: () => <SectionLoading />,
    ssr: false,
});

const CommunityPage = dynamic(() => import("@/components/pages/CommunityPage"), {
    loading: () => <SectionLoading />,
    ssr: false,
});

const AIChatPage = dynamic(() => import("@/components/pages/AIChatPage"), {
    loading: () => <SectionLoading />,
    ssr: false,
});

const MagazinePage = dynamic(() => import("@/components/pages/MagazinePage"), {
    loading: () => <SectionLoading />,
    ssr: false,
});

const RecordPage = dynamic(() => import("@/components/pages/RecordPage"), {
    loading: () => <SectionLoading />,
    ssr: false,
});

const AdminPage = dynamic(() => import("@/components/pages/AdminPage"), {
    loading: () => <SectionLoading />,
    ssr: false,
});

// 온보딩 모달 - 사용자 로그인 후에만 필요
const OnboardingModal = dynamic(
    () => import("@/components/features/onboarding/OnboardingModal"),
    { ssr: false }
);

// 튜토리얼 투어
const TutorialTour = dynamic(
    () => import("@/components/features/onboarding/TutorialTour"),
    { ssr: false }
);

// 온보딩 후 유저별 안내
const PostOnboardingGuide = dynamic(
    () => import("@/components/features/onboarding/PostOnboardingGuide"),
    { ssr: false }
);

// Record 페이지 스포트라이트 튜토리얼
const RecordPageTutorial = dynamic(
    () => import("@/components/features/onboarding/RecordPageTutorial"),
    { ssr: false }
);

// Suspense 래퍼 (useSearchParams 필요)
export default function Home() {
    return (
        <Suspense fallback={<SectionLoading />}>
            <HomeContent />
        </Suspense>
    );
}

function HomeContent() {
    const { user, loading } = useAuth();
    const { pets, isLoading: petsLoading } = usePets();
    const router = useRouter();
    const searchParams = useSearchParams();

    // 초기 탭/서브카테고리 결정
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

    const initialState = getInitialState();
    const [selectedTab, setSelectedTab] = useState<TabType>(initialState.tab);
    const [selectedSubcategory, setSelectedSubcategory] = useState<CommunitySubcategory | undefined>(initialState.sub);

    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showTutorial, setShowTutorial] = useState(false);
    const [showPostGuide, setShowPostGuide] = useState(false);
    const [postGuideUserType, setPostGuideUserType] = useState<"planning" | "current" | "memorial" | null>(null);
    const [showRecordTutorial, setShowRecordTutorial] = useState(false);
    const [recordTutorialUserType, setRecordTutorialUserType] = useState<"current" | "memorial" | null>(null);
    const isInternalNavigation = useRef(false);

    // URL 변경 시 탭/서브카테고리 동기화
    useEffect(() => {
        if (isInternalNavigation.current) {
            isInternalNavigation.current = false;
            return;
        }

        const tabFromUrl = searchParams.get("tab");
        const subFromUrl = searchParams.get("sub");

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
                // URL 정규화 (레거시 → 신규 구조)
                router.replace(`/?tab=${redirect.main}${redirect.sub ? `&sub=${redirect.sub}` : ""}`, { scroll: false });
                return;
            }

            if (tabFromUrl !== selectedTab) {
                setSelectedTab(tabFromUrl);
                localStorage.setItem("memento-current-tab", tabFromUrl);
            }

            if (tabFromUrl === "community" && isValidSubcategory(subFromUrl)) {
                if (subFromUrl !== selectedSubcategory) {
                    setSelectedSubcategory(subFromUrl);
                    localStorage.setItem("memento-current-subcategory", subFromUrl);
                }
            } else {
                setSelectedSubcategory(undefined);
            }
        } else if (!tabFromUrl && selectedTab !== "home") {
            setSelectedTab("home");
            setSelectedSubcategory(undefined);
            localStorage.setItem("memento-current-tab", "home");
        }
    }, [searchParams, selectedTab, selectedSubcategory, router]);

    // 신규 유저 플로우
    useEffect(() => {
        const checkNewUserFlow = async () => {
            if (!user) return;

            const tutorialCompletedLocal = localStorage.getItem("memento-ani-tutorial-complete") === "true";
            const onboardingCompletedLocal = localStorage.getItem("memento-ani-onboarding-complete") === "true";

            if (pets.length > 0) {
                supabase
                    .from("profiles")
                    .update({ last_seen_at: new Date().toISOString() })
                    .eq("id", user.id);
                return;
            }

            if (tutorialCompletedLocal && onboardingCompletedLocal) {
                return;
            }

            if (tutorialCompletedLocal && !onboardingCompletedLocal) {
                setShowOnboarding(true);
                return;
            }

            try {
                const { data } = await supabase
                    .from("profiles")
                    .select("tutorial_completed_at, onboarding_completed_at")
                    .eq("id", user.id)
                    .single();

                if (data?.tutorial_completed_at) {
                    localStorage.setItem("memento-ani-tutorial-complete", "true");
                }
                if (data?.onboarding_completed_at) {
                    localStorage.setItem("memento-ani-onboarding-complete", "true");
                }

                if (data?.tutorial_completed_at && data?.onboarding_completed_at) {
                    return;
                }

                if (data?.tutorial_completed_at && !data?.onboarding_completed_at) {
                    setShowOnboarding(true);
                    return;
                }

                if (!data?.tutorial_completed_at) {
                    setShowTutorial(true);
                }

                await supabase
                    .from("profiles")
                    .update({ last_seen_at: new Date().toISOString() })
                    .eq("id", user.id);
            } catch {
                if (!tutorialCompletedLocal) {
                    setShowTutorial(true);
                }
            }
        };

        if (user && !petsLoading) {
            checkNewUserFlow();
        }
    }, [user, petsLoading, pets.length]);

    // 탭 변경 핸들러
    const handleTabChange = useCallback((tab: TabType, sub?: CommunitySubcategory) => {
        isInternalNavigation.current = true;

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

    const renderCurrentPage = () => {
        switch (selectedTab) {
            case "home":
                return <HomePage setSelectedTab={handleTabChange} />;
            case "community":
                return (
                    <CommunityPage
                        subcategory={selectedSubcategory}
                        onSubcategoryChange={handleSubcategoryChange}
                    />
                );
            case "ai-chat":
                return <AIChatPage />;
            case "magazine":
                return <MagazinePage setSelectedTab={handleTabChange} />;
            case "record":
                return <RecordPage setSelectedTab={handleTabChange} />;
            case "admin":
                return <AdminPage />;
            default:
                return <HomePage setSelectedTab={handleTabChange} />;
        }
    };

    if (loading) {
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
                {renderCurrentPage()}
            </Layout>
            {user && (
                <>
                    <OnboardingModal
                        isOpen={showOnboarding}
                        onClose={() => setShowOnboarding(false)}
                        onGoToRecord={() => handleTabChange("record")}
                        onGoToHome={() => handleTabChange("home")}
                        onGoToAIChat={() => handleTabChange("ai-chat")}
                        onShowPostGuide={(userType) => {
                            setPostGuideUserType(userType);
                            setShowPostGuide(true);
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
                    if (pets.length === 0) {
                        setTimeout(() => setShowOnboarding(true), 300);
                    }
                }}
                onNavigate={(tab) => handleTabChange(tab as TabType)}
                userId={user?.id}
            />
        </>
    );
}
