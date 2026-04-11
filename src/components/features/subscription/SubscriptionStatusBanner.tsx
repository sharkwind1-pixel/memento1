/**
 * SubscriptionStatusBanner.tsx
 * 구독 라이프사이클 상태 배너
 *
 * 새 설계 (2026-04-11):
 * - cancelled: 따뜻한 안내 (만료일까지 이용 가능, 닫기 가능)
 * - archived (D-11~): 무료 전환됨 + 재구독 유도 (닫기 가능)
 * - archived 카운트다운 (D-10~D-4): 강한 경고 (닫기 가능)
 * - archived 카운트다운 (D-3~D-1): Sticky (닫기 불가, 영구 삭제 임박)
 *
 * 설계: docs/subscription-lifecycle.md
 */

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, AlertTriangle, Heart, Archive } from "lucide-react";
import { useSubscriptionPhase } from "@/hooks/useSubscriptionPhase";
import { safeGetItem, safeSetItem } from "@/lib/safe-storage";

const DISMISS_KEY_PREFIX = "memento-sub-banner-dismiss-";

export default function SubscriptionStatusBanner() {
    const phaseInfo = useSubscriptionPhase();
    const router = useRouter();
    const [isDismissed, setIsDismissed] = useState(false);

    // localStorage 기반 닫기 상태 (날짜별 + 단계별)
    useEffect(() => {
        if (!phaseInfo.isLifecycleActive) return;
        const today = new Date().toISOString().slice(0, 10);
        const key = `${DISMISS_KEY_PREFIX}${phaseInfo.phase}-${phaseInfo.daysUntilPurge ?? "none"}`;
        const dismissedDate = safeGetItem(key);
        setIsDismissed(dismissedDate === today);
    }, [phaseInfo.phase, phaseInfo.isLifecycleActive, phaseInfo.daysUntilPurge]);

    if (!phaseInfo.isLifecycleActive) return null;

    // Sticky 단계 (D-3 ~ D-1)는 닫기 불가
    const isSticky = phaseInfo.isCritical;

    if (isDismissed && !isSticky) return null;

    const handleDismiss = () => {
        const today = new Date().toISOString().slice(0, 10);
        const key = `${DISMISS_KEY_PREFIX}${phaseInfo.phase}-${phaseInfo.daysUntilPurge ?? "none"}`;
        safeSetItem(key, today);
        setIsDismissed(true);
    };

    const handleResubscribe = () => {
        router.push("/?tab=home");
        // TODO: 전용 재구독 모달
    };

    // 단계별 컨텐츠
    let bgClass = "";
    let icon = <Heart className="w-4 h-4" />;
    let title = "";
    let description = "";

    if (phaseInfo.isCancelled) {
        // 해지했지만 아직 유료 혜택 중
        const days = phaseInfo.daysUntilExpiry ?? 0;
        bgClass = "bg-memento-100 dark:bg-memento-900/40 border-memento-300 dark:border-memento-700 text-memento-700 dark:text-memento-200";
        icon = <Heart className="w-4 h-4 flex-shrink-0" />;
        title = "구독이 해지되었습니다";
        description = `결제 기간 종료까지 ${days}일 남음 — 그 후 무료 회원으로 전환됩니다. 언제든 재구독할 수 있어요.`;
    } else if (phaseInfo.isArchived) {
        const days = phaseInfo.daysUntilPurge ?? 0;
        if (days <= 1 && days > 0) {
            bgClass = "bg-red-100 dark:bg-red-900/40 border-red-400 dark:border-red-700 text-red-800 dark:text-red-200";
            icon = <AlertTriangle className="w-4 h-4 flex-shrink-0" />;
            title = "내일 데이터가 영구 삭제됩니다";
            description = "내일 자정에 보관 중인 반려동물과 사진이 영구 삭제됩니다. 마지막 기회예요.";
        } else if (days <= 3 && days > 0) {
            bgClass = "bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300";
            icon = <AlertTriangle className="w-4 h-4 flex-shrink-0" />;
            title = `${days}일 후 영구 삭제됩니다`;
            description = "재구독하면 보관 중인 데이터를 모두 복구할 수 있어요.";
        } else if (days <= 10 && days > 0) {
            bgClass = "bg-memorial-100 dark:bg-memorial-900/40 border-memorial-400 dark:border-memorial-700 text-memorial-800 dark:text-memorial-200";
            icon = <AlertTriangle className="w-4 h-4 flex-shrink-0" />;
            title = `${days}일 후 보관 데이터가 정리됩니다`;
            description = "재구독하면 모두 지킬 수 있어요.";
        } else {
            // D-11 ~ D-40
            bgClass = "bg-memento-100 dark:bg-memento-900/40 border-memento-300 dark:border-memento-700 text-memento-700 dark:text-memento-200";
            icon = <Archive className="w-4 h-4 flex-shrink-0" />;
            title = "무료 회원으로 전환되었어요";
            description = `보관된 데이터는 ${days}일 후 영구 삭제됩니다. 재구독하면 모두 복구됩니다.`;
        }
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
