"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Move, X, Check, RotateCcw } from "lucide-react";
import type { CropPosition } from "@/types";

// Re-export for backward compatibility
export type { CropPosition };

interface ImageCropperProps {
    imageUrl: string;
    initialPosition?: CropPosition;
    onSave: (position: CropPosition) => void;
    onCancel: () => void;
}

export default function ImageCropper({
    imageUrl,
    initialPosition,
    onSave,
    onCancel,
}: ImageCropperProps) {
    // position.x, y는 이제 translate 퍼센트값 (0이 중앙)
    const [position, setPosition] = useState<CropPosition>(
        initialPosition || { x: 50, y: 50, scale: 1 }
    );
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0, ratio: 1 });
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    // 이미지 로드 시 비율 계산
    useEffect(() => {
        const img = new Image();
        img.onload = () => {
            const ratio = img.width / img.height;
            setImageDimensions({
                width: img.width,
                height: img.height,
                ratio
            });
        };
        img.src = imageUrl;
    }, [imageUrl]);

    // 이동 범위 계산 (scale에 따라 달라짐)
    const getMovementBounds = useCallback(() => {
        const { ratio } = imageDimensions;
        const { scale } = position;

        // 컨테이너는 1:1 정사각형
        // 이미지가 가로로 긴 경우 (ratio > 1): 좌우로 이동 가능
        // 이미지가 세로로 긴 경우 (ratio < 1): 위아래로 이동 가능
        // scale이 커지면 양방향 모두 이동 가능

        let maxX = 0;
        let maxY = 0;

        if (ratio > 1) {
            // 가로 사진: 기본적으로 좌우 이동, 확대시 위아래도
            maxX = ((ratio - 1) / 2) * 100 + (scale - 1) * 50;
            maxY = (scale - 1) * 50;
        } else if (ratio < 1) {
            // 세로 사진: 기본적으로 위아래 이동, 확대시 좌우도
            maxX = (scale - 1) * 50;
            maxY = ((1 / ratio - 1) / 2) * 100 + (scale - 1) * 50;
        } else {
            // 정사각형: 확대시에만 이동 가능
            maxX = (scale - 1) * 50;
            maxY = (scale - 1) * 50;
        }

        return { maxX, maxY };
    }, [imageDimensions, position]);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!isDragging || !containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            const deltaX = ((e.clientX - dragStart.x) / rect.width) * 100;
            const deltaY = ((e.clientY - dragStart.y) / rect.height) * 100;

            const bounds = getMovementBounds();

            setPosition((prev) => ({
                ...prev,
                x: Math.max(50 - bounds.maxX, Math.min(50 + bounds.maxX, prev.x - deltaX)),
                y: Math.max(50 - bounds.maxY, Math.min(50 + bounds.maxY, prev.y - deltaY)),
            }));

            setDragStart({ x: e.clientX, y: e.clientY });
        },
        [isDragging, dragStart, getMovementBounds]
    );

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleTouchStart = (e: React.TouchEvent) => {
        e.preventDefault();
        const touch = e.touches[0];
        setIsDragging(true);
        setDragStart({ x: touch.clientX, y: touch.clientY });
    };

    const handleTouchMove = useCallback(
        (e: TouchEvent) => {
            if (!isDragging || !containerRef.current) return;
            const touch = e.touches[0];
            const rect = containerRef.current.getBoundingClientRect();
            const deltaX = ((touch.clientX - dragStart.x) / rect.width) * 100;
            const deltaY = ((touch.clientY - dragStart.y) / rect.height) * 100;

            const bounds = getMovementBounds();

            setPosition((prev) => ({
                ...prev,
                x: Math.max(50 - bounds.maxX, Math.min(50 + bounds.maxX, prev.x - deltaX)),
                y: Math.max(50 - bounds.maxY, Math.min(50 + bounds.maxY, prev.y - deltaY)),
            }));

            setDragStart({ x: touch.clientX, y: touch.clientY });
        },
        [isDragging, dragStart, getMovementBounds]
    );

    const handleTouchEnd = useCallback(() => {
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
            window.addEventListener("touchmove", handleTouchMove, { passive: false });
            window.addEventListener("touchend", handleTouchEnd);
            return () => {
                window.removeEventListener("mousemove", handleMouseMove);
                window.removeEventListener("mouseup", handleMouseUp);
                window.removeEventListener("touchmove", handleTouchMove);
                window.removeEventListener("touchend", handleTouchEnd);
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

    const handleScale = (delta: number) => {
        setPosition((prev) => {
            const newScale = Math.max(1, Math.min(3, prev.scale + delta));

            // scale이 줄어들면 position도 범위 내로 조정
            const { ratio } = imageDimensions;
            let maxX = 0;
            let maxY = 0;

            if (ratio > 1) {
                maxX = ((ratio - 1) / 2) * 100 + (newScale - 1) * 50;
                maxY = (newScale - 1) * 50;
            } else if (ratio < 1) {
                maxX = (newScale - 1) * 50;
                maxY = ((1 / ratio - 1) / 2) * 100 + (newScale - 1) * 50;
            } else {
                maxX = (newScale - 1) * 50;
                maxY = (newScale - 1) * 50;
            }

            return {
                scale: newScale,
                x: Math.max(50 - maxX, Math.min(50 + maxX, prev.x)),
                y: Math.max(50 - maxY, Math.min(50 + maxY, prev.y)),
            };
        });
    };

    const handleReset = () => {
        setPosition({ x: 50, y: 50, scale: 1 });
    };

    // 이미지 스타일 계산
    const getImageStyle = () => {
        const { ratio } = imageDimensions;
        const { scale, x, y } = position;

        // 이미지가 컨테이너를 채우도록 크기 조정
        let width = '100%';
        let height = '100%';

        if (ratio > 1) {
            // 가로 사진: 높이 100%, 너비는 비율에 맞게
            height = `${100 * scale}%`;
            width = `${100 * ratio * scale}%`;
        } else if (ratio < 1) {
            // 세로 사진: 너비 100%, 높이는 비율에 맞게
            width = `${100 * scale}%`;
            height = `${100 / ratio * scale}%`;
        } else {
            // 정사각형
            width = `${100 * scale}%`;
            height = `${100 * scale}%`;
        }

        // translate로 위치 조정 (50이 중앙)
        const translateX = -(x - 50);
        const translateY = -(y - 50);

        return {
            width,
            height,
            position: 'absolute' as const,
            left: '50%',
            top: '50%',
            transform: `translate(calc(-50% + ${translateX}%), calc(-50% + ${translateY}%))`,
            objectFit: 'cover' as const,
        };
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full">
                <h3 className="text-lg font-semibold mb-2 text-center">
                    사진 영역 선택
                </h3>
                <p className="text-sm text-gray-500 text-center mb-4">
                    드래그하여 원하는 영역을 선택하세요
                </p>

                <div
                    ref={containerRef}
                    className="relative w-full aspect-square rounded-xl overflow-hidden cursor-move border-4 border-[#05B2DC]"
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        ref={imageRef}
                        src={imageUrl}
                        alt="Crop preview"
                        style={getImageStyle()}
                        draggable={false}
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-16 h-16 border-2 border-white/70 rounded-full flex items-center justify-center bg-black/20">
                            <Move className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    {/* 그리드 가이드 */}
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
                        <div className="absolute right-1/3 top-0 bottom-0 w-px bg-white/30" />
                        <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
                        <div className="absolute bottom-1/3 left-0 right-0 h-px bg-white/30" />
                    </div>
                </div>

                <div className="flex items-center justify-center gap-4 mt-4">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleScale(-0.2)}
                        disabled={position.scale <= 1}
                    >
                        <ZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-gray-500 w-16 text-center">
                        {Math.round(position.scale * 100)}%
                    </span>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleScale(0.2)}
                        disabled={position.scale >= 3}
                    >
                        <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleReset}
                        title="초기화"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </Button>
                </div>

                <div className="flex gap-3 mt-6">
                    <Button
                        variant="outline"
                        onClick={onCancel}
                        className="flex-1"
                    >
                        <X className="w-4 h-4 mr-2" />
                        취소
                    </Button>
                    <Button
                        onClick={() => onSave(position)}
                        className="flex-1 bg-[#05B2DC] hover:bg-[#0891B2]"
                    >
                        <Check className="w-4 h-4 mr-2" />
                        적용
                    </Button>
                </div>
            </div>
        </div>
    );
}
