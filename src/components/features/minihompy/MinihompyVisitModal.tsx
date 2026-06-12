/**
 * MinihompyVisitModal.tsx
 * 다른 사용자의 펫홈 방문 모달
 * - 배경 + 꼬미 스테이지
 * - 좋아요 + 방명록 + 방문 카운터
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
    X, Heart, Loader2, MessageSquare,
    Trash2, ChevronDown, Send, UserPlus, UserCheck, Waves,
} from "lucide-react";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import { useOptimisticToggle } from "@/hooks";
import { useAuth } from "@/contexts/AuthContext";
import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";
import { MINIHOMPY } from "@/config/constants";
import type { MinihompyViewData, GuestbookEntry, MinimiEquipState } from "@/types";
import MinihompyStage from "./MinihompyStage";
import Image from "next/image";


interface MinihompyVisitModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
}

export default function MinihompyVisitModal({
    isOpen,
    onClose,
    userId: initialUserId,
}: MinihompyVisitModalProps) {
    const { user } = useAuth();
    const runToggle = useOptimisticToggle();
    // 파도타기: 모달 안에서 이웃집으로 연쇄 이동 — userId를 내부 상태로 승격.
    // 이하 코드는 전부 surfUserId(=userId)를 보므로, 이동 시 loadData/recordVisit/loadNeighbor가
    // useCallback 의존성으로 자동 재실행돼 새 집 데이터·방문기록·이웃상태가 갱신된다.
    const [surfUserId, setSurfUserId] = useState(initialUserId);
    useEffect(() => { if (isOpen) setSurfUserId(initialUserId); }, [isOpen, initialUserId]);
    const userId = surfUserId;
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

    // 이웃(팔로우) 상태
    const [iFollow, setIFollow] = useState(false);
    const [mutual, setMutual] = useState(false);
    const [followerCount, setFollowerCount] = useState(0);
    const [neighborBusy, setNeighborBusy] = useState(false);
    // 파도타기: 이 집이 이웃 맺은 집들 (로그인 시에만 — list API가 게스트 401)
    const [surfList, setSurfList] = useState<Array<{ userId: string; nickname: string; mutual: boolean }>>([]);

    // 데이터 로드
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const res = await authFetch(API.MINIHOMPY_VIEW(userId));
            if (!res.ok) {
                const err = await res.json();
                setError(err.error || "펫홈을 불러올 수 없습니다");
                return;
            }

            const viewData: MinihompyViewData = await res.json();
            setData(viewData);
            setIsLiked(viewData.isLiked);
            setTotalLikes(viewData.settings.totalLikes);
            setGuestbook(viewData.guestbook);
            setGuestbookTotal(viewData.guestbookTotal);
        } catch {
            setError("펫홈을 불러올 수 없습니다");
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

    // 이웃 상태 로드 (+로그인 시 파도타기용 이 집의 이웃 목록 — 같은 API가 한 호출로 반환)
    const loadNeighbor = useCallback(async () => {
        try {
            const url = user ? `${API.NEIGHBORS(userId)}?list=following` : API.NEIGHBORS(userId);
            const res = await authFetch(url);
            if (!res.ok) return;
            const d = await res.json();
            setFollowerCount(d.followerCount ?? 0);
            setIFollow(d.relation?.iFollow ?? false);
            setMutual(d.relation?.mutual ?? false);
            setSurfList(Array.isArray(d.items) ? d.items : []);
        } catch { /* 무시 */ }
    }, [userId, user]);

    useEffect(() => {
        if (isOpen) {
            loadData();
            recordVisit();
            loadNeighbor();
        }
    }, [isOpen, loadData, recordVisit, loadNeighbor]);

    // 이웃 추가/해제 토글
    const handleNeighbor = async () => {
        if (!user) {
            window.dispatchEvent(new CustomEvent("openAuthModal", { detail: { message: "이웃을 맺고 소식을 받으려면 회원가입이 필요해요. 무료로 시작할 수 있어요." } }));
            return;
        }
        if (user.id === userId || neighborBusy) return;

        setNeighborBusy(true);
        const wasFollowing = iFollow;
        // 낙관적 반영
        setIFollow(!wasFollowing);
        setFollowerCount((c) => Math.max(0, c + (wasFollowing ? -1 : 1)));
        if (wasFollowing) setMutual(false);
        try {
            const res = await authFetch(API.NEIGHBORS(userId), { method: wasFollowing ? "DELETE" : "POST" });
            if (!res.ok) throw new Error("neighbor toggle failed");
            const d = await res.json();
            setIFollow(d.following);
            setMutual(d.mutual ?? false);
            if (d.following) {
                toast.success(d.mutual ? "서로 이웃이 되었어요!" : "이웃을 추가했어요");
            }
            // 서버 기준 카운트 재동기화 (낙관적 ±1과 동시 변경 어긋남 보정 — 9번 #11)
            loadNeighbor();
        } catch {
            // 롤백
            setIFollow(wasFollowing);
            setFollowerCount((c) => Math.max(0, c + (wasFollowing ? 1 : -1)));
            toast.error("이웃 처리에 실패했습니다");
        } finally {
            setNeighborBusy(false);
        }
    };

    // 좋아요 토글 — 공용 낙관적 토글 훅으로 연타 가드 + 즉시 반영 + 실패 롤백 표준화
    const handleLike = async () => {
        if (!user) {
            window.dispatchEvent(new CustomEvent("openAuthModal", { detail: { message: "이 펫홈에 마음을 남기려면 회원가입이 필요해요. 무료로 시작할 수 있어요." } }));
            return;
        }
        if (user.id === userId) {
            toast.error("자신의 펫홈에는 좋아요를 할 수 없습니다");
            return;
        }

        const prevLiked = isLiked;
        const prevTotal = totalLikes;
        await runToggle<{ liked: boolean; totalLikes: number }>("minihompy-like", {
            apply: () => {
                setLiking(true);
                setIsLiked(!prevLiked);
                setTotalLikes(prevLiked ? Math.max(0, prevTotal - 1) : prevTotal + 1);
            },
            request: async () => {
                const res = await authFetch(API.MINIHOMPY_LIKE(userId), { method: "POST" });
                if (!res.ok) throw new Error("minihompy like failed");
                return res.json();
            },
            reconcile: (result) => {
                setIsLiked(result.liked);
                setTotalLikes(result.totalLikes);
            },
            rollback: () => {
                setIsLiked(prevLiked);
                setTotalLikes(prevTotal);
            },
            onError: () => toast.error("좋아요 실패"),
            onSettled: () => setLiking(false),
        });
    };

    // 방명록 작성
    const handleSubmitGuestbook = async () => {
        if (!user) {
            window.dispatchEvent(new CustomEvent("openAuthModal", { detail: { message: "방명록을 남기려면 회원가입이 필요해요. 무료로 시작할 수 있어요." } }));
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
                // 포인트 토스트
                try {
                    const { showPointsFromResponse } = await import("@/components/features/points/PointsToastContainer");
                    showPointsFromResponse(result);
                } catch { /* 무시 */ }
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

    useEscapeClose(isOpen, onClose);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] overflow-y-auto bg-black/50 backdrop-blur-sm"
            style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
            onClick={(e) => e.target === e.currentTarget && onClose()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="visit-title"
        >
            <div className="min-h-full flex items-start justify-center pt-8 pb-8 px-4">
            <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
                {/* 헤더 */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                    <h2 id="visit-title" className="text-lg font-bold text-gray-800 dark:text-white">
                        {data?.ownerNickname || "..."}의 펫홈
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
                            <Loader2 className="w-8 h-8 text-memento-600 animate-spin" />
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
                                placedMinimi={data.settings.placedMinimi || []}
                                compact
                            />

                            {/* 좋아요 + 이웃 */}
                            <div className="flex items-center justify-center gap-2">
                                {/* 게스트도 클릭 가능 — handleLike가 맥락 가입후크(openAuthModal)로 분기 (Phase 1 퍼널) */}
                                <button
                                    onClick={handleLike}
                                    disabled={liking || user?.id === userId}
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

                                {/* 이웃 추가/해제 — 게스트는 가입후크, 서로이웃이면 표시 */}
                                {user?.id !== userId && (
                                    <button
                                        onClick={handleNeighbor}
                                        disabled={neighborBusy}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2 rounded-full transition-all",
                                            iFollow
                                                ? "bg-memento-100 dark:bg-memento-900/30 text-memento-600 dark:text-memento-400"
                                                : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-memento-50 dark:hover:bg-memento-900/20"
                                        )}
                                    >
                                        {iFollow ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                                        <span className="text-sm font-medium">
                                            {mutual ? "서로이웃" : iFollow ? "이웃" : "이웃 맺기"}
                                        </span>
                                        <span className="text-xs opacity-70">{followerCount}</span>
                                    </button>
                                )}
                            </div>

                            {/* 파도타기 — 이 집의 이웃들 타고 구경 (싸이월드 파도타기) */}
                            {user && surfList.filter((n) => n.userId !== user.id && n.userId !== userId).length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Waves className="w-4 h-4 text-memento-500" />
                                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">파도타기</span>
                                        <span className="text-xs text-gray-400">이 집의 이웃집 구경가기</span>
                                    </div>
                                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                        {surfList
                                            .filter((n) => n.userId !== user.id && n.userId !== userId)
                                            .map((n) => (
                                                <button
                                                    key={n.userId}
                                                    onClick={() => setSurfUserId(n.userId)}
                                                    className="flex-shrink-0 flex flex-col items-center gap-1 w-16 group"
                                                >
                                                    <span className="w-11 h-11 rounded-full bg-memento-50 dark:bg-memento-900/20 border border-memento-100 dark:border-gray-700 flex items-center justify-center text-sm font-bold text-memento-600 dark:text-memento-300 group-hover:scale-105 transition-transform">
                                                        {n.nickname.slice(0, 1)}
                                                    </span>
                                                    <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate w-full text-center">
                                                        {n.nickname}
                                                    </span>
                                                </button>
                                            ))}
                                    </div>
                                </div>
                            )}

                            {/* 방명록 */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 text-pink-500" />
                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                        방명록 ({guestbookTotal})
                                    </span>
                                </div>

                                {/* 게스트: 가입후크 버튼 (PostDetailComments 패턴 — 퍼널 cta 연결) */}
                                {!user && (
                                    <button
                                        onClick={() => window.dispatchEvent(new CustomEvent("openAuthModal", { detail: { message: "방명록을 남기려면 회원가입이 필요해요. 무료로 시작할 수 있어요." } }))}
                                        className="w-full py-2.5 text-center text-sm text-gray-500 hover:text-pink-500 transition-colors rounded-xl border border-dashed border-gray-300 dark:border-gray-600"
                                    >
                                        로그인하고 방명록을 남겨보세요
                                    </button>
                                )}

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
                {entry.visitorImageUrl ? (
                    <Image
                        src={entry.visitorImageUrl}
                        alt={entry.visitorNickname}
                        width={20}
                        height={20}
                        className="object-contain"
                        style={{ imageRendering: "pixelated" }}
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
