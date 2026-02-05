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

// 유효한 탭인지 확인
const VALID_TABS: TabType[] = ["home", "record", "community", "ai-chat", "magazine", "adoption", "local", "lost", "admin"];
const isValidTab = (tab: string | null): tab is TabType => {
    return tab !== null && VALID_TABS.includes(tab as TabType);
};

// 페이지 로딩 컴포넌트
function PageLoader() {
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-sky-200 to-violet-200 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
                    <svg className="w-6 h-6 text-violet-500 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                </div>
                <p className="text-gray-400 text-sm">페이지 로딩 중...</p>
            </div>
        </div>
    );
}

// Dynamic imports - 각 페이지를 lazy load
const HomePage = dynamic(() => import("@/components/pages/HomePage"), {
    loading: () => <PageLoader />,
    ssr: false,
});

const CommunityPage = dynamic(() => import("@/components/pages/CommunityPage"), {
    loading: () => <PageLoader />,
    ssr: false,
});

const AIChatPage = dynamic(() => import("@/components/pages/AIChatPage"), {
    loading: () => <PageLoader />,
    ssr: false,
});

const AdoptionPage = dynamic(() => import("@/components/pages/AdoptionPage"), {
    loading: () => <PageLoader />,
    ssr: false,
});

const LocalPage = dynamic(() => import("@/components/pages/LocalPage"), {
    loading: () => <PageLoader />,
    ssr: false,
});

const LostPage = dynamic(() => import("@/components/pages/LostPage"), {
    loading: () => <PageLoader />,
    ssr: false,
});

const MagazinePage = dynamic(() => import("@/components/pages/MagazinePage"), {
    loading: () => <PageLoader />,
    ssr: false,
});

const RecordPage = dynamic(() => import("@/components/pages/RecordPage"), {
    loading: () => <PageLoader />,
    ssr: false,
});

const LandingPage = dynamic(() => import("@/components/pages/LandingPage"), {
    loading: () => <PageLoader />,
    ssr: false,
});

const AdminPage = dynamic(() => import("@/components/pages/AdminPage"), {
    loading: () => <PageLoader />,
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
        <Suspense fallback={<PageLoader />}>
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

            try {
                // DB에서 튜토리얼/온보딩 완료 여부 확인
                const { data } = await supabase
                    .from("profiles")
                    .select("tutorial_completed_at, onboarding_completed_at")
                    .eq("id", user.id)
                    .single();

                // localStorage 동기화
                if (data?.tutorial_completed_at) {
                    localStorage.setItem("memento-ani-tutorial-complete", "true");
                }
                if (data?.onboarding_completed_at) {
                    localStorage.setItem("memento-ani-onboarding-complete", "true");
                }

                // 기존 유저 (펫이 있음) → 플로우 스킵
                if (pets.length > 0) {
                    // 접속 기록만 업데이트
                    await supabase
                        .from("profiles")
                        .update({ last_seen_at: new Date().toISOString() })
                        .eq("id", user.id);
                    return;
                }

                // 신규 유저 플로우
                // 1. 튜토리얼 미완료 → 튜토리얼 먼저
                if (!data?.tutorial_completed_at) {
                    setShowTutorial(true);
                }
                // 2. 튜토리얼 완료 + 온보딩 미완료 → 온보딩
                else if (!data?.onboarding_completed_at) {
                    setShowOnboarding(true);
                }

                // 접속 기록 업데이트 (DAU 추적용)
                await supabase
                    .from("profiles")
                    .update({ last_seen_at: new Date().toISOString() })
                    .eq("id", user.id);
            } catch {
                // 프로필 없으면 신규 유저 → 튜토리얼부터
                if (pets.length === 0) {
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

    // 자주 사용하는 탭은 마운트 유지 (탭 전환 최적화)
    const renderPages = () => {
        // 핵심 탭들은 항상 마운트, display로 숨김
        const coreTabs = ["home", "record", "ai-chat"];
        const isCore = coreTabs.includes(selectedTab);

        return (
            <>
                {/* 핵심 탭: 마운트 유지 */}
                <div style={{ display: selectedTab === "home" ? "block" : "none" }}>
                    <HomePage setSelectedTab={handleTabChange} />
                </div>
                <div style={{ display: selectedTab === "record" ? "block" : "none" }}>
                    <RecordPage setSelectedTab={handleTabChange} />
                </div>
                <div style={{ display: selectedTab === "ai-chat" ? "block" : "none" }}>
                    <AIChatPage />
                </div>

                {/* 기타 탭: 필요 시에만 렌더 */}
                {!isCore && selectedTab === "community" && <CommunityPage />}
                {!isCore && selectedTab === "adoption" && <AdoptionPage setSelectedTab={handleTabChange} />}
                {!isCore && selectedTab === "local" && <LocalPage setSelectedTab={handleTabChange} />}
                {!isCore && selectedTab === "lost" && <LostPage setSelectedTab={handleTabChange} />}
                {!isCore && selectedTab === "magazine" && <MagazinePage setSelectedTab={handleTabChange} />}
                {!isCore && selectedTab === "admin" && <AdminPage />}
            </>
        );
    };

    // 로딩 중
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-50 to-violet-50">
                <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-sky-200 to-violet-200 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <svg className="w-8 h-8 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </div>
                    <p className="text-gray-500">로딩 중...</p>
                </div>
            </div>
        );
    }

    // 비로그인/로그인 모두 동일한 앱 구조 (로그인 필요 기능에서만 유도)
    return (
        <>
            <Layout selectedTab={selectedTab} setSelectedTab={handleTabChange}>
                {renderPages()}
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
