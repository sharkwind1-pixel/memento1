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

import React, { useRef, useCallback, useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Music, Eye, Archive, Pencil, Plus, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { MinimiEquipState, PlacedMinimi } from "@/types";
import { findBackground, getDefaultBackground } from "@/data/minihompyBackgrounds";
import { CHARACTER_CATALOG } from "@/data/minimiPixels";
import Image from "next/image";

/** 시드 기반 난수 생성 - SSR/CSR 결과 일치 보장 */
function seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
        s = (s * 16807 + 0) % 2147483647;
        return (s - 1) / 2147483646;
    };
}

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

    // isMounted: 배경 효과 파티클을 CSR에서만 렌더링 (hydration mismatch 방지)
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => { setIsMounted(true); }, []);

    // 터치 이펙트 상태 (미니미 클릭 시 애니메이션)
    const [touchEffectIndex, setTouchEffectIndex] = useState<number | null>(null);
    const [touchEffectMessage, setTouchEffectMessage] = useState<string>("");

    // 미니미 터치 이펙트 메시지 목록
    const TOUCH_MESSAGES = [
        "안녕!",
        "놀아줘~",
        "기분 좋아!",
        "반가워!",
        "뭐해?",
        "좋아!",
        "오늘도 힘내!",
        "나 여기있어!",
    ];

    // 시드 기반 사전 계산된 랜덤 값 (SSR/CSR 동일)
    const starPositions = useMemo(() => {
        const rng = seededRandom(42);
        return [...Array(20)].map(() => ({
            top: rng() * 60,
            left: rng() * 100,
            delay: rng() * 3,
            duration: 1.5 + rng() * 2,
            opacity: 0.4 + rng() * 0.6,
        }));
    }, []);
    const cherryPositions = useMemo(() => {
        const rng = seededRandom(99);
        return [...Array(8)].map(() => ({
            top: rng() * 80,
            left: rng() * 100,
            delay: rng() * 4,
            duration: 2 + rng() * 3,
        }));
    }, []);
    const snowPositions = useMemo(() => {
        const rng = seededRandom(137);
        return [...Array(15)].map(() => ({
            top: rng() * 80,
            left: rng() * 100,
            delay: rng() * 5,
            duration: 3 + rng() * 4,
        }));
    }, []);

    // 배치된 미니미가 있으면 사용, 없으면 장착 미니미 1마리를 하단 중앙에 표시
    const displayPlaced = placedMinimi.length > 0;

    const getImageUrl = (slug: string): string | null => {
        const character = CHARACTER_CATALOG.find(c => c.slug === slug);
        return character?.imageUrl || null;
    };

    /**
     * 미니미 그림자 위치를 자동 계산 (object-contain 하단 여백 보정)
     * 가로형 이미지(고양이)는 정사각형 컨테이너에서 상하 여백이 생기므로,
     * imageAspect(가로/세로)로 실제 렌더링 높이를 구해 그림자를 발 아래에 배치
     */
    const getShadowBottom = (slug: string, containerSize: number): number => {
        const character = CHARACTER_CATALOG.find(c => c.slug === slug);
        const aspect = character?.imageAspect ?? 1;

        if (aspect <= 1) {
            // 정사각형 또는 세로형: 하단 여백 없음 → 기본 위치
            return -8;
        }

        // 가로형 이미지: object-contain 시 세로가 축소됨
        // renderedHeight = containerSize / aspect
        // bottomGap = (containerSize - renderedHeight) / 2
        const renderedHeight = containerSize / aspect;
        const bottomGap = (containerSize - renderedHeight) / 2;

        // 그림자를 하단 여백 바로 위에 밀착 배치 (발 아래 1px 여유)
        return bottomGap - 1;
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

    // 미니미 터치 이펙트 핸들러 (비편집 모드에서만)
    const handleMinimiTouch = useCallback((index: number) => {
        if (editMode) return;

        // 랜덤 메시지 선택
        const randomMessage = TOUCH_MESSAGES[Math.floor(Math.random() * TOUCH_MESSAGES.length)];
        setTouchEffectMessage(randomMessage);
        setTouchEffectIndex(index);

        // 1.5초 후 이펙트 제거
        setTimeout(() => {
            setTouchEffectIndex(null);
            setTouchEffectMessage("");
        }, 1500);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- TOUCH_MESSAGES is a static constant
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

                    const hasTouchEffect = touchEffectIndex === index;

                    return (
                        <div
                            key={`${placed.slug}-${index}`}
                            className="absolute"
                            style={{
                                left: `${placed.x}%`,
                                top: `${placed.y}%`,
                                zIndex: isSelected ? 50 : hasTouchEffect ? 40 : (placed.zIndex || index + 1),
                                // 이미지를 포인터 이벤트 없이 전체 크기로 표시
                                width: baseSize,
                                height: baseSize,
                                transform: "translate(-50%, -50%)",
                                pointerEvents: "none",
                            }}
                        >
                            {/* 터치 이펙트: 말풍선 */}
                            {hasTouchEffect && touchEffectMessage && (
                                <div
                                    className="absolute -top-8 left-1/2 -translate-x-1/2 z-50 animate-bounce"
                                    style={{
                                        animation: "minimiPop 0.3s ease-out, minimiFadeOut 0.3s ease-in 1.2s forwards",
                                    }}
                                >
                                    <div className="relative bg-white dark:bg-gray-800 px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap">
                                        <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                                            {touchEffectMessage}
                                        </span>
                                        {/* 말풍선 꼬리 */}
                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white dark:bg-gray-800 rotate-45" />
                                    </div>
                                </div>
                            )}
                            {/* 이미지 (포인터 이벤트 없음 - 시각적 표시만) */}
                            <div
                                className={cn(
                                    "relative w-full h-full transition-transform duration-150",
                                    hasTouchEffect && "scale-110"
                                )}
                                style={{
                                    animation: hasTouchEffect ? "minimiJump 0.3s ease-out" : undefined,
                                }}
                            >
                                {/* 선택 표시 */}
                                {isSelected && (
                                    <div className="absolute -inset-2 border-2 border-dashed border-blue-400 rounded-lg bg-blue-400/10" />
                                )}
                                {/* 그림자 (미니미별 오프셋 적용) */}
                                <div
                                    className={cn(
                                        "absolute left-1/2 -translate-x-1/2 transition-all duration-150",
                                        "w-16 h-3 rounded-full",
                                        isDarkBg ? "bg-white" : "bg-black",
                                        hasTouchEffect ? "opacity-30 scale-90" : "opacity-20"
                                    )}
                                    style={{ bottom: `${getShadowBottom(placed.slug, baseSize)}px` }}
                                />
                                <Image
                                    src={imgUrl}
                                    alt="미니미"
                                    width={baseSize}
                                    height={baseSize}
                                    className="object-contain select-none"
                                    style={{ imageRendering: "pixelated" }}
                                    draggable={false}
                                />
                                {/* 보관함으로 이동 버튼 */}
                                {isSelected && (
                                    <button
                                        className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1 bg-amber-500 text-white rounded-full shadow-md hover:bg-amber-600 transition-colors whitespace-nowrap"
                                        style={{ pointerEvents: "auto", zIndex: 60 }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemove(index);
                                            toast.success("보관함으로 이동했습니다");
                                        }}
                                    >
                                        <Archive className="w-3 h-3" />
                                        <span className="text-[10px] font-medium">보관</span>
                                    </button>
                                )}
                                {/* 터치 이펙트: 하트/별 파티클 */}
                                {hasTouchEffect && (
                                    <div className="absolute inset-0 pointer-events-none overflow-visible">
                                        {[...Array(4)].map((_, i) => (
                                            <div
                                                key={i}
                                                className="absolute text-pink-400 text-sm"
                                                style={{
                                                    left: `${50 + (i - 1.5) * 20}%`,
                                                    top: "30%",
                                                    animation: `minimiParticle 0.6s ease-out ${i * 0.1}s forwards`,
                                                    opacity: 0,
                                                }}
                                            >
                                                {i % 2 === 0 ? "♥" : "★"}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {/* 히트 영역: 캐릭터 실제 크기에 맞춘 작은 클릭 영역 (하단 중앙) */}
                            <div
                                className={cn(
                                    "absolute",
                                    editMode ? "cursor-grab" : "cursor-pointer",
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
                                onClick={() => !editMode && handleMinimiTouch(index)}
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
                                    <div
                                        className={cn(
                                            "absolute left-1/2 -translate-x-1/2",
                                            "w-20 h-3 rounded-full opacity-20",
                                            isDarkBg ? "bg-white" : "bg-black"
                                        )}
                                        style={{ bottom: `${getShadowBottom(minimiEquip.minimiId || "", singleBase)}px` }}
                                    />
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
                        {onAddMinimi && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onAddMinimi(); }}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white/20 text-white hover:bg-white/30 transition-colors"
                            >
                                <Archive className="w-3.5 h-3.5" />
                                보관함
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

            {/* 배경 효과 - isMounted 가드 + seeded random으로 hydration mismatch 방지 */}
            {isMounted && backgroundSlug === "starry_night" && (
                <div className="absolute inset-0 pointer-events-none">
                    {starPositions.map((pos, i) => (
                        <div
                            key={i}
                            className="absolute w-0.5 h-0.5 bg-white rounded-full animate-pulse"
                            style={{
                                top: `${pos.top}%`,
                                left: `${pos.left}%`,
                                animationDelay: `${pos.delay}s`,
                                animationDuration: `${pos.duration}s`,
                                opacity: pos.opacity,
                            }}
                        />
                    ))}
                </div>
            )}

            {isMounted && backgroundSlug === "cherry_blossom" && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {cherryPositions.map((pos, i) => (
                        <div
                            key={i}
                            className="absolute text-pink-300/60 text-xs animate-bounce"
                            style={{
                                top: `${pos.top}%`,
                                left: `${pos.left}%`,
                                animationDelay: `${pos.delay}s`,
                                animationDuration: `${pos.duration}s`,
                            }}
                        >
                            *
                        </div>
                    ))}
                </div>
            )}

            {isMounted && backgroundSlug === "winter_snow" && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {snowPositions.map((pos, i) => (
                        <div
                            key={i}
                            className="absolute w-1 h-1 bg-white/70 rounded-full animate-bounce"
                            style={{
                                top: `${pos.top}%`,
                                left: `${pos.left}%`,
                                animationDelay: `${pos.delay}s`,
                                animationDuration: `${pos.duration}s`,
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
