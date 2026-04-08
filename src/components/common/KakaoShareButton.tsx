/**
 * KakaoShareButton - 카카오톡 공유 버튼
 * 카카오 SDK → Web Share API → 클립보드 폴백
 */

"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { shareViaKakao, type ShareParams } from "@/lib/kakao-share";

interface KakaoShareButtonProps {
    shareParams: ShareParams;
    className?: string;
    size?: "sm" | "md";
    label?: string;
}

export default function KakaoShareButton({
    shareParams,
    className = "",
    size = "sm",
    label,
}: KakaoShareButtonProps) {
    const [isSharing, setIsSharing] = useState(false);

    const handleShare = async () => {
        if (isSharing) return;
        setIsSharing(true);

        try {
            const result = await shareViaKakao(shareParams);
            if (result === "clipboard") {
                toast.success("링크가 복사되었습니다");
            } else if (result === "failed") {
                toast.error("공유에 실패했습니다");
            }
        } catch {
            toast.error("공유 중 오류가 발생했습니다");
        } finally {
            setIsSharing(false);
        }
    };

    const sizeClass = size === "sm"
        ? "p-2 min-w-[36px] min-h-[36px]"
        : "p-2.5 min-w-[44px] min-h-[44px]";

    return (
        <button
            onClick={handleShare}
            disabled={isSharing}
            className={`flex items-center justify-center gap-1.5 rounded-xl text-gray-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors ${sizeClass} ${className}`}
            aria-label="공유하기"
        >
            <Share2 className={size === "sm" ? "w-4 h-4" : "w-5 h-5"} />
            {label && <span className="text-xs">{label}</span>}
        </button>
    );
}
