/**
 * VideoPurchaseModal.tsx
 * AI 영상 단건 구매 모달
 * - 영상 1건 3,500원 단건 결제
 * - 하단에 구독 플랜 안내 링크
 */

"use client";

import { useState } from "react";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import { Button } from "@/components/ui/button";
import { X, Video, Loader2, Crown } from "lucide-react";
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

export default function VideoPurchaseModal({
    isOpen,
    onClose,
    onOpenSubscription,
    onPurchaseSuccess,
}: VideoPurchaseModalProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const { user } = useAuth();
    useEscapeClose(isOpen, onClose);

    if (!isOpen) return null;

    const price = VIDEO.SINGLE_PRICE.toLocaleString();

    const handlePurchase = async () => {
        if (isProcessing) return;

        if (!process.env.NEXT_PUBLIC_PORTONE_MERCHANT_CODE || !process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY) {
            toast.error("결제 시스템 준비 중입니다. 잠시 후 다시 시도해주세요.");
            return;
        }

        setIsProcessing(true);

        try {
            // 1. 결제 준비
            const prepareRes = await authFetch(API.PAYMENT_VIDEO_PREPARE, {
                method: "POST",
                body: JSON.stringify({}),
            });

            if (!prepareRes.ok) {
                const err = await prepareRes.json();
                toast.error(err.error || "결제 준비에 실패했습니다.");
                return;
            }

            const { paymentId, orderName, amount } = await prepareRes.json();

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

            toast.success("AI 영상 1건이 추가되었습니다!");
            onPurchaseSuccess();
            onClose();
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
                    className="bg-white dark:bg-gray-900 rounded-3xl max-w-sm w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-200"
                    role="dialog"
                    aria-modal="true"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* 상단 */}
                    <div className="bg-gradient-to-br from-sky-500 via-blue-500 to-violet-500 p-6 text-white rounded-t-3xl">
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
                                <p className="text-white/80 text-sm mt-1">무료 횟수를 다 사용했어요</p>
                            </div>
                        </div>
                    </div>

                    {/* 본문 */}
                    <div className="p-5">
                        {/* 단건 구매 카드 */}
                        <div className="bg-sky-50 dark:bg-sky-900/20 rounded-2xl p-4 mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-bold text-gray-800 dark:text-white">영상 1건 구매</span>
                                <span className="text-sky-600 dark:text-sky-400"><span className="text-lg font-display font-bold">{price}</span><span className="text-sm font-normal ml-0.5">원</span></span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                지금 선택한 템플릿으로 바로 영상을 만들 수 있어요.
                                결제 후 즉시 1건의 영상 생성 크레딧이 추가됩니다.
                            </p>
                        </div>

                        {/* 구매 버튼 */}
                        <Button
                            className={`w-full text-white rounded-xl py-6 font-bold bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 transition-all ${
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
                            {isProcessing ? "결제 진행 중..." : <>영상 만들기 {price}<span className="font-normal text-sm">원</span></>}
                        </Button>

                        {/* 구독 안내 */}
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <button
                                onClick={handleOpenSubscription}
                                className="w-full flex items-center justify-center gap-2 text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors py-2"
                            >
                                <Crown className="w-4 h-4" />
                                <span>구독하면 매달 3~6회 영상 생성</span>
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
