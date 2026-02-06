/**
 * 메멘토애니 메인 페이지
 * - Dynamic import로 페이지 컴포넌트 lazy loading
 * - 초기 번들 크기 최적화
 */

"use client";

import { useState, useEffect, Suspense, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { TabType } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { usePets } from "@/contexts/PetContext";
import Layout from "@/components/common/Layout";
import { supabase } from "@/lib/supabase";
import { SectionLoading, FullPageLoading } from "@/components/ui/PawLoading";

// 유효한 탭인지 확인
const VALID_TABS: TabType[] = ["home", "record", "community", "ai-chat", "magazine", "adoption", "local", "lost", "admin"];
const isValidTab = (tab: string | null): tab is TabType => {
    return tab !== null && VALID_TABS.includes(tab as TabType);
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

const AdoptionPage = dynamic(() => import("@/components/pages/AdoptionPage"), {
    loading: () => <SectionLoading />,
    ssr: false,
});

const LocalPage = dynamic(() => import("@/components/pages/LocalPage"), {
    loading: () => <SectionLoading />,
    ssr: false,
});

const LostPage = dynamic(() => import("@/components/pages/LostPage"), {
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

const LandingPage = dynamic(() => import("@/components/pages/LandingPage"), {
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

    // 초기 탭 결정: URL > localStorage > home
    const getInitialTab = (): TabType => {
        // 1. URL에서 먼저 확인
        const tabFromUrl = searchParams.get("tab");
        if (isValidTab(tabFromUrl)) {
            return tabFromUrl;
        }
        // 2. localStorage에서 확인 (모바일 새로고침 대응)
        if (typeof window !== "undefined") {
            const savedTab = localStorage.getItem("memento-current-tab");
            if (isValidTab(savedTab)) {
                return savedTab;
            }
        }
        return "home";
    };

    const [selectedTab, setSelectedTab] = useState<TabType>(getInitialTab);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showTutorial, setShowTutorial] = useState(false);
    const [showPostGuide, setShowPostGuide] = useState(false);
    const [postGuideUserType, setPostGuideUserType] = useState<"planning" | "current" | "memorial" | null>(null);
    const [showRecordTutorial, setShowRecordTutorial] = useState(false);
    const [recordTutorialUserType, setRecordTutorialUserType] = useState<"current" | "memorial" | null>(null);
    const isInternalNavigation = useRef(false);

    // URL 변경 시 탭 동기화 (브라우저 뒤로가기/앞으로가기 등 외부 변경만)
    useEffect(() => {
        // 내부 네비게이션(handleTabChange)으로 인한 변경은 무시
        if (isInternalNavigation.current) {
            isInternalNavigation.current = false;
            return;
        }

        const tabFromUrl = searchParams.get("tab");
        if (isValidTab(tabFromUrl) && tabFromUrl !== selectedTab) {
            setSelectedTab(tabFromUrl);
            localStorage.setItem("memento-current-tab", tabFromUrl);
        } else if (!tabFromUrl && selectedTab !== "home") {
            // URL에 tab이 없으면 home으로
            setSelectedTab("home");
            localStorage.setItem("memento-current-tab", "home");
        }
    }, [searchParams, selectedTab]);

    // 신규 유저 플로우: 튜토리얼 → 온보딩 → 유저별 안내
    // 1. 튜토리얼 먼저 (앱 소개)
    // 2. 온보딩 (유저 타입 파악)
    // 3. 유저 타입별 다음 단계 안내
    useEffect(() => {
        const checkNewUserFlow = async () => {
            if (!user) return;

            // 1. localStorage 먼저 체크 (가장 빠르고 확실)
            const tutorialCompletedLocal = localStorage.getItem("memento-ani-tutorial-complete") === "true";
            const onboardingCompletedLocal = localStorage.getItem("memento-ani-onboarding-complete") === "true";

            // 기존 유저 (펫이 있음) → 플로우 스킵
            if (pets.length > 0) {
                // 접속 기록만 업데이트
                supabase
                    .from("profiles")
                    .update({ last_seen_at: new Date().toISOString() })
                    .eq("id", user.id);
                return;
            }

            // 2. localStorage에서 완료 여부가 확인되면 바로 적용
            if (tutorialCompletedLocal && onboardingCompletedLocal) {
                // 둘 다 완료 → 아무것도 안 띄움
                return;
            }

            if (tutorialCompletedLocal && !onboardingCompletedLocal) {
                // 튜토리얼만 완료 → 온보딩 시작
                setShowOnboarding(true);
                return;
            }

            // 3. localStorage에 없으면 DB 확인 (첫 기기 접속 또는 캐시 삭제)
            try {
                const { data } = await supabase
                    .from("profiles")
                    .select("tutorial_completed_at, onboarding_completed_at")
                    .eq("id", user.id)
                    .single();

                // DB → localStorage 동기화
                if (data?.tutorial_completed_at) {
                    localStorage.setItem("memento-ani-tutorial-complete", "true");
                }
                if (data?.onboarding_completed_at) {
                    localStorage.setItem("memento-ani-onboarding-complete", "true");
                }

                // DB에서 완료 여부 확인
                if (data?.tutorial_completed_at && data?.onboarding_completed_at) {
                    return; // 둘 다 완료
                }

                if (data?.tutorial_completed_at && !data?.onboarding_completed_at) {
                    setShowOnboarding(true);
                    return;
                }

                // 튜토리얼 미완료 → 튜토리얼 시작
                if (!data?.tutorial_completed_at) {
                    setShowTutorial(true);
                }

                // 접속 기록 업데이트 (DAU 추적용)
                await supabase
                    .from("profiles")
                    .update({ last_seen_at: new Date().toISOString() })
                    .eq("id", user.id);
            } catch {
                // 프로필 없으면 신규 유저
                // localStorage에도 없고 DB에도 없으면 → 튜토리얼 시작
                if (!tutorialCompletedLocal) {
                    setShowTutorial(true);
                }
            }
        };

        if (user && !petsLoading) {
            checkNewUserFlow();
        }
    }, [user, petsLoading, pets.length]);

    // 탭 변경 핸들러 - URL도 함께 업데이트
    const handleTabChange = useCallback((tab: TabType) => {
        // 내부 네비게이션 플래그 설정 (useEffect에서 무시하도록)
        isInternalNavigation.current = true;

        setSelectedTab(tab);
        localStorage.setItem("memento-current-tab", tab);

        // URL 업데이트
        if (tab === "home") {
            router.replace("/", { scroll: false });
        } else {
            router.replace(`/?tab=${tab}`, { scroll: false });
        }
    }, [router]);

    const renderCurrentPage = () => {
        switch (selectedTab) {
            case "home":
                return <HomePage setSelectedTab={handleTabChange} />;
            case "community":
                return <CommunityPage />;
            case "ai-chat":
                return <AIChatPage />;
            case "adoption":
                return <AdoptionPage setSelectedTab={handleTabChange} />;
            case "local":
                return <LocalPage setSelectedTab={handleTabChange} />;
            case "lost":
                return <LostPage setSelectedTab={handleTabChange} />;
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

    // 로딩 중
    if (loading) {
        return <FullPageLoading />;
    }

    // 비로그인/로그인 모두 동일한 앱 구조 (로그인 필요 기능에서만 유도)
    return (
        <>
            <Layout selectedTab={selectedTab} setSelectedTab={handleTabChange}>
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
                    // 튜토리얼 완료 후 온보딩 시작 (신규 유저만)
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
