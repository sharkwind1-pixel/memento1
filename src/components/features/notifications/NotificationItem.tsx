/**
 * NotificationItem — 알림 패널 내 개별 알림 행
 */

"use client";

import React from "react";
import {
    Bell,
    AlertTriangle,
    CreditCard,
    CheckCircle,
    Heart,
    Megaphone,
    Mail,
} from "lucide-react";

export interface NotificationData {
    id: string;
    type: string;
    title: string;
    body: string;
    metadata: Record<string, unknown>;
    read_at: string | null;
    created_at: string;
}

/** 상대 시간 표시 */
function getRelativeTime(dateStr: string): string {
    const now = Date.now();
    const diff = now - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "방금";
    if (minutes < 60) return `${minutes}분 전`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}일 전`;
    return `${Math.floor(days / 30)}개월 전`;
}

/** 타입별 아이콘 */
function TypeIcon({ type }: { type: string }) {
    const cls = "w-5 h-5 flex-shrink-0";
    switch (type) {
        case "subscription_expiring":
        case "subscription_archive_countdown":
        case "subscription_countdown":
            return <AlertTriangle className={`${cls} text-memorial-500`} />;
        case "subscription_expired":
        case "subscription_archive_complete":
            return <AlertTriangle className={`${cls} text-red-500`} />;
        case "payment_failed":
            return <CreditCard className={`${cls} text-red-500`} />;
        case "payment_success":
        case "subscription_restored":
            return <CheckCircle className={`${cls} text-green-500`} />;
        case "welcome":
            return <Heart className={`${cls} text-pink-500`} />;
        case "admin_notice":
            return <Megaphone className={`${cls} text-memorial-600`} />;
        case "admin_message":
            return <Mail className={`${cls} text-memento-500`} />;
        default:
            return <Bell className={`${cls} text-gray-500`} />;
    }
}

interface Props {
    notification: NotificationData;
    onMarkRead: (id: string) => void;
}

export default function NotificationItem({ notification, onMarkRead }: Props) {
    const isUnread = !notification.read_at;
    const isAdminMsg = notification.type === "admin_message" || notification.type === "admin_notice";
    const isNotice = notification.type === "admin_notice";

    return (
        <button
            onClick={() => isUnread && onMarkRead(notification.id)}
            className={`w-full text-left px-4 py-3 flex gap-3 transition-colors ${
                isAdminMsg && isUnread
                    ? "bg-memorial-50 dark:bg-memorial-900/20 hover:bg-memorial-100 dark:hover:bg-memorial-900/30"
                    : isUnread
                        ? "bg-memento-50/50 dark:bg-gray-700/50 hover:bg-memento-50 dark:hover:bg-gray-700"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
        >
            <div className="pt-0.5">
                <TypeIcon type={notification.type} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                    <p className={`text-sm leading-snug ${
                        isUnread
                            ? "font-semibold text-gray-900 dark:text-gray-100"
                            : "font-medium text-gray-600 dark:text-gray-400"
                    }`}>
                        {isNotice && (
                            <span className="inline-block mr-1.5 px-1.5 py-0.5 rounded bg-memorial-200 text-memorial-800 dark:bg-memorial-900/40 dark:text-memorial-200 text-[10px] font-bold align-middle">
                                공지
                            </span>
                        )}
                        {notification.type === "admin_message" && (
                            <span className="inline-block mr-1.5 px-1.5 py-0.5 rounded bg-memento-200 text-memento-800 dark:bg-memento-900/40 dark:text-memento-200 text-[10px] font-bold align-middle">
                                관리자
                            </span>
                        )}
                        {notification.title}
                    </p>
                    {isUnread && (
                        <span className="mt-1.5 w-2 h-2 rounded-full bg-memento-500 flex-shrink-0" />
                    )}
                </div>
                <p className={`text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed whitespace-pre-wrap ${
                    isAdminMsg ? "" : "line-clamp-2"
                }`}>
                    {notification.body}
                </p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                    {getRelativeTime(notification.created_at)}
                </p>
            </div>
        </button>
    );
}
