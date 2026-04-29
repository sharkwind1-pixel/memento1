/**
 * AI 펫톡 탭 — 웹 API 재사용 (mementoani.com/api/chat)
 */

import { useState, useRef, useEffect } from "react";
import {
    View, Text, TextInput, TouchableOpacity,
    FlatList, KeyboardAvoidingView, Platform,
    ActivityIndicator, Image, StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { ChatMessage } from "@/types";
import { API_BASE_URL } from "@/config/constants";
import { COLORS } from "@/lib/theme";
import AppHeader from "@/components/common/AppHeader";
import AppDrawer from "@/components/common/AppDrawer";
import PetSwitcher from "@/components/common/PetSwitcher";
import RemindersModal from "@/components/chat/RemindersModal";

export default function AiChatScreen() {
    const router = useRouter();
    const { session } = useAuth();
    const { selectedPet, isMemorialMode } = usePet();
    const insets = useSafeAreaInsets();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [remindersOpen, setRemindersOpen] = useState(false);
    const [usage, setUsage] = useState<{ used: number; limit: number; remaining: number } | null>(null);
    const flatListRef = useRef<FlatList<ChatMessage>>(null);

    const accentColor = isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500];

    useEffect(() => {
        if (selectedPet) {
            setMessages([{
                id: "welcome",
                role: "pet",
                content: `안녕! 나 ${selectedPet.name}이야. 오늘은 어떤 이야기 해볼까?`,
                timestamp: new Date(),
            }]);
        }
    }, [selectedPet?.id]);

    async function loadUsage() {
        if (!session) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/chat/usage`, {
                headers: { "Authorization": `Bearer ${session.access_token}` },
            });
            if (!res.ok) return;
            const data = await res.json();
            setUsage({
                used: data.used ?? 0,
                limit: data.limit ?? 0,
                remaining: data.remaining ?? 0,
            });
        } catch {
            // silent
        }
    }

    useEffect(() => {
        loadUsage();
    }, [session?.access_token]);

    async function sendMessage() {
        if (!input.trim() || isLoading || !selectedPet || !session) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: "user",
            content: input.trim(),
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setSuggestions([]);
        setIsLoading(true);

        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            const res = await fetch(`${API_BASE_URL}/api/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    message: userMessage.content,
                    petId: selectedPet.id,
                    chatHistory: messages.slice(-10).map((m) => ({
                        role: m.role === "pet" ? "assistant" : m.role,
                        content: m.content,
                    })),
                }),
            });

            if (!res.ok) throw new Error(`API error ${res.status}`);

            // /api/chat은 SSE (text/event-stream) 응답. 전체 텍스트 받아서 마지막 done 이벤트 추출.
            const text = await res.text();
            const lines = text.split("\n").filter((l) => l.startsWith("data:"));
            let reply = "...";
            let suggestionsList: string[] = [];
            let emotion: string | undefined;
            let matchedPhoto: string | undefined;
            let remaining: number | undefined;
            let limit: number | undefined;

            for (const line of lines) {
                try {
                    const obj = JSON.parse(line.slice(5).trim());
                    if (obj.type === "done") {
                        if (typeof obj.reply === "string") reply = obj.reply;
                        if (Array.isArray(obj.suggestedQuestions)) suggestionsList = obj.suggestedQuestions;
                        if (typeof obj.emotion === "string") emotion = obj.emotion;
                        if (typeof obj.matchedPhoto === "string") matchedPhoto = obj.matchedPhoto;
                        if (typeof obj.remaining === "number") remaining = obj.remaining;
                        if (typeof obj.limit === "number") limit = obj.limit;
                    }
                } catch {
                    // skip non-JSON lines
                }
            }

            const petMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: "pet",
                content: reply,
                timestamp: new Date(),
                emotion,
                matchedPhoto,
            };

            setMessages((prev) => [...prev, petMessage]);
            if (suggestionsList.length) setSuggestions(suggestionsList);
            // 사용량 갱신
            if (typeof remaining === "number" && typeof limit === "number") {
                setUsage({
                    used: limit - remaining,
                    limit,
                    remaining,
                });
            } else {
                loadUsage();
            }
        } catch {
            setMessages((prev) => [
                ...prev,
                {
                    id: (Date.now() + 1).toString(),
                    role: "pet",
                    content: "잠시 연결이 불안정해요. 조금 뒤 다시 시도해주세요.",
                    timestamp: new Date(),
                    isError: true,
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
    }, [messages]);

    const bgColor = isMemorialMode ? COLORS.gray[950] : COLORS.white;
    const borderColor = isMemorialMode ? COLORS.gray[800] : COLORS.gray[100];

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
                        <Text style={{
                            fontSize: 16,
                            fontWeight: "600",
                            color: isMemorialMode ? COLORS.white : COLORS.gray[900],
                        }}>
                            {selectedPet.name}
                        </Text>
                        <Text style={{ fontSize: 12, color: isMemorialMode ? COLORS.gray[400] : COLORS.gray[500] }}>
                            AI 펫톡
                        </Text>
                    </View>
                    {usage ? (
                        <View style={[
                            styles.usageBadge,
                            {
                                backgroundColor: usage.remaining === 0
                                    ? "#FEE2E2"
                                    : (isMemorialMode ? COLORS.gray[800] : accentColor + "1a"),
                            },
                        ]}>
                            <Ionicons
                                name="chatbubble-ellipses-outline"
                                size={12}
                                color={usage.remaining === 0 ? "#B91C1C" : accentColor}
                            />
                            <Text style={[
                                styles.usageText,
                                { color: usage.remaining === 0 ? "#B91C1C" : (isMemorialMode ? COLORS.white : accentColor) },
                            ]}>
                                {usage.limit === Infinity || usage.limit > 9999
                                    ? "무제한"
                                    : `${usage.used}/${usage.limit}`}
                            </Text>
                        </View>
                    ) : null}
                    <TouchableOpacity
                        onPress={() => setRemindersOpen(true)}
                        style={[styles.headerIconBtn, { backgroundColor: isMemorialMode ? COLORS.gray[800] : COLORS.gray[100] }]}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="alarm-outline" size={18} color={isMemorialMode ? COLORS.white : COLORS.gray[700]} />
                    </TouchableOpacity>
                </View>

                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    style={styles.messages}
                    contentContainerStyle={{ paddingTop: 16, paddingBottom: 8, paddingHorizontal: 16 }}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <MessageBubble
                            message={item}
                            pet={selectedPet}
                            isMemorialMode={isMemorialMode}
                            accentColor={accentColor}
                        />
                    )}
                    ListFooterComponent={
                        isLoading ? (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                                <View style={[styles.bubbleAvatar, { backgroundColor: accentColor + "20" }]}>
                                    <Text style={{ fontSize: 12 }}>
                                        {selectedPet.type === "강아지" ? "🐶" : "🐱"}
                                    </Text>
                                </View>
                                <View
                                    style={[
                                        styles.bubblePet,
                                        { backgroundColor: isMemorialMode ? COLORS.gray[800] : COLORS.gray[100] },
                                    ]}
                                >
                                    <ActivityIndicator size="small" color={accentColor} />
                                </View>
                            </View>
                        ) : null
                    }
                />

                {suggestions.length > 0 && (
                    <ScrollableSuggestions
                        suggestions={suggestions}
                        accentColor={accentColor}
                        onSelect={(s) => { setInput(s); setSuggestions([]); }}
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
                                backgroundColor: isMemorialMode ? COLORS.gray[800] : COLORS.gray[100],
                                color: isMemorialMode ? COLORS.white : COLORS.gray[900],
                            },
                        ]}
                        placeholder="메시지 입력..."
                        placeholderTextColor={isMemorialMode ? COLORS.gray[500] : COLORS.gray[400]}
                        value={input}
                        onChangeText={setInput}
                        multiline
                        returnKeyType="send"
                        onSubmitEditing={sendMessage}
                    />
                    <TouchableOpacity
                        onPress={sendMessage}
                        disabled={!input.trim() || isLoading}
                        style={[
                            styles.sendBtn,
                            { backgroundColor: input.trim() && !isLoading ? accentColor : COLORS.gray[200] },
                        ]}
                        activeOpacity={0.85}
                    >
                        <Ionicons
                            name="arrow-up"
                            size={18}
                            color={input.trim() && !isLoading ? "#fff" : COLORS.gray[400]}
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

function MessageBubble({ message, pet, isMemorialMode, accentColor }: {
    message: ChatMessage;
    pet: NonNullable<ReturnType<typeof usePet>["selectedPet"]>;
    isMemorialMode: boolean;
    accentColor: string;
}) {
    const isUser = message.role === "user";

    if (isUser) {
        return (
            <View style={{ flexDirection: "row", justifyContent: "flex-end", marginBottom: 12 }}>
                <View style={[styles.bubbleUser, { backgroundColor: accentColor }]}>
                    <Text style={{ color: "#fff", fontSize: 14, lineHeight: 20 }}>{message.content}</Text>
                </View>
            </View>
        );
    }

    const errorBg = "#FEE2E2";
    const petBubbleBg = message.isError ? errorBg : isMemorialMode ? COLORS.gray[800] : COLORS.gray[100];

    const emotionMap: Record<string, { label: string; color: string }> = {
        happy: { label: "기쁨", color: "#FBBF24" },
        sad: { label: "슬픔", color: "#60A5FA" },
        anxious: { label: "불안", color: "#A78BFA" },
        angry: { label: "화남", color: "#EF4444" },
        grateful: { label: "고마움", color: "#F472B6" },
        lonely: { label: "외로움", color: "#94A3B8" },
        peaceful: { label: "평온", color: "#34D399" },
        excited: { label: "신남", color: "#FB923C" },
    };
    const emotionInfo = message.emotion ? emotionMap[message.emotion] : null;

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
                <View style={[styles.bubblePet, { backgroundColor: petBubbleBg }]}>
                    <Text
                        style={{
                            fontSize: 14,
                            lineHeight: 20,
                            color: message.isError
                                ? "#DC2626"
                                : isMemorialMode ? COLORS.white : COLORS.gray[800],
                        }}
                    >
                        {message.content}
                    </Text>
                </View>
                {message.matchedPhoto && typeof message.matchedPhoto.url === "string" && (
                    <Image
                        source={{ uri: message.matchedPhoto.url }}
                        style={{ width: 192, height: 128, borderRadius: 12, marginTop: 8 }}
                        resizeMode="cover"
                    />
                )}
            </View>
        </View>
    );
}

function ScrollableSuggestions({ suggestions, accentColor, onSelect }: {
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
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
        gap: 4,
    },
    emptyIconWrap: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    emptyTitle: { fontSize: 17, fontWeight: "700", color: COLORS.gray[800], marginBottom: 4 },
    emptyText: { fontSize: 14, color: COLORS.gray[500], textAlign: "center", lineHeight: 20 },
    emptyCta: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 16,
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 12,
    },
    emptyCtaText: { color: "#fff", fontSize: 14, fontWeight: "700" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        gap: 8,
    },
    headerAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 12 },
    headerAvatarFallback: { alignItems: "center", justifyContent: "center" },
    usageBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
    },
    usageText: { fontSize: 11, fontWeight: "700" },
    headerIconBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: "center",
        justifyContent: "center",
    },
    messages: { flex: 1 },
    bubbleAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    bubbleUser: {
        maxWidth: "80%",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        borderBottomRightRadius: 4,
    },
    bubblePet: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        borderTopLeftRadius: 4,
    },
    inputRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
    },
    textInput: {
        flex: 1,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        maxHeight: 112,
    },
    sendBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
});
