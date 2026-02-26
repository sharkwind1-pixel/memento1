/**
 * useAIChat.ts
 * AI 펫톡 페이지의 핵심 비즈니스 로직을 캡슐화한 커스텀 훅
 *
 * 담당 기능:
 * - 채팅 메시지 상태 관리 (useState)
 * - Supabase 대화 기록 로딩/저장 (useEffect + useCallback)
 * - 일일 사용량 추적 (localStorage)
 * - 리마인더 로딩
 * - 사진 갤러리 인덱스 자동 순환
 * - AI API 호출 및 응답 처리
 */

import { useState, useEffect, useCallback, useRef, type Dispatch, type SetStateAction } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
    DAILY_FREE_LIMIT,
    getDailyUsage,
    incrementDailyUsage,
    generatePersonalizedGreeting,
} from "@/components/features/chat";
import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";
import { ChatMessage } from "@/components/features/chat/chatTypes";
import type { Pet, TimelineEntry, PhotoItem, CrisisAlertInfo } from "@/types";
import type { User } from "@supabase/supabase-js";

// ============================================================================
// 타입 정의
// ============================================================================

/** 리마인더 아이템 구조 */
interface ReminderItem {
    type: string;
    title: string;
    schedule: {
        type: string;
        time: string;
        dayOfWeek?: number;
        dayOfMonth?: number;
    };
    enabled: boolean;
}

// PhotoItem은 types/index.ts에서 중앙 관리

/** useAIChat 훅 파라미터 */
interface UseAIChatParams {
    user: User | null;
    isPremium: boolean;
    pets: Pet[];
    selectedPetId: string | null;
    selectedPet: Pet | undefined;
    timeline: TimelineEntry[];
    fetchTimeline: (petId: string) => void;
}

/** useAIChat 훅 반환 값 */
export interface UseAIChatReturn {
    // 상태
    messages: ChatMessage[];
    inputValue: string;
    setInputValue: Dispatch<SetStateAction<string>>;
    isTyping: boolean;
    currentPhotoIndex: number;
    setCurrentPhotoIndex: Dispatch<SetStateAction<number>>;
    lastEmotion: string;
    dailyUsage: number;
    reminders: ReminderItem[];
    suggestedQuestions: string[];
    setSuggestedQuestions: Dispatch<SetStateAction<string[]>>;
    // 계산된 값
    remainingChats: number;
    isLimitReached: boolean;
    isMemorialMode: boolean;
    allPhotos: PhotoItem[];
    currentPhoto: PhotoItem | undefined;
    galleryImages: { src: string; alt: string }[];

    // 핸들러
    handleNewChat: () => void;
    handleSend: (directMessage?: string) => Promise<void>;
    handleRetry: (errorMessageId: string, retryMessage: string) => void;
    handleReminderAccept: (messageId: string) => void;
    handleReminderDismiss: (messageId: string) => void;
}

// ============================================================================
// 훅 구현
// ============================================================================

export function useAIChat({
    user,
    isPremium,
    pets,
    selectedPetId,
    selectedPet,
    timeline,
    fetchTimeline,
}: UseAIChatParams): UseAIChatReturn {
    // timeline을 ref로 관리하여 useEffect 의존성에서 제거 (불필요한 채팅 초기화 방지)
    const timelineRef = useRef(timeline);
    timelineRef.current = timeline;

    // ========================================================================
    // 상태 관리
    // ========================================================================
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [lastEmotion, setLastEmotion] = useState<string>("neutral");
    const [dailyUsage, setDailyUsage] = useState(0);
    const [reminders, setReminders] = useState<ReminderItem[]>([]);
    const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
    /** 리마인더 안내 메시지 표시 여부 (세션당 1회) */
    const reminderSuggestionShown = useRef(false);


    // ========================================================================
    // 계산된 값
    // ========================================================================
    const remainingChats = DAILY_FREE_LIMIT - dailyUsage;
    // 프리미엄 사용자는 제한 없음
    const isLimitReached = !isPremium && remainingChats <= 0;

    // 추모 모드 여부 (펫 상태가 memorial인 경우)
    const isMemorialMode = selectedPet?.status === "memorial";

    const allPhotos: PhotoItem[] = selectedPet
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

    // DomeGallery용 이미지 배열
    const galleryImages =
        allPhotos.length > 0
            ? allPhotos.map((photo) => ({
                  src: photo.url,
                  alt: selectedPet?.name || "펫 사진",
              }))
            : [];

    // ========================================================================
    // Side Effects (useEffect)
    // ========================================================================

    // 일일 사용량 초기화 (localStorage에서 로드)
    useEffect(() => {
        setDailyUsage(getDailyUsage());
    }, []);

    // 사진 갤러리 자동 순환 (10초 간격)
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
                    setMessages(
                        data.messages.map((msg: ChatMessage) => ({
                            ...msg,
                            timestamp: new Date(msg.timestamp),
                        }))
                    );
                    return;
                }

                // 저장된 대화가 없으면 개인화된 인사말로 시작
                if (selectedPet) {
                    const greeting = generatePersonalizedGreeting(
                        selectedPet,
                        isMemorialMode,
                        timelineRef.current,
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
                toast.error(
                    "이전 대화를 불러오지 못했어요. 새 대화로 시작합니다."
                );
                if (selectedPet) {
                    const greeting = generatePersonalizedGreeting(
                        selectedPet,
                        isMemorialMode,
                        timelineRef.current,
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPetId, selectedPet, isMemorialMode, user?.id]);

    // Supabase에 대화 기록 저장 (debounced)
    const saveToSupabase = useCallback(
        async (messagesToSave: ChatMessage[]) => {
            if (!selectedPetId || !user?.id || messagesToSave.length === 0)
                return;

            try {
                // upsert: 있으면 업데이트, 없으면 생성
                await supabase.from("ai_chats").upsert(
                    {
                        user_id: user.id,
                        pet_id: selectedPetId,
                        messages: messagesToSave,
                    },
                    {
                        onConflict: "user_id,pet_id",
                    }
                );
            } catch {
                // 채팅 저장 실패 - 조용히 무시 (다음 저장에서 재시도됨)
            }
        },
        [selectedPetId, user?.id]
    );

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
                const response = await authFetch(
                    `${API.REMINDERS}?petId=${selectedPetId}`
                );
                if (!response.ok) return;
                const data = await response.json();
                if (data.reminders && Array.isArray(data.reminders)) {
                    setReminders(
                        data.reminders.map((r: ReminderItem) => ({
                            type: r.type,
                            title: r.title,
                            schedule: r.schedule,
                            enabled: r.enabled,
                        }))
                    );
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
     * - 이전 대화 세션 요약을 DB에 저장 (AI 기억 유지)
     * - 기존 대화 초기화
     * - 개인화된 인사말로 시작
     */
    const handleNewChat = () => {
        if (!selectedPet) return;

        // 이전 대화가 충분히 길면 세션 요약 저장 (AI가 기억할 수 있도록)
        if (messages.length >= 4 && user?.id && selectedPetId) {
            const chatMessages = messages.map((msg) => ({
                role: msg.role === "user" ? "user" : "assistant",
                content: msg.content,
            }));

            // 비동기로 저장 (UI 블로킹 없음)
            authFetch(API.CHAT_SUMMARY, {
                method: "POST",
                body: JSON.stringify({
                    petId: selectedPetId,
                    petName: selectedPet.name,
                    messages: chatMessages,
                    isMemorial: isMemorialMode,
                }),
            }).catch(() => {
                // 요약 저장 실패 - 조용히 무시 (개별 메시지는 이미 chat_messages에 저장됨)
            });
        }

        const greeting = generatePersonalizedGreeting(
            selectedPet,
            isMemorialMode,
            timeline,
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
            const recentTimeline = timelineRef.current
                .slice(0, 10)
                .map((entry) => ({
                    date: entry.date,
                    title: entry.title,
                    content: entry.content,
                    mood: entry.mood,
                }));

            // 사진 캡션 데이터 준비 (캡션이 있는 것만, 최근 15개)
            const photoMemories =
                selectedPet.photos
                    ?.filter(
                        (photo) => photo.caption && photo.caption.trim()
                    )
                    .slice(0, 15)
                    .map((photo) => ({
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

            // 과사용 세션 종료 제안 (추모 모드 30턴+ 시)
            if (data.sessionEndingSuggestion) {
                setTimeout(() => {
                    const sessionEndingMessage: ChatMessage = {
                        id: `session-ending-${Date.now()}`,
                        role: "system",
                        content: data.sessionEndingSuggestion,
                        timestamp: new Date(),
                    };
                    setMessages((prev) => [...prev, sessionEndingMessage]);
                }, 800);
            }

            // 위기 감지 시 상담 안내 카드 표시 (AI 응답 아래에 별도 UI)
            if (data.crisisAlert) {
                const crisisMessage: ChatMessage = {
                    id: `crisis-alert-${Date.now()}`,
                    role: "system",
                    type: "crisis-alert",
                    content: data.crisisAlert.message,
                    timestamp: new Date(),
                    crisisAlert: data.crisisAlert as CrisisAlertInfo,
                };
                // 약간의 딜레이를 두어 AI 응답 이후 자연스럽게 표시
                setTimeout(() => {
                    setMessages((prev) => [...prev, crisisMessage]);
                }, 600);
            }

            // 일상 모드 + 세션 첫 대화 후 리마인더 안내 (1회만)
            if (!isMemorialMode && !reminderSuggestionShown.current) {
                reminderSuggestionShown.current = true;
                // AI 응답 후 약간의 딜레이를 두고 자연스럽게 표시
                setTimeout(() => {
                    const reminderSuggestion: ChatMessage = {
                        id: `reminder-suggestion-${Date.now()}`,
                        role: "system",
                        type: "reminder-suggestion",
                        content: "리마인더로 알람이 필요한 시간을 적어주시면 알려드려요",
                        timestamp: new Date(),
                    };
                    setMessages((prev) => [...prev, reminderSuggestion]);
                }, 1200);
            }
        } catch (err) {
            // 에러 유형별 시스템 메시지 표시 (채팅 내 인라인)
            const errorMessage =
                err instanceof Error ? err.message : "";
            const isRateLimited =
                errorMessage.includes("429") ||
                errorMessage.includes("요청이 너무");

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
        setMessages((prev) =>
            prev.filter((msg) => msg.id !== errorMessageId)
        );
        // 원래 메시지 재전송
        handleSend(retryMessage);
    };

    /**
     * 리마인더 안내 "알려주세요" 클릭
     * - 안내 카드를 확정 메시지로 교체
     * - 푸시 알림 권한 요청은 AIChatPage에서 처리 (setSelectedTab 필요)
     */
    const handleReminderAccept = (messageId: string) => {
        setMessages((prev) =>
            prev.map((msg) =>
                msg.id === messageId
                    ? {
                          ...msg,
                          type: undefined,
                          content: "좋아요! 케어 리마인더로 이동할게요. 알람 시간을 설정해보세요!",
                      }
                    : msg
            )
        );
    };

    /**
     * 리마인더 안내 "괜찮아요" 클릭
     * - 안내 카드를 거절 메시지로 교체
     */
    const handleReminderDismiss = (messageId: string) => {
        setMessages((prev) =>
            prev.map((msg) =>
                msg.id === messageId
                    ? {
                          ...msg,
                          type: undefined,
                          content: "알겠어요! 필요할 때 언제든 우리의 기록에서 케어 리마인더를 이용해주세요.",
                      }
                    : msg
            )
        );
    };

    // ========================================================================
    // 반환
    // ========================================================================
    return {
        // 상태
        messages,
        inputValue,
        setInputValue,
        isTyping,
        currentPhotoIndex,
        setCurrentPhotoIndex,
        lastEmotion,
        dailyUsage,
        reminders,
        suggestedQuestions,
        setSuggestedQuestions,
        // 계산된 값
        remainingChats,
        isLimitReached,
        isMemorialMode,
        allPhotos,
        currentPhoto,
        galleryImages,

        // 핸들러
        handleNewChat,
        handleSend,
        handleRetry,
        handleReminderAccept,
        handleReminderDismiss,
    };
}
