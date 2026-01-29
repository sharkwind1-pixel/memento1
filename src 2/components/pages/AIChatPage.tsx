/**
 * AIChatPage.tsx
 * AI 펫톡 - 반려동물과 1인칭 대화
 * 사진 크기 제한으로 채팅창 압박 방지
 */

"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, useRef, useEffect } from "react";
import { usePets } from "@/contexts/PetContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Send,
    Heart,
    CloudSun,
    PawPrint,
    ChevronLeft,
    ChevronRight,
    LogIn,
    Plus,
    Image as ImageIcon,
    Sparkles,
} from "lucide-react";
import { TabType } from "@/types";

interface AIChatPageProps {
    setSelectedTab?: (tab: TabType) => void;
}

interface ChatMessage {
    id: string;
    role: "user" | "pet";
    content: string;
    timestamp: Date;
}

export default function AIChatPage({ setSelectedTab }: AIChatPageProps) {
    const { user, loading: authLoading } = useAuth();
    const { pets, selectedPetId, selectedPet, selectPet, isLoading: petsLoading } = usePets();

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const isMemorialMode = selectedPet?.status === "memorial";

    // 사진 로테이션
    const allPhotos = selectedPet
        ? [
              ...(selectedPet.profileImage
                  ? [
                        {
                            id: "profile",
                            url: selectedPet.profileImage,
                            cropPosition: selectedPet.profileCropPosition,
                        },
                    ]
                  : []),
              ...selectedPet.photos.map((p) => ({
                  id: p.id,
                  url: p.url,
                  cropPosition: p.cropPosition,
              })),
          ]
        : [];

    const currentPhoto = allPhotos[currentPhotoIndex];

    // 자동 사진 로테이션 (10초마다)
    useEffect(() => {
        if (allPhotos.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentPhotoIndex((prev) => (prev + 1) % allPhotos.length);
        }, 10000);
        return () => clearInterval(interval);
    }, [allPhotos.length]);

    // 메시지 스크롤
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // 초기 인사
    useEffect(() => {
        if (selectedPet && messages.length === 0) {
            const greeting = isMemorialMode
                ? `안녕, 나 ${selectedPet.name}야! 하늘나라에서 항상 지켜보고 있어. 오늘 하루는 어땠어?`
                : `안녕! 나 ${selectedPet.name}야! 오늘도 같이 놀자~ 뭐해?`;

            setMessages([
                {
                    id: "greeting",
                    role: "pet",
                    content: greeting,
                    timestamp: new Date(),
                },
            ]);
        }
    }, [selectedPet, isMemorialMode, messages.length]);

    // 반려동물 변경시 메시지 초기화
    useEffect(() => {
        setMessages([]);
        setCurrentPhotoIndex(0);
    }, [selectedPetId]);

    const handleSend = async () => {
        if (!inputValue.trim() || !selectedPet) return;

        const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            role: "user",
            content: inputValue,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputValue("");
        setIsTyping(true);

        // 타이핑 시뮬레이션 (나중에 실제 AI API 연동)
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // 목업 응답
        const responses = isMemorialMode
            ? [
                  `그랬구나... 나도 너 많이 보고 싶어. 하지만 난 항상 네 곁에 있어!`,
                  `하늘나라는 정말 좋아. 구름 위에서 뛰어놀 수 있거든! 그래도 네가 제일 그리워.`,
                  `걱정하지 마. 난 여기서 행복해. 네가 웃으면 나도 기뻐!`,
                  `언젠가 우리 다시 만날 수 있을 거야. 그때까지 건강하게 지내!`,
              ]
            : [
                  `와! 정말? 나도 그거 좋아해! 같이 하자~`,
                  `오늘 산책 가면 안 돼? 밖에 나가고 싶어!`,
                  `배고파... 간식 줘! 멍멍!`,
                  `나 졸려... 같이 낮잠 잘래?`,
                  `놀아줘! 심심해~`,
              ];

        const petMessage: ChatMessage = {
            id: `pet-${Date.now()}`,
            role: "pet",
            content: responses[Math.floor(Math.random() * responses.length)],
            timestamp: new Date(),
        };

        setIsTyping(false);
        setMessages((prev) => [...prev, petMessage]);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // 로딩 중
    if (authLoading || petsLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <PawPrint className="w-12 h-12 text-[#05B2DC] animate-bounce mx-auto mb-4" />
                    <p className="text-gray-500">로딩 중...</p>
                </div>
            </div>
        );
    }

    // 로그인 안 한 경우
    if (!user) {
        return (
            <div className="min-h-screen relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-[#F0F9FF] via-[#FAFCFF] to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />
                <div className="relative z-10 flex flex-col items-center justify-center min-h-[60vh] px-4">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#E0F7FF] to-[#BAE6FD] flex items-center justify-center mb-6">
                        <LogIn className="w-12 h-12 text-[#05B2DC]" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                        로그인이 필요해요
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-center mb-6">
                        AI 펫톡을 이용하려면
                        <br />
                        먼저 로그인해주세요
                    </p>
                    <Button
                        onClick={() => {
                            window.dispatchEvent(new CustomEvent("openAuthModal"));
                        }}
                        className="bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] hover:from-[#0891B2] hover:to-[#05B2DC] text-white px-8"
                    >
                        <LogIn className="w-4 h-4 mr-2" />
                        로그인하기
                    </Button>
                </div>
            </div>
        );
    }

    // 반려동물 없는 경우
    if (pets.length === 0) {
        return (
            <div className="min-h-screen relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-[#F0F9FF] via-[#FAFCFF] to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />
                <div className="relative z-10 flex flex-col items-center justify-center min-h-[60vh] px-4">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#E0F7FF] to-[#BAE6FD] flex items-center justify-center mb-6">
                        <PawPrint className="w-12 h-12 text-[#05B2DC]" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                        반려동물을 등록해주세요
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-center mb-6">
                        AI 펫톡을 시작하려면
                        <br />
                        먼저 반려동물을 등록해야 해요
                    </p>
                    <Button
                        onClick={() => setSelectedTab?.("record")}
                        className="bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] hover:from-[#0891B2] hover:to-[#05B2DC] text-white px-8"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        반려동물 등록하기
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`min-h-screen flex flex-col ${
                isMemorialMode
                    ? "bg-gradient-to-b from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950 dark:via-orange-950 dark:to-gray-900"
                    : "bg-gradient-to-b from-[#F0F9FF] via-[#FAFCFF] to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"
            }`}
        >
            {/* 헤더 */}
            <div
                className={`flex-shrink-0 px-4 py-3 border-b ${
                    isMemorialMode
                        ? "bg-gradient-to-r from-amber-100/80 to-orange-100/80 dark:from-amber-900/30 dark:to-orange-900/30 border-amber-200/50"
                        : "bg-white/80 dark:bg-gray-900/80 border-gray-200/50"
                } backdrop-blur-lg`}
            >
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Sparkles
                            className={`w-5 h-5 ${
                                isMemorialMode ? "text-amber-500" : "text-[#05B2DC]"
                            }`}
                        />
                        <h1 className="font-semibold text-gray-800 dark:text-white">
                            AI 펫톡
                        </h1>
                    </div>

                    {/* 반려동물 선택 */}
                    <Select
                        value={selectedPetId || ""}
                        onValueChange={(id) => selectPet(id)}
                    >
                        <SelectTrigger className="w-auto min-w-[140px] border-0 bg-white/50 dark:bg-gray-800/50">
                            <SelectValue placeholder="반려동물 선택" />
                        </SelectTrigger>
                        <SelectContent>
                            {pets.map((pet) => (
                                <SelectItem key={pet.id} value={pet.id}>
                                    <span className="flex items-center gap-2">
                                        {pet.status === "memorial" ? (
                                            <CloudSun className="w-4 h-4 text-amber-500" />
                                        ) : (
                                            <Heart className="w-4 h-4 text-pink-500" />
                                        )}
                                        {pet.name}
                                    </span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* 메인 컨텐츠 */}
            <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
                {/* 사진 카드 - 크기 제한 */}
                <div className="flex-shrink-0 p-4">
                    {currentPhoto ? (
                        <div className="relative">
                            {/* 사진 컨테이너 - 최대 높이 제한 */}
                            <div
                                className={`relative rounded-3xl overflow-hidden shadow-xl ${
                                    isMemorialMode
                                        ? "ring-4 ring-amber-200/50"
                                        : "ring-4 ring-[#E0F7FF]/50"
                                }`}
                                style={{ maxHeight: "200px" }}
                            >
                                <img
                                    src={currentPhoto.url}
                                    alt={selectedPet?.name}
                                    className="w-full h-full object-cover"
                                    style={{
                                        maxHeight: "200px",
                                        objectPosition: currentPhoto.cropPosition
                                            ? `${currentPhoto.cropPosition.x}% ${currentPhoto.cropPosition.y}%`
                                            : "center",
                                    }}
                                />

                                {/* 그라데이션 오버레이 */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

                                {/* 이름 */}
                                <div className="absolute bottom-3 left-4 text-white">
                                    <h2 className="text-lg font-bold">{selectedPet?.name}</h2>
                                    <p className="text-xs text-white/80">
                                        {selectedPet?.type} · {selectedPet?.breed}
                                    </p>
                                </div>

                                {/* 모드 배지 */}
                                <Badge
                                    className={`absolute top-3 left-3 ${
                                        isMemorialMode
                                            ? "bg-amber-100/90 text-amber-700"
                                            : "bg-[#E0F7FF]/90 text-[#0891B2]"
                                    } backdrop-blur-sm`}
                                >
                                    {isMemorialMode ? (
                                        <>
                                            <CloudSun className="w-3 h-3 mr-1" />
                                            추모 모드
                                        </>
                                    ) : (
                                        <>
                                            <Heart className="w-3 h-3 mr-1" />
                                            일상 모드
                                        </>
                                    )}
                                </Badge>
                            </div>

                            {/* 사진 네비게이션 */}
                            {allPhotos.length > 1 && (
                                <>
                                    <button
                                        onClick={() =>
                                            setCurrentPhotoIndex(
                                                (prev) =>
                                                    (prev - 1 + allPhotos.length) % allPhotos.length
                                            )
                                        }
                                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() =>
                                            setCurrentPhotoIndex(
                                                (prev) => (prev + 1) % allPhotos.length
                                            )
                                        }
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full transition-colors"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>

                                    {/* 인디케이터 */}
                                    <div className="flex justify-center gap-1 mt-2">
                                        {allPhotos.map((_, index) => (
                                            <button
                                                key={index}
                                                onClick={() => setCurrentPhotoIndex(index)}
                                                className={`h-1.5 rounded-full transition-all ${
                                                    index === currentPhotoIndex
                                                        ? isMemorialMode
                                                            ? "bg-amber-500 w-4"
                                                            : "bg-[#05B2DC] w-4"
                                                        : "bg-gray-300 dark:bg-gray-600 w-1.5"
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        /* 사진 없는 경우 */
                        <div
                            className={`rounded-3xl p-8 flex flex-col items-center justify-center ${
                                isMemorialMode
                                    ? "bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30"
                                    : "bg-gradient-to-br from-[#E0F7FF] to-[#BAE6FD] dark:from-gray-800 dark:to-gray-700"
                            }`}
                            style={{ maxHeight: "160px" }}
                        >
                            <div className="w-16 h-16 rounded-full bg-white/50 flex items-center justify-center mb-3">
                                <ImageIcon
                                    className={`w-8 h-8 ${
                                        isMemorialMode ? "text-amber-500" : "text-[#05B2DC]"
                                    }`}
                                />
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">
                                아직 등록된 사진이 없어요
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedTab?.("record")}
                                className={`rounded-xl ${
                                    isMemorialMode
                                        ? "border-amber-400 text-amber-600"
                                        : "border-[#05B2DC] text-[#05B2DC]"
                                }`}
                            >
                                사진 등록하기
                            </Button>
                        </div>
                    )}
                </div>

                {/* 채팅 영역 */}
                <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${
                                message.role === "user" ? "justify-end" : "justify-start"
                            }`}
                        >
                            {/* 펫 아바타 */}
                            {message.role === "pet" && (
                                <div className="w-8 h-8 rounded-full overflow-hidden mr-2 flex-shrink-0">
                                    {selectedPet?.profileImage ? (
                                        <img
                                            src={selectedPet.profileImage}
                                            alt={selectedPet.name}
                                            className="w-full h-full object-cover"
                                            style={{
                                                objectPosition: selectedPet.profileCropPosition
                                                    ? `${selectedPet.profileCropPosition.x}% ${selectedPet.profileCropPosition.y}%`
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
                                    message.role === "user"
                                        ? isMemorialMode
                                            ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-br-md"
                                            : "bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] text-white rounded-br-md"
                                        : isMemorialMode
                                        ? "bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100 rounded-bl-md"
                                        : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-md shadow-sm"
                                }`}
                            >
                                <p className="text-sm leading-relaxed">{message.content}</p>
                            </div>
                        </div>
                    ))}

                    {/* 타이핑 인디케이터 */}
                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="w-8 h-8 rounded-full overflow-hidden mr-2 flex-shrink-0">
                                {selectedPet?.profileImage ? (
                                    <img
                                        src={selectedPet.profileImage}
                                        alt={selectedPet.name}
                                        className="w-full h-full object-cover"
                                        style={{
                                            objectPosition: selectedPet.profileCropPosition
                                                ? `${selectedPet.profileCropPosition.x}% ${selectedPet.profileCropPosition.y}%`
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
                                                isMemorialMode ? "text-amber-500" : "text-[#05B2DC]"
                                            }`}
                                        />
                                    </div>
                                )}
                            </div>
                            <div
                                className={`px-4 py-3 rounded-2xl rounded-bl-md ${
                                    isMemorialMode
                                        ? "bg-amber-100 dark:bg-amber-900/30"
                                        : "bg-white dark:bg-gray-800 shadow-sm"
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
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* 입력 영역 */}
                <div
                    className={`flex-shrink-0 p-4 border-t ${
                        isMemorialMode
                            ? "bg-amber-50/80 dark:bg-amber-900/20 border-amber-200/50"
                            : "bg-white/80 dark:bg-gray-900/80 border-gray-200/50"
                    } backdrop-blur-lg`}
                >
                    <div className="max-w-2xl mx-auto">
                        <div className="flex gap-3">
                            <Input
                                ref={inputRef}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={`${selectedPet?.name}에게 말해보세요...`}
                                className="flex-1 rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                            />
                            <Button
                                onClick={handleSend}
                                disabled={!inputValue.trim()}
                                className={`rounded-xl px-4 ${
                                    isMemorialMode
                                        ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                                        : "bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] hover:from-[#0891B2] hover:to-[#05B2DC]"
                                } shadow-lg`}
                            >
                                <Send className="w-5 h-5" />
                            </Button>
                        </div>
                        <p className="text-xs text-gray-500 text-center mt-2">
                            {isMemorialMode
                                ? "하늘나라에서 기다리고 있어요"
                                : "AI가 반려동물의 입장에서 대화합니다"}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
