/**
 * SegmentActionCards — 홈 첫화면의 회원 유형별 "지금 해볼 것" 카드.
 * onboardingData.userType로 분기:
 *  - planning(입양 준비): 반려 사주(openSaju) + 입양 정보
 *  - current(양육 중): 케어 리마인더 + 오늘 기록 + AI 펫톡
 *  - memorial(이별): 추억 돌아보기 + 마음 나누기 (차분한 amber 톤, 호들갑 금지)
 * 유형 미상(기존 유저 등)이면 표시하지 않음.
 */
"use client";

import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { TabType, CommunitySubcategory } from "@/types";
import { Sparkles, Search, Bell, BookOpen, MessageCircle, Heart } from "lucide-react";

interface Props {
    setSelectedTab: (tab: TabType, sub?: CommunitySubcategory) => void;
}

type Card = {
    label: string;
    sub: string;
    icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
    primary?: boolean;
};

export default function SegmentActionCards({ setSelectedTab }: Props) {
    const { user, onboardingData } = useAuth();
    if (!user) return null;

    const seg = onboardingData?.userType ?? null;
    if (seg !== "planning" && seg !== "current" && seg !== "memorial") return null;

    const openSaju = () => window.dispatchEvent(new Event("openSaju"));
    const isMemorial = seg === "memorial";

    let heading = "";
    let cards: Card[] = [];

    if (seg === "planning") {
        heading = "입양을 준비하고 있다면";
        cards = [
            { label: "반려 사주", sub: "나와 맞는 아이 · 이름 기운 · 만남 시기", icon: Sparkles, onClick: openSaju, primary: true },
            { label: "입양 정보", sub: "분양 소식 · 먼저 키운 분들 이야기", icon: Search, onClick: () => setSelectedTab("community", "adoption") },
        ];
    } else if (seg === "current") {
        heading = "오늘 우리 아이와";
        cards = [
            { label: "케어 리마인더", sub: "접종 · 산책 · 약 챙기기", icon: Bell, onClick: () => setSelectedTab("record") },
            { label: "오늘 기록", sub: "사진 · 일상 타임라인", icon: BookOpen, onClick: () => setSelectedTab("record") },
            { label: "AI 펫톡", sub: "성격 그대로 대화", icon: MessageCircle, onClick: () => setSelectedTab("ai-chat") },
        ];
    } else {
        heading = "함께한 시간을";
        cards = [
            { label: "추억 돌아보기", sub: "우리 아이의 기록", icon: Heart, onClick: () => setSelectedTab("record") },
            { label: "마음 나누기", sub: "보고 싶을 때, AI 펫톡", icon: MessageCircle, onClick: () => setSelectedTab("ai-chat") },
        ];
    }

    const accentText = isMemorial ? "text-memorial-600 dark:text-memorial-400" : "text-memento-600 dark:text-memento-400";
    const tintBg = isMemorial ? "bg-memorial-50/80 dark:bg-memorial-900/15" : "bg-white/70 dark:bg-gray-800/50";
    const primaryGrad = isMemorial
        ? "from-memorial-500 to-orange-400"
        : "from-memento-500 to-memento-400";

    return (
        <section className="px-4">
            <div className="max-w-md mx-auto sm:max-w-2xl">
                <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">{heading}</h2>
                <div className="flex gap-2.5">
                    {cards.map(({ label, sub, icon: Icon, onClick, primary }) => (
                        <button
                            key={label}
                            onClick={onClick}
                            className={`flex-1 min-w-0 rounded-2xl p-3.5 text-left transition active:scale-[0.98] border ${
                                primary
                                    ? `bg-gradient-to-br ${primaryGrad} text-white border-transparent shadow-sm`
                                    : `${tintBg} border-gray-100 dark:border-gray-700 hover:shadow-sm`
                            }`}
                        >
                            <span className={`inline-flex w-8 h-8 rounded-xl items-center justify-center mb-2 ${
                                primary ? "bg-white/20" : isMemorial ? "bg-memorial-100 dark:bg-memorial-900/30" : "bg-memento-100 dark:bg-memento-900/30"
                            }`}>
                                <Icon className={`w-[18px] h-[18px] ${primary ? "text-white" : accentText}`} />
                            </span>
                            <span className={`block text-sm font-bold leading-tight ${primary ? "text-white" : "text-gray-800 dark:text-gray-100"}`}>{label}</span>
                            <span className={`block text-[11px] mt-0.5 leading-snug ${primary ? "text-white/85" : "text-gray-500 dark:text-gray-400"}`}>{sub}</span>
                        </button>
                    ))}
                </div>
            </div>
        </section>
    );
}
