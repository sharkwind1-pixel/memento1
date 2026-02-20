/**
 * MinihompyVisitModal.tsx
 * 다른 사용자의 미니홈피 방문 모달
 * - 배경 + 미니미 스테이지
 * - 좋아요 + 방명록 + 방문 카운터
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
    X, Heart, Loader2, MessageSquare,
    Trash2, ChevronDown, Send,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";
import { MINIHOMPY } from "@/config/constants";
import type { MinihompyViewData, GuestbookEntry, MinimiEquipState } from "@/types";
import MinihompyStage from "./MinihompyStage";
import MinimiRenderer from "../minimi/MinimiRenderer";

interface MinihompyVisitModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
}

export default function MinihompyVisitModal({
    isOpen,
    onClose,
    userId,
}: MinihompyVisitModalProps) {
    const { user } = useAuth();
    const [data, setData] = useState<MinihompyViewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isLiked, setIsLiked] = useState(false);
    const [totalLikes, setTotalLikes] = useState(0);
    const [guestbook, setGuestbook] = useState<GuestbookEntry[]>([]);
    const [guestbookTotal, setGuestbookTotal] = useState(0);
    const [guestbookText, setGuestbookText] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [liking, setLiking] = useState(false);

    // 데이터 로드
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const res = await authFetch(API.MINIHOMPY_VIEW(userId));
            if (!res.ok) {
                const err = await res.json();
                setError(err.error || "미니홈피를 불러올 수 없습니다");
                return;
            }

            const viewData: MinihompyViewData = await res.json();
            setData(viewData);
            setIsLiked(viewData.isLiked);
            setTotalLikes(viewData.settings.totalLikes);
            setGuestbook(viewData.guestbook);
            setGuestbookTotal(viewData.guestbookTotal);
        } catch {
            setError("미니홈피를 불러올 수 없습니다");
        } finally {
            setLoading(false);
        }
    }, [userId]);

    // 방문 기록
    const recordVisit = useCallback(async () => {
        try {
            await authFetch(API.MINIHOMPY_VISIT(userId), { method: "POST" });
        } catch {
            // 방문 기록 실패는 무시
        }
    }, [userId]);

    useEffect(() => {
        if (isOpen) {
            loadData();
            recordVisit();
        }
    }, [isOpen, loadData, recordVisit]);

    // 좋아요 토글
    const handleLike = async () => {
        if (!user) {
            toast.error("로그인이 필요합니다");
            return;
        }
        if (user.id === userId) {
            toast.error("자신의 미니홈피에는 좋아요를 할 수 없습니다");
            return;
        }

        setLiking(true);
        try {
            const res = await authFetch(API.MINIHOMPY_LIKE(userId), {
                method: "POST",
            });
            if (res.ok) {
                const result = await res.json();
                setIsLiked(result.liked);
                setTotalLikes(result.totalLikes);
            }
        } catch {
            toast.error("좋아요 실패");
        } finally {
            setLiking(false);
        }
    };

    // 방명록 작성
    const handleSubmitGuestbook = async () => {
        if (!user) {
            toast.error("로그인이 필요합니다");
            return;
        }
        if (!guestbookText.trim()) {
            return;
        }

        setSubmitting(true);
        try {
            const res = await authFetch(API.MINIHOMPY_GUESTBOOK(userId), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: guestbookText }),
            });

            if (res.ok) {
                const result = await res.json();
                setGuestbook(prev => [result.entry, ...prev]);
                setGuestbookTotal(prev => prev + 1);
                setGuestbookText("");
                toast.success("방명록을 남겼습니다");
            } else {
                const err = await res.json();
                toast.error(err.error || "방명록 작성 실패");
            }
        } catch {
            toast.error("방명록 작성 실패");
        } finally {
            setSubmitting(false);
        }
    };

    // 방명록 삭제
    const handleDeleteGuestbook = async (entryId: string) => {
        try {
            const res = await authFetch(
                `${API.MINIHOMPY_GUESTBOOK(userId)}?entryId=${entryId}`,
                { method: "DELETE" }
            );
            if (res.ok) {
                setGuestbook(prev => prev.filter(g => g.id !== entryId));
                setGuestbookTotal(prev => prev - 1);
            }
        } catch {
            toast.error("삭제 실패");
        }
    };

    // 더보기
    const handleLoadMore = async () => {
        setLoadingMore(true);
        try {
            const res = await authFetch(
                `${API.MINIHOMPY_GUESTBOOK(userId)}?offset=${guestbook.length}`
            );
            if (res.ok) {
                const result = await res.json();
                setGuestbook(prev => [...prev, ...result.guestbook]);
                setGuestbookTotal(result.total);
            }
        } catch {
            // ignore
        } finally {
            setLoadingMore(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="visit-title"
        >
            <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-h-[85vh] flex flex-col">
                {/* 헤더 */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                    <h2 id="visit-title" className="text-lg font-bold text-gray-800 dark:text-white">
                        {data?.ownerNickname || "..."}의 미니홈피
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* 본문 */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 text-[#05B2DC] animate-spin" />
                        </div>
                    ) : error ? (
                        <div className="text-center py-20 text-gray-400">
                            <p>{error}</p>
                        </div>
                    ) : data ? (
                        <div className="p-4 space-y-4">
                            {/* 스테이지 */}
                            <MinihompyStage
                                backgroundSlug={data.settings.backgroundSlug}
                                minimiEquip={data.ownerMinimiEquip}
                                greeting={data.settings.greeting}
                                ownerNickname={data.ownerNickname}
                                todayVisitors={data.settings.todayVisitors}
                                totalVisitors={data.settings.totalVisitors}
                                compact
                            />

                            {/* 좋아요 */}
                            <div className="flex items-center justify-center">
                                <button
                                    onClick={handleLike}
                                    disabled={liking || !user || user.id === userId}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-full transition-all",
                                        isLiked
                                            ? "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
                                            : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                    )}
                                >
                                    <Heart className={cn(
                                        "w-4 h-4 transition-all",
                                        isLiked && "fill-current"
                                    )} />
                                    <span className="text-sm font-medium">{totalLikes}</span>
                                </button>
                            </div>

                            {/* 방명록 */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 text-pink-500" />
                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                        방명록 ({guestbookTotal})
                                    </span>
                                </div>

                                {/* 방명록 작성 */}
                                {user && user.id !== userId && (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={guestbookText}
                                            onChange={(e) => setGuestbookText(e.target.value.slice(0, MINIHOMPY.GUESTBOOK_MAX_LENGTH))}
                                            placeholder="방명록을 남겨보세요..."
                                            className={cn(
                                                "flex-1 text-sm px-3 py-2 rounded-xl border",
                                                "bg-gray-50 dark:bg-gray-800",
                                                "border-gray-200 dark:border-gray-700",
                                                "text-gray-700 dark:text-gray-200",
                                                "focus:outline-none focus:ring-2 focus:ring-pink-500/30"
                                            )}
                                            maxLength={MINIHOMPY.GUESTBOOK_MAX_LENGTH}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSubmitGuestbook();
                                                }
                                            }}
                                        />
                                        <button
                                            onClick={handleSubmitGuestbook}
                                            disabled={submitting || !guestbookText.trim()}
                                            className={cn(
                                                "p-2 rounded-xl transition-colors",
                                                guestbookText.trim()
                                                    ? "bg-pink-500 text-white hover:bg-pink-600"
                                                    : "bg-gray-200 dark:bg-gray-700 text-gray-400"
                                            )}
                                        >
                                            {submitting ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Send className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                )}

                                {/* 방명록 목록 */}
                                {guestbook.length === 0 ? (
                                    <div className="text-center py-6 text-gray-400 dark:text-gray-500">
                                        <p className="text-sm">아직 방명록이 없어요</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {guestbook.map((entry) => (
                                            <VisitGuestbookItem
                                                key={entry.id}
                                                entry={entry}
                                                currentUserId={user?.id || ""}
                                                ownerId={userId}
                                                onDelete={handleDeleteGuestbook}
                                            />
                                        ))}

                                        {guestbook.length < guestbookTotal && (
                                            <button
                                                onClick={handleLoadMore}
                                                disabled={loadingMore}
                                                className={cn(
                                                    "w-full flex items-center justify-center gap-2 py-2 rounded-xl",
                                                    "text-xs font-medium text-gray-500 dark:text-gray-400",
                                                    "bg-gray-50 dark:bg-gray-800",
                                                    "hover:bg-gray-100 dark:hover:bg-gray-700",
                                                    "transition-colors"
                                                )}
                                            >
                                                {loadingMore ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <>
                                                        <ChevronDown className="w-3 h-3" />
                                                        더보기
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

function VisitGuestbookItem({
    entry,
    currentUserId,
    ownerId,
    onDelete,
}: {
    entry: GuestbookEntry;
    currentUserId: string;
    ownerId: string;
    onDelete: (id: string) => void;
}) {
    const canDelete = entry.visitorId === currentUserId || ownerId === currentUserId;
    const date = new Date(entry.createdAt);
    const timeStr = date.toLocaleDateString("ko-KR", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

    return (
        <div className="flex gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <div className="flex-shrink-0 w-7 h-7 rounded-full overflow-hidden flex items-center justify-center">
                {entry.visitorMinimiData ? (
                    <MinimiRenderer
                        pixelData={entry.visitorMinimiData}
                        size="xs"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-pink-300 to-purple-300 flex items-center justify-center">
                        <span className="text-[7px] text-white font-bold">
                            {entry.visitorNickname.charAt(0)}
                        </span>
                    </div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[11px] font-medium text-gray-700 dark:text-gray-200 truncate">
                        {entry.visitorNickname}
                    </span>
                    <span className="text-[9px] text-gray-400 flex-shrink-0">
                        {timeStr}
                    </span>
                    {canDelete && (
                        <button
                            onClick={() => onDelete(entry.id)}
                            className="ml-auto text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                        >
                            <Trash2 className="w-2.5 h-2.5" />
                        </button>
                    )}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300 break-words">
                    {entry.content}
                </p>
            </div>
        </div>
    );
}
