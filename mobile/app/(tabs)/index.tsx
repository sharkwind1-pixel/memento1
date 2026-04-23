/**
 * 홈 탭 — 반려동물 선택 + 빠른 접근 카드
 */

import { useState } from "react";
import {
    View, Text, ScrollView, TouchableOpacity,
    Image, RefreshControl, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { Pet } from "@/types";

export default function HomeScreen() {
    const router = useRouter();
    const { user, profile, points } = useAuth();
    const { pets, selectedPet, selectPet, isLoading, isMemorialMode, refreshPets } = usePet();
    const [refreshing, setRefreshing] = useState(false);

    const nickname =
        profile?.nickname ??
        user?.user_metadata?.nickname ??
        user?.email?.split("@")[0] ??
        "사용자";

    async function onRefresh() {
        setRefreshing(true);
        await refreshPets();
        setRefreshing(false);
    }

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
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={isMemorialMode ? "#F59E0B" : "#05B2DC"}
                    />
                }
            >
                {/* 헤더 */}
                <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
                    <View>
                        <Text className={`text-xl font-bold ${isMemorialMode ? "text-white" : "text-gray-900"}`}>
                            안녕하세요, {nickname}님
                        </Text>
                        <Text className={`text-sm mt-0.5 ${isMemorialMode ? "text-gray-400" : "text-gray-500"}`}>
                            {isMemorialMode ? "함께한 추억을 되새겨보세요" : "오늘도 특별한 하루를 기록해요"}
                        </Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                        {/* 포인트 */}
                        <View className="flex-row items-center bg-memento-50 rounded-full px-3 py-1.5">
                            <Ionicons name="star" size={13} color="#05B2DC" />
                            <Text className="text-memento-600 text-xs font-semibold ml-1">
                                {(points ?? 0).toLocaleString()}P
                            </Text>
                        </View>
                    </View>
                </View>

                {/* 반려동물 선택 가로 스크롤 */}
                {pets.length > 0 ? (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        className="px-5 py-4"
                        contentContainerStyle={{ gap: 12 }}
                    >
                        {pets.map((pet) => (
                            <PetChip
                                key={pet.id}
                                pet={pet}
                                isSelected={selectedPet?.id === pet.id}
                                isMemorialMode={isMemorialMode}
                                onSelect={() => selectPet(pet.id)}
                            />
                        ))}
                        <AddPetChip isMemorialMode={isMemorialMode} />
                    </ScrollView>
                ) : (
                    <NoPetCard isMemorialMode={isMemorialMode} />
                )}

                {/* 선택된 반려동물 히어로 카드 */}
                {selectedPet && (
                    <PetHeroCard pet={selectedPet} isMemorialMode={isMemorialMode} />
                )}

                {/* 빠른 접근 그리드 */}
                <View className="px-5 mt-4">
                    <Text className={`text-sm font-semibold mb-3 ${isMemorialMode ? "text-gray-400" : "text-gray-500"}`}>
                        빠른 접근
                    </Text>
                    <View className="flex-row flex-wrap gap-3">
                        <QuickCard
                            icon="camera-outline"
                            label="사진 추가"
                            color="#05B2DC"
                            bgColor="#E0F7FF"
                            onPress={() => router.push("/(tabs)/record")}
                        />
                        <QuickCard
                            icon="chatbubble-ellipses-outline"
                            label="AI 펫톡"
                            color="#10B981"
                            bgColor="#ECFDF5"
                            onPress={() => router.push("/(tabs)/ai-chat")}
                        />
                        <QuickCard
                            icon="people-outline"
                            label="커뮤니티"
                            color="#8B5CF6"
                            bgColor="#F5F3FF"
                            onPress={() => router.push("/(tabs)/community")}
                        />
                        <QuickCard
                            icon="star-outline"
                            label="미니홈피"
                            color="#F59E0B"
                            bgColor="#FFFBEB"
                            onPress={() => router.push("/(tabs)/minihompy")}
                        />
                    </View>
                </View>

                <View className="h-8" />
            </ScrollView>
        </SafeAreaView>
    );
}

// ─── 서브 컴포넌트 ─────────────────────────────────────────

function PetChip({ pet, isSelected, isMemorialMode, onSelect }: {
    pet: Pet;
    isSelected: boolean;
    isMemorialMode: boolean;
    onSelect: () => void;
}) {
    const activeColor = isMemorialMode ? "#F59E0B" : "#05B2DC";
    return (
        <TouchableOpacity
            onPress={onSelect}
            activeOpacity={0.8}
            className={`flex-row items-center gap-2 px-3 py-2 rounded-full border ${
                isSelected
                    ? "border-transparent"
                    : "border-gray-200 bg-gray-50"
            }`}
            style={isSelected ? { backgroundColor: activeColor + "20", borderColor: activeColor } : {}}
        >
            {pet.profileImage ? (
                <Image
                    source={{ uri: pet.profileImage }}
                    className="w-7 h-7 rounded-full"
                />
            ) : (
                <View
                    className="w-7 h-7 rounded-full items-center justify-center"
                    style={{ backgroundColor: activeColor + "30" }}
                >
                    <Text className="text-xs">{pet.type === "강아지" ? "🐶" : pet.type === "고양이" ? "🐱" : "🐾"}</Text>
                </View>
            )}
            <Text
                className={`text-sm font-medium ${isSelected ? "" : "text-gray-600"}`}
                style={isSelected ? { color: activeColor } : {}}
            >
                {pet.name}
            </Text>
            {pet.status === "memorial" && (
                <Ionicons name="heart" size={12} color={activeColor} />
            )}
        </TouchableOpacity>
    );
}

function AddPetChip({ isMemorialMode }: { isMemorialMode: boolean }) {
    return (
        <TouchableOpacity
            className="flex-row items-center gap-1.5 px-3 py-2 rounded-full border border-dashed border-gray-300"
            activeOpacity={0.7}
        >
            <Ionicons name="add-circle-outline" size={16} color="#9CA3AF" />
            <Text className="text-sm text-gray-400">반려동물 추가</Text>
        </TouchableOpacity>
    );
}

function NoPetCard({ isMemorialMode }: { isMemorialMode: boolean }) {
    return (
        <View className="mx-5 my-4 p-6 rounded-2xl bg-memento-50 items-center">
            <Text className="text-4xl mb-3">🐾</Text>
            <Text className="text-base font-semibold text-gray-800 mb-1">
                반려동물을 등록해보세요
            </Text>
            <Text className="text-sm text-gray-500 text-center">
                소중한 순간들을 함께 기록하고 추억해요.
            </Text>
            <TouchableOpacity className="mt-4 bg-memento-500 rounded-xl px-5 py-2.5">
                <Text className="text-white font-semibold text-sm">등록하기</Text>
            </TouchableOpacity>
        </View>
    );
}

function PetHeroCard({ pet, isMemorialMode }: { pet: Pet; isMemorialMode: boolean }) {
    const bgFrom = isMemorialMode ? "#1A1A2E" : "#CBEBF0";
    const bgTo = isMemorialMode ? "#3D2A1A" : "#FFF8F6";

    return (
        <View
            className="mx-5 rounded-2xl overflow-hidden"
            style={{ backgroundColor: bgFrom }}
        >
            <View className="flex-row items-center p-5">
                {/* 반려동물 사진 */}
                <View className="relative mr-4">
                    {pet.profileImage ? (
                        <Image
                            source={{ uri: pet.profileImage }}
                            className="w-20 h-20 rounded-2xl"
                        />
                    ) : (
                        <View
                            className="w-20 h-20 rounded-2xl items-center justify-center"
                            style={{ backgroundColor: isMemorialMode ? "#2D2D3E" : "#B3EDFF" }}
                        >
                            <Text className="text-4xl">
                                {pet.type === "강아지" ? "🐶" : pet.type === "고양이" ? "🐱" : "🐾"}
                            </Text>
                        </View>
                    )}
                    {pet.status === "memorial" && (
                        <View className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-memorial-400 items-center justify-center">
                            <Ionicons name="heart" size={10} color="#fff" />
                        </View>
                    )}
                </View>

                {/* 반려동물 정보 */}
                <View className="flex-1">
                    <Text
                        className={`text-xl font-bold ${isMemorialMode ? "text-white" : "text-gray-800"}`}
                    >
                        {pet.name}
                    </Text>
                    <Text
                        className={`text-sm mt-0.5 ${isMemorialMode ? "text-gray-400" : "text-gray-500"}`}
                    >
                        {pet.breed || pet.type}
                        {pet.gender ? ` · ${pet.gender}` : ""}
                    </Text>
                    <View className="flex-row items-center gap-3 mt-2">
                        <View className="flex-row items-center gap-1">
                            <Ionicons
                                name="images-outline"
                                size={13}
                                color={isMemorialMode ? "#9CA3AF" : "#6B7280"}
                            />
                            <Text
                                className={`text-xs ${isMemorialMode ? "text-gray-400" : "text-gray-500"}`}
                            >
                                사진 {pet.photos.length}장
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
}

function QuickCard({ icon, label, color, bgColor, onPress }: {
    icon: React.ComponentProps<typeof Ionicons>["name"];
    label: string;
    color: string;
    bgColor: string;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.8}
            className="flex-1 min-w-[45%] rounded-2xl p-4 items-center gap-2"
            style={{ backgroundColor: bgColor, minHeight: 90 }}
        >
            <View
                className="w-11 h-11 rounded-xl items-center justify-center"
                style={{ backgroundColor: color + "20" }}
            >
                <Ionicons name={icon} size={22} color={color} />
            </View>
            <Text className="text-sm font-semibold text-gray-700">{label}</Text>
        </TouchableOpacity>
    );
}
