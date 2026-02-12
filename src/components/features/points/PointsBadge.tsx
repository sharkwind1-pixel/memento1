/**
 * PointsBadge.tsx
 * 사이드바에 표시하는 포인트 배지 위젯
 * - 현재 포인트 + 랭킹 표시
 * - 클릭 시 내역/랭킹 모달 열기
 */

"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Star, Trophy, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatPoints } from "@/lib/points";
import PointsHistoryModal from "./PointsHistoryModal";
import LeaderboardModal from "./LeaderboardModal";
import { LevelProgress } from "./LevelBadge";

export default function PointsBadge() {
    const { user, points, rank } = useAuth();
    const nickname = user?.user_metadata?.nickname || user?.email?.split("@")[0];
    const [showHistory, setShowHistory] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);

    // 비로그인 시 표시 안함
    if (!user) return null;

    return (
        <>
            <div className="px-3 py-3 space-y-2">
                {/* 등급 프로그레스 */}
                <LevelProgress points={points} nickname={nickname} />

                {/* 포인트 표시 */}
                <button
                    onClick={() => setShowHistory(true)}
                    className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-xl",
                        "bg-gradient-to-r from-sky-50 to-violet-50",
                        "dark:from-sky-900/20 dark:to-violet-900/20",
                        "hover:from-sky-100 hover:to-violet-100",
                        "dark:hover:from-sky-900/30 dark:hover:to-violet-900/30",
                        "transition-all group"
                    )}
                >
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-violet-400 flex items-center justify-center">
                            <Star className="w-4 h-4 text-white" />
                        </div>
                        <div className="text-left">
                            <p className="text-xs text-gray-500 dark:text-gray-400">내 포인트</p>
                            <p className="text-sm font-bold text-gray-800 dark:text-white">
                                {formatPoints(points)}
                            </p>
                        </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                </button>

                {/* 랭킹 표시 */}
                {rank > 0 && (
                    <button
                        onClick={() => setShowLeaderboard(true)}
                        className={cn(
                            "w-full flex items-center justify-between px-3 py-2 rounded-xl",
                            "hover:bg-gray-100 dark:hover:bg-gray-800",
                            "transition-all group"
                        )}
                    >
                        <div className="flex items-center gap-2.5">
                            <Trophy className={cn(
                                "w-4 h-4",
                                rank <= 3 ? "text-amber-500" :
                                rank <= 10 ? "text-sky-500" :
                                "text-gray-400"
                            )} />
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                                랭킹 {rank}위
                            </span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                    </button>
                )}
            </div>

            {/* 모달 */}
            {showHistory && (
                <PointsHistoryModal
                    open={showHistory}
                    onClose={() => setShowHistory(false)}
                />
            )}
            {showLeaderboard && (
                <LeaderboardModal
                    open={showLeaderboard}
                    onClose={() => setShowLeaderboard(false)}
                />
            )}
        </>
    );
}
