/**
 * SubscriptionStatusBanner.tsx
 * 구독 라이프사이클 배너
 *
 * 단계별 톤:
 * - readonly: 부드러운 안내, 닫기 가능
 * - hidden: 경고 안내, 닫기 가능
 * - countdown D-10~D-4: 강한 경고, 닫기 가능
 * - countdown D-3~D-1: Sticky (닫기 불가)
 * - free: 회귀 안내 (1회 표시 후 자동 닫힘)
 *
 * 설계: docs/subscription-lifecycle.md
 */

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, AlertTriangle, Lock, Heart } from "lucide-react";
import { useSubscriptionPhase } from "@/hooks/useSubscriptionPhase";
import { safeGetItem, safeSetItem } from "@/lib/safe-storage";

const DISMISS_KEY_PREFIX = "memento-sub-banner-dismiss-";

export default function SubscriptionStatusBanner() {
    const phaseInfo = useSubscriptionPhase();
    const router = useRouter();
    const [isDismissed, setIsDismissed] = useState(false);

    // localStorage 기반 닫기 상태 (날짜별)
    useEffect(() => {
        if (!phaseInfo.isLifecycleActive) return;
        const today = new Date().toISOString().slice(0, 10);
        const dismissedDate = safeGetItem(`${DISMISS_KEY_PREFIX}${phaseInfo.phase}`);
        setIsDismissed(dismissedDate === today);
    }, [phaseInfo.phase, phaseInfo.isLifecycleActive]);

    if (!phaseInfo.isLifecycleActive) return null;

    // Sticky 단계 (D-3 ~ D-1)는 닫기 불가
    const isSticky = phaseInfo.isCountdown
        && phaseInfo.daysUntilReset !== null
        && phaseInfo.daysUntilReset <= 3
        && phaseInfo.daysUntilReset >= 1;

    if (isDismissed && !isSticky) return null;

    const handleDismiss = () => {
        const today = new Date().toISOString().slice(0, 10);
        safeSetItem(`${DISMISS_KEY_PREFIX}${phaseInfo.phase}`, today);
        setIsDismissed(true);
    };

    const handleResubscribe = () => {
        // 재구독 = 프리미엄 모달 열기 (현재는 / 로 이동)
        router.push("/?tab=home");
        // TODO Phase 8: 전용 재구독 모달
    };

    // 단계별 컨텐츠
    let bgClass = "";
    let icon = <Heart className="w-4 h-4" />;
    let title = "";
    let description = "";

    if (phaseInfo.phase === "readonly") {
        bgClass = "bg-memento-100 dark:bg-memento-900/40 border-memento-300 dark:border-memento-700 text-memento-700 dark:text-memento-200";
        icon = <Lock className="w-4 h-4 flex-shrink-0" />;
        title = "읽기 전용 모드";
        description = `소중한 추억은 그대로 보관 중이에요. ${phaseInfo.daysUntilNextPhase ?? 30}일 남음`;
    } else if (phaseInfo.phase === "hidden") {
        bgClass = "bg-memorial-100 dark:bg-memorial-900/40 border-memorial-300 dark:border-memorial-700 text-memorial-800 dark:text-memorial-200";
        icon = <Lock className="w-4 h-4 flex-shrink-0" />;
        title = "데이터가 보관 중입니다";
        description = `${phaseInfo.daysUntilNextPhase ?? 50}일 후 일부 데이터가 정리됩니다. 재구독하면 즉시 복구됩니다.`;
    } else if (phaseInfo.phase === "countdown") {
        const days = phaseInfo.daysUntilReset ?? 0;
        if (days <= 1) {
            bgClass = "bg-red-100 dark:bg-red-900/40 border-red-400 dark:border-red-700 text-red-800 dark:text-red-200";
            title = "내일 데이터가 정리됩니다";
            description = "내일 자정에 무료 한도 초과 데이터가 영구 정리됩니다. 마지막 기회예요.";
        } else if (days <= 3) {
            bgClass = "bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300";
            title = `${days}일 남았어요`;
            description = "재구독하면 모든 데이터를 그대로 지킬 수 있어요.";
        } else {
            bgClass = "bg-memorial-100 dark:bg-memorial-900/40 border-memorial-400 dark:border-memorial-700 text-memorial-800 dark:text-memorial-200";
            title = `${days}일 후 데이터가 정리됩니다`;
            description = "재구독하면 모두 지킬 수 있어요.";
        }
        icon = <AlertTriangle className="w-4 h-4 flex-shrink-0" />;
    } else if (phaseInfo.phase === "free") {
        bgClass = "bg-memento-100 dark:bg-memento-900/40 border-memento-300 dark:border-memento-700 text-memento-700 dark:text-memento-200";
        icon = <Heart className="w-4 h-4 flex-shrink-0" />;
        title = "무료 플랜으로 돌아오셨어요";
        description = "재구독하면 보관된 데이터를 모두 복구할 수 있어요.";
    }

    return (
        <div
            className={`w-full border-b ${bgClass} transition-colors`}
            role="status"
            aria-live="polite"
        >
            <div className="max-w-screen-xl mx-auto px-4 py-2.5 flex items-center gap-3">
                {icon}
                <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold leading-tight">{title}</p>
                    <p className="text-[11px] sm:text-xs leading-tight opacity-90 mt-0.5">{description}</p>
                </div>
                <button
                    type="button"
                    onClick={handleResubscribe}
                    className="flex-shrink-0 px-3 py-1.5 text-[11px] sm:text-xs font-medium rounded-md bg-white/90 hover:bg-white text-gray-800 shadow-sm transition-all"
                >
                    재구독
                </button>
                {!isSticky && (
                    <button
                        type="button"
                        onClick={handleDismiss}
                        className="flex-shrink-0 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                        aria-label="닫기"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
}
