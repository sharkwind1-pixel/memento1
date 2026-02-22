/**
 * PointsShopModal.tsx
 * 포인트 상점 - 적립된 포인트로 아이템 교환
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    X,
    ShoppingBag,
    MessageCircle,
    Crown,
    Check,
    AlertCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";
import { toast } from "sonner";

interface PointsShopModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface ShopItem {
    id: string;
    name: string;
    description: string;
    price: number;
    icon: typeof MessageCircle;
    category: "boost" | "feature";
    color: string;
    bgColor: string;
}

const SHOP_ITEMS: ShopItem[] = [
    // 부스트 아이템
    {
        id: "extra_chat_5",
        name: "AI 펫톡 +5회",
        description: "오늘 사용할 수 있는 AI 펫톡 횟수가 5회 추가됩니다",
        price: 150,
        icon: MessageCircle,
        category: "boost",
        color: "text-sky-500",
        bgColor: "bg-sky-50 dark:bg-sky-900/20",
    },
    {
        id: "extra_chat_10",
        name: "AI 펫톡 +10회",
        description: "오늘 사용할 수 있는 AI 펫톡 횟수가 10회 추가됩니다",
        price: 250,
        icon: MessageCircle,
        category: "boost",
        color: "text-sky-600",
        bgColor: "bg-sky-50 dark:bg-sky-900/20",
    },
    {
        id: "premium_trial_1d",
        name: "프리미엄 1일 체험",
        description: "24시간 동안 모든 프리미엄 기능을 이용할 수 있습니다",
        price: 500,
        icon: Crown,
        category: "feature",
        color: "text-violet-500",
        bgColor: "bg-violet-50 dark:bg-violet-900/20",
    },
    {
        id: "premium_trial_3d",
        name: "프리미엄 3일 체험",
        description: "3일간 모든 프리미엄 기능을 이용할 수 있습니다",
        price: 1200,
        icon: Crown,
        category: "feature",
        color: "text-violet-600",
        bgColor: "bg-violet-50 dark:bg-violet-900/20",
    },
];

const CATEGORY_LABELS = {
    boost: "부스트",
    feature: "기능",
};

export default function PointsShopModal({
    isOpen,
    onClose,
}: PointsShopModalProps) {
    const { user, points, refreshPoints } = useAuth();
    useEscapeClose(isOpen, onClose);
    const [selectedCategory, setSelectedCategory] = useState<"all" | "boost" | "feature">("all");
    const [purchasingId, setPurchasingId] = useState<string | null>(null);

    if (!isOpen) return null;

    const filteredItems = selectedCategory === "all"
        ? SHOP_ITEMS
        : SHOP_ITEMS.filter(item => item.category === selectedCategory);

    const handlePurchase = async (item: ShopItem) => {
        if (!user) {
            toast.error("로그인이 필요합니다");
            return;
        }

        if (points < item.price) {
            toast.error("포인트가 부족합니다");
            return;
        }

        setPurchasingId(item.id);

        try {
            const response = await authFetch(API.POINTS_SHOP, {
                method: "POST",
                body: JSON.stringify({ itemId: item.id }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "구매 실패");
            }

            await refreshPoints();
            toast.success(`${item.name}을(를) 구매했습니다!`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "구매에 실패했습니다");
        } finally {
            setPurchasingId(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-14 sm:pt-16">
            {/* 배경 오버레이 - 클릭 시 닫기 */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            <div
                className="relative w-[calc(100%-2rem)] sm:max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-clip max-h-[calc(100vh-3.5rem-68px)] sm:max-h-[calc(100vh-4rem-1rem)] mt-2 flex flex-col"
                role="dialog"
                aria-modal="true"
                aria-labelledby="points-shop-title"
            >
                {/* 헤더 - 컴팩트 */}
                <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 px-4 py-2.5 text-white shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ShoppingBag className="w-5 h-5" />
                            <div>
                                <h2 id="points-shop-title" className="text-sm font-bold leading-tight">포인트 상점</h2>
                                <p className="text-white/80 text-[11px]">
                                    보유: {points.toLocaleString()}P
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                            aria-label="닫기"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* 카테고리 필터 - 컴팩트 */}
                <div className="flex items-center gap-1.5 px-3 py-2 border-b dark:border-gray-700 shrink-0">
                    {(["all", "boost", "feature"] as const).map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all leading-tight ${
                                selectedCategory === cat
                                    ? "bg-amber-500 text-white"
                                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
                            }`}
                        >
                            {cat === "all" ? "전체" : CATEGORY_LABELS[cat]}
                        </button>
                    ))}
                </div>

                {/* 상품 목록 */}
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y p-3 space-y-2.5">
                    {filteredItems.map((item) => {
                        const Icon = item.icon;
                        const canAfford = points >= item.price;
                        const isPurchasing = purchasingId === item.id;

                        return (
                            <div
                                key={item.id}
                                className="relative p-3 rounded-xl border transition-all border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-md"
                            >
                                <div className="flex items-start gap-2.5">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${item.bgColor}`}>
                                        <Icon className={`w-5 h-5 ${item.color}`} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-xs text-gray-800 dark:text-gray-100">
                                            {item.name}
                                        </h3>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">
                                            {item.description}
                                        </p>

                                        <div className="flex items-center justify-between mt-2">
                                            <span className={`text-xs font-bold ${
                                                canAfford ? "text-amber-600 dark:text-amber-400" : "text-gray-400"
                                            }`}>
                                                {item.price.toLocaleString()}P
                                            </span>

                                            <Button
                                                size="sm"
                                                onClick={() => handlePurchase(item)}
                                                disabled={!canAfford || isPurchasing}
                                                className={`rounded-lg text-[11px] h-7 ${
                                                    canAfford
                                                        ? "bg-amber-500 hover:bg-amber-600 text-white"
                                                        : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                                                }`}
                                            >
                                                {isPurchasing ? (
                                                    <span className="flex items-center gap-1">
                                                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    </span>
                                                ) : !canAfford ? (
                                                    <span className="flex items-center gap-1">
                                                        <AlertCircle className="w-3 h-3" />
                                                        부족
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1">
                                                        <Check className="w-3 h-3" />
                                                        구매
                                                    </span>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* 하단 안내 */}
                <div className="px-3 py-2 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shrink-0">
                    <p className="text-[10px] text-gray-400 text-center">
                        구매한 아이템은 환불이 불가합니다. 포인트는 활동을 통해 적립할 수 있습니다.
                    </p>
                </div>
            </div>
        </div>
    );
}
