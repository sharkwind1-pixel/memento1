/**
 * 메인 페이지 컴포넌트 (AI 펫톡 연결 완료)
 * 모든 페이지들을 연결하고 탭 상태를 관리하는 최상위 컴포넌트
 */

"use client";
import Layout from "@/components/common/Layout";
import HomePage from "@/components/pages/HomePage";
import CommunityPage from "@/components/pages/CommunityPage";
import AIChatPage from "@/components/pages/AIChatPage";
import AdoptionPage from "@/components/pages/AdoptionPage";
// ⭐ 이 한 줄만 추가하면 끝!
import MemorialPage from "@/components/pages/MemorialPage";

import { useState } from "react";
import { TabType } from "@/types";
import Layout from "@/components/common/Layout";
import HomePage from "@/components/pages/HomePage";
import CommunityPage from "@/components/pages/CommunityPage";
import AIChatPage from "@/components/pages/AIChatPage";
import AdoptionPage from "@/components/pages/AdoptionPage";

export default function Home() {
    // 현재 선택된 탭 상태 관리 (홈이 기본값)
    const [selectedTab, setSelectedTab] = useState<TabType>("home");

    /**
     * 탭 변경 함수
     * @param tab 변경할 탭 타입
     */
    const handleTabChange = (tab: TabType) => {
        setSelectedTab(tab);
    };

    /**
     * 현재 선택된 탭에 따라 해당 페이지 컴포넌트를 렌더링
     */
    const renderCurrentPage = () => {
        switch (selectedTab) {
            case "home":
                return <HomePage setSelectedTab={handleTabChange} />;

            case "community":
                return <CommunityPage />;

            case "ai-chat":
                // ⭐ NEW: AI 펫톡 페이지 연결!
                return <AIChatPage />;

            case "adoption":
                // ⭐ NEW: 입양정보 페이지 연결!
                return <AdoptionPage />;

            case "local":
                // 추후 구현될 지역 정보 페이지
                return (
                    <div className="min-h-screen flex items-center justify-center">
                        <div className="text-center space-y-6 bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-white/50 dark:border-gray-700/50 rounded-3xl p-12 shadow-xl">
                            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                                <span className="text-3xl">📍</span>
                            </div>
                            <div className="space-y-3">
                                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
                                    지역 정보 페이지
                                </h2>
                                <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto leading-relaxed">
                                    우리 동네 반려동물
                                    <br />
                                    관련 정보를 한눈에
                                </p>
                                <div className="inline-flex items-center px-4 py-2 bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-700 rounded-xl">
                                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
                                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                        개발 예정
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case "petcare":
                // 추후 구현될 펫케어 페이지
                return (
                    <div className="min-h-screen flex items-center justify-center">
                        <div className="text-center space-y-6 bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-white/50 dark:border-gray-700/50 rounded-3xl p-12 shadow-xl">
                            <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                                <span className="text-3xl">🩺</span>
                            </div>
                            <div className="space-y-3">
                                <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-teal-600 dark:from-green-400 dark:to-teal-400 bg-clip-text text-transparent">
                                    펫케어 가이드 페이지
                                </h2>
                                <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto leading-relaxed">
                                    전문가가 제공하는
                                    <br />
                                    맞춤형 케어 정보
                                </p>
                                <div className="inline-flex items-center px-4 py-2 bg-green-100 dark:bg-green-900/50 border border-green-200 dark:border-green-700 rounded-xl">
                                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                                        개발 예정
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case "memorial":
                // 추후 구현될 추모공간 페이지
                return (
                    <div className="min-h-screen flex items-center justify-center">
                        <div className="text-center space-y-6 bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-white/50 dark:border-gray-700/50 rounded-3xl p-12 shadow-xl">
                            <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-sky-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                                <span className="text-3xl">☁️</span>
                            </div>
                            <div className="space-y-3">
                                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-sky-600 dark:from-blue-400 dark:to-sky-400 bg-clip-text text-transparent">
                                    하늘나라 친구들
                                </h2>
                                <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto leading-relaxed">
                                    소중한 친구와의 추억을
                                    <br />
                                    파란하늘에 간직하는 공간
                                </p>
                                <div className="inline-flex items-center px-4 py-2 bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-700 rounded-xl">
                                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
                                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                        개발 예정
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            default:
                // 예상치 못한 탭인 경우 홈으로 리다이렉트
                return <HomePage setSelectedTab={handleTabChange} />;
        }
    };

    return (
        <Layout selectedTab={selectedTab} setSelectedTab={handleTabChange}>
            {renderCurrentPage()}
        </Layout>
    );
}
