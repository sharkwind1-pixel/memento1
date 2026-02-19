/**
 * ChatMessageList.tsx
 * AI 펫톡 채팅 메시지 목록 + 타이핑 인디케이터
 * AIChatPage에서 분리 - 메시지 버블 렌더링 담당
 */

"use client";

/* eslint-disable @next/next/no-img-element */

import { useRef, useEffect } from "react";
import { PawPrint, RotateCcw } from "lucide-react";
import type { Pet } from "@/types";
import {
    ChatMessage,
    emotionIcons,
    emotionBubbleTint,
    emotionLabels,
    formatTimestamp,
    hasTimeGap,
} from "./chatTypes";

interface ChatMessageListProps {
    messages: ChatMessage[];
    isTyping: boolean;
    isMemorialMode: boolean;
    selectedPet: Pet | null | undefined;
    onRetry: (errorMessageId: string, retryMessage: string) => void;
}

export default function ChatMessageList({
    messages,
    isTyping,
    isMemorialMode,
    selectedPet,
    onRetry,
}: ChatMessageListProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isTyping]);

    return (
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
            {messages.map((message, index) => {
                const showTimestamp =
                    index === 0 ||
                    hasTimeGap(messages[index - 1].timestamp, message.timestamp);

                const emotionTintClass =
                    message.role === "pet" && message.emotion && emotionBubbleTint[message.emotion]
                        ? emotionBubbleTint[message.emotion]
                        : "";

                return (
                    <div key={message.id}>
                        {showTimestamp && (
                            <div className="chat-timestamp my-2">
                                <span>{formatTimestamp(message.timestamp)}</span>
                            </div>
                        )}

                        {message.role === "system" && message.isError ? (
                            <div className="flex justify-center chat-bubble-enter my-2">
                                <div className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 max-w-[85%] text-center">
                                    <p className="text-sm text-gray-600 dark:text-gray-300">
                                        {message.content}
                                    </p>
                                    {message.retryMessage && (
                                        <button
                                            onClick={() => onRetry(message.id, message.retryMessage!)}
                                            className={`mt-2 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all hover:scale-[1.03] active:scale-95 ${
                                                isMemorialMode
                                                    ? "bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                                                    : "bg-sky-100 hover:bg-sky-200 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300"
                                            }`}
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                            다시 시도
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div
                                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} chat-bubble-enter`}
                                style={{ animationDelay: index === messages.length - 1 ? "0ms" : "0ms" }}
                            >
                                {message.role === "pet" && (
                                    <div className={`w-9 h-9 rounded-full overflow-hidden mr-2 flex-shrink-0 ring-2 shadow-md transition-transform hover:scale-105 ${
                                        isMemorialMode ? "ring-amber-200" : "ring-sky-200"
                                    }`}>
                                        {selectedPet?.profileImage ? (
                                            <img
                                                src={selectedPet.profileImage}
                                                alt={selectedPet.name}
                                                className="w-full h-full object-cover"
                                                style={{
                                                    objectPosition:
                                                        selectedPet.profileCropPosition
                                                            ? `${selectedPet.profileCropPosition.x}% ${selectedPet.profileCropPosition.y}%`
                                                            : "center",
                                                }}
                                            />
                                        ) : (
                                            <div
                                                className={`w-full h-full flex items-center justify-center ${isMemorialMode ? "bg-gradient-to-br from-amber-100 to-orange-100" : "bg-gradient-to-br from-[#E0F7FF] to-[#BAE6FD]"}`}
                                            >
                                                <PawPrint
                                                    className={`w-4 h-4 ${isMemorialMode ? "text-amber-500" : "text-[#05B2DC]"}`}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="flex flex-col max-w-[75%]">
                                    <div
                                        className={`px-4 py-3 rounded-2xl shadow-md transition-all hover:shadow-lg ${
                                            message.role === "user"
                                                ? (isMemorialMode
                                                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-br-sm"
                                                    : "bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] text-white rounded-br-sm")
                                                : emotionTintClass
                                                    ? `${emotionTintClass} text-gray-800 rounded-bl-sm border`
                                                    : isMemorialMode
                                                        ? "bg-amber-100 text-amber-900 rounded-bl-sm border border-amber-200/50"
                                                        : "bg-white text-gray-800 rounded-bl-sm border border-sky-100"
                                        }`}
                                    >
                                        <p className="text-[15px] leading-relaxed">
                                            {message.content}
                                        </p>
                                    </div>
                                    {message.role === "pet" && message.emotion && message.emotion !== "neutral" && (
                                        <span className="text-[11px] text-gray-400 mt-1 ml-1 flex items-center gap-1">
                                            <span>{emotionIcons[message.emotion]}</span>
                                            <span>{emotionLabels[message.emotion] || message.emotion}</span>
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            {isTyping && (
                <div className="flex justify-start chat-bubble-enter">
                    <div className={`w-9 h-9 rounded-full overflow-hidden mr-2 flex-shrink-0 ring-2 shadow-md ${
                        isMemorialMode ? "ring-amber-200" : "ring-sky-200"
                    }`}>
                        {selectedPet?.profileImage ? (
                            <img
                                src={selectedPet.profileImage}
                                alt={selectedPet.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div
                                className={`w-full h-full flex items-center justify-center ${isMemorialMode ? "bg-gradient-to-br from-amber-100 to-orange-100" : "bg-gradient-to-br from-[#E0F7FF] to-[#BAE6FD]"}`}
                            >
                                <PawPrint
                                    className={`w-4 h-4 ${isMemorialMode ? "text-amber-500" : "text-[#05B2DC]"}`}
                                />
                            </div>
                        )}
                    </div>
                    <div
                        className={`px-5 py-3 rounded-2xl rounded-bl-sm ${isMemorialMode ? "bg-amber-100 border border-amber-200/50" : "bg-white shadow-sm border border-sky-100"}`}
                    >
                        <div className="flex items-end gap-1.5">
                            {[0, 1, 2].map((i) => (
                                <div
                                    key={i}
                                    className="animate-bounce"
                                    style={{
                                        animationDelay: `${i * 200}ms`,
                                        animationDuration: "0.6s",
                                    }}
                                >
                                    <PawPrint
                                        className={`w-4 h-4 ${
                                            isMemorialMode
                                                ? "text-amber-400"
                                                : "text-sky-400"
                                        }`}
                                        style={{
                                            transform: `rotate(${-15 + i * 15}deg)`,
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                        {isMemorialMode ? (
                            <p className="text-xs mt-1.5 memorial-shimmer-text font-medium">
                                이곳에서 생각하고 있어요...
                            </p>
                        ) : (
                            <p className="text-xs mt-1 text-sky-500">
                                {selectedPet?.name}가 신나게 답변 중...
                            </p>
                        )}
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>
    );
}
