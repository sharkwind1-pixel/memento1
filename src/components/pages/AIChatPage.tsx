/**
 * ============================================================================
 * AIChatPage.tsx
 * ============================================================================
 *
 * AI 펫톡 페이지 - 반려동물과 AI 대화 기능
 *
 * 주요 기능:
 * - 일상 모드: 건강 관리, 케어 알림, 일상 대화
 * - 추모 모드: 무지개다리를 건넌 반려동물과의 추억 대화
 * - 감정 인식 및 개인화된 응답
 * - 타임라인/사진 캡션 기반 맥락 이해
 *
 * 상태 관리:
 * - 대화 기록: Supabase에 저장 (자동 동기화)
 * - 일일 사용량: localStorage 기반 (무료 10회/일)
 *
 * ============================================================================
 */

"use client";

/* eslint-disable @next/next/no-img-element */

// ============================================================================
// 임포트
// ============================================================================
import { useState, useEffect, useCallback } from "react";
import { usePets } from "@/contexts/PetContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
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
    Heart,
    Sparkles,
    PawPrint,
    Plus,
    Star,
    RotateCcw,
    Moon,
    Syringe,
    Brain,
    BarChart3,
    Bell,
    MoreHorizontal,
} from "lucide-react";
import { TabType } from "@/types";
import { toast } from "sonner";
import {
    DAILY_FREE_LIMIT,
    getDailyUsage,
    incrementDailyUsage,
    generatePersonalizedGreeting,
} from "@/components/features/chat";
import DomeGallery from "@/components/ui/DomeGallery";
import MemoryPanel from "@/components/features/chat/MemoryPanel";
import EmotionTracker from "@/components/features/chat/EmotionTracker";
import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import ReminderPanel from "@/components/features/chat/ReminderPanel";
import { ChatMessage } from "@/components/features/chat/chatTypes";
import PetProfileSidebar from "@/components/features/chat/PetProfileSidebar";
import ChatMessageList from "@/components/features/chat/ChatMessageList";
import ChatInputArea from "@/components/features/chat/ChatInputArea";

// ============================================================================
// 타입 정의
// ============================================================================

/** AI 펫톡 페이지 Props */
interface AIChatPageProps {
    setSelectedTab?: (tab: TabType) => void;
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function AIChatPage({ setSelectedTab }: AIChatPageProps) {
    // ========================================================================
    // Context & Hooks
    // ========================================================================
    const { user, loading: authLoading, isPremiumUser } = useAuth();
    const {
        pets,
        selectedPetId,
        selectedPet,
        selectPet,
        timeline,
        fetchTimeline,
        isLoading: petsLoading,
    } = usePets();

    // ========================================================================
    // 상태 관리
    // ========================================================================
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
    const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
    const [isMemoryPanelOpen, setIsMemoryPanelOpen] = useState(false);
    const [isEmotionTrackerOpen, setIsEmotionTrackerOpen] = useState(false);
    const [isReminderPanelOpen, setIsReminderPanelOpen] = useState(false);
    const isPremium = isPremiumUser; // AuthContext에서 중앙 관리

    // ========================================================================
    // 계산된 값
    // ========================================================================
    const remainingChats = DAILY_FREE_LIMIT - dailyUsage;
    // 프리미엄 사용자는 제한 없음
    const isLimitReached = !isPremium && remainingChats <= 0;

    // ========================================================================
    // Side Effects (useEffect)
    // ========================================================================

    // 일일 사용량 초기화 (localStorage에서 로드)
    useEffect(() => {
        setDailyUsage(getDailyUsage());
    }, []);

    // 추모 모드 여부 (펫 상태가 memorial인 경우)
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

    // Supabase에서 대화 기록 불러오기
    useEffect(() => {
        if (!selectedPetId || !user?.id) return;

        // 펫 전환 시 이전 메시지 즉시 초기화 (모드 분리)
        setMessages([]);

        const loadChatFromSupabase = async () => {
            try {
                const { data, error } = await supabase
                    .from("ai_chats")
                    .select("messages")
                    .eq("user_id", user.id)
                    .eq("pet_id", selectedPetId)
                    .single();

                if (error && error.code !== "PGRST116") {
                    // PGRST116 = no rows found (정상 케이스) - 에러 무시
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
            } catch {
                // 네트워크 에러 시 인사말로 시작 + 사용자 알림
                toast.error("이전 대화를 불러오지 못했어요. 새 대화로 시작합니다.");
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
            await supabase
                .from("ai_chats")
                .upsert({
                    user_id: user.id,
                    pet_id: selectedPetId,
                    messages: messagesToSave,
                }, {
                    onConflict: "user_id,pet_id",
                });
        } catch {
            // 채팅 저장 실패 - 조용히 무시 (다음 저장에서 재시도됨)
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

    // 리마인더 불러오기 (Supabase pet_reminders 테이블)
    useEffect(() => {
        if (!selectedPetId || !user?.id) {
            setReminders([]);
            return;
        }

        const loadReminders = async () => {
            try {
                const response = await fetch(`${API.REMINDERS}?petId=${selectedPetId}`);
                if (!response.ok) return;
                const data = await response.json();
                if (data.reminders && Array.isArray(data.reminders)) {
                    setReminders(data.reminders.map((r: {
                        type: string;
                        title: string;
                        schedule: { type: string; time: string; dayOfWeek?: number; dayOfMonth?: number };
                        enabled: boolean;
                    }) => ({
                        type: r.type,
                        title: r.title,
                        schedule: r.schedule,
                        enabled: r.enabled,
                    })));
                }
            } catch {
                // 리마인더 로드 실패 - 무시 (빈 배열 유지)
            }
        };

        loadReminders();
    }, [selectedPetId, user?.id]);

    // 펫 변경 시 사진 인덱스 초기화 및 타임라인 불러오기
    useEffect(() => {
        setCurrentPhotoIndex(0);
        if (selectedPetId) {
            fetchTimeline(selectedPetId);
        }
    }, [selectedPetId, fetchTimeline]);

    // ========================================================================
    // 이벤트 핸들러
    // ========================================================================

    /**
     * 새 대화 시작
     * - 기존 대화 초기화
     * - 개인화된 인사말로 시작
     */
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

    /**
     * 메시지 전송 및 AI 응답 처리
     * @param directMessage - 추천 대화 버튼 클릭 시 직접 전달되는 메시지
     *
     * 처리 순서:
     * 1. 무료 사용량 체크
     * 2. 사용자 메시지 추가
     * 3. AI API 호출 (타임라인, 사진캡션, 리마인더 데이터 포함)
     * 4. AI 응답 추가
     */
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
            const response = await authFetch(API.CHAT, {
                method: "POST",
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

            // AI가 제안한 후속 질문 저장
            if (data.suggestedQuestions && data.suggestedQuestions.length > 0) {
                setSuggestedQuestions(data.suggestedQuestions);
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
        } catch (err) {
            // 에러 유형별 시스템 메시지 표시 (채팅 내 인라인)
            const errorMessage = err instanceof Error ? err.message : "";
            const isRateLimited = errorMessage.includes("429") || errorMessage.includes("요청이 너무");

            const systemMessage: ChatMessage = {
                id: `system-${Date.now()}`,
                role: "system",
                content: isRateLimited
                    ? "요청이 많아 잠시 쉬어가고 있어요. 잠시 후 다시 시도해주세요."
                    : "잠시 연결이 불안정해요. 다시 시도해주세요.",
                timestamp: new Date(),
                isError: true,
                retryMessage: isRateLimited ? undefined : messageToSend,
            };
            setMessages((prev) => [...prev, systemMessage]);
        } finally {
            setIsTyping(false);
        }
    };

    /**
     * 에러 메시지의 재시도 버튼 핸들러
     * - 에러 시스템 메시지를 제거하고 원래 메시지를 다시 전송
     */
    const handleRetry = (errorMessageId: string, retryMessage: string) => {
        // 에러 시스템 메시지 제거
        setMessages((prev) => prev.filter((msg) => msg.id !== errorMessageId));
        // 원래 메시지 재전송
        handleSend(retryMessage);
    };

    // ========================================================================
    // 렌더링
    // ========================================================================

    // 로딩 화면 완전 제거 - 떨림 방지
    // 대신 데이터가 없으면 빈 상태로 표시

    // 비로그인 상태 - 로그인 유도 화면
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

    // 3. 펫 미등록 상태 - 등록 유도 화면
    // 중요: 모바일에서 버튼 클릭이 작동하도록 button + window.location.href 사용
    if (pets.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center px-4 py-20">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#E0F7FF] to-[#BAE6FD] flex items-center justify-center mb-6">
                    <PawPrint className="w-12 h-12 text-[#05B2DC]" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2 text-center">
                    반려동물을 등록해주세요
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-center mb-6">
                    AI 펫톡을 시작하려면
                    <br />
                    먼저 반려동물을 등록해야 해요
                </p>
                <button
                    type="button"
                    onClick={() => {
                        window.location.href = "/?tab=record";
                    }}
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] text-white px-8 py-4 rounded-xl font-medium text-base active:scale-95 transition-transform touch-manipulation"
                >
                    <Plus className="w-5 h-5" />
                    반려동물 등록하기
                </button>
            </div>
        );
    }

    // 4. 메인 채팅 UI
    // DomeGallery용 이미지 배열 생성
    const galleryImages = allPhotos.length > 0
        ? allPhotos.map(photo => ({
            src: photo.url,
            alt: selectedPet?.name || "펫 사진"
        }))
        : [];

    return (
        <div
            className={`min-h-screen flex flex-col relative overflow-hidden transition-all duration-500 ${isMemorialMode ? "bg-gradient-to-b from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950 dark:via-orange-950 dark:to-gray-900" : "bg-gradient-to-b from-[#F0F9FF] via-[#FAFCFF] to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"}`}
        >
            {/* ================================================================
                상단 DomeGallery - 3D 사진 갤러리
            ================================================================ */}
            {galleryImages.length > 0 && (
                <div className={`flex-shrink-0 h-[180px] relative overflow-hidden ${
                    isMemorialMode
                        ? "bg-gradient-to-b from-amber-100 to-amber-50"
                        : "bg-gradient-to-b from-sky-100 to-sky-50"
                }`}>
                    <DomeGallery
                        images={galleryImages}
                        fit={0.4}
                        minRadius={250}
                        maxVerticalRotationDeg={2}
                        segments={20}
                        dragDampening={1.5}
                        grayscale={false}
                        overlayBlurColor={isMemorialMode ? "#fef3c7" : "#e0f2fe"}
                        imageBorderRadius="12px"
                        openedImageBorderRadius="16px"
                    />
                    {/* 하단 그라데이션 페이드 */}
                    <div className={`absolute bottom-0 left-0 right-0 h-12 pointer-events-none ${
                        isMemorialMode
                            ? "bg-gradient-to-t from-amber-50 to-transparent"
                            : "bg-gradient-to-t from-[#F0F9FF] to-transparent"
                    }`} />
                </div>
            )}

            {/* ================================================================
                추모 모드 배경 장식 - 반짝이는 별 애니메이션
            ================================================================ */}
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
                className={`flex-shrink-0 px-4 py-3 border-b relative z-10 transition-all duration-500 ${isMemorialMode ? "bg-gradient-to-r from-amber-100/80 to-orange-100/80 border-amber-200/50" : "bg-white/80 border-gray-200/50"} backdrop-blur-lg`}
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
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-colors ${isMemorialMode ? "hover:bg-amber-200/50 text-amber-600" : "hover:bg-[#E0F7FF] text-[#05B2DC]"}`}
                                    title="더보기"
                                >
                                    <MoreHorizontal className="w-5 h-5" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                <DropdownMenuItem onClick={() => setIsMemoryPanelOpen(true)}>
                                    <Brain className="w-4 h-4 mr-2" />
                                    기억 보기
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setIsEmotionTrackerOpen(true)}>
                                    <BarChart3 className="w-4 h-4 mr-2" />
                                    감정 분석
                                </DropdownMenuItem>
                                {!isMemorialMode && (
                                    <DropdownMenuItem onClick={() => setIsReminderPanelOpen(true)}>
                                        <Bell className="w-4 h-4 mr-2" />
                                        케어 알림
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
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
                <PetProfileSidebar
                    selectedPet={selectedPet}
                    allPhotos={allPhotos}
                    currentPhotoIndex={currentPhotoIndex}
                    setCurrentPhotoIndex={setCurrentPhotoIndex}
                    isMemorialMode={isMemorialMode}
                    setSelectedTab={setSelectedTab}
                />

                {/* 우측: 채팅 영역 */}
                <div className="flex-1 flex flex-col min-h-0 lg:min-w-0">
                {/* AI 고지 배너 */}
                <div className={`mx-4 mt-2 mb-1 px-3 py-2 rounded-lg text-xs text-center ${
                    isMemorialMode
                        ? "bg-amber-100/80 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                        : "bg-sky-100/80 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
                }`}>
                    <span className="inline-flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        이 대화는 AI가 생성합니다. 실제 반려동물의 의사가 아닌 참고용 서비스입니다.
                    </span>
                </div>
                <ChatMessageList
                    messages={messages}
                    isTyping={isTyping}
                    isMemorialMode={isMemorialMode}
                    selectedPet={selectedPet}
                    onRetry={handleRetry}
                />
                <ChatInputArea
                    inputValue={inputValue}
                    setInputValue={setInputValue}
                    isMemorialMode={isMemorialMode}
                    isLimitReached={isLimitReached}
                    isPremium={isPremium}
                    remainingChats={remainingChats}
                    lastEmotion={lastEmotion}
                    suggestedQuestions={suggestedQuestions}
                    setSuggestedQuestions={setSuggestedQuestions}
                    selectedPet={selectedPet}
                    onSend={handleSend}
                />
                </div>
            </div>

            {/* 메모리 패널 (바텀시트) */}
            {selectedPet && (
                <MemoryPanel
                    isOpen={isMemoryPanelOpen}
                    onClose={() => setIsMemoryPanelOpen(false)}
                    petId={selectedPet.id}
                    petName={selectedPet.name}
                    isMemorialMode={isMemorialMode}
                />
            )}

            {/* 감정 분석 패널 (바텀시트) */}
            {selectedPet && user && (
                <EmotionTracker
                    isOpen={isEmotionTrackerOpen}
                    onClose={() => setIsEmotionTrackerOpen(false)}
                    petId={selectedPet.id}
                    petName={selectedPet.name}
                    isMemorialMode={isMemorialMode}
                    userId={user.id}
                />
            )}

            {/* 케어 알림 패널 (바텀시트) - 일상 모드에서만 */}
            {selectedPet && !isMemorialMode && (
                <ReminderPanel
                    isOpen={isReminderPanelOpen}
                    onClose={() => setIsReminderPanelOpen(false)}
                    petId={selectedPet.id}
                    petName={selectedPet.name}
                    isMemorialMode={isMemorialMode}
                />
            )}
        </div>
    );
}
