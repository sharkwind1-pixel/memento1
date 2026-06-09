/**
 * GuestChatExperience (mobile) — 비로그인 AI 펫톡 맛보기 체험.
 * 웹 src/components/features/chat/GuestChatExperience.tsx 패리티 (펫홈 Phase 0 ③).
 *
 * 데모펫(초코)과 기본 3회 대화 → 가입 전환. 경량 경로 /api/chat/guest 호출(인증·DB 없음).
 * RN fetch 스트리밍 미지원 환경 대비: 응답 전체 텍스트를 받아 SSE 파싱(타이핑 인디케이터로 대기 표시).
 * 횟수는 AsyncStorage(UX) + 서버 가드(IP/분·전역캡·VPN)로 비용 방어.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "@/config/constants";
import { COLORS } from "@/lib/theme";

const TRIAL_LIMIT = 3;
const TRIALS_KEY = "guestChatTrials";
const DEMO_PET_NAME = "초코";
const MESSAGE_MAX = 200;

interface GuestMessage {
    id: string;
    role: "user" | "pet";
    content: string;
}

let seq = 0;
const nextId = () => `g${Date.now()}_${seq++}`;

function parseSSE(text: string): { reply: string; suggestions: string[] } {
    let reply = "";
    let deltas = "";
    let suggestions: string[] = [];
    for (const block of text.split("\n\n")) {
        const line = block.trim();
        if (!line.startsWith("data: ")) continue;
        try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "delta" && typeof event.content === "string") deltas += event.content;
            else if (event.type === "done") {
                if (typeof event.reply === "string") reply = event.reply;
                if (Array.isArray(event.suggestedQuestions)) suggestions = event.suggestedQuestions;
            }
        } catch {
            // 개별 이벤트 파싱 실패 무시
        }
    }
    return { reply: reply || deltas, suggestions };
}

export default function GuestChatExperience() {
    const router = useRouter();
    const [messages, setMessages] = useState<GuestMessage[]>([
        { id: nextId(), role: "pet", content: `안녕! 나는 ${DEMO_PET_NAME}야. 오늘 뭐 하고 지냈어? 나랑 얘기해보자!` },
    ]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [trialsUsed, setTrialsUsed] = useState(0);
    const [suggestions, setSuggestions] = useState<string[]>([
        "오늘 산책 갔어?", "뭐 하고 놀까?", "간식 뭐 먹었어?",
    ]);
    const scrollRef = useRef<ScrollView>(null);

    useEffect(() => {
        AsyncStorage.getItem(TRIALS_KEY).then((v) => {
            const n = parseInt(v || "0", 10);
            setTrialsUsed(Number.isFinite(n) ? n : 0);
        });
    }, []);

    const exhausted = trialsUsed >= TRIAL_LIMIT;
    const remaining = Math.max(0, TRIAL_LIMIT - trialsUsed);

    const goSignup = useCallback(() => router.push("/(auth)/login"), [router]);

    const send = useCallback(async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || sending) return;
        if (trialsUsed >= TRIAL_LIMIT) { goSignup(); return; }

        setInput("");
        setSuggestions([]);
        setSending(true);
        const petId = nextId();
        setMessages((prev) => [
            ...prev,
            { id: nextId(), role: "user", content: trimmed },
            { id: petId, role: "pet", content: "" },
        ]);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

        try {
            const res = await fetch(`${API_BASE_URL}/api/chat/guest`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
                body: JSON.stringify({ message: trimmed, trialCount: trialsUsed, petName: DEMO_PET_NAME }),
            });

            if (res.status === 403) {
                setTrialsUsed(TRIAL_LIMIT);
                await AsyncStorage.setItem(TRIALS_KEY, String(TRIAL_LIMIT));
                setMessages((prev) => prev.filter((m) => m.id !== petId));
                return;
            }
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const body = await res.text();
            const { reply, suggestions: next } = parseSSE(body);

            setMessages((prev) => prev.map((m) => (m.id === petId
                ? { ...m, content: reply || "앗, 지금은 대답하기 어려워. 잠시 후 다시 말 걸어줄래?" }
                : m)));

            const used = trialsUsed + 1;
            setTrialsUsed(used);
            await AsyncStorage.setItem(TRIALS_KEY, String(used));
            if (used < TRIAL_LIMIT && next.length > 0) setSuggestions(next);
        } catch {
            setMessages((prev) => prev.map((m) => (m.id === petId
                ? { ...m, content: "앗, 지금은 대답하기 어려워. 잠시 후 다시 말 걸어줄래?" }
                : m)));
        } finally {
            setSending(false);
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
        }
    }, [sending, trialsUsed, goSignup]);

    return (
        <SafeAreaView style={styles.flex1} edges={["top"]}>
            <View style={styles.header}>
                <View style={styles.headerIcon}>
                    <Ionicons name="sparkles" size={20} color="#8B5CF6" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>{DEMO_PET_NAME}와 미리 대화해보기</Text>
                    <Text style={styles.headerSub}>
                        {exhausted ? "체험을 모두 사용했어요" : `무료 체험 ${remaining}회 남음`}
                    </Text>
                </View>
            </View>

            <KeyboardAvoidingView
                style={styles.flex1}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <ScrollView ref={scrollRef} style={styles.flex1} contentContainerStyle={styles.messages}>
                    {messages.map((m) => (
                        <View key={m.id} style={[styles.row, m.role === "user" ? styles.rowRight : styles.rowLeft]}>
                            <View style={[styles.bubble, m.role === "user" ? styles.bubbleUser : styles.bubblePet]}>
                                {m.content ? (
                                    <Text style={m.role === "user" ? styles.textUser : styles.textPet}>{m.content}</Text>
                                ) : (
                                    <ActivityIndicator size="small" color={COLORS.memento[400]} />
                                )}
                            </View>
                        </View>
                    ))}
                </ScrollView>

                {!exhausted && suggestions.length > 0 && (
                    <View style={styles.suggestRow}>
                        {suggestions.map((s, i) => (
                            <TouchableOpacity key={i} style={styles.suggestChip} onPress={() => send(s)} disabled={sending} activeOpacity={0.8}>
                                <Text style={styles.suggestText}>{s}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {exhausted ? (
                    <View style={styles.ctaBox}>
                        <Text style={styles.ctaText}>
                            우리 아이만의 성격과 추억을 담아{"\n"}매일 대화하려면 무료로 시작하세요.
                        </Text>
                        <TouchableOpacity style={styles.ctaBtn} onPress={goSignup} activeOpacity={0.85}>
                            <Text style={styles.ctaBtnText}>무료로 시작하기</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.input}
                            value={input}
                            onChangeText={setInput}
                            placeholder={`${DEMO_PET_NAME}에게 말을 걸어보세요`}
                            placeholderTextColor={COLORS.gray[400]}
                            maxLength={MESSAGE_MAX}
                            editable={!sending}
                            onSubmitEditing={() => send(input)}
                            returnKeyType="send"
                        />
                        <TouchableOpacity
                            style={[styles.sendBtn, (sending || !input.trim()) && { opacity: 0.5 }]}
                            onPress={() => send(input)}
                            disabled={sending || !input.trim()}
                            activeOpacity={0.85}
                        >
                            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="arrow-up" size={20} color="#fff" />}
                        </TouchableOpacity>
                    </View>
                )}

                <TouchableOpacity onPress={goSignup} style={styles.loginLink} activeOpacity={0.7}>
                    <Text style={styles.loginLinkText}>이미 계정이 있어요</Text>
                </TouchableOpacity>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1, backgroundColor: COLORS.memento[50] },
    header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
    headerIcon: {
        width: 44, height: 44, borderRadius: 22, backgroundColor: "#EDE9FE",
        alignItems: "center", justifyContent: "center",
    },
    headerTitle: { fontSize: 16, fontWeight: "700", color: COLORS.memento[900] },
    headerSub: { fontSize: 12, color: COLORS.memento[500], marginTop: 1 },
    messages: { padding: 16, gap: 10 },
    row: { flexDirection: "row" },
    rowLeft: { justifyContent: "flex-start" },
    rowRight: { justifyContent: "flex-end" },
    bubble: { maxWidth: "82%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
    bubbleUser: { backgroundColor: COLORS.memento[500], borderBottomRightRadius: 6 },
    bubblePet: { backgroundColor: "#FFFFFF", borderBottomLeftRadius: 6 },
    textUser: { color: "#fff", fontSize: 14, lineHeight: 20 },
    textPet: { color: COLORS.memento[900], fontSize: 14, lineHeight: 20 },
    suggestRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, marginBottom: 8 },
    suggestChip: {
        paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
        backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: COLORS.memento[200],
    },
    suggestText: { fontSize: 12, color: COLORS.memento[700] },
    inputRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
    input: {
        flex: 1, height: 46, paddingHorizontal: 16, borderRadius: 23,
        backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: COLORS.memento[200],
        fontSize: 14, color: COLORS.memento[900],
    },
    sendBtn: {
        width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.memento[500],
        alignItems: "center", justifyContent: "center",
    },
    ctaBox: {
        margin: 16, padding: 16, borderRadius: 18, backgroundColor: "#FFFFFF", alignItems: "center", gap: 12,
    },
    ctaText: { fontSize: 13, color: COLORS.memento[700], textAlign: "center", lineHeight: 20 },
    ctaBtn: {
        width: "100%", paddingVertical: 13, borderRadius: 12, backgroundColor: COLORS.memento[500], alignItems: "center",
    },
    ctaBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
    loginLink: { alignItems: "center", paddingVertical: 10 },
    loginLinkText: { fontSize: 12, color: COLORS.memento[400] },
});
