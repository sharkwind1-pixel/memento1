/**
 * 기록 탭 — 타임라인 + 사진 갤러리
 */

import { useState } from "react";
import {
    View, Text, ScrollView, TouchableOpacity,
    Image, FlatList, RefreshControl, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { usePet } from "@/contexts/PetContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

type TabType = "timeline" | "gallery";

export default function RecordScreen() {
    const { selectedPet, isLoading, isMemorialMode, refreshPets } = usePet();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>("timeline");
    const [refreshing, setRefreshing] = useState(false);

    async function onRefresh() {
        setRefreshing(true);
        await refreshPets();
        setRefreshing(false);
    }

    const accentColor = isMemorialMode ? "#F59E0B" : "#05B2DC";

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator size="large" color="#05B2DC" />
            </View>
        );
    }

    return (
        <SafeAreaView
            className={`flex-1 ${isMemorialMode ? "bg-gray-950" : "bg-white"}`}
            edges={["top"]}
        >
            {/* 헤더 */}
            <View className="flex-row items-center justify-between px-5 pt-4 pb-3">
                <Text className={`text-xl font-bold ${isMemorialMode ? "text-white" : "text-gray-900"}`}>
                    {selectedPet ? `${selectedPet.name}의 기록` : "기록"}
                </Text>
                <TouchableOpacity
                    className="w-9 h-9 rounded-full items-center justify-center"
                    style={{ backgroundColor: accentColor + "20" }}
                >
                    <Ionicons name="add" size={22} color={accentColor} />
                </TouchableOpacity>
            </View>

            {/* 탭 */}
            <View
                className="flex-row mx-5 rounded-xl p-1 mb-4"
                style={{ backgroundColor: isMemorialMode ? "#1F2937" : "#F3F4F6" }}
            >
                {(["timeline", "gallery"] as TabType[]).map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        onPress={() => setActiveTab(tab)}
                        className={`flex-1 py-2 rounded-lg items-center`}
                        style={activeTab === tab ? { backgroundColor: "#fff" } : {}}
                        activeOpacity={0.8}
                    >
                        <Text
                            className={`text-sm font-semibold ${
                                activeTab === tab
                                    ? "text-gray-900"
                                    : isMemorialMode ? "text-gray-400" : "text-gray-500"
                            }`}
                        >
                            {tab === "timeline" ? "타임라인" : "사진첩"}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* 컨텐츠 */}
            {!selectedPet ? (
                <View className="flex-1 items-center justify-center px-6">
                    <Ionicons name="paw-outline" size={48} color="#D1D5DB" />
                    <Text className="text-gray-400 mt-3 text-center">
                        반려동물을 선택하면{"\n"}기록을 볼 수 있어요.
                    </Text>
                </View>
            ) : activeTab === "timeline" ? (
                <TimelineView
                    pet={selectedPet}
                    isMemorialMode={isMemorialMode}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                />
            ) : (
                <GalleryView
                    photos={selectedPet.photos}
                    isMemorialMode={isMemorialMode}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                />
            )}
        </SafeAreaView>
    );
}

// ─── 타임라인 ─────────────────────────────────────────

function TimelineView({ pet, isMemorialMode, refreshing, onRefresh }: {
    pet: NonNullable<ReturnType<typeof usePet>["selectedPet"]>;
    isMemorialMode: boolean;
    refreshing: boolean;
    onRefresh: () => void;
}) {
    const accentColor = isMemorialMode ? "#F59E0B" : "#05B2DC";

    return (
        <ScrollView
            className="flex-1 px-5"
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={accentColor}
                />
            }
        >
            {/* 최근 사진 하이라이트 */}
            {pet.photos.length > 0 && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="mb-5 -mx-5 px-5"
                    contentContainerStyle={{ gap: 8 }}
                >
                    {pet.photos.slice(0, 8).map((photo) => (
                        <TouchableOpacity key={photo.id} activeOpacity={0.9}>
                            <Image
                                source={{ uri: photo.url }}
                                className="w-24 h-24 rounded-xl"
                            />
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}

            {/* 타임라인 엔트리 플레이스홀더 */}
            {pet.photos.length === 0 ? (
                <View className="items-center py-16">
                    <Ionicons name="camera-outline" size={48} color="#D1D5DB" />
                    <Text className="text-gray-400 mt-3 text-center text-sm">
                        첫 기록을 남겨보세요.{"\n"}소중한 순간이 타임라인에 쌓입니다.
                    </Text>
                </View>
            ) : (
                <View className="pb-6">
                    <Text
                        className={`text-sm font-semibold mb-3 ${isMemorialMode ? "text-gray-400" : "text-gray-500"}`}
                    >
                        최근 기록
                    </Text>
                    {pet.photos.slice(0, 5).map((photo) => (
                        <View
                            key={photo.id}
                            className={`flex-row gap-3 mb-4 p-3 rounded-2xl ${
                                isMemorialMode ? "bg-gray-900" : "bg-gray-50"
                            }`}
                        >
                            <Image
                                source={{ uri: photo.url }}
                                className="w-16 h-16 rounded-xl"
                            />
                            <View className="flex-1">
                                <Text
                                    className={`text-sm font-medium ${isMemorialMode ? "text-white" : "text-gray-800"}`}
                                    numberOfLines={2}
                                >
                                    {photo.caption || "기록"}
                                </Text>
                                <Text className={`text-xs mt-1 ${isMemorialMode ? "text-gray-500" : "text-gray-400"}`}>
                                    {photo.date}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>
            )}
        </ScrollView>
    );
}

// ─── 사진첩 ─────────────────────────────────────────

function GalleryView({ photos, isMemorialMode, refreshing, onRefresh }: {
    photos: NonNullable<ReturnType<typeof usePet>["selectedPet"]>["photos"];
    isMemorialMode: boolean;
    refreshing: boolean;
    onRefresh: () => void;
}) {
    const accentColor = isMemorialMode ? "#F59E0B" : "#05B2DC";

    if (photos.length === 0) {
        return (
            <View className="flex-1 items-center justify-center px-6">
                <Ionicons name="images-outline" size={48} color="#D1D5DB" />
                <Text className="text-gray-400 mt-3 text-center text-sm">
                    아직 사진이 없어요.{"\n"}소중한 순간을 담아보세요.
                </Text>
            </View>
        );
    }

    return (
        <FlatList
            data={photos}
            keyExtractor={(item) => item.id}
            numColumns={3}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={accentColor}
                />
            }
            renderItem={({ item }) => (
                <TouchableOpacity
                    activeOpacity={0.85}
                    style={{ flex: 1 / 3, aspectRatio: 1, padding: 1 }}
                >
                    <Image
                        source={{ uri: item.url }}
                        style={{ flex: 1 }}
                        resizeMode="cover"
                    />
                </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingBottom: 20 }}
        />
    );
}
