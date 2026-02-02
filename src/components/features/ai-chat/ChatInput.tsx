/**
 * ChatInput
 * =========
 * AI 펫톡 메시지 입력 컴포넌트
 */

"use client";

import { forwardRef } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EMOTION_ICONS } from "@/constants";
import type { EmotionType } from "@/types";

interface ChatInputProps {
    /** 입력값 */
    value: string;
    /** 입력값 변경 핸들러 */
    onChange: (value: string) => void;
    /** 전송 핸들러 */
    onSend: () => void;
    /** 추모 모드 여부 */
    isMemorialMode: boolean;
    /** 펫 이름 */
    petName?: string;
    /** 마지막 감정 */
    lastEmotion?: EmotionType;
    /** 전송 비활성화 */
    disabled?: boolean;
}

/**
 * 메시지 입력 컴포넌트
 */
export const ChatInput = forwardRef<HTMLInputElement, ChatInputProps>(
    function ChatInput(
        {
            value,
            onChange,
            onSend,
            isMemorialMode,
            petName,
            lastEmotion = "neutral",
            disabled = false,
        },
        ref
    ) {
        /** 엔터 키 핸들러 (한글 조합 중 버그 방지) */
        const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
            }
        };

        return (
            <div
                className={`flex-shrink-0 p-4 border-t ${
                    isMemorialMode
                        ? "bg-amber-50/80 border-amber-200/50"
                        : "bg-white/80 border-gray-200/50"
                } backdrop-blur-lg`}
            >
                <div className="max-w-2xl mx-auto">
                    {/* 입력 영역 */}
                    <div className="flex gap-3">
                        <Input
                            ref={ref}
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={`${petName || "반려동물"}에게 말해보세요...`}
                            className="flex-1 rounded-xl border-gray-200 bg-white"
                        />
                        <Button
                            onClick={onSend}
                            disabled={!value.trim() || disabled}
                            className={`rounded-xl px-4 ${
                                isMemorialMode
                                    ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                                    : "bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] hover:from-[#0891B2] hover:to-[#05B2DC]"
                            } shadow-lg`}
                        >
                            <Send className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* 하단 정보 */}
                    <div className="flex items-center justify-center gap-2 mt-2">
                        {lastEmotion !== "neutral" && (
                            <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <span>{EMOTION_ICONS[lastEmotion] || "😐"}</span>
                                <span className="text-gray-500">감정 인식됨</span>
                            </span>
                        )}
                        <p className="text-xs text-gray-500">
                            {isMemorialMode
                                ? "소중한 기억을 함께 나눠요"
                                : "AI가 반려동물의 입장에서 대화합니다"}
                        </p>
                    </div>
                </div>
            </div>
        );
    }
);
