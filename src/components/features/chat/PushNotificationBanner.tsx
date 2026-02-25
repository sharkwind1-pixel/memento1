/**
 * PushNotificationBanner
 *
 * AI 펫톡 채팅 영역 상단에 표시되는 푸시 알림 구독 유도 배너
 * - 슬라이드 인 애니메이션 + 보더 강조로 눈에 띄게
 * - 시간 선택 드롭다운 (7시~22시)
 * - 구독 성공 시 체크 표시 + 토스트 + 3초 후 자동 닫힘
 */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Bell, X, Check, Clock } from "lucide-react";
import { toast } from "sonner";
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
}

const DISMISS_KEY = "push-banner-dismissed";
const DISMISS_DAYS = 7;

/** 시간 옵션 (KST 7시~22시) */
const HOUR_OPTIONS = Array.from({ length: 16 }, (_, i) => {
    const hour = i + 7;
    const label = hour < 12 ? `오전 ${hour}시` : hour === 12 ? `오후 12시` : `오후 ${hour - 12}시`;
    return { value: hour, label };
});

export default function PushNotificationBanner({
    petName,
    isMemorialMode,
}: PushNotificationBannerProps) {
    const [visible, setVisible] = useState(false);
    const [animateIn, setAnimateIn] = useState(false);
    const [loading, setLoading] = useState(false);
    const [subscribed, setSubscribed] = useState(false);
    const [selectedHour, setSelectedHour] = useState(9);
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // 배너 표시 여부 판단 (페이지 진입 2초 후)
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!isPushSupported()) return;

            const permission = getNotificationPermission();
            if (permission === "denied") return;

            const dismissed = localStorage.getItem(DISMISS_KEY);
            if (dismissed) {
                const dismissedAt = new Date(dismissed).getTime();
                if (Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000) {
                    return;
                }
            }

            const existing = await getExistingSubscription();
            if (existing) return;

            setVisible(true);
            // 약간의 딜레이 후 애니메이션 시작 (mount 후 transition 적용)
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setAnimateIn(true);
                });
            });
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    // cleanup
    useEffect(() => {
        return () => {
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        };
    }, []);

    const handleSubscribe = useCallback(async () => {
        setLoading(true);
        try {
            const registration = await registerServiceWorker();
            if (!registration) {
                toast.error("알림을 지원하지 않는 브라우저입니다");
                setLoading(false);
                return;
            }

            const subscription = await subscribeToPush(registration);
            if (!subscription) {
                toast.error("알림 권한이 거부되었습니다. 브라우저 설정에서 변경해주세요.");
                setLoading(false);
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                setLoading(false);
                return;
            }

            const res = await fetch(API.NOTIFICATIONS_SUBSCRIBE, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    subscription: subscription.toJSON(),
                    preferredHour: selectedHour,
                }),
            });

            if (!res.ok) {
                toast.error("알림 설정에 실패했습니다. 다시 시도해주세요.");
                setLoading(false);
                return;
            }

            // 성공 상태로 전환
            setSubscribed(true);
            const hourLabel = selectedHour < 12
                ? `오전 ${selectedHour}시`
                : selectedHour === 12
                    ? `오후 12시`
                    : `오후 ${selectedHour - 12}시`;
            toast.success(`매일 ${hourLabel}에 ${petName}이(가) 인사할게요`);

            // 3초 후 배너 닫기
            hideTimerRef.current = setTimeout(() => {
                setAnimateIn(false);
                setTimeout(() => setVisible(false), 300);
            }, 3000);
        } catch {
            toast.error("알림 설정 중 오류가 발생했습니다");
        } finally {
            setLoading(false);
        }
    }, [selectedHour, petName]);

    const handleDismiss = useCallback(() => {
        localStorage.setItem(DISMISS_KEY, new Date().toISOString());
        setAnimateIn(false);
        setTimeout(() => setVisible(false), 300);
    }, []);

    if (!visible) return null;

    return (
        <div
            className={`mx-4 mt-2 mb-1 rounded-xl text-sm overflow-hidden transition-all duration-300 ease-out ${
                animateIn
                    ? "opacity-100 translate-y-0 max-h-40"
                    : "opacity-0 -translate-y-3 max-h-0"
            }`}
        >
            <div
                className={`px-3.5 py-3 border-2 rounded-xl shadow-sm ${
                    isMemorialMode
                        ? "bg-gradient-to-r from-amber-50 to-amber-100/80 border-amber-300 text-amber-900 dark:from-amber-950/60 dark:to-amber-900/40 dark:border-amber-700 dark:text-amber-100"
                        : "bg-gradient-to-r from-sky-50 to-sky-100/80 border-sky-300 text-sky-900 dark:from-sky-950/60 dark:to-sky-900/40 dark:border-sky-700 dark:text-sky-100"
                }`}
            >
                {subscribed ? (
                    /* 구독 완료 상태 */
                    <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isMemorialMode
                                ? "bg-amber-500 text-white"
                                : "bg-sky-500 text-white"
                        }`}>
                            <Check className="w-4 h-4" />
                        </div>
                        <span className="font-medium">
                            알림이 설정되었습니다
                        </span>
                    </div>
                ) : (
                    /* 구독 유도 상태 */
                    <>
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 animate-wiggle ${
                                    isMemorialMode
                                        ? "bg-amber-200 dark:bg-amber-800"
                                        : "bg-sky-200 dark:bg-sky-800"
                                }`}>
                                    <Bell className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-medium text-sm truncate">
                                        {petName}이(가) 매일 먼저 인사해요
                                    </p>
                                    <p className={`text-xs mt-0.5 ${
                                        isMemorialMode
                                            ? "text-amber-700 dark:text-amber-300"
                                            : "text-sky-700 dark:text-sky-300"
                                    }`}>
                                        원하는 시간에 AI 펫톡 알림을 받아보세요
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleDismiss}
                                className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex-shrink-0"
                                aria-label="닫기"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* 시간 선택 + 버튼 */}
                        <div className="flex items-center gap-2 mt-2.5">
                            <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs flex-shrink-0 ${
                                isMemorialMode
                                    ? "bg-amber-200/60 dark:bg-amber-800/60"
                                    : "bg-sky-200/60 dark:bg-sky-800/60"
                            }`}>
                                <Clock className="w-3 h-3" />
                                <select
                                    value={selectedHour}
                                    onChange={(e) => setSelectedHour(Number(e.target.value))}
                                    className="bg-transparent text-xs font-medium outline-none cursor-pointer appearance-none pr-1"
                                >
                                    {HOUR_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={handleSubscribe}
                                disabled={loading}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    isMemorialMode
                                        ? "bg-amber-600 text-white hover:bg-amber-700 active:scale-[0.98] disabled:opacity-50"
                                        : "bg-sky-600 text-white hover:bg-sky-700 active:scale-[0.98] disabled:opacity-50"
                                }`}
                            >
                                {loading ? "설정 중..." : "알림 받기"}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
