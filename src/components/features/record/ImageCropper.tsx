"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Move, X, Check } from "lucide-react";

export interface CropPosition {
    x: number;
    y: number;
    scale: number;
}

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
    const [position, setPosition] = useState<CropPosition>(
        initialPosition || { x: 50, y: 50, scale: 1 }
    );
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!isDragging || !containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            setPosition((prev) => ({
                ...prev,
                x: Math.max(0, Math.min(100, x)),
                y: Math.max(0, Math.min(100, y)),
            }));
        },
        [isDragging]
    );

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleTouchStart = (e: React.TouchEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleTouchMove = useCallback(
        (e: TouchEvent) => {
            if (!isDragging || !containerRef.current) return;
            const touch = e.touches[0];
            const rect = containerRef.current.getBoundingClientRect();
            const x = ((touch.clientX - rect.left) / rect.width) * 100;
            const y = ((touch.clientY - rect.top) / rect.height) * 100;
            setPosition((prev) => ({
                ...prev,
                x: Math.max(0, Math.min(100, x)),
                y: Math.max(0, Math.min(100, y)),
            }));
        },
        [isDragging]
    );

    const handleTouchEnd = useCallback(() => {
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
            window.addEventListener("touchmove", handleTouchMove);
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
        setPosition((prev) => ({
            ...prev,
            scale: Math.max(1, Math.min(3, prev.scale + delta)),
        }));
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full">
                <h3 className="text-lg font-semibold mb-2 text-center">
                    사진 영역 선택
                </h3>
                <p className="text-sm text-gray-500 text-center mb-4">
                    1:1 비율로 보여질 영역을 선택하세요
                </p>

                <div
                    ref={containerRef}
                    className="relative w-full aspect-square rounded-xl overflow-hidden cursor-move border-4 border-[#05B2DC]"
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={imageUrl}
                        alt="Crop preview"
                        className="absolute w-full h-full"
                        style={{
                            objectFit: "cover",
                            objectPosition: `${position.x}% ${position.y}%`,
                            transform: `scale(${position.scale})`,
                        }}
                        draggable={false}
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-16 h-16 border-2 border-white/70 rounded-full flex items-center justify-center bg-black/20">
                            <Move className="w-8 h-8 text-white" />
                        </div>
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
