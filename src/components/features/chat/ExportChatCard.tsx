/**
 * ExportChatCard.tsx
 * AI 펫톡 대화를 예쁜 카드 이미지로 렌더링하는 컴포넌트
 * html2canvas로 캡처되어 PNG/JPG로 저장됨
 */

"use client";

/* eslint-disable @next/next/no-img-element */

import { forwardRef } from "react";
import { PawPrint, Heart, Star } from "lucide-react";
import type { Pet } from "@/types";
import type { ChatMessage } from "./chatTypes";

export type CardTemplate = "letter" | "polaroid" | "memorial" | "cute";

interface ExportChatCardProps {
    messages: ChatMessage[];
    pet: Pet;
    isMemorialMode: boolean;
    template: CardTemplate;
    selectedMessageIds?: string[];
}

/**
 * 내보내기용 카드 컴포넌트
 * forwardRef로 html2canvas가 참조할 수 있도록 함
 */
const ExportChatCard = forwardRef<HTMLDivElement, ExportChatCardProps>(
    ({ messages, pet, isMemorialMode, template, selectedMessageIds }, ref) => {
        // 선택된 메시지만 필터링 (없으면 최근 10개)
        const displayMessages = selectedMessageIds?.length
            ? messages.filter((m) => selectedMessageIds.includes(m.id))
            : messages.slice(-10);

        // 유저/펫 메시지만 (시스템 메시지 제외)
        const chatMessages = displayMessages.filter(
            (m) => m.role === "user" || m.role === "pet"
        );

        const formatDate = (date: Date) => {
            return new Intl.DateTimeFormat("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
            }).format(date);
        };

        const today = formatDate(new Date());

        // 템플릿별 스타일
        const templateStyles = {
            letter: {
                bg: isMemorialMode
                    ? "bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100"
                    : "bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-100",
                border: isMemorialMode ? "border-amber-200" : "border-sky-200",
                title: isMemorialMode ? "text-amber-800" : "text-sky-800",
                userBubble: isMemorialMode
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                    : "bg-gradient-to-r from-sky-500 to-blue-500 text-white",
                petBubble: isMemorialMode
                    ? "bg-white/80 text-amber-900 border border-amber-200"
                    : "bg-white/80 text-sky-900 border border-sky-200",
            },
            polaroid: {
                bg: "bg-white",
                border: "border-gray-300",
                title: "text-gray-800",
                userBubble: "bg-gray-100 text-gray-800",
                petBubble: "bg-gray-50 text-gray-700 border border-gray-200",
            },
            memorial: {
                bg: "bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900",
                border: "border-amber-400/30",
                title: "text-amber-200",
                userBubble: "bg-amber-500/20 text-amber-100 border border-amber-400/30",
                petBubble: "bg-white/10 text-white/90 border border-white/20",
            },
            cute: {
                bg: isMemorialMode
                    ? "bg-gradient-to-br from-pink-100 via-orange-100 to-yellow-100"
                    : "bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100",
                border: isMemorialMode ? "border-orange-300" : "border-pink-300",
                title: isMemorialMode ? "text-orange-700" : "text-pink-700",
                userBubble: isMemorialMode
                    ? "bg-gradient-to-r from-orange-400 to-pink-400 text-white"
                    : "bg-gradient-to-r from-pink-400 to-purple-400 text-white",
                petBubble: isMemorialMode
                    ? "bg-white/90 text-orange-800 border border-orange-200"
                    : "bg-white/90 text-purple-800 border border-purple-200",
            },
        };

        const style = templateStyles[template];

        return (
            <div
                ref={ref}
                className={`relative w-[400px] p-6 rounded-3xl shadow-2xl ${style.bg} border-2 ${style.border}`}
                style={{ fontFamily: "'Pretendard', sans-serif" }}
            >
                {/* 헤더 */}
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-current/10">
                    <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-current/20 shadow-lg flex-shrink-0">
                        {pet.profileImage ? (
                            <img
                                src={pet.profileImage}
                                alt={pet.name}
                                className="w-full h-full object-cover"
                                crossOrigin="anonymous"
                            />
                        ) : (
                            <div className={`w-full h-full flex items-center justify-center ${
                                isMemorialMode ? "bg-amber-200" : "bg-sky-200"
                            }`}>
                                <PawPrint className={`w-6 h-6 ${
                                    isMemorialMode ? "text-amber-600" : "text-sky-600"
                                }`} />
                            </div>
                        )}
                    </div>
                    <div className="flex-1">
                        <h2 className={`text-xl font-bold ${style.title}`}>
                            {pet.name}
                            {isMemorialMode && (
                                <Star className="inline-block w-4 h-4 ml-1 text-amber-400" />
                            )}
                        </h2>
                        <p className={`text-sm opacity-70 ${style.title}`}>
                            {isMemorialMode ? "소중한 추억의 대화" : "우리의 대화"}
                        </p>
                    </div>
                    {template === "memorial" && (
                        <div className="flex gap-1">
                            {[...Array(3)].map((_, i) => (
                                <Star
                                    key={i}
                                    className="w-4 h-4 text-amber-400 animate-pulse"
                                    style={{ animationDelay: `${i * 200}ms` }}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* 대화 내용 */}
                <div className="space-y-3 mb-4 max-h-[400px] overflow-hidden">
                    {chatMessages.slice(0, 8).map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                                    message.role === "user"
                                        ? `${style.userBubble} rounded-br-sm`
                                        : `${style.petBubble} rounded-bl-sm`
                                }`}
                            >
                                {message.content}
                            </div>
                        </div>
                    ))}
                </div>

                {/* 푸터 */}
                <div className={`pt-4 border-t border-current/10 flex items-center justify-between ${style.title}`}>
                    <div className="flex items-center gap-1.5 text-xs opacity-60">
                        <Heart className="w-3.5 h-3.5" />
                        <span>{today}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs opacity-50">
                        <PawPrint className="w-3 h-3" />
                        <span>memento-ani.com</span>
                    </div>
                </div>

                {/* 장식 요소 */}
                {template === "cute" && (
                    <>
                        <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-pink-200/50 blur-xl" />
                        <div className="absolute bottom-4 left-4 w-6 h-6 rounded-full bg-purple-200/50 blur-lg" />
                    </>
                )}
                {template === "memorial" && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
                        {[...Array(8)].map((_, i) => (
                            <Star
                                key={i}
                                className="absolute text-amber-400/30 w-3 h-3"
                                style={{
                                    top: `${Math.random() * 100}%`,
                                    left: `${Math.random() * 100}%`,
                                    animation: `pulse ${2 + Math.random()}s infinite`,
                                    animationDelay: `${Math.random() * 2}s`,
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    }
);

ExportChatCard.displayName = "ExportChatCard";

export default ExportChatCard;
