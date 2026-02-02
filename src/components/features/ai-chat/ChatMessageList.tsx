/**
 * ChatMessageList
 * ===============
 * AI 펫톡 메시지 목록 컴포넌트
 */

"use client";

/* eslint-disable @next/next/no-img-element */

import { useRef, useEffect } from "react";
import { PawPrint } from "lucide-react";
import type { ChatMessage, Pet, CropPosition } from "@/types";

interface ChatMessageListProps {
    /** 메시지 목록 */
    messages: ChatMessage[];
    /** 선택된 펫 */
    pet: Pet | null;
    /** 추모 모드 여부 */
    isMemorialMode: boolean;
    /** 타이핑 중 여부 */
    isTyping: boolean;
}

/** 개별 메시지 버블 */
function MessageBubble({
    message,
    pet,
    isMemorialMode,
}: {
    message: ChatMessage;
    pet: Pet | null;
    isMemorialMode: boolean;
}) {
    const isUser = message.role === "user";

    return (
        <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
            {/* 펫 아바타 (펫 메시지일 때만) */}
            {!isUser && (
                <div className="w-8 h-8 rounded-full overflow-hidden mr-2 flex-shrink-0">
                    {pet?.profileImage ? (
                        <img
                            src={pet.profileImage}
                            alt={pet.name}
                            className="w-full h-full object-cover"
                            style={{
                                objectPosition: pet.profileCropPosition
                                    ? `${pet.profileCropPosition.x}% ${pet.profileCropPosition.y}%`
                                    : "center",
                            }}
                        />
                    ) : (
                        <div
                            className={`w-full h-full flex items-center justify-center ${
                                isMemorialMode
                                    ? "bg-gradient-to-br from-amber-100 to-orange-100"
                                    : "bg-gradient-to-br from-[#E0F7FF] to-[#BAE6FD]"
                            }`}
                        >
                            <PawPrint
                                className={`w-4 h-4 ${
                                    isMemorialMode
                                        ? "text-amber-500"
                                        : "text-[#05B2DC]"
                                }`}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* 메시지 버블 */}
            <div
                className={`max-w-[75%] px-4 py-3 rounded-2xl ${
                    isUser
                        ? isMemorialMode
                            ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-br-md"
                            : "bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] text-white rounded-br-md"
                        : isMemorialMode
                          ? "bg-amber-100 text-amber-900 rounded-bl-md"
                          : "bg-white text-gray-800 rounded-bl-md shadow-sm"
                }`}
            >
                <p className="text-sm leading-relaxed">{message.content}</p>
            </div>
        </div>
    );
}

/** 타이핑 인디케이터 */
function TypingIndicator({
    pet,
    isMemorialMode,
}: {
    pet: Pet | null;
    isMemorialMode: boolean;
}) {
    return (
        <div className="flex justify-start">
            <div className="w-8 h-8 rounded-full overflow-hidden mr-2 flex-shrink-0">
                {pet?.profileImage ? (
                    <img
                        src={pet.profileImage}
                        alt={pet.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div
                        className={`w-full h-full flex items-center justify-center ${
                            isMemorialMode
                                ? "bg-gradient-to-br from-amber-100 to-orange-100"
                                : "bg-gradient-to-br from-[#E0F7FF] to-[#BAE6FD]"
                        }`}
                    >
                        <PawPrint
                            className={`w-4 h-4 ${
                                isMemorialMode
                                    ? "text-amber-500"
                                    : "text-[#05B2DC]"
                            }`}
                        />
                    </div>
                )}
            </div>
            <div
                className={`px-4 py-3 rounded-2xl rounded-bl-md ${
                    isMemorialMode ? "bg-amber-100" : "bg-white shadow-sm"
                }`}
            >
                <div className="flex gap-1">
                    <span
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                    />
                    <span
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                    />
                    <span
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                    />
                </div>
            </div>
        </div>
    );
}

/**
 * 메시지 목록 컴포넌트
 */
export function ChatMessageList({
    messages,
    pet,
    isMemorialMode,
    isTyping,
}: ChatMessageListProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 새 메시지 시 스크롤
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    return (
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
            {messages.map((message) => (
                <MessageBubble
                    key={message.id}
                    message={message}
                    pet={pet}
                    isMemorialMode={isMemorialMode}
                />
            ))}

            {isTyping && (
                <TypingIndicator pet={pet} isMemorialMode={isMemorialMode} />
            )}

            <div ref={messagesEndRef} />
        </div>
    );
}
