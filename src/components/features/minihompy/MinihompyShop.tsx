/**
 * MinihompyShop.tsx
 * 통합 상점 — 꼬미 / 가구 / 배경을 한 모달에서 전부 구매
 *
 * 구조: 상단 3탭(꼬미/가구/배경) + 각 탭별 구매 그리드
 * - 꼬미: /api/minimi/catalog + /api/minimi/purchase (+ 구매 후 자동 장착)
 * - 가구:  FURNITURE_CATALOG(로컬) + /api/furniture/purchase
 * - 배경:  /api/minihompy/backgrounds + /api/minihompy/backgrounds/purchase
 *
 * "상점"은 오직 구매. 배치/적용은 보관함(편집모드 트레이 / 배경 보관함)에서.
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { X, ShoppingBag, Check, AlertCircle, Loader2, PawPrint, Armchair, Palette } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";
import { FURNITURE_CATALOG, FURNITURE_CATEGORY_LABELS } from "@/data/furnitureCatalog";
import { formatPoints } from "@/lib/points";
import type { MinimiCategory, FurnitureItem, BackgroundTheme } from "@/types";
import Image from "next/image";

type ShopTab = "minimi" | "furniture" | "background";

interface MinihompyShopProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: ShopTab;
    /** 구매 후 부모 데이터 새로고침 (인벤토리/배경 보유 등) */
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

interface BackgroundCatalogItem extends BackgroundTheme {
    owned: boolean;
}

const TAB_META: { key: ShopTab; label: string; Icon: typeof PawPrint }[] = [
    { key: "minimi", label: "꼬미", Icon: PawPrint },
    { key: "furniture", label: "가구", Icon: Armchair },
    { key: "background", label: "배경", Icon: Palette },
];

export default function MinihompyShop({
    isOpen,
    onClose,
    initialTab = "minimi",
    onPurchased,
}: MinihompyShopProps) {
    const { points, refreshPoints } = useAuth();
    useEscapeClose(isOpen, onClose);

    const [tab, setTab] = useState<ShopTab>(initialTab);

    // 꼬미
    const [characters, setCharacters] = useState<CatalogCharacter[]>([]);
    const [ownedMinimi, setOwnedMinimi] = useState<string[]>([]);
    const [loadingMinimi, setLoadingMinimi] = useState(true);

    // 가구
    const [ownedFurnitureCounts, setOwnedFurnitureCounts] = useState<Record<string, number>>({});
    const [loadingFurniture, setLoadingFurniture] = useState(true);

    // 배경
    const [backgrounds, setBackgrounds] = useState<BackgroundCatalogItem[]>([]);
    const [loadingBg, setLoadingBg] = useState(true);

    const [purchasingKey, setPurchasingKey] = useState<string | null>(null);
    const [confirm, setConfirm] = useState<{ kind: ShopTab; slug: string; name: string; price: number } | null>(null);

    useEffect(() => {
        if (isOpen) setTab(initialTab);
    }, [isOpen, initialTab]);

    // 데이터 로드 (모달 열릴 때 3종 병렬)
    const loadAll = useCallback(async () => {
        setLoadingMinimi(true);
        setLoadingFurniture(true);
        setLoadingBg(true);
        refreshPoints();

        // 꼬미 카탈로그 + 보유
        Promise.all([
            fetch(API.MINIMI_CATALOG).then(r => r.json()).catch(() => ({ characters: [] })),
            authFetch(API.MINIMI_INVENTORY).then(r => r.ok ? r.json() : { characters: [] }).catch(() => ({ characters: [] })),
        ]).then(([cat, inv]) => {
            setCharacters(cat.characters || []);
            setOwnedMinimi((inv.characters || []).map((c: { minimi_id: string }) => c.minimi_id));
        }).finally(() => setLoadingMinimi(false));

        // 가구 보유
        authFetch(API.FURNITURE_INVENTORY)
            .then(r => r.ok ? r.json() : { items: [] })
            .then(data => {
                const counts: Record<string, number> = {};
                for (const i of (data.items || [])) {
                    counts[i.furniture_id] = (counts[i.furniture_id] ?? 0) + 1;
                }
                setOwnedFurnitureCounts(counts);
            })
            .catch(() => setOwnedFurnitureCounts({}))
            .finally(() => setLoadingFurniture(false));

        // 배경 카탈로그(보유 포함)
        authFetch(API.MINIHOMPY_BG_CATALOG)
            .then(r => r.ok ? r.json() : { catalog: [] })
            .then(data => setBackgrounds(data.catalog || []))
            .catch(() => setBackgrounds([]))
            .finally(() => setLoadingBg(false));
    }, [refreshPoints]);

    useEffect(() => {
        if (isOpen) loadAll();
    }, [isOpen, loadAll]);

    if (!isOpen) return null;

    const requestPurchase = (kind: ShopTab, slug: string, name: string, price: number) => {
        if (points < price) {
            toast.error("포인트가 부족합니다");
            return;
        }
        setConfirm({ kind, slug, name, price });
    };

    const doPurchase = async () => {
        if (!confirm) return;
        const { kind, slug, name } = confirm;
        setConfirm(null);
        setPurchasingKey(`${kind}:${slug}`);
        try {
            if (kind === "minimi") {
                const res = await authFetch(API.MINIMI_PURCHASE, {
                    method: "POST",
                    body: JSON.stringify({ type: "character", itemSlug: slug }),
                });
                if (!res.ok) throw new Error((await res.json()).error || "구매 실패");
                // 구매 후 자동 장착
                try {
                    await authFetch(API.MINIMI_EQUIP, { method: "POST", body: JSON.stringify({ minimiSlug: slug }) });
                } catch { /* 장착 실패해도 구매는 성공 */ }
                setOwnedMinimi(prev => [...prev, slug]);
                toast.success(`${name}을(를) 구매하고 장착했습니다!`);
            } else if (kind === "furniture") {
                const res = await authFetch(API.FURNITURE_PURCHASE, {
                    method: "POST",
                    body: JSON.stringify({ furnitureSlug: slug }),
                });
                if (!res.ok) throw new Error((await res.json()).error || "구매 실패");
                setOwnedFurnitureCounts(prev => ({ ...prev, [slug]: (prev[slug] ?? 0) + 1 }));
                toast.success(`${name}을(를) 구매했습니다!`);
            } else {
                const res = await authFetch(API.MINIHOMPY_BG_PURCHASE, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ slug }),
                });
                if (!res.ok) throw new Error((await res.json()).error || "구매 실패");
                setBackgrounds(prev => prev.map(b => b.slug === slug ? { ...b, owned: true } : b));
                toast.success(`${name} 배경을 구매했습니다! 보관함에서 적용할 수 있어요.`);
            }
            await refreshPoints();
            onPurchased?.();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "구매에 실패했습니다");
        } finally {
            setPurchasingKey(null);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[9999] overflow-y-auto bg-black/50"
            style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="min-h-full flex items-start justify-center pt-12 pb-20 px-4">
                <div
                    className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-2xl shadow-2xl relative"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="minihompy-shop-title"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* 헤더 */}
                    <div className="sticky top-0 z-10 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 px-4 py-2.5 text-white rounded-t-2xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ShoppingBag className="w-5 h-5" />
                                <div>
                                    <h2 id="minihompy-shop-title" className="text-sm font-bold leading-tight">상점</h2>
                                    <p className="text-white/80 text-[11px]">보유: {formatPoints(points)}</p>
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

                    {/* 탭 */}
                    <div className="flex items-center gap-1.5 px-3 py-2 border-b dark:border-gray-700">
                        {TAB_META.map(({ key, label, Icon }) => (
                            <button
                                key={key}
                                onClick={() => setTab(key)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                                    tab === key
                                        ? "bg-emerald-500 text-white"
                                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
                                )}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* 본문 */}
                    <div className="p-3">
                        {tab === "minimi" && (
                            loadingMinimi ? <ShopLoader /> : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                    {characters.map((char) => {
                                        const owned = ownedMinimi.includes(char.slug);
                                        const canAfford = points >= char.price;
                                        const isBusy = purchasingKey === `minimi:${char.slug}`;
                                        return (
                                            <ShopCard
                                                key={char.slug}
                                                imageUrl={char.imageUrl}
                                                name={char.name}
                                                description={char.description}
                                                price={char.price}
                                                owned={owned}
                                                ownedLabel="보유"
                                                canAfford={canAfford}
                                                isBusy={isBusy}
                                                accent="emerald"
                                                onBuy={() => requestPurchase("minimi", char.slug, char.name, char.price)}
                                                allowRebuy={false}
                                            />
                                        );
                                    })}
                                    {characters.length === 0 && <ShopEmpty text="등록된 캐릭터가 없습니다" />}
                                </div>
                            )
                        )}

                        {tab === "furniture" && (
                            loadingFurniture ? <ShopLoader /> : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                    {FURNITURE_CATALOG.map((item: FurnitureItem) => {
                                        const count = ownedFurnitureCounts[item.slug] ?? 0;
                                        const canAfford = points >= item.price;
                                        const isBusy = purchasingKey === `furniture:${item.slug}`;
                                        return (
                                            <ShopCard
                                                key={item.slug}
                                                imageUrl={item.imageUrl}
                                                name={item.name}
                                                description={item.description}
                                                badge={FURNITURE_CATEGORY_LABELS[item.category]}
                                                price={item.price}
                                                owned={count > 0}
                                                ownedLabel={count > 1 ? `x${count}` : "보유"}
                                                canAfford={canAfford}
                                                isBusy={isBusy}
                                                accent="amber"
                                                onBuy={() => requestPurchase("furniture", item.slug, item.name, item.price)}
                                                allowRebuy
                                            />
                                        );
                                    })}
                                    {FURNITURE_CATALOG.length === 0 && <ShopEmpty text="등록된 가구가 없습니다" />}
                                </div>
                            )
                        )}

                        {tab === "background" && (
                            loadingBg ? <ShopLoader /> : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                    {backgrounds.filter(bg => bg.price > 0).map((bg) => {
                                        const canAfford = points >= bg.price;
                                        const isBusy = purchasingKey === `background:${bg.slug}`;
                                        return (
                                            <BgShopCard
                                                key={bg.slug}
                                                bg={bg}
                                                owned={bg.owned}
                                                canAfford={canAfford}
                                                isBusy={isBusy}
                                                onBuy={() => requestPurchase("background", bg.slug, bg.name, bg.price)}
                                            />
                                        );
                                    })}
                                </div>
                            )
                        )}
                    </div>

                    {/* 하단 안내 */}
                    <div className="sticky bottom-0 z-10 px-3 py-2 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-b-2xl">
                        <p className="text-[10px] text-gray-400 text-center">
                            구매한 아이템은 보관함에서 배치·적용할 수 있어요.
                        </p>
                    </div>

                    {/* 구매 확인 */}
                    {confirm && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]">
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 mx-4 max-w-xs w-full shadow-2xl">
                                <h3 className="font-bold text-sm text-gray-800 dark:text-gray-100 text-center">구매 확인</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1.5">
                                    <strong>{confirm.name}</strong>을(를) 구매하시겠습니까?
                                </p>
                                <p className="text-center mt-1">
                                    <span className="text-red-500 font-bold text-sm">-{formatPoints(confirm.price)}</span>
                                </p>
                                <div className="flex gap-2 mt-4">
                                    <button
                                        className="flex-1 py-2 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                                        onClick={() => setConfirm(null)}
                                    >
                                        취소
                                    </button>
                                    <button
                                        className="flex-1 py-2 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white"
                                        onClick={doPurchase}
                                    >
                                        구매하기
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// 서브 컴포넌트
// ============================================================================

function ShopLoader() {
    return (
        <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
        </div>
    );
}

function ShopEmpty({ text }: { text: string }) {
    return <p className="col-span-full text-center text-gray-400 py-8 text-xs">{text}</p>;
}

function ShopCard({
    imageUrl, name, description, badge, price, owned, ownedLabel, canAfford, isBusy, accent, onBuy, allowRebuy,
}: {
    imageUrl?: string;
    name: string;
    description?: string;
    badge?: string;
    price: number;
    owned: boolean;
    ownedLabel: string;
    canAfford: boolean;
    isBusy: boolean;
    accent: "emerald" | "amber";
    onBuy: () => void;
    allowRebuy: boolean;
}) {
    const accentBtn = accent === "amber"
        ? "bg-amber-500 hover:bg-amber-600"
        : "bg-emerald-500 hover:bg-emerald-600";
    const accentBadge = accent === "amber" ? "bg-amber-500" : "bg-emerald-500";
    const accentBorder = accent === "amber"
        ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20"
        : "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20";

    return (
        <div className={cn(
            "relative p-2.5 rounded-xl border transition-all text-center flex flex-col",
            owned ? accentBorder : "border-gray-200 dark:border-gray-700 hover:shadow-md"
        )}>
            {owned && (
                <div className="absolute top-1.5 right-1.5">
                    <span className={cn("px-1.5 py-0.5 text-white rounded-full text-[10px] font-bold", accentBadge)}>
                        {ownedLabel}
                    </span>
                </div>
            )}
            <div className="flex justify-center items-center py-1 h-[72px]">
                {imageUrl ? (
                    <Image src={imageUrl} alt={name} width={64} height={64} className="object-contain" style={{ imageRendering: "pixelated" }} />
                ) : (
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                        <span className="text-gray-400 text-xl">?</span>
                    </div>
                )}
            </div>
            <p className="font-bold text-xs text-gray-800 dark:text-gray-100 mt-0.5">{name}</p>
            {description && <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 flex-1 leading-tight">{description}</p>}
            {badge && <p className="text-[9px] text-gray-400 mt-0.5">{badge}</p>}

            <div className="mt-auto pt-1.5">
                {owned && !allowRebuy ? (
                    <span className={cn("text-[11px] font-medium", accent === "amber" ? "text-amber-600" : "text-emerald-600")}>
                        보유중
                    </span>
                ) : (
                    <>
                        <p className={cn("text-xs font-bold mb-1", canAfford ? (accent === "amber" ? "text-amber-600" : "text-emerald-600") : "text-gray-400")}>
                            {formatPoints(price)}
                        </p>
                        <button
                            onClick={onBuy}
                            disabled={!canAfford || isBusy}
                            className={cn(
                                "w-full rounded-lg text-[11px] h-7 flex items-center justify-center gap-1 font-medium text-white transition-colors",
                                canAfford ? accentBtn : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                            )}
                        >
                            {isBusy ? (
                                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : !canAfford ? (
                                <><AlertCircle className="w-3 h-3" /> 부족</>
                            ) : owned && allowRebuy ? (
                                <><ShoppingBag className="w-3 h-3" /> 추가 구매</>
                            ) : (
                                <><Check className="w-3 h-3" /> 구매</>
                            )}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

function BgShopCard({
    bg, owned, canAfford, isBusy, onBuy,
}: {
    bg: BackgroundCatalogItem;
    owned: boolean;
    canAfford: boolean;
    isBusy: boolean;
    onBuy: () => void;
}) {
    return (
        <div className={cn(
            "relative rounded-xl overflow-hidden border transition-all flex flex-col",
            owned ? "border-violet-300 dark:border-violet-700" : "border-gray-200 dark:border-gray-700 hover:shadow-md"
        )}>
            <div
                className="h-20 relative"
                style={{
                    background: bg.imageUrl ? undefined : bg.cssBackground,
                    backgroundImage: bg.imageUrl ? `url(${bg.imageUrl})` : undefined,
                    backgroundSize: bg.imageUrl ? "cover" : undefined,
                    backgroundPosition: bg.imageUrl ? "center" : undefined,
                }}
            >
                {owned && (
                    <div className="absolute top-1.5 right-1.5">
                        <span className="px-1.5 py-0.5 bg-violet-500 text-white rounded-full text-[10px] font-bold">보유</span>
                    </div>
                )}
            </div>
            <div className="p-2 bg-white dark:bg-gray-800 flex flex-col flex-1">
                <p className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate">{bg.name}</p>
                {bg.description && <p className="text-[10px] text-gray-400 truncate mt-0.5">{bg.description}</p>}
                <div className="mt-auto pt-1.5">
                    {owned ? (
                        <span className="text-[11px] text-violet-600 dark:text-violet-400 font-medium">보유중</span>
                    ) : (
                        <>
                            <p className={cn("text-xs font-bold mb-1", canAfford ? "text-violet-600" : "text-gray-400")}>
                                {formatPoints(bg.price)}
                            </p>
                            <button
                                onClick={onBuy}
                                disabled={!canAfford || isBusy}
                                className={cn(
                                    "w-full rounded-lg text-[11px] h-7 flex items-center justify-center gap-1 font-medium text-white transition-colors",
                                    canAfford ? "bg-violet-500 hover:bg-violet-600" : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                                )}
                            >
                                {isBusy ? (
                                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : !canAfford ? (
                                    <><AlertCircle className="w-3 h-3" /> 부족</>
                                ) : (
                                    <><Check className="w-3 h-3" /> 구매</>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
