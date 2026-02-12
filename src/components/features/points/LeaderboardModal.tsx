/**
 * LeaderboardModal.tsx
 * 포인트 랭킹 모달
 * - Top 100 사용자 표시
 * - 내 순위 하이라이트
 */

"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { X, Trophy, Medal } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatPoints } from "@/lib/points";
import type { LeaderboardEntry } from "@/types";

interface LeaderboardModalProps {
    open: boolean;
    onClose: () => void;
}

// 랭킹별 메달 색상
function getRankStyle(rank: number) {
    if (rank === 1) return "bg-gradient-to-r from-amber-100 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/20 border-amber-200 dark:border-amber-700";
    if (rank === 2) return "bg-gradient-to-r from-gray-100 to-slate-50 dark:from-gray-800 dark:to-slate-800 border-gray-300 dark:border-gray-600";
    if (rank === 3) return "bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-200 dark:border-orange-700";
    return "bg-gray-50 dark:bg-gray-800/50 border-transparent";
}

function getRankIcon(rank: number) {
    if (rank <= 3) return Medal;
    return null;
}

function getRankColor(rank: number) {
    if (rank === 1) return "text-amber-500";
    if (rank === 2) return "text-gray-400";
    if (rank === 3) return "text-orange-500";
    return "text-gray-600 dark:text-gray-400";
}

export default function LeaderboardModal({ open, onClose }: LeaderboardModalProps) {
    const { user } = useAuth();
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (open) {
            fetchLeaderboard();
        }
    }, [open]);

    const fetchLeaderboard = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/points/leaderboard");
            if (!res.ok) return;
            const data = await res.json();
            setLeaderboard(data.leaderboard || []);
        } catch {
            // 조회 실패
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* 백드롭 */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* 모달 */}
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full shadow-2xl max-h-[80vh] flex flex-col animate-in fade-in zoom-in-95">
                {/* 헤더 */}
                <div className="bg-gradient-to-br from-sky-400 to-violet-500 p-6 rounded-t-2xl text-white">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                    <div className="flex items-center gap-3">
                        <Trophy className="w-8 h-8" />
                        <div>
                            <h2 className="text-xl font-bold">포인트 랭킹</h2>
                            <p className="text-sm text-white/80">활발한 활동으로 순위를 올려보세요</p>
                        </div>
                    </div>
                </div>

                {/* 랭킹 목록 */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {loading ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            불러오는 중...
                        </div>
                    ) : leaderboard.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            아직 랭킹 데이터가 없습니다
                        </div>
                    ) : (
                        leaderboard.map((entry) => {
                            const isMe = entry.userId === user?.id;
                            const MedalIcon = getRankIcon(entry.rank);

                            return (
                                <div
                                    key={entry.userId}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-xl border transition-all",
                                        getRankStyle(entry.rank),
                                        isMe && "ring-2 ring-sky-400 dark:ring-sky-500"
                                    )}
                                >
                                    {/* 순위 */}
                                    <div className="w-8 text-center flex-shrink-0">
                                        {MedalIcon ? (
                                            <MedalIcon className={cn("w-6 h-6 mx-auto", getRankColor(entry.rank))} />
                                        ) : (
                                            <span className={cn("text-sm font-bold", getRankColor(entry.rank))}>
                                                {entry.rank}
                                            </span>
                                        )}
                                    </div>

                                    {/* 프로필 */}
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-200 to-violet-200 dark:from-sky-700 dark:to-violet-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                        {entry.avatarUrl ? (
                                            <img
                                                src={entry.avatarUrl}
                                                alt={entry.nickname}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                                                {entry.nickname?.charAt(0) || "?"}
                                            </span>
                                        )}
                                    </div>

                                    {/* 닉네임 */}
                                    <div className="flex-1 min-w-0">
                                        <p className={cn(
                                            "text-sm font-medium truncate",
                                            isMe ? "text-sky-600 dark:text-sky-400" : "text-gray-800 dark:text-white"
                                        )}>
                                            {entry.nickname}
                                            {isMe && " (나)"}
                                        </p>
                                    </div>

                                    {/* 포인트 */}
                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300 flex-shrink-0">
                                        {formatPoints(entry.points)}
                                    </span>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
