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
    const DARK_BACKGROUNDS = ["starry_night", "mystic_pond", "rooftop_glamping", "starfall_hill"];
    const isDarkBg = DARK_BACKGROUNDS.includes(backgroundSlug);
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
            style={{
                background: bg.imageUrl ? undefined : bg.cssBackground,
                backgroundImage: bg.imageUrl ? `url(${bg.imageUrl})` : undefined,
                backgroundSize: bg.imageUrl ? "cover" : undefined,
                backgroundPosition: bg.imageUrl ? "center" : undefined,
                touchAction: editMode ? "none" : "auto",
            }}
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
                    const baseSize = compact ? 72 : 96;
                    // 히트 영역: 캐릭터의 실제 콘텐츠 부분만 (하단 60%, 중앙 50%)
                    const hitW = Math.round(baseSize * 0.5);
                    const hitH = Math.round(baseSize * 0.6);

                    return (
                        <div
                            key={`${placed.slug}-${index}`}
                            className="absolute"
                            style={{
                                left: `${placed.x}%`,
                                top: `${placed.y}%`,
                                zIndex: isSelected ? 50 : (placed.zIndex || index + 1),
                                // 이미지를 포인터 이벤트 없이 전체 크기로 표시
                                width: baseSize,
                                height: baseSize,
                                transform: "translate(-50%, -50%)",
                                pointerEvents: "none",
                            }}
                        >
                            {/* 이미지 (포인터 이벤트 없음 - 시각적 표시만) */}
                            <div className="relative w-full h-full">
                                {/* 선택 표시 */}
                                {isSelected && (
                                    <div className="absolute -inset-2 border-2 border-dashed border-blue-400 rounded-lg bg-blue-400/10" />
                                )}
                                {/* 그림자 */}
                                <div className={cn(
                                    "absolute -bottom-2 left-1/2 -translate-x-1/2",
                                    "w-16 h-3 rounded-full opacity-20",
                                    isDarkBg ? "bg-white" : "bg-black"
                                )} />
                                <Image
                                    src={imgUrl}
                                    alt="미니미"
                                    width={baseSize}
                                    height={baseSize}
                                    className="object-contain select-none"
                                    style={{ imageRendering: "pixelated" }}
                                    draggable={false}
                                />
                                {/* 삭제 버튼 */}
                                {isSelected && (
                                    <button
                                        className="absolute -top-3 -right-3 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                                        style={{ pointerEvents: "auto" }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemove(index);
                                        }}
                                    >
                                        <XIcon className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                            {/* 히트 영역: 캐릭터 실제 크기에 맞춘 작은 클릭 영역 (하단 중앙) */}
                            <div
                                className={cn(
                                    "absolute",
                                    editMode && "cursor-grab",
                                    isDragging && "cursor-grabbing",
                                )}
                                style={{
                                    pointerEvents: "auto",
                                    width: hitW,
                                    height: hitH,
                                    left: (baseSize - hitW) / 2,
                                    top: baseSize - hitH - Math.round(baseSize * 0.02),
                                }}
                                onPointerDown={(e) => handlePointerDown(e, index)}
                            />
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
                        (() => {
                            const singleBase = compact ? 80 : 112;
                            return (
                                <div className="relative">
                                    <div className={cn(
                                        "absolute -bottom-2 left-1/2 -translate-x-1/2",
                                        "w-20 h-3 rounded-full opacity-20",
                                        isDarkBg ? "bg-white" : "bg-black"
                                    )} />
                                    {minimiEquip.imageUrl ? (
                                        <Image
                                            src={minimiEquip.imageUrl}
                                            alt="미니미"
                                            width={singleBase}
                                            height={singleBase}
                                            className="object-contain"
                                            style={{ imageRendering: "pixelated" }}
                                        />
                                    ) : (
                                        <div className={cn(
                                            compact ? "w-20 h-20" : "w-28 h-28",
                                            "bg-gray-200/50 rounded-lg"
                                        )} />
                                    )}
                                </div>
                            );
                        })()
                    ) : (
                        <div className={cn(
                            "flex items-center justify-center",
                            compact ? "w-20 h-20" : "w-28 h-28",
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

            {/* 편집모드: 상단 컨트롤 바 */}
            {editMode && (
                <div className="absolute top-0 left-0 right-0 z-30 bg-blue-500/90 backdrop-blur-sm px-3 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-white text-xs font-medium">편집모드</span>
                        {onAddMinimi && placedMinimi.length < maxPlaced && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onAddMinimi(); }}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white/20 text-white hover:bg-white/30 transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                추가 ({placedMinimi.length}/{maxPlaced})
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {onCancelEdit && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onCancelEdit(); }}
                                className="px-3 py-1 rounded-lg text-xs font-medium bg-white/20 text-white hover:bg-white/30 transition-colors"
                            >
                                취소
                            </button>
                        )}
                        {onSaveEdit && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onSaveEdit(); }}
                                disabled={saving}
                                className={cn(
                                    "flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-white text-blue-600 hover:bg-blue-50 transition-colors",
                                    saving && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                완료
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* 비편집모드: 배치 진입 버튼 (소유자만) - 우측 상단에 눈에 띄게 */}
            {!editMode && isOwner && onEnterEdit && (
                <button
                    onClick={(e) => { e.stopPropagation(); onEnterEdit(); }}
                    className={cn(
                        "absolute z-20 top-2 right-2",
                        "flex items-center gap-1.5 px-3 py-2 rounded-xl",
                        "text-xs font-semibold",
                        "bg-white/90 text-gray-800 shadow-lg",
                        "hover:bg-white hover:scale-105",
                        "active:scale-95",
                        "transition-all duration-150",
                        "border border-gray-200/50"
                    )}
                >
                    <Pencil className="w-3.5 h-3.5 text-blue-500" />
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
