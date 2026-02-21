/**
 * PointsBadge.tsx
 * 사이드바에 표시하는 포인트 배지 위젯
 * - 현재 포인트 표시
 * - 클릭 시 내역 모달 열기
 * - 미니미 미리보기 + 상점/옷장 진입
 */

"use client";

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Star, ChevronRight, ShoppingBag, Shirt, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatPoints } from "@/lib/points";
import PointsHistoryModal from "./PointsHistoryModal";
import PointsShopModal from "./PointsShopModal";
import { LevelProgress } from "./LevelBadge";
import Image from "next/image";
import MinimiShopModal from "../minimi/MinimiShopModal";
import MinimiClosetModal from "../minimi/MinimiClosetModal";

export default function PointsBadge() {
    const { user, points, userPetType, isAdminUser, minimiEquip, refreshMinimi, refreshPoints } = useAuth();
    const nickname = user?.user_metadata?.nickname || user?.email?.split("@")[0];
    const [showHistory, setShowHistory] = useState(false);
    const [showShop, setShowShop] = useState(false);
    const [showMinimiShop, setShowMinimiShop] = useState(false);
    const [showCloset, setShowCloset] = useState(false);

    const handleMinimiChanged = useCallback(async () => {
        await refreshMinimi();
        await refreshPoints();
    }, [refreshMinimi, refreshPoints]);

    // 비로그인 시 표시 안함
    if (!user) return null;

    const hasMinimi = !!minimiEquip.imageUrl;

    return (
        <>
            <div className="px-3 py-3 space-y-2">
                {/* 등급 프로그레스 */}
                <LevelProgress points={points} nickname={nickname} petType={userPetType} isAdmin={isAdminUser} />

                {/* 미니미 섹션 */}
                <div className={cn(
                    "rounded-xl border p-3",
                    "bg-gradient-to-r from-pink-50/80 to-purple-50/80",
                    "dark:from-pink-900/10 dark:to-purple-900/10",
                    "border-pink-100/60 dark:border-pink-800/30"
                )}>
                    {hasMinimi ? (
                        <div className="flex items-center gap-3 mb-2">
                            <Image
                                src={minimiEquip.imageUrl!}
                                alt="내 미니미"
                                width={Math.round(48 * (minimiEquip.displayScale ?? 1))}
                                height={Math.round(48 * (minimiEquip.displayScale ?? 1))}
                                className="object-contain"
                                style={{ imageRendering: "pixelated" }}
                            />
                            <div className="text-left flex-1 min-w-0">
                                <p className="text-xs text-gray-500 dark:text-gray-400">내 미니미</p>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                                    장착 중
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700/50 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-gray-400" />
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 flex-1">
                                미니미를 꾸며보세요!
                            </p>
                        </div>
                    )}
                    <div className="flex gap-1.5">
                        <button
                            onClick={() => setShowMinimiShop(true)}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg",
                                "bg-pink-100/80 dark:bg-pink-900/20",
                                "hover:bg-pink-200/80 dark:hover:bg-pink-900/30",
                                "transition-all text-xs font-medium text-pink-700 dark:text-pink-300"
                            )}
                        >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            상점
                        </button>
                        {hasMinimi && (
                            <button
                                onClick={() => setShowCloset(true)}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg",
                                    "bg-purple-100/80 dark:bg-purple-900/20",
                                    "hover:bg-purple-200/80 dark:hover:bg-purple-900/30",
                                    "transition-all text-xs font-medium text-purple-700 dark:text-purple-300"
                                )}
                            >
                                <Shirt className="w-3.5 h-3.5" />
                                옷장
                            </button>
                        )}
                    </div>
                </div>

                {/* 포인트 표시 */}
                <button
                    onClick={() => setShowHistory(true)}
                    className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-xl",
                        "bg-gradient-to-r from-sky-50 to-violet-50",
                        "dark:from-sky-900/20 dark:to-violet-900/20",
                        "hover:from-sky-100 hover:to-violet-100",
                        "dark:hover:from-sky-900/30 dark:hover:to-violet-900/30",
                        "transition-all group"
                    )}
                >
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-violet-400 flex items-center justify-center">
                            <Star className="w-4 h-4 text-white" />
                        </div>
                        <div className="text-left">
                            <p className="text-xs text-gray-500 dark:text-gray-400">내 포인트</p>
                            <p className="text-sm font-bold text-gray-800 dark:text-white">
                                {formatPoints(points)}
                            </p>
                        </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                </button>

                {/* 포인트 상점 버튼 */}
                <button
                    onClick={() => setShowShop(true)}
                    className={cn(
                        "w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl",
                        "bg-gradient-to-r from-amber-50 to-orange-50",
                        "dark:from-amber-900/20 dark:to-orange-900/20",
                        "hover:from-amber-100 hover:to-orange-100",
                        "dark:hover:from-amber-900/30 dark:hover:to-orange-900/30",
                        "transition-all text-sm font-medium text-amber-700 dark:text-amber-300"
                    )}
                >
                    <ShoppingBag className="w-4 h-4" />
                    포인트 상점
                </button>
            </div>

            {/* 모달 */}
            {showHistory && (
                <PointsHistoryModal
                    open={showHistory}
                    onClose={() => setShowHistory(false)}
                />
            )}
            {showShop && (
                <PointsShopModal
                    isOpen={showShop}
                    onClose={() => setShowShop(false)}
                />
            )}
            {showMinimiShop && (
                <MinimiShopModal
                    isOpen={showMinimiShop}
                    onClose={() => setShowMinimiShop(false)}
                    onPurchased={handleMinimiChanged}
                />
            )}
            {showCloset && (
                <MinimiClosetModal
                    isOpen={showCloset}
                    onClose={() => setShowCloset(false)}
                    onChanged={handleMinimiChanged}
                />
            )}
        </>
    );
}
