/**
 * MinimiPlacementPicker.tsx
 * 보유 캐릭터 중 미배치 캐릭터를 선택하여 스테이지에 추가
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Loader2, Plus } from "lucide-react";
import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";
import { CHARACTER_CATALOG } from "@/data/minimiPixels";
import type { PlacedMinimi } from "@/types";
import Image from "next/image";

interface MinimiPlacementPickerProps {
    isOpen: boolean;
    onClose: () => void;
    placedMinimi: PlacedMinimi[];
    onSelect: (slug: string) => void;
}

interface OwnedChar {
    slug: string;
    name: string;
    imageUrl: string;
}

export default function MinimiPlacementPicker({
    isOpen,
    onClose,
    placedMinimi,
    onSelect,
}: MinimiPlacementPickerProps) {
    const [owned, setOwned] = useState<OwnedChar[]>([]);
    const [loading, setLoading] = useState(false);

    const loadOwned = useCallback(async () => {
        setLoading(true);
        try {
            const res = await authFetch(API.MINIMI_INVENTORY);
            if (!res.ok) return;
            const data = await res.json();

            const chars: OwnedChar[] = (data.characters || [])
                .map((c: { minimi_id: string }) => {
                    const catalog = CHARACTER_CATALOG.find(cat => cat.slug === c.minimi_id);
                    if (!catalog) return null;
                    return {
                        slug: catalog.slug,
                        name: catalog.name,
                        imageUrl: catalog.imageUrl,
                    };
                })
                .filter(Boolean) as OwnedChar[];

            setOwned(chars);
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) loadOwned();
    }, [isOpen, loadOwned]);

    if (!isOpen) return null;

    const placedSlugs = new Set(placedMinimi.map(p => p.slug));
    const available = owned.filter(o => !placedSlugs.has(o.slug));

    return (
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border-0 shadow-lg p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
                    보관함
                </h3>
                <button
                    onClick={onClose}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                    닫기
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 text-memento-600 animate-spin" />
                </div>
            ) : available.length === 0 ? (
                <div className="text-center py-6 text-gray-400 dark:text-gray-500">
                    <p className="text-sm">
                        {owned.length === 0
                            ? "보관함이 비어있어요. 미니미 상점에서 구매해보세요!"
                            : "모든 미니미가 스테이지에 배치중이에요"}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-4 gap-2">
                    {available.map((char) => (
                        <button
                            key={char.slug}
                            onClick={() => onSelect(char.slug)}
                            className={cn(
                                "flex flex-col items-center gap-1 p-2 rounded-xl",
                                "bg-gray-50 dark:bg-gray-700/50",
                                "hover:bg-memento-200 dark:hover:bg-memento-900/20",
                                "border border-transparent hover:border-memento-300 dark:hover:border-memento-600",
                                "transition-all"
                            )}
                        >
                            <div className="relative w-12 h-12 flex items-center justify-center">
                                <Image
                                    src={char.imageUrl}
                                    alt={char.name}
                                    width={40}
                                    height={40}
                                    className="object-contain"
                                    style={{ imageRendering: "pixelated" }}
                                />
                                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-memento-500 rounded-full flex items-center justify-center">
                                    <Plus className="w-2.5 h-2.5 text-white" />
                                </div>
                            </div>
                            <span className="text-[10px] text-gray-600 dark:text-gray-300 truncate w-full text-center">
                                {char.name}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
