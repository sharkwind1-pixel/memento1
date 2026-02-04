/**
 * 메멘토애니 메인 페이지
 * - Dynamic import로 페이지 컴포넌트 lazy loading
 * - 초기 번들 크기 최적화
 */

"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
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

    // URL 변경 시 탭 동기화 (외부에서 URL이 변경된 경우만)
    useEffect(() => {
        const tabFromUrl = searchParams.get("tab");
        if (isValidTab(tabFromUrl) && tabFromUrl !== selectedTab) {
            setSelectedTab(tabFromUrl);
        }
    }, [searchParams]); // selectedTab 제거 - 무한 루프 방지

    // 온보딩 표시 여부 체크 + 접속 기록 (DB 기반)
    useEffect(() => {
        const checkOnboardingAndUpdateActivity = async () => {
            if (!user) return;

            try {
                // DB에서 온보딩 완료 여부 확인
                const { data } = await supabase
                    .from("profiles")
                    .select("onboarding_completed_at")
                    .eq("id", user.id)
                    .single();

                // 온보딩 미완료 && 등록된 펫이 없을 때만 모달 표시
                // (기존 유저는 펫이 있으므로 온보딩 스킵)
                if (!data?.onboarding_completed_at && pets.length === 0) {
                    setShowOnboarding(true);
                }

                // 접속 기록 업데이트 (DAU 추적용)
                await supabase
                    .from("profiles")
                    .update({ last_seen_at: new Date().toISOString() })
                    .eq("id", user.id);
            } catch {
                // 프로필 없으면 온보딩 필요 (단, 펫이 없을 때만)
                if (pets.length === 0) {
                    setShowOnboarding(true);
                }
            }
        };

        if (user && !petsLoading) {
            checkOnboardingAndUpdateActivity();
        }
    }, [user, petsLoading, pets.length]);

    // 탭 변경 핸들러 - URL도 함께 업데이트
    const handleTabChange = useCallback((tab: TabType) => {
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
                {renderCurrentPage()}
            </Layout>
            {user && (
                <OnboardingModal
                    isOpen={showOnboarding}
                    onClose={() => setShowOnboarding(false)}
                    onGoToRecord={() => setSelectedTab("record")}
                />
            )}
        </>
    );
}
