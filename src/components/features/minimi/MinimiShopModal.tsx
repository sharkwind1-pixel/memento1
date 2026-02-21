/**
 * MinimiShopModal.tsx
 * 미니미 상점 - 캐릭터/악세서리 구매
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
import MinimiRenderer from "./MinimiRenderer";
import type { PixelData, MinimiCategory } from "@/types";

interface MinimiShopModalProps {
    isOpen: boolean;
    onClose: () => void;
    ownedCharacters?: string[];
    ownedAccessories?: string[];
    onPurchased?: () => void;
}

interface CatalogCharacter {
    id: string;
    slug: string;
    name: string;
    category: MinimiCategory;
    pixelData: PixelData;
    price: number;
    resellPrice: number;
    description?: string;
}

interface CatalogAccessory {
    id: string;
    slug: string;
    name: string;
    category: string;
    pixelData: PixelData;
    price: number;
    resellPrice: number;
    description?: string;
}

type FilterCategory = "all" | "dog" | "cat" | "other" | "accessory";

const FILTER_LABELS: Record<FilterCategory, string> = {
    all: "전체",
    dog: "강아지",
    cat: "고양이",
    other: "기타",
    accessory: "악세서리",
};

export default function MinimiShopModal({
    isOpen,
    onClose,
    ownedCharacters = [],
    ownedAccessories = [],
    onPurchased,
}: MinimiShopModalProps) {
    const { points, refreshPoints } = useAuth();
    useEscapeClose(isOpen, onClose);
    const [selectedFilter, setSelectedFilter] = useState<FilterCategory>("all");
    const [characters, setCharacters] = useState<CatalogCharacter[]>([]);
    const [accessories, setAccessories] = useState<CatalogAccessory[]>([]);
    const [purchasingId, setPurchasingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);
        fetch(API.MINIMI_CATALOG)
            .then(res => res.json())
            .then(data => {
                setCharacters(data.characters || []);
                setAccessories(data.accessories || []);
            })
            .catch(() => toast.error("카탈로그를 불러오지 못했습니다"))
            .finally(() => setLoading(false));
    }, [isOpen]);

    if (!isOpen) return null;

    const handlePurchase = async (type: "character" | "accessory", slug: string, name: string, price: number) => {
        if (points < price) {
            toast.error("포인트가 부족합니다");
            return;
        }

        setPurchasingId(slug);
        try {
            const res = await authFetch(API.MINIMI_PURCHASE, {
                method: "POST",
                body: JSON.stringify({ type, itemSlug: slug }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "구매 실패");
            }
            await refreshPoints();
            onPurchased?.();
            toast.success(`${name}을(를) 구매했습니다!`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "구매에 실패했습니다");
        } finally {
            setPurchasingId(null);
        }
    };

    const filteredCharacters = selectedFilter === "accessory"
        ? []
        : selectedFilter === "all"
            ? characters
            : characters.filter(c => c.category === selectedFilter);

    const showAccessories = selectedFilter === "all" || selectedFilter === "accessory";

    return (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-end sm:items-center justify-center">
            <div
                className="w-full sm:max-w-lg sm:mx-4 bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[calc(100vh-140px)] sm:max-h-[85vh] flex flex-col mb-[80px] sm:mb-0"
                role="dialog"
                aria-modal="true"
                aria-labelledby="minimi-shop-title"
            >
                {/* 헤더 */}
                <div className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 p-5 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                <ShoppingBag className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 id="minimi-shop-title" className="text-lg font-bold">미니미 상점</h2>
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
                <div className="flex gap-2 p-4 border-b dark:border-gray-700 overflow-x-auto">
                    {(Object.keys(FILTER_LABELS) as FilterCategory[]).map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedFilter(cat)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
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
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <span className="w-6 h-6 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* 캐릭터 */}
                            {filteredCharacters.length > 0 && (
                                <div>
                                    {selectedFilter === "all" && (
                                        <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1.5">
                                            <Sparkles className="w-4 h-4" />
                                            캐릭터
                                        </h3>
                                    )}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {filteredCharacters.map((char) => {
                                            const owned = ownedCharacters.includes(char.slug);
                                            const canAfford = points >= char.price;
                                            const isPurchasing = purchasingId === char.slug;

                                            return (
                                                <div
                                                    key={char.slug}
                                                    className={`relative p-3 rounded-2xl border transition-all text-center ${
                                                        owned
                                                            ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20"
                                                            : "border-gray-200 dark:border-gray-700 hover:border-emerald-300 hover:shadow-md"
                                                    }`}
                                                >
                                                    {owned && (
                                                        <div className="absolute top-2 right-2">
                                                            <span className="px-1.5 py-0.5 bg-emerald-500 text-white rounded-full text-[10px] font-bold">
                                                                보유
                                                            </span>
                                                        </div>
                                                    )}

                                                    <div className="flex justify-center py-2">
                                                        <MinimiRenderer
                                                            pixelData={char.pixelData}
                                                            size="xl"
                                                        />
                                                    </div>

                                                    <p className="font-bold text-sm text-gray-800 dark:text-gray-100 mt-1">
                                                        {char.name}
                                                    </p>
                                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                                        {char.description}
                                                    </p>

                                                    <div className="mt-2">
                                                        {owned ? (
                                                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                                                보유중
                                                            </span>
                                                        ) : (
                                                            <>
                                                                <p className={`text-sm font-bold mb-1.5 ${canAfford ? "text-emerald-600" : "text-gray-400"}`}>
                                                                    {char.price}P
                                                                </p>
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => handlePurchase("character", char.slug, char.name, char.price)}
                                                                    disabled={!canAfford || isPurchasing}
                                                                    className={`w-full rounded-xl text-xs ${
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

                            {/* 악세서리 */}
                            {showAccessories && accessories.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1.5">
                                        <Sparkles className="w-4 h-4" />
                                        악세서리
                                    </h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {accessories.map((acc) => {
                                            const owned = ownedAccessories.includes(acc.slug);
                                            const canAfford = points >= acc.price;
                                            const isPurchasing = purchasingId === acc.slug;

                                            return (
                                                <div
                                                    key={acc.slug}
                                                    className={`relative p-3 rounded-2xl border transition-all text-center ${
                                                        owned
                                                            ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20"
                                                            : "border-gray-200 dark:border-gray-700 hover:border-emerald-300 hover:shadow-md"
                                                    }`}
                                                >
                                                    {owned && (
                                                        <div className="absolute top-2 right-2">
                                                            <span className="px-1.5 py-0.5 bg-emerald-500 text-white rounded-full text-[10px] font-bold">
                                                                보유
                                                            </span>
                                                        </div>
                                                    )}

                                                    <div className="flex justify-center py-2">
                                                        <MinimiRenderer
                                                            pixelData={acc.pixelData}
                                                            size="lg"
                                                        />
                                                    </div>

                                                    <p className="font-bold text-sm text-gray-800 dark:text-gray-100 mt-1">
                                                        {acc.name}
                                                    </p>

                                                    <div className="mt-2">
                                                        {owned ? (
                                                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                                                보유중
                                                            </span>
                                                        ) : (
                                                            <>
                                                                <p className={`text-sm font-bold mb-1.5 ${canAfford ? "text-emerald-600" : "text-gray-400"}`}>
                                                                    {acc.price}P
                                                                </p>
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => handlePurchase("accessory", acc.slug, acc.name, acc.price)}
                                                                    disabled={!canAfford || isPurchasing}
                                                                    className={`w-full rounded-xl text-xs ${
                                                                        canAfford
                                                                            ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                                                                            : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                                                                    }`}
                                                                >
                                                                    {isPurchasing ? (
                                                                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
                        </div>
                    )}
                </div>

                {/* 하단 안내 */}
                <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <p className="text-xs text-gray-400 text-center">
                        구매한 미니미는 영구 소유이며, {Math.round(MINIMI.RESELL_RATIO * 100)}% 가격에 되팔기 가능합니다.
                    </p>
                </div>
            </div>
        </div>
    );
}
