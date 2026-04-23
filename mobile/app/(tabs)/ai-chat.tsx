/**
 * AI 펫톡 탭 — 웹 API 재사용 (mementoani.com/api/chat)
 */

import { useState, useRef, useEffect } from "react";
import {
    View, Text, TextInput, TouchableOpacity,
    FlatList, KeyboardAvoidingView, Platform,
    ActivityIndicator, Image, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { ChatMessage } from "@/types";
import { API_BASE_URL } from "@/config/constants";
import { supabase } from "@/lib/supabase";

export default function AiChatScreen() {
    const { user, session } = useAuth();
    const { selectedPet, isMemorialMode } = usePet();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const flatListRef = useRef<FlatList>(null);

    const accentColor = isMemorialMode ? "#F59E0B" : "#05B2DC";

    useEffect(() => {
        // 초기 인사 메시지
        if (selectedPet) {
            setMessages([{
                id: "welcome",
                role: "pet",
                content: `안녕! 나 ${selectedPet.name}이야. 오늘은 어떤 이야기 해볼까?`,
                timestamp: new Date(),
            }]);
        }
    }, [selectedPet?.id]);

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

            if (!res.ok) {
                throw new Error(`API error ${res.status}`);
            }

            const data = await res.json();

            const petMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: "pet",
                content: data.message ?? data.content ?? "...",
                timestamp: new Date(),
                emotion: data.emotion,
                matchedPhoto: data.matchedPhoto,
            };

            setMessages((prev) => [...prev, petMessage]);
            if (data.suggestions?.length) setSuggestions(data.suggestions);
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

    if (!selectedPet) {
        return (
            <View className="flex-1 items-center justify-center bg-white px-6">
                <Ionicons name="paw-outline" size={48} color="#D1D5DB" />
                <Text className="text-gray-400 mt-3 text-center">
                    홈에서 반려동물을 선택하면{"\n"}AI 펫톡을 이용할 수 있어요.
                </Text>
            </View>
        );
    }

    return (
        <SafeAreaView
            className={`flex-1 ${isMemorialMode ? "bg-gray-950" : "bg-white"}`}
            edges={["top"]}
        >
            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={0}
            >
                {/* 헤더 */}
                <View
                    className="flex-row items-center px-5 py-3 border-b"
                    style={{ borderBottomColor: isMemorialMode ? "#1F2937" : "#F3F4F6" }}
                >
                    {selectedPet.profileImage ? (
                        <Image
                            source={{ uri: selectedPet.profileImage }}
                            className="w-9 h-9 rounded-full mr-3"
                        />
                    ) : (
                        <View
                            className="w-9 h-9 rounded-full mr-3 items-center justify-center"
                            style={{ backgroundColor: accentColor + "20" }}
                        >
                            <Text className="text-base">
                                {selectedPet.type === "강아지" ? "🐶" : "🐱"}
                            </Text>
                        </View>
                    )}
                    <View>
                        <Text
                            className={`text-base font-semibold ${isMemorialMode ? "text-white" : "text-gray-900"}`}
                        >
                            {selectedPet.name}
                        </Text>
                        <Text className={`text-xs ${isMemorialMode ? "text-gray-400" : "text-gray-500"}`}>
                            AI 펫톡
                        </Text>
                    </View>
                </View>

                {/* 메시지 목록 */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    className="flex-1 px-4"
                    contentContainerStyle={{ paddingTop: 16, paddingBottom: 8 }}
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
                            <View className="flex-row items-center gap-2 mb-3">
                                <View
                                    className="w-7 h-7 rounded-full items-center justify-center"
                                    style={{ backgroundColor: accentColor + "20" }}
                                >
                                    <Text className="text-xs">
                                        {selectedPet.type === "강아지" ? "🐶" : "🐱"}
                                    </Text>
                                </View>
                                <View
                                    className="px-4 py-3 rounded-2xl rounded-tl-sm"
                                    style={{ backgroundColor: isMemorialMode ? "#1F2937" : "#F3F4F6" }}
                                >
                                    <ActivityIndicator size="small" color={accentColor} />
                                </View>
                            </View>
                        ) : null
                    }
                />

                {/* 추천 질문 */}
                {suggestions.length > 0 && (
                    <ScrollableSuggestions
                        suggestions={suggestions}
                        accentColor={accentColor}
                        onSelect={(s) => { setInput(s); setSuggestions([]); }}
                    />
                )}

                {/* 입력창 */}
                <View
                    className="flex-row items-end gap-2 px-4 py-3 border-t"
                    style={{ borderTopColor: isMemorialMode ? "#1F2937" : "#F3F4F6" }}
                >
                    <TextInput
                        className={`flex-1 rounded-2xl px-4 py-3 text-sm max-h-28 ${
                            isMemorialMode ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-900"
                        }`}
                        placeholder="메시지 입력..."
                        placeholderTextColor={isMemorialMode ? "#6B7280" : "#9CA3AF"}
                        value={input}
                        onChangeText={setInput}
                        multiline
                        returnKeyType="send"
                        onSubmitEditing={sendMessage}
                    />
                    <TouchableOpacity
                        onPress={sendMessage}
                        disabled={!input.trim() || isLoading}
                        className="w-10 h-10 rounded-full items-center justify-center"
                        style={{
                            backgroundColor: input.trim() && !isLoading ? accentColor : "#E5E7EB",
                        }}
                        activeOpacity={0.85}
                    >
                        <Ionicons
                            name="arrow-up"
                            size={18}
                            color={input.trim() && !isLoading ? "#fff" : "#9CA3AF"}
                        />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// ─── 서브 컴포넌트 ─────────────────────────────────────────

function MessageBubble({ message, pet, isMemorialMode, accentColor }: {
    message: ChatMessage;
    pet: NonNullable<ReturnType<typeof usePet>["selectedPet"]>;
    isMemorialMode: boolean;
    accentColor: string;
}) {
    const isUser = message.role === "user";

    if (isUser) {
        return (
            <View className="flex-row justify-end mb-3">
                <View
                    className="max-w-[80%] px-4 py-3 rounded-2xl rounded-br-sm"
                    style={{ backgroundColor: accentColor }}
                >
                    <Text className="text-white text-sm leading-5">{message.content}</Text>
                </View>
            </View>
        );
    }

    return (
        <View className="flex-row items-end gap-2 mb-3">
            <View
                className="w-7 h-7 rounded-full items-center justify-center mb-1 flex-shrink-0"
                style={{ backgroundColor: accentColor + "20" }}
            >
                {pet.profileImage ? (
                    <Image source={{ uri: pet.profileImage }} className="w-7 h-7 rounded-full" />
                ) : (
                    <Text className="text-xs">{pet.type === "강아지" ? "🐶" : "🐱"}</Text>
                )}
            </View>
            <View className="max-w-[80%]">
                <View
                    className="px-4 py-3 rounded-2xl rounded-tl-sm"
                    style={{
                        backgroundColor: message.isError
                            ? "#FEE2E2"
                            : isMemorialMode ? "#1F2937" : "#F3F4F6",
                    }}
                >
                    <Text
                        className={`text-sm leading-5 ${
                            message.isError ? "text-red-600" :
                            isMemorialMode ? "text-white" : "text-gray-800"
                        }`}
                    >
                        {message.content}
                    </Text>
                </View>
                {message.matchedPhoto && (
                    <Image
                        source={{ uri: message.matchedPhoto.url }}
                        className="w-48 h-32 rounded-xl mt-2"
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
        <View className="px-4 pb-2">
            <FlatList
                data={suggestions}
                horizontal
                keyExtractor={(item) => item}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        onPress={() => onSelect(item)}
                        className="px-3 py-2 rounded-full border"
                        style={{ borderColor: accentColor }}
                        activeOpacity={0.8}
                    >
                        <Text className="text-xs" style={{ color: accentColor }}>{item}</Text>
                    </TouchableOpacity>
                )}
            />
        </View>
    );
}
