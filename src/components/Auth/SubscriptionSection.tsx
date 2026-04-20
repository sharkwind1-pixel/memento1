/**
 * SubscriptionSection.tsx
 * 구독 관리 섹션
 */

"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { PRICING } from "@/config/constants";
import { CreditCard, Crown, AlertTriangle, Heart } from "lucide-react";
import { InlineLoading } from "@/components/ui/PawLoading";
import { toast } from "sonner";
import type { SubscriptionTier } from "@/config/constants";
import { useSubscriptionPhase } from "@/hooks/useSubscriptionPhase";
import { usePets } from "@/contexts/PetContext";
import { supabase } from "@/lib/supabase";

/**
 * getAuthUser(@/lib/supabase-server)가 쿠키가 아니라
 * Authorization 헤더의 Bearer 토큰으로 인증하기 때문에
 * 모든 fetch에 access_token 헤더 필수.
 * 세션 없으면 빈 토큰 반환 → 서버가 401 처리.
 */
async function authHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || "";
    return {
        ...(extra || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

interface SubscriptionSectionProps {
    userId: string;
    isPremiumUser: boolean;
    subscriptionTier: SubscriptionTier;
    premiumExpiresAt: string | null;
}

export default function SubscriptionSection({
    isPremiumUser,
    subscriptionTier,
    premiumExpiresAt,
}: SubscriptionSectionProps) {
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const phaseInfo = useSubscriptionPhase();
    const { pets } = usePets();
    const [savingProtectedPet, setSavingProtectedPet] = useState(false);
    const [protectedPetId, setProtectedPetId] = useState<string | null>(null);

    // 본인 펫 중 archive 안 된 것만 (대표 지정 가능 후보)
    const eligiblePets = React.useMemo(
        () => pets.filter((p) => !("archived_at" in p) || !p.archived_at),
        [pets]
    );

    const handleProtectedPetChange = async (petId: string) => {
        if (!petId) return;
        setSavingProtectedPet(true);
        try {
            const res = await fetch("/api/subscription/protected-pet", {
                method: "POST",
                headers: await authHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({ petId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "지정 실패");
            setProtectedPetId(petId);
            toast.success("대표 반려동물이 지정되었습니다");
        } catch (e) {
            const msg = e instanceof Error ? e.message : "지정 실패";
            toast.error(msg);
        } finally {
            setSavingProtectedPet(false);
        }
    };

    // 구독 해지 — premium_expires_at까지 유료 혜택 그대로, 이후 무료 회원으로 전환
    const handleCancelSubscription = async () => {
        setIsCancelling(true);

        try {
            const res = await fetch("/api/subscription/cancel", {
                method: "POST",
                headers: await authHeaders(),
            });
            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || "구독 해지에 실패했습니다");
            }

            setShowCancelConfirm(false);
            toast.success(
                premiumExpiresAt
                    ? `구독이 해지되었습니다. ${new Date(premiumExpiresAt).toLocaleDateString("ko-KR")}까지 기존 혜택을 이용할 수 있어요.`
                    : "구독이 해지되었습니다."
            );

            // AuthContext 프로필 새로고침
            window.location.reload();
        } catch (e) {
            const msg = e instanceof Error ? e.message : "구독 해지에 실패했습니다";
            toast.error(msg);
        } finally {
            setIsCancelling(false);
        }
    };

    // Reset confirm state when parent re-opens modal
    React.useEffect(() => {
        setShowCancelConfirm(false);
    }, []);

    return (
        <div id="subscription-section" className="scroll-mt-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5 mb-3">
                <CreditCard className="w-4 h-4" />
                구독 관리
            </h3>

            {isPremiumUser ? (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Crown className="w-4 h-4 text-memorial-500" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {subscriptionTier === "basic" ? "베이직" : "프리미엄"} 플랜
                            </span>
                        </div>
                        <span className="text-xs bg-memento-200 text-memento-700 dark:bg-memento-900/30 dark:text-memento-300 px-2 py-0.5 rounded-full">
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
                        <Button
                            onClick={() => setShowCancelConfirm(true)}
                            variant="outline"
                            size="sm"
                            className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                            구독 해지하기
                        </Button>
                    ) : (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg space-y-2">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                <div className="text-xs text-red-600 dark:text-red-400">
                                    <p className="font-medium">정말 구독을 해지하시겠습니까?</p>
                                    <p className="mt-1">
                                        {premiumExpiresAt
                                            ? `${new Date(premiumExpiresAt).toLocaleDateString("ko-KR")}까지 기존 유료 혜택을 이용할 수 있어요.`
                                            : "결제 만료일까지 기존 유료 혜택을 이용할 수 있어요."}
                                    </p>
                                    <p className="mt-1">이후 자동으로 무료 회원으로 전환됩니다:</p>
                                    <ul className="mt-1 ml-3 list-disc space-y-0.5">
                                        <li>대표 반려동물 1마리 + 사진 50장 유지</li>
                                        <li>초과 데이터는 40일간 보관 (재구독 시 복구)</li>
                                        <li>40일 후 초과 데이터 영구 삭제</li>
                                    </ul>
                                    <p className="mt-1">
                                        40일 이내 재구독하면 모든 데이터가 즉시 복구됩니다.
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

            {/* 라이프사이클 진행 중일 때만 대표 펫 지정 UI */}
            {phaseInfo.isLifecycleActive && eligiblePets.length > 0 && (
                <div className="mt-4 bg-memorial-50 dark:bg-memorial-900/20 border border-memorial-200 dark:border-memorial-800 rounded-xl p-4">
                    <div className="flex items-start gap-2 mb-3">
                        <Heart className="w-4 h-4 text-memorial-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-semibold text-memorial-700 dark:text-memorial-300">
                                대표 반려동물 지정
                            </p>
                            <p className="text-[11px] text-memorial-600/80 dark:text-memorial-400/80 mt-0.5">
                                무료 한도로 회귀 시 보존될 1마리를 선택하세요. 나머지는 보관함으로 이동되며 재구독 시 즉시 복구됩니다.
                            </p>
                        </div>
                    </div>
                    <select
                        value={protectedPetId || ""}
                        onChange={(e) => handleProtectedPetChange(e.target.value)}
                        disabled={savingProtectedPet}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-memorial-300 dark:border-memorial-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-memorial-500"
                    >
                        <option value="">— 선택 안 함 (가장 오래된 펫이 자동 지정) —</option>
                        {eligiblePets.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name}{p.status === "memorial" ? " (추모)" : ""}
                            </option>
                        ))}
                    </select>
                    <p className="text-[10px] text-memorial-600/70 dark:text-memorial-400/70 mt-2">
                        추모 펫도 대표로 지정할 수 있습니다 — 데이터 연속성을 위해.
                    </p>
                </div>
            )}
        </div>
    );
}
