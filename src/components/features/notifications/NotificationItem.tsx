/**
 * NotificationItem.tsx
 * 개별 알림 행 — 타입별 아이콘 + 읽지 않음 표시 + 상대 시간
 */

"use client";

import {
    Bell,
    AlertTriangle,
    CreditCard,
    CheckCircle,
    Users,
    MessageSquare,
    Megaphone,
} from "lucide-react";
import type { AppNotification, NotificationType } from "@/types";

interface NotificationItemProps {
    notification: AppNotification;
    onClick?: () => void;
}

function getIcon(type: NotificationType) {
    switch (type) {
        case "payment_failed":
        case "subscription_expired":
        case "subscription_archive_started":
        case "subscription_archive_countdown":
        case "subscription_archive_complete":
            return <AlertTriangle className="w-4 h-4 text-amber-500" />;
        case "payment_success":
        case "subscription_restored":
            return <CheckCircle className="w-4 h-4 text-green-500" />;
        case "subscription_expiring":
        case "subscription_cancelled":
        case "subscription_hidden_start":
        case "subscription_countdown":
        case "subscription_reset_complete":
            return <CreditCard className="w-4 h-4 text-memento-500" />;
        case "welcome":
            return <Users className="w-4 h-4 text-memento-400" />;
        case "admin_message":
            return <MessageSquare className="w-4 h-4 text-blue-500" />;
        case "admin_notice":
            return <Megaphone className="w-4 h-4 text-purple-500" />;
        default:
            return <Bell className="w-4 h-4 text-gray-400" />;
    }
}

function relativeTime(isoString: string): string {
    const now = Date.now();
    const then = new Date(isoString).getTime();
    const diff = now - then;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "방금";
    if (minutes < 60) return `${minutes}분 전`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}일 전`;
    const months = Math.floor(days / 30);
    return `${months}개월 전`;
}

export default function NotificationItem({ notification, onClick }: NotificationItemProps) {
    const isUnread = !notification.readAt;

    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-full text-left px-4 py-3 flex gap-3 items-start transition-colors ${
                isUnread
                    ? "bg-memento-50/50 dark:bg-memento-900/10 hover:bg-memento-50 dark:hover:bg-memento-900/20"
                    : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
            }`}
        >
            <div className="flex-shrink-0 mt-0.5">
                {getIcon(notification.type)}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    {isUnread && (
                        <span className="w-1.5 h-1.5 rounded-full bg-memento-500 flex-shrink-0" />
                    )}
                    <p className={`text-sm truncate ${
                        isUnread
                            ? "font-semibold text-gray-900 dark:text-white"
                            : "font-medium text-gray-700 dark:text-gray-300"
                    }`}>
                        {notification.title}
                    </p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                    {notification.body}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                    {relativeTime(notification.createdAt)}
                </p>
            </div>
        </button>
    );
}
