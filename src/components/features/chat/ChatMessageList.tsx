/**
 * ChatMessageList.tsx
 * AI 펫톡 채팅 메시지 목록 + 타이핑 인디케이터
 * AIChatPage에서 분리 - 메시지 버블 렌더링 담당
 */

"use client";

/* eslint-disable @next/next/no-img-element */

import { useRef, useEffect, useState } from "react";
import { PawPrint, RotateCcw, Bell, Phone, Heart } from "lucide-react";

// 타이핑 인디케이터 감성 텍스트 (pet.type별 분기)
const TYPING_TEXTS_DOG_DAILY = [
    "꼬리 흔들며 생각 중...", "킁킁 냄새 맡는 중...", "고개 갸웃하는 중...",
    "발로 톡톡 치는 중...", "귀 쫑긋 세우는 중..."
];
const TYPING_TEXTS_CAT_DAILY = [
    "그루밍하며 생각 중...", "꼬리 살랑살랑...", "고개 갸웃하는 중...",
    "앞발로 콕콕 치는 중...", "귀 쫑긋 세우는 중..."
];
const TYPING_TEXTS_OTHER_DAILY = [
    "생각하는 중...", "고개 갸웃하는 중...", "귀 쫑긋 세우는 중..."
];
const TYPING_TEXTS_MEMORIAL = [
    "조용히 곁에 앉는 중...", "따뜻한 기억 떠올리는 중...", "별빛 아래 생각하는 중...",
    "이곳에서 너를 생각하는 중...", "소중한 추억 찾는 중..."
];
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

    // 타이핑 인디케이터 감성 텍스트 순환
    const [typingTextIndex, setTypingTextIndex] = useState(0);
    const getTypingTexts = () => {
        if (isMemorialMode) return TYPING_TEXTS_MEMORIAL;
        if (selectedPet?.type === "고양이") return TYPING_TEXTS_CAT_DAILY;
        if (selectedPet?.type === "강아지") return TYPING_TEXTS_DOG_DAILY;
        return TYPING_TEXTS_OTHER_DAILY;
    };
    const typingTexts = getTypingTexts();

    useEffect(() => {
        if (!isTyping) {
            setTypingTextIndex(0);
            return;
        }
        const interval = setInterval(() => {
            setTypingTextIndex((prev) => (prev + 1) % typingTexts.length);
        }, 2500);
        return () => clearInterval(interval);
    }, [isTyping, typingTexts.length]);

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
                            <div className={`chat-timestamp my-2 ${isMemorialMode ? "chat-timestamp-memorial" : ""}`}>
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
                                    <p className="text-sm text-sky-800 dark:text-sky-100 leading-relaxed mb-3">
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
                                            className="flex-1 px-4 py-2 rounded-xl text-sm font-medium bg-white hover:bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:hover:bg-sky-800/40 dark:text-sky-200 border border-sky-200 dark:border-sky-600 transition-all hover:scale-[1.02] active:scale-95"
                                        >
                                            괜찮아요
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : message.role === "system" && message.type === "crisis-alert" && message.crisisAlert ? (
                            /* 위기 감지 상담 안내 카드 */
                            <div className="flex justify-center chat-bubble-enter my-3" role="alert" aria-live="assertive">
                                <div className="bg-gradient-to-br from-rose-50 to-amber-50 dark:from-rose-950/40 dark:to-amber-950/30 border border-rose-200 dark:border-rose-800/50 rounded-2xl px-5 py-4 max-w-[90%] shadow-sm">
                                    <div className="flex items-center gap-2 mb-2.5">
                                        <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center">
                                            <Heart className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                                        </div>
                                        <span className="text-sm font-semibold text-rose-800 dark:text-rose-200">
                                            혼자 감당하지 않아도 돼요
                                        </span>
                                    </div>
                                    <p className="text-sm text-rose-800 dark:text-rose-100 leading-relaxed mb-3">
                                        {message.crisisAlert.message}
                                    </p>
                                    <div className="space-y-2">
                                        {message.crisisAlert.resources.map((resource, idx) => (
                                            <a
                                                key={idx}
                                                href={`tel:${resource.phone}`}
                                                className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/80 dark:bg-gray-800/60 border border-rose-100 dark:border-rose-800/30 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                                            >
                                                <div className="w-9 h-9 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center flex-shrink-0">
                                                    <Phone className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-rose-900 dark:text-rose-100">
                                                        {resource.name}
                                                    </div>
                                                    <div className="text-xs text-rose-500 dark:text-rose-300">
                                                        {resource.description} | {resource.hours}
                                                    </div>
                                                </div>
                                                <span className="text-base font-bold text-rose-600 dark:text-rose-400 flex-shrink-0">
                                                    {resource.phone}
                                                </span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : message.role === "system" && message.isError ? (
                            <div className="flex justify-center chat-bubble-enter my-2">
                                <div className={`rounded-xl px-4 py-3 max-w-[85%] text-center ${
                                    isMemorialMode
                                        ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-700"
                                        : "bg-sky-50 dark:bg-sky-900/20 border border-sky-200/50 dark:border-sky-700"
                                }`}>
                                    <p className={`text-sm ${
                                        isMemorialMode
                                            ? "text-amber-700 dark:text-amber-300"
                                            : "text-sky-700 dark:text-sky-300"
                                    }`}>
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
                                                        ? "bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 rounded-bl-sm border border-amber-200/50 dark:border-amber-700/50"
                                                        : "bg-white dark:bg-sky-900/40 text-sky-900 dark:text-sky-100 rounded-bl-sm border border-sky-100 dark:border-sky-700/50"
                                        }`}
                                    >
                                        <p className="text-[15px] leading-relaxed">
                                            {message.content}
                                        </p>
                                    </div>
                                    {/* 매칭된 추억 사진 */}
                                    {message.role === "pet" && message.matchedPhoto && (
                                        <div className={`mt-2 rounded-xl overflow-hidden shadow-md border ${
                                            isMemorialMode ? "border-amber-200" : "border-sky-200"
                                        }`}>
                                            <img
                                                src={message.matchedPhoto.url}
                                                alt={message.matchedPhoto.caption}
                                                className="w-full max-w-[200px] h-auto object-cover"
                                            />
                                            <div className={`px-2 py-1.5 text-xs flex items-center gap-1 ${
                                                isMemorialMode
                                                    ? "bg-amber-50 text-amber-700"
                                                    : "bg-sky-50 text-sky-700"
                                            }`}>
                                                <Heart className="w-3 h-3" />
                                                <span className="truncate">{message.matchedPhoto.caption}</span>
                                            </div>
                                        </div>
                                    )}
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
                        className={`px-5 py-3 rounded-2xl rounded-bl-sm transition-all duration-500 ${isMemorialMode ? "bg-amber-100 dark:bg-amber-900/40 border border-amber-200/50 dark:border-amber-700/50" : "bg-white dark:bg-sky-900/40 shadow-sm border border-sky-100 dark:border-sky-700/50"}`}
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
                        <p className={`text-xs mt-1.5 font-medium transition-opacity duration-300 ${
                            isMemorialMode
                                ? "memorial-shimmer-text"
                                : "text-sky-500"
                        }`}>
                            {typingTexts[typingTextIndex]}
                        </p>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>
    );
}
