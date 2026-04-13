/**
 * NotificationBell.tsx
 * 헤더 우측 알림 벨 아이콘 + 뱃지 + 드롭다운 패널
 * - 자체 state로 관리 (Layout 리렌더 방지)
 * - window focus 시 refetch
 * - ESC로 드롭다운 닫기
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Bell } from "lucide-react";
import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";
import type { AppNotification } from "@/types";
import NotificationItem from "./NotificationItem";

export default function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await authFetch(API.NOTIFICATIONS);
            if (!res.ok) return;
            const data = await res.json();
            setNotifications(data.notifications ?? []);
            setUnreadCount(data.unreadCount ?? 0);
        } catch {
            // 네트워크 실패 무시
        }
    }, []);

    // 초기 로드
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // window focus 시 refetch
    useEffect(() => {
        const handleFocus = () => fetchNotifications();
        window.addEventListener("focus", handleFocus);
        return () => window.removeEventListener("focus", handleFocus);
    }, [fetchNotifications]);

    // ESC로 닫기
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsOpen(false);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen]);

    // 드롭다운 열 때 데이터 새로고침
    const handleToggle = useCallback(() => {
        setIsOpen((prev) => {
            if (!prev) {
                setLoading(true);
                fetchNotifications().finally(() => setLoading(false));
            }
            return !prev;
        });
    }, [fetchNotifications]);

    // 모두 읽음 처리
    const handleMarkAllRead = useCallback(async () => {
        if (unreadCount === 0) return;
        // 낙관적 업데이트
        setUnreadCount(0);
        setNotifications((prev) =>
            prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() }))
        );

        try {
            await authFetch(API.NOTIFICATIONS, {
                method: "PATCH",
                body: JSON.stringify({ markAllRead: true }),
            });
        } catch {
            // 실패 시 다시 가져오기
            fetchNotifications();
        }
    }, [unreadCount, fetchNotifications]);

    return (
        <div className="relative">
            {/* 벨 버튼 */}
            <button
                type="button"
                onClick={handleToggle}
                className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label={`알림 ${unreadCount > 0 ? `(${unreadCount}개 안 읽음)` : ""}`}
            >
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>

            {/* 드롭다운 */}
            {isOpen && (
                <>
                    {/* 배경 클릭 닫기 */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* 패널 */}
                    <div
                        ref={panelRef}
                        className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
                    >
                        {/* 헤더 */}
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                알림
                            </h3>
                            {unreadCount > 0 && (
                                <button
                                    type="button"
                                    onClick={handleMarkAllRead}
                                    className="text-xs text-memento-500 hover:text-memento-600 font-medium"
                                >
                                    모두 읽음
                                </button>
                            )}
                        </div>

                        {/* 알림 목록 */}
                        <div className="max-h-80 overflow-y-auto">
                            {loading && notifications.length === 0 ? (
                                <div className="py-8 text-center">
                                    <div className="w-5 h-5 border-2 border-gray-300 border-t-memento-500 rounded-full animate-spin mx-auto" />
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="py-8 text-center">
                                    <Bell className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                                    <p className="text-sm text-gray-400 dark:text-gray-500">
                                        아직 알림이 없습니다
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                    {notifications.map((n) => (
                                        <NotificationItem
                                            key={n.id}
                                            notification={n}
                                            onClick={() => {
                                                // 개별 읽음 처리
                                                if (!n.readAt) {
                                                    setNotifications((prev) =>
                                                        prev.map((item) =>
                                                            item.id === n.id
                                                                ? { ...item, readAt: new Date().toISOString() }
                                                                : item
                                                        )
                                                    );
                                                    setUnreadCount((prev) => Math.max(0, prev - 1));
                                                    authFetch(API.NOTIFICATIONS, {
                                                        method: "PATCH",
                                                        body: JSON.stringify({ ids: [n.id] }),
                                                    }).catch(() => {});
                                                }
                                            }}
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
