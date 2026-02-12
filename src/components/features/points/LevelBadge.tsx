/**
 * LevelBadge.tsx
 * 포인트 등급 아이콘 뱃지
 * 닉네임 옆에 표시 — 포인트가 쌓일수록 견종이 진화
 *
 * 견종 진화 순서:
 * Lv.1 말티즈 / Lv.2 포메라니안 / Lv.3 웰시코기 / Lv.4 시바견
 * Lv.5 골든리트리버 / Lv.6 사모예드 / Lv.7 전설의 황금 시바
 * Lv.5+ 반짝이 뱃지 / Lv.7 무지개 글로우
 */

"use client";

import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { getPointLevel, getNextLevelInfo, type PointLevel } from "@/config/constants";

interface LevelBadgeProps {
    points: number;
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
    size = "sm",
    showName = false,
    showTooltip = true,
    className,
}: LevelBadgeProps) {
    const level = getPointLevel(points);
    const { nextLevel, remaining } = getNextLevelInfo(points);

    const { wrapper, px } = SIZE_MAP[size];

    const tooltipText = nextLevel
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
                        src={level.icon}
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
                    level.textColor,
                )}>
                    Lv.{level.level}
                </span>
            )}
        </span>
    );
}

// 사이드바용 등급 상세 표시 (프로그레스바 포함)
export function LevelProgress({ points, nickname }: { points: number; nickname?: string }) {
    const level = getPointLevel(points);
    const { nextLevel, remaining, progress } = getNextLevelInfo(points);

    return (
        <div className="px-3 py-2 space-y-1.5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <LevelBadge points={points} size="lg" showTooltip={false} />
                    <span className={cn("text-sm font-bold", level.textColor)}>
                        {nickname || `Lv.${level.level}`}
                    </span>
                </div>
                <span className="text-[10px] text-gray-400">
                    Lv.{level.level}
                </span>
            </div>
            {nextLevel && (
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
