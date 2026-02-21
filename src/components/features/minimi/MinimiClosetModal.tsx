/**
 * MinimiClosetModal.tsx
 * 내 미니미 옷장 - 보유 아이템 관리, 장착/해제, 되팔기
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
    X,
    Shirt,
    Check,
    Trash2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";
import { MINIMI } from "@/config/constants";
import { toast } from "sonner";
import Image from "next/image";
import { CHARACTER_CATALOG } from "@/data/minimiPixels";

interface MinimiClosetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onChanged?: () => void;
}

interface OwnedItem {
    slug: string;
    name: string;
    imageUrl?: string;
    displayScale?: number;
    price: number;
    resellPrice: number;
}

export default function MinimiClosetModal({
    isOpen,
    onClose,
    onChanged,
}: MinimiClosetModalProps) {
    const { refreshPoints } = useAuth();
    useEscapeClose(isOpen, onClose);

    const [ownedCharacters, setOwnedCharacters] = useState<OwnedItem[]>([]);
    const [equippedMinimiSlug, setEquippedMinimiSlug] = useState<string | null>(null);
    const [equippedImageUrl, setEquippedImageUrl] = useState<string | null>(null);
    const [equippedDisplayScale, setEquippedDisplayScale] = useState<number>(1.0);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [sellConfirm, setSellConfirm] = useState<{ type: "character"; slug: string; name: string; resellPrice: number } | null>(null);

    const loadInventory = useCallback(async () => {
        try {
            const res = await authFetch(API.MINIMI_INVENTORY);
            if (!res.ok) return;
            const data = await res.json();

            // 캐릭터 매핑
            const chars: OwnedItem[] = (data.characters || []).map((c: { minimi_id: string }) => {
                const catalog = CHARACTER_CATALOG.find(cat => cat.slug === c.minimi_id);
                return catalog ? {
                    slug: catalog.slug,
                    name: catalog.name,
                    imageUrl: catalog.imageUrl,
                    displayScale: catalog.displayScale,
                    price: catalog.price,
                    resellPrice: Math.ceil(catalog.price * MINIMI.RESELL_RATIO),
                } : null;
            }).filter(Boolean) as OwnedItem[];

            setOwnedCharacters(chars);

            // 장착 상태
            const eq = data.equipped;
            const eqSlug = eq?.minimiId || null;
            const eqCatalog = eqSlug ? CHARACTER_CATALOG.find(c => c.slug === eqSlug) : null;
            setEquippedMinimiSlug(eqSlug);
            setEquippedImageUrl(eqCatalog?.imageUrl || eq?.imageUrl || null);
            setEquippedDisplayScale(eqCatalog?.displayScale ?? 1.0);
        } catch {
            // 에러 무시
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            loadInventory();
        }
    }, [isOpen, loadInventory]);

    if (!isOpen) return null;

    const handleEquip = async (slug: string) => {
        setActionLoading(slug);
        try {
            const newMinimiSlug = equippedMinimiSlug === slug ? null : slug;
            const res = await authFetch(API.MINIMI_EQUIP, {
                method: "POST",
                body: JSON.stringify({
                    minimiSlug: newMinimiSlug,
                }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }
            const data = await res.json();
            const newSlug = data.equipped.minimiId;
            const newCatalog = newSlug ? CHARACTER_CATALOG.find(c => c.slug === newSlug) : null;
            setEquippedMinimiSlug(newSlug);
            setEquippedImageUrl(newCatalog?.imageUrl || data.equipped.imageUrl || null);
            setEquippedDisplayScale(newCatalog?.displayScale ?? 1.0);
            onChanged?.();
            toast.success(newMinimiSlug ? "미니미를 장착했습니다" : "미니미를 해제했습니다");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "장착에 실패했습니다");
        } finally {
            setActionLoading(null);
        }
    };

    const handleSell = async () => {
        if (!sellConfirm) return;
        setActionLoading(sellConfirm.slug);
        try {
            const res = await authFetch(API.MINIMI_SELL, {
                method: "POST",
                body: JSON.stringify({ type: sellConfirm.type, itemSlug: sellConfirm.slug }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }
            const data = await res.json();
            toast.success(data.message);
            await refreshPoints();
            setSellConfirm(null);
            loadInventory();
            onChanged?.();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "되팔기에 실패했습니다");
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-end sm:items-center justify-center">
            <div
                className="w-full sm:max-w-lg sm:mx-4 bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[calc(100vh-140px)] sm:max-h-[85vh] flex flex-col mb-[80px] sm:mb-0"
                role="dialog"
                aria-modal="true"
                aria-labelledby="minimi-closet-title"
            >
                {/* 헤더 */}
                <div className="bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 p-5 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                <Shirt className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 id="minimi-closet-title" className="text-lg font-bold">내 미니미 옷장</h2>
                                <p className="text-white/80 text-sm">
                                    보유 캐릭터 {ownedCharacters.length}개
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

                {/* 현재 장착 미리보기 */}
                <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                    <div className="text-center">
                        {equippedImageUrl ? (
                            <Image
                                src={equippedImageUrl}
                                alt="장착중인 미니미"
                                width={Math.round(80 * equippedDisplayScale)}
                                height={Math.round(80 * equippedDisplayScale)}
                                className="object-contain mx-auto"
                                style={{ imageRendering: "pixelated" }}
                            />
                        ) : (
                            <div className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center mx-auto">
                                <span className="text-gray-400 dark:text-gray-500 text-2xl">?</span>
                            </div>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {equippedMinimiSlug ? "현재 장착중" : "미니미를 장착해보세요"}
                        </p>
                    </div>
                </div>

                {/* 캐릭터 목록 */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <span className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
                        </div>
                    ) : ownedCharacters.length === 0 ? (
                        <p className="text-center text-gray-400 py-12 text-sm">
                            보유한 캐릭터가 없습니다
                        </p>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {ownedCharacters.map((char) => {
                                const isEquipped = equippedMinimiSlug === char.slug;
                                const isLoading = actionLoading === char.slug;

                                return (
                                    <div
                                        key={char.slug}
                                        className={`relative p-3 rounded-2xl border transition-all text-center ${
                                            isEquipped
                                                ? "border-violet-400 bg-violet-50 dark:bg-violet-900/20 ring-2 ring-violet-300"
                                                : "border-gray-200 dark:border-gray-700"
                                        }`}
                                    >
                                        <div className="flex justify-center items-center py-2 h-[88px]">
                                            {char.imageUrl ? (
                                                <Image
                                                    src={char.imageUrl}
                                                    alt={char.name}
                                                    width={Math.round(80 * (char.displayScale ?? 1))}
                                                    height={Math.round(80 * (char.displayScale ?? 1))}
                                                    className="object-contain"
                                                    style={{ imageRendering: "pixelated" }}
                                                />
                                            ) : (
                                                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                                                    <span className="text-gray-400 text-2xl">?</span>
                                                </div>
                                            )}
                                        </div>
                                        <p className="font-bold text-sm text-gray-800 dark:text-gray-100">
                                            {char.name}
                                        </p>
                                        <div className="mt-2 space-y-1.5">
                                            <Button
                                                size="sm"
                                                onClick={() => handleEquip(char.slug)}
                                                disabled={isLoading}
                                                className={`w-full rounded-xl text-xs ${
                                                    isEquipped
                                                        ? "bg-violet-500 hover:bg-violet-600 text-white"
                                                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200"
                                                }`}
                                            >
                                                {isLoading ? (
                                                    <span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                                                ) : isEquipped ? (
                                                    <span className="flex items-center gap-1">
                                                        <Check className="w-3 h-3" /> 장착중
                                                    </span>
                                                ) : (
                                                    "장착"
                                                )}
                                            </Button>
                                            <button
                                                onClick={() => setSellConfirm({
                                                    type: "character",
                                                    slug: char.slug,
                                                    name: char.name,
                                                    resellPrice: char.resellPrice,
                                                })}
                                                className="w-full flex items-center justify-center gap-1 text-[11px] text-gray-400 hover:text-red-400 transition-colors py-1"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                                되팔기 ({char.resellPrice}P)
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* 되팔기 확인 다이얼로그 */}
                {sellConfirm && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-2xl">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mx-4 max-w-xs w-full shadow-2xl">
                            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-center">
                                되팔기 확인
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2">
                                <strong>{sellConfirm.name}</strong>을(를) 되팔겠습니까?
                            </p>
                            <p className="text-center mt-1">
                                <span className="text-emerald-600 font-bold">+{sellConfirm.resellPrice}P</span>
                                <span className="text-xs text-gray-400 ml-1">환급</span>
                            </p>
                            <div className="flex gap-2 mt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setSellConfirm(null)}
                                    className="flex-1 rounded-xl"
                                >
                                    취소
                                </Button>
                                <Button
                                    onClick={handleSell}
                                    disabled={actionLoading === sellConfirm.slug}
                                    className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 text-white"
                                >
                                    {actionLoading === sellConfirm.slug ? (
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        "되팔기"
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
