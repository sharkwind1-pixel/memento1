/**
 * 프로필 / 설정 화면 (모달)
 */

import { useState } from "react";
import {
    View, Text, ScrollView, TouchableOpacity,
    Image, Alert, Switch, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { PRICING } from "@/config/constants";

export default function ProfileScreen() {
    const router = useRouter();
    const { user, profile, isPremium, isAdminUser, points, signOut } = useAuth();
    const { pets, isMemorialMode } = usePet();
    const [signingOut, setSigningOut] = useState(false);

    const accentColor = isMemorialMode ? "#F59E0B" : "#05B2DC";
    const nickname = profile?.nickname ?? user?.user_metadata?.nickname ?? user?.email?.split("@")[0] ?? "사용자";
    const email = user?.email ?? "";

    async function handleSignOut() {
        Alert.alert("로그아웃", "정말 로그아웃하시겠어요?", [
            { text: "취소", style: "cancel" },
            {
                text: "로그아웃",
                style: "destructive",
                onPress: async () => {
                    setSigningOut(true);
                    await signOut();
                    router.replace("/(auth)/login");
                },
            },
        ]);
    }

    return (
        <ScrollView
            className={`flex-1 ${isMemorialMode ? "bg-gray-950" : "bg-gray-50"}`}
            showsVerticalScrollIndicator={false}
        >
            {/* 프로필 헤더 */}
            <View
                className="items-center pt-8 pb-6 mx-4 mt-4 rounded-3xl"
                style={{ backgroundColor: isMemorialMode ? "#111827" : "#fff" }}
            >
                {profile?.avatar ? (
                    <Image source={{ uri: profile.avatar }} className="w-20 h-20 rounded-full mb-3" />
                ) : (
                    <View
                        className="w-20 h-20 rounded-full mb-3 items-center justify-center"
                        style={{ backgroundColor: accentColor + "20" }}
                    >
                        <Ionicons name="person" size={36} color={accentColor} />
                    </View>
                )}
                <Text className={`text-lg font-bold ${isMemorialMode ? "text-white" : "text-gray-900"}`}>
                    {nickname}
                </Text>
                <Text className="text-sm text-gray-400 mt-0.5">{email}</Text>

                {/* 구독 배지 */}
                <View className="flex-row gap-2 mt-3">
                    {isPremium ? (
                        <View className="flex-row items-center gap-1 px-3 py-1 rounded-full bg-memento-500">
                            <Ionicons name="star" size={12} color="#fff" />
                            <Text className="text-xs font-semibold text-white">프리미엄</Text>
                        </View>
                    ) : (
                        <TouchableOpacity
                            onPress={() => router.push("/subscription")}
                            className="flex-row items-center gap-1 px-3 py-1 rounded-full border border-memento-300"
                        >
                            <Ionicons name="arrow-up-circle-outline" size={12} color={accentColor} />
                            <Text className="text-xs font-medium" style={{ color: accentColor }}>업그레이드</Text>
                        </TouchableOpacity>
                    )}
                    <View className="flex-row items-center gap-1 px-3 py-1 rounded-full bg-gray-100">
                        <Ionicons name="star" size={12} color="#F59E0B" />
                        <Text className="text-xs font-semibold text-gray-700">{(points ?? 0).toLocaleString()}P</Text>
                    </View>
                </View>
            </View>

            {/* 내 반려동물 */}
            <SectionCard title="내 반려동물" isMemorialMode={isMemorialMode}>
                {pets.map((pet) => (
                    <SettingsRow
                        key={pet.id}
                        icon={
                            <View className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 items-center justify-center">
                                {pet.profileImage ? (
                                    <Image source={{ uri: pet.profileImage }} className="w-8 h-8" />
                                ) : (
                                    <Text className="text-base">{pet.type === "강아지" ? "🐶" : "🐱"}</Text>
                                )}
                            </View>
                        }
                        label={pet.name}
                        sublabel={`${pet.breed || pet.type} · ${pet.gender}`}
                        onPress={() => router.push(`/pet/${pet.id}`)}
                        isMemorialMode={isMemorialMode}
                    />
                ))}
                <SettingsRow
                    icon={<Ionicons name="add-circle-outline" size={22} color={accentColor} />}
                    label="반려동물 추가"
                    onPress={() => router.push("/pet/new")}
                    isMemorialMode={isMemorialMode}
                    labelColor={accentColor}
                />
            </SectionCard>

            {/* 계정 설정 */}
            <SectionCard title="계정" isMemorialMode={isMemorialMode}>
                <SettingsRow
                    icon={<Ionicons name="card-outline" size={22} color="#6B7280" />}
                    label="구독 관리"
                    sublabel={isPremium ? "프리미엄 이용 중" : "무료 플랜"}
                    onPress={() => router.push("/subscription")}
                    isMemorialMode={isMemorialMode}
                />
                <SettingsRow
                    icon={<Ionicons name="notifications-outline" size={22} color="#6B7280" />}
                    label="알림 설정"
                    onPress={() => router.push("/notifications")}
                    isMemorialMode={isMemorialMode}
                />
            </SectionCard>

            {/* 앱 정보 */}
            <SectionCard title="앱 정보" isMemorialMode={isMemorialMode}>
                <SettingsRow
                    icon={<Ionicons name="document-text-outline" size={22} color="#6B7280" />}
                    label="이용약관"
                    onPress={() => {}}
                    isMemorialMode={isMemorialMode}
                />
                <SettingsRow
                    icon={<Ionicons name="shield-outline" size={22} color="#6B7280" />}
                    label="개인정보처리방침"
                    onPress={() => {}}
                    isMemorialMode={isMemorialMode}
                />
                <View className="flex-row items-center justify-between px-4 py-3.5">
                    <View className="flex-row items-center gap-3">
                        <Ionicons name="information-circle-outline" size={22} color="#6B7280" />
                        <Text className={`text-sm ${isMemorialMode ? "text-gray-300" : "text-gray-700"}`}>버전</Text>
                    </View>
                    <Text className="text-sm text-gray-400">1.0.0</Text>
                </View>
            </SectionCard>

            {/* 로그아웃 */}
            <View className="mx-4 mb-8">
                <TouchableOpacity
                    onPress={handleSignOut}
                    disabled={signingOut}
                    className="w-full py-4 rounded-2xl items-center border border-red-200"
                    style={{ backgroundColor: isMemorialMode ? "#1F0000" : "#FEF2F2" }}
                >
                    {signingOut ? (
                        <ActivityIndicator color="#EF4444" />
                    ) : (
                        <Text className="text-red-500 font-semibold text-sm">로그아웃</Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

function SectionCard({ title, children, isMemorialMode }: {
    title: string;
    children: React.ReactNode;
    isMemorialMode: boolean;
}) {
    return (
        <View className="mx-4 mb-3">
            <Text className={`text-xs font-semibold uppercase tracking-wider mb-2 px-1 ${isMemorialMode ? "text-gray-500" : "text-gray-400"}`}>
                {title}
            </Text>
            <View
                className="rounded-2xl overflow-hidden"
                style={{ backgroundColor: isMemorialMode ? "#111827" : "#fff" }}
            >
                {children}
            </View>
        </View>
    );
}

function SettingsRow({ icon, label, sublabel, onPress, isMemorialMode, labelColor }: {
    icon: React.ReactNode;
    label: string;
    sublabel?: string;
    onPress: () => void;
    isMemorialMode: boolean;
    labelColor?: string;
}) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            className="flex-row items-center justify-between px-4 py-3.5 border-b"
            style={{ borderBottomColor: isMemorialMode ? "#1F2937" : "#F9FAFB" }}
        >
            <View className="flex-row items-center gap-3">
                {icon}
                <View>
                    <Text className="text-sm" style={{ color: labelColor ?? (isMemorialMode ? "#F9FAFB" : "#111827") }}>
                        {label}
                    </Text>
                    {sublabel && (
                        <Text className="text-xs text-gray-400 mt-0.5">{sublabel}</Text>
                    )}
                </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
        </TouchableOpacity>
    );
}
