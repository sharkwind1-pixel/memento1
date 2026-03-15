/**
 * PushNotificationBanner
 *
 * AI 펫톡 채팅 영역 상단에 표시되는 푸시 알림 관리 배너
 * - 미구독: 시간 선택 + 알림 받기 버튼 (슬라이드 인 애니메이션)
 * - 구독 완료: 간결한 상태 바 (시간 변경 / 해제)
 */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Bell, X, Check, Clock, Settings, BellOff } from "lucide-react";
import { toast } from "sonner";
import {
    isPushSupported,
    getNotificationPermission,
    registerServiceWorker,
    subscribeToPush,
    getExistingSubscription,
    unsubscribeFromPush,
} from "@/lib/push-notifications";
import { API } from "@/config/apiEndpoints";
import { supabase } from "@/lib/supabase";
import { safeGetItem, safeSetItem, safeRemoveItem } from "@/lib/safe-storage";

interface PushNotificationBannerProps {
    petName: string;
    isMemorialMode: boolean;
}

const DISMISS_KEY = "push-banner-dismissed";
const DISMISS_DAYS = 1;

type BannerState = "loading" | "unsubscribed" | "subscribed" | "just-subscribed" | "unsupported" | "denied";

/** 시간 옵션 (KST 7시~22시) */
const HOUR_OPTIONS = Array.from({ length: 16 }, (_, i) => {
    const hour = i + 7;
    const label = hour < 12 ? `오전 ${hour}시` : hour === 12 ? `오후 12시` : `오후 ${hour - 12}시`;
    return { value: hour, label };
});

function getHourLabel(hour: number): string {
    if (hour < 12) return `오전 ${hour}시`;
    if (hour === 12) return `오후 12시`;
    return `오후 ${hour - 12}시`;
}

export default function PushNotificationBanner({
    petName,
    isMemorialMode,
}: PushNotificationBannerProps) {
    const [visible, setVisible] = useState(false);
    const [animateIn, setAnimateIn] = useState(false);
    const [bannerState, setBannerState] = useState<BannerState>("loading");
    const [actionLoading, setActionLoading] = useState(false);
    const [selectedHour, setSelectedHour] = useState(9);
    const [editingTime, setEditingTime] = useState(false);
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // 배너 표시 여부 판단 (페이지 진입 2초 후)
    useEffect(() => {
        const timer = setTimeout(async () => {
            // 푸시 미지원 브라우저 → 안내 배너만 표시
            if (!isPushSupported()) {
                const dismissed = safeGetItem(DISMISS_KEY);
                if (dismissed) {
                    const dismissedAt = new Date(dismissed).getTime();
                    if (Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000) {
                        return;
                    }
                }
                setBannerState("unsupported");
                setVisible(true);
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => setAnimateIn(true));
                });
                return;
            }

            const permission = getNotificationPermission();
            if (permission === "denied") {
                // 거부 상태에서도 설정 변경 안내 배너 표시
                const dismissed = safeGetItem(DISMISS_KEY);
                if (dismissed) {
                    const dismissedAt = new Date(dismissed).getTime();
                    if (Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000) {
                        return;
                    }
                }
                setBannerState("denied");
                setVisible(true);
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => setAnimateIn(true));
                });
                return;
            }

            const existing = await getExistingSubscription();

            if (existing) {
                // 이미 구독됨 → 구독 관리 UI 표시
                // DB에서 현재 설정된 시간 가져오기
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.access_token) {
                        const res = await fetch(API.NOTIFICATIONS_SUBSCRIBE, {
                            method: "GET",
                            headers: { Authorization: `Bearer ${session.access_token}` },
                        });
                        if (res.ok) {
                            const data = await res.json();
                            if (data.preferredHour !== undefined) {
                                setSelectedHour(data.preferredHour);
                            }
                        }
                    }
                } catch {
                    // 시간 조회 실패해도 기본값 9시로 표시
                }
                setBannerState("subscribed");
            } else {
                // 미구독 → dismiss 체크
                const dismissed = safeGetItem(DISMISS_KEY);
                if (dismissed) {
                    const dismissedAt = new Date(dismissed).getTime();
                    if (Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000) {
                        return;
                    }
                }
                setBannerState("unsubscribed");
            }

            setVisible(true);
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

    /** 신규 구독 */
    const handleSubscribe = useCallback(async () => {
        setActionLoading(true);
        try {
            const registration = await registerServiceWorker();
            if (!registration) {
                toast.error("알림을 지원하지 않는 브라우저입니다");
                setActionLoading(false);
                return;
            }

            const subscription = await subscribeToPush(registration);
            if (!subscription) {
                // 거부됨 → denied 배너로 전환 (설정 변경 안내)
                if (getNotificationPermission() === "denied") {
                    setBannerState("denied");
                } else {
                    setAnimateIn(false);
                    setTimeout(() => setVisible(false), 300);
                }
                setActionLoading(false);
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                setActionLoading(false);
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
                setActionLoading(false);
                return;
            }

            setBannerState("just-subscribed");
            toast.success(`매일 ${getHourLabel(selectedHour)}에 ${petName}이(가) 인사할게요`);

            // 3초 후 구독 관리 UI로 전환
            hideTimerRef.current = setTimeout(() => {
                setBannerState("subscribed");
            }, 3000);
        } catch {
            toast.error("알림 설정 중 오류가 발생했습니다");
        } finally {
            setActionLoading(false);
        }
    }, [selectedHour, petName]);

    /** 시간 변경 */
    const handleTimeChange = useCallback(async (newHour: number) => {
        setActionLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                setActionLoading(false);
                return;
            }

            const res = await fetch(API.NOTIFICATIONS_SUBSCRIBE, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ preferredHour: newHour }),
            });

            if (!res.ok) {
                toast.error("시간 변경에 실패했습니다");
                setActionLoading(false);
                return;
            }

            setSelectedHour(newHour);
            setEditingTime(false);
            toast.success(`알림 시간이 ${getHourLabel(newHour)}으로 변경되었습니다`);
        } catch {
            toast.error("시간 변경 중 오류가 발생했습니다");
        } finally {
            setActionLoading(false);
        }
    }, []);

    /** 구독 해제 */
    const handleUnsubscribe = useCallback(async () => {
        setActionLoading(true);
        try {
            const existing = await getExistingSubscription();
            const endpoint = existing?.endpoint;

            // 브라우저 구독 해제
            await unsubscribeFromPush();

            // DB에서도 삭제
            if (endpoint) {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.access_token) {
                    await fetch(API.NOTIFICATIONS_SUBSCRIBE, {
                        method: "DELETE",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${session.access_token}`,
                        },
                        body: JSON.stringify({ endpoint }),
                    });
                }
            }

            // dismiss 기록 클리어 (해제 후 다시 구독 유도 배너 보이도록)
            safeRemoveItem(DISMISS_KEY);
            setBannerState("unsubscribed");
            setEditingTime(false);
            toast.success("알림이 해제되었습니다");
        } catch {
            toast.error("알림 해제 중 오류가 발생했습니다");
        } finally {
            setActionLoading(false);
        }
    }, []);

    const handleDismiss = useCallback(() => {
        safeSetItem(DISMISS_KEY, new Date().toISOString());
        setAnimateIn(false);
        setTimeout(() => setVisible(false), 300);
    }, []);

    if (!visible || bannerState === "loading") return null;

    const themeClasses = isMemorialMode
        ? "bg-gradient-to-r from-amber-50 to-amber-100/80 border-amber-300 text-amber-900 dark:from-gray-800/60 dark:to-gray-800/40 dark:border-amber-700/50 dark:text-amber-100"
        : "bg-gradient-to-r from-sky-50 to-sky-100/80 border-sky-300 text-sky-900 dark:from-sky-950/60 dark:to-sky-900/40 dark:border-sky-700 dark:text-sky-100";

    const accentBg = isMemorialMode
        ? "bg-amber-200/60 dark:bg-gray-600/60"
        : "bg-sky-200/60 dark:bg-sky-800/60";

    const iconBg = isMemorialMode
        ? "bg-amber-200 dark:bg-gray-600"
        : "bg-sky-200 dark:bg-sky-800";

    const successIconBg = isMemorialMode
        ? "bg-amber-500 text-white"
        : "bg-sky-500 text-white";

    const btnClasses = isMemorialMode
        ? "bg-amber-600 text-white hover:bg-amber-700 active:scale-[0.98] disabled:opacity-50"
        : "bg-sky-600 text-white hover:bg-sky-700 active:scale-[0.98] disabled:opacity-50";

    const subTextColor = isMemorialMode
        ? "text-amber-700 dark:text-amber-300"
        : "text-sky-700 dark:text-sky-300";

    return (
        <div
            className={`mx-4 mt-2 mb-1 rounded-xl text-sm overflow-hidden transition-all duration-300 ease-out ${
                animateIn
                    ? "opacity-100 translate-y-0 max-h-40"
                    : "opacity-0 -translate-y-3 max-h-0"
            }`}
        >
            <div className={`px-3.5 py-3 border-2 rounded-xl shadow-sm ${themeClasses}`}>

                {/* 방금 구독 완료 (3초간 표시) */}
                {bannerState === "just-subscribed" && (
                    <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${successIconBg}`}>
                            <Check className="w-4 h-4" />
                        </div>
                        <span className="font-medium">
                            알림이 설정되었습니다
                        </span>
                    </div>
                )}

                {/* 구독 관리 상태 (간결한 바) */}
                {bannerState === "subscribed" && (
                    <>
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Bell className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="text-xs font-medium truncate">
                                    매일 {getHourLabel(selectedHour)} 알림
                                </span>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                    onClick={() => setEditingTime(!editingTime)}
                                    disabled={actionLoading}
                                    className="p-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                    aria-label="시간 변경"
                                    title="알림 시간 변경"
                                >
                                    <Settings className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={handleUnsubscribe}
                                    disabled={actionLoading}
                                    className="p-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                    aria-label="알림 해제"
                                    title="알림 해제"
                                >
                                    <BellOff className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* 시간 변경 드롭다운 (토글) */}
                        {editingTime && (
                            <div className="flex items-center gap-2 mt-2">
                                <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs flex-shrink-0 ${accentBg}`}>
                                    <Clock className="w-3 h-3" />
                                    <select
                                        value={selectedHour}
                                        onChange={(e) => handleTimeChange(Number(e.target.value))}
                                        disabled={actionLoading}
                                        className="bg-transparent text-xs font-medium outline-none cursor-pointer appearance-none pr-1"
                                    >
                                        {HOUR_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <span className={`text-xs ${subTextColor}`}>
                                    {actionLoading ? "변경 중..." : "시간을 선택하세요"}
                                </span>
                            </div>
                        )}
                    </>
                )}

                {/* 미구독 상태 (구독 유도) */}
                {bannerState === "unsubscribed" && (
                    <>
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 animate-wiggle ${iconBg}`}>
                                    <Bell className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-medium text-sm truncate">
                                        {petName}이(가) 매일 먼저 인사해요
                                    </p>
                                    <p className={`text-xs mt-0.5 ${subTextColor}`}>
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
                            <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs flex-shrink-0 ${accentBg}`}>
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
                                disabled={actionLoading}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${btnClasses}`}
                            >
                                {actionLoading ? "설정 중..." : "알림 받기"}
                            </button>
                        </div>
                    </>
                )}

                {/* 알림 거부됨 → 설정 변경 안내 */}
                {bannerState === "denied" && (
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                                <BellOff className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                                <p className="font-medium text-sm truncate">
                                    알림이 차단된 상태예요
                                </p>
                                <p className={`text-xs mt-0.5 ${subTextColor}`}>
                                    {typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent)
                                        ? "설정 > Safari > 알림에서 허용해주세요"
                                        : "주소창 왼쪽 자물쇠 > 알림 > 허용으로 변경해주세요"}
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
                )}

                {/* 미지원 브라우저 안내 */}
                {bannerState === "unsupported" && (
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                                <Bell className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                                <p className="font-medium text-sm truncate">
                                    {petName}이(가) 매일 먼저 인사해요
                                </p>
                                <p className={`text-xs mt-0.5 ${subTextColor}`}>
                                    Chrome 또는 Safari에서 알림을 받을 수 있어요
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
                )}

            </div>
        </div>
    );
}
