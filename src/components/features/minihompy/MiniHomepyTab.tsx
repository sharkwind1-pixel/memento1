/**
 * MiniHomepyTab.tsx
 * RecordPage 내 미니홈피 탭
 * - 내 미니홈피 스테이지 표시
 * - 설정 (인사말, 배경, 공개/비공개)
 * - 방명록 목록
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2, MessageSquare, Trash2, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";
import type { MinihompySettings, GuestbookEntry } from "@/types";
import MinihompyStage from "./MinihompyStage";
import MinihompySettingsSection from "./MinihompySettingsSection";
import Image from "next/image";

export default function MiniHomepyTab() {
    const { user, minimiEquip } = useAuth();
    const nickname = user?.user_metadata?.nickname || user?.email?.split("@")[0] || "익명";

    const [settings, setSettings] = useState<MinihompySettings | null>(null);
    const [guestbook, setGuestbook] = useState<GuestbookEntry[]>([]);
    const [guestbookTotal, setGuestbookTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    // 설정 로드
    const loadSettings = useCallback(async () => {
        try {
            const res = await authFetch(API.MINIHOMPY_SETTINGS);
            if (res.ok) {
                const data = await res.json();
                setSettings(data.settings);
            }
        } catch {
            toast.error("미니홈피 설정을 불러오지 못했습니다.");
        }
    }, []);

    // 방명록 로드
    const loadGuestbook = useCallback(async (offset = 0, append = false) => {
        if (!user) return;
        try {
            const res = await authFetch(`${API.MINIHOMPY_GUESTBOOK(user.id)}?offset=${offset}`);
            if (res.ok) {
                const data = await res.json();
                if (append) {
                    setGuestbook(prev => [...prev, ...data.guestbook]);
                } else {
                    setGuestbook(data.guestbook);
                }
                setGuestbookTotal(data.total);
            }
        } catch {
            toast.error("방명록을 불러오지 못했습니다.");
        }
    }, [user]);

    // 초기 로드
    useEffect(() => {
        if (!user) return;
        setLoading(true);
        Promise.all([loadSettings(), loadGuestbook()]).finally(() => setLoading(false));
    }, [user, loadSettings, loadGuestbook]);

    // 설정 업데이트 핸들러
    const handleSettingsUpdate = useCallback(async (updates: Partial<MinihompySettings>) => {
        try {
            const res = await authFetch(API.MINIHOMPY_SETTINGS, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates),
            });
            if (res.ok) {
                const data = await res.json();
                setSettings(data.settings);
                toast.success("설정이 저장되었습니다");
            } else {
                const err = await res.json();
                toast.error(err.error || "설정 저장 실패");
            }
        } catch {
            toast.error("설정 저장 실패");
        }
    }, []);

    // 방명록 삭제
    const handleDeleteGuestbook = useCallback(async (entryId: string) => {
        if (!user) return;
        try {
            const res = await authFetch(
                `${API.MINIHOMPY_GUESTBOOK(user.id)}?entryId=${entryId}`,
                { method: "DELETE" }
            );
            if (res.ok) {
                setGuestbook(prev => prev.filter(g => g.id !== entryId));
                setGuestbookTotal(prev => prev - 1);
                toast.success("방명록이 삭제되었습니다");
            } else {
                toast.error("삭제 실패");
            }
        } catch {
            toast.error("삭제 실패");
        }
    }, [user]);

    // 더보기
    const handleLoadMore = async () => {
        setLoadingMore(true);
        await loadGuestbook(guestbook.length, true);
        setLoadingMore(false);
    };

    if (!user) return null;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-[#05B2DC] animate-spin" />
            </div>
        );
    }

    const currentSettings = settings || {
        userId: user.id,
        isPublic: true,
        backgroundSlug: "default_sky",
        greeting: "",
        todayVisitors: 0,
        totalVisitors: 0,
        totalLikes: 0,
    };

    return (
        <div className="space-y-4">
            {/* 미니홈피 스테이지 */}
            <MinihompyStage
                backgroundSlug={currentSettings.backgroundSlug}
                minimiEquip={minimiEquip}
                greeting={currentSettings.greeting}
                ownerNickname={nickname}
                todayVisitors={currentSettings.todayVisitors}
                totalVisitors={currentSettings.totalVisitors}
                isOwner
            />

            {/* 설정 섹션 */}
            <MinihompySettingsSection
                settings={currentSettings}
                onUpdate={handleSettingsUpdate}
            />

            {/* 방명록 섹션 */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border-0 shadow-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-5 h-5 text-pink-500" />
                    <h3 className="font-semibold text-gray-800 dark:text-white">
                        방명록
                    </h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        ({guestbookTotal})
                    </span>
                </div>

                {guestbook.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                        <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">아직 방명록이 없어요</p>
                        <p className="text-xs mt-1">
                            다른 사용자가 미니홈피에 놀러오면 방명록을 남겨줄 거에요
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {guestbook.map((entry) => (
                            <GuestbookItem
                                key={entry.id}
                                entry={entry}
                                isOwner={true}
                                currentUserId={user.id}
                                onDelete={handleDeleteGuestbook}
                            />
                        ))}

                        {guestbook.length < guestbookTotal && (
                            <button
                                onClick={handleLoadMore}
                                disabled={loadingMore}
                                className={cn(
                                    "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl",
                                    "text-sm font-medium text-gray-500 dark:text-gray-400",
                                    "bg-gray-50 dark:bg-gray-700/50",
                                    "hover:bg-gray-100 dark:hover:bg-gray-700",
                                    "transition-colors"
                                )}
                            >
                                {loadingMore ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <ChevronDown className="w-4 h-4" />
                                        더보기
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// 방명록 아이템 서브컴포넌트
function GuestbookItem({
    entry,
    isOwner,
    currentUserId,
    onDelete,
}: {
    entry: GuestbookEntry;
    isOwner: boolean;
    currentUserId: string;
    onDelete: (id: string) => void;
}) {
    const canDelete = isOwner || entry.visitorId === currentUserId;
    const timeAgo = getTimeAgo(entry.createdAt);

    return (
        <div className="flex gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30">
            {/* 방문자 미니미 */}
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-pink-50 dark:bg-pink-900/20 flex items-center justify-center overflow-hidden">
                {entry.visitorImageUrl ? (
                    <Image
                        src={entry.visitorImageUrl}
                        alt={entry.visitorNickname}
                        width={24}
                        height={24}
                        className="object-contain"
                        style={{ imageRendering: "pixelated" }}
                    />
                ) : (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-300 to-purple-300 flex items-center justify-center">
                        <span className="text-[8px] text-white font-bold">
                            {entry.visitorNickname.charAt(0)}
                        </span>
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">
                        {entry.visitorNickname}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">
                        {timeAgo}
                    </span>
                    {canDelete && (
                        <button
                            onClick={() => onDelete(entry.id)}
                            className="ml-auto text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 break-words">
                    {entry.content}
                </p>
            </div>
        </div>
    );
}

function getTimeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "방금";
    if (diffMin < 60) return `${diffMin}분 전`;
    if (diffHr < 24) return `${diffHr}시간 전`;
    if (diffDay < 30) return `${diffDay}일 전`;
    return date.toLocaleDateString("ko-KR");
}
