/**
 * 메멘토애니 메인 페이지
 */

"use client";

import { useState, useEffect } from "react";
import { TabType } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { usePets } from "@/contexts/PetContext";
import Layout from "@/components/common/Layout";
import HomePage from "@/components/pages/HomePage";
import CommunityPage from "@/components/pages/CommunityPage";
import AIChatPage from "@/components/pages/AIChatPage";
import AdoptionPage from "@/components/pages/AdoptionPage";
import LocalPage from "@/components/pages/LocalPage";
import LostPage from "@/components/pages/LostPage";
import MagazinePage from "@/components/pages/MagazinePage";
import RecordPage from "@/components/pages/RecordPage";
import LandingPage from "@/components/pages/LandingPage";
import OnboardingModal, { hasCompletedOnboarding } from "@/components/features/onboarding/OnboardingModal";

export default function Home() {
    const { user, loading } = useAuth();
    const { pets, isLoading: petsLoading } = usePets();
    const [selectedTab, setSelectedTab] = useState<TabType>("home");
    const [showOnboarding, setShowOnboarding] = useState(false);

    // 온보딩 표시 여부 체크
    useEffect(() => {
        if (user && !petsLoading && pets.length === 0 && !hasCompletedOnboarding()) {
            setShowOnboarding(true);
        }
    }, [user, pets, petsLoading]);

    const handleTabChange = (tab: TabType) => {
        setSelectedTab(tab);
    };

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

    // 비로그인 사용자 → 랜딩 페이지
    if (!user) {
        return <LandingPage />;
    }

    // 로그인한 사용자 → 기존 앱
    return (
        <>
            <Layout selectedTab={selectedTab} setSelectedTab={handleTabChange}>
                {renderCurrentPage()}
            </Layout>
            <OnboardingModal
                isOpen={showOnboarding}
                onClose={() => setShowOnboarding(false)}
                onGoToRecord={() => setSelectedTab("record")}
            />
        </>
    );
}
