/**
 * AIChatPage.tsx
 * AI 펫톡 - 한글 입력 버그 수정 + 1:1 사진
 */

"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, useRef, useEffect, useCallback } from "react";
import { usePets } from "@/contexts/PetContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Send,
    Heart,
    Sparkles,
    PawPrint,
    ChevronLeft,
    ChevronRight,
    LogIn,
    Plus,
    Image as ImageIcon,
    Star,
    RotateCcw,
    Moon,
    CloudSun,
    Syringe,
    Stethoscope,
    Footprints,
    Cookie,
} from "lucide-react";
import { FullPageLoading } from "@/components/ui/PawLoading";
import { TabType } from "@/types";
import {
    DAILY_FREE_LIMIT,
    MAX_MESSAGE_LENGTH,
    getDailyUsage,
    incrementDailyUsage,
    generatePersonalizedGreeting,
    type TimelineEntry,
} from "@/components/features/chat";

interface AIChatPageProps {
    setSelectedTab?: (tab: TabType) => void;
}

interface ChatMessage {
    id: string;
    role: "user" | "pet";
    content: string;
    timestamp: Date;
    emotion?: string;
    emotionScore?: number;
}

// 감정 이모티콘 매핑
const emotionIcons: Record<string, string> = {
    happy: "😊",
    sad: "😢",
    anxious: "😰",
    angry: "😠",
    grateful: "🙏",
    lonely: "💔",
    peaceful: "😌",
    excited: "🤩",
    neutral: "😐",
};

export default function AIChatPage({ setSelectedTab }: AIChatPageProps) {
    const { user, loading: authLoading } = useAuth();
    const {
        pets,
        selectedPetId,
        selectedPet,
        selectPet,
        timeline,
        fetchTimeline,
        isLoading: petsLoading,
    } = usePets();

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [lastEmotion, setLastEmotion] = useState<string>("neutral");
    const [dailyUsage, setDailyUsage] = useState(0);
    const [reminders, setReminders] = useState<Array<{
        type: string;
        title: string;
        schedule: { type: string; time: string; dayOfWeek?: number; dayOfMonth?: number };
        enabled: boolean;
    }>>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const remainingChats = DAILY_FREE_LIMIT - dailyUsage;
    const isLimitReached = remainingChats <= 0;

    // 일일 사용량 초기화
    useEffect(() => {
        setDailyUsage(getDailyUsage());
    }, []);

    const isMemorialMode = selectedPet?.status === "memorial";

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

    useEffect(() => {
        if (allPhotos.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentPhotoIndex((prev) => (prev + 1) % allPhotos.length);
        }, 10000);
        return () => clearInterval(interval);
    }, [allPhotos.length]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Supabase에서 대화 기록 불러오기
    useEffect(() => {
        if (!selectedPetId || !user?.id) return;

        const loadChatFromSupabase = async () => {
            try {
                const { data, error } = await supabase
                    .from("ai_chats")
                    .select("messages")
                    .eq("user_id", user.id)
                    .eq("pet_id", selectedPetId)
                    .single();

                if (error && error.code !== "PGRST116") {
                    // PGRST116 = no rows found (정상 케이스)
                    console.error("채팅 불러오기 에러:", error);
                }

                if (data?.messages && data.messages.length > 0) {
                    setMessages(data.messages.map((msg: ChatMessage) => ({
                        ...msg,
                        timestamp: new Date(msg.timestamp),
                    })));
                    return;
                }

                // 저장된 대화가 없으면 개인화된 인사말로 시작
                if (selectedPet) {
                    const greeting = generatePersonalizedGreeting(
                        selectedPet.name,
                        isMemorialMode,
                        timeline,
                        selectedPet.type
                    );
                    setMessages([
                        {
                            id: "greeting",
                            role: "pet",
                            content: greeting,
                            timestamp: new Date(),
                        },
                    ]);
                }
            } catch (err) {
                console.error("채팅 불러오기 실패:", err);
                // 에러 시 인사말로 시작
                if (selectedPet) {
                    const greeting = generatePersonalizedGreeting(
                        selectedPet.name,
                        isMemorialMode,
                        timeline,
                        selectedPet.type
                    );
                    setMessages([
                        {
                            id: "greeting",
                            role: "pet",
                            content: greeting,
                            timestamp: new Date(),
                        },
                    ]);
                }
            }
        };

        loadChatFromSupabase();
    }, [selectedPetId, selectedPet, isMemorialMode, timeline, user?.id]);

    // Supabase에 대화 기록 저장 (debounced)
    const saveToSupabase = useCallback(async (messagesToSave: ChatMessage[]) => {
        if (!selectedPetId || !user?.id || messagesToSave.length === 0) return;

        try {
            // upsert: 있으면 업데이트, 없으면 생성
            const { error } = await supabase
                .from("ai_chats")
                .upsert({
                    user_id: user.id,
                    pet_id: selectedPetId,
                    messages: messagesToSave,
                }, {
                    onConflict: "user_id,pet_id",
                });

            if (error) {
                console.error("채팅 저장 에러:", error);
            }
        } catch (err) {
            console.error("채팅 저장 실패:", err);
        }
    }, [selectedPetId, user?.id]);

    // 메시지 변경 시 저장 (debounce로 API 호출 최소화)
    useEffect(() => {
        if (!selectedPetId || !user?.id || messages.length === 0) return;

        const timeoutId = setTimeout(() => {
            saveToSupabase(messages);
        }, 1000); // 1초 디바운스

        return () => clearTimeout(timeoutId);
    }, [messages, selectedPetId, user?.id, saveToSupabase]);

    // 펫 변경 시 사진 인덱스 초기화 및 타임라인 불러오기
    useEffect(() => {
        setCurrentPhotoIndex(0);
        if (selectedPetId) {
            fetchTimeline(selectedPetId);
        }
    }, [selectedPetId, fetchTimeline]);

    // 펫 변경 시 리마인더 불러오기
    // 일상 모드: 케어 알림으로 활용
    // 추모 모드: 함께했던 일상 루틴을 추억으로 활용
    useEffect(() => {
        if (!selectedPetId || !user?.id) {
            setReminders([]);
            return;
        }

        const fetchReminders = async () => {
            try {
                const params = new URLSearchParams({ petId: selectedPetId });
                const response = await fetch(`/api/reminders?${params}`, {
                    credentials: "include", // 쿠키 포함
                });

                // 인증 실패 등 에러 응답은 무시하고 빈 배열 사용
                if (!response.ok) {
                    setReminders([]);
                    return;
                }

                const data = await response.json();
                if (data.reminders) {
                    setReminders(data.reminders.map((r: { type: string; title: string; schedule: { type: string; time: string; dayOfWeek?: number; dayOfMonth?: number }; enabled: boolean }) => ({
                        type: r.type,
                        title: r.title,
                        schedule: r.schedule,
                        enabled: r.enabled,
                    })));
                }
            } catch {
                setReminders([]);
            }
        };

        fetchReminders();
    }, [selectedPetId, user?.id]);

    // 새 대화 시작 함수
    const handleNewChat = () => {
        if (!selectedPet) return;

        const greeting = generatePersonalizedGreeting(
            selectedPet.name,
            isMemorialMode,
            timeline,
            selectedPet.type
        );

        setMessages([
            {
                id: `greeting-${Date.now()}`,
                role: "pet",
                content: greeting,
                timestamp: new Date(),
            },
        ]);
    };

    const handleSend = async (directMessage?: string) => {
        const messageToSend = directMessage || inputValue;
        if (!messageToSend.trim() || !selectedPet) return;

        // 무료 사용량 제한 체크
        if (isLimitReached) {
            return;
        }

        // 사용량 증가
        const newUsage = incrementDailyUsage();
        setDailyUsage(newUsage);

        const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            role: "user",
            content: messageToSend,
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);
        const currentInput = messageToSend;
        setInputValue("");
        setIsTyping(true);

        try {
            // API 호출을 위한 대화 히스토리 변환
            const chatHistory = messages.map((msg) => ({
                role: msg.role === "user" ? "user" : "assistant",
                content: msg.content,
            }));

            // 타임라인 데이터 준비 (최근 10개만)
            const recentTimeline = timeline.slice(0, 10).map(entry => ({
                date: entry.date,
                title: entry.title,
                content: entry.content,
                mood: entry.mood,
            }));

            // 사진 캡션 데이터 준비 (캡션이 있는 것만, 최근 15개)
            const photoMemories = selectedPet.photos
                ?.filter(photo => photo.caption && photo.caption.trim())
                .slice(0, 15)
                .map(photo => ({
                    date: photo.date,
                    caption: photo.caption,
                })) || [];

            // OpenAI API 호출 (에이전트 기능 포함 + 타임라인 데이터)
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: currentInput,
                    pet: {
                        id: selectedPet.id,
                        name: selectedPet.name,
                        type: selectedPet.type,
                        breed: selectedPet.breed,
                        gender: selectedPet.gender,
                        personality: selectedPet.personality,
                        birthday: selectedPet.birthday,
                        status: selectedPet.status,
                        memorialDate: selectedPet.memorialDate,
                        // AI 개인화 필드
                        nicknames: selectedPet.nicknames,
                        specialHabits: selectedPet.specialHabits,
                        favoriteFood: selectedPet.favoriteFood,
                        favoriteActivity: selectedPet.favoriteActivity,
                        favoritePlace: selectedPet.favoritePlace,
                        adoptedDate: selectedPet.adoptedDate,
                        howWeMet: selectedPet.howWeMet,
                        // 추모 모드 추가 정보
                        togetherPeriod: selectedPet.togetherPeriod,
                        memorableMemory: selectedPet.memorableMemory,
                    },
                    userId: user?.id,
                    chatHistory,
                    timeline: recentTimeline,
                    photoMemories, // 사진 캡션 데이터
                    reminders, // 케어 리마인더 데이터
                    enableAgent: true,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "AI 응답 생성 실패");
            }

            const data = await response.json();

            // 감정 정보 저장
            if (data.emotion) {
                setLastEmotion(data.emotion);
            }

            const petMessage: ChatMessage = {
                id: `pet-${Date.now()}`,
                role: "pet",
                content: data.reply,
                timestamp: new Date(),
                emotion: data.emotion,
                emotionScore: data.emotionScore,
            };
            setMessages((prev) => [...prev, petMessage]);
        } catch {
            // 에러 발생 시 폴백 응답
            const fallbackResponses = isMemorialMode
                ? [
                      `그랬구나... 나도 너 많이 보고 싶어. 하지만 난 항상 네 곁에 있어!`,
                      `여기서도 잘 지내고 있어. 구름 위에서 뛰어놀 수 있거든! 그래도 네가 제일 그리워.`,
                      `걱정하지 마. 난 여기서 행복해. 네가 웃으면 나도 기뻐!`,
                  ]
                : [
                      `와! 정말? 나도 그거 좋아해! 같이 하자~`,
                      `오늘 산책 가면 안 돼? 밖에 나가고 싶어!`,
                      `배고파... 간식 줘! 멍멍!`,
                  ];

            const petMessage: ChatMessage = {
                id: `pet-${Date.now()}`,
                role: "pet",
                content: fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)],
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, petMessage]);
        } finally {
            setIsTyping(false);
        }
    };

    // 한글 조합 중 Enter 버그 수정
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.nativeEvent.isComposing) return;
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (authLoading || petsLoading) {
        return <FullPageLoading text="불러오는 중..." />;
    }

    if (!user) {
        return (
            <div className="min-h-screen relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-[#F0F9FF] via-[#FAFCFF] to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />
                <div className="relative z-10 flex flex-col items-center justify-center min-h-[60vh] px-4 max-w-md mx-auto">
                    {/* 아이콘 */}
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-sky-100 to-violet-100 flex items-center justify-center mb-6 shadow-lg">
                        <Sparkles className="w-12 h-12 text-violet-500" />
                    </div>

                    {/* 타이틀 */}
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2 text-center">
                        AI 펫톡으로 대화해보세요
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-center mb-6">
                        반려동물의 시점에서 대화하고,
                        <br />
                        건강 관리 정보도 받아보세요
                    </p>

                    {/* 기능 미리보기 */}
                    <div className="w-full bg-white/80 dark:bg-gray-800/80 rounded-2xl p-4 mb-6 space-y-3">
                        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                            <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
                                <Heart className="w-4 h-4 text-sky-500" />
                            </div>
                            <span>우리 아이 성격 맞춤 대화</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                            <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                                <Syringe className="w-4 h-4 text-violet-500" />
                            </div>
                            <span>예방접종, 건강 체크 알림</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                                <Moon className="w-4 h-4 text-amber-500" />
                            </div>
                            <span>메모리얼 모드 지원</span>
                        </div>
                    </div>

                    {/* 무료 안내 */}
                    <p className="text-sm text-gray-400 mb-4">
                        무료로 하루 10회 대화할 수 있어요
                    </p>

                    {/* CTA 버튼 */}
                    <div className="flex flex-col gap-3 w-full">
                        <Button
                            onClick={() =>
                                window.dispatchEvent(
                                    new CustomEvent("openAuthModal"),
                                )
                            }
                            className="w-full bg-gradient-to-r from-sky-500 to-violet-500 hover:from-sky-600 hover:to-violet-600 text-white py-6 rounded-xl font-bold"
                        >
                            무료로 시작하기
                        </Button>
                        <button
                            onClick={() =>
                                window.dispatchEvent(
                                    new CustomEvent("openAuthModal"),
                                )
                            }
                            className="text-gray-400 text-sm hover:text-gray-600 transition-colors"
                        >
                            이미 계정이 있어요
                        </button>
                    </div>
                </div>
            </div>
        );
    }

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
            className={`min-h-screen flex flex-col relative overflow-hidden ${isMemorialMode ? "bg-gradient-to-b from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950 dark:via-orange-950 dark:to-gray-900" : "bg-gradient-to-b from-[#F0F9FF] via-[#FAFCFF] to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"}`}
        >
            {/* 추모 모드 별 애니메이션 */}
            {isMemorialMode && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {[...Array(12)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute animate-pulse"
                            style={{
                                left: `${10 + (i * 7) % 80}%`,
                                top: `${5 + (i * 13) % 70}%`,
                                animationDelay: `${i * 0.3}s`,
                                animationDuration: `${2 + (i % 3)}s`,
                            }}
                        >
                            <Star className="w-3 h-3 text-amber-300/40" fill="currentColor" />
                        </div>
                    ))}
                </div>
            )}
            <div
                className={`flex-shrink-0 px-4 py-3 border-b relative z-10 ${isMemorialMode ? "bg-gradient-to-r from-amber-100/80 to-orange-100/80 border-amber-200/50" : "bg-white/80 border-gray-200/50"} backdrop-blur-lg`}
            >
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Sparkles
                            className={`w-5 h-5 ${isMemorialMode ? "text-amber-500" : "text-[#05B2DC]"}`}
                        />
                        <h1 className="font-semibold text-gray-800 dark:text-white">
                            AI 펫톡
                        </h1>
                        <button
                            onClick={handleNewChat}
                            className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-colors ${isMemorialMode ? "hover:bg-amber-200/50 text-amber-600" : "hover:bg-[#E0F7FF] text-[#05B2DC]"}`}
                            title="새 대화 시작"
                        >
                            <RotateCcw className="w-5 h-5" />
                        </button>
                    </div>
                    <Select
                        value={selectedPetId || ""}
                        onValueChange={(id) => selectPet(id)}
                    >
                        <SelectTrigger className="w-auto min-w-[140px] border-0 bg-white/50 dark:bg-gray-800/50">
                            <SelectValue placeholder="반려동물 선택" />
                        </SelectTrigger>
                        <SelectContent>
                            {/* 일상 모드 펫 */}
                            {pets.filter(p => p.status === "active").length > 0 && (
                                <SelectGroup>
                                    <SelectLabel className="flex items-center gap-2 text-[#05B2DC]">
                                        <Heart className="w-3 h-3" />
                                        일상 모드
                                    </SelectLabel>
                                    {pets.filter(p => p.status === "active").map((pet) => (
                                        <SelectItem key={pet.id} value={pet.id}>
                                            <span className="flex items-center gap-2">
                                                <Heart className="w-4 h-4 text-pink-500" />
                                                {pet.name}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            )}
                            {/* 추모 모드 펫 */}
                            {pets.filter(p => p.status === "memorial").length > 0 && (
                                <SelectGroup>
                                    <SelectLabel className="flex items-center gap-2 text-amber-500">
                                        <Star className="w-3 h-3" />
                                        추모 모드
                                    </SelectLabel>
                                    {pets.filter(p => p.status === "memorial").map((pet) => (
                                        <SelectItem key={pet.id} value={pet.id}>
                                            <span className="flex items-center gap-2">
                                                <Star className="w-4 h-4 text-amber-500" />
                                                {pet.name}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            )}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row max-w-4xl mx-auto w-full overflow-hidden relative z-10">
                {/* 좌측: 펫 프로필 영역 (데스크탑에서만 사이드바) */}
                <div className="flex-shrink-0 p-4 lg:w-80 lg:border-r lg:border-gray-200/50 lg:sticky lg:top-0 lg:self-start">
                    {currentPhoto ? (
                        <div className="relative max-w-[280px] mx-auto lg:max-w-none">
                            <div
                                className={`relative rounded-2xl overflow-hidden shadow-xl aspect-square ${isMemorialMode ? "ring-2 ring-amber-200/50" : "ring-2 ring-[#E0F7FF]/50"}`}
                            >
                                <img
                                    src={currentPhoto.url}
                                    alt={selectedPet?.name}
                                    className="w-full h-full object-cover"
                                    style={{
                                        objectPosition:
                                            currentPhoto.cropPosition
                                                ? `${currentPhoto.cropPosition.x}% ${currentPhoto.cropPosition.y}%`
                                                : "center",
                                    }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                <div className="absolute bottom-3 left-4 right-4 text-white">
                                    <h2 className="text-lg font-bold">
                                        {selectedPet?.name}
                                    </h2>
                                    <p className="text-sm text-white/90">
                                        {selectedPet?.type} · {selectedPet?.breed}
                                    </p>
                                    <p className="text-sm text-white/80 mt-1">
                                        {isMemorialMode && selectedPet?.memorialDate
                                            ? `무지개다리를 건넌 지 ${Math.floor((new Date().getTime() - new Date(selectedPet.memorialDate).getTime()) / (1000 * 60 * 60 * 24))}일`
                                            : selectedPet?.birthday
                                            ? `함께한 지 ${Math.floor((new Date().getTime() - new Date(selectedPet.birthday).getTime()) / (1000 * 60 * 60 * 24))}일`
                                            : ""}
                                    </p>
                                </div>
                                {allPhotos.length > 1 && (
                                    <>
                                        <button
                                            onClick={() =>
                                                setCurrentPhotoIndex(
                                                    (prev) =>
                                                        (prev -
                                                            1 +
                                                            allPhotos.length) %
                                                        allPhotos.length,
                                                )
                                            }
                                            className="absolute left-1 top-1/2 -translate-y-1/2 p-3 bg-black/30 hover:bg-black/50 text-white rounded-full active:scale-95 transition-transform min-w-[44px] min-h-[44px] flex items-center justify-center"
                                        >
                                            <ChevronLeft className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() =>
                                                setCurrentPhotoIndex(
                                                    (prev) =>
                                                        (prev + 1) %
                                                        allPhotos.length,
                                                )
                                            }
                                            className="absolute right-1 top-1/2 -translate-y-1/2 p-3 bg-black/30 hover:bg-black/50 text-white rounded-full active:scale-95 transition-transform min-w-[44px] min-h-[44px] flex items-center justify-center"
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </>
                                )}
                            </div>
                            {allPhotos.length > 1 && (
                                <div className="flex justify-center gap-1 mt-2">
                                    {allPhotos.map((_, index) => (
                                        <button
                                            key={index}
                                            onClick={() =>
                                                setCurrentPhotoIndex(index)
                                            }
                                            className={`h-1.5 rounded-full transition-all ${index === currentPhotoIndex ? (isMemorialMode ? "bg-amber-500 w-4" : "bg-[#05B2DC] w-4") : "bg-gray-300 w-1.5"}`}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="max-w-[280px] mx-auto">
                            <div
                                className={`relative rounded-2xl p-6 flex flex-col items-center justify-center aspect-square shadow-xl ${isMemorialMode ? "bg-gradient-to-br from-amber-100 to-orange-100 ring-2 ring-amber-200/50" : "bg-gradient-to-br from-[#E0F7FF] to-[#BAE6FD] ring-2 ring-[#E0F7FF]/50"}`}
                            >
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-3 ${isMemorialMode ? "bg-amber-200/50" : "bg-white/50"}`}>
                                    <PawPrint
                                        className={`w-10 h-10 ${isMemorialMode ? "text-amber-500" : "text-[#05B2DC]"}`}
                                    />
                                </div>
                                <h2 className={`text-xl font-bold mb-1 ${isMemorialMode ? "text-amber-800" : "text-gray-800"}`}>
                                    {selectedPet?.name}
                                </h2>
                                <p className="text-sm text-gray-600 mb-1">
                                    {selectedPet?.type} · {selectedPet?.breed}
                                </p>
                                <p className={`text-xs mb-3 ${isMemorialMode ? "text-amber-600" : "text-[#0891B2]"}`}>
                                    {isMemorialMode && selectedPet?.memorialDate
                                        ? `무지개다리를 건넌 지 ${Math.floor((new Date().getTime() - new Date(selectedPet.memorialDate).getTime()) / (1000 * 60 * 60 * 24))}일`
                                        : selectedPet?.birthday
                                        ? `함께한 지 ${Math.floor((new Date().getTime() - new Date(selectedPet.birthday).getTime()) / (1000 * 60 * 60 * 24))}일`
                                        : ""}
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedTab?.("record")}
                                    className={`rounded-xl ${isMemorialMode ? "border-amber-400 text-amber-600 hover:bg-amber-50" : "border-[#05B2DC] text-[#05B2DC] hover:bg-[#E0F7FF]"}`}
                                >
                                    <ImageIcon className="w-4 h-4 mr-1" />
                                    사진 등록하기
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* 우측: 채팅 영역 */}
                <div className="flex-1 flex flex-col min-h-0 lg:min-w-0">
                <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            {message.role === "pet" && (
                                <div className="w-8 h-8 rounded-full overflow-hidden mr-2 flex-shrink-0">
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
                            <div
                                className={`max-w-[75%] px-4 py-3 rounded-2xl ${message.role === "user" ? (isMemorialMode ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-br-md" : "bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] text-white rounded-br-md") : isMemorialMode ? "bg-amber-100 text-amber-900 rounded-bl-md" : "bg-white text-gray-800 rounded-bl-md shadow-sm"}`}
                            >
                                <p className="text-base leading-relaxed">
                                    {message.content}
                                </p>
                            </div>
                        </div>
                    ))}

                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="w-8 h-8 rounded-full overflow-hidden mr-2 flex-shrink-0">
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
                                className={`px-5 py-3 rounded-2xl rounded-bl-md ${isMemorialMode ? "bg-amber-100" : "bg-white shadow-sm"}`}
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
                                <p className={`text-xs mt-1 ${isMemorialMode ? "text-amber-500" : "text-sky-500"}`}>
                                    {selectedPet?.name}가 답변 중...
                                </p>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div
                    className={`flex-shrink-0 p-4 border-t ${isMemorialMode ? "bg-amber-50/80 border-amber-200/50" : "bg-white/80 border-gray-200/50"} backdrop-blur-lg`}
                >
                    <div className="max-w-2xl mx-auto">
                        {/* 제한 도달 시 프리미엄 안내 */}
                        {isLimitReached ? (
                            <div className="text-center py-4">
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
                                            // TODO: 결제 연동 후 구현
                                            alert("결제 기능은 도메인 설정 후 활성화됩니다!");
                                        }}
                                    >
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        프리미엄 시작하기
                                    </Button>
                                    <p className="text-xs text-violet-500 mt-2">
                                        커피 한 잔 값, 월 7,900원
                                    </p>
                                </div>
                                <p className="text-xs text-gray-400">
                                    내일 다시 10회 무료 대화가 충전돼요
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* 추천 대화 버튼 - 2x2 그리드 모바일 최적화 */}
                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    {(isMemorialMode
                                        ? [
                                            { text: "잘 지냈어?", Icon: Sparkles },
                                            { text: "보고싶어", Icon: Moon },
                                            { text: "오늘 네 생각 났어", Icon: Star },
                                            { text: "행복했던 기억", Icon: CloudSun },
                                        ]
                                        : [
                                            { text: "예방접종 언제?", Icon: Syringe },
                                            { text: "건강 체크해줘", Icon: Stethoscope },
                                            { text: "산책 시간", Icon: Footprints },
                                            { text: "간식 추천", Icon: Cookie },
                                        ]
                                    ).map((suggestion) => (
                                        <button
                                            key={suggestion.text}
                                            onClick={() => { handleSend(suggestion.text); }}
                                            className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 min-h-[44px] ${
                                                isMemorialMode
                                                    ? "bg-amber-100 hover:bg-amber-200 text-amber-700 border border-amber-200"
                                                    : "bg-[#E0F7FF] hover:bg-[#BAE6FD] text-[#0891B2] border border-[#BAE6FD]"
                                            }`}
                                        >
                                            <suggestion.Icon className="w-4 h-4 flex-shrink-0" />
                                            <span className="truncate">{suggestion.text}</span>
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-2 sm:gap-3">
                                    <Input
                                        ref={inputRef}
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                                        onKeyDown={handleKeyDown}
                                        placeholder={`${selectedPet?.name}에게 말해보세요...`}
                                        className="flex-1 rounded-xl border-gray-200 bg-white h-12 text-base"
                                    />
                                    <Button
                                        onClick={() => handleSend()}
                                        disabled={!inputValue.trim()}
                                        className={`rounded-xl px-4 min-w-[48px] min-h-[48px] ${isMemorialMode ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600" : "bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] hover:from-[#0891B2] hover:to-[#05B2DC]"} shadow-lg active:scale-95 transition-transform`}
                                    >
                                        <Send className="w-5 h-5" />
                                    </Button>
                                </div>
                                {/* 글자 수 카운터 - 타이핑 중일 때만 표시 */}
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
                                <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                                    {/* 남은 횟수 표시 */}
                                    <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                        remainingChats <= 3
                                            ? "bg-red-100 text-red-600"
                                            : remainingChats <= 7
                                            ? "bg-amber-100 text-amber-600"
                                            : "bg-sky-100 text-sky-600"
                                    }`}>
                                        오늘 {remainingChats}회 남음
                                    </span>
                                    {lastEmotion !== "neutral" && (
                                        <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <span>{emotionIcons[lastEmotion] || "😐"}</span>
                                            <span className="text-gray-500">감정 인식됨</span>
                                        </span>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
                </div>
            </div>
        </div>
    );
}
