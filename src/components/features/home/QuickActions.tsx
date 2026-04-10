/**
 * QuickActions.tsx
 * 홈 화면 Quick Actions 4카드 바로가기
 * B안 참고: 파스텔 배경 아이콘 + 라벨 카드
 */

"use client";

import React from "react";
import { MessageCircle, BookOpen, Users, Newspaper } from "lucide-react";
import { TabType } from "@/types";

interface QuickActionsProps {
    setSelectedTab: (tab: TabType) => void;
}

const ACTIONS = [
    {
        label: "AI 펫톡",
        sub: "대화하기",
        icon: MessageCircle,
        tab: "ai-chat" as TabType,
        bg: "bg-memento-100 dark:bg-memento-900/30",
        iconColor: "text-memento-500",
    },
    {
        label: "우리의 기록",
        sub: "타임라인",
        icon: BookOpen,
        tab: "record" as TabType,
        bg: "bg-memento-200 dark:bg-memento-900/30",
        iconColor: "text-memento-500",
    },
    {
        label: "커뮤니티",
        sub: "이야기",
        icon: Users,
        tab: "community" as TabType,
        bg: "bg-violet-100 dark:bg-violet-900/30",
        iconColor: "text-violet-500",
    },
    {
        label: "펫매거진",
        sub: "읽을거리",
        icon: Newspaper,
        tab: "magazine" as TabType,
        bg: "bg-memorial-100 dark:bg-memorial-900/30",
        iconColor: "text-memorial-500",
    },
];

export default function QuickActions({ setSelectedTab }: QuickActionsProps) {
    return (
        <section className="px-4">
            <div className="grid grid-cols-4 gap-3 sm:gap-4">
                {ACTIONS.map(({ label, sub, icon: Icon, tab, bg, iconColor }) => (
                    <button
                        key={tab}
                        onClick={() => setSelectedTab(tab)}
                        className={`${bg} rounded-2xl p-4 sm:p-5 flex flex-col items-center gap-2 sm:gap-3 hover:scale-[1.03] active:scale-95 transition-all duration-200 group`}
                    >
                        <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
                            <Icon className={`w-6 h-6 sm:w-7 sm:h-7 ${iconColor} group-hover:scale-110 transition-transform`} />
                        </div>
                        <div className="text-center">
                            <p className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-100 leading-tight">{label}</p>
                            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 hidden sm:block">{sub}</p>
                        </div>
                    </button>
                ))}
            </div>
        </section>
    );
}
