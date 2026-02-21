/**
 * MinihompyStage.tsx
 * 미니홈피 스테이지 - 배경 + 미니미 캐릭터 + 방문자 카운터
 * 싸이월드 미니룸 감성의 디스플레이 컴포넌트
 */

"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Music, Eye } from "lucide-react";
import type { MinimiEquipState } from "@/types";
import { findBackground, getDefaultBackground } from "@/data/minihompyBackgrounds";
import Image from "next/image";

interface MinihompyStageProps {
    backgroundSlug: string;
    minimiEquip: MinimiEquipState;
    greeting: string;
    ownerNickname: string;
    todayVisitors: number;
    totalVisitors: number;
    isOwner?: boolean;
    compact?: boolean;
}

export default function MinihompyStage({
    backgroundSlug,
    minimiEquip,
    greeting,
    ownerNickname,
    todayVisitors,
    totalVisitors,
    isOwner = false,
    compact = false,
}: MinihompyStageProps) {
    const bg = findBackground(backgroundSlug) || getDefaultBackground();
    const isDarkBg = backgroundSlug === "starry_night";
    const hasMinimi = !!minimiEquip.imageUrl || !!minimiEquip.pixelData;

    return (
        <div
            className={cn(
                "relative rounded-2xl overflow-hidden",
                compact ? "h-[200px]" : "h-[280px]",
                "border border-white/20 shadow-lg"
            )}
            style={{ background: bg.cssBackground }}
        >
            {/* 상단 타이틀 바 */}
            <div className={cn(
                "absolute top-0 left-0 right-0 px-4 py-2.5",
                "bg-gradient-to-b from-black/20 to-transparent"
            )}>
                <div className="flex items-center gap-2">
                    <Music className="w-3.5 h-3.5 text-white/80" />
                    <p className={cn(
                        "text-sm font-medium",
                        "text-white drop-shadow-md"
                    )}>
                        {ownerNickname}의 미니홈피
                    </p>
                </div>
            </div>

            {/* 미니미 캐릭터 */}
            <div className={cn(
                "absolute left-1/2 -translate-x-1/2",
                compact ? "bottom-[52px]" : "bottom-[64px]"
            )}>
                {hasMinimi ? (
                    <div className="relative">
                        {/* 미니미 그림자 */}
                        <div className={cn(
                            "absolute -bottom-2 left-1/2 -translate-x-1/2",
                            "w-16 h-3 rounded-full opacity-20",
                            isDarkBg ? "bg-white" : "bg-black"
                        )} />
                        {minimiEquip.imageUrl ? (
                            <Image
                                src={minimiEquip.imageUrl}
                                alt="미니미"
                                width={compact ? 64 : 80}
                                height={compact ? 64 : 80}
                                className="object-contain"
                                style={{ imageRendering: "pixelated" }}
                            />
                        ) : (
                            <div className={cn(
                                compact ? "w-16 h-16" : "w-20 h-20",
                                "bg-gray-200/50 rounded-lg"
                            )} />
                        )}
                    </div>
                ) : (
                    <div className={cn(
                        "flex items-center justify-center",
                        compact ? "w-16 h-16" : "w-20 h-20",
                        "rounded-full border-2 border-dashed",
                        isDarkBg
                            ? "border-white/30 text-white/40"
                            : "border-gray-400/40 text-gray-400/60",
                        "bg-white/10 backdrop-blur-sm"
                    )}>
                        <span className="text-xs text-center">
                            미니미를{"\n"}꾸며보세요
                        </span>
                    </div>
                )}
            </div>

            {/* 하단 정보 바 */}
            <div className={cn(
                "absolute bottom-0 left-0 right-0",
                "bg-gradient-to-t from-black/30 to-transparent",
                compact ? "px-3 py-2" : "px-4 py-3"
            )}>
                {/* 인사말 */}
                {greeting && (
                    <p className={cn(
                        "text-center text-xs text-white/90 drop-shadow-md mb-1.5",
                        "italic"
                    )}>
                        &quot;{greeting}&quot;
                    </p>
                )}

                {/* 방문자 카운터 */}
                <div className="flex items-center justify-center gap-3">
                    <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3 text-white/70" />
                        <span className="text-[10px] text-white/80 font-medium">
                            today <span className="text-white font-bold">{todayVisitors}</span>
                        </span>
                    </div>
                    <span className="text-white/40">|</span>
                    <span className="text-[10px] text-white/80 font-medium">
                        total <span className="text-white font-bold">{totalVisitors.toLocaleString()}</span>
                    </span>
                </div>
            </div>

            {/* 밤하늘 배경 전용: 별 효과 */}
            {backgroundSlug === "starry_night" && (
                <div className="absolute inset-0 pointer-events-none">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-0.5 h-0.5 bg-white rounded-full animate-pulse"
                            style={{
                                top: `${Math.random() * 60}%`,
                                left: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 3}s`,
                                animationDuration: `${1.5 + Math.random() * 2}s`,
                                opacity: 0.4 + Math.random() * 0.6,
                            }}
                        />
                    ))}
                </div>
            )}

            {/* 벚꽃 배경 전용: 꽃잎 효과 */}
            {backgroundSlug === "cherry_blossom" && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {[...Array(8)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute text-pink-300/60 text-xs animate-bounce"
                            style={{
                                top: `${Math.random() * 80}%`,
                                left: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 4}s`,
                                animationDuration: `${2 + Math.random() * 3}s`,
                            }}
                        >
                            *
                        </div>
                    ))}
                </div>
            )}

            {/* 겨울 배경 전용: 눈 효과 */}
            {backgroundSlug === "winter_snow" && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {[...Array(15)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-1 h-1 bg-white/70 rounded-full animate-bounce"
                            style={{
                                top: `${Math.random() * 80}%`,
                                left: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 5}s`,
                                animationDuration: `${3 + Math.random() * 4}s`,
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
