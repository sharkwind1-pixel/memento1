/**
 * PremiumModal.tsx
 * 프리미엄 기능 유도 모달
 * - 베이직(9,900원/월) / 프리미엄(18,900원/월) 2단계 플랜
 * - 부드럽고 친근한 톤
 */

"use client";

import { useState } from "react";
import { useEscapeClose } from "@/hooks/useEscapeClose";

import { Button } from "@/components/ui/button";
import {
    X,
    Sparkles,
    MessageCircle,
    Camera,
    Heart,
    Check,
    Crown,
    Star,
    Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { PRICING, BASIC_LIMITS, PREMIUM_LIMITS, VIDEO } from "@/config/constants";
import { requestPortOnePayment } from "@/lib/portone";
import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";
import { useAuth } from "@/contexts/AuthContext";

export type PremiumFeature =
    | "ai-chat-limit"      // AI 펫톡 무제한
    | "pet-limit"          // 반려동물 등록 무제한
    | "photo-limit"        // 사진 저장 무제한
    | "memorial-chat"      // 메모리얼 펫톡
    | "priority-support";  // 우선 고객지원

interface PremiumModalProps {
    isOpen: boolean;
    onClose: () => void;
    feature?: PremiumFeature;
    onLogin?: () => void;      // 비로그인 시 로그인 유도
    isLoggedIn?: boolean;
}

// 기능별 설명
const featureInfo: Record<PremiumFeature, {
    icon: typeof MessageCircle;
    title: string;
    description: string;
    benefit: string;
}> = {
    "ai-chat-limit": {
        icon: MessageCircle,
        title: "AI 펫톡 더 많이",
        description: "오늘의 무료 대화를 다 사용했어요",
        benefit: "베이직 플랜부터 하루 50회, 프리미엄이면 무제한으로 대화할 수 있어요",
    },
    "pet-limit": {
        icon: Heart,
        title: "반려동물 등록 더 많이",
        description: "무료는 1마리만 등록할 수 있어요",
        benefit: "여러 아이를 키우신다면 베이직(3마리) 또는 프리미엄(10마리)으로 모두 등록하세요",
    },
    "photo-limit": {
        icon: Camera,
        title: "사진 저장 더 많이",
        description: "무료 저장 공간이 가득 찼어요",
        benefit: "소중한 순간들을 더 많이 간직하세요",
    },
    "memorial-chat": {
        icon: Sparkles,
        title: "메모리얼 펫톡",
        description: "무지개 다리를 건넌 아이와의 특별한 대화",
        benefit: "아이의 기억을 바탕으로 따뜻한 대화를 나눌 수 있어요",
    },
    "priority-support": {
        icon: Crown,
        title: "우선 고객 지원",
        description: "빠른 응대가 필요하신가요?",
        benefit: "프리미엄 회원은 우선적으로 도움을 받을 수 있어요",
    },
};

type PlanType = "basic" | "premium";

const basicPrice = PRICING.BASIC_MONTHLY.toLocaleString();
const premiumPrice = PRICING.PREMIUM_MONTHLY.toLocaleString();

export default function PremiumModal({
    isOpen,
    onClose,
    feature = "ai-chat-limit",
    onLogin,
    isLoggedIn = true,
}: PremiumModalProps) {
    const [selectedPlan, setSelectedPlan] = useState<PlanType>("basic");
    const [isSubscription, setIsSubscription] = useState(true); // 기본: 정기결제
    const [isProcessing, setIsProcessing] = useState(false);
    const { user, refreshProfile } = useAuth();
    useEscapeClose(isOpen, onClose);
    if (!isOpen) return null;

    const info = featureInfo[feature];
    const Icon = info.icon;

    /** 실제 결제 흐름 실행 */
    const handlePayment = async () => {
        if (isProcessing) return;

        if (!process.env.NEXT_PUBLIC_PORTONE_MERCHANT_CODE || !process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY) {
            toast.error("결제 시스템 준비 중입니다. 잠시 후 다시 시도해주세요.");
            return;
        }

        setIsProcessing(true);

        try {
            // 정기결제 vs 단건결제 분기
            const prepareUrl = isSubscription ? API.SUBSCRIBE_PREPARE : API.PAYMENT_PREPARE;
            const completeUrl = isSubscription ? API.SUBSCRIBE_COMPLETE : API.PAYMENT_COMPLETE;

            // 1. 결제 준비
            const prepareRes = await authFetch(prepareUrl, {
                method: "POST",
                body: JSON.stringify({ plan: selectedPlan }),
            });

            if (!prepareRes.ok) {
                const err = await prepareRes.json();
                toast.error(err.error || "결제 준비에 실패했습니다.");
                return;
            }

            const prepareData = await prepareRes.json();
            const { paymentId, orderName, amount } = prepareData;

            // 2. 포트원 결제창 오픈
            const paymentResult = await requestPortOnePayment({
                paymentId,
                orderName,
                totalAmount: amount,
                customerEmail: user?.email || undefined,
                isSubscription,
                customerUid: prepareData.customerUid, // 정기결제 시에만 존재
            });

            if (!paymentResult.success) {
                if (paymentResult.error === "결제가 취소되었습니다.") {
                    toast.info("결제가 취소되었습니다.");
                } else {
                    toast.error(paymentResult.error || "결제에 실패했습니다.");
                }
                return;
            }

            // 3. 서버 검증 + 프리미엄 활성화
            const completeRes = await authFetch(completeUrl, {
                method: "POST",
                body: JSON.stringify({
                    paymentId: paymentResult.paymentId,
                    impUid: paymentResult.impUid,
                }),
            });

            if (!completeRes.ok) {
                const err = await completeRes.json();
                toast.error(err.error || "결제 확인에 실패했습니다. 고객센터에 문의해주세요.");
                return;
            }

            // 4. 성공!
            toast.success(isSubscription ? "정기구독이 시작되었습니다!" : "프리미엄이 활성화되었습니다!");
            await refreshProfile();
            onClose();
        } catch (err) {
            console.error("[PremiumModal] 결제 오류:", err);
            toast.error("결제 중 오류가 발생했습니다. 다시 시도해주세요.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[9999] overflow-y-auto bg-black/40"
            style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="min-h-full flex items-start justify-center pt-16 pb-20 px-4">
            {/* 모달 */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-200" role="dialog" aria-modal="true" aria-labelledby="premium-modal-title" onClick={(e) => e.stopPropagation()}>
                {/* 상단 그라데이션 */}
                <div className="bg-gradient-to-br from-violet-500 via-purple-500 to-memento-500 p-6 sm:p-8 text-white rounded-t-3xl">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                        aria-label="닫기"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                            <Icon className="w-7 h-7 sm:w-8 sm:h-8" />
                        </div>
                        <div className="min-w-0">
                            <h2 id="premium-modal-title" className="text-lg sm:text-xl font-display font-bold">{info.title}</h2>
                            <p className="text-white/80 text-sm mt-1">{info.description}</p>
                        </div>
                    </div>
                </div>

                {/* 본문 */}
                <div className="p-5 sm:p-6">
                    {/* 혜택 설명 */}
                    <div className="bg-violet-50 dark:bg-violet-900/20 rounded-2xl p-4 mb-5">
                        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                            {info.benefit}
                        </p>
                    </div>

                    {/* 플랜 선택 - 베이직 / 프리미엄 */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                        {/* 베이직 */}
                        <button
                            onClick={() => setSelectedPlan("basic")}
                            className={`relative rounded-2xl p-3.5 sm:p-4 text-left transition-all duration-200 border-2 ${
                                selectedPlan === "basic"
                                    ? "border-memento-500 bg-memento-200 dark:bg-memento-900/20 shadow-sm"
                                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                            }`}
                        >
                            <div className="flex items-center gap-1.5 mb-2">
                                <Star className="w-4 h-4 text-memento-500" />
                                <span className="text-sm font-bold text-gray-800 dark:text-white">베이직</span>
                            </div>
                            <div className="flex items-baseline gap-0.5">
                                <span className="text-xl sm:text-2xl font-display font-bold text-gray-800 dark:text-white">{basicPrice}</span>
                                <span className="text-xs text-gray-400">원/월</span>
                            </div>
                            <ul className="mt-2.5 space-y-1">
                                <li className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
                                    <Check className="w-3 h-3 text-memento-500 flex-shrink-0 mt-0.5" />
                                    AI 펫톡 하루 {BASIC_LIMITS.DAILY_CHATS}회
                                </li>
                                <li className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
                                    <Check className="w-3 h-3 text-memento-500 flex-shrink-0 mt-0.5" />
                                    반려동물 {BASIC_LIMITS.PETS}마리
                                </li>
                                <li className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
                                    <Check className="w-3 h-3 text-memento-500 flex-shrink-0 mt-0.5" />
                                    사진 펫당 {BASIC_LIMITS.PHOTOS_PER_PET}장
                                </li>
                                <li className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
                                    <Check className="w-3 h-3 text-memento-500 flex-shrink-0 mt-0.5" />
                                    AI 영상 월 {VIDEO.BASIC_MONTHLY}회
                                </li>
                            </ul>
                        </button>

                        {/* 프리미엄 */}
                        <button
                            onClick={() => setSelectedPlan("premium")}
                            className={`relative rounded-2xl p-3.5 sm:p-4 text-left transition-all duration-200 border-2 ${
                                selectedPlan === "premium"
                                    ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20 shadow-sm"
                                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                            }`}
                        >
                            {/* 추천 뱃지 */}
                            <div className="absolute -top-2.5 right-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                추천
                            </div>
                            <div className="flex items-center gap-1.5 mb-2">
                                <Crown className="w-4 h-4 text-violet-500" />
                                <span className="text-sm font-bold text-gray-800 dark:text-white">프리미엄</span>
                            </div>
                            <div className="flex items-baseline gap-0.5">
                                <span className="text-xl sm:text-2xl font-display font-bold text-gray-800 dark:text-white">{premiumPrice}</span>
                                <span className="text-xs text-gray-400">원/월</span>
                            </div>
                            <ul className="mt-2.5 space-y-1">
                                <li className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
                                    <Check className="w-3 h-3 text-violet-500 flex-shrink-0 mt-0.5" />
                                    AI 펫톡 무제한
                                </li>
                                <li className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
                                    <Check className="w-3 h-3 text-violet-500 flex-shrink-0 mt-0.5" />
                                    반려동물 {PREMIUM_LIMITS.PETS}마리
                                </li>
                                <li className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
                                    <Check className="w-3 h-3 text-violet-500 flex-shrink-0 mt-0.5" />
                                    사진 펫당 {PREMIUM_LIMITS.PHOTOS_PER_PET}장
                                </li>
                                <li className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
                                    <Check className="w-3 h-3 text-violet-500 flex-shrink-0 mt-0.5" />
                                    AI 영상 월 {VIDEO.PREMIUM_MONTHLY}회
                                </li>
                                <li className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
                                    <Check className="w-3 h-3 text-violet-500 flex-shrink-0 mt-0.5" />
                                    우선 고객 지원
                                </li>
                            </ul>
                        </button>
                    </div>

                    {/* 결제 유형 선택 */}
                    <div className="flex gap-2 mb-3">
                        <button
                            onClick={() => setIsSubscription(true)}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-all border ${
                                isSubscription
                                    ? "bg-memento-500/10 border-memento-500 text-memento-700 dark:text-memento-400"
                                    : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500"
                            }`}
                        >
                            정기 결제
                            <span className="block text-[10px] opacity-70 mt-0.5">매월 자동 결제</span>
                        </button>
                        <button
                            onClick={() => setIsSubscription(false)}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-all border ${
                                !isSubscription
                                    ? "bg-memento-500/10 border-memento-500 text-memento-700 dark:text-memento-400"
                                    : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500"
                            }`}
                        >
                            단건 결제
                            <span className="block text-[10px] opacity-70 mt-0.5">1개월만</span>
                        </button>
                    </div>
                    <p className="text-[10px] text-gray-400 text-center mb-3">
                        {isSubscription
                            ? "결제일로부터 30일간 이용 가능, 매월 동일 날짜에 자동 갱신. 언제든 해지 가능."
                            : "결제일로부터 30일간 이용 가능. 기간 만료 후 자동 해제."
                        }
                    </p>

                    {/* CTA 버튼 */}
                    {isLoggedIn ? (
                        <div className="space-y-3">
                            <Button
                                className={`w-full text-white rounded-xl py-6 font-bold transition-all ${
                                    selectedPlan === "premium"
                                        ? "bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
                                        : "bg-gradient-to-r from-memento-500 to-memento-500 hover:from-memento-600 hover:to-memento-600"
                                } ${isProcessing ? "opacity-80 cursor-not-allowed" : ""}`}
                                onClick={handlePayment}
                                disabled={isProcessing}
                            >
                                {isProcessing ? (
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                ) : selectedPlan === "premium" ? (
                                    <Crown className="w-5 h-5 mr-2" />
                                ) : (
                                    <Star className="w-5 h-5 mr-2" />
                                )}
                                {isProcessing
                                    ? "결제 진행 중..."
                                    : selectedPlan === "premium"
                                        ? `프리미엄 ${premiumPrice}원/월 ${isSubscription ? "구독" : "결제"}`
                                        : `베이직 ${basicPrice}원/월 ${isSubscription ? "구독" : "결제"}`
                                }
                            </Button>
                            <button
                                onClick={onClose}
                                className="w-full text-gray-400 text-sm hover:text-gray-600 transition-colors py-2"
                            >
                                나중에 할게요
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <Button
                                className="w-full bg-gradient-to-r from-violet-500 to-memento-500 hover:from-violet-600 hover:to-memento-600 text-white rounded-xl py-6 font-bold"
                                onClick={onLogin}
                            >
                                로그인하고 시작하기
                            </Button>
                            <p className="text-center text-gray-400 text-sm">
                                무료로 시작하고, 마음에 들면 업그레이드
                            </p>
                        </div>
                    )}
                </div>
            </div>
            </div>
        </div>
    );
}
