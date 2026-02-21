/**
 * LevelBadge.tsx
 * 포인트 등급 아이콘 뱃지
 * 닉네임 옆에 표시 — 포인트가 쌓일수록 등급이 올라감
 *
 * Lv.1 ~ Lv.7 (반려동물 타입별 아이콘: dog / cat / other)
 * Lv.5+ 반짝이 뱃지 / Lv.7 무지개 글로우
 */

"use client";

import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { getPointLevel, getNextLevelInfo, ADMIN_ICONS, type PointLevel, type PetIconType } from "@/config/constants";

interface LevelBadgeProps {
    points: number;
    petType?: PetIconType;
    isAdmin?: boolean;
    size?: "sm" | "md" | "lg" | "xl" | "2xl";
    showName?: boolean;
    showTooltip?: boolean;
    className?: string;
}

const SIZE_MAP = {
    sm: { wrapper: "w-7 h-7", px: 28 },
    md: { wrapper: "w-9 h-9", px: 36 },
    lg: { wrapper: "w-11 h-11", px: 44 },
    xl: { wrapper: "w-14 h-14", px: 56 },
    "2xl": { wrapper: "w-20 h-20", px: 80 },
} as const;

export default function LevelBadge({
    points,
    petType = "dog",
    isAdmin = false,
    size = "sm",
    showName = false,
    showTooltip = true,
    className,
}: LevelBadgeProps) {
    const level = getPointLevel(points);
    const { nextLevel, remaining } = getNextLevelInfo(points);
    const iconSrc = isAdmin ? ADMIN_ICONS[petType] : level.icons[petType];

    const { wrapper, px } = SIZE_MAP[size];

    const tooltipText = isAdmin
        ? "ADMIN"
        : nextLevel
            ? `Lv.${level.level}\n다음 등급까지 ${remaining.toLocaleString()}P`
            : `Lv.${level.level} (MAX)`;

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 shrink-0",
                className
            )}
            title={showTooltip ? tooltipText : undefined}
        >
            {/* 아이콘 래퍼 — 글로우, 반짝이 포함 */}
            <span className="relative inline-flex">
                {/* 메인 아이콘 */}
                <span className={cn(
                    "inline-flex items-center justify-center rounded-full overflow-hidden",
                    wrapper,
                    // Lv.7 글로우 효과
                    level.hasGlow && "shadow-[0_0_8px_rgba(244,63,94,0.35),0_0_16px_rgba(251,191,36,0.2)]",
                )}>
                    <Image
                        src={iconSrc}
                        alt={`Lv.${level.level}`}
                        width={px}
                        height={px}
                        className="w-full h-full object-cover"
                        unoptimized
                    />
                </span>

                {/* Lv.5+ 반짝이 도트 */}
                {level.hasSparkle && (
                    <span className={cn(
                        "absolute -top-0.5 -right-0.5 rounded-full border border-white",
                        size === "sm" && "w-2.5 h-2.5",
                        size === "md" && "w-3 h-3",
                        size === "lg" && "w-3.5 h-3.5",
                        size === "xl" && "w-4 h-4",
                        size === "2xl" && "w-5 h-5",
                        // Lv.7 무지개 / 나머지 골드
                        level.hasGlow
                            ? "bg-[conic-gradient(#ef4444,#f59e0b,#22c55e,#3b82f6,#8b5cf6,#ef4444)]"
                            : "bg-gradient-to-br from-amber-300 to-amber-500",
                    )} />
                )}
            </span>

            {showName && (
                <span className={cn(
                    "text-xs font-medium",
                    isAdmin ? "text-amber-600" : level.textColor,
                )}>
                    {isAdmin ? "ADMIN" : `Lv.${level.level}`}
                </span>
            )}
        </span>
    );
}

// 사이드바용 등급 상세 표시 (프로그레스바 포함)
export function LevelProgress({ points, nickname, petType = "dog", isAdmin = false }: { points: number; nickname?: string; petType?: PetIconType; isAdmin?: boolean }) {
    const level = getPointLevel(points);
    const { nextLevel, remaining, progress } = getNextLevelInfo(points);

    return (
        <div className="px-3 py-2 space-y-1.5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <LevelBadge points={points} petType={petType} isAdmin={isAdmin} size="lg" showTooltip={false} />
                    <span className={cn("text-sm font-bold", isAdmin ? "text-amber-600" : level.textColor)}>
                        {nickname || (isAdmin ? "ADMIN" : `Lv.${level.level}`)}
                    </span>
                </div>
                <span className="text-[10px] text-gray-400">
                    {isAdmin ? "ADMIN" : `Lv.${level.level}`}
                </span>
            </div>
            {!isAdmin && nextLevel && (
                <>
                    <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full rounded-full bg-gradient-to-r transition-all duration-500",
                                level.color, level.bgColor
                            )}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-[10px] text-gray-400 text-right">
                        다음 등급까지 {remaining.toLocaleString()}P
                    </p>
                </>
            )}
        </div>
    );
}
