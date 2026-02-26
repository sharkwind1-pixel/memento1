/**
 * ChatMessageList.tsx
 * AI 펫톡 채팅 메시지 목록 + 타이핑 인디케이터
 * AIChatPage에서 분리 - 메시지 버블 렌더링 담당
 */

"use client";

/* eslint-disable @next/next/no-img-element */

import { useRef, useEffect } from "react";
import { PawPrint, RotateCcw, Bell } from "lucide-react";
import type { Pet } from "@/types";
import {
    ChatMessage,
    formatTimestamp,
    hasTimeGap,
} from "./chatTypes";

interface ChatMessageListProps {
    messages: ChatMessage[];
    isTyping: boolean;
    isMemorialMode: boolean;
    selectedPet: Pet | null | undefined;
    onRetry: (errorMessageId: string, retryMessage: string) => void;
    onReminderAccept?: (messageId: string) => void;
    onReminderDismiss?: (messageId: string) => void;
}

export default function ChatMessageList({
    messages,
    isTyping,
    isMemorialMode,
    selectedPet,
    onRetry,
    onReminderAccept,
    onReminderDismiss,
}: ChatMessageListProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const hasInteracted = useRef(false);
    const prevMessageCount = useRef(messages.length);

    useEffect(() => {
        // 초기 로드 시에는 자동 스크롤하지 않음 (유저가 위에서부터 시작)
        // 유저가 메시지를 보낸 후(메시지 수 증가)에만 스크롤
        if (!hasInteracted.current) {
            if (messages.length > prevMessageCount.current) {
                hasInteracted.current = true;
            }
            prevMessageCount.current = messages.length;
            return;
        }
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        prevMessageCount.current = messages.length;
    }, [messages, isTyping]);

    return (
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
            {messages.map((message, index) => {
                const showTimestamp =
                    index === 0 ||
                    hasTimeGap(messages[index - 1].timestamp, message.timestamp);


                return (
                    <div key={message.id}>
                        {showTimestamp && (
                            <div className="chat-timestamp my-2">
                                <span>{formatTimestamp(message.timestamp)}</span>
                            </div>
                        )}

                        {/* 리마인더 안내 카드 */}
                        {message.role === "system" && message.type === "reminder-suggestion" ? (
                            <div className="flex justify-center chat-bubble-enter my-3">
                                <div className="bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-900/30 dark:to-blue-900/30 border border-sky-200 dark:border-sky-700 rounded-2xl px-5 py-4 max-w-[90%] shadow-sm">
                                    <div className="flex items-center gap-2 mb-2.5">
                                        <div className="w-8 h-8 rounded-full bg-sky-100 dark:bg-sky-800 flex items-center justify-center">
                                            <Bell className="w-4 h-4 text-sky-600 dark:text-sky-300" />
                                        </div>
                                        <span className="text-sm font-semibold text-sky-800 dark:text-sky-200">
                                            케어 리마인더
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed mb-3">
                                        {message.content}
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => onReminderAccept?.(message.id)}
                                            className="flex-1 px-4 py-2 rounded-xl text-sm font-medium bg-sky-500 hover:bg-sky-600 text-white transition-all hover:scale-[1.02] active:scale-95 shadow-sm"
                                        >
                                            알려주세요
                                        </button>
                                        <button
                                            onClick={() => onReminderDismiss?.(message.id)}
                                            className="flex-1 px-4 py-2 rounded-xl text-sm font-medium bg-white hover:bg-gray-50 text-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 border border-gray-200 dark:border-gray-600 transition-all hover:scale-[1.02] active:scale-95"
                                        >
                                            괜찮아요
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : message.role === "system" && message.isError ? (
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
                                                    ? "bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300"
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
                                    <div className={`w-9 h-9 rounded-full overflow-hidden mr-2 flex-shrink-0 ring-2 shadow-md transition-all duration-500 hover:scale-105 ${
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
                                        className={`px-4 py-3 rounded-2xl shadow-md transition-all duration-500 hover:shadow-lg ${
                                            message.role === "user"
                                                ? (isMemorialMode
                                                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-br-sm"
                                                    : "bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] text-white rounded-br-sm")
                                                : isMemorialMode
                                                        ? "bg-amber-100 text-amber-900 rounded-bl-sm border border-amber-200/50"
                                                        : "bg-white text-gray-800 rounded-bl-sm border border-sky-100"
                                        }`}
                                    >
                                        <p className="text-[15px] leading-relaxed">
                                            {message.content}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            {isTyping && (
                <div className="flex justify-start chat-bubble-enter">
                    <div className={`w-9 h-9 rounded-full overflow-hidden mr-2 flex-shrink-0 ring-2 shadow-md transition-all duration-500 ${
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
                                className={`w-full h-full flex items-center justify-center transition-all duration-500 ${isMemorialMode ? "bg-gradient-to-br from-amber-100 to-orange-100" : "bg-gradient-to-br from-[#E0F7FF] to-[#BAE6FD]"}`}
                            >
                                <PawPrint
                                    className={`w-4 h-4 transition-colors duration-500 ${isMemorialMode ? "text-amber-500" : "text-[#05B2DC]"}`}
                                />
                            </div>
                        )}
                    </div>
                    <div
                        className={`px-5 py-3 rounded-2xl rounded-bl-sm transition-all duration-500 ${isMemorialMode ? "bg-amber-100 border border-amber-200/50" : "bg-white shadow-sm border border-sky-100"}`}
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
