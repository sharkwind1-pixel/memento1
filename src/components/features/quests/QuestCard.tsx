/**
 * QuestCard.tsx
 * 홈페이지 상단 온보딩 미션 진행 카드
 *
 * - 일상 모드: "오늘의 미션" 어조 (게임화)
 * - 추모 모드: "함께 걸어요" 어조 (절제된 따뜻함)
 * - 모든 미션 완료 시 사라짐
 * - 사용자가 X 누르면 localStorage에 저장하여 영구 숨김
 */

"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, ArrowRight, X, Sparkles, FlaskConical } from "lucide-react";
import { useMemorialMode } from "@/contexts/PetContext";
import { useAuth } from "@/contexts/AuthContext";
import { useQuests } from "./useQuests";
import { TabType } from "@/types";
import { TRUSTED_EMAILS, QuestId } from "@/config/constants";
import { safeGetItem, safeSetItem } from "@/lib/safe-storage";

interface QuestCardProps {
    setSelectedTab: (tab: TabType) => void;
}

const HIDE_KEY = "memento-quest-card-hidden";

export default function QuestCard({ setSelectedTab }: QuestCardProps) {
    const { user } = useAuth();
    const { isMemorialMode } = useMemorialMode();
    const { quests, progress, completedCount, totalCount, currentQuest, isAllDone, loading, completeQuest } = useQuests();
    const [isHidden, setIsHidden] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const isTester = TRUSTED_EMAILS.includes(user?.email ?? "");

    const handleTestComplete = async (questId: QuestId) => {
        await completeQuest(questId);
    };

    useEffect(() => {
        setIsHidden(safeGetItem(HIDE_KEY) === "true");
    }, []);

    if (loading || isHidden || isAllDone || !currentQuest) return null;

    const progressPercent = Math.round((completedCount / totalCount) * 100);

    const titleText = isMemorialMode ? "함께 걸어요" : "오늘의 미션";
    const subtitleText = isMemorialMode
        ? `천천히 한 걸음씩 (${completedCount} / ${totalCount})`
        : `${totalCount}단계 중 ${completedCount}단계 완료`;

    const themeFrom = isMemorialMode
        ? "from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/10"
        : "from-memento-50 to-blue-50 dark:from-memento-900/20 dark:to-blue-900/10";
    const themeBorder = isMemorialMode
        ? "border-amber-200 dark:border-amber-800/40"
        : "border-memento-200 dark:border-memento-800/40";
    const themeAccent = isMemorialMode ? "text-amber-600 dark:text-amber-400" : "text-memento-600 dark:text-memento-400";
    const themeBar = isMemorialMode ? "bg-amber-400" : "bg-memento-500";
    const themeBtn = isMemorialMode
        ? "bg-amber-500 hover:bg-amber-600"
        : "bg-memento-500 hover:bg-memento-600";

    const handleAction = () => {
        if (currentQuest.targetTab) {
            setSelectedTab(currentQuest.targetTab as TabType);
        }
    };

    const handleHide = () => {
        safeSetItem(HIDE_KEY, "true");
        setIsHidden(true);
    };

    return (
        <div className={`mx-4 mt-4 rounded-2xl bg-gradient-to-br ${themeFrom} border ${themeBorder} overflow-hidden`}>
            {/* 헤더 */}
            <div className="px-4 pt-4 pb-3 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isMemorialMode ? "bg-amber-100 dark:bg-amber-900/40" : "bg-memento-100 dark:bg-memento-900/40"}`}>
                    <Sparkles className={`w-5 h-5 ${themeAccent}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">{titleText}</h3>
                        <span className={`text-xs ${themeAccent}`}>{progressPercent}%</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitleText}</p>
                </div>
                <button
                    onClick={handleHide}
                    className="p-1 rounded-lg hover:bg-white/50 dark:hover:bg-gray-700/50 transition-colors"
                    aria-label="숨기기"
                >
                    <X className="w-4 h-4 text-gray-400" />
                </button>
            </div>

            {/* 진행률 바 */}
            <div className="px-4 mb-3">
                <div className="h-1.5 bg-white/60 dark:bg-gray-800/60 rounded-full overflow-hidden">
                    <div
                        className={`h-full ${themeBar} transition-all duration-500`}
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>

            {/* 현재 미션 + 액션 */}
            <div className="px-4 pb-4">
                <button
                    onClick={handleAction}
                    className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-white/80 dark:bg-gray-800/60 hover:bg-white dark:hover:bg-gray-800 transition-colors text-left"
                >
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {currentQuest.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                            {currentQuest.description}
                        </p>
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg ${themeBtn} text-white text-xs font-medium flex-shrink-0`}>
                        <span>{currentQuest.actionLabel}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                </button>

                {/* 테스터 전용: 강제 완료 버튼 (관리자 + 테스트 계정만) */}
                {isTester && (
                    <button
                        onClick={() => handleTestComplete(currentQuest.id)}
                        className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-600 dark:text-purple-300 text-[11px] font-medium transition-colors"
                    >
                        <FlaskConical className="w-3 h-3" />
                        테스트: 이 단계 완료 처리
                    </button>
                )}
            </div>

            {/* 펼치기 — 전체 단계 보기 */}
            <div className="border-t border-white/40 dark:border-gray-700/40">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full px-4 py-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                    {isExpanded ? "단계 접기" : "전체 단계 보기"}
                </button>
                {isExpanded && (
                    <div className="px-4 pb-4 space-y-1.5">
                        {quests.map((q, idx) => {
                            const done = !!progress[q.id];
                            const isCurrent = currentQuest?.id === q.id;
                            return (
                                <div
                                    key={q.id}
                                    className={`flex items-center gap-2.5 py-1.5 ${
                                        done ? "opacity-60" : isCurrent ? "" : "opacity-50"
                                    }`}
                                >
                                    {done ? (
                                        <CheckCircle2 className={`w-4 h-4 ${themeAccent}`} />
                                    ) : (
                                        <div className={`w-4 h-4 rounded-full border-2 ${isCurrent ? themeAccent.replace("text-", "border-") : "border-gray-300 dark:border-gray-600"}`} />
                                    )}
                                    <span className={`text-xs ${done ? "line-through text-gray-400" : "text-gray-700 dark:text-gray-300"} flex-1`}>
                                        {idx + 1}. {q.title}
                                    </span>
                                    {/* 테스터 전용: 미완료 단계마다 강제 완료 */}
                                    {isTester && !done && (
                                        <button
                                            onClick={() => handleTestComplete(q.id)}
                                            className="px-2 py-0.5 rounded text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50"
                                            aria-label={`${q.title} 테스트 완료`}
                                        >
                                            완료
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
