/**
 * SubscriptionSection.tsx
 * 구독 관리 섹션
 */

"use client";

import React, { useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { Button } from "@/components/ui/button";
import { PRICING } from "@/config/constants";
import { CreditCard, Crown, AlertTriangle, Heart } from "lucide-react";
import { InlineLoading } from "@/components/ui/PawLoading";
import { toast } from "sonner";
import type { SubscriptionTier } from "@/config/constants";
import { useSubscriptionPhase } from "@/hooks/useSubscriptionPhase";
import { usePets } from "@/contexts/PetContext";
import { useAuth } from "@/contexts/AuthContext";
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
    const [refundPreview, setRefundPreview] = useState<{
        refundable_amount: number;
        original_amount: number;
        gross_refund: number;
        video_deduction: number;
        videos_used_charged: number;
        video_unit_price?: number;
        is_full_refund: boolean;
        days_used: number;
        days_total: number;
        days_remaining: number;
    } | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const { refreshProfile } = useAuth();

    // 해지 확인 모달 열 때 예상 환불액 미리 조회
    React.useEffect(() => {
        if (!showCancelConfirm || !isPremiumUser) return;
        let cancelled = false;
        setLoadingPreview(true);
        setPreviewError(null);
        (async () => {
            try {
                const res = await fetch("/api/subscription/refund-preview", {
                    headers: await authHeaders(),
                });
                if (!res.ok) {
                    if (!cancelled) {
                        if (res.status === 401) {
                            setPreviewError("세션이 만료됐습니다. 다시 로그인해주세요.");
                        } else {
                            setPreviewError("환불 금액 조회에 실패했습니다. 다시 시도해주세요.");
                        }
                    }
                    return;
                }
                const data = await res.json();
                if (cancelled) return;
                setRefundPreview({
                    refundable_amount: data.refundable_amount ?? 0,
                    original_amount: data.original_amount ?? 0,
                    gross_refund: data.gross_refund ?? data.refundable_amount ?? 0,
                    video_deduction: data.video_deduction ?? 0,
                    videos_used_charged: data.videos_used_charged ?? 0,
                    video_unit_price: data.video_unit_price ?? 3500,
                    is_full_refund: !!data.is_full_refund,
                    days_used: data.days_used ?? 0,
                    days_total: data.days_total ?? 0,
                    days_remaining: data.days_remaining ?? 0,
                });
            } catch {
                // preview 실패해도 해지 자체는 가능하게 — 기본 UI 유지
            } finally {
                if (!cancelled) setLoadingPreview(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [showCancelConfirm, isPremiumUser]);

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
            if (!res.ok) {
                if (res.status === 401) {
                    toast.error("로그인이 만료됐습니다. 다시 로그인해주세요.");
                    window.dispatchEvent(new CustomEvent("openAuthModal"));
                    return;
                }
                throw new Error(data.error || "지정 실패");
            }
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
                // 401: 세션 만료 → 로그인 모달 유도
                if (res.status === 401) {
                    toast.error("로그인이 만료됐습니다. 다시 로그인해주세요.");
                    window.dispatchEvent(new CustomEvent("openAuthModal"));
                    return;
                }
                // 409: 중복 요청
                if (res.status === 409) {
                    toast.error(result.error || "이미 해지 처리 중입니다. 잠시 후 새로고침해주세요.");
                    return;
                }
                throw new Error(result.error || "구독 해지에 실패했습니다");
            }

            setShowCancelConfirm(false);
            const amount = (result.refunded_amount ?? 0).toLocaleString();
            if (result.refund_status === "refunded_full") {
                toast.success(`구독 해지 완료. ${amount}원 전액 환불 (카드사 3~5영업일 내 반영).`);
            } else if (result.refund_status === "refunded_prorata") {
                toast.success(`구독 해지 완료. ${amount}원 일할 환불 (카드사 3~5영업일 내 반영).`);
            } else if (result.refund_status === "skipped_no_remaining") {
                toast.success("구독이 해지되었습니다. 이용 기간이 끝나가 환불 금액은 없습니다.");
            } else {
                toast.success("구독이 해지되었습니다.");
            }

            // AuthContext 프로필 refresh — 전체 reload 대신 (UX 개선: 백화면 없음)
            try {
                await refreshProfile();
            } catch {
                // fallback: reload
                window.location.reload();
            }
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
                                        해지 즉시 유료 기능이 종료되고, <b>결제 후 24시간 이내면 전액 환불</b>, 이후엔 사용 일수 차감 후 일할 환불됩니다.
                                    </p>
                                    {/* 환불 예상액 카드 */}
                                    <div className="mt-2 p-2 bg-white/80 dark:bg-gray-800/60 rounded border border-red-200 dark:border-red-900/40 text-gray-700 dark:text-gray-200">
                                        {previewError ? (
                                            <p className="text-[11px] text-red-600 dark:text-red-400">{previewError}</p>
                                        ) : loadingPreview && !refundPreview ? (
                                            <p className="text-[11px]">환불 금액 계산 중...</p>
                                        ) : refundPreview && refundPreview.original_amount > 0 ? (
                                            <div className="space-y-0.5 text-[11px]">
                                                {refundPreview.is_full_refund && (
                                                    <div className="mb-1 px-1.5 py-0.5 inline-block bg-memento-100 text-memento-700 dark:bg-memento-900/40 dark:text-memento-300 rounded font-medium">
                                                        24시간 이내 해지 — 전액 환불 기준
                                                    </div>
                                                )}
                                                <div className="flex justify-between">
                                                    <span>결제 금액</span>
                                                    <span>{refundPreview.original_amount.toLocaleString()}원</span>
                                                </div>
                                                {!refundPreview.is_full_refund && (
                                                    <div className="flex justify-between text-gray-500 dark:text-gray-400">
                                                        <span>사용 일수</span>
                                                        <span>{refundPreview.days_used}일 / {refundPreview.days_total}일</span>
                                                    </div>
                                                )}
                                                {refundPreview.gross_refund !== refundPreview.refundable_amount && (
                                                    <div className="flex justify-between text-gray-500 dark:text-gray-400">
                                                        <span>일반 환불 금액</span>
                                                        <span>{refundPreview.gross_refund.toLocaleString()}원</span>
                                                    </div>
                                                )}
                                                {refundPreview.videos_used_charged > 0 && (
                                                    <div className="flex justify-between text-orange-600 dark:text-orange-400">
                                                        <span>AI 영상 {refundPreview.videos_used_charged}건 차감</span>
                                                        <span>-{refundPreview.video_deduction.toLocaleString()}원</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between font-semibold text-red-600 dark:text-red-400 pt-1 border-t border-red-100 dark:border-red-900/40">
                                                    <span>예상 환불 금액</span>
                                                    <span>{refundPreview.refundable_amount.toLocaleString()}원</span>
                                                </div>
                                                {refundPreview.videos_used_charged > 0 && (
                                                    <p className="text-[10px] text-gray-500 pt-0.5">
                                                        * AI 영상 생성은 1건당 {(refundPreview.video_unit_price ?? 3500).toLocaleString()}원 비용이 차감됩니다
                                                    </p>
                                                )}
                                                {refundPreview.refundable_amount === 0 && refundPreview.videos_used_charged > 0 && (
                                                    <p className="text-[10px] text-orange-600 dark:text-orange-400 pt-0.5">
                                                        AI 영상 사용 비용이 구독료와 같거나 커서 환불 금액이 0원입니다.
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-[11px]">환불 대상 결제가 없어 환불 금액은 0원입니다.</p>
                                        )}
                                    </div>
                                    <p className="mt-2">무료 회원으로 전환되며:</p>
                                    <ul className="mt-1 ml-3 list-disc space-y-0.5">
                                        <li>대표 반려동물 1마리 + 사진 50장 유지</li>
                                        <li>초과 데이터는 40일간 보관 (재구독 시 복구)</li>
                                        <li>40일 후 초과 데이터 영구 삭제</li>
                                    </ul>
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
