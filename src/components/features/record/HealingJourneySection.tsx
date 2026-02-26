/**
 * HealingJourneySection.tsx
 * 치유의 여정 대시보드 - 추모 모드 펫 전용
 * 감정 추이, 애도 단계, 마일스톤 시각화
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
    Heart,
    Star,
    Sparkles,
    TrendingUp,
    Loader2,
    MessageCircle,
    Smile,
    Frown,
    Meh,
    Award,
    Calendar,
} from "lucide-react";
import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";

interface HealingJourneySectionProps {
    petId: string;
    petName: string;
}

interface Milestone {
    id: string;
    title: string;
    description: string;
    achieved: boolean;
    achievedDate?: string;
}

interface HealingData {
    petId: string;
    petName: string;
    conversationCount: number;
    lastConversation: string | null;
    emotionTrend: Array<{
        date: string;
        dominant: string;
        category: "positive" | "neutral" | "negative";
    }>;
    griefProgress: Array<{
        date: string;
        stage: string;
        stageIndex: number;
    }>;
    milestones: Milestone[];
    recentPositiveRatio: number;
    summary: {
        totalSessions: number;
        milestonesAchieved: number;
        totalMilestones: number;
        currentGriefStage: string | null;
    };
}

// 애도 단계 한글 이름
const GRIEF_STAGE_NAMES: Record<string, string> = {
    denial: "부정",
    anger: "분노",
    bargaining: "협상",
    depression: "슬픔",
    acceptance: "수용",
    unknown: "시작",
};

// 애도 단계 설명
const GRIEF_STAGE_DESCRIPTIONS: Record<string, string> = {
    denial: "이별을 받아들이기 어려운 단계",
    anger: "상실에 대한 감정을 표출하는 단계",
    bargaining: "'만약에...'라는 생각이 드는 단계",
    depression: "깊은 슬픔을 느끼는 단계",
    acceptance: "이별을 받아들이고 추억을 간직하는 단계",
    unknown: "아직 대화를 시작하지 않았어요",
};

export default function HealingJourneySection({
    petId,
    petName,
}: HealingJourneySectionProps) {
    const [data, setData] = useState<HealingData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const res = await authFetch(API.HEALING_JOURNEY(petId));
            if (res.ok) {
                const json = await res.json();
                setData(json);
                setError(null);
            } else {
                const err = await res.json();
                setError(err.error || "데이터를 불러올 수 없습니다.");
            }
        } catch {
            setError("네트워크 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    }, [petId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl p-6 border border-amber-200/50 dark:border-amber-700/50">
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl p-6 border border-amber-200/50 dark:border-amber-700/50">
                <p className="text-center text-amber-600 dark:text-amber-400 text-sm">
                    {error}
                </p>
            </div>
        );
    }

    if (!data || data.conversationCount === 0) {
        return (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl p-6 border border-amber-200/50 dark:border-amber-700/50">
                <div className="text-center py-4">
                    <Star className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                    <h3 className="font-medium text-amber-700 dark:text-amber-300 mb-2">
                        {petName}의 치유의 여정
                    </h3>
                    <p className="text-sm text-amber-600/80 dark:text-amber-400/80">
                        AI 펫톡에서 {petName}와(과) 대화를 시작하면<br />
                        치유의 여정을 기록해 드릴게요
                    </p>
                </div>
            </div>
        );
    }

    const currentStage = data.summary.currentGriefStage || "unknown";

    return (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl p-4 border border-amber-200/50 dark:border-amber-700/50 space-y-4">
            {/* 헤더 */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-amber-500" />
                    <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                        {petName}의 치유의 여정
                    </h3>
                </div>
                <span className="text-xs text-amber-600/70 dark:text-amber-400/70">
                    {data.conversationCount}번의 대화
                </span>
            </div>

            {/* 현재 애도 단계 */}
            <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="text-xs text-amber-600/80 dark:text-amber-400/80">
                            현재 단계
                        </p>
                        <p className="font-semibold text-amber-800 dark:text-amber-200">
                            {GRIEF_STAGE_NAMES[currentStage]}
                        </p>
                    </div>
                </div>
                <p className="text-sm text-amber-700/80 dark:text-amber-300/80">
                    {GRIEF_STAGE_DESCRIPTIONS[currentStage]}
                </p>
            </div>

            {/* 최근 감정 요약 */}
            {data.emotionTrend.length > 0 && (
                <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-4">
                    <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mb-3">
                        최근 감정 흐름
                    </p>
                    <div className="flex items-center gap-2">
                        {data.emotionTrend.slice(-5).map((item, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    "flex-1 h-8 rounded-lg flex items-center justify-center",
                                    item.category === "positive" && "bg-green-100 dark:bg-green-900/30",
                                    item.category === "neutral" && "bg-gray-100 dark:bg-gray-700/30",
                                    item.category === "negative" && "bg-amber-100 dark:bg-amber-900/30"
                                )}
                            >
                                {item.category === "positive" && <Smile className="w-4 h-4 text-green-600" />}
                                {item.category === "neutral" && <Meh className="w-4 h-4 text-gray-500" />}
                                {item.category === "negative" && <Frown className="w-4 h-4 text-amber-600" />}
                            </div>
                        ))}
                    </div>
                    {data.recentPositiveRatio > 0.4 && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            따뜻한 감정들이 찾아오고 있어요
                        </p>
                    )}
                </div>
            )}

            {/* 마일스톤 */}
            <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Award className="w-4 h-4 text-amber-500" />
                    <p className="text-xs text-amber-600/80 dark:text-amber-400/80">
                        마일스톤 ({data.summary.milestonesAchieved}/{data.summary.totalMilestones})
                    </p>
                </div>
                <div className="space-y-2">
                    {data.milestones.map((milestone) => (
                        <div
                            key={milestone.id}
                            className={cn(
                                "flex items-center gap-3 p-2 rounded-lg transition-colors",
                                milestone.achieved
                                    ? "bg-amber-100/50 dark:bg-amber-900/20"
                                    : "bg-gray-50/50 dark:bg-gray-800/50 opacity-50"
                            )}
                        >
                            <div className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                                milestone.achieved
                                    ? "bg-amber-500 text-white"
                                    : "bg-gray-200 dark:bg-gray-700 text-gray-400"
                            )}>
                                {milestone.achieved ? (
                                    <Star className="w-3 h-3" fill="currentColor" />
                                ) : (
                                    <Star className="w-3 h-3" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={cn(
                                    "text-sm font-medium truncate",
                                    milestone.achieved
                                        ? "text-amber-800 dark:text-amber-200"
                                        : "text-gray-400 dark:text-gray-500"
                                )}>
                                    {milestone.title}
                                </p>
                                {milestone.achieved && milestone.achievedDate && (
                                    <p className="text-[10px] text-amber-600/60 dark:text-amber-400/60 flex items-center gap-1">
                                        <Calendar className="w-2.5 h-2.5" />
                                        {new Date(milestone.achievedDate).toLocaleDateString("ko-KR")}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 대화 유도 */}
            <div className="text-center py-2">
                <button
                    onClick={() => {
                        // AI 펫톡 탭으로 이동하는 로직은 부모에서 처리
                        const event = new CustomEvent("navigate-to-tab", { detail: "chat" });
                        window.dispatchEvent(event);
                    }}
                    className={cn(
                        "inline-flex items-center gap-2 px-4 py-2 rounded-full",
                        "text-sm font-medium",
                        "bg-amber-500 text-white",
                        "hover:bg-amber-600 active:scale-95",
                        "transition-all"
                    )}
                >
                    <MessageCircle className="w-4 h-4" />
                    {petName}와(과) 대화하기
                </button>
            </div>
        </div>
    );
}
