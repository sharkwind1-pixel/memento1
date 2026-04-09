/**
 * NotificationBell — 헤더 알림 벨 아이콘 + 드롭다운 패널
 * Layout.tsx 헤더에 배치, 자체 state 관리 (Layout 리렌더 방지)
 */

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";
import NotificationItem, { type NotificationData } from "./NotificationItem";

export default function NotificationBell() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<NotificationData[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);
            const res = await authFetch(API.NOTIFICATIONS);
            if (!res.ok) return;
            const data = await res.json();
            setNotifications(data.notifications || []);
            setUnreadCount(data.unreadCount || 0);
        } catch {
            // 무시
        } finally {
            setLoading(false);
        }
    }, [user]);

    // 첫 로드 + focus 시 refetch
    useEffect(() => {
        fetchNotifications();

        const handleFocus = () => fetchNotifications();
        window.addEventListener("focus", handleFocus);
        return () => window.removeEventListener("focus", handleFocus);
    }, [fetchNotifications]);

    // ESC 키로 닫기
    useEffect(() => {
        if (!isOpen) return;
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsOpen(false);
        };
        document.addEventListener("keydown", handleEsc);
        return () => document.removeEventListener("keydown", handleEsc);
    }, [isOpen]);

    const markAsRead = async (id: string) => {
        // 낙관적 업데이트
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));

        authFetch(API.NOTIFICATIONS, {
            method: "PATCH",
            body: JSON.stringify({ ids: [id] }),
        }).catch(() => {});
    };

    const markAllRead = async () => {
        // 낙관적 업데이트
        setNotifications((prev) =>
            prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
        );
        setUnreadCount(0);

        authFetch(API.NOTIFICATIONS, {
            method: "PATCH",
            body: JSON.stringify({ markAllRead: true }),
        }).catch(() => {});
    };

    const handleToggle = () => {
        if (!isOpen) fetchNotifications();
        setIsOpen(!isOpen);
    };

    if (!user) return null;

    return (
        <div className="relative">
            <button
                onClick={handleToggle}
                className="relative p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95 transition-all duration-200"
                aria-label={`알림${unreadCount > 0 ? ` (${unreadCount}개 읽지 않음)` : ""}`}
            >
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    {/* 배경 클릭으로 닫기 */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* 알림 패널 */}
                    <div
                        ref={panelRef}
                        className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] max-h-[28rem] bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden flex flex-col"
                    >
                        {/* 헤더 */}
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                알림
                            </span>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllRead}
                                    className="flex items-center gap-1 text-xs text-memento-500 hover:text-memento-600 dark:text-memento-400 font-medium"
                                >
                                    <CheckCheck className="w-3.5 h-3.5" />
                                    모두 읽음
                                </button>
                            )}
                        </div>

                        {/* 알림 목록 */}
                        <div className="overflow-y-auto flex-1">
                            {loading && notifications.length === 0 ? (
                                <div className="p-8 text-center text-sm text-gray-400">
                                    불러오는 중...
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="p-8 text-center">
                                    <Bell className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                                    <p className="text-sm text-gray-400 dark:text-gray-500">
                                        알림이 없습니다
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                    {notifications.map((n) => (
                                        <NotificationItem
                                            key={n.id}
                                            notification={n}
                                            onMarkRead={markAsRead}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
