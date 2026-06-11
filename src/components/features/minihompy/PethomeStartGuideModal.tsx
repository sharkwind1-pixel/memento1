/**
 * PethomeStartGuideModal.tsx
 * 새 유저용 펫홈 시작 가이드.
 * 빈 펫홈에서 "펫홈 꾸미러 가기"를 누르면 표시 — 펫홈이 무엇인지 + 꾸미는 3단계를
 * 설명하고 상점으로 안내한다. (산만한 첫 화면에 "뭐부터 할지"를 명확히 주는 온보딩)
 */

"use client";

import React from "react";
import { Sparkles, ShoppingBag, MapPin, MessageSquare, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PethomeStartGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** 가이드를 닫고 실제 꾸미기(상점)로 진입 */
    onStart: () => void;
    isMemorialMode?: boolean;
}

const STEPS = [
    { icon: ShoppingBag, title: "꼬미 데려오기", desc: "상점에서 우리 아이를 닮은 꼬미를 데려와요" },
    { icon: MapPin, title: "펫홈에 배치하기", desc: "꼬미와 가구를 원하는 자리에 놓아요" },
    { icon: MessageSquare, title: "배경·인사말로 꾸미기", desc: "배경을 바꾸고 인사말을 남겨 나만의 공간으로" },
];

export default function PethomeStartGuideModal({
    isOpen,
    onClose,
    onStart,
    isMemorialMode = false,
}: PethomeStartGuideModalProps) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    aria-label="닫기"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex flex-col items-center text-center mb-5">
                    <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center mb-3",
                        isMemorialMode ? "bg-memorial-100" : "bg-memento-100"
                    )}>
                        <Sparkles className={cn("w-6 h-6", isMemorialMode ? "text-memorial-500" : "text-memento-500")} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">펫홈을 꾸며볼까요?</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                        우리 아이의 공간이에요. 세 단계로 시작해요
                    </p>
                </div>

                <div className="space-y-3 mb-6">
                    {STEPS.map((s, i) => (
                        <div key={i} className="flex items-start gap-3">
                            <div className={cn(
                                "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                                isMemorialMode ? "bg-memorial-50 text-memorial-500" : "bg-memento-50 text-memento-500"
                            )}>
                                <s.icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                    {i + 1}. {s.title}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{s.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    onClick={onStart}
                    className={cn(
                        "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold transition-all active:scale-[0.99]",
                        isMemorialMode ? "bg-memorial-500 hover:bg-memorial-600" : "bg-memento-500 hover:bg-memento-600"
                    )}
                >
                    <ShoppingBag className="w-4 h-4" />
                    상점에서 꼬미 데려오기
                </button>
                <p className="text-center text-[11px] text-gray-400 mt-2">
                    포인트는 출석·활동으로 모을 수 있어요
                </p>
            </div>
        </div>
    );
}
