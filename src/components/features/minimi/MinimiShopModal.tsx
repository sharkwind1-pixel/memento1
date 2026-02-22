/**
 * MinimiShopModal.tsx
 * 미니미 상점 - 캐릭터 구매
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    X,
    ShoppingBag,
    Check,
    AlertCircle,
    Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";
import { MINIMI } from "@/config/constants";
import { toast } from "sonner";
import Image from "next/image";
import type { MinimiCategory } from "@/types";

interface MinimiShopModalProps {
    isOpen: boolean;
    onClose: () => void;
    ownedCharacters?: string[];
    onPurchased?: () => void;
}

interface CatalogCharacter {
    id: string;
    slug: string;
    name: string;
    category: MinimiCategory;
    imageUrl?: string;
    price: number;
    resellPrice: number;
    description?: string;
}

type FilterCategory = "all" | "dog" | "cat" | "other";

const FILTER_LABELS: Record<FilterCategory, string> = {
    all: "전체",
    dog: "강아지",
    cat: "고양이",
    other: "기타",
};

export default function MinimiShopModal({
    isOpen,
    onClose,
    ownedCharacters = [],
    onPurchased,
}: MinimiShopModalProps) {
    const { points, refreshPoints } = useAuth();
    useEscapeClose(isOpen, onClose);
    const [selectedFilter, setSelectedFilter] = useState<FilterCategory>("all");
    const [characters, setCharacters] = useState<CatalogCharacter[]>([]);
    const [purchasingId, setPurchasingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [purchaseConfirm, setPurchaseConfirm] = useState<{ slug: string; name: string; price: number } | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);
        fetch(API.MINIMI_CATALOG)
            .then(res => res.json())
            .then(data => {
                setCharacters(data.characters || []);
            })
            .catch(() => toast.error("카탈로그를 불러오지 못했습니다"))
            .finally(() => setLoading(false));
    }, [isOpen]);

    if (!isOpen) return null;

    const handlePurchaseConfirm = (slug: string, name: string, price: number) => {
        if (points < price) {
            toast.error("포인트가 부족합니다");
            return;
        }
        setPurchaseConfirm({ slug, name, price });
    };

    const handlePurchase = async () => {
        if (!purchaseConfirm) return;
        const { slug, name, price } = purchaseConfirm;
        setPurchaseConfirm(null);
        setPurchasingId(slug);
        try {
            const res = await authFetch(API.MINIMI_PURCHASE, {
                method: "POST",
                body: JSON.stringify({ type: "character", itemSlug: slug }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "구매 실패");
            }
            // 구매 후 자동 장착
            try {
                await authFetch(API.MINIMI_EQUIP, {
                    method: "POST",
                    body: JSON.stringify({ minimiSlug: slug }),
                });
            } catch { /* 장착 실패해도 구매는 성공 */ }
            await refreshPoints();
            onPurchased?.();
            toast.success(`${name}을(를) 구매하고 장착했습니다!`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "구매에 실패했습니다");
        } finally {
            setPurchasingId(null);
        }
    };

    const filteredCharacters = selectedFilter === "all"
        ? characters
        : characters.filter(c => c.category === selectedFilter);

    return (
        <div
            className="fixed inset-0 z-[9999] overflow-y-auto bg-black/50"
            style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="min-h-full flex items-start justify-center pt-16 pb-20 px-4">
                <div
                    className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-2xl shadow-2xl relative"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="minimi-shop-title"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* 헤더 - sticky */}
                    <div className="sticky top-0 z-10 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 px-4 py-2.5 text-white rounded-t-2xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ShoppingBag className="w-5 h-5" />
                                <div>
                                    <h2 id="minimi-shop-title" className="text-sm font-bold leading-tight">미니미 상점</h2>
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
                    <div className="flex items-center gap-1.5 px-3 py-2 border-b dark:border-gray-700 overflow-x-auto">
                        {(Object.keys(FILTER_LABELS) as FilterCategory[]).map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedFilter(cat)}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap leading-tight ${
                                    selectedFilter === cat
                                        ? "bg-emerald-500 text-white"
                                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
                                }`}
                            >
                                {FILTER_LABELS[cat]}
                            </button>
                        ))}
                    </div>

                    {/* 상품 목록 */}
                    <div className="p-3">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <span className="w-6 h-6 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredCharacters.length > 0 && (
                                    <div>
                                        {selectedFilter === "all" && (
                                            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                                                <Sparkles className="w-3.5 h-3.5" />
                                                캐릭터
                                            </h3>
                                        )}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                            {filteredCharacters.map((char) => {
                                                const owned = ownedCharacters.includes(char.slug);
                                                const canAfford = points >= char.price;
                                                const isPurchasing = purchasingId === char.slug;

                                                return (
                                                    <div
                                                        key={char.slug}
                                                        className={`relative p-2.5 rounded-xl border transition-all text-center flex flex-col ${
                                                            owned
                                                                ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20"
                                                                : "border-gray-200 dark:border-gray-700 hover:border-emerald-300 hover:shadow-md"
                                                        }`}
                                                    >
                                                        {owned && (
                                                            <div className="absolute top-1.5 right-1.5">
                                                                <span className="px-1.5 py-0.5 bg-emerald-500 text-white rounded-full text-[10px] font-bold">
                                                                    보유
                                                                </span>
                                                            </div>
                                                        )}

                                                        <div className="flex justify-center items-center py-1 h-[72px]">
                                                            {char.imageUrl ? (
                                                                <Image
                                                                    src={char.imageUrl}
                                                                    alt={char.name}
                                                                    width={64}
                                                                    height={64}
                                                                    className="object-contain"
                                                                    style={{ imageRendering: "pixelated" }}
                                                                />
                                                            ) : (
                                                                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                                                                    <span className="text-gray-400 text-xl">?</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <p className="font-bold text-xs text-gray-800 dark:text-gray-100 mt-0.5">
                                                            {char.name}
                                                        </p>
                                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 flex-1 leading-tight">
                                                            {char.description}
                                                        </p>

                                                        <div className="mt-auto pt-1.5">
                                                            {owned ? (
                                                                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                                                    보유중
                                                                </span>
                                                            ) : (
                                                                <>
                                                                    <p className={`text-xs font-bold mb-1 ${canAfford ? "text-emerald-600" : "text-gray-400"}`}>
                                                                        {char.price}P
                                                                    </p>
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => handlePurchaseConfirm(char.slug, char.name, char.price)}
                                                                        disabled={!canAfford || isPurchasing}
                                                                        className={`w-full rounded-lg text-[11px] h-7 ${
                                                                            canAfford
                                                                                ? "bg-emerald-500 hover:bg-emerald-600 text-white"
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
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {filteredCharacters.length === 0 && (
                                    <p className="text-center text-gray-400 py-8 text-xs">
                                        등록된 캐릭터가 없습니다
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 하단 안내 - sticky */}
                    <div className="sticky bottom-0 z-10 px-3 py-2 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-b-2xl">
                        <p className="text-[10px] text-gray-400 text-center">
                            구매한 미니미는 영구 소유이며, {Math.round(MINIMI.RESELL_RATIO * 100)}% 가격에 되팔기 가능합니다.
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
                                    <strong>{purchaseConfirm.name}</strong>을(를) 구매하시겠습니까?
                                </p>
                                <p className="text-center mt-1">
                                    <span className="text-red-500 font-bold text-sm">-{purchaseConfirm.price}P</span>
                                    <span className="text-[10px] text-gray-400 ml-1">차감</span>
                                </p>
                                <div className="flex gap-2 mt-3">
                                    <Button
                                        variant="outline"
                                        onClick={() => setPurchaseConfirm(null)}
                                        className="flex-1 rounded-lg text-xs h-8"
                                    >
                                        취소
                                    </Button>
                                    <Button
                                        onClick={handlePurchase}
                                        disabled={purchasingId === purchaseConfirm.slug}
                                        className="flex-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs h-8"
                                    >
                                        {purchasingId === purchaseConfirm.slug ? (
                                            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            "구매"
                                        )}
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
