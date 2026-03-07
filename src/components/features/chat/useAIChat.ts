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
    decrementDailyUsage,
    generatePersonalizedGreeting,
} from "@/components/features/chat";
import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";
import { LOCATION } from "@/config/constants";
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
    isStreaming: boolean;
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
// 위치 유틸리티 (장소 질문 감지 + GPS 좌표 수집)
// ============================================================================

/** 장소 질문 감지 키워드 */
const PLACE_PATTERNS: { pattern: RegExp; keyword: string }[] = [
    { pattern: /산책|공원|놀이터|야외|걷기|뛰기/, keyword: "공원" },
    { pattern: /병원|수의사|진료|응급|건강검진/, keyword: "동물병원" },
    { pattern: /펫카페|카페|놀 곳/, keyword: "펫카페" },
    { pattern: /미용|그루밍|목욕|트리밍/, keyword: "애견미용" },
    { pattern: /호텔|펫호텔|맡길|돌봄/, keyword: "펫호텔" },
    { pattern: /용품|사료|간식.*사/, keyword: "애견용품" },
];

/** 특정 지역명이 포함되면 GPS 기반 검색 불필요 (AI가 지역명 기반으로 답변) */
const SPECIFIC_LOCATION_PATTERN = /강릉|속초|양양|삼척|동해|제주|부산|대구|광주|대전|울산|세종|춘천|원주|천안|전주|목포|포항|경주|여수|통영|거제|김해|창원|안동|충주|제천|태백|정선|평창|서귀포|송정|해운대|송도|인천공항|김포공항/;

/** 유저 메시지에서 장소 질문 감지 */
function detectPlaceQueryClient(text: string): { detected: boolean; keyword?: string } {
    const questionPattern = /어디|어느|가까운|근처|주변|추천|갈까|가볼|찾아/;
    if (!questionPattern.test(text)) return { detected: false };
    // 특정 지역명이 포함되면 GPS 검색 스킵 (강릉, 부산 등)
    if (SPECIFIC_LOCATION_PATTERN.test(text)) return { detected: false };
    for (const { pattern, keyword } of PLACE_PATTERNS) {
        if (pattern.test(text)) return { detected: true, keyword };
    }
    return { detected: false };
}

/** Geolocation 권한 요청 + 좌표 수집 (5초 타임아웃) */
function getUserLocation(): Promise<{ lat: number; lng: number } | null> {
    return new Promise((resolve) => {
        if (typeof navigator === "undefined" || !navigator.geolocation) {
            resolve(null);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => resolve(null),
            { timeout: LOCATION.GEOLOCATION_TIMEOUT, enableHighAccuracy: false },
        );
    });
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
    /** 스트리밍 중 여부 (타이핑 dots 대신 실시간 텍스트 표시) */
    const [isStreaming, setIsStreaming] = useState(false);
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

        // 펫 전환 시 이전 메시지 + 추천 질문 즉시 초기화 (펫 간 데이터 분리)
        setMessages([]);
        setSuggestedQuestions([]);

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

                // ai_chats에 없으면 chat_messages(서버 정본)에서 폴백 로딩
                const { data: serverMessages } = await supabase
                    .from("chat_messages")
                    .select("role, content, created_at")
                    .eq("pet_id", selectedPetId)
                    .eq("user_id", user.id)
                    .order("created_at", { ascending: true })
                    .limit(30);

                if (serverMessages && serverMessages.length > 0) {
                    setMessages(
                        serverMessages.map((msg, i) => ({
                            id: `restored-${i}`,
                            role: msg.role === "user" ? "user" as const : "pet" as const,
                            content: msg.content,
                            timestamp: new Date(msg.created_at),
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

            // 장소 질문 감지 + GPS 좌표 수집
            const placeDetection = detectPlaceQueryClient(currentInput);
            let userLocation: { lat: number; lng: number } | null = null;
            if (placeDetection.detected) {
                userLocation = await getUserLocation();
            }

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
                        weight: selectedPet.weight,
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
                    // 위치 기반 장소 검색 데이터
                    ...(userLocation && placeDetection.keyword ? {
                        userLocation,
                        placeKeyword: placeDetection.keyword,
                    } : {}),
                }),
            });

            if (!response.ok) {
                // 비-스트리밍 에러 응답 (JSON)
                const errorData = await response.json();
                throw new Error(errorData.error || "AI 응답 생성 실패");
            }

            // SSE 스트리밍 응답 처리
            const petMessageId = `pet-${Date.now()}`;
            setIsTyping(false);
            setIsStreaming(true);

            // 빈 pet 메시지를 먼저 추가 (스트리밍으로 채워짐)
            setMessages((prev) => [...prev, {
                id: petMessageId,
                role: "pet",
                content: "",
                timestamp: new Date(),
                isStreaming: true,
            }]);

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let streamedContent = "";

            if (reader) {
                let buffer = "";
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });

                        // SSE 이벤트 파싱 (data: ... \n\n 구분)
                        const lines = buffer.split("\n\n");
                        buffer = lines.pop() || ""; // 마지막 불완전한 이벤트는 버퍼에 유지

                        for (const line of lines) {
                            const dataLine = line.trim();
                            if (!dataLine.startsWith("data: ")) continue;

                            try {
                                const event = JSON.parse(dataLine.slice(6));

                                if (event.type === "delta") {
                                    // 실시간 텍스트 청크 추가
                                    streamedContent += event.content;
                                    const currentContent = streamedContent;
                                    setMessages((prev) =>
                                        prev.map((msg) =>
                                            msg.id === petMessageId
                                                ? { ...msg, content: currentContent }
                                                : msg
                                        )
                                    );
                                } else if (event.type === "done") {
                                    // 최종 메타데이터 수신 - 검증된 reply로 교체 + 메타 적용
                                    setMessages((prev) =>
                                        prev.map((msg) =>
                                            msg.id === petMessageId
                                                ? {
                                                    ...msg,
                                                    content: event.reply,
                                                    emotion: event.emotion,
                                                    emotionScore: event.emotionScore,
                                                    matchedPhoto: event.matchedPhoto,
                                                    matchedTimeline: event.matchedTimeline,
                                                    nearbyPlaces: event.nearbyPlaces,
                                                    isStreaming: false,
                                                }
                                                : msg
                                        )
                                    );

                                    // 감정 정보 저장
                                    if (event.emotion) {
                                        setLastEmotion(event.emotion);
                                    }

                                    // AI가 제안한 후속 질문 저장
                                    if (event.suggestedQuestions && event.suggestedQuestions.length > 0) {
                                        setSuggestedQuestions(event.suggestedQuestions);
                                    }

                                    // 과사용 세션 종료 제안
                                    if (event.sessionEndingSuggestion) {
                                        setTimeout(() => {
                                            const sessionEndingMessage: ChatMessage = {
                                                id: `session-ending-${Date.now()}`,
                                                role: "system",
                                                content: event.sessionEndingSuggestion,
                                                timestamp: new Date(),
                                            };
                                            setMessages((prev) => [...prev, sessionEndingMessage]);
                                        }, 800);
                                    }

                                    // 위기 감지 시 상담 안내 카드
                                    if (event.crisisAlert) {
                                        const crisisMessage: ChatMessage = {
                                            id: `crisis-alert-${Date.now()}`,
                                            role: "system",
                                            type: "crisis-alert",
                                            content: event.crisisAlert.message,
                                            timestamp: new Date(),
                                            crisisAlert: event.crisisAlert as CrisisAlertInfo,
                                        };
                                        setTimeout(() => {
                                            setMessages((prev) => [...prev, crisisMessage]);
                                        }, 600);
                                    }

                                    // 자동 리마인더 제안
                                    if (event.suggestedReminder) {
                                        setTimeout(() => {
                                            const reminderMsg: ChatMessage = {
                                                id: `auto-reminder-${Date.now()}`,
                                                role: "system",
                                                type: "reminder-suggestion",
                                                content: `"${event.suggestedReminder.title}" 리마인더를 등록할까요? (${event.suggestedReminder.schedule.time})`,
                                                timestamp: new Date(),
                                                suggestedReminder: event.suggestedReminder,
                                            };
                                            setMessages((prev) => [...prev, reminderMsg]);
                                        }, 1000);
                                    }
                                } else if (event.type === "error") {
                                    throw new Error(event.error);
                                }
                            } catch (parseErr) {
                                // JSON 파싱 에러는 무시 (불완전한 청크)
                                if (parseErr instanceof Error && parseErr.message !== "AI 응답 생성 중 오류가 발생했습니다.") {
                                    continue;
                                }
                                throw parseErr;
                            }
                        }
                    }
                } finally {
                    reader.releaseLock();
                }
            }

            // 일상 모드 + 세션 첫 대화 후 리마인더 안내 (1회만)
            if (!isMemorialMode && !reminderSuggestionShown.current) {
                reminderSuggestionShown.current = true;
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
            // API 실패 시 사용량 복구 (차감한 1회를 되돌림)
            const restoredUsage = decrementDailyUsage();
            setDailyUsage(restoredUsage);

            // 빈 스트리밍 메시지 버블 제거 (content가 비어있는 pet 메시지)
            setMessages((prev) =>
                prev.filter((msg) => !(msg.role === "pet" && (!msg.content || msg.content.trim() === "")))
            );

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
            setIsStreaming(false);
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
        isStreaming,
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
