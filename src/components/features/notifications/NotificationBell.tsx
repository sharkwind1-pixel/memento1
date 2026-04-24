/**
 * NotificationBell — 헤더 알림 벨 아이콘 + 드롭다운 패널
 * Layout.tsx 헤더에 배치, 자체 state 관리 (Layout 리렌더 방지)
 */

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, X, Megaphone, Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";
import NotificationItem, { type NotificationData } from "./NotificationItem";

export default function NotificationBell() {
    const { user } = useAuth();
    const router = useRouter();
    const [notifications, setNotifications] = useState<NotificationData[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedNotification, setSelectedNotification] = useState<NotificationData | null>(null);
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

    /**
     * 알림 클릭 시 타입별 목적지 결정
     * - admin_notice / admin_message: 모달로 전체 내용 표시
     * - metadata.link 있으면: 해당 URL로 이동
     * - 구독/결제 관련: 홈으로 이동 (프로필/구독 UI 접근)
     * - 그 외: 읽음 처리만
     */
    const handleItemClick = (n: NotificationData) => {
        // 1. 관리자 공지/메시지 → 모달
        if (n.type === "admin_notice" || n.type === "admin_message") {
            setSelectedNotification(n);
            return;
        }

        // 2. metadata.link 명시돼 있으면 그쪽으로
        const link = (n.metadata as { link?: unknown })?.link;
        if (typeof link === "string" && link.length > 0) {
            setIsOpen(false);
            router.push(link);
            return;
        }

        // 3. 구독/결제 알림 → 계정 설정 모달 열고 구독 섹션으로 자동 스크롤
        //    Layout.tsx의 "구독 관리" 버튼과 동일한 이벤트 사용
        if (n.type.startsWith("subscription_") || n.type.startsWith("payment_")) {
            setIsOpen(false);
            window.dispatchEvent(
                new CustomEvent("openAccountSettings", {
                    detail: { scrollTo: "subscription-section" },
                }),
            );
            return;
        }

        // 4. 나머지는 읽음 처리만 (이미 NotificationItem에서 처리됨)
    };

    const closeModal = () => setSelectedNotification(null);

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
                                            onNavigate={handleItemClick}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* 관리자 공지/메시지 상세 모달 */}
            {selectedNotification && (
                <div
                    className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
                    onClick={closeModal}
                    role="dialog"
                    aria-modal="true"
                >
                    <div
                        className="w-full sm:max-w-md bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* 모달 헤더 */}
                        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                                {selectedNotification.type === "admin_notice" ? (
                                    <Megaphone className="w-5 h-5 text-memorial-600 flex-shrink-0" />
                                ) : (
                                    <Mail className="w-5 h-5 text-memento-500 flex-shrink-0" />
                                )}
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                            selectedNotification.type === "admin_notice"
                                                ? "bg-memorial-200 text-memorial-800 dark:bg-memorial-900/40 dark:text-memorial-200"
                                                : "bg-memento-200 text-memento-800 dark:bg-memento-900/40 dark:text-memento-200"
                                        }`}>
                                            {selectedNotification.type === "admin_notice" ? "공지" : "관리자"}
                                        </span>
                                        <span className="text-xs text-gray-400 dark:text-gray-500">
                                            {new Date(selectedNotification.created_at).toLocaleString("ko-KR", {
                                                year: "numeric",
                                                month: "2-digit",
                                                day: "2-digit",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </span>
                                    </div>
                                    <h2 className="mt-1 text-base font-bold text-gray-900 dark:text-gray-100 break-words">
                                        {selectedNotification.title}
                                    </h2>
                                </div>
                            </div>
                            <button
                                onClick={closeModal}
                                className="p-1.5 -mr-1 -mt-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0"
                                aria-label="닫기"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* 모달 본문 — 스크롤 가능 */}
                        <div className="px-5 py-4 overflow-y-auto flex-1">
                            <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap leading-relaxed break-words">
                                {selectedNotification.body}
                            </p>
                        </div>

                        {/* 모달 푸터 */}
                        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end flex-shrink-0">
                            <button
                                onClick={closeModal}
                                className="px-4 py-2 rounded-lg bg-memento-500 hover:bg-memento-600 text-white text-sm font-medium transition-colors"
                            >
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
