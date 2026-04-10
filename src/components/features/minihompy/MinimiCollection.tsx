/**
 * MinimiCollection.tsx
 * 미니미 도감 - 사용자가 보유한 미니미 목록
 * 보유 미니미와 미보유 미니미를 구분하여 도감 형태로 표시
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Book, Loader2, Lock, Sparkles } from "lucide-react";
import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";
import { CHARACTER_CATALOG } from "@/data/minimiPixels";
import Image from "next/image";

interface OwnedCharRow {
    id: string;
    minimi_id: string;
    purchased_at: string;
    purchase_price: number;
}

interface MinimiCollectionProps {
    onMinimiClick?: (slug: string, owned: boolean) => void;
}

export default function MinimiCollection({ onMinimiClick }: MinimiCollectionProps) {
    const [ownedMinimi, setOwnedMinimi] = useState<OwnedCharRow[]>([]);
    const [loading, setLoading] = useState(true);

    // 보유 미니미 로드
    const loadInventory = useCallback(async () => {
        try {
            const res = await authFetch(API.MINIMI_INVENTORY);
            if (res.ok) {
                const data = await res.json();
                setOwnedMinimi(data.characters || []);
            }
        } catch {
            // 에러 무시
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadInventory();
    }, [loadInventory]);

    // 보유 여부 체크
    const isOwned = (slug: string): boolean => {
        return ownedMinimi.some(m => m.minimi_id === slug);
    };

    // 보유 미니미 수
    const ownedCount = CHARACTER_CATALOG.filter(c => isOwned(c.slug)).length;
    const totalCount = CHARACTER_CATALOG.length;
    const completionPercent = Math.round((ownedCount / totalCount) * 100);

    if (loading) {
        return (
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border-0 shadow-lg p-4">
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-memento-600 animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border-0 shadow-lg p-4">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Book className="w-5 h-5 text-memorial-500" />
                    <h3 className="font-semibold text-gray-800 dark:text-white">
                        미니미 도감
                    </h3>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {ownedCount}/{totalCount}
                    </span>
                    <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-memorial-400 to-orange-500 transition-all duration-500"
                            style={{ width: `${completionPercent}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* 도감 그리드 */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {CHARACTER_CATALOG.map((character) => {
                    const owned = isOwned(character.slug);
                    return (
                        <button
                            key={character.slug}
                            onClick={() => onMinimiClick?.(character.slug, owned)}
                            className={cn(
                                "relative aspect-square rounded-xl p-2 transition-all duration-200",
                                "flex flex-col items-center justify-center gap-1",
                                owned
                                    ? "bg-gradient-to-br from-memorial-50 to-orange-50 dark:from-memorial-900/20 dark:to-orange-900/20 border-2 border-memorial-200 dark:border-memorial-700 hover:scale-105 active:scale-95"
                                    : "bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 grayscale opacity-50"
                            )}
                        >
                            {/* 미니미 이미지 */}
                            <div className="relative w-12 h-12 sm:w-14 sm:h-14">
                                <Image
                                    src={character.imageUrl}
                                    alt={character.name}
                                    fill
                                    className="object-contain"
                                    style={{ imageRendering: "pixelated" }}
                                />
                                {!owned && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Lock className="w-4 h-4 text-gray-400" />
                                    </div>
                                )}
                            </div>
                            {/* 이름 */}
                            <span className={cn(
                                "text-[10px] sm:text-xs font-medium truncate w-full text-center",
                                owned ? "text-gray-700 dark:text-gray-200" : "text-gray-400 dark:text-gray-500"
                            )}>
                                {owned ? character.name : "???"}
                            </span>
                            {/* 보유 뱃지 */}
                            {owned && (
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-memorial-500 rounded-full flex items-center justify-center">
                                    <Sparkles className="w-3 h-3 text-white" />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* 도감 완성 메시지 */}
            {ownedCount === totalCount && (
                <div className="mt-4 p-3 bg-gradient-to-r from-memorial-100 to-orange-100 dark:from-memorial-900/30 dark:to-orange-900/30 rounded-xl text-center">
                    <Sparkles className="w-5 h-5 text-memorial-500 mx-auto mb-1" />
                    <p className="text-sm font-medium text-memorial-700 dark:text-memorial-300">
                        축하해요! 모든 미니미를 모았어요!
                    </p>
                </div>
            )}
        </div>
    );
}
