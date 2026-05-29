/**
 * FurnitureShopModal.tsx
 * 미니홈피 가구/소품 상점
 * 카탈로그 기반 구매 + 인벤토리 보유 표시
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
    X,
    ShoppingBag,
    Check,
    AlertCircle,
    Loader2,
    Armchair,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import useHorizontalScroll from "@/hooks/useHorizontalScroll";
import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";
import { FURNITURE_CATALOG, FURNITURE_CATEGORY_LABELS } from "@/data/furnitureCatalog";
import type { FurnitureCategory, FurnitureItem } from "@/types";
import Image from "next/image";

interface FurnitureShopModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPurchased?: () => void;
}

type FilterCategory = "all" | FurnitureCategory;

const FILTER_LABELS: Record<FilterCategory, string> = {
    all: "전체",
    ...FURNITURE_CATEGORY_LABELS,
};

export default function FurnitureShopModal({
    isOpen,
    onClose,
    onPurchased,
}: FurnitureShopModalProps) {
    const { points, refreshPoints } = useAuth();
    useEscapeClose(isOpen, onClose);
    const categoryScrollRef = useHorizontalScroll();

    const [selectedFilter, setSelectedFilter] = useState<FilterCategory>("all");
    const [ownedSlugs, setOwnedSlugs] = useState<string[]>([]);
    const [loadingInventory, setLoadingInventory] = useState(true);
    const [purchasingSlug, setPurchasingSlug] = useState<string | null>(null);
    const [purchaseConfirm, setPurchaseConfirm] = useState<{
        slug: string;
        name: string;
        price: number;
    } | null>(null);

    // 보유 가구 로드
    const loadInventory = useCallback(async () => {
        setLoadingInventory(true);
        try {
            const res = await authFetch(API.FURNITURE_INVENTORY);
            if (res.ok) {
                const data = await res.json();
                const slugs = (data.items || []).map(
                    (i: { furniture_id: string }) => i.furniture_id
                );
                setOwnedSlugs(slugs);
            }
        } catch {
            // ignore
        } finally {
            setLoadingInventory(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            loadInventory();
        }
    }, [isOpen, loadInventory]);

    if (!isOpen) return null;

    const handlePurchaseConfirm = (item: FurnitureItem) => {
        if (points < item.price) {
            toast.error("포인트가 부족합니다");
            return;
        }
        setPurchaseConfirm({ slug: item.slug, name: item.name, price: item.price });
    };

    const handlePurchase = async () => {
        if (!purchaseConfirm) return;
        const { slug, name, price } = purchaseConfirm;
        setPurchaseConfirm(null);
        setPurchasingSlug(slug);
        try {
            const res = await authFetch(API.FURNITURE_PURCHASE, {
                method: "POST",
                body: JSON.stringify({ furnitureSlug: slug }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "구매 실패");
            }
            await refreshPoints();
            await loadInventory();
            onPurchased?.();
            toast.success(`${name}을(를) 구매했습니다!`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "구매에 실패했습니다");
        } finally {
            setPurchasingSlug(null);
        }
    };

    const filteredItems =
        selectedFilter === "all"
            ? FURNITURE_CATALOG
            : FURNITURE_CATALOG.filter((f) => f.category === selectedFilter);

    // 보유 개수 (중복 구매 가능)
    const ownedCount = (slug: string) => ownedSlugs.filter((s) => s === slug).length;

    return (
        <div
            className="fixed inset-0 z-[9999] overflow-y-auto bg-black/50"
            style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="min-h-full flex items-start justify-center pt-16 pb-20 px-4">
                <div
                    className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-2xl shadow-2xl relative"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="furniture-shop-title"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* 헤더 */}
                    <div className="sticky top-0 z-10 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 px-4 py-2.5 text-white rounded-t-2xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Armchair className="w-5 h-5" />
                                <div>
                                    <h2
                                        id="furniture-shop-title"
                                        className="text-sm font-bold leading-tight"
                                    >
                                        가구 상점
                                    </h2>
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

                    {/* 카테고리 필터 */}
                    <div
                        ref={categoryScrollRef}
                        className="flex items-center gap-1.5 px-3 py-2 border-b dark:border-gray-700 overflow-x-auto"
                    >
                        {(Object.keys(FILTER_LABELS) as FilterCategory[]).map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedFilter(cat)}
                                className={cn(
                                    "px-2.5 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap leading-tight",
                                    selectedFilter === cat
                                        ? "bg-amber-500 text-white"
                                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
                                )}
                            >
                                {FILTER_LABELS[cat]}
                            </button>
                        ))}
                    </div>

                    {/* 상품 목록 */}
                    <div className="p-3">
                        {loadingInventory ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                            </div>
                        ) : filteredItems.length === 0 ? (
                            <p className="text-center text-gray-400 py-8 text-xs">
                                등록된 아이템이 없습니다
                            </p>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                {filteredItems.map((item) => {
                                    const count = ownedCount(item.slug);
                                    const owned = count > 0;
                                    const canAfford = points >= item.price;
                                    const isPurchasing = purchasingSlug === item.slug;

                                    return (
                                        <div
                                            key={item.slug}
                                            className={cn(
                                                "relative p-2.5 rounded-xl border transition-all text-center flex flex-col",
                                                owned
                                                    ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20"
                                                    : "border-gray-200 dark:border-gray-700 hover:border-amber-300 hover:shadow-md"
                                            )}
                                        >
                                            {owned && (
                                                <div className="absolute top-1.5 right-1.5">
                                                    <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-bold">
                                                        {count > 1 ? `x${count}` : "보유"}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="flex justify-center items-center py-1 h-[72px]">
                                                <Image
                                                    src={item.imageUrl}
                                                    alt={item.name}
                                                    width={64}
                                                    height={64}
                                                    className="object-contain"
                                                    style={{ imageRendering: "pixelated" }}
                                                />
                                            </div>

                                            <p className="font-bold text-xs text-gray-800 dark:text-gray-100 mt-0.5">
                                                {item.name}
                                            </p>
                                            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 flex-1 leading-tight">
                                                {item.description}
                                            </p>
                                            <p className="text-[9px] text-gray-400 mt-0.5">
                                                {FURNITURE_CATEGORY_LABELS[item.category]}
                                            </p>

                                            <div className="mt-auto pt-1.5">
                                                <p
                                                    className={cn(
                                                        "text-xs font-bold mb-1",
                                                        canAfford
                                                            ? "text-amber-600"
                                                            : "text-gray-400"
                                                    )}
                                                >
                                                    {item.price}P
                                                </p>
                                                <Button
                                                    size="sm"
                                                    onClick={() =>
                                                        handlePurchaseConfirm(item)
                                                    }
                                                    disabled={!canAfford || isPurchasing}
                                                    className={cn(
                                                        "w-full rounded-lg text-[11px] h-7",
                                                        canAfford
                                                            ? "bg-amber-500 hover:bg-amber-600 text-white"
                                                            : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                                                    )}
                                                >
                                                    {isPurchasing ? (
                                                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    ) : !canAfford ? (
                                                        <span className="flex items-center gap-1">
                                                            <AlertCircle className="w-3 h-3" />
                                                            부족
                                                        </span>
                                                    ) : owned ? (
                                                        <span className="flex items-center gap-1">
                                                            <ShoppingBag className="w-3 h-3" />
                                                            추가 구매
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
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* 하단 안내 */}
                    <div className="sticky bottom-0 z-10 px-3 py-2 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-b-2xl">
                        <p className="text-[10px] text-gray-400 text-center">
                            가구는 중복 구매 가능하며, 미니홈피 편집모드에서 배치할 수 있습니다.
                        </p>
                    </div>

                    {/* 구매 확인 다이얼로그 */}
                    {purchaseConfirm && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]">
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 mx-4 max-w-xs w-full shadow-2xl">
                                <h3 className="font-bold text-sm text-gray-800 dark:text-gray-100 text-center">
                                    구매 확인
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1.5">
                                    <strong>{purchaseConfirm.name}</strong>을(를)
                                    구매하시겠습니까?
                                </p>
                                <p className="text-center mt-1">
                                    <span className="text-red-500 font-bold text-sm">
                                        -{purchaseConfirm.price}P
                                    </span>
                                </p>
                                <div className="flex gap-2 mt-4">
                                    <Button
                                        variant="outline"
                                        className="flex-1 text-xs"
                                        onClick={() => setPurchaseConfirm(null)}
                                    >
                                        취소
                                    </Button>
                                    <Button
                                        className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs"
                                        onClick={handlePurchase}
                                    >
                                        구매하기
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
