/**
 * useQuests — 미션 진행 상태 + 완료 트리거 훅
 *
 * 사용:
 *   const { progress, completeQuest, currentQuest, isAllDone } = useQuests();
 *
 *   // 트리거 (액션 후 호출):
 *   await completeQuest("register_pet");
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";
import {
    DAILY_QUESTS,
    MEMORIAL_QUESTS,
    QuestId,
    QuestDef,
} from "@/config/constants";
import { useAuth } from "@/contexts/AuthContext";
import { useMemorialMode } from "@/contexts/PetContext";
import { toast } from "sonner";

interface UseQuestsResult {
    progress: Record<string, string>;
    quests: QuestDef[];
    completedCount: number;
    totalCount: number;
    currentQuest: QuestDef | null; // 다음에 할 미션
    isAllDone: boolean;
    loading: boolean;
    completeQuest: (questId: QuestId) => Promise<{ bonusEarned: number; nextQuestId?: QuestId } | null>;
    refresh: () => Promise<void>;
}

export function useQuests(): UseQuestsResult {
    const { user, refreshPoints } = useAuth();
    const { isMemorialMode } = useMemorialMode();
    const [progress, setProgress] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    const quests = isMemorialMode ? MEMORIAL_QUESTS : DAILY_QUESTS;

    const refresh = useCallback(async () => {
        if (!user) {
            setProgress({});
            setLoading(false);
            return;
        }
        try {
            const res = await authFetch(API.QUESTS);
            if (!res.ok) return;
            const data = await res.json();
            setProgress(data.progress || {});
        } catch {
            // 무시
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    // 다른 곳에서 미션 완료 시 외부 이벤트 — 위젯 즉시 갱신
    useEffect(() => {
        const handler = () => refresh();
        window.addEventListener("quest-completed", handler);
        return () => window.removeEventListener("quest-completed", handler);
    }, [refresh]);

    const completeQuest = useCallback(
        async (questId: QuestId) => {
            if (!user) return null;
            try {
                const res = await authFetch(API.QUESTS, {
                    method: "POST",
                    body: JSON.stringify({ questId }),
                });
                if (!res.ok) return null;
                const data = await res.json();
                if (data.alreadyCompleted) return null; // 중복 호출은 조용히 넘김

                // 진행 상태 갱신
                setProgress(data.progress || {});
                window.dispatchEvent(new CustomEvent("quest-completed"));

                // 보너스 토스트 (있을 때만)
                const quest = quests.find((q) => q.id === questId);
                if (data.bonusEarned > 0 && quest) {
                    toast.success(`${quest.title} 완료! +${data.bonusEarned}P`, {
                        description: data.nextQuestId ? "다음 단계로 이어집니다" : "모든 단계 완료!",
                    });
                }

                // Open 100 이벤트 달성 — 추가 토스트 + 포인트 UI 갱신
                if (data.open100Awarded) {
                    toast.success("오픈 100 이벤트 달성 +1,000P", {
                        description:
                            typeof data.open100Remaining === "number"
                                ? `남은 자리 ${data.open100Remaining}명`
                                : "선착순 100명 한정 보너스가 지급됐어요",
                        duration: 6000,
                    });
                    window.dispatchEvent(new CustomEvent("open100-awarded"));
                    // 헤더/사이드바 포인트 즉시 반영
                    refreshPoints().catch(() => {});
                }

                return {
                    bonusEarned: data.bonusEarned ?? 0,
                    nextQuestId: data.nextQuestId,
                };
            } catch {
                return null;
            }
        },
        [user, quests, refreshPoints]
    );

    const completedCount = quests.filter((q) => progress[q.id]).length;
    const totalCount = quests.length;
    const currentQuest = quests.find((q) => !progress[q.id]) || null;
    const isAllDone = completedCount === totalCount && totalCount > 0;

    return {
        progress,
        quests,
        completedCount,
        totalCount,
        currentQuest,
        isAllDone,
        loading,
        completeQuest,
        refresh,
    };
}
