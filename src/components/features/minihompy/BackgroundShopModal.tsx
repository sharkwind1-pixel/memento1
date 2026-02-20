/**
 * BackgroundShopModal.tsx
 * 미니홈피 배경 상점 - 배경 테마 구매 + 적용
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { X, Check, Loader2, ShoppingBag, Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";
import { formatPoints } from "@/lib/points";
import type { BackgroundTheme } from "@/types";

interface BackgroundShopModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentSlug: string;
    onApply: (slug: string) => Promise<void>;
}

interface CatalogItem extends BackgroundTheme {
    owned: boolean;
}

export default function BackgroundShopModal({
    isOpen,
    onClose,
    currentSlug,
    onApply,
}: BackgroundShopModalProps) {
    const { points, refreshPoints } = useAuth();
    const [catalog, setCatalog] = useState<CatalogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [purchasingSlug, setPurchasingSlug] = useState<string | null>(null);
    const [applyingSlug, setApplyingSlug] = useState<string | null>(null);

    const loadCatalog = useCallback(async () => {
        try {
            const res = await authFetch(API.MINIHOMPY_BG_CATALOG);
            if (res.ok) {
                const data = await res.json();
                setCatalog(data.catalog);
            }
        } catch {
            toast.error("배경 목록 로드 실패");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) loadCatalog();
    }, [isOpen, loadCatalog]);

    const handlePurchase = async (bg: CatalogItem) => {
        if (points < bg.price) {
            toast.error("포인트가 부족합니다");
            return;
        }

        setPurchasingSlug(bg.slug);
        try {
            const res = await authFetch(API.MINIHOMPY_BG_PURCHASE, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ slug: bg.slug }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "구매 실패");
            }

            await refreshPoints();
            setCatalog(prev => prev.map(item =>
                item.slug === bg.slug ? { ...item, owned: true } : item
            ));
            toast.success(`${bg.name} 배경을 구매했습니다!`);

            // 구매 후 자동 적용
            await handleApply(bg.slug);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "구매에 실패했습니다");
        } finally {
            setPurchasingSlug(null);
        }
    };

    const handleApply = async (slug: string) => {
        setApplyingSlug(slug);
        try {
            await onApply(slug);
        } finally {
            setApplyingSlug(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="bg-shop-title"
        >
            <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-h-[80vh] flex flex-col">
                {/* 헤더 */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-violet-500" />
                        <h2 id="bg-shop-title" className="text-lg font-bold text-gray-800 dark:text-white">
                            배경 꾸미기
                        </h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            보유: <span className="text-violet-600 dark:text-violet-400 font-bold">{formatPoints(points)}</span>
                        </span>
                        <button
                            onClick={onClose}
                            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>
                </div>

                {/* 카탈로그 */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            {catalog.map((bg) => {
                                const isCurrentBg = currentSlug === bg.slug;
                                const isPurchasing = purchasingSlug === bg.slug;
                                const isApplying = applyingSlug === bg.slug;

                                return (
                                    <div
                                        key={bg.id}
                                        className={cn(
                                            "relative rounded-xl overflow-hidden border-2 transition-all",
                                            isCurrentBg
                                                ? "border-violet-500 shadow-lg shadow-violet-500/20"
                                                : "border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                                        )}
                                    >
                                        {/* 배경 미리보기 */}
                                        <div
                                            className="h-24 relative"
                                            style={{ background: bg.cssBackground }}
                                        >
                                            {isCurrentBg && (
                                                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center">
                                                    <Check className="w-3 h-3 text-white" />
                                                </div>
                                            )}
                                            {bg.category === "special" && (
                                                <div className="absolute top-1.5 left-1.5">
                                                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                                </div>
                                            )}
                                        </div>

                                        {/* 정보 + 버튼 */}
                                        <div className="p-2 bg-white dark:bg-gray-800">
                                            <p className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">
                                                {bg.name}
                                            </p>
                                            {bg.description && (
                                                <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                                                    {bg.description}
                                                </p>
                                            )}

                                            <div className="mt-1.5">
                                                {bg.owned ? (
                                                    isCurrentBg ? (
                                                        <div className="text-center text-[10px] py-1 text-violet-600 dark:text-violet-400 font-medium">
                                                            적용 중
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleApply(bg.slug)}
                                                            disabled={!!applyingSlug}
                                                            className={cn(
                                                                "w-full py-1 rounded-lg text-[10px] font-medium transition-colors",
                                                                "bg-violet-100 dark:bg-violet-900/20",
                                                                "text-violet-600 dark:text-violet-300",
                                                                "hover:bg-violet-200 dark:hover:bg-violet-900/30"
                                                            )}
                                                        >
                                                            {isApplying ? (
                                                                <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                                                            ) : (
                                                                "적용하기"
                                                            )}
                                                        </button>
                                                    )
                                                ) : (
                                                    <button
                                                        onClick={() => handlePurchase(bg)}
                                                        disabled={!!purchasingSlug || points < bg.price}
                                                        className={cn(
                                                            "w-full py-1 rounded-lg text-[10px] font-medium transition-colors",
                                                            points >= bg.price
                                                                ? "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/30"
                                                                : "bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                                                        )}
                                                    >
                                                        {isPurchasing ? (
                                                            <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                                                        ) : (
                                                            `${formatPoints(bg.price)} 구매`
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
