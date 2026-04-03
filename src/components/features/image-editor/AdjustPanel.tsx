/**
 * AdjustPanel.tsx
 * 밝기/대비/채도 조절 슬라이더 패널
 */

"use client";

import { RotateCcw } from "lucide-react";
import type { ImageAdjustments } from "@/types";

interface AdjustPanelProps {
    adjustments: ImageAdjustments;
    onChange: (adjustments: ImageAdjustments) => void;
}

const SLIDERS: {
    key: keyof ImageAdjustments;
    label: string;
}[] = [
    { key: "brightness", label: "밝기" },
    { key: "contrast", label: "대비" },
    { key: "saturation", label: "채도" },
];

export default function AdjustPanel({ adjustments, onChange }: AdjustPanelProps) {
    const handleChange = (key: keyof ImageAdjustments, value: number) => {
        onChange({ ...adjustments, [key]: value });
    };

    const handleReset = (key: keyof ImageAdjustments) => {
        onChange({ ...adjustments, [key]: 100 });
    };

    return (
        <div className="px-4 py-3 space-y-3">
            {SLIDERS.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3">
                    <span className="text-xs text-gray-300 w-8 flex-shrink-0">
                        {label}
                    </span>
                    <input
                        type="range"
                        min={0}
                        max={200}
                        value={adjustments[key]}
                        onChange={(e) => handleChange(key, Number(e.target.value))}
                        className="flex-1 h-1 bg-gray-600 rounded-full appearance-none cursor-pointer
                            [&::-webkit-slider-thumb]:appearance-none
                            [&::-webkit-slider-thumb]:w-5
                            [&::-webkit-slider-thumb]:h-5
                            [&::-webkit-slider-thumb]:rounded-full
                            [&::-webkit-slider-thumb]:bg-white
                            [&::-webkit-slider-thumb]:shadow-md
                            [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                    <span className="text-xs text-gray-400 w-8 text-right tabular-nums">
                        {adjustments[key]}
                    </span>
                    <button
                        type="button"
                        onClick={() => handleReset(key)}
                        className={`p-1 rounded transition-opacity ${
                            adjustments[key] === 100
                                ? "opacity-20 pointer-events-none"
                                : "opacity-60 hover:opacity-100"
                        }`}
                        aria-label={`${label} 초기화`}
                    >
                        <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                </div>
            ))}
        </div>
    );
}
