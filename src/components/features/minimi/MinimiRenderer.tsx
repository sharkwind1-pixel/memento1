/**
 * MinimiRenderer.tsx
 * CSS box-shadow 기반 픽셀 미니미 렌더러
 * 캐릭터 + 악세서리 레이어링 지원
 */

"use client";

import React, { useMemo } from "react";
import type { PixelData } from "@/types";

interface MinimiRendererProps {
    pixelData: PixelData | null;
    accessoriesData?: PixelData[];
    size?: "xs" | "sm" | "md" | "lg" | "xl";
    className?: string;
    showEmpty?: boolean;
}

/** 사이즈별 픽셀 스케일 (1도트 = N px) */
const SIZE_MAP = {
    xs: 2,
    sm: 3,
    md: 4,
    lg: 6,
    xl: 8,
} as const;

/**
 * box-shadow 문자열의 좌표를 스케일링
 * "4px 1px #f5deb3, 5px 1px #f5deb3" → 스케일 3x → "12px 3px #f5deb3, 15px 3px #f5deb3"
 */
function scalePixels(pixels: string, scale: number): string {
    if (!pixels) return "";
    return pixels.replace(
        /(\d+)px\s+(\d+)px\s+(#[0-9a-fA-F]+)/g,
        (_, x, y, color) => {
            return `${parseInt(x) * scale}px ${parseInt(y) * scale}px 0 ${scale - 1}px ${color}`;
        }
    );
}

export default function MinimiRenderer({
    pixelData,
    accessoriesData = [],
    size = "md",
    className = "",
    showEmpty = false,
}: MinimiRendererProps) {
    const scale = SIZE_MAP[size];

    const scaledPixels = useMemo(() => {
        if (!pixelData?.pixels) return "";
        return scalePixels(pixelData.pixels, scale);
    }, [pixelData?.pixels, scale]);

    const scaledAccessories = useMemo(() => {
        return accessoriesData
            .filter(acc => acc?.pixels)
            .map(acc => scalePixels(acc.pixels, scale));
    }, [accessoriesData, scale]);

    if (!pixelData) {
        if (!showEmpty) return null;
        // 빈 슬롯 표시
        const emptySize = 16 * scale;
        return (
            <div
                className={`inline-flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 ${className}`}
                style={{ width: emptySize, height: emptySize }}
            >
                <span className="text-gray-400 dark:text-gray-500" style={{ fontSize: scale * 3 }}>?</span>
            </div>
        );
    }

    const width = pixelData.width * scale;
    const height = pixelData.height * scale;

    return (
        <div
            className={`relative inline-block ${className}`}
            style={{
                width,
                height,
                imageRendering: "pixelated",
            }}
        >
            {/* 캐릭터 베이스 레이어 */}
            <div
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "1px",
                    height: "1px",
                    boxShadow: scaledPixels,
                    overflow: "hidden",
                }}
            />
            {/* 악세서리 레이어들 */}
            {scaledAccessories.map((accShadow, i) => (
                <div
                    key={i}
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "1px",
                        height: "1px",
                        boxShadow: accShadow,
                        overflow: "hidden",
                    }}
                />
            ))}
        </div>
    );
}

/** 스케일링 유틸 export (다른 곳에서 사용 가능) */
export { scalePixels, SIZE_MAP };
