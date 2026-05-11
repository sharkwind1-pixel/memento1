/**
 * VideoPurchaseModal.tsx
 * AI 영상 구매 모달 (단품 + 묶음권)
 * - 1회: 4,900원
 * - 5회 묶음: 19,900원 (영상당 3,980원)
 * - 10회 묶음: 34,900원 (영상당 3,490원)
 * - 하단에 구독 플랜 안내 링크
 */

"use client";

import { useState } from "react";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import { Button } from "@/components/ui/button";
import { X, Video, Loader2, Crown, Check } from "lucide-react";
import { toast } from "sonner";
import { VIDEO } from "@/config/constants";
import { requestPortOnePayment } from "@/lib/portone";
import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";
import { useAuth } from "@/contexts/AuthContext";

interface VideoPurchaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenSubscription: () => void;
    onPurchaseSuccess: () => void;
}

type PackageSize = 1 | 5 | 10;

interface PackageOption {
    size: PackageSize;
    label: string;
    price: number;
    perVideo: number;
    badge?: string;
    highlight?: boolean;
}

const PACKAGES: PackageOption[] = [
    { size: 1, label: "1회권", price: VIDEO.SINGLE_PRICE, perVideo: VIDEO.SINGLE_PRICE },
    {
        size: 5,
        label: "5회 묶음",
        price: VIDEO.BUNDLE_5_PRICE,
        perVideo: Math.round(VIDEO.BUNDLE_5_PRICE / 5),
        badge: "인기",
        highlight: true,
    },
    {
        size: 10,
        label: "10회 묶음",
        price: VIDEO.BUNDLE_10_PRICE,
        perVideo: Math.round(VIDEO.BUNDLE_10_PRICE / 10),
        badge: "최대 할인",
    },
];

export default function VideoPurchaseModal({
    isOpen,
    onClose,
    onOpenSubscription,
    onPurchaseSuccess,
}: VideoPurchaseModalProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedSize, setSelectedSize] = useState<PackageSize>(5);
    const { user } = useAuth();
    useEscapeClose(isOpen, onClose);

    if (!isOpen) return null;

    const selectedPkg = PACKAGES.find((p) => p.size === selectedSize)!;
    const priceStr = selectedPkg.price.toLocaleString();

    const handlePurchase = async () => {
        if (isProcessing) return;

        if (!process.env.NEXT_PUBLIC_PORTONE_MERCHANT_CODE || !process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY) {
            toast.error("결제 시스템 준비 중입니다. 잠시 후 다시 시도해주세요.");
            return;
        }

        setIsProcessing(true);

        try {
            // 1. 결제 준비 (선택한 묶음 사이즈 전달)
            const prepareRes = await authFetch(API.PAYMENT_VIDEO_PREPARE, {
                method: "POST",
                body: JSON.stringify({ packageSize: selectedSize }),
            });

            if (!prepareRes.ok) {
                const err = await prepareRes.json();
                toast.error(err.error || "결제 준비에 실패했습니다.");
                return;
            }

            const prepareDataParsed = await prepareRes.json();
            const { paymentId, orderName, amount } = prepareDataParsed;

            // 2. 포트원 결제창 오픈
            const paymentResult = await requestPortOnePayment({
                paymentId,
                orderName,
                totalAmount: amount,
                customerEmail: user?.email || undefined,
                isSubscription: false,
            });

            if (!paymentResult.success) {
                if (paymentResult.error === "결제가 취소되었습니다.") {
                    toast.info("결제가 취소되었습니다.");
                } else {
                    toast.error(paymentResult.error || "결제에 실패했습니다.");
                }
                return;
            }

            // 3. 서버 검증
            const completeRes = await authFetch(API.PAYMENT_VIDEO_COMPLETE, {
                method: "POST",
                body: JSON.stringify({
                    paymentId: paymentResult.paymentId,
                    impUid: paymentResult.impUid,
                }),
            });

            if (!completeRes.ok) {
                const err = await completeRes.json();
                toast.error(err.error || "결제 확인에 실패했습니다.");
                return;
            }

            toast.success(
                selectedSize === 1
                    ? "AI 영상 1건이 추가되었습니다!"
                    : `AI 영상 ${selectedSize}건이 추가되었습니다!`,
            );
            onPurchaseSuccess();
            onClose();
            // 광고 conversion tracking용 thank-you 페이지로 이동
            try {
                const params = new URLSearchParams({
                    type: "video",
                    package: String(selectedSize),
                    ...(amount ? { amount: String(amount) } : {}),
                });
                window.location.href = `/payment/thank-you?${params.toString()}`;
            } catch { /* noop */ }
        } catch (err) {
            console.error("[VideoPurchaseModal] 결제 오류:", err);
            toast.error("결제 중 오류가 발생했습니다. 다시 시도해주세요.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleOpenSubscription = () => {
        onClose();
        onOpenSubscription();
    };

    return (
        <div
            className="fixed inset-0 z-[9999] overflow-y-auto bg-black/40"
            style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="min-h-full flex items-start justify-center pt-16 pb-20 px-4">
                <div
                    className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-200"
                    role="dialog"
                    aria-modal="true"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* 상단 */}
                    <div className="bg-gradient-to-br from-memento-500 via-memento-500 to-violet-500 p-6 text-white rounded-t-3xl">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                            aria-label="닫기"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                                <Video className="w-7 h-7" />
                            </div>
                            <div>
                                <h2 className="text-lg font-display font-bold">AI 영상 만들기</h2>
                                <p className="text-white/80 text-sm mt-1">필요한 만큼 골라보세요</p>
                            </div>
                        </div>
                    </div>

                    {/* 본문 */}
                    <div className="p-5">
                        {/* 묶음 옵션 선택 */}
                        <div className="space-y-2 mb-4">
                            {PACKAGES.map((pkg) => {
                                const isSelected = selectedSize === pkg.size;
                                return (
                                    <button
                                        key={pkg.size}
                                        onClick={() => setSelectedSize(pkg.size)}
                                        className={`w-full relative rounded-2xl p-4 text-left transition-all border-2 ${
                                            isSelected
                                                ? "border-memento-500 bg-memento-50 dark:bg-memento-900/20 shadow-sm"
                                                : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                                        }`}
                                    >
                                        {pkg.badge && (
                                            <div className="absolute -top-2 right-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                {pkg.badge}
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                    isSelected
                                                        ? "bg-memento-500 text-white"
                                                        : "border-2 border-gray-300 dark:border-gray-600"
                                                }`}>
                                                    {isSelected && <Check className="w-3 h-3" />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-800 dark:text-white">
                                                        AI 영상 {pkg.label}
                                                    </p>
                                                    {pkg.size > 1 && (
                                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                                            영상당 {pkg.perVideo.toLocaleString()}원
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-display font-bold text-memento-600 dark:text-memento-400">
                                                    {pkg.price.toLocaleString()}원
                                                </p>
                                                {pkg.size > 1 && (
                                                    <p className="text-[10px] text-gray-400">
                                                        {Math.round((1 - pkg.perVideo / VIDEO.SINGLE_PRICE) * 100)}% 할인
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* 구매 버튼 */}
                        <Button
                            className={`w-full text-white rounded-xl py-6 font-bold bg-gradient-to-r from-memento-500 to-memento-500 hover:from-memento-600 hover:to-memento-600 transition-all ${
                                isProcessing ? "opacity-80 cursor-not-allowed" : ""
                            }`}
                            onClick={handlePurchase}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            ) : (
                                <Video className="w-5 h-5 mr-2" />
                            )}
                            {isProcessing ? "결제 진행 중..." : <>{priceStr}<span className="font-normal text-sm ml-0.5">원</span> 결제하기</>}
                        </Button>

                        {/* 구독 안내 */}
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <button
                                onClick={handleOpenSubscription}
                                className="w-full flex items-center justify-center gap-2 text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors py-2"
                            >
                                <Crown className="w-4 h-4" />
                                <span>구독하면 매달 3회 + 무제한 펫톡</span>
                            </button>
                        </div>

                        {/* 닫기 */}
                        <button
                            onClick={onClose}
                            className="w-full text-gray-400 text-sm hover:text-gray-600 transition-colors py-2 mt-1"
                        >
                            나중에 할게요
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
