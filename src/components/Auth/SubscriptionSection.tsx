/**
 * SubscriptionSection.tsx
 * 구독 관리 섹션
 */

"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { PRICING } from "@/config/constants";
import { CreditCard, Crown, AlertTriangle } from "lucide-react";
import { InlineLoading } from "@/components/ui/PawLoading";
import { toast } from "sonner";
import type { SubscriptionTier } from "@/config/constants";

interface SubscriptionSectionProps {
    userId: string;
    isPremiumUser: boolean;
    subscriptionTier: SubscriptionTier;
    premiumExpiresAt: string | null;
}

export default function SubscriptionSection({
    userId,
    isPremiumUser,
    subscriptionTier,
    premiumExpiresAt,
}: SubscriptionSectionProps) {
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);

    // 구독 해지
    const handleCancelSubscription = async () => {
        setIsCancelling(true);

        try {
            // profiles에서 프리미엄 비활성화
            const { error } = await supabase
                .from("profiles")
                .update({
                    is_premium: false,
                    subscription_tier: "free",
                })
                .eq("id", userId);

            if (error) throw error;

            setShowCancelConfirm(false);
            toast.success(
                premiumExpiresAt
                    ? `구독이 해지되었습니다. ${new Date(premiumExpiresAt).toLocaleDateString("ko-KR")}까지 기존 혜택을 이용할 수 있습니다.`
                    : "구독이 해지되었습니다."
            );

            // AuthContext 프로필 새로고침
            window.location.reload();
        } catch {
            toast.error("구독 해지에 실패했습니다. 다시 시도해주세요.");
        } finally {
            setIsCancelling(false);
        }
    };

    // Reset confirm state when parent re-opens modal
    React.useEffect(() => {
        setShowCancelConfirm(false);
    }, []);

    return (
        <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5 mb-3">
                <CreditCard className="w-4 h-4" />
                구독 관리
            </h3>

            {isPremiumUser ? (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Crown className="w-4 h-4 text-amber-500" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {subscriptionTier === "basic" ? "베이직" : "프리미엄"} 플랜
                            </span>
                        </div>
                        <span className="text-xs bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 px-2 py-0.5 rounded-full">
                            이용 중
                        </span>
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                        <p>
                            월{" "}
                            {subscriptionTier === "basic"
                                ? PRICING.BASIC_MONTHLY.toLocaleString()
                                : PRICING.PREMIUM_MONTHLY.toLocaleString()}
                            원
                        </p>
                        {premiumExpiresAt && (
                            <p>
                                다음 갱신일:{" "}
                                {new Date(premiumExpiresAt).toLocaleDateString("ko-KR", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                })}
                            </p>
                        )}
                    </div>

                    {!showCancelConfirm ? (
                        <button
                            onClick={() => setShowCancelConfirm(true)}
                            className="text-xs text-gray-400 hover:text-red-500 transition-colors underline"
                        >
                            구독 해지
                        </button>
                    ) : (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg space-y-2">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                <div className="text-xs text-red-600 dark:text-red-400">
                                    <p className="font-medium">정말 구독을 해지하시겠습니까?</p>
                                    <p className="mt-1">
                                        해지 후에도{" "}
                                        {premiumExpiresAt
                                            ? `${new Date(premiumExpiresAt).toLocaleDateString("ko-KR")}까지`
                                            : "남은 기간 동안"}{" "}
                                        기존 혜택을 이용할 수 있습니다.
                                    </p>
                                    <p className="mt-1">
                                        이후 무료 플랜으로 전환되며, 초과 데이터는 제한됩니다.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowCancelConfirm(false)}
                                    className="flex-1 h-8 text-xs"
                                >
                                    유지하기
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleCancelSubscription}
                                    disabled={isCancelling}
                                    className="flex-1 h-8 text-xs bg-red-500 hover:bg-red-600 text-white"
                                >
                                    {isCancelling ? <InlineLoading /> : "해지하기"}
                                </Button>
                            </div>
                        </div>
                    )}

                    <p className="text-[10px] text-gray-400">
                        <a href="/payment-terms" target="_blank" className="underline hover:text-memento-500">
                            결제 및 구독 약관
                        </a>
                        {" "}| 환불 문의: sharkwind1@gmail.com
                    </p>
                </div>
            ) : (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        현재 무료 플랜을 이용 중입니다.
                    </p>
                    <p className="text-[10px] text-gray-400 mt-2">
                        AI 펫톡, 반려동물 등록 등 사용 중 자연스럽게 업그레이드할 수 있습니다.
                    </p>
                </div>
            )}
        </div>
    );
}
