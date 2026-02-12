/**
 * PointsEarnedToast.tsx
 * 포인트 획득 알림 토스트
 * - 획득 포인트 + 활동명 표시
 * - 3초 후 자동 사라짐
 * - 화면 하단 중앙에 표시
 */

"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

interface PointsEarnedToastProps {
    points: number;
    label: string;
    onClose: () => void;
}

export default function PointsEarnedToast({ points, label, onClose }: PointsEarnedToastProps) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // 등장 애니메이션
        requestAnimationFrame(() => setVisible(true));

        // 3초 후 사라짐
        const timer = setTimeout(() => {
            setVisible(false);
            setTimeout(onClose, 300); // 애니메이션 후 제거
        }, 3000);

        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div
            className={cn(
                "fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999]",
                "transition-all duration-300",
                visible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-4"
            )}
        >
            <div className={cn(
                "flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-lg",
                "bg-gradient-to-r from-sky-500 to-violet-500",
                "text-white text-sm font-medium"
            )}>
                <Star className="w-4 h-4 flex-shrink-0" />
                <span>{label}으로 +{points}P 획득</span>
            </div>
        </div>
    );
}
