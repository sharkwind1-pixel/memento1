/**
 * AI 펫톡 탭 — 웹 src/components/features/chat/useAIChat.ts 1:1 이식
 *
 * 핵심:
 *  - SSE 진짜 스트리밍: response.body.getReader() + TextDecoder + data:\n\n 청크 파싱
 *    (RN fetch가 stream 미지원이면 자동 폴백: response.text() 후 일괄 파싱)
 *  - delta 이벤트마다 펫 메시지 content 실시간 업데이트
 *  - done 이벤트에서 reply 재교체 + 메타(emotion, matchedPhoto, suggestedQuestions, ...) 적용
 *  - AbortController로 펫 전환 시 진행 중 요청 취소
 *  - Pet 전체 정보 + chatHistory + timeline + photoMemories + reminders 풀 전송
 *  - 사용량: 낙관적 +1 → 에러 시 복구 / done 시 서버 값으로 교체
 *  - 펫 전환 시 ai_chats 우선 → chat_messages 폴백 → 인사말
 *  - 메시지 변경 1초 debounce → ai_chats upsert
 *  - 에러 시 빈 스트리밍 메시지 제거 + 시스템 메시지 + 재시도 버튼
 */

import { useState, useRef, useEffect, useCallback } from "react";
import {
    View, Text, TextInput, TouchableOpacity,
    FlatList, KeyboardAvoidingView, Platform,
    Image, StyleSheet, Alert, Share, Linking,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { useDarkMode } from "@/contexts/ThemeContext";
import { ChatMessage, TimelineEntry } from "@/types";
import { API_BASE_URL } from "@/config/constants";
import { COLORS } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import {
    DAILY_FREE_LIMIT,
    loadDailyUsage,
    incrementDailyUsage,
    decrementDailyUsage,
    fixKoreanParticles,
    generatePersonalizedGreeting,
    detectPlaceQuery,
    getUserLocation,
} from "@/lib/chat-helpers";
import AppHeader from "@/components/common/AppHeader";
import AppDrawer from "@/components/common/AppDrawer";
import PetSwitcher from "@/components/common/PetSwitcher";
import RemindersModal from "@/components/chat/RemindersModal";
import PawLoading from "@/components/ui/PawLoading";

interface ReminderItem {
    type: string;
    title: string;
    schedule: { type: string; time: string; dayOfWeek?: number; dayOfMonth?: number };
    enabled: boolean;
}

export default function AiChatScreen() {
    const router = useRouter();
    const { session, user, isPremium } = useAuth();
    const { selectedPet, isMemorialMode } = usePet();
    const { isDarkMode } = useDarkMode();
    const insets = useSafeAreaInsets();

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [remindersOpen, setRemindersOpen] = useState(false);
    const [dailyUsage, setDailyUsage] = useState(0);
    const [serverRemaining, setServerRemaining] = useState<number | null>(null);
    const [reminders, setReminders] = useState<ReminderItem[]>([]);
    const [timeline, setTimeline] = useState<TimelineEntry[]>([]);

    const flatListRef = useRef<FlatList<ChatMessage>>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const reminderSuggestionShown = useRef(false);
    const timelineRef = useRef<TimelineEntry[]>([]);
    timelineRef.current = timeline;

    const accentColor = isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500];
    const limit = isPremium ? Infinity : DAILY_FREE_LIMIT;
    const remainingChats = serverRemaining !== null
        ? serverRemaining
        : Math.max(0, limit === Infinity ? Infinity : limit - dailyUsage);
    const isLimitReached = !isPremium && remainingChats <= 0;

    // ===== 일일 사용량: 로컬 즉시 + 서버 비동기 =====
    useEffect(() => {
        loadDailyUsage().then(setDailyUsage);
        if (!session?.access_token) return;
        fetch(`${API_BASE_URL}/api/chat/usage`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
        })
            .then(async (res) => {
                if (!res.ok) return;
                const data = await res.json();
                if (typeof data.remaining === "number") setServerRemaining(data.remaining);
            })
            .catch(() => {});
    }, [session?.access_token]);

    // ===== 리마인더 로딩 =====
    useEffect(() => {
        if (!selectedPet?.id || !session?.access_token) {
            setReminders([]);
            return;
        }
        fetch(`${API_BASE_URL}/api/reminders?petId=${selectedPet.id}`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
        })
            .then(async (res) => {
                if (!res.ok) return;
                const data = await res.json();
                if (Array.isArray(data.reminders)) {
                    setReminders(data.reminders.map((r: ReminderItem) => ({
                        type: r.type, title: r.title, schedule: r.schedule, enabled: r.enabled,
                    })));
                }
            })
            .catch(() => {});
    }, [selectedPet?.id, session?.access_token]);

    // ===== 타임라인 로딩 (펫 전환 시) =====
    useEffect(() => {
        if (!selectedPet?.id || !user?.id) {
            setTimeline([]);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const { data } = await supabase
                    .from("timeline_entries")
                    .select("id, pet_id, type, title, content, date, mood, category, created_at")
                    .eq("pet_id", selectedPet.id)
                    .eq("user_id", user.id)
                    .order("date", { ascending: false })
                    .limit(30);
                if (cancelled || !data) return;
                setTimeline(
                    data.map((e): TimelineEntry => ({
                        id: e.id,
                        petId: e.pet_id,
                        type: e.type,
                        title: e.title,
                        content: e.content,
                        date: e.date,
                        mood: e.mood,
                        category: e.category,
                        createdAt: e.created_at,
                    })),
                );
            } catch {
                if (!cancelled) setTimeline([]);
            }
        })();
        return () => { cancelled = true; };
    }, [selectedPet?.id, user?.id]);

    // ===== 펫 전환: 진행 중 요청 취소 + 메시지 복원 =====
    useEffect(() => {
        if (!selectedPet?.id || !user?.id) {
            setMessages([]);
            setSuggestions([]);
            return;
        }

        // 이전 요청 취소
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsTyping(false);
        setIsStreaming(false);
        setMessages([]);
        setSuggestions([]);
        reminderSuggestionShown.current = false;

        let cancelled = false;
        (async () => {
            try {
                // 1) ai_chats 우선
                const { data: cached } = await supabase
                    .from("ai_chats")
                    .select("messages")
                    .eq("user_id", user.id)
                    .eq("pet_id", selectedPet.id)
                    .maybeSingle();

                if (cancelled) return;

                if (cached?.messages && Array.isArray(cached.messages) && cached.messages.length > 0) {
                    setMessages(
                        cached.messages.map((m: ChatMessage) => ({
                            ...m,
                            content: m.role === "pet" && selectedPet.name
                                ? fixKoreanParticles(m.content, selectedPet.name)
                                : m.content,
                            timestamp: new Date(m.timestamp),
                        })),
                    );
                    return;
                }

                // 2) chat_messages 폴백 (서버 정본)
                const { data: server } = await supabase
                    .from("chat_messages")
                    .select("role, content, created_at")
                    .eq("pet_id", selectedPet.id)
                    .eq("user_id", user.id)
                    .order("created_at", { ascending: true })
                    .limit(30);

                if (cancelled) return;

                if (server && server.length > 0) {
                    setMessages(
                        server.map((m, i) => ({
                            id: `restored-${i}`,
                            role: m.role === "user" ? "user" as const : "pet" as const,
                            content: m.role !== "user" && selectedPet.name
                                ? fixKoreanParticles(m.content, selectedPet.name)
                                : m.content,
                            timestamp: new Date(m.created_at),
                        })),
                    );
                    return;
                }

                // 3) 인사말로 시작
                const greeting = generatePersonalizedGreeting(
                    selectedPet, isMemorialMode, timelineRef.current,
                );
                setMessages([{
                    id: "greeting",
                    role: "pet",
                    content: greeting,
                    timestamp: new Date(),
                }]);
            } catch {
                if (cancelled) return;
                const greeting = generatePersonalizedGreeting(
                    selectedPet, isMemorialMode, timelineRef.current,
                );
                setMessages([{
                    id: "greeting",
                    role: "pet",
                    content: greeting,
                    timestamp: new Date(),
                }]);
            }
        })();

        return () => { cancelled = true; };
    }, [selectedPet?.id, user?.id, isMemorialMode]);

    // ===== 메시지 변경 시 1초 debounce로 ai_chats 저장 =====
    useEffect(() => {
        if (!selectedPet?.id || !user?.id || messages.length === 0) return;
        const timer = setTimeout(() => {
            supabase.from("ai_chats").upsert(
                { user_id: user.id, pet_id: selectedPet.id, messages },
                { onConflict: "user_id,pet_id" },
            ).then(() => {});
        }, 1000);
        return () => clearTimeout(timer);
    }, [messages, selectedPet?.id, user?.id]);

    // ===== 메시지 변경 시 자동 스크롤 =====
    // 일반 메신저 트렌드 — 항상 최신 메시지(맨 아래)가 보이게 시작.
    // 초기 로드든 새 메시지든 모두 맨 아래로 스크롤.
    useEffect(() => {
        if (messages.length === 0) return;
        // 약간의 지연으로 FlatList layout 안정화 후 scrollToEnd
        // 초기 로드는 animated:false로 깜빡임 없이, 새 메시지는 animated:true로 부드럽게
        const t = setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 120);
        return () => clearTimeout(t);
    }, [messages]);

    // ===== 메시지 전송 =====
    const handleSend = useCallback(async (directMessage?: string) => {
        const messageToSend = directMessage ?? input;
        if (!messageToSend.trim() || !selectedPet || !session?.access_token) return;
        if (isTyping || isStreaming) return;
        if (isLimitReached) {
            Alert.alert("오늘의 대화 한도", "오늘은 더 이상 대화할 수 없어요. 내일 다시 만나요.");
            return;
        }

        // 이전 요청 abort
        if (abortControllerRef.current) abortControllerRef.current.abort();
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        // 사용량 낙관적 증가
        const newUsage = await incrementDailyUsage();
        setDailyUsage(newUsage);
        if (serverRemaining !== null) {
            setServerRemaining((prev) => prev !== null ? Math.max(0, prev - 1) : null);
        }

        const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            role: "user",
            content: messageToSend.trim(),
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setSuggestions([]);
        setIsTyping(true);

        const petMessageId = `pet-${Date.now()}`;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

        try {
            const chatHistory = messages
                .filter((m) => m.role === "user" || m.role === "pet")
                .map((m) => ({
                    role: m.role === "user" ? "user" : "assistant",
                    content: m.content,
                }));

            const recentTimeline = timelineRef.current.slice(0, 10).map((e) => ({
                date: e.date, title: e.title, content: e.content, mood: e.mood,
            }));

            const photoMemories = (selectedPet.photos ?? [])
                .filter((p) => p.caption && p.caption.trim())
                .slice(0, 15)
                .map((p) => ({ date: p.date, caption: p.caption }));

            const placeDetection = detectPlaceQuery(messageToSend);
            // 장소 질문이면 expo-location으로 좌표 수집 (권한 없으면 null → 서버가 일반 답변)
            let userLocation: { lat: number; lng: number } | null = null;
            if (placeDetection.detected) {
                userLocation = await getUserLocation();
            }

            const body = {
                message: messageToSend.trim(),
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
                    nicknames: selectedPet.nicknames,
                    specialHabits: selectedPet.specialHabits,
                    favoriteFood: selectedPet.favoriteFood,
                    favoriteActivity: selectedPet.favoriteActivity,
                    favoritePlace: selectedPet.favoritePlace,
                    adoptedDate: selectedPet.adoptedDate,
                    howWeMet: selectedPet.howWeMet,
                    togetherPeriod: selectedPet.togetherPeriod,
                    memorableMemory: selectedPet.memorableMemory,
                },
                chatHistory,
                timeline: recentTimeline,
                photoMemories,
                reminders,
                enableAgent: true,
                // 좌표 + keyword 둘 다 있을 때만 nearby 검색 (웹 패턴 동일)
                ...(userLocation && placeDetection.keyword ? {
                    userLocation,
                    placeKeyword: placeDetection.keyword,
                } : {}),
            };

            const response = await fetch(`${API_BASE_URL}/api/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                    Accept: "text/event-stream",
                },
                body: JSON.stringify(body),
                signal: abortController.signal,
            });

            if (!response.ok) {
                let errMsg = `HTTP ${response.status}`;
                try {
                    const errData = await response.json();
                    errMsg = errData.error || errMsg;
                } catch {
                    try { errMsg = (await response.text()).slice(0, 200) || errMsg; } catch {}
                }
                throw new Error(errMsg);
            }

            // 빈 펫 메시지 추가 → 스트리밍으로 채워짐
            setIsTyping(false);
            setIsStreaming(true);
            setMessages((prev) => [...prev, {
                id: petMessageId,
                role: "pet",
                content: "",
                timestamp: new Date(),
                isStreaming: true,
            }]);

            // ===== SSE 파싱 =====
            const stream = response.body as ReadableStream<Uint8Array> | null;
            const useStream = !!(stream && typeof stream.getReader === "function");

            const handleEvent = (event: any) => {
                if (event.type === "delta" && typeof event.content === "string") {
                    setMessages((prev) => prev.map((msg) =>
                        msg.id === petMessageId
                            ? { ...msg, content: msg.content + event.content }
                            : msg,
                    ));
                } else if (event.type === "done") {
                    const finalReply = typeof event.reply === "string"
                        ? (selectedPet.name ? fixKoreanParticles(event.reply, selectedPet.name) : event.reply)
                        : undefined;

                    setMessages((prev) => prev.map((msg) =>
                        msg.id === petMessageId
                            ? {
                                ...msg,
                                content: finalReply ?? msg.content,
                                emotion: event.emotion,
                                emotionScore: event.emotionScore,
                                matchedPhoto: event.matchedPhoto,
                                matchedTimeline: event.matchedTimeline,
                                // 서버는 { query, places: [...] } 객체로 보냄. places 배열만 추출.
                                nearbyPlaces: Array.isArray(event.nearbyPlaces)
                                    ? event.nearbyPlaces
                                    : event.nearbyPlaces?.places ?? undefined,
                                isStreaming: false,
                            }
                            : msg,
                    ));

                    if (typeof event.remaining === "number") setServerRemaining(event.remaining);
                    if (Array.isArray(event.suggestedQuestions) && event.suggestedQuestions.length > 0) {
                        setSuggestions(event.suggestedQuestions);
                    }

                    if (event.crisisAlert) {
                        setTimeout(() => {
                            setMessages((prev) => [...prev, {
                                id: `crisis-${Date.now()}`,
                                role: "system",
                                type: "crisis-alert",
                                content: event.crisisAlert.message,
                                timestamp: new Date(),
                                crisisAlert: event.crisisAlert,
                            }]);
                        }, 600);
                    }

                    if (event.suggestedReminder) {
                        setTimeout(() => {
                            setMessages((prev) => [...prev, {
                                id: `auto-reminder-${Date.now()}`,
                                role: "system",
                                type: "reminder-suggestion",
                                content: `"${event.suggestedReminder.title}" 리마인더를 등록할까요? (${event.suggestedReminder.schedule.time})`,
                                timestamp: new Date(),
                                suggestedReminder: event.suggestedReminder,
                            }]);
                        }, 1000);
                    }

                    if (event.sessionEndingSuggestion) {
                        setTimeout(() => {
                            setMessages((prev) => [...prev, {
                                id: `session-ending-${Date.now()}`,
                                role: "system",
                                content: event.sessionEndingSuggestion,
                                timestamp: new Date(),
                            }]);
                        }, 800);
                    }
                } else if (event.type === "error") {
                    throw new Error(event.error || "AI 응답 생성 중 오류");
                }
            };

            if (useStream) {
                const reader = stream!.getReader();
                const decoder = new TextDecoder();
                let buffer = "";
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        buffer += decoder.decode(value, { stream: true });
                        const events = buffer.split("\n\n");
                        buffer = events.pop() ?? "";
                        for (const ev of events) {
                            const line = ev.trim();
                            if (!line.startsWith("data:")) continue;
                            try {
                                const json = JSON.parse(line.slice(5).trim());
                                handleEvent(json);
                            } catch {
                                // 불완전한 청크 — 무시
                            }
                        }
                    }
                    // 잔존 buffer 마지막 처리
                    if (buffer.trim().startsWith("data:")) {
                        try { handleEvent(JSON.parse(buffer.trim().slice(5).trim())); } catch {}
                    }
                } finally {
                    reader.releaseLock();
                }
            } else {
                // 폴백: 전체 텍스트 받아서 일괄 파싱
                const text = await response.text();
                const events = text.split("\n\n");
                for (const ev of events) {
                    const line = ev.trim();
                    if (!line.startsWith("data:")) continue;
                    try {
                        handleEvent(JSON.parse(line.slice(5).trim()));
                    } catch {}
                }
            }

            // 일상 모드 + 첫 응답 후 리마인더 안내 (1회)
            if (!isMemorialMode && !reminderSuggestionShown.current) {
                reminderSuggestionShown.current = true;
                setTimeout(() => {
                    setMessages((prev) => [...prev, {
                        id: `reminder-suggestion-${Date.now()}`,
                        role: "system",
                        type: "reminder-suggestion",
                        content: "리마인더로 알람이 필요한 시간을 적어주시면 알려드려요",
                        timestamp: new Date(),
                    }]);
                }, 1200);
            }
        } catch (err) {
            // abort는 조용히
            if (err instanceof Error && err.name === "AbortError") {
                setIsTyping(false);
                setIsStreaming(false);
                return;
            }

            // 사용량 복구
            const restored = await decrementDailyUsage();
            setDailyUsage(restored);
            if (serverRemaining !== null) {
                setServerRemaining((prev) => prev !== null ? prev + 1 : null);
            }

            // 빈 스트리밍 메시지 제거
            setMessages((prev) =>
                prev.filter((m) => !(m.id === petMessageId && (!m.content || m.content.trim() === ""))),
            );

            const errMsg = err instanceof Error ? err.message : String(err);
            const isRateLimited = errMsg.includes("429") || errMsg.includes("요청이 너무");

            setMessages((prev) => [...prev, {
                id: `system-${Date.now()}`,
                role: "system",
                content: isRateLimited
                    ? "요청이 많아 잠시 쉬어가고 있어요. 잠시 후 다시 시도해주세요."
                    : `연결 오류: ${errMsg}`,
                timestamp: new Date(),
                isError: true,
                retryMessage: isRateLimited ? undefined : messageToSend,
            }]);
        } finally {
            setIsTyping(false);
            setIsStreaming(false);
        }
    }, [
        input, selectedPet, session?.access_token, isTyping, isStreaming,
        isLimitReached, isMemorialMode, messages, reminders, serverRemaining,
    ]);

    const handleNewChat = useCallback(() => {
        if (!selectedPet) return;
        const greeting = generatePersonalizedGreeting(selectedPet, isMemorialMode, timelineRef.current);
        setMessages([{
            id: `greeting-${Date.now()}`, role: "pet", content: greeting, timestamp: new Date(),
        }]);
        setSuggestions([]);
        reminderSuggestionShown.current = false;
    }, [selectedPet, isMemorialMode]);

    const handleRetry = useCallback((errorMessageId: string, retryMessage: string) => {
        setMessages((prev) => prev.filter((m) => m.id !== errorMessageId));
        handleSend(retryMessage);
    }, [handleSend]);

    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.white;
    const borderColor = isDarkMode ? COLORS.gray[800] : COLORS.gray[100];

    // 감성 그라데이션 배경 — 모드별 따뜻한 색감
    const chatBgGradient: [string, string] = isDarkMode
        ? [COLORS.gray[950], COLORS.gray[900]]
        : isMemorialMode
            ? ["#FFFBEB", "#FEF3C7"]   // 메모리얼: 따뜻한 크림 → 살구
            : ["#F0F9FF", "#FFFFFF"];  // 일상: 하늘색 → 흰색

    const usedCount = Math.min(limit === Infinity ? 0 : limit, limit === Infinity ? 0 : (limit - remainingChats));

    if (!selectedPet) {
        return (
            <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
                <AppHeader onOpenDrawer={() => setDrawerOpen(true)} />
                <AppDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
                <View style={styles.emptyCenter}>
                    <View style={[styles.emptyIconWrap, { backgroundColor: COLORS.memento[50] }]}>
                        <Ionicons name="chatbubbles-outline" size={36} color={COLORS.memento[500]} />
                    </View>
                    <Text style={styles.emptyTitle}>AI 펫톡을 시작해보세요</Text>
                    <Text style={styles.emptyText}>
                        반려동물을 등록하면{"\n"}AI 펫톡으로 대화할 수 있어요
                    </Text>
                    <TouchableOpacity
                        onPress={() => router.push("/pet/new")}
                        style={[styles.emptyCta, { backgroundColor: COLORS.memento[500] }]}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="add" size={16} color="#fff" />
                        <Text style={styles.emptyCtaText}>반려동물 등록하기</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
            <AppHeader onOpenDrawer={() => setDrawerOpen(true)} />
            <AppDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
            <PetSwitcher accentColor={accentColor} onAddPet={() => router.push("/pet/new")} />
            <KeyboardAvoidingView
                style={styles.flex1}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={0}
            >
                <View style={[styles.header, { borderBottomColor: borderColor }]}>
                    {selectedPet.profileImage ? (
                        <Image source={{ uri: selectedPet.profileImage }} style={styles.headerAvatar} />
                    ) : (
                        <View style={[styles.headerAvatar, styles.headerAvatarFallback, { backgroundColor: accentColor + "20" }]}>
                            <Text style={{ fontSize: 16 }}>
                                {selectedPet.type === "강아지" ? "🐶" : "🐱"}
                            </Text>
                        </View>
                    )}
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Text style={{
                                fontSize: 16, fontWeight: "700",
                                color: isDarkMode ? COLORS.white : COLORS.gray[900],
                            }}>
                                {selectedPet.name}
                            </Text>
                            {/* 온라인 표시 — 살아있는 느낌 */}
                            <View style={{
                                width: 8, height: 8, borderRadius: 4,
                                backgroundColor: isMemorialMode ? "#FBBF24" : "#10B981",
                            }} />
                        </View>
                        <Text style={{
                            fontSize: 11,
                            color: isDarkMode ? COLORS.gray[400] : COLORS.gray[500],
                            marginTop: 1,
                        }}>
                            {isMemorialMode
                                ? `${selectedPet.name}와(과) 다시 만난 시간`
                                : `${selectedPet.name}와(과) 마음을 나눠보세요`}
                        </Text>
                    </View>

                    {/* 사용량 배지 */}
                    <View style={[
                        styles.usageBadge,
                        {
                            backgroundColor: remainingChats === 0
                                ? "#FEE2E2"
                                : (isDarkMode ? COLORS.gray[800] : accentColor + "1a"),
                        },
                    ]}>
                        <Ionicons
                            name="chatbubble-ellipses-outline"
                            size={12}
                            color={remainingChats === 0 ? "#B91C1C" : accentColor}
                        />
                        <Text style={[
                            styles.usageText,
                            { color: remainingChats === 0 ? "#B91C1C" : (isDarkMode ? COLORS.white : accentColor) },
                        ]}>
                            {limit === Infinity ? "무제한" : `${usedCount}/${limit}`}
                        </Text>
                    </View>

                    {/* 새 대화 */}
                    <TouchableOpacity
                        onPress={handleNewChat}
                        style={[styles.headerIconBtn, { backgroundColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[100] }]}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="refresh" size={16} color={isDarkMode ? COLORS.white : COLORS.gray[700]} />
                    </TouchableOpacity>

                    {/* 리마인더 */}
                    <TouchableOpacity
                        onPress={() => setRemindersOpen(true)}
                        style={[styles.headerIconBtn, { backgroundColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[100] }]}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="alarm-outline" size={18} color={isDarkMode ? COLORS.white : COLORS.gray[700]} />
                    </TouchableOpacity>
                </View>

                <LinearGradient colors={chatBgGradient} style={styles.flex1}>
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        keyExtractor={(item) => item.id}
                        style={styles.messages}
                        contentContainerStyle={{ paddingTop: 16, paddingBottom: 8, paddingHorizontal: 16 }}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <MessageRenderer
                                message={item}
                                pet={selectedPet}
                                accentColor={accentColor}
                                onRetry={handleRetry}
                            />
                        )}
                        ListFooterComponent={
                            isTyping ? (
                                <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 12 }}>
                                    <View style={[styles.bubbleAvatar, { backgroundColor: accentColor + "20" }]}>
                                        <Text style={{ fontSize: 12 }}>
                                            {selectedPet.type === "강아지" ? "🐶" : "🐱"}
                                        </Text>
                                    </View>
                                    <View>
                                        <Text style={{
                                            fontSize: 10,
                                            color: isDarkMode ? COLORS.gray[400] : COLORS.gray[500],
                                            marginBottom: 4,
                                            marginLeft: 4,
                                        }}>
                                            {selectedPet.name}이(가) 답하고 있어요...
                                        </Text>
                                        <View
                                            style={[
                                                styles.bubblePet,
                                                styles.bubblePetShadow,
                                                { backgroundColor: isDarkMode ? COLORS.gray[800] : "#fff" },
                                            ]}
                                        >
                                            <PawLoading size="sm" color={accentColor} />
                                        </View>
                                    </View>
                                </View>
                            ) : null
                        }
                    />
                </LinearGradient>

                {suggestions.length > 0 && (
                    <ScrollableSuggestions
                        suggestions={suggestions}
                        accentColor={accentColor}
                        onSelect={(s) => { setSuggestions([]); handleSend(s); }}
                    />
                )}

                <View style={[
                    styles.inputRow,
                    {
                        borderTopColor: borderColor,
                        paddingBottom: 10 + Math.max(insets.bottom, 0),
                    },
                ]}>
                    <TextInput
                        style={[
                            styles.textInput,
                            {
                                backgroundColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[100],
                                color: isDarkMode ? COLORS.white : COLORS.gray[900],
                            },
                        ]}
                        placeholder={isLimitReached ? "오늘의 대화를 다 사용했어요" : "메시지 입력..."}
                        placeholderTextColor={isMemorialMode ? COLORS.gray[500] : COLORS.gray[400]}
                        value={input}
                        onChangeText={setInput}
                        multiline
                        editable={!isLimitReached}
                        returnKeyType="send"
                        onSubmitEditing={() => handleSend()}
                    />
                    <TouchableOpacity
                        onPress={() => handleSend()}
                        disabled={!input.trim() || isTyping || isStreaming || isLimitReached}
                        style={[
                            styles.sendBtn,
                            { backgroundColor: input.trim() && !isTyping && !isStreaming && !isLimitReached ? accentColor : COLORS.gray[200] },
                        ]}
                        activeOpacity={0.85}
                    >
                        <Ionicons
                            name="arrow-up"
                            size={18}
                            color={input.trim() && !isTyping && !isStreaming && !isLimitReached ? "#fff" : COLORS.gray[400]}
                        />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
            <RemindersModal
                visible={remindersOpen}
                onClose={() => setRemindersOpen(false)}
                petId={selectedPet.id}
                petName={selectedPet.name}
                accentColor={accentColor}
                isMemorialMode={isMemorialMode}
            />
        </SafeAreaView>
    );
}

// ============================================================================
// 메시지 렌더러
// ============================================================================

const EMOTION_MAP: Record<string, { label: string; color: string }> = {
    happy: { label: "기쁨", color: "#FBBF24" },
    sad: { label: "슬픔", color: "#60A5FA" },
    anxious: { label: "불안", color: "#A78BFA" },
    angry: { label: "화남", color: "#EF4444" },
    grateful: { label: "고마움", color: "#F472B6" },
    lonely: { label: "외로움", color: "#94A3B8" },
    peaceful: { label: "평온", color: "#34D399" },
    excited: { label: "신남", color: "#FB923C" },
};

function MessageRenderer({
    message, pet, accentColor, onRetry,
}: {
    message: ChatMessage;
    pet: NonNullable<ReturnType<typeof usePet>["selectedPet"]>;
    accentColor: string;
    onRetry: (id: string, retryMessage: string) => void;
}) {
    const { isDarkMode } = useDarkMode();

    if (message.role === "system") {
        return <SystemMessage message={message} accentColor={accentColor} onRetry={onRetry} />;
    }

    const isUser = message.role === "user";

    async function shareContent() {
        try {
            await Share.share({ message: message.content });
        } catch {
            // 사용자 취소 — 무시
        }
    }

    if (isUser) {
        // 사용자 버블 — 그라데이션으로 더 생동감
        const userGradient: [string, string] = pet.status === "memorial"
            ? [COLORS.memorial[400], COLORS.memorial[500]]
            : [COLORS.memento[400], COLORS.memento[500]];
        return (
            <View style={{ flexDirection: "row", justifyContent: "flex-end", marginBottom: 12 }}>
                <TouchableOpacity
                    onLongPress={shareContent}
                    delayLongPress={400}
                    activeOpacity={0.85}
                    style={styles.bubbleUserShadow}
                >
                    <LinearGradient
                        colors={userGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.bubbleUser}
                    >
                        <Text style={{ color: "#fff", fontSize: 14, lineHeight: 22 }}>{message.content}</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        );
    }

    // 펫 버블: 라이트는 흰색 카드 + 부드러운 그림자, 다크는 회색
    const petBubbleBg = isDarkMode ? COLORS.gray[800] : "#FFFFFF";
    const emotionInfo = message.emotion ? EMOTION_MAP[message.emotion] : null;

    return (
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 12 }}>
            <View style={[styles.bubbleAvatar, { backgroundColor: accentColor + "20", marginBottom: 4 }]}>
                {pet.profileImage ? (
                    <Image source={{ uri: pet.profileImage }} style={styles.bubbleAvatar} />
                ) : (
                    <Text style={{ fontSize: 12 }}>{pet.type === "강아지" ? "🐶" : "🐱"}</Text>
                )}
            </View>
            <View style={{ maxWidth: "80%" }}>
                {emotionInfo && (
                    <View style={{
                        alignSelf: "flex-start",
                        backgroundColor: emotionInfo.color + "20",
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 9999,
                        marginBottom: 4,
                    }}>
                        <Text style={{ fontSize: 10, fontWeight: "600", color: emotionInfo.color }}>
                            {emotionInfo.label}
                        </Text>
                    </View>
                )}
                <TouchableOpacity
                    onLongPress={shareContent}
                    delayLongPress={400}
                    activeOpacity={0.85}
                    style={[styles.bubblePet, styles.bubblePetShadow, { backgroundColor: petBubbleBg }]}
                >
                    <Text
                        style={{
                            fontSize: 14, lineHeight: 22,
                            color: isDarkMode ? COLORS.white : COLORS.gray[800],
                        }}
                    >
                        {message.content || (message.isStreaming ? "..." : "")}
                    </Text>
                </TouchableOpacity>
                {message.matchedPhoto?.url && (
                    <Image
                        source={{ uri: message.matchedPhoto.url }}
                        style={{ width: 192, height: 128, borderRadius: 12, marginTop: 8 }}
                        resizeMode="cover"
                    />
                )}
                {message.nearbyPlaces && message.nearbyPlaces.length > 0 && (
                    <View style={{ marginTop: 8, gap: 6 }}>
                        {message.nearbyPlaces.slice(0, 3).map((place, idx) => {
                            // mapUrl 우선, 없으면 네이버 지도 검색 fallback
                            const url = place.mapUrl
                                ?? `https://map.naver.com/p/search/${encodeURIComponent(place.name + (place.address ? " " + place.address : ""))}`;
                            return (
                                <TouchableOpacity
                                    key={idx}
                                    onPress={() => Linking.openURL(url).catch(() => Alert.alert("열기 실패", "네이버 지도를 열 수 없어요."))}
                                    activeOpacity={0.85}
                                    style={{
                                        padding: 10,
                                        borderRadius: 10,
                                        backgroundColor: isDarkMode ? COLORS.gray[700] : "#fff",
                                        borderWidth: 1,
                                        borderColor: isDarkMode ? COLORS.gray[600] : COLORS.gray[200],
                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: 8,
                                    }}
                                >
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                            <Text style={{ fontSize: 13, fontWeight: "600", color: isDarkMode ? COLORS.white : COLORS.gray[900] }}>
                                                {place.name}
                                            </Text>
                                            {place.distance && (
                                                <Text style={{ fontSize: 10, color: accentColor, fontWeight: "700" }}>
                                                    {place.distance}
                                                </Text>
                                            )}
                                        </View>
                                        {place.address && (
                                            <Text style={{ fontSize: 11, color: isDarkMode ? COLORS.gray[400] : COLORS.gray[500], marginTop: 2 }}>
                                                {place.address}
                                            </Text>
                                        )}
                                    </View>
                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                                        <Ionicons name="map-outline" size={12} color={accentColor} />
                                        <Text style={{ fontSize: 10, color: accentColor, fontWeight: "700" }}>네이버 지도</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}
            </View>
        </View>
    );
}

function SystemMessage({
    message, accentColor, onRetry,
}: {
    message: ChatMessage;
    accentColor: string;
    onRetry: (id: string, retryMessage: string) => void;
}) {
    const { isDarkMode } = useDarkMode();

    if (message.isError) {
        return (
            <View style={{
                alignSelf: "center",
                marginBottom: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                backgroundColor: "#FEE2E2",
                borderRadius: 12,
                maxWidth: "90%",
            }}>
                <Text style={{ color: "#B91C1C", fontSize: 13, lineHeight: 18 }}>{message.content}</Text>
                {message.retryMessage && (
                    <TouchableOpacity
                        onPress={() => onRetry(message.id, message.retryMessage!)}
                        style={{
                            alignSelf: "flex-start",
                            marginTop: 8,
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            backgroundColor: "#DC2626",
                            borderRadius: 8,
                        }}
                    >
                        <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>다시 시도</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    }

    if (message.type === "crisis-alert" && message.crisisAlert) {
        return (
            <View style={{
                alignSelf: "stretch",
                marginBottom: 12,
                padding: 14,
                backgroundColor: "#FEF3C7",
                borderRadius: 14,
                borderLeftWidth: 4,
                borderLeftColor: "#F59E0B",
            }}>
                <Text style={{ color: "#92400E", fontSize: 13, fontWeight: "700", marginBottom: 6 }}>
                    잠깐, 괜찮으세요?
                </Text>
                <Text style={{ color: "#78350F", fontSize: 13, lineHeight: 18 }}>{message.content}</Text>
                {message.crisisAlert.resources && message.crisisAlert.resources.length > 0 && (
                    <View style={{ marginTop: 10, gap: 6 }}>
                        {message.crisisAlert.resources.map((r, i) => (
                            <Text key={i} style={{ color: "#92400E", fontSize: 12 }}>
                                · {r.name}: {r.phone}
                            </Text>
                        ))}
                    </View>
                )}
            </View>
        );
    }

    if (message.type === "reminder-suggestion") {
        return (
            <View style={{
                alignSelf: "center",
                marginBottom: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                backgroundColor: isDarkMode ? COLORS.gray[800] : accentColor + "15",
                borderRadius: 12,
                maxWidth: "90%",
            }}>
                <Text style={{
                    color: isDarkMode ? COLORS.gray[200] : accentColor,
                    fontSize: 12,
                    lineHeight: 18,
                }}>
                    {message.content}
                </Text>
            </View>
        );
    }

    return (
        <View style={{
            alignSelf: "center",
            marginBottom: 12,
            paddingHorizontal: 12,
            paddingVertical: 6,
            backgroundColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[100],
            borderRadius: 9999,
        }}>
            <Text style={{
                color: isDarkMode ? COLORS.gray[400] : COLORS.gray[500],
                fontSize: 11,
            }}>
                {message.content}
            </Text>
        </View>
    );
}

function ScrollableSuggestions({
    suggestions, accentColor, onSelect,
}: {
    suggestions: string[];
    accentColor: string;
    onSelect: (s: string) => void;
}) {
    return (
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <FlatList
                data={suggestions}
                horizontal
                keyExtractor={(item) => item}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        onPress={() => onSelect(item)}
                        style={{
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 9999,
                            borderWidth: 1,
                            borderColor: accentColor,
                        }}
                        activeOpacity={0.8}
                    >
                        <Text style={{ fontSize: 12, color: accentColor }}>{item}</Text>
                    </TouchableOpacity>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    emptyCenter: {
        flex: 1, alignItems: "center", justifyContent: "center",
        paddingHorizontal: 24, gap: 4,
    },
    emptyIconWrap: {
        width: 80, height: 80, borderRadius: 40,
        alignItems: "center", justifyContent: "center", marginBottom: 16,
    },
    emptyTitle: { fontSize: 17, fontWeight: "700", color: COLORS.gray[800], marginBottom: 4 },
    emptyText: { fontSize: 14, color: COLORS.gray[500], textAlign: "center", lineHeight: 20 },
    emptyCta: {
        flexDirection: "row", alignItems: "center", gap: 6, marginTop: 16,
        paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12,
    },
    emptyCtaText: { color: "#fff", fontSize: 14, fontWeight: "700" },
    header: {
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 20, paddingVertical: 12,
        borderBottomWidth: 1, gap: 8,
    },
    headerAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 12 },
    headerAvatarFallback: { alignItems: "center", justifyContent: "center" },
    usageBadge: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    },
    usageText: { fontSize: 11, fontWeight: "700" },
    headerIconBtn: {
        width: 34, height: 34, borderRadius: 17,
        alignItems: "center", justifyContent: "center",
    },
    messages: { flex: 1 },
    bubbleAvatar: {
        width: 28, height: 28, borderRadius: 14,
        alignItems: "center", justifyContent: "center",
    },
    bubbleUser: {
        maxWidth: "100%",
        paddingHorizontal: 16, paddingVertical: 12,
        borderRadius: 18, borderBottomRightRadius: 4,
    },
    bubbleUserShadow: {
        maxWidth: "80%",
        borderRadius: 18,
        // 사용자 버블 — 살짝 들린 느낌
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
    },
    bubblePet: {
        paddingHorizontal: 16, paddingVertical: 12,
        borderRadius: 18, borderTopLeftRadius: 4,
    },
    bubblePetShadow: {
        // 펫 버블 — 종이가 살짝 떠 있는 느낌, 라이트 모드일 때 강조
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 1,
    },
    inputRow: {
        flexDirection: "row", alignItems: "flex-end", gap: 8,
        paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1,
    },
    textInput: {
        flex: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12,
        fontSize: 14, maxHeight: 112,
    },
    sendBtn: {
        width: 40, height: 40, borderRadius: 20,
        alignItems: "center", justifyContent: "center",
    },
});
