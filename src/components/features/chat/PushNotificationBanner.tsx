/**
 * PushNotificationBanner
 *
 * AI 펫톡 채팅 영역 상단에 표시되는 푸시 알림 구독 유도 배너
 * 조건: 로그인 + 펫 등록 + 미구독 + 대화 1회 이상 + 7일간 닫지 않음
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, X } from "lucide-react";
import {
    isPushSupported,
    getNotificationPermission,
    registerServiceWorker,
    subscribeToPush,
    getExistingSubscription,
} from "@/lib/push-notifications";
import { API } from "@/config/apiEndpoints";
import { supabase } from "@/lib/supabase";

interface PushNotificationBannerProps {
    petName: string;
    isMemorialMode: boolean;
    hasMessages: boolean;
}

const DISMISS_KEY = "push-banner-dismissed";
const DISMISS_DAYS = 7;

export default function PushNotificationBanner({
    petName,
    isMemorialMode,
    hasMessages,
}: PushNotificationBannerProps) {
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(false);

    // 배너 표시 여부 판단
    useEffect(() => {
        const checkVisibility = async () => {
            // 기본 조건 체크
            if (!hasMessages) return;
            if (!isPushSupported()) return;

            // 이미 거부됨
            const permission = getNotificationPermission();
            if (permission === "denied") return;

            // 7일간 닫기 체크
            const dismissed = localStorage.getItem(DISMISS_KEY);
            if (dismissed) {
                const dismissedAt = new Date(dismissed).getTime();
                const now = Date.now();
                if (now - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000) {
                    return;
                }
            }

            // 이미 구독 중인지 체크
            const existing = await getExistingSubscription();
            if (existing) return;

            setVisible(true);
        };

        checkVisibility();
    }, [hasMessages]);

    const handleSubscribe = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Service Worker 등록
            const registration = await registerServiceWorker();
            if (!registration) {
                setLoading(false);
                return;
            }

            // 2. 푸시 구독
            const subscription = await subscribeToPush(registration);
            if (!subscription) {
                setLoading(false);
                return;
            }

            // 3. 서버에 구독 정보 저장
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                setLoading(false);
                return;
            }

            await fetch(API.NOTIFICATIONS_SUBSCRIBE, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ subscription: subscription.toJSON() }),
            });

            setVisible(false);
        } catch {
            console.error("[Push] 구독 처리 실패");
        } finally {
            setLoading(false);
        }
    }, []);

    const handleDismiss = useCallback(() => {
        localStorage.setItem(DISMISS_KEY, new Date().toISOString());
        setVisible(false);
    }, []);

    if (!visible) return null;

    return (
        <div
            className={`mx-4 mt-2 mb-1 px-3 py-2.5 rounded-lg text-sm flex items-center justify-between gap-2 transition-colors duration-700 ${
                isMemorialMode
                    ? "bg-amber-100/90 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                    : "bg-sky-100/90 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200"
            }`}
        >
            <div className="flex items-center gap-2 flex-1 min-w-0">
                <Bell className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">
                    {petName}이(가) 매일 아침 먼저 인사해요
                </span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                    onClick={handleSubscribe}
                    disabled={loading}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        isMemorialMode
                            ? "bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                            : "bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50"
                    }`}
                >
                    {loading ? "..." : "알림 받기"}
                </button>
                <button
                    onClick={handleDismiss}
                    className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                    aria-label="닫기"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}
