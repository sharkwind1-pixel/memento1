/**
 * ChatInputArea.tsx
 * AI 펫톡 채팅 입력 영역
 * AIChatPage에서 분리 - 입력창, 추천 대화 칩, 사용량 표시, 제한 도달 UI
 */

"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Send,
    Sparkles,
    Moon,
    CloudSun,
    Syringe,
    Stethoscope,
    Footprints,
    Cookie,
    Star,
} from "lucide-react";
import { toast } from "sonner";
import { MAX_MESSAGE_LENGTH } from "@/components/features/chat";
import { emotionIcons } from "./chatTypes";
import type { Pet } from "@/types";
import type { LucideIcon } from "lucide-react";

interface ChatInputAreaProps {
    inputValue: string;
    setInputValue: (value: string) => void;
    isMemorialMode: boolean;
    isLimitReached: boolean;
    isPremium: boolean;
    remainingChats: number;
    lastEmotion: string;
    suggestedQuestions: string[];
    setSuggestedQuestions: (questions: string[]) => void;
    selectedPet: Pet | null | undefined;
    onSend: (directMessage?: string) => void;
}

/** 기본 추천 대화 버튼 정의 */
interface SuggestionChip {
    text: string;
    Icon: LucideIcon;
}

const MEMORIAL_SUGGESTIONS: SuggestionChip[] = [
    { text: "잘 지냈어?", Icon: Sparkles },
    { text: "보고싶어", Icon: Moon },
    { text: "오늘 네 생각 났어", Icon: Star },
    { text: "행복했던 기억", Icon: CloudSun },
];

const ACTIVE_SUGGESTIONS: SuggestionChip[] = [
    { text: "예방접종 언제?", Icon: Syringe },
    { text: "건강 체크해줘", Icon: Stethoscope },
    { text: "산책 시간", Icon: Footprints },
    { text: "간식 추천", Icon: Cookie },
];

export default function ChatInputArea({
    inputValue,
    setInputValue,
    isMemorialMode,
    isLimitReached,
    isPremium,
    remainingChats,
    lastEmotion,
    suggestedQuestions,
    setSuggestedQuestions,
    selectedPet,
    onSend,
}: ChatInputAreaProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.nativeEvent.isComposing) return;
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    };

    const handleTextareaInput = () => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.style.height = "auto";
        const maxHeight = 84;
        textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    };

    const defaultSuggestions = isMemorialMode ? MEMORIAL_SUGGESTIONS : ACTIVE_SUGGESTIONS;

    return (
        <div
            className={`flex-shrink-0 px-4 pt-2 pb-2 border-t transition-all duration-700 ease-in-out ${isMemorialMode ? "bg-amber-50/80 border-amber-200/50" : "bg-white/80 border-gray-200/50"} backdrop-blur-lg`}
        >
            <div className="max-w-2xl mx-auto">
                {isLimitReached ? (
                    <div className="text-center py-4">
                        {isMemorialMode ? (
                            <div className="bg-gradient-to-r from-amber-100 to-orange-100 rounded-2xl p-6 mb-3">
                                <p className="text-gray-700 font-medium mb-2">
                                    오늘은 여기까지 이야기 나눌 수 있어요
                                </p>
                                <p className="text-sm text-amber-700 mb-4">
                                    {selectedPet?.name}는 내일도 여기서 기다리고 있을게요.
                                </p>
                                <p className="text-xs text-amber-600/80">
                                    <button
                                        onClick={() => {
                                            toast.info("결제 시스템이 곧 오픈됩니다. 조금만 기다려주세요!");
                                        }}
                                        className="underline hover:text-amber-700 transition-colors"
                                    >
                                        프리미엄으로 더 많은 대화하기
                                    </button>
                                </p>
                            </div>
                        ) : (
                            <div className="bg-gradient-to-r from-violet-100 to-sky-100 rounded-2xl p-6 mb-3">
                                <p className="text-gray-700 font-medium mb-2">
                                    오늘의 무료 대화를 모두 사용했어요
                                </p>
                                <p className="text-sm text-gray-500 mb-4">
                                    프리미엄으로 {selectedPet?.name}와(과) 무제한 대화하세요
                                </p>
                                <Button
                                    className="bg-gradient-to-r from-violet-500 to-sky-500 hover:from-violet-600 hover:to-sky-600 text-white rounded-full px-6"
                                    onClick={() => {
                                        toast.info("결제 시스템이 곧 오픈됩니다. 조금만 기다려주세요!");
                                    }}
                                >
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    프리미엄 시작하기
                                </Button>
                                <p className="text-xs text-violet-500 mt-2">
                                    커피 한 잔 값, 월 7,900원
                                </p>
                            </div>
                        )}
                        <p className="text-xs text-gray-400">
                            내일 다시 10회 무료 대화가 충전돼요
                        </p>
                    </div>
                ) : (
                    <>
                        {/* 추천 대화 버튼 */}
                        <div className="flex gap-2 mb-2 overflow-x-auto scrollbar-hide pb-1 snap-x scroll-smooth-touch">
                            {suggestedQuestions.length > 0 ? (
                                suggestedQuestions.map((question, idx) => (
                                    <button
                                        key={question}
                                        onClick={() => { setSuggestedQuestions([]); onSend(question); }}
                                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-[1.03] active:scale-95 min-h-[38px] shadow-sm hover:shadow-md whitespace-nowrap flex-shrink-0 snap-start chip-enter ${
                                            isMemorialMode
                                                ? "bg-amber-100 hover:bg-amber-200 text-amber-700 border border-amber-200"
                                                : "bg-[#E0F7FF] hover:bg-[#BAE6FD] text-[#0891B2] border border-[#BAE6FD]"
                                        }`}
                                        style={{ animationDelay: `${idx * 80}ms` }}
                                    >
                                        <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                                        <span>{question}</span>
                                    </button>
                                ))
                            ) : (
                                defaultSuggestions.map((suggestion, idx) => (
                                    <button
                                        key={suggestion.text}
                                        onClick={() => { onSend(suggestion.text); }}
                                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-[1.03] active:scale-95 min-h-[38px] shadow-sm hover:shadow-md whitespace-nowrap flex-shrink-0 snap-start chip-enter ${
                                            isMemorialMode
                                                ? "bg-amber-100 hover:bg-amber-200 text-amber-700 border border-amber-200"
                                                : "bg-[#E0F7FF] hover:bg-[#BAE6FD] text-[#0891B2] border border-[#BAE6FD]"
                                        }`}
                                        style={{ animationDelay: `${idx * 80}ms` }}
                                    >
                                        <suggestion.Icon className="w-3.5 h-3.5 flex-shrink-0" />
                                        <span>{suggestion.text}</span>
                                    </button>
                                ))
                            )}
                        </div>
                        <div className={`flex gap-2 sm:gap-3 items-end rounded-xl border transition-all ${
                            isMemorialMode ? "textarea-glow-amber" : "textarea-glow-sky"
                        } border-gray-200 bg-white p-1.5`}>
                            <Textarea
                                ref={textareaRef}
                                value={inputValue}
                                onChange={(e) => {
                                    setInputValue(e.target.value.slice(0, MAX_MESSAGE_LENGTH));
                                    handleTextareaInput();
                                }}
                                onKeyDown={handleKeyDown}
                                placeholder={`${selectedPet?.name}에게 말해보세요...`}
                                className="flex-1 rounded-lg border-0 bg-transparent shadow-none text-base resize-none min-h-[40px] max-h-[84px] py-2 px-2 focus-visible:ring-0 focus-visible:ring-offset-0"
                                rows={1}
                                style={{ height: "40px" }}
                            />
                            <Button
                                onClick={() => onSend()}
                                disabled={!inputValue.trim()}
                                aria-label="메시지 전송"
                                className={`rounded-lg px-3 min-w-[44px] min-h-[44px] flex-shrink-0 transition-all ${
                                    inputValue.trim()
                                        ? isMemorialMode
                                            ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg"
                                            : "bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] hover:from-[#0891B2] hover:to-[#05B2DC] shadow-lg"
                                        : "bg-gray-200 text-gray-400"
                                } active:scale-95 transition-transform`}
                            >
                                <Send className="w-5 h-5" />
                            </Button>
                        </div>
                        {/* 글자 수 카운터 */}
                        {inputValue.length > 0 && (
                            <div className="flex justify-end mt-1 mr-14">
                                <span className={`text-xs transition-colors ${
                                    inputValue.length >= MAX_MESSAGE_LENGTH
                                        ? "text-red-500 font-medium"
                                        : inputValue.length >= MAX_MESSAGE_LENGTH - 30
                                        ? "text-amber-500"
                                        : "text-gray-400"
                                }`}>
                                    {inputValue.length}/{MAX_MESSAGE_LENGTH}
                                </span>
                            </div>
                        )}
                        <div className="flex items-center justify-center gap-2 mt-1 flex-wrap">
                            {isPremium ? (
                                <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1 bg-violet-100 text-violet-600 whitespace-nowrap">
                                    <Sparkles className="w-3 h-3 flex-shrink-0" />
                                    <span className="hidden sm:inline">프리미엄 회원 — 마음껏 이야기하세요</span>
                                    <span className="sm:hidden">프리미엄 무제한</span>
                                </span>
                            ) : (
                                <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                    remainingChats <= 3
                                        ? "bg-red-100 text-red-600"
                                        : remainingChats <= 7
                                        ? "bg-amber-100 text-amber-600"
                                        : "bg-sky-100 text-sky-600"
                                }`}>
                                    오늘 {remainingChats}회 남음
                                </span>
                            )}
                            {lastEmotion !== "neutral" && (
                                <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <span>{emotionIcons[lastEmotion] || "\u{1F610}"}</span>
                                    <span className="text-gray-500">감정 인식됨</span>
                                </span>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
