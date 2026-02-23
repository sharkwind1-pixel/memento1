/**
 * MinihompyStage.tsx
 * 미니홈피 스테이지 - 배경 + 미니미 캐릭터(들) + 방문자 카운터
 * 싸이월드 미니룸 감성의 디스플레이 컴포넌트
 *
 * 멀티 미니미 배치 시스템:
 * - placedMinimi 배열로 여러 미니미를 자유 배치
 * - editMode에서 드래그 앤 드롭으로 위치 조정
 * - placedMinimi가 비어있으면 기존처럼 장착 미니미 1마리 하단 중앙
 */

"use client";

import React, { useRef, useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { Music, Eye, X as XIcon, Pencil, Plus, Check, Loader2 } from "lucide-react";
import type { MinimiEquipState, PlacedMinimi } from "@/types";
import { findBackground, getDefaultBackground } from "@/data/minihompyBackgrounds";
import { CHARACTER_CATALOG } from "@/data/minimiPixels";
import Image from "next/image";

function clampPosition(x: number, y: number) {
    return {
        x: Math.max(5, Math.min(95, x)),
        y: Math.max(10, Math.min(85, y)),
    };
}

interface MinihompyStageProps {
    backgroundSlug: string;
    minimiEquip: MinimiEquipState;
    greeting: string;
    ownerNickname: string;
    todayVisitors: number;
    totalVisitors: number;
    isOwner?: boolean;
    compact?: boolean;
    placedMinimi?: PlacedMinimi[];
    editMode?: boolean;
    onPlacementChange?: (placed: PlacedMinimi[]) => void;
    // 편집모드 컨트롤 콜백 (스테이지 안에 버튼 표시)
    onEnterEdit?: () => void;
    onCancelEdit?: () => void;
    onSaveEdit?: () => void;
    onAddMinimi?: () => void;
    saving?: boolean;
    maxPlaced?: number;
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
    placedMinimi = [],
    editMode = false,
    onPlacementChange,
    onEnterEdit,
    onCancelEdit,
    onSaveEdit,
    onAddMinimi,
    saving = false,
    maxPlaced = 5,
}: MinihompyStageProps) {
    const bg = findBackground(backgroundSlug) || getDefaultBackground();
    const isDarkBg = backgroundSlug === "starry_night";
    const hasMinimi = !!minimiEquip.imageUrl || !!minimiEquip.pixelData;
    const stageRef = useRef<HTMLDivElement>(null);
    const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const dragStartRef = useRef<{ x: number; y: number; origX: number; origY: number } | null>(null);

    // 배치된 미니미가 있으면 사용, 없으면 장착 미니미 1마리를 하단 중앙에 표시
    const displayPlaced = placedMinimi.length > 0;

    const getImageUrl = (slug: string): string | null => {
        const character = CHARACTER_CATALOG.find(c => c.slug === slug);
        return character?.imageUrl || null;
    };

    const handlePointerDown = useCallback((e: React.PointerEvent, index: number) => {
        if (!editMode || !stageRef.current) return;
        e.preventDefault();
        e.stopPropagation();

        setSelectedIndex(index);
        setDraggingIndex(index);

        const rect = stageRef.current.getBoundingClientRect();
        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            origX: placedMinimi[index].x,
            origY: placedMinimi[index].y,
        };

        const handlePointerMove = (moveEvent: PointerEvent) => {
            if (!dragStartRef.current || !stageRef.current) return;
            const dx = moveEvent.clientX - dragStartRef.current.x;
            const dy = moveEvent.clientY - dragStartRef.current.y;
            const percentX = (dx / rect.width) * 100;
            const percentY = (dy / rect.height) * 100;
            const clamped = clampPosition(
                dragStartRef.current.origX + percentX,
                dragStartRef.current.origY + percentY,
            );
            const updated = [...placedMinimi];
            updated[index] = { ...updated[index], ...clamped };
            onPlacementChange?.(updated);
        };

        const handlePointerUp = () => {
            setDraggingIndex(null);
            dragStartRef.current = null;
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
        };

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
    }, [editMode, placedMinimi, onPlacementChange]);

    const handleRemove = useCallback((index: number) => {
        const updated = placedMinimi.filter((_, i) => i !== index);
        onPlacementChange?.(updated);
        setSelectedIndex(null);
    }, [placedMinimi, onPlacementChange]);

    const handleStageClick = useCallback(() => {
        if (editMode) {
            setSelectedIndex(null);
        }
    }, [editMode]);

    return (
        <div
            ref={stageRef}
            className={cn(
                "relative rounded-2xl overflow-hidden",
                compact ? "h-[200px]" : "h-[280px]",
                "border border-white/20 shadow-lg",
                editMode && "ring-2 ring-blue-400/50"
            )}
            style={{ background: bg.cssBackground, touchAction: editMode ? "none" : "auto" }}
            onClick={handleStageClick}
        >
            {/* 상단 타이틀 바 */}
            <div className={cn(
                "absolute top-0 left-0 right-0 px-4 py-2.5 z-10",
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

            {/* 배치된 미니미들 */}
            {displayPlaced ? (
                placedMinimi.map((placed, index) => {
                    const imgUrl = getImageUrl(placed.slug);
                    if (!imgUrl) return null;
                    const isSelected = editMode && selectedIndex === index;
                    const isDragging = draggingIndex === index;

                    return (
                        <div
                            key={`${placed.slug}-${index}`}
                            className={cn(
                                "absolute -translate-x-1/2 -translate-y-1/2",
                                editMode && "cursor-grab",
                                isDragging && "cursor-grabbing",
                                isSelected && "z-50",
                            )}
                            style={{
                                left: `${placed.x}%`,
                                top: `${placed.y}%`,
                                zIndex: isSelected ? 50 : (placed.zIndex || index + 1),
                            }}
                            onPointerDown={(e) => handlePointerDown(e, index)}
                        >
                            <div className="relative">
                                {/* 선택 표시 */}
                                {isSelected && (
                                    <div className="absolute -inset-2 border-2 border-dashed border-blue-400 rounded-lg bg-blue-400/10" />
                                )}
                                {/* 그림자 */}
                                <div className={cn(
                                    "absolute -bottom-1.5 left-1/2 -translate-x-1/2",
                                    "w-12 h-2 rounded-full opacity-20",
                                    isDarkBg ? "bg-white" : "bg-black"
                                )} />
                                <Image
                                    src={imgUrl}
                                    alt="미니미"
                                    width={compact ? 56 : 68}
                                    height={compact ? 56 : 68}
                                    className="object-contain pointer-events-none select-none"
                                    style={{ imageRendering: "pixelated" }}
                                    draggable={false}
                                />
                                {/* 삭제 버튼 */}
                                {isSelected && (
                                    <button
                                        className="absolute -top-3 -right-3 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemove(index);
                                        }}
                                    >
                                        <XIcon className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })
            ) : (
                /* 기존 단일 미니미 하단 중앙 표시 (하위호환) */
                <div className={cn(
                    "absolute left-1/2 -translate-x-1/2",
                    compact ? "bottom-[52px]" : "bottom-[64px]"
                )}>
                    {hasMinimi ? (
                        <div className="relative">
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
            )}

            {/* 편집모드: 상단 안내 + 하단 컨트롤 바 */}
            {editMode && (
                <>
                    <div className="absolute top-10 left-1/2 -translate-x-1/2 z-20">
                        <div className="bg-blue-500/80 text-white text-[10px] px-2.5 py-1 rounded-full backdrop-blur-sm whitespace-nowrap">
                            드래그하여 위치 이동
                        </div>
                    </div>
                    {/* 편집모드 컨트롤 바 - 스테이지 하단 */}
                    <div className="absolute bottom-[42px] left-0 right-0 z-30 flex items-center justify-center gap-2 px-3">
                        {onAddMinimi && placedMinimi.length < maxPlaced && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onAddMinimi(); }}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-medium bg-blue-500/90 text-white backdrop-blur-sm hover:bg-blue-600/90 transition-colors shadow-md"
                            >
                                <Plus className="w-3 h-3" />
                                추가 ({placedMinimi.length}/{maxPlaced})
                            </button>
                        )}
                        {onCancelEdit && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onCancelEdit(); }}
                                className="px-2.5 py-1.5 rounded-full text-[11px] font-medium bg-white/80 text-gray-600 backdrop-blur-sm hover:bg-white/90 transition-colors shadow-md"
                            >
                                취소
                            </button>
                        )}
                        {onSaveEdit && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onSaveEdit(); }}
                                disabled={saving}
                                className={cn(
                                    "flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-medium bg-green-500/90 text-white backdrop-blur-sm hover:bg-green-600/90 transition-colors shadow-md",
                                    saving && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                완료
                            </button>
                        )}
                    </div>
                </>
            )}

            {/* 비편집모드: 배치 진입 버튼 (소유자만) */}
            {!editMode && isOwner && onEnterEdit && (
                <button
                    onClick={(e) => { e.stopPropagation(); onEnterEdit(); }}
                    className={cn(
                        "absolute z-20 flex items-center gap-1 px-2.5 py-1.5 rounded-full",
                        "text-[11px] font-medium backdrop-blur-sm transition-all shadow-md",
                        "bg-white/70 text-gray-700 hover:bg-white/90",
                        compact ? "bottom-[34px] right-2" : "bottom-[46px] right-3"
                    )}
                >
                    <Pencil className="w-3 h-3" />
                    미니미 배치
                </button>
            )}

            {/* 하단 정보 바 */}
            <div className={cn(
                "absolute bottom-0 left-0 right-0 z-10",
                "bg-gradient-to-t from-black/30 to-transparent",
                compact ? "px-3 py-2" : "px-4 py-3"
            )}>
                {greeting && (
                    <p className={cn(
                        "text-center text-xs text-white/90 drop-shadow-md mb-1.5",
                        "italic"
                    )}>
                        &quot;{greeting}&quot;
                    </p>
                )}

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

            {/* 배경 효과 */}
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
