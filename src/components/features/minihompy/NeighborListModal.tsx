/**
 * NeighborListModal.tsx
 * 내 이웃 목록 모달 — 나를 추가한(팔로워) / 내가 추가한(팔로잉) 탭, 서로이웃 배지.
 * 빈 상태 fallback 필수(PETHOME-SPEC §14 — 빈 그래프가 "죽은 앱" 인상 주지 않게).
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { X, Users, Loader2, UserCheck, Share2 } from "lucide-react";
import { toast } from "sonner";
import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";

interface NeighborItem {
    userId: string;
    nickname: string;
    mutual: boolean;
}

interface NeighborListModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    /** 타인 펫홈 열람용 모달 열기 (이웃 펫홈 놀러가기) */
    onVisit?: (userId: string) => void;
}

type ListTab = "followers" | "following";

export default function NeighborListModal({ isOpen, onClose, userId, onVisit }: NeighborListModalProps) {
    const [tab, setTab] = useState<ListTab>("followers");
    const [items, setItems] = useState<NeighborItem[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async (which: ListTab) => {
        setLoading(true);
        try {
            const res = await authFetch(`${API.NEIGHBORS(userId)}?list=${which}`);
            if (!res.ok) throw new Error();
            const d = await res.json();
            setItems(d.items ?? []);
            setTotal(d.total ?? 0);
        } catch {
            setItems([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        if (isOpen) load(tab);
    }, [isOpen, tab, load]);

    const handleShare = async () => {
        try {
            await navigator.clipboard.writeText(window.location.origin);
            toast.success("주소를 복사했어요. 친구에게 펫홈을 공유해보세요!");
        } catch {
            toast.error("주소 복사에 실패했습니다");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
            <div
                className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-5 max-h-[80vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-memento-500" />
                    <h3 className="font-bold text-gray-800 dark:text-white flex-1">이웃</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" aria-label="닫기">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* 탭 */}
                <div className="flex gap-1.5 mb-4">
                    {([
                        { key: "followers" as const, label: "나를 이웃으로" },
                        { key: "following" as const, label: "내가 이웃으로" },
                    ]).map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={cn(
                                "flex-1 py-2 rounded-xl text-xs font-semibold transition-all",
                                tab === t.key
                                    ? "bg-memento-500 text-white"
                                    : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                            )}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* 목록 */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="w-6 h-6 text-memento-500 animate-spin" />
                        </div>
                    ) : items.length === 0 ? (
                        /* 빈 상태 fallback (§14) */
                        <div className="text-center py-8">
                            <Users className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">아직 이웃이 없어요</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 leading-relaxed">
                                다른 펫홈에 놀러가 이웃을 맺거나,<br />내 펫홈을 공유해 이웃을 만들어보세요
                            </p>
                            <button
                                onClick={handleShare}
                                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-memento-500 hover:bg-memento-600 text-white text-xs font-semibold transition-colors"
                            >
                                <Share2 className="w-3.5 h-3.5" />
                                펫홈 공유하기
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <p className="text-[11px] text-gray-400 px-1">{total}명</p>
                            {items.map((n) => (
                                <button
                                    key={n.userId}
                                    onClick={() => onVisit?.(n.userId)}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                                >
                                    <div className="w-9 h-9 rounded-full bg-memento-100 dark:bg-memento-900/30 flex items-center justify-center flex-shrink-0">
                                        <span className="text-xs font-bold text-memento-600 dark:text-memento-400">
                                            {n.nickname.charAt(0)}
                                        </span>
                                    </div>
                                    <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                                        {n.nickname}
                                    </span>
                                    {n.mutual && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-memento-500 bg-memento-50 dark:bg-memento-900/30 rounded-full px-2 py-0.5">
                                            <UserCheck className="w-3 h-3" />
                                            서로이웃
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
