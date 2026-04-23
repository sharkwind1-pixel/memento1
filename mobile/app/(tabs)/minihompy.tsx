/**
 * 미니홈피 탭 — 미니미 + 꾸미기 공간
 */

import { useState } from "react";
import {
    View, Text, ScrollView, TouchableOpacity,
    Image, Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function MinihompyScreen() {
    const { profile, points } = useAuth();
    const { selectedPet, isMemorialMode } = usePet();
    const [touchCount, setTouchCount] = useState(0);
    const [message, setMessage] = useState<string | null>(null);
    const [messageTimer, setMessageTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

    const accentColor = isMemorialMode ? "#F59E0B" : "#05B2DC";

    const GREETINGS = [
        "반가워! 오늘도 왔구나!",
        "헤헤, 또 만났네!",
        "오늘 뭐 했어?",
        "나 보고 싶었지?",
        "같이 놀자!",
    ];

    const PLAYFUL = [
        "간지러워~!",
        "야야야 그만 건드려!",
        "흐흐 좋긴 한데...!",
        "기분 좋다!",
    ];

    function handleTouch() {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const newCount = touchCount + 1;
        setTouchCount(newCount);

        const pool = newCount >= 5 ? PLAYFUL : GREETINGS;
        const msg = pool[Math.floor(Math.random() * pool.length)];
        setMessage(msg);

        if (messageTimer) clearTimeout(messageTimer);
        const timer = setTimeout(() => setMessage(null), 2500);
        setMessageTimer(timer);
    }

    return (
        <SafeAreaView
            className={`flex-1 ${isMemorialMode ? "bg-gray-950" : "bg-white"}`}
            edges={["top"]}
        >
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {/* 헤더 */}
                <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
                    <Text className={`text-xl font-bold ${isMemorialMode ? "text-white" : "text-gray-900"}`}>
                        미니홈피
                    </Text>
                    <View className="flex-row items-center gap-1.5 bg-memento-50 rounded-full px-3 py-1.5">
                        <Ionicons name="star" size={13} color="#05B2DC" />
                        <Text className="text-memento-600 text-xs font-semibold">
                            {(points ?? 0).toLocaleString()}P
                        </Text>
                    </View>
                </View>

                {/* 스테이지 영역 */}
                <View
                    className="mx-5 rounded-3xl overflow-hidden mb-4"
                    style={{
                        height: 280,
                        backgroundColor: isMemorialMode ? "#0F172A" : "#E0F7FF",
                    }}
                >
                    {/* 배경 장식 */}
                    <View
                        className="absolute inset-0 opacity-20"
                        style={{
                            backgroundColor: isMemorialMode ? "#F59E0B" : "#05B2DC",
                            borderRadius: 24,
                        }}
                    />

                    {/* 말풍선 */}
                    {message && (
                        <View
                            className="absolute top-6 self-center px-4 py-2 rounded-2xl"
                            style={{ backgroundColor: isMemorialMode ? "#1F2937" : "#fff" }}
                        >
                            <Text
                                className={`text-sm font-medium ${isMemorialMode ? "text-white" : "text-gray-800"}`}
                            >
                                {message}
                            </Text>
                            {/* 말풍선 꼬리 */}
                            <View
                                className="absolute -bottom-2 self-center w-4 h-2"
                                style={{
                                    backgroundColor: "transparent",
                                    borderLeftWidth: 8,
                                    borderRightWidth: 8,
                                    borderTopWidth: 8,
                                    borderLeftColor: "transparent",
                                    borderRightColor: "transparent",
                                    borderTopColor: isMemorialMode ? "#1F2937" : "#fff",
                                }}
                            />
                        </View>
                    )}

                    {/* 미니미 (반려동물 사진 or 기본 캐릭터) */}
                    <TouchableOpacity
                        className="absolute bottom-8 self-center"
                        style={{ left: SCREEN_WIDTH / 2 - 60 - 20 }}
                        onPress={handleTouch}
                        activeOpacity={0.9}
                    >
                        {selectedPet?.profileImage ? (
                            <Image
                                source={{ uri: selectedPet.profileImage }}
                                className="w-28 h-28 rounded-full border-4 border-white"
                                style={{ shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 10 }}
                            />
                        ) : (
                            <View
                                className="w-28 h-28 rounded-full border-4 border-white items-center justify-center"
                                style={{
                                    backgroundColor: isMemorialMode ? "#1F2937" : "#B3EDFF",
                                    shadowColor: "#000",
                                    shadowOpacity: 0.2,
                                    shadowRadius: 10,
                                }}
                            >
                                <Text className="text-5xl">
                                    {selectedPet?.type === "강아지" ? "🐶"
                                    : selectedPet?.type === "고양이" ? "🐱" : "🐾"}
                                </Text>
                            </View>
                        )}
                        <Text
                            className={`text-center text-sm font-semibold mt-2 ${isMemorialMode ? "text-white" : "text-gray-700"}`}
                        >
                            {selectedPet?.name ?? "미니미"}
                        </Text>
                    </TouchableOpacity>

                    {/* 탭 안내 */}
                    <Text
                        className="absolute bottom-3 self-center text-xs"
                        style={{ color: isMemorialMode ? "#4B5563" : "#9CA3AF" }}
                    >
                        탭해서 반응보기
                    </Text>
                </View>

                {/* 꾸미기 섹션 */}
                <View className="px-5 mb-5">
                    <Text className={`text-sm font-semibold mb-3 ${isMemorialMode ? "text-gray-400" : "text-gray-500"}`}>
                        꾸미기
                    </Text>
                    <View className="flex-row gap-3">
                        <DecoCard
                            icon="color-palette-outline"
                            label="배경 테마"
                            color="#8B5CF6"
                            bgColor="#F5F3FF"
                            isMemorialMode={isMemorialMode}
                            onPress={() => {}}
                        />
                        <DecoCard
                            icon="paw-outline"
                            label="미니미 상점"
                            color="#05B2DC"
                            bgColor="#E0F7FF"
                            isMemorialMode={isMemorialMode}
                            onPress={() => {}}
                        />
                        <DecoCard
                            icon="musical-notes-outline"
                            label="BGM"
                            color="#F59E0B"
                            bgColor="#FFFBEB"
                            isMemorialMode={isMemorialMode}
                            onPress={() => {}}
                        />
                    </View>
                </View>

                {/* 방문록 */}
                <View className="px-5 mb-8">
                    <Text className={`text-sm font-semibold mb-3 ${isMemorialMode ? "text-gray-400" : "text-gray-500"}`}>
                        방문록
                    </Text>
                    <View
                        className="rounded-2xl p-4 items-center"
                        style={{ backgroundColor: isMemorialMode ? "#111827" : "#F9FAFB" }}
                    >
                        <Ionicons name="chatbubbles-outline" size={32} color="#D1D5DB" />
                        <Text className={`text-sm mt-2 ${isMemorialMode ? "text-gray-500" : "text-gray-400"}`}>
                            아직 방문록이 없어요.
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function DecoCard({ icon, label, color, bgColor, isMemorialMode, onPress }: {
    icon: React.ComponentProps<typeof Ionicons>["name"];
    label: string;
    color: string;
    bgColor: string;
    isMemorialMode: boolean;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.8}
            className="flex-1 rounded-2xl p-3.5 items-center gap-2"
            style={{ backgroundColor: isMemorialMode ? "#111827" : bgColor }}
        >
            <View
                className="w-10 h-10 rounded-xl items-center justify-center"
                style={{ backgroundColor: color + "20" }}
            >
                <Ionicons name={icon} size={20} color={color} />
            </View>
            <Text
                className={`text-xs font-medium text-center ${isMemorialMode ? "text-gray-400" : "text-gray-600"}`}
            >
                {label}
            </Text>
        </TouchableOpacity>
    );
}
