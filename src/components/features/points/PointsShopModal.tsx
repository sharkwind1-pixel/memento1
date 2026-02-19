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
    Sparkles,
    Crown,
    Gift,
    Palette,
    Clock,
    Check,
    AlertCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEscapeClose } from "@/hooks/useEscapeClose";
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
    category: "boost" | "cosmetic" | "feature";
    color: string;
    bgColor: string;
    available: boolean;
    comingSoon?: boolean;
}

const SHOP_ITEMS: ShopItem[] = [
    // 부스트 아이템
    {
        id: "extra_chat_5",
        name: "AI 펫톡 +5회",
        description: "오늘 사용할 수 있는 AI 펫톡 횟수가 5회 추가됩니다",
        price: 50,
        icon: MessageCircle,
        category: "boost",
        color: "text-sky-500",
        bgColor: "bg-sky-50 dark:bg-sky-900/20",
        available: true,
    },
    {
        id: "extra_chat_10",
        name: "AI 펫톡 +10회",
        description: "오늘 사용할 수 있는 AI 펫톡 횟수가 10회 추가됩니다",
        price: 80,
        icon: MessageCircle,
        category: "boost",
        color: "text-sky-600",
        bgColor: "bg-sky-50 dark:bg-sky-900/20",
        available: true,
    },
    {
        id: "premium_trial_1d",
        name: "프리미엄 1일 체험",
        description: "24시간 동안 모든 프리미엄 기능을 이용할 수 있습니다",
        price: 200,
        icon: Crown,
        category: "feature",
        color: "text-violet-500",
        bgColor: "bg-violet-50 dark:bg-violet-900/20",
        available: true,
    },
    {
        id: "premium_trial_3d",
        name: "프리미엄 3일 체험",
        description: "3일간 모든 프리미엄 기능을 이용할 수 있습니다",
        price: 500,
        icon: Crown,
        category: "feature",
        color: "text-violet-600",
        bgColor: "bg-violet-50 dark:bg-violet-900/20",
        available: true,
    },
    // 코스메틱 아이템
    {
        id: "profile_frame_sparkle",
        name: "프로필 반짝이 프레임",
        description: "프로필에 반짝이 효과 프레임이 적용됩니다 (30일)",
        price: 300,
        icon: Sparkles,
        category: "cosmetic",
        color: "text-amber-500",
        bgColor: "bg-amber-50 dark:bg-amber-900/20",
        available: false,
        comingSoon: true,
    },
    {
        id: "nickname_color",
        name: "닉네임 색상 변경",
        description: "커뮤니티에서 닉네임 색상을 변경할 수 있습니다 (30일)",
        price: 150,
        icon: Palette,
        category: "cosmetic",
        color: "text-rose-500",
        bgColor: "bg-rose-50 dark:bg-rose-900/20",
        available: false,
        comingSoon: true,
    },
    {
        id: "post_highlight",
        name: "게시글 하이라이트",
        description: "다음에 작성하는 게시글 1개가 목록 상단에 고정됩니다 (24시간)",
        price: 100,
        icon: Gift,
        category: "boost",
        color: "text-emerald-500",
        bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
        available: false,
        comingSoon: true,
    },
];

const CATEGORY_LABELS = {
    boost: "부스트",
    cosmetic: "꾸미기",
    feature: "기능",
};

export default function PointsShopModal({
    isOpen,
    onClose,
}: PointsShopModalProps) {
    const { user, points, refreshPoints } = useAuth();
    useEscapeClose(isOpen, onClose);
    const [selectedCategory, setSelectedCategory] = useState<"all" | "boost" | "cosmetic" | "feature">("all");
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

        if (!item.available) {
            toast.info("준비 중인 아이템입니다");
            return;
        }

        setPurchasingId(item.id);

        try {
            const response = await fetch(API.POINTS_SHOP, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
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
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-end sm:items-center justify-center">
            <div className="w-full sm:max-w-lg sm:mx-4 bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[calc(100vh-140px)] sm:max-h-[85vh] flex flex-col mb-[80px] sm:mb-0" role="dialog" aria-modal="true" aria-labelledby="points-shop-title">
                {/* 헤더 */}
                <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 p-5 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                <ShoppingBag className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 id="points-shop-title" className="text-lg font-bold">포인트 상점</h2>
                                <p className="text-white/80 text-sm">
                                    보유 포인트: {points.toLocaleString()}P
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                            aria-label="닫기"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* 카테고리 필터 */}
                <div className="flex gap-2 p-4 border-b dark:border-gray-700">
                    {(["all", "boost", "feature", "cosmetic"] as const).map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
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
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {filteredItems.map((item) => {
                        const Icon = item.icon;
                        const canAfford = points >= item.price;
                        const isPurchasing = purchasingId === item.id;

                        return (
                            <div
                                key={item.id}
                                className={`relative p-4 rounded-2xl border transition-all ${
                                    item.comingSoon
                                        ? "opacity-60 border-gray-200 dark:border-gray-700"
                                        : "border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-md"
                                }`}
                            >
                                {item.comingSoon && (
                                    <div className="absolute top-2 right-2">
                                        <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            준비중
                                        </span>
                                    </div>
                                )}

                                <div className="flex items-start gap-3">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${item.bgColor}`}>
                                        <Icon className={`w-6 h-6 ${item.color}`} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-gray-800 dark:text-gray-100">
                                                {item.name}
                                            </h3>
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                            {item.description}
                                        </p>

                                        <div className="flex items-center justify-between mt-3">
                                            <span className={`font-bold ${
                                                canAfford ? "text-amber-600 dark:text-amber-400" : "text-gray-400"
                                            }`}>
                                                {item.price.toLocaleString()}P
                                            </span>

                                            {item.available ? (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handlePurchase(item)}
                                                    disabled={!canAfford || isPurchasing}
                                                    className={`rounded-xl ${
                                                        canAfford
                                                            ? "bg-amber-500 hover:bg-amber-600 text-white"
                                                            : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                                                    }`}
                                                >
                                                    {isPurchasing ? (
                                                        <span className="flex items-center gap-1">
                                                            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                            구매중
                                                        </span>
                                                    ) : !canAfford ? (
                                                        <span className="flex items-center gap-1">
                                                            <AlertCircle className="w-3.5 h-3.5" />
                                                            포인트 부족
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1">
                                                            <Check className="w-3.5 h-3.5" />
                                                            구매
                                                        </span>
                                                    )}
                                                </Button>
                                            ) : (
                                                <span className="text-xs text-gray-400 italic">
                                                    곧 출시
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* 하단 안내 */}
                <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <p className="text-xs text-gray-400 text-center">
                        구매한 아이템은 환불이 불가합니다. 포인트는 활동을 통해 적립할 수 있습니다.
                    </p>
                </div>
            </div>
        </div>
    );
}
