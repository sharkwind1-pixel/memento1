/**
 * PointsHistoryModal.tsx
 * 포인트 획득 내역 모달
 * - 최신순 내역 표시 (무한 스크롤)
 * - 활동별 아이콘 + 한글 라벨
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { X, Star, MessageCircle, Heart, PenLine, Camera, Clock, PawPrint } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getActionLabel, formatPoints } from "@/lib/points";
import type { PointTransaction, PointAction } from "@/types";

interface PointsHistoryModalProps {
    open: boolean;
    onClose: () => void;
}

// 활동별 아이콘 매핑
function getActionIcon(actionType: PointAction) {
    switch (actionType) {
        case "daily_login": return Clock;
        case "write_post": return PenLine;
        case "write_comment": return MessageCircle;
        case "receive_like": return Heart;
        case "ai_chat": return MessageCircle;
        case "pet_registration": return PawPrint;
        case "timeline_entry": return Star;
        case "photo_upload": return Camera;
        default: return Star;
    }
}

// 활동별 색상 매핑
function getActionColor(actionType: PointAction) {
    switch (actionType) {
        case "daily_login": return "text-amber-500 bg-amber-50 dark:bg-amber-900/20";
        case "write_post": return "text-sky-500 bg-sky-50 dark:bg-sky-900/20";
        case "write_comment": return "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20";
        case "receive_like": return "text-rose-500 bg-rose-50 dark:bg-rose-900/20";
        case "ai_chat": return "text-violet-500 bg-violet-50 dark:bg-violet-900/20";
        case "pet_registration": return "text-orange-500 bg-orange-50 dark:bg-orange-900/20";
        case "timeline_entry": return "text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20";
        case "photo_upload": return "text-teal-500 bg-teal-50 dark:bg-teal-900/20";
        default: return "text-gray-500 bg-gray-50 dark:bg-gray-900/20";
    }
}

export default function PointsHistoryModal({ open, onClose }: PointsHistoryModalProps) {
    const { points } = useAuth();
    const [transactions, setTransactions] = useState<PointTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(false);
    const [offset, setOffset] = useState(0);

    const fetchHistory = useCallback(async (currentOffset: number) => {
        try {
            setLoading(true);
            const res = await fetch(`/api/points/history?offset=${currentOffset}&limit=20`);
            if (!res.ok) return;
            const data = await res.json();

            if (currentOffset === 0) {
                setTransactions(data.transactions || []);
            } else {
                setTransactions(prev => [...prev, ...(data.transactions || [])]);
            }
            setHasMore(data.hasMore || false);
        } catch {
            // 조회 실패
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (open) {
            setOffset(0);
            fetchHistory(0);
        }
    }, [open, fetchHistory]);

    const loadMore = () => {
        const newOffset = offset + 20;
        setOffset(newOffset);
        fetchHistory(newOffset);
    };

    // 날짜 포맷
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        const diffHour = Math.floor(diffMs / 3600000);
        const diffDay = Math.floor(diffMs / 86400000);

        if (diffMin < 1) return "방금 전";
        if (diffMin < 60) return `${diffMin}분 전`;
        if (diffHour < 24) return `${diffHour}시간 전`;
        if (diffDay < 7) return `${diffDay}일 전`;
        return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
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
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                            포인트 내역
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            현재 보유: {formatPoints(points)}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* 내역 목록 */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {loading && transactions.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            불러오는 중...
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            아직 포인트 내역이 없습니다
                        </div>
                    ) : (
                        <>
                            {transactions.map((tx) => {
                                const Icon = getActionIcon(tx.actionType);
                                const colorClass = getActionColor(tx.actionType);
                                return (
                                    <div
                                        key={tx.id}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50"
                                    >
                                        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", colorClass)}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                                                {getActionLabel(tx.actionType)}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {formatDate(tx.createdAt)}
                                            </p>
                                        </div>
                                        <span className="text-sm font-bold text-sky-600 dark:text-sky-400">
                                            +{tx.pointsEarned}P
                                        </span>
                                    </div>
                                );
                            })}

                            {/* 더보기 */}
                            {hasMore && (
                                <button
                                    onClick={loadMore}
                                    disabled={loading}
                                    className={cn(
                                        "w-full py-3 text-sm text-gray-600 dark:text-gray-400 rounded-xl",
                                        "hover:bg-gray-100 dark:hover:bg-gray-800",
                                        "transition-colors",
                                        loading && "opacity-50"
                                    )}
                                >
                                    {loading ? "불러오는 중..." : "더보기"}
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
