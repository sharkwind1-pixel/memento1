/**
 * 홈 탭 — 반려동물 선택 + 빠른 접근 카드
 */

import { useState } from "react";
import {
    View, Text, ScrollView, TouchableOpacity,
    Image, RefreshControl, ActivityIndicator, StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { Pet } from "@/types";
import { COLORS } from "@/lib/theme";

export default function HomeScreen() {
    const router = useRouter();
    const { user, profile, points } = useAuth();
    const { pets, selectedPet, selectPet, isLoading, isMemorialMode, refreshPets } = usePet();
    const [refreshing, setRefreshing] = useState(false);

    const nickname =
        profile?.nickname ??
        (user?.user_metadata?.nickname as string | undefined) ??
        user?.email?.split("@")[0] ??
        "사용자";

    async function onRefresh() {
        setRefreshing(true);
        await refreshPets();
        setRefreshing(false);
    }

    if (isLoading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color={COLORS.memento[500]} />
            </View>
        );
    }

    const bgColor = isMemorialMode ? COLORS.gray[950] : COLORS.white;
    const textPrimary = isMemorialMode ? COLORS.white : COLORS.gray[900];
    const textSecondary = isMemorialMode ? COLORS.gray[400] : COLORS.gray[500];

    return (
        <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
            <ScrollView
                style={styles.flex1}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500]}
                    />
                }
            >
                <View style={styles.headerRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.greeting, { color: textPrimary }]}>
                            안녕하세요, {nickname}님
                        </Text>
                        <Text style={[styles.greetingSub, { color: textSecondary }]}>
                            {isMemorialMode ? "함께한 추억을 되새겨보세요" : "오늘도 특별한 하루를 기록해요"}
                        </Text>
                    </View>
                    <View style={styles.headerActions}>
                        <View style={styles.pointPill}>
                            <Ionicons name="star" size={13} color={COLORS.memento[500]} />
                            <Text style={styles.pointText}>
                                {(points ?? 0).toLocaleString()}P
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => router.push("/notifications")} activeOpacity={0.7}>
                            <Ionicons name="notifications-outline" size={24} color={isMemorialMode ? COLORS.gray[400] : COLORS.gray[500]} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.push("/profile")} activeOpacity={0.7}>
                            <Ionicons name="person-circle-outline" size={28} color={isMemorialMode ? COLORS.gray[400] : COLORS.gray[500]} />
                        </TouchableOpacity>
                    </View>
                </View>

                {pets.length > 0 ? (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.petScroll}
                        contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }}
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
                        <AddPetChip />
                    </ScrollView>
                ) : (
                    <NoPetCard />
                )}

                {selectedPet && (
                    <PetHeroCard pet={selectedPet} isMemorialMode={isMemorialMode} />
                )}

                <View style={styles.quickSection}>
                    <Text style={[styles.quickLabel, { color: textSecondary }]}>
                        빠른 접근
                    </Text>
                    <View style={styles.quickGrid}>
                        <QuickCard
                            icon="camera-outline"
                            label="사진 추가"
                            color={COLORS.memento[500]}
                            bgColor={COLORS.memento[100]}
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
                            color={COLORS.memorial[500]}
                            bgColor={COLORS.memorial[50]}
                            onPress={() => router.push("/(tabs)/minihompy")}
                        />
                    </View>
                </View>

                <View style={{ height: 32 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

function PetChip({ pet, isSelected, isMemorialMode, onSelect }: {
    pet: Pet;
    isSelected: boolean;
    isMemorialMode: boolean;
    onSelect: () => void;
}) {
    const activeColor = isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500];
    return (
        <TouchableOpacity
            onPress={onSelect}
            activeOpacity={0.8}
            style={[
                styles.petChip,
                isSelected
                    ? { backgroundColor: activeColor + "20", borderColor: activeColor }
                    : { borderColor: COLORS.gray[200], backgroundColor: COLORS.gray[50] },
            ]}
        >
            {pet.profileImage ? (
                <Image
                    source={{ uri: pet.profileImage }}
                    style={styles.petChipAvatar}
                />
            ) : (
                <View
                    style={[
                        styles.petChipAvatar,
                        styles.petChipAvatarPlaceholder,
                        { backgroundColor: activeColor + "30" },
                    ]}
                >
                    <Text style={{ fontSize: 12 }}>
                        {pet.type === "강아지" ? "🐶" : pet.type === "고양이" ? "🐱" : "🐾"}
                    </Text>
                </View>
            )}
            <Text
                style={[
                    styles.petChipName,
                    { color: isSelected ? activeColor : COLORS.gray[600] },
                ]}
            >
                {pet.name}
            </Text>
            {pet.status === "memorial" && (
                <Ionicons name="heart" size={12} color={activeColor} />
            )}
        </TouchableOpacity>
    );
}

function AddPetChip() {
    const router = useRouter();
    return (
        <TouchableOpacity
            onPress={() => router.push("/pet/new")}
            style={styles.addPetChip}
            activeOpacity={0.7}
        >
            <Ionicons name="add-circle-outline" size={16} color={COLORS.gray[400]} />
            <Text style={styles.addPetText}>반려동물 추가</Text>
        </TouchableOpacity>
    );
}

function NoPetCard() {
    const router = useRouter();
    return (
        <View style={styles.noPetCard}>
            <Text style={{ fontSize: 36, marginBottom: 12 }}>🐾</Text>
            <Text style={styles.noPetTitle}>
                반려동물을 등록해보세요
            </Text>
            <Text style={styles.noPetDesc}>
                소중한 순간들을 함께 기록하고 추억해요.
            </Text>
            <TouchableOpacity
                onPress={() => router.push("/pet/new")}
                style={styles.noPetButton}
                activeOpacity={0.85}
            >
                <Text style={styles.noPetButtonText}>등록하기</Text>
            </TouchableOpacity>
        </View>
    );
}

function PetHeroCard({ pet, isMemorialMode }: { pet: Pet; isMemorialMode: boolean }) {
    const bgFrom = isMemorialMode ? "#1A1A2E" : "#CBEBF0";

    return (
        <View style={[styles.heroCard, { backgroundColor: bgFrom }]}>
            <View style={styles.heroRow}>
                <View style={{ position: "relative", marginRight: 16 }}>
                    {pet.profileImage ? (
                        <Image
                            source={{ uri: pet.profileImage }}
                            style={styles.heroAvatar}
                        />
                    ) : (
                        <View
                            style={[
                                styles.heroAvatar,
                                {
                                    alignItems: "center",
                                    justifyContent: "center",
                                    backgroundColor: isMemorialMode ? "#2D2D3E" : "#B3EDFF",
                                },
                            ]}
                        >
                            <Text style={{ fontSize: 36 }}>
                                {pet.type === "강아지" ? "🐶" : pet.type === "고양이" ? "🐱" : "🐾"}
                            </Text>
                        </View>
                    )}
                    {pet.status === "memorial" && (
                        <View style={[styles.memorialBadge, { backgroundColor: COLORS.memorial[400] }]}>
                            <Ionicons name="heart" size={10} color="#fff" />
                        </View>
                    )}
                </View>

                <View style={{ flex: 1 }}>
                    <Text style={[styles.heroName, { color: isMemorialMode ? COLORS.white : COLORS.gray[800] }]}>
                        {pet.name}
                    </Text>
                    <Text style={[styles.heroBreed, { color: isMemorialMode ? COLORS.gray[400] : COLORS.gray[500] }]}>
                        {pet.breed || pet.type}
                        {pet.gender ? ` · ${pet.gender}` : ""}
                    </Text>
                    <View style={styles.heroMetaRow}>
                        <Ionicons
                            name="images-outline"
                            size={13}
                            color={isMemorialMode ? COLORS.gray[400] : COLORS.gray[500]}
                        />
                        <Text style={{
                            fontSize: 12,
                            color: isMemorialMode ? COLORS.gray[400] : COLORS.gray[500],
                            marginLeft: 4,
                        }}>
                            사진 {pet.photos.length}장
                        </Text>
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
            style={[styles.quickCard, { backgroundColor: bgColor }]}
        >
            <View style={[styles.quickIconBg, { backgroundColor: color + "20" }]}>
                <Ionicons name={icon} size={22} color={color} />
            </View>
            <Text style={styles.quickCardLabel}>{label}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.white },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 8,
    },
    greeting: { fontSize: 20, fontWeight: "bold" },
    greetingSub: { fontSize: 14, marginTop: 2 },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
    pointPill: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.memento[50],
        borderRadius: 9999,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    pointText: {
        color: COLORS.memento[600],
        fontSize: 12,
        fontWeight: "600",
        marginLeft: 4,
    },
    petScroll: { paddingVertical: 16 },
    petChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 9999,
        borderWidth: 1,
    },
    petChipAvatar: { width: 28, height: 28, borderRadius: 14 },
    petChipAvatarPlaceholder: { alignItems: "center", justifyContent: "center" },
    petChipName: { fontSize: 14, fontWeight: "500" },
    addPetChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 9999,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: COLORS.gray[300],
    },
    addPetText: { fontSize: 14, color: COLORS.gray[400] },
    noPetCard: {
        marginHorizontal: 20,
        marginVertical: 16,
        padding: 24,
        borderRadius: 16,
        backgroundColor: COLORS.memento[50],
        alignItems: "center",
    },
    noPetTitle: { fontSize: 16, fontWeight: "600", color: COLORS.gray[800], marginBottom: 4 },
    noPetDesc: { fontSize: 14, color: COLORS.gray[500], textAlign: "center" },
    noPetButton: {
        marginTop: 16,
        backgroundColor: COLORS.memento[500],
        borderRadius: 12,
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    noPetButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
    heroCard: { marginHorizontal: 20, borderRadius: 16, overflow: "hidden" },
    heroRow: { flexDirection: "row", alignItems: "center", padding: 20 },
    heroAvatar: { width: 80, height: 80, borderRadius: 16 },
    memorialBadge: {
        position: "absolute",
        top: -4,
        right: -4,
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    heroName: { fontSize: 20, fontWeight: "bold" },
    heroBreed: { fontSize: 14, marginTop: 2 },
    heroMetaRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
    quickSection: { paddingHorizontal: 20, marginTop: 16 },
    quickLabel: { fontSize: 14, fontWeight: "600", marginBottom: 12 },
    quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    quickCard: {
        flexGrow: 1,
        flexBasis: "45%",
        borderRadius: 16,
        padding: 16,
        alignItems: "center",
        gap: 8,
        minHeight: 90,
    },
    quickIconBg: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    quickCardLabel: { fontSize: 14, fontWeight: "600", color: COLORS.gray[700] },
});
