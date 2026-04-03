/**
 * FilterPanel.tsx
 * 필터 프리셋 썸네일 가로 스크롤 패널
 */

"use client";

import { useEffect, useState, useRef } from "react";
import type { FilterPreset } from "@/types";
import { FILTER_PRESETS, generateFilterThumbnail } from "@/lib/image-editor";

interface FilterPanelProps {
    imageElement: HTMLImageElement | null;
    selectedFilter: FilterPreset;
    onSelect: (filter: FilterPreset) => void;
}

const FILTER_KEYS: FilterPreset[] = [
    "original",
    "warm",
    "cool",
    "vivid",
    "soft",
    "vintage",
    "bright",
    "bw",
];

export default function FilterPanel({
    imageElement,
    selectedFilter,
    onSelect,
}: FilterPanelProps) {
    const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
    const scrollRef = useRef<HTMLDivElement>(null);

    // 마운트 시 필터 썸네일 생성
    useEffect(() => {
        if (!imageElement) return;
        const thumbs: Record<string, string> = {};
        for (const key of FILTER_KEYS) {
            thumbs[key] = generateFilterThumbnail(imageElement, key, 56);
        }
        setThumbnails(thumbs);
    }, [imageElement]);

    return (
        <div
            ref={scrollRef}
            className="flex gap-3 px-4 py-3 overflow-x-auto scrollbar-hide"
        >
            {FILTER_KEYS.map((key) => (
                <button
                    key={key}
                    type="button"
                    onClick={() => onSelect(key)}
                    className="flex flex-col items-center gap-1 flex-shrink-0"
                >
                    <div
                        className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors ${
                            selectedFilter === key
                                ? "border-white"
                                : "border-transparent"
                        }`}
                    >
                        {thumbnails[key] ? (
                            <img
                                src={thumbnails[key]}
                                alt={FILTER_PRESETS[key].label}
                                className="w-full h-full object-cover"
                                draggable={false}
                            />
                        ) : (
                            <div className="w-full h-full bg-gray-700" />
                        )}
                    </div>
                    <span
                        className={`text-[10px] transition-colors ${
                            selectedFilter === key
                                ? "text-white font-medium"
                                : "text-gray-400"
                        }`}
                    >
                        {FILTER_PRESETS[key].label}
                    </span>
                </button>
            ))}
        </div>
    );
}
