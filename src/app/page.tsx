/**
 * 메멘토애니 메인 페이지
 */

"use client";

import { useState } from "react";
import { TabType } from "@/types";
import Layout from "@/components/common/Layout";
import HomePage from "@/components/pages/HomePage";
import CommunityPage from "@/components/pages/CommunityPage";
import AIChatPage from "@/components/pages/AIChatPage";
import AdoptionPage from "@/components/pages/AdoptionPage";
import LocalPage from "@/components/pages/LocalPage";
import LostPage from "@/components/pages/LostPage";
import MagazinePage from "@/components/pages/MagazinePage";
import RecordPage from "@/components/pages/RecordPage";

export default function Home() {
    const [selectedTab, setSelectedTab] = useState<TabType>("home");

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

    return (
        <Layout selectedTab={selectedTab} setSelectedTab={handleTabChange}>
            {renderCurrentPage()}
        </Layout>
    );
}
