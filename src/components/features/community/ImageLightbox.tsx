/**
 * ImageLightbox - 게시글 첨부 이미지 확대 보기 (새 탭 대신 모달)
 *
 * 동작: 이미지 클릭 → 전체화면 모달로 크게 표시. 이미지/배경 어디든 클릭·터치하거나 Esc로 닫힘.
 * controlled: src가 있으면 열림, null이면 닫힘.
 */

"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect } from "react";
import { X } from "lucide-react";

interface ImageLightboxProps {
    src: string | null;
    alt?: string;
    onClose: () => void;
}

export default function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
    useEffect(() => {
        if (!src) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [src, onClose]);

    if (!src) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
            // 이미지/배경 어디를 클릭·터치해도 닫힘
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label="이미지 확대 보기"
        >
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                aria-label="닫기"
            >
                <X className="w-6 h-6" />
            </button>
            <img
                src={src}
                alt={alt || "첨부 이미지"}
                className="max-w-full max-h-[90vh] object-contain select-none"
                loading="lazy"
                referrerPolicy="no-referrer"
            />
        </div>
    );
}
