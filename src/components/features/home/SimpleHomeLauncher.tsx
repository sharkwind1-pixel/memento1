/**
 * SimpleHomeLauncher.tsx
 * 간편모드 홈 화면 - 큰 카드 런처 그리드
 * 노인 사용자를 위한 간결한 메인 화면
 */

"use client";

import React from "react";
import Image from "next/image";
import {
    Camera,
    MessageCircle,
    Users,
    BookOpen,
    Home,
    Heart,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMemorialMode } from "@/contexts/PetContext";
import { TabType, CommunitySubcategory } from "@/types";
import { safeSetItem } from "@/lib/safe-storage";
import QuestCard from "@/components/features/quests/QuestCard";
import Open100Banner from "@/components/features/home/Open100Banner";

interface SimpleHomeLauncherProps {
    setSelectedTab: (tab: TabType) => void;
    onSubcategoryChange?: (sub: CommunitySubcategory) => void;
}

const LAUNCHER_ITEMS: {
    id: string;
    label: string;
    description: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
}[] = [
    {
        id: "record",
        label: "내 반려동물",
        description: "사진, 일기, 기록",
        icon: Camera,
        color: "text-memento-600 dark:text-memento-400",
        bgColor: "bg-memento-200 dark:bg-memento-900/20",
    },
    {
        id: "ai-chat",
        label: "AI와 대화",
        description: "AI 펫톡 상담",
        icon: MessageCircle,
        color: "text-emerald-600 dark:text-emerald-400",
        bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
        id: "community",
        label: "커뮤니티",
        description: "자유게시판, 소통",
        icon: Users,
        color: "text-memento-600 dark:text-memento-400",
        bgColor: "bg-memento-200 dark:bg-memento-900/20",
    },
    {
        id: "magazine",
        label: "펫매거진",
        description: "반려동물 정보",
        icon: BookOpen,
        color: "text-purple-600 dark:text-purple-400",
        bgColor: "bg-purple-50 dark:bg-purple-900/20",
    },
    {
        id: "minihompy",
        label: "내 미니홈피",
        description: "나만의 공간",
        icon: Home,
        color: "text-memento-600 dark:text-memento-400",
        bgColor: "bg-memento-50 dark:bg-memento-900/20",
    },
    {
        id: "adoption",
        label: "입양정보",
        description: "유기동물 입양",
        icon: Heart,
        color: "text-rose-600 dark:text-rose-400",
        bgColor: "bg-rose-50 dark:bg-rose-900/20",
    },
];

export default function SimpleHomeLauncher({ setSelectedTab, onSubcategoryChange }: SimpleHomeLauncherProps) {
    const { user, toggleSimpleMode } = useAuth();
    const { isMemorialMode } = useMemorialMode();
    const nickname = user?.user_metadata?.nickname || user?.email?.split("@")[0] || "사용자";

    const handleCardClick = (id: string) => {
        if (id === "minihompy") {
            safeSetItem("memento-record-tab", "minihompy");
            setSelectedTab("record");
        } else if (id === "adoption") {
            setSelectedTab("community");
            onSubcategoryChange?.("adoption");
        } else {
            setSelectedTab(id as TabType);
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* 배경 */}
            <div className={`absolute inset-0 bg-gradient-to-b ${
                isMemorialMode
                    ? "from-memorial-50/80 via-memorial-50/30 to-orange-50/20 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"
                    : "from-memento-200/80 via-memento-200/40 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"
            }`} />

            <div className="relative z-10 px-4 pt-4 pb-10">
                {/* 히어로 배너 */}
                <div className={`relative overflow-hidden rounded-3xl mb-6 ${
                    isMemorialMode
                        ? "bg-gradient-to-b from-[#091A2E] via-[#1A2A3E] to-[#3D2A1A]"
                        : "bg-gradient-to-br from-[#CBEBF0] via-[#E0F3F6] to-[#FFF8F6]"
                }`}>
                    <div className="relative z-10 flex items-center gap-4 p-5 sm:p-6">
                        <div className="relative w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] flex-shrink-0">
                            <Image
                                src={isMemorialMode ? "/images/hero-illustration-memorial.png" : "/images/hero-illustration.png"}
                                alt=""
                                fill
                                className="object-contain"
                                sizes="120px"
                            />
                        </div>
                        <div className="min-w-0">
                            <h1 className={`text-lg sm:text-xl font-bold leading-snug ${isMemorialMode ? "text-memorial-50" : "text-gray-800"}`}>
                                안녕하세요,
                                <br />
                                {nickname}님
                            </h1>
                            <p className={`text-xs sm:text-sm mt-1.5 ${isMemorialMode ? "text-memorial-200/70" : "text-gray-500"}`}>
                                어떤 것을 하시겠어요?
                            </p>
                        </div>
                    </div>
                </div>

                {/* Open 100 이벤트 배너 (관리자 전용) */}
                <div className="max-w-lg mx-auto -mx-4">
                    <Open100Banner />
                </div>

                {/* 온보딩 미션 카드 — 신규 유저 가이드 */}
                <div className="max-w-lg mx-auto -mx-4">
                    <QuestCard setSelectedTab={setSelectedTab} />
                </div>

                {/* 카드 그리드 */}
                <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto mt-4">
                    {LAUNCHER_ITEMS.map((item) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleCardClick(item.id)}
                                className={`flex flex-col items-center justify-center gap-2
                                    ${item.bgColor} rounded-2xl p-4 sm:p-6
                                    shadow-md hover:shadow-lg active:scale-[0.97] active:shadow-sm
                                    transition-all duration-200 min-h-[120px] sm:min-h-[140px]
                                    border border-white/60 dark:border-gray-700`}
                            >
                                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/70 dark:bg-gray-800/60 flex items-center justify-center`}>
                                    <Icon className={`w-7 h-7 sm:w-8 sm:h-8 ${item.color}`} />
                                </div>
                                <div className="text-center">
                                    <span className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100 block whitespace-nowrap">
                                        {item.label}
                                    </span>
                                    <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                        {item.description}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* 일반모드 전환 버튼 */}
                <div className="text-center mt-8 pb-4">
                    <button
                        onClick={toggleSimpleMode}
                        className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 underline underline-offset-4 transition-colors"
                    >
                        일반모드로 전환
                    </button>
                </div>
            </div>
        </div>
    );
}
