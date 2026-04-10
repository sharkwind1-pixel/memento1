/**
 * ChatMessageList.tsx
 * AI 펫톡 채팅 메시지 목록 + 타이핑 인디케이터
 * AIChatPage에서 분리 - 메시지 버블 렌더링 담당
 */

"use client";

import { useRef, useEffect, useState } from "react";
import { PawPrint, RotateCcw, Bell, Phone, Heart, BookOpen, MapPin, ExternalLink } from "lucide-react";
import { OptimizedImage } from "@/components/ui/optimized-image";

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

/** 감정별 아바타 글로우 색상 (CSS box-shadow) */
const EMOTION_GLOW_COLORS: Record<string, string> = {
    happy: "rgba(234, 179, 8, 0.5)",
    sad: "rgba(139, 92, 246, 0.4)",
    anxious: "rgba(107, 114, 128, 0.4)",
    grateful: "rgba(236, 72, 153, 0.4)",
    lonely: "rgba(99, 102, 241, 0.4)",
    peaceful: "rgba(16, 185, 129, 0.4)",
    excited: "rgba(245, 158, 11, 0.5)",
    neutral: "",
    angry: "rgba(239, 68, 68, 0.4)",
};

interface ChatMessageListProps {
    messages: ChatMessage[];
    isTyping: boolean;
    isStreaming?: boolean;
    isMemorialMode: boolean;
    selectedPet: Pet | null | undefined;
    lastEmotion?: string;
    onRetry: (errorMessageId: string, retryMessage: string) => void;
    onReminderAccept?: (messageId: string) => void;
    onReminderDismiss?: (messageId: string) => void;
}

export default function ChatMessageList({
    messages,
    isTyping,
    isStreaming,
    isMemorialMode,
    selectedPet,
    lastEmotion,
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
        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4 space-y-3">
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
                                <div className="bg-gradient-to-br from-memento-200 to-memento-200 dark:from-memento-900/30 dark:to-memento-900/30 border border-memento-200 dark:border-memento-700 rounded-2xl px-5 py-4 max-w-[90%] shadow-sm">
                                    <div className="flex items-center gap-2 mb-2.5">
                                        <div className="w-8 h-8 rounded-full bg-memento-200 dark:bg-memento-800 flex items-center justify-center">
                                            <Bell className="w-4 h-4 text-memento-600 dark:text-memento-300" />
                                        </div>
                                        <span className="text-sm font-semibold text-memento-800 dark:text-memento-200">
                                            케어 리마인더
                                        </span>
                                    </div>
                                    <p className="text-sm text-memento-800 dark:text-memento-200 leading-relaxed mb-3">
                                        {message.content}
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => onReminderAccept?.(message.id)}
                                            className="flex-1 px-4 py-2 rounded-xl text-sm font-medium bg-memento-500 hover:bg-memento-600 text-white transition-all hover:scale-[1.02] active:scale-95 shadow-sm"
                                        >
                                            알려주세요
                                        </button>
                                        <button
                                            onClick={() => onReminderDismiss?.(message.id)}
                                            className="flex-1 px-4 py-2 rounded-xl text-sm font-medium bg-white hover:bg-memento-200 text-memento-600 dark:bg-memento-900/30 dark:hover:bg-memento-800/40 dark:text-memento-200 border border-memento-200 dark:border-memento-600 transition-all hover:scale-[1.02] active:scale-95"
                                        >
                                            괜찮아요
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : message.role === "system" && message.type === "crisis-alert" && message.crisisAlert ? (
                            /* 위기 감지 상담 안내 카드 */
                            <div className="flex justify-center chat-bubble-enter my-3" role="alert" aria-live="assertive">
                                <div className="bg-gradient-to-br from-rose-50 to-memorial-50 dark:from-rose-950/40 dark:to-memorial-950/30 border border-rose-200 dark:border-rose-800/50 rounded-2xl px-5 py-4 max-w-[90%] shadow-sm">
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
                                        ? "bg-memorial-50 dark:bg-memorial-900/20 border border-memorial-200/50 dark:border-memorial-700"
                                        : "bg-memento-200 dark:bg-memento-900/20 border border-memento-200/50 dark:border-memento-700"
                                }`}>
                                    <p className={`text-sm ${
                                        isMemorialMode
                                            ? "text-memorial-700 dark:text-memorial-300"
                                            : "text-memento-700 dark:text-memento-300"
                                    }`}>
                                        {message.content}
                                    </p>
                                    {message.retryMessage && (
                                        <button
                                            onClick={() => onRetry(message.id, message.retryMessage!)}
                                            className={`mt-2 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all hover:scale-[1.03] active:scale-95 ${
                                                isMemorialMode
                                                    ? "bg-memorial-100 hover:bg-memorial-200 text-memorial-700 dark:bg-memorial-400/15 dark:text-memorial-300"
                                                    : "bg-memento-200 hover:bg-memento-200 text-memento-700 dark:bg-memento-900/50 dark:text-memento-300"
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
                                    <div
                                        className={`w-9 h-9 rounded-full overflow-hidden mr-2 flex-shrink-0 ring-2 shadow-md transition-all duration-500 hover:scale-105 ${
                                            isMemorialMode ? "ring-memorial-200" : "ring-memento-200"
                                        }`}
                                        style={{
                                            boxShadow: lastEmotion && EMOTION_GLOW_COLORS[lastEmotion]
                                                ? `0 0 12px 3px ${EMOTION_GLOW_COLORS[lastEmotion]}`
                                                : undefined,
                                        }}
                                    >
                                        {selectedPet?.profileImage ? (
                                            <OptimizedImage
                                                src={selectedPet.profileImage}
                                                alt={selectedPet.name}
                                                fill
                                                className="w-full h-full"
                                                objectPosition={
                                                    selectedPet.profileCropPosition
                                                        ? `${selectedPet.profileCropPosition.x}% ${selectedPet.profileCropPosition.y}%`
                                                        : "center"
                                                }
                                            />
                                        ) : (
                                            <div
                                                className={`w-full h-full flex items-center justify-center ${isMemorialMode ? "bg-gradient-to-br from-memorial-100 to-orange-100" : "bg-gradient-to-br from-memento-100 to-memento-200"}`}
                                            >
                                                <PawPrint
                                                    className={`w-4 h-4 ${isMemorialMode ? "text-memorial-500" : "text-memento-600"}`}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="flex flex-col max-w-[80%] lg:max-w-[70%]">
                                    <div
                                        className={`px-4 py-3 rounded-2xl shadow-md transition-all duration-500 hover:shadow-lg ${
                                            message.role === "user"
                                                ? (isMemorialMode
                                                    ? "bg-gradient-to-r from-memorial-500 to-orange-500 text-white rounded-br-sm"
                                                    : "bg-gradient-to-r from-memento-600 to-memento-500 text-white rounded-br-sm")
                                                : isMemorialMode
                                                        ? "bg-memorial-100 dark:bg-memorial-900/40 text-memorial-900 dark:text-memorial-100 rounded-bl-sm border border-memorial-200/50 dark:border-memorial-700/50"
                                                        : "bg-white dark:bg-memento-900/40 text-memento-900 dark:text-memento-200 rounded-bl-sm border border-memento-200 dark:border-memento-700/50"
                                        }`}
                                    >
                                        <p className="text-[15px] leading-relaxed">
                                            {message.content}
                                            {message.isStreaming && (
                                                <span className="inline-block w-[2px] h-[1em] ml-0.5 align-text-bottom animate-pulse" style={{
                                                    backgroundColor: isMemorialMode ? "#D97706" : "#0EA5E9",
                                                }} />
                                            )}
                                        </p>
                                    </div>
                                    {/* 매칭된 추억 사진 */}
                                    {message.role === "pet" && message.matchedPhoto && (
                                        <div className={`mt-2 rounded-xl overflow-hidden shadow-md border ${
                                            isMemorialMode ? "border-memorial-200" : "border-memento-200"
                                        }`}>
                                            <OptimizedImage
                                                src={message.matchedPhoto.url}
                                                alt={message.matchedPhoto.caption}
                                                width={200}
                                                height={200}
                                                className="max-w-[200px]"
                                            />
                                            <div className={`px-2 py-1.5 text-xs flex items-center gap-1 ${
                                                isMemorialMode
                                                    ? "bg-memorial-50 text-memorial-700"
                                                    : "bg-memento-200 text-memento-700"
                                            }`}>
                                                <Heart className="w-3 h-3" />
                                                <span className="truncate">{message.matchedPhoto.caption}</span>
                                            </div>
                                        </div>
                                    )}
                                    {/* 매칭된 타임라인 카드 */}
                                    {message.role === "pet" && message.matchedTimeline && !message.matchedPhoto && (
                                        <div className={`mt-2 rounded-xl overflow-hidden shadow-sm border ${
                                            isMemorialMode ? "border-memorial-200 bg-memorial-50/50 dark:bg-memorial-900/20" : "border-memento-200 bg-memento-200/50 dark:bg-memento-900/20"
                                        }`}>
                                            <div className="px-3 py-2.5">
                                                <div className={`flex items-center gap-1.5 mb-1 ${
                                                    isMemorialMode ? "text-memorial-600 dark:text-memorial-400" : "text-memento-600 dark:text-memento-400"
                                                }`}>
                                                    <BookOpen className="w-3.5 h-3.5" />
                                                    <span className="text-xs font-medium">우리의 기록</span>
                                                    <span className="text-[10px] opacity-60 ml-auto">{message.matchedTimeline.date}</span>
                                                </div>
                                                <p className={`text-sm font-medium ${
                                                    isMemorialMode ? "text-memorial-800 dark:text-memorial-200" : "text-memento-800 dark:text-memento-200"
                                                }`}>{message.matchedTimeline.title}</p>
                                                {message.matchedTimeline.content && (
                                                    <p className={`text-xs mt-0.5 line-clamp-2 ${
                                                        isMemorialMode ? "text-memorial-600/80 dark:text-memorial-300/80" : "text-memento-600/80 dark:text-memento-300/80"
                                                    }`}>{message.matchedTimeline.content}</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {/* 주변 장소 추천 카드 */}
                                    {message.role === "pet" && message.nearbyPlaces && message.nearbyPlaces.places.length > 0 && (
                                        <div className={`mt-2 rounded-xl overflow-hidden shadow-sm border ${
                                            isMemorialMode ? "border-memorial-200 bg-memorial-50/50 dark:bg-memorial-900/20" : "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/20"
                                        }`}>
                                            <div className="px-3 py-2.5">
                                                <div className={`flex items-center gap-1.5 mb-2 ${
                                                    isMemorialMode ? "text-memorial-600 dark:text-memorial-400" : "text-emerald-600 dark:text-emerald-400"
                                                }`}>
                                                    <MapPin className="w-3.5 h-3.5" />
                                                    <span className="text-xs font-medium">주변 {message.nearbyPlaces.query}</span>
                                                </div>
                                                <div className="space-y-1.5">
                                                    {message.nearbyPlaces.places.map((place, pIdx) => (
                                                        <a
                                                            key={pIdx}
                                                            href={place.mapUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={`block px-2.5 py-2 rounded-lg transition-all hover:scale-[1.01] active:scale-[0.99] ${
                                                                isMemorialMode
                                                                    ? "bg-memorial-100/60 dark:bg-memorial-800/20 hover:bg-memorial-100 dark:hover:bg-memorial-800/30"
                                                                    : "bg-emerald-100/60 dark:bg-emerald-800/20 hover:bg-emerald-100 dark:hover:bg-emerald-800/30"
                                                            }`}
                                                        >
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <p className={`text-sm font-medium truncate ${
                                                                            isMemorialMode ? "text-memorial-800 dark:text-memorial-200" : "text-emerald-800 dark:text-emerald-200"
                                                                        }`}>{place.name}</p>
                                                                        <ExternalLink className={`w-3 h-3 flex-shrink-0 ${
                                                                            isMemorialMode ? "text-memorial-400" : "text-emerald-400"
                                                                        }`} />
                                                                    </div>
                                                                    <p className={`text-[11px] mt-0.5 truncate ${
                                                                        isMemorialMode ? "text-memorial-600/70 dark:text-memorial-300/70" : "text-emerald-600/70 dark:text-emerald-300/70"
                                                                    }`}>{place.address}</p>
                                                                </div>
                                                                <span className={`text-xs font-semibold flex-shrink-0 px-1.5 py-0.5 rounded-full ${
                                                                    isMemorialMode
                                                                        ? "bg-memorial-200/60 dark:bg-memorial-700/40 text-memorial-700 dark:text-memorial-300"
                                                                        : "bg-emerald-200/60 dark:bg-emerald-700/40 text-emerald-700 dark:text-emerald-300"
                                                                }`}>{place.distance}</span>
                                                            </div>
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            {isTyping && !isStreaming && (
                <div className="flex justify-start chat-bubble-enter">
                    <div className={`w-9 h-9 rounded-full overflow-hidden mr-2 flex-shrink-0 ring-2 shadow-md transition-all duration-500 ${
                        isMemorialMode ? "ring-memorial-200" : "ring-memento-200"
                    }`}>
                        {selectedPet?.profileImage ? (
                            <OptimizedImage
                                src={selectedPet.profileImage}
                                alt={selectedPet.name}
                                fill
                                className="w-full h-full"
                            />
                        ) : (
                            <div
                                className={`w-full h-full flex items-center justify-center transition-all duration-500 ${isMemorialMode ? "bg-gradient-to-br from-memorial-100 to-orange-100" : "bg-gradient-to-br from-memento-100 to-memento-200"}`}
                            >
                                <PawPrint
                                    className={`w-4 h-4 transition-colors duration-500 ${isMemorialMode ? "text-memorial-500" : "text-memento-600"}`}
                                />
                            </div>
                        )}
                    </div>
                    <div
                        className={`px-5 py-3 rounded-2xl rounded-bl-sm transition-all duration-500 ${isMemorialMode ? "bg-memorial-100 dark:bg-memorial-900/40 border border-memorial-200/50 dark:border-memorial-700/50" : "bg-white dark:bg-memento-900/40 shadow-sm border border-memento-200 dark:border-memento-700/50"}`}
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
                                                ? "text-memorial-400"
                                                : "text-memento-400"
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
                                : "text-memento-500"
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
