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
    Image, StyleSheet, Alert, Share, Linking, Animated,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { useDarkMode } from "@/contexts/ThemeContext";
import { useSimpleMode } from "@/contexts/SimpleModeContext";
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
import PageBackground, { usePageBgColor } from "@/components/common/PageBackground";
import PetSwitcher from "@/components/common/PetSwitcher";
import RemindersModal from "@/components/chat/RemindersModal";
import ExportChatModal from "@/components/chat/ExportChatModal";
import PawLoading from "@/components/ui/PawLoading";
import MemorialAmbientStars from "@/components/chat/MemorialAmbientStars";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface ReminderItem {
    type: string;
    title: string;
    schedule: { type: string; time: string; dayOfWeek?: number; dayOfMonth?: number };
    enabled: boolean;
}

// 진입 시 default 추천멘트 — 웹 ChatInputArea ACTIVE/MEMORIAL_SUGGESTIONS 1:1.
// 웹은 랜덤이 아니라 고정 큐레이션 4개를 항상 같은 순서로 노출(예측가능 + 대화와
// 무관한 랜덤 회전 없음). 모바일도 동일 텍스트·순서로 통일. 서버 추천이 오면
// (event.suggestedQuestions) 이 기본값을 대체한다.
const DEFAULT_DAILY = ["예방접종 언제?", "건강 체크해줘", "산책 시간", "간식 추천"];
const DEFAULT_MEMORIAL = ["잘 지냈어?", "보고싶어", "오늘 네 생각 났어", "행복했던 기억"];

// 타이핑 인디케이터 감성 텍스트 — 웹 ChatMessageList 패리티 (펫종/모드별 순환)
const TYPING_TEXTS_DOG = [
    "꼬리 흔들며 생각 중...", "킁킁 냄새 맡는 중...", "고개 갸웃하는 중...",
    "발로 톡톡 치는 중...", "귀 쫑긋 세우는 중...",
];
const TYPING_TEXTS_CAT = [
    "그루밍하며 생각 중...", "꼬리 살랑살랑...", "고개 갸웃하는 중...",
    "앞발로 콕콕 치는 중...", "귀 쫑긋 세우는 중...",
];
const TYPING_TEXTS_OTHER = [
    "생각하는 중...", "고개 갸웃하는 중...", "귀 쫑긋 세우는 중...",
];
const TYPING_TEXTS_MEMORIAL = [
    "조용히 곁에 앉는 중...", "따뜻한 기억 떠올리는 중...", "별빛 아래 생각하는 중...",
    "이곳에서 너를 생각하는 중...", "소중한 추억 찾는 중...",
];


// 웹 useAIChat.mergeChatMessages 1:1 — ai_chats 통째 upsert는 last-write-wins라
// 다른 기기가 그 사이 추가한 메시지를 덮어 소실시킴. 저장 직전 서버값과 union
// 병합해 양쪽 모두 보존(메멘토 철학: 유실<중복). 키 = role|timestamp|content[:120].
function mergeChatMessages(
    a: ChatMessage[] = [],
    b: ChatMessage[] = [],
): ChatMessage[] {
    const ts = (m?: ChatMessage): number => {
        const t = m?.timestamp ? new Date(m.timestamp).getTime() : 0;
        return isNaN(t) ? 0 : t;
    };
    const keyOf = (m: ChatMessage) =>
        `${m?.role}|${ts(m)}|${(m?.content ?? "").slice(0, 120)}`;
    const map = new Map<string, ChatMessage>();
    for (const m of [...a, ...b]) {
        if (!m) continue;
        const k = keyOf(m);
        if (!map.has(k)) map.set(k, m);
    }
    return Array.from(map.values()).sort((x, y) => ts(x) - ts(y));
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
    const [typingTextIndex, setTypingTextIndex] = useState(0);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [photoIdx, setPhotoIdx] = useState(0);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [remindersOpen, setRemindersOpen] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);
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
        // default 추천 표시 (서버 첫 응답 받기 전이라도 사용자가 바로 클릭 가능)
        setSuggestions((isMemorialMode ? DEFAULT_MEMORIAL : DEFAULT_DAILY));
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

                // 웹 1:1 — 저장 3회 실패해 AsyncStorage 백업된 대화 복구.
                // 백업 마지막 메시지가 서버보다 최신이면 백업 우선 + 서버 재저장.
                const backupKey = `aichat_unsaved_${user.id}_${selectedPet.id}`;
                let backup: ChatMessage[] | null = null;
                try {
                    const raw = await AsyncStorage.getItem(backupKey);
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        if (Array.isArray(parsed) && parsed.length > 0) backup = parsed;
                    }
                } catch { /* 파싱 불가 */ }
                if (cancelled) return;
                const lastTs = (arr?: ChatMessage[]): number => {
                    if (!arr || arr.length === 0) return 0;
                    const t = arr[arr.length - 1]?.timestamp;
                    const n = t ? new Date(t).getTime() : 0;
                    return isNaN(n) ? 0 : n;
                };
                const serverMsgs = (cached?.messages && Array.isArray(cached.messages)) ? cached.messages as ChatMessage[] : undefined;
                if (backup && backup.length > 0 && lastTs(backup) >= lastTs(serverMsgs)) {
                    setMessages(
                        backup.map((m: ChatMessage) => ({
                            ...m,
                            content: m.role === "pet" && selectedPet.name
                                ? fixKoreanParticles(m.content, selectedPet.name)
                                : m.content,
                            timestamp: new Date(m.timestamp),
                        })),
                    );
                    // 서버 전용 메시지 소실 방지: 백업 ∪ 서버값 병합 후 저장.
                    const reMerged = mergeChatMessages(serverMsgs ?? [], backup);
                    supabase.from("ai_chats").upsert(
                        { user_id: user.id, pet_id: selectedPet.id, messages: reMerged },
                        { onConflict: "user_id,pet_id" },
                    ).then(({ error: reErr }) => {
                        if (!reErr) AsyncStorage.removeItem(backupKey).catch(() => {});
                    });
                    return;
                }

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
        const uid = user.id;
        const pid = selectedPet.id;
        const snapshot = messages;
        const backupKey = `aichat_unsaved_${uid}_${pid}`;
        const timer = setTimeout(async () => {
            // 웹 useAIChat 1:1 — 3회 재시도 + 실패 시 AsyncStorage 백업.
            // 기존 .then(()=>{})은 에러조차 안 봐서 대화 영구 소실(메멘토 심장 구멍).
            let saved = false;
            for (let attempt = 1; attempt <= 3; attempt++) {
                // 통째 덮어쓰기 전 서버 최신값과 병합 (다른 기기 메시지 소실 방지).
                // 조회 실패해도 로컬분이라도 저장 (미저장 < 부분유실).
                let toWrite = snapshot;
                try {
                    const { data: cur } = await supabase
                        .from("ai_chats")
                        .select("messages")
                        .eq("user_id", uid)
                        .eq("pet_id", pid)
                        .maybeSingle();
                    if (cur?.messages && Array.isArray(cur.messages)) {
                        toWrite = mergeChatMessages(
                            cur.messages as ChatMessage[],
                            snapshot,
                        );
                    }
                } catch { /* 서버 조회 실패 → 로컬분만 저장 */ }
                const { error } = await supabase.from("ai_chats").upsert(
                    { user_id: uid, pet_id: pid, messages: toWrite },
                    { onConflict: "user_id,pet_id" },
                );
                if (!error) { saved = true; break; }
                console.error(`[ai-chat save] ai_chats 실패 (${attempt}/3): ${error.message}`);
                if (attempt < 3) await new Promise((r) => setTimeout(r, 300 * attempt));
            }
            if (!saved) {
                try {
                    await AsyncStorage.setItem(backupKey, JSON.stringify(snapshot));
                    console.error(`[ai-chat save] 3회 실패 → AsyncStorage 백업: ${backupKey}`);
                } catch { /* 백업 불가 */ }
            } else {
                try { await AsyncStorage.removeItem(backupKey); } catch { /* noop */ }
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [messages, selectedPet?.id, user?.id]);

    // ===== 자동 스크롤 =====
    // 입장 시 곧장 최근 대화(맨 끝)부터 (사용자 결정 2026-05-18, 웹과 통일).
    // 기존 setTimeout(120ms)+scrollToEnd는 FlatList 레이아웃 안정 전이라
    // 애매한 중간 위치에서 멈췄음 → FlatList onContentSizeChange로 교체
    // (콘텐츠 높이 확정 시점에 호출되어 항상 정확히 맨 끝). 첫 스크롤은
    // animated:false(중간 멈춤 없이 즉시), 이후 새 메시지는 animated:true.
    const initialScrollDone = useRef(false);
    useEffect(() => {
        // 펫 전환 시 다시 즉시-스크롤로 (새 펫 대화도 최근부터)
        initialScrollDone.current = false;
        setPhotoIdx(0);
    }, [selectedPet?.id]);

    // ===== 메시지 전송 =====
    const handleSend = useCallback(async (directMessage?: string) => {
        const messageToSend = directMessage ?? input;
        if (!messageToSend.trim() || !selectedPet || !session?.access_token) return;
        if (isTyping || isStreaming) return;
        if (isLimitReached) {
            // 웹 패리티: 단순 안내 대신 프리미엄 전환 동선 제공
            Alert.alert(
                "오늘의 대화 한도",
                `${selectedPet.name}와(과) 더 이야기하고 싶다면 프리미엄으로 무제한 대화할 수 있어요. 무료는 매일 다시 충전돼요.`,
                [
                    { text: "내일 다시 올게요", style: "cancel" },
                    { text: "프리미엄 보기", onPress: () => router.push("/subscription") },
                ],
            );
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

            // 최근 30개 + category 포함 (timeline-patterns의 카테고리 누적 30일 룰 활성화)
            const recentTimeline = timelineRef.current.slice(0, 30).map((e) => ({
                date: e.date, title: e.title, content: e.content, mood: e.mood, category: e.category,
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
            // 디버그: stream vs text fallback 어느 경로 타는지 (RN의 fetch stream 미지원 시 text fallback)
            console.log(`[Chat] useStream=${useStream} (RN fetch stream 지원 여부)`);

            const handleEvent = (event: any) => {
                // 디버그: SSE 이벤트 도달 추적 (어떤 type이 오는지 + done 이벤트 누락 여부 진단)
                console.log(`[Chat] event type=${event?.type} keys=${Object.keys(event ?? {}).join(",")}`);
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
                    // 디버그: suggestedQuestions 수신 여부 + 갯수 확인 (모바일에서 추천멘트 안 보이는 버그 추적)
                    console.log(`[Chat] done event suggestedQuestions =`,
                        Array.isArray(event.suggestedQuestions)
                            ? `[${event.suggestedQuestions.length} items: ${event.suggestedQuestions.slice(0, 2).join(", ")}...]`
                            : `${typeof event.suggestedQuestions} (not array)`);
                    if (Array.isArray(event.suggestedQuestions) && event.suggestedQuestions.length > 0) {
                        setSuggestions(event.suggestedQuestions);
                    }

                    // 위기 알림은 유저 UI에 표시하지 않음 (서버는 텔레그램 시스템 채널로 알림 전송).
                    // 사용자 결정: AI 펫톡 흐름을 끊지 않고, 위기 대응은 백엔드 모니터링만.
                    // (이전: setMessages에 crisis-alert 카드 추가)

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

    const startFreshChat = useCallback(() => {
        if (!selectedPet) return;
        const greeting = generatePersonalizedGreeting(selectedPet, isMemorialMode, timelineRef.current);
        setMessages([{
            id: `greeting-${Date.now()}`, role: "pet", content: greeting, timestamp: new Date(),
        }]);
        // 새 대화 시작 시에도 default 추천 즉시 표시
        setSuggestions((isMemorialMode ? DEFAULT_MEMORIAL : DEFAULT_DAILY));
        reminderSuggestionShown.current = false;
    }, [selectedPet, isMemorialMode]);

    const handleNewChat = useCallback(() => {
        if (!selectedPet) return;
        // 메시지 2개 이상이면 확인 후 시작 (웹과 동일 패턴)
        if (messages.length > 1) {
            Alert.alert(
                "새 대화 시작",
                "현재 대화가 초기화됩니다. 새 대화를 시작할까요?",
                [
                    { text: "취소", style: "cancel" },
                    { text: "시작", onPress: startFreshChat },
                ],
            );
            return;
        }
        startFreshChat();
    }, [selectedPet, messages.length, startFreshChat]);

    const handleRetry = useCallback((errorMessageId: string, retryMessage: string) => {
        setMessages((prev) => prev.filter((m) => m.id !== errorMessageId));
        handleSend(retryMessage);
    }, [handleSend]);

    // 리마인더 카드 수락: 안내 메시지 제거 + 기록 탭(케어 리마인더)으로 이동 — 웹 패리티
    const handleReminderAccept = useCallback((messageId: string) => {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        router.push("/(tabs)/record");
    }, [router]);

    // 리마인더 카드 거절: 안내 메시지만 제거
    const handleReminderDismiss = useCallback((messageId: string) => {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
    }, []);

    // 타이핑 인디케이터 감성 텍스트 순환 (웹 패리티) — 2.5초마다 다음 문구
    useEffect(() => {
        if (!isTyping) {
            setTypingTextIndex(0);
            return;
        }
        const id = setInterval(() => {
            setTypingTextIndex((prev) => prev + 1);
        }, 2500);
        return () => clearInterval(id);
    }, [isTyping]);

    const bgColor = usePageBgColor();
    const borderColor = isDarkMode ? COLORS.gray[800] : COLORS.gray[100];

    // 채팅 본문 그라데이션 — 웹 AIChatPage 1:1 (3-stop)
    // 일상: memento-50 → memento-75 → white / 추모: memorial-50 → orange-50 → yellow-50
    const chatBgGradient: readonly [string, string, ...string[]] = isDarkMode
        ? [COLORS.gray[950], COLORS.gray[900]]
        : isMemorialMode
            ? [COLORS.memorial[50], "#FFF7ED", "#FEFCE8"]
            : [COLORS.memento[50], COLORS.memento[75], "#FFFFFF"];

    const usedCount = Math.min(limit === Infinity ? 0 : limit, limit === Infinity ? 0 : (limit - remainingChats));

    if (!selectedPet) {
        return (
            <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
                <PageBackground />
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
                <View style={[
                    styles.header,
                    {
                        borderBottomColor: borderColor,
                        // 추모 모드: 따뜻한 크림톤 헤더 (웹과 동일 amber 분위기)
                        backgroundColor: isMemorialMode
                            ? (isDarkMode ? "#1F1407" : "#FFFBEB")
                            : (isDarkMode ? COLORS.gray[900] : "#FFFFFF"),
                    },
                ]}>
                    {/* 추모 모드: 헤더 위에 잔잔한 별 파티클 (웹 DomeGallery 모바일 대체) */}
                    {isMemorialMode && (
                        <MemorialAmbientStars height={64} />
                    )}
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

                    {/* 대화 내보내기 (메시지 1개 초과일 때만 노출, 웹 패턴) */}
                    {messages.length > 1 && (
                        <TouchableOpacity
                            onPress={() => setExportOpen(true)}
                            style={[styles.headerIconBtn, { backgroundColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[100] }]}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="share-outline" size={16} color={isDarkMode ? COLORS.white : COLORS.gray[700]} />
                        </TouchableOpacity>
                    )}

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
                    {/* 추모 모드: chat 영역 전체 backdrop (정적 펄스 별 + 떠오르는 별, 웹 매칭) */}
                    {isMemorialMode && <MemorialAmbientStars />}
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        keyExtractor={(item) => item.id}
                        style={styles.messages}
                        contentContainerStyle={{ paddingTop: 0, paddingBottom: 16, paddingHorizontal: 16 }}
                        showsVerticalScrollIndicator={false}
                        ListHeaderComponent={
                            // 웹 PetProfileSidebar + AI고지 1:1 — 리스트와 함께 스크롤
                            // (고정 블록으로 두면 키보드 시 메시지 영역이 0으로 눌려 안 보였음)
                            <View style={{ marginHorizontal: -16 }}>
                                <PetPhotoHero
                                    photos={[
                                        ...(selectedPet.profileImage ? [{ id: "profile", url: selectedPet.profileImage, cropPosition: selectedPet.profileCropPosition }] : []),
                                        ...(selectedPet.photos ?? []).map((p) => ({ id: p.id, url: p.url, cropPosition: p.cropPosition })),
                                    ]}
                                    name={selectedPet.name}
                                    type={selectedPet.type}
                                    breed={selectedPet.breed}
                                    isMemorial={isMemorialMode}
                                    memorialDate={selectedPet.memorialDate}
                                    birthday={selectedPet.birthday}
                                    idx={photoIdx}
                                    setIdx={setPhotoIdx}
                                    onRegister={() => router.push("/(tabs)/record")}
                                />
                                <View style={{
                                    marginHorizontal: 16, marginTop: 8, marginBottom: 8,
                                    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
                                    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
                                    backgroundColor: isDarkMode
                                        ? (isMemorialMode ? "rgba(251,191,36,0.10)" : "rgba(7,89,133,0.40)")
                                        : (isMemorialMode ? "rgba(254,243,199,0.8)" : "rgba(186,230,253,0.8)"),
                                }}>
                                    <Ionicons
                                        name="information-circle"
                                        size={12}
                                        color={isMemorialMode ? COLORS.memorial[700] : COLORS.memento[700]}
                                    />
                                    <Text style={{
                                        fontSize: 12,
                                        color: isDarkMode
                                            ? (isMemorialMode ? COLORS.memorial[300] : COLORS.memento[300])
                                            : (isMemorialMode ? COLORS.memorial[700] : COLORS.memento[700]),
                                    }}>
                                        AI가 도와주는 대화예요. 참고용으로 봐주세요!
                                    </Text>
                                </View>
                            </View>
                        }
                        onContentSizeChange={() => {
                            if (messages.length === 0) return;
                            flatListRef.current?.scrollToEnd({ animated: initialScrollDone.current });
                            initialScrollDone.current = true;
                        }}
                        renderItem={({ item, index }) => (
                            <MessageRenderer
                                message={item}
                                pet={selectedPet}
                                accentColor={accentColor}
                                onRetry={handleRetry}
                                onReminderAccept={handleReminderAccept}
                                onReminderDismiss={handleReminderDismiss}
                                prevTimestamp={index > 0 ? messages[index - 1].timestamp : undefined}
                                isFirst={index === 0}
                            />
                        )}
                        ListFooterComponent={
                            isTyping ? (
                                // 웹 ChatMessageList 타이핑 인디케이터 1:1 — 아바타(링) +
                                // 한 말풍선 안에 발바닥 3개 시차 bounce, 그 아래 멘트.
                                <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 12 }}>
                                    <View style={[
                                        styles.bubbleAvatar,
                                        {
                                            backgroundColor: isMemorialMode ? COLORS.memorial[100] : COLORS.memento[100],
                                            borderWidth: 2,
                                            borderColor: isMemorialMode ? COLORS.memorial[200] : COLORS.memento[200],
                                        },
                                    ]}>
                                        {selectedPet.profileImage ? (
                                            <Image source={{ uri: selectedPet.profileImage }} style={styles.bubbleAvatar} />
                                        ) : (
                                            <Ionicons
                                                name="paw"
                                                size={16}
                                                color={isMemorialMode ? COLORS.memorial[500] : COLORS.memento[600]}
                                            />
                                        )}
                                    </View>
                                    <View
                                        style={[
                                            styles.bubblePet,
                                            styles.bubblePetShadow,
                                            { backgroundColor: isDarkMode ? COLORS.gray[800] : "#fff", paddingHorizontal: 20 },
                                        ]}
                                    >
                                        <PawLoading
                                            size="sm"
                                            color={accentColor}
                                            textColor={accentColor}
                                            text={(() => {
                                                const tt = isMemorialMode
                                                    ? TYPING_TEXTS_MEMORIAL
                                                    : selectedPet.type === "고양이"
                                                        ? TYPING_TEXTS_CAT
                                                        : selectedPet.type === "강아지"
                                                            ? TYPING_TEXTS_DOG
                                                            : TYPING_TEXTS_OTHER;
                                                return tt[typingTextIndex % tt.length];
                                            })()}
                                        />
                                    </View>
                                </View>
                            ) : null
                        }
                    />
                </LinearGradient>

                {!isLimitReached && (
                    // 웹 ChatInputArea 1:1 — 서버 추천 있으면 그걸, 없으면 항상 기본 4개.
                    // (모바일은 빈 배열일 때 칩이 통째 사라지던 게 웹과 불일치였음)
                    <ScrollableSuggestions
                        suggestions={suggestions.length > 0 ? suggestions : (isMemorialMode ? DEFAULT_MEMORIAL : DEFAULT_DAILY)}
                        isMemorialMode={isMemorialMode}
                        onSelect={(s) => { setSuggestions([]); handleSend(s); }}
                    />
                )}

                {isLimitReached ? (
                    // 웹 ChatInputArea 한도 카드 1:1 (네이티브 Alert 아닌 풀 업셀 카드)
                    <View style={{
                        paddingHorizontal: 16,
                        paddingTop: 8,
                        paddingBottom: 12 + Math.max(insets.bottom, 0),
                        borderTopWidth: 1,
                        borderTopColor: borderColor,
                    }}>
                        <LinearGradient
                            colors={isMemorialMode
                                ? [COLORS.memorial[100], "#FFEDD5"]
                                : [COLORS.memento[100], COLORS.memento[200]]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={{ borderRadius: 16, padding: 20, marginBottom: 10 }}
                        >
                            <Text style={{
                                fontSize: 15, fontWeight: "600", marginBottom: 6,
                                color: isMemorialMode ? COLORS.memorial[800] : COLORS.memento[600],
                            }}>
                                {isMemorialMode ? "오늘은 여기까지 이야기 나눌 수 있어요" : "오늘의 무료 대화를 모두 사용했어요"}
                            </Text>
                            <Text style={{
                                fontSize: 13, lineHeight: 19, marginBottom: 14,
                                color: isMemorialMode ? COLORS.memorial[700] : COLORS.memento[600],
                            }}>
                                {(() => {
                                    // 웹 ChatInputArea 1:1 — 직전 유저 메시지 30자 인용 분기
                                    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
                                    const quoted = lastUserMsg
                                        ? `"${lastUserMsg.slice(0, 30)}${lastUserMsg.length > 30 ? "..." : ""}"`
                                        : "";
                                    if (isMemorialMode) {
                                        return quoted
                                            ? `${quoted} 이야기, 내일 이어서 나눠요.`
                                            : `${selectedPet.name}는 내일도 여기서 기다리고 있을게요.`;
                                    }
                                    return quoted
                                        ? `${quoted} 이야기를 계속하려면 프리미엄으로 업그레이드하세요`
                                        : `프리미엄으로 ${selectedPet.name}와(과) 무제한 대화하세요`;
                                })()}
                            </Text>
                            <TouchableOpacity
                                onPress={() => router.push("/subscription")}
                                activeOpacity={0.85}
                                style={{
                                    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
                                    alignSelf: "flex-start",
                                    paddingHorizontal: 20, paddingVertical: 11, borderRadius: 9999,
                                    backgroundColor: isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500],
                                }}
                            >
                                <Ionicons name={isMemorialMode ? "diamond" : "sparkles"} size={15} color="#fff" />
                                <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>
                                    {isMemorialMode ? `${selectedPet.name}와(과) 더 이야기하기` : "프리미엄 시작하기"}
                                </Text>
                            </TouchableOpacity>
                            <Text style={{
                                fontSize: 11, marginTop: 8,
                                color: isMemorialMode ? COLORS.memorial[600] : COLORS.memento[500],
                            }}>
                                하루 약 330원, 월 9,900원
                            </Text>
                        </LinearGradient>
                        <Text style={{
                            fontSize: 11, textAlign: "center",
                            color: isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500],
                        }}>
                            내일 다시 10회 무료 대화가 충전돼요
                        </Text>
                    </View>
                ) : (
                <View style={[
                    styles.inputRow,
                    {
                        borderTopWidth: 0,
                        paddingBottom: 10 + Math.max(insets.bottom, 0),
                    },
                ]}>
                    {/* 웹 ChatInputArea 1:1 — textarea+전송을 한 테두리 박스(rounded-xl)로 */}
                    <View style={{
                        flex: 1,
                        flexDirection: "row",
                        alignItems: "flex-end",
                        gap: 8,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: isMemorialMode ? COLORS.memorial[200] : COLORS.memento[200],
                        backgroundColor: isDarkMode
                            ? COLORS.gray[800]
                            : (isMemorialMode ? "rgba(255,251,235,0.3)" : "#fff"),
                        padding: 6,
                    }}>
                        <TextInput
                            style={[
                                styles.textInput,
                                {
                                    flex: 1,
                                    backgroundColor: "transparent",
                                    color: isDarkMode ? COLORS.white : COLORS.gray[900],
                                    maxHeight: 84,
                                },
                            ]}
                            placeholder="메시지 입력..."
                            placeholderTextColor={isMemorialMode ? COLORS.gray[500] : COLORS.gray[400]}
                            value={input}
                            onChangeText={setInput}
                            multiline
                            returnKeyType="send"
                            onSubmitEditing={() => handleSend()}
                        />
                        <TouchableOpacity
                            onPress={() => handleSend()}
                            disabled={!input.trim() || isTyping || isStreaming}
                            style={{ borderRadius: 8, minWidth: 44, minHeight: 44, overflow: "hidden" }}
                            activeOpacity={0.85}
                        >
                            {input.trim() && !isTyping && !isStreaming ? (
                                <LinearGradient
                                    colors={isMemorialMode
                                        ? [COLORS.memorial[500], COLORS.memorial[400]]
                                        : [COLORS.memento[500], COLORS.memento[400]]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={{ flex: 1, minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}
                                >
                                    <Ionicons name="send" size={20} color="#fff" />
                                </LinearGradient>
                            ) : (
                                <View style={{ flex: 1, minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.gray[200] }}>
                                    <Ionicons name="send" size={20} color={COLORS.gray[400]} />
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
                )}
            </KeyboardAvoidingView>
            <RemindersModal
                visible={remindersOpen}
                onClose={() => setRemindersOpen(false)}
                petId={selectedPet.id}
                petName={selectedPet.name}
                accentColor={accentColor}
                isMemorialMode={isMemorialMode}
            />
            <ExportChatModal
                isOpen={exportOpen}
                onClose={() => setExportOpen(false)}
                messages={messages}
                pet={selectedPet}
                isMemorialMode={isMemorialMode}
            />
        </SafeAreaView>
    );
}

// ============================================================================
// 메시지 렌더러
// ============================================================================

// 색·강도는 웹 ChatMessageList EMOTION_GLOW_COLORS와 1:1 동일 (웹 패리티)
const EMOTION_MAP: Record<string, { label: string; color: string; glow: number }> = {
    happy: { label: "기쁨", color: "#EAB308", glow: 0.5 },
    sad: { label: "슬픔", color: "#8B5CF6", glow: 0.4 },
    anxious: { label: "불안", color: "#6B7280", glow: 0.4 },
    angry: { label: "화남", color: "#EF4444", glow: 0.4 },
    grateful: { label: "고마움", color: "#EC4899", glow: 0.4 },
    lonely: { label: "외로움", color: "#6366F1", glow: 0.4 },
    peaceful: { label: "평온", color: "#10B981", glow: 0.4 },
    excited: { label: "신남", color: "#F59E0B", glow: 0.5 },
};

/** 시간을 한국어 형식으로 포맷 (오전/오후 HH:MM) — 웹 chatTypes.ts와 동일 */
function formatTimestamp(date: Date): string {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours < 12 ? "오전" : "오후";
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const displayMinutes = minutes.toString().padStart(2, "0");
    return `${period} ${displayHours}:${displayMinutes}`;
}

/** 두 메시지 사이의 시간 간격이 5분 이상인지 (웹 동일 패턴) */
function hasTimeGap(prev: Date, curr: Date): boolean {
    return Math.abs(curr.getTime() - prev.getTime()) > 5 * 60 * 1000;
}

// 웹 PetProfileSidebar 1:1 (모바일 폭 = 축소 카드) — AI펫톡 상단 펫 사진 히어로.
// 사진 있으면: 사진 + 하단 그라데이션 + 이름/종·품종/경과일 오버레이 + 점 페이지네이션.
// 없으면: 그라데이션 카드 + 발바닥 + 정보 + "사진 등록하기".
function petDaysSince(dateStr?: string): number | null {
    if (!dateStr) return null;
    const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
    return isNaN(d) ? null : d;
}

function PetPhotoHero({
    photos, name, type, breed, isMemorial, memorialDate, birthday, idx, setIdx, onRegister,
}: {
    photos: { id: string; url: string; cropPosition?: { x: number; y: number } }[];
    name: string; type: string; breed?: string;
    isMemorial: boolean; memorialDate?: string; birthday?: string;
    idx: number; setIdx: (n: number) => void; onRegister: () => void;
}) {
    const W = isMemorial ? 220 : 200;
    const H = isMemorial ? Math.round(W * 4 / 3) : Math.round(W * 3 / 4);
    const d = isMemorial && memorialDate ? petDaysSince(memorialDate)
        : birthday ? petDaysSince(birthday) : null;
    const dateLabel = d == null ? ""
        : (isMemorial && memorialDate ? `무지개다리를 건넌 지 ${d}일` : `함께한 지 ${d}일`);
    const ringColor = isMemorial ? "rgba(253,230,138,0.5)" : "rgba(255,243,232,0.5)";
    const cur = photos[idx] ?? photos[0];
    const touchStartX = useRef(0);

    if (cur) {
        // CSS objectPosition 근사: 1.6배 이미지 + 절대 좌표 이동
        const S = 1.6;
        const cx = cur.cropPosition?.x ?? 50;
        const cy = cur.cropPosition?.y ?? 50;
        const imgLeft = -W * (S - 1) * cx / 100;
        const imgTop = -H * (S - 1) * cy / 100;
        return (
            <View style={{ alignItems: "center", paddingTop: 8, paddingBottom: 8 }}>
                <View
                    onTouchStart={(e) => { touchStartX.current = e.nativeEvent.pageX; }}
                    onTouchEnd={(e) => {
                        if (photos.length <= 1) return;
                        const delta = e.nativeEvent.pageX - touchStartX.current;
                        if (Math.abs(delta) > 50) {
                            setIdx(delta < 0
                                ? (idx + 1) % photos.length
                                : (idx - 1 + photos.length) % photos.length);
                        } else {
                            setIdx((idx + 1) % photos.length);
                        }
                    }}
                    style={{
                        width: W, height: H, borderRadius: 16, overflow: "hidden",
                        borderWidth: 2, borderColor: ringColor,
                        shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
                    }}
                >
                    <Image
                        source={{ uri: cur.url }}
                        style={{ position: "absolute", width: W * S, height: H * S, left: imgLeft, top: imgTop }}
                        resizeMode="cover"
                    />
                    <LinearGradient
                        colors={["rgba(0,0,0,0.6)", "transparent"]}
                        start={{ x: 0, y: 1 }}
                        end={{ x: 0, y: 0.4 }}
                        style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: 0 }}
                    />
                    <View style={{ position: "absolute", left: 16, right: 16, bottom: 12 }}>
                        <Text numberOfLines={1} style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>{name}</Text>
                        <Text numberOfLines={1} style={{ color: "rgba(255,255,255,0.9)", fontSize: 14 }}>
                            {type}{breed ? ` · ${breed}` : ""}
                        </Text>
                        {dateLabel ? (
                            <Text numberOfLines={1} style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, marginTop: 4 }}>
                                {dateLabel}
                            </Text>
                        ) : null}
                    </View>
                </View>
                {photos.length > 1 && (
                    <View style={{ flexDirection: "row", justifyContent: "center", gap: 4, marginTop: 8 }}>
                        {photos.map((_, i) => (
                            <TouchableOpacity
                                key={i}
                                onPress={() => setIdx(i)}
                                style={{
                                    height: 6, borderRadius: 999,
                                    width: i === idx ? 16 : 6,
                                    backgroundColor: i === idx
                                        ? (isMemorial ? COLORS.memorial[500] : COLORS.memento[500])
                                        : (isMemorial ? COLORS.memorial[300] : COLORS.memento[300]),
                                }}
                            />
                        ))}
                    </View>
                )}
            </View>
        );
    }
    return (
        <View style={{ alignItems: "center", paddingTop: 8, paddingBottom: 8 }}>
            <LinearGradient
                colors={isMemorial ? [COLORS.memorial[100], "#FFEDD5"] : [COLORS.memento[100], COLORS.memento[200]]}
                style={{
                    width: 200, height: 150, borderRadius: 16,
                    alignItems: "center", justifyContent: "center", padding: 16,
                    borderWidth: 2, borderColor: ringColor,
                }}
            >
                <View style={{
                    width: 56, height: 56, borderRadius: 28, marginBottom: 8,
                    alignItems: "center", justifyContent: "center",
                    backgroundColor: isMemorial ? "rgba(253,230,138,0.5)" : "rgba(255,255,255,0.5)",
                }}>
                    <Ionicons name="paw" size={26} color={isMemorial ? COLORS.memorial[500] : COLORS.memento[600]} />
                </View>
                <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 4, color: isMemorial ? COLORS.memorial[800] : COLORS.memento[800] }}>{name}</Text>
                <Text style={{ fontSize: 14, color: isMemorial ? COLORS.memorial[600] : COLORS.memento[700] }}>
                    {type}{breed ? ` · ${breed}` : ""}
                </Text>
                {dateLabel ? (
                    <Text style={{ fontSize: 13, color: isMemorial ? COLORS.memorial[600] : COLORS.memento[700], marginTop: 4 }}>
                        {dateLabel}
                    </Text>
                ) : null}
                <TouchableOpacity
                    onPress={onRegister}
                    style={{
                        flexDirection: "row", alignItems: "center", gap: 4, marginTop: 10,
                        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1,
                        borderColor: isMemorial ? COLORS.memorial[400] : COLORS.memento[500],
                    }}
                    activeOpacity={0.85}
                >
                    <Ionicons name="image-outline" size={14} color={isMemorial ? COLORS.memorial[600] : COLORS.memento[600]} />
                    <Text style={{ fontSize: 13, color: isMemorial ? COLORS.memorial[600] : COLORS.memento[600] }}>사진 등록하기</Text>
                </TouchableOpacity>
            </LinearGradient>
        </View>
    );
}

// 웹 ChatMessageList 1:1 — 스트리밍 중 텍스트 끝 깜빡이는 2px 커서.
// 색: 일상 #0EA5E9 / 추모 #D97706 (웹과 동일).
function StreamingCursor({ memorial }: { memorial: boolean }) {
    const op = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(op, { toValue: 0.15, duration: 500, useNativeDriver: true }),
                Animated.timing(op, { toValue: 1, duration: 500, useNativeDriver: true }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [op]);
    return (
        <Animated.Text style={{ opacity: op, color: memorial ? "#D97706" : "#0EA5E9", fontWeight: "700" }}>
            {" "}▌
        </Animated.Text>
    );
}

function MessageRenderer({
    message, pet, accentColor, onRetry, onReminderAccept, onReminderDismiss, prevTimestamp, isFirst,
}: {
    message: ChatMessage;
    pet: NonNullable<ReturnType<typeof usePet>["selectedPet"]>;
    accentColor: string;
    onRetry: (id: string, retryMessage: string) => void;
    onReminderAccept?: (id: string) => void;
    onReminderDismiss?: (id: string) => void;
    prevTimestamp?: Date;
    isFirst?: boolean;
}) {
    const { isDarkMode } = useDarkMode();
    const { fontScale } = useSimpleMode();

    // 메시지 시간 갭 분리선 (5분+ 간격이거나 첫 메시지면 시각 표시)
    const showTimestamp = isFirst || (prevTimestamp && hasTimeGap(prevTimestamp, message.timestamp));
    const timestampNode = showTimestamp ? (
        <View style={{ alignItems: "center", marginVertical: 8 }}>
            <Text style={{
                fontSize: 11,
                color: isDarkMode ? COLORS.gray[500] : COLORS.gray[400],
                fontWeight: "500",
            }}>
                {formatTimestamp(message.timestamp)}
            </Text>
        </View>
    ) : null;

    if (message.role === "system") {
        return (
            <>
                {timestampNode}
                <SystemMessage
                    message={message}
                    accentColor={accentColor}
                    isMemorial={pet.status === "memorial"}
                    onRetry={onRetry}
                    onReminderAccept={onReminderAccept}
                    onReminderDismiss={onReminderDismiss}
                />
            </>
        );
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
        // 웹 패리티: 일상 memento-600→500, 추모 memorial-500→orange-500
        const userGradient: [string, string] = pet.status === "memorial"
            ? [COLORS.memorial[500], "#F97316"]
            : [COLORS.memento[600], COLORS.memento[500]];
        return (
            <>
                {timestampNode}
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
                        <Text style={{ color: "#fff", fontSize: 15 * fontScale, lineHeight: 24 * fontScale }}>{message.content}</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
            </>
        );
    }

    // 펫 버블 — 웹 패리티: 일상=흰 카드+memento-200 테두리, 추모=memorial-100+memorial-200 테두리
    const isMemorial = pet.status === "memorial";
    const petBubbleBg = isDarkMode
        ? COLORS.gray[800]
        : (isMemorial ? COLORS.memorial[100] : "#FFFFFF");
    const petBubbleBorder = isDarkMode
        ? COLORS.gray[700]
        : (isMemorial ? COLORS.memorial[200] : COLORS.memento[200]);
    const avatarRing = isMemorial ? COLORS.memorial[200] : COLORS.memento[200];
    // 감정 라벨(외로움/슬픔/불안 등)은 사용자 명시 요청으로 화면에 표시 안 함.
    // 백엔드 emotion 분석은 그대로 사용 (서버 텔레그램 모니터링/위기 감지용).

    return (
        <>
        {timestampNode}
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 12 }}>
            {/* 감정 글로우 — 펫 응답 감정에 따라 아바타에 색 후광 (웹 EMOTION_GLOW 패리티) */}
            <View style={[
                styles.bubbleAvatar,
                { backgroundColor: isMemorial ? COLORS.memorial[100] : COLORS.memento[100], marginBottom: 4, borderWidth: 2, borderColor: avatarRing },
                message.emotion && EMOTION_MAP[message.emotion] ? {
                    shadowColor: EMOTION_MAP[message.emotion].color,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: EMOTION_MAP[message.emotion].glow,
                    shadowRadius: 7,
                    elevation: 6,
                } : null,
            ]}>
                {pet.profileImage ? (
                    <Image source={{ uri: pet.profileImage }} style={styles.bubbleAvatar} />
                ) : (
                    <Ionicons name="paw" size={16} color={isMemorial ? COLORS.memorial[500] : COLORS.memento[600]} />
                )}
            </View>
            <View style={{ maxWidth: "80%" }}>
                <TouchableOpacity
                    onLongPress={shareContent}
                    delayLongPress={400}
                    activeOpacity={0.85}
                    style={[styles.bubblePet, styles.bubblePetShadow, { backgroundColor: petBubbleBg, borderWidth: 1, borderColor: petBubbleBorder }]}
                >
                    <Text
                        style={{
                            fontSize: 15 * fontScale, lineHeight: 24 * fontScale,
                            // 웹 1:1 — 펫 버블 텍스트는 모드색 짙은 톤(gray 아님)
                            color: isDarkMode
                                ? COLORS.white
                                : (isMemorial ? COLORS.memorial[900] : COLORS.memento[900]),
                        }}
                    >
                        {message.content}
                        {message.isStreaming ? <StreamingCursor memorial={isMemorial} /> : null}
                    </Text>
                </TouchableOpacity>
                {message.matchedPhoto?.url && (
                    <View style={{ marginTop: 8, borderRadius: 12, overflow: "hidden", width: 192 }}>
                        <Image
                            source={{ uri: message.matchedPhoto.url }}
                            style={{ width: 192, height: 128 }}
                            resizeMode="cover"
                        />
                        {message.matchedPhoto.caption ? (
                            <View style={{
                                flexDirection: "row", alignItems: "center", gap: 4,
                                paddingHorizontal: 8, paddingVertical: 6,
                                // 웹 1:1: 일상 memento-200 / 추모 memorial-50 불투명 (반투명 X)
                                backgroundColor: isDarkMode
                                    ? COLORS.gray[700]
                                    : (isMemorial ? COLORS.memorial[50] : COLORS.memento[200]),
                            }}>
                                <Ionicons name="heart" size={11} color={isMemorial ? COLORS.memorial[600] : COLORS.memento[600]} />
                                <Text numberOfLines={1} style={{
                                    flex: 1, fontSize: 11,
                                    color: isDarkMode ? COLORS.gray[200] : COLORS.gray[700],
                                }}>
                                    {message.matchedPhoto.caption}
                                </Text>
                            </View>
                        ) : null}
                    </View>
                )}
                {/* 타임라인 연동 카드 (사진 없을 때만) — 웹 패리티: "우리의 기록" USP */}
                {message.matchedTimeline && !message.matchedPhoto && (
                    <View style={{
                        marginTop: 8, borderRadius: 12, borderWidth: 1, padding: 10,
                        // 웹 1:1: 고정폭 제거 → 버블폭 추종. 테두리/배경 모드색
                        alignSelf: "stretch",
                        borderColor: isDarkMode
                            ? COLORS.gray[700]
                            : (isMemorial ? COLORS.memorial[200] : COLORS.memento[200]),
                        backgroundColor: isDarkMode
                            ? COLORS.gray[800]
                            : (isMemorial ? COLORS.memorial[50] : COLORS.memento[100]),
                    }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Ionicons name="book-outline" size={13} color={accentColor} />
                            <Text style={{ fontSize: 11, fontWeight: "600", color: accentColor }}>우리의 기록</Text>
                            <Text style={{ marginLeft: "auto", fontSize: 10, color: isDarkMode ? COLORS.gray[500] : COLORS.gray[400] }}>
                                {message.matchedTimeline.date}
                            </Text>
                        </View>
                        <Text style={{
                            fontSize: 13, fontWeight: "600", marginTop: 4,
                            color: isDarkMode ? COLORS.white : COLORS.gray[800],
                        }}>
                            {message.matchedTimeline.title}
                        </Text>
                        {message.matchedTimeline.content ? (
                            <Text numberOfLines={2} style={{
                                fontSize: 11, marginTop: 2,
                                color: isDarkMode ? COLORS.gray[400] : COLORS.gray[500],
                            }}>
                                {message.matchedTimeline.content}
                            </Text>
                        ) : null}
                    </View>
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
        </>
    );
}

function SystemMessage({
    message, accentColor, isMemorial = false, onRetry, onReminderAccept, onReminderDismiss,
}: {
    message: ChatMessage;
    accentColor: string;
    isMemorial?: boolean;
    onRetry: (id: string, retryMessage: string) => void;
    onReminderAccept?: (id: string) => void;
    onReminderDismiss?: (id: string) => void;
}) {
    const { isDarkMode } = useDarkMode();

    if (message.isError) {
        // 웹 1:1: 빨강 고정이 아니라 모드색 배경 + 모드 텍스트 + pill 버튼
        const errBg = isMemorial ? COLORS.memorial[50] : COLORS.memento[200];
        const errText = isMemorial ? COLORS.memorial[700] : COLORS.memento[700];
        return (
            <View style={{
                alignSelf: "center",
                marginBottom: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                backgroundColor: isDarkMode ? COLORS.gray[800] : errBg,
                borderRadius: 12,
                maxWidth: "90%",
            }}>
                <Text style={{ color: isDarkMode ? COLORS.gray[200] : errText, fontSize: 13, lineHeight: 18, textAlign: "center" }}>{message.content}</Text>
                {message.retryMessage && (
                    <TouchableOpacity
                        onPress={() => onRetry(message.id, message.retryMessage!)}
                        style={{
                            alignSelf: "center",
                            marginTop: 8,
                            paddingHorizontal: 16,
                            paddingVertical: 6,
                            backgroundColor: isMemorial ? COLORS.memorial[500] : COLORS.memento[500],
                            borderRadius: 9999,
                        }}
                    >
                        <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>다시 시도</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    }

    // 위기 알림은 유저 UI에서 표시하지 않음. 옛날 데이터/잔존 메시지 안전 가드.
    if (message.type === "crisis-alert") {
        return null;
    }

    if (message.type === "reminder-suggestion") {
        return (
            <View style={{
                alignSelf: "center",
                marginBottom: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                backgroundColor: isDarkMode ? COLORS.gray[800] : accentColor + "15",
                borderRadius: 16,
                maxWidth: "92%",
                borderWidth: 1,
                borderColor: isDarkMode ? COLORS.gray[700] : accentColor + "33",
            }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <Ionicons name="notifications-outline" size={16} color={accentColor} />
                    <Text style={{ fontSize: 13, fontWeight: "700", color: accentColor }}>케어 리마인더</Text>
                </View>
                <Text style={{
                    color: isDarkMode ? COLORS.gray[200] : COLORS.gray[700],
                    fontSize: 13,
                    lineHeight: 19,
                    marginBottom: 12,
                }}>
                    {message.content}
                </Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                        onPress={() => onReminderAccept?.(message.id)}
                        activeOpacity={0.85}
                        style={{
                            flex: 1, paddingVertical: 10, borderRadius: 10,
                            backgroundColor: accentColor, alignItems: "center",
                        }}
                    >
                        <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>알려주세요</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => onReminderDismiss?.(message.id)}
                        activeOpacity={0.85}
                        style={{
                            flex: 1, paddingVertical: 10, borderRadius: 10,
                            backgroundColor: isDarkMode ? COLORS.gray[700] : "#fff",
                            borderWidth: 1, borderColor: isDarkMode ? COLORS.gray[600] : accentColor + "40",
                            alignItems: "center",
                        }}
                    >
                        <Text style={{
                            color: isDarkMode ? COLORS.gray[200] : accentColor,
                            fontSize: 13, fontWeight: "600",
                        }}>괜찮아요</Text>
                    </TouchableOpacity>
                </View>
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

// 웹 ChatInputArea 추천칩 1:1: 입력영역 위 flex-wrap pill(채운 배경)
// + Sparkles 아이콘 + 줄바꿈(가로스크롤 아님). 색은 모드별 memento/memorial.
function ScrollableSuggestions({
    suggestions, isMemorialMode, onSelect,
}: {
    suggestions: string[];
    isMemorialMode: boolean;
    onSelect: (s: string) => void;
}) {
    const { fontScale, spacingScale } = useSimpleMode();
    const chipBg = isMemorialMode ? COLORS.memorial[100] : COLORS.memento[100];
    const chipBorder = isMemorialMode ? COLORS.memorial[200] : COLORS.memento[200];
    // 웹 ChatInputArea 1:1 — 추모 글자색 memorial-700 (#B45309), 일상 memento-600
    const chipText = isMemorialMode ? COLORS.memorial[700] : COLORS.memento[600];
    return (
        <View style={{
            flexDirection: "row", flexWrap: "wrap",
            // 웹 gap-x-2 gap-y-2.5 / mb-3
            columnGap: 8 * spacingScale, rowGap: 10 * spacingScale,
            paddingHorizontal: 16 * spacingScale, paddingBottom: 12 * spacingScale,
        }}>
            {suggestions.map((item, idx) => (
                <SuggestionChip
                    key={idx + "_" + item}
                    item={item}
                    idx={idx}
                    fontScale={fontScale}
                    spacingScale={spacingScale}
                    chipBg={chipBg}
                    chipBorder={chipBorder}
                    chipText={chipText}
                    onSelect={onSelect}
                />
            ))}
        </View>
    );
}

// 웹 chip-enter 1:1 — idx*80ms stagger fade-in + shadow-sm
function SuggestionChip({
    item, idx, fontScale, spacingScale, chipBg, chipBorder, chipText, onSelect,
}: {
    item: string; idx: number; fontScale: number; spacingScale: number;
    chipBg: string; chipBorder: string; chipText: string; onSelect: (s: string) => void;
}) {
    const enter = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const a = Animated.timing(enter, {
            toValue: 1, duration: 220, delay: idx * 80, useNativeDriver: true,
        });
        a.start();
        return () => a.stop();
    }, [enter, idx]);
    return (
        <Animated.View style={{
            opacity: enter,
            transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
        }}>
            <TouchableOpacity
                onPress={() => onSelect(item)}
                style={{
                    flexDirection: "row", alignItems: "center", gap: 8,
                    paddingHorizontal: 16 * spacingScale,
                    paddingVertical: 10 * spacingScale,
                    minHeight: 44,
                    borderRadius: 9999,
                    backgroundColor: chipBg,
                    borderWidth: 1,
                    borderColor: chipBorder,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.06,
                    shadowRadius: 2,
                    elevation: 1,
                }}
                activeOpacity={0.8}
            >
                <Ionicons name="sparkles" size={14 * fontScale} color={chipText} />
                <Text style={{ fontSize: 14 * fontScale, fontWeight: "500", color: chipText }}>{item}</Text>
            </TouchableOpacity>
        </Animated.View>
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
        width: 36, height: 36, borderRadius: 18,
        alignItems: "center", justifyContent: "center",
    },
    bubbleUser: {
        maxWidth: "100%",
        paddingHorizontal: 16, paddingVertical: 12,
        borderRadius: 16, borderBottomRightRadius: 2,
    },
    bubbleUserShadow: {
        maxWidth: "80%",
        borderRadius: 18,
        // 웹 shadow-md 1:1 근사
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
    },
    bubblePet: {
        paddingHorizontal: 16, paddingVertical: 12,
        borderRadius: 16, borderTopLeftRadius: 2,
    },
    bubblePetShadow: {
        // 웹 shadow-md 1:1 근사 (기존 0.06/r4는 너무 옅어 평평해 보였음)
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
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
