/**
 * 프로필 / 설정 화면 (모달)
 */

import { useState } from "react";
import {
    View, Text, ScrollView, TouchableOpacity,
    Image, Alert, ActivityIndicator, StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { COLORS } from "@/lib/theme";

export default function ProfileScreen() {
    const router = useRouter();
    const { user, profile, isPremium, points, signOut } = useAuth();
    const { pets, isMemorialMode } = usePet();
    const [signingOut, setSigningOut] = useState(false);

    const accentColor = isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500];
    const nickname = profile?.nickname
        ?? (user?.user_metadata?.nickname as string | undefined)
        ?? user?.email?.split("@")[0]
        ?? "사용자";
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

    const bgColor = isMemorialMode ? COLORS.gray[950] : COLORS.gray[50];

    return (
        <ScrollView style={[styles.flex1, { backgroundColor: bgColor }]} showsVerticalScrollIndicator={false}>
            <View style={[styles.headerCard, { backgroundColor: isMemorialMode ? COLORS.gray[900] : COLORS.white }]}>
                {profile?.avatar ? (
                    <Image source={{ uri: profile.avatar }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: accentColor + "20" }]}>
                        <Ionicons name="person" size={36} color={accentColor} />
                    </View>
                )}
                <Text style={{ fontSize: 18, fontWeight: "bold", color: isMemorialMode ? COLORS.white : COLORS.gray[900] }}>
                    {nickname}
                </Text>
                <Text style={{ fontSize: 14, color: COLORS.gray[400], marginTop: 2 }}>{email}</Text>

                <View style={styles.badgeRow}>
                    {isPremium ? (
                        <View style={[styles.premiumBadge, { backgroundColor: COLORS.memento[500] }]}>
                            <Ionicons name="star" size={12} color="#fff" />
                            <Text style={{ fontSize: 12, fontWeight: "600", color: "#fff" }}>프리미엄</Text>
                        </View>
                    ) : (
                        <TouchableOpacity
                            onPress={() => router.push("/subscription")}
                            style={styles.upgradeBadge}
                        >
                            <Ionicons name="arrow-up-circle-outline" size={12} color={accentColor} />
                            <Text style={{ fontSize: 12, fontWeight: "500", color: accentColor }}>업그레이드</Text>
                        </TouchableOpacity>
                    )}
                    <View style={styles.pointBadge}>
                        <Ionicons name="star" size={12} color={COLORS.memorial[500]} />
                        <Text style={{ fontSize: 12, fontWeight: "600", color: COLORS.gray[700] }}>
                            {(points ?? 0).toLocaleString()}P
                        </Text>
                    </View>
                </View>
            </View>

            <SectionCard title="내 반려동물" isMemorialMode={isMemorialMode}>
                {pets.map((pet) => (
                    <SettingsRow
                        key={pet.id}
                        icon={
                            <View style={styles.petIconWrap}>
                                {pet.profileImage ? (
                                    <Image source={{ uri: pet.profileImage }} style={{ width: 32, height: 32 }} />
                                ) : (
                                    <Text style={{ fontSize: 16 }}>{pet.type === "강아지" ? "🐶" : "🐱"}</Text>
                                )}
                            </View>
                        }
                        label={pet.name}
                        sublabel={`${pet.breed || pet.type} · ${pet.gender}`}
                        onPress={() => router.push(`/pet/${pet.id}` as never)}
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

            <SectionCard title="계정" isMemorialMode={isMemorialMode}>
                <SettingsRow
                    icon={<Ionicons name="card-outline" size={22} color={COLORS.gray[500]} />}
                    label="구독 관리"
                    sublabel={isPremium ? "프리미엄 이용 중" : "무료 플랜"}
                    onPress={() => router.push("/subscription")}
                    isMemorialMode={isMemorialMode}
                />
                <SettingsRow
                    icon={<Ionicons name="notifications-outline" size={22} color={COLORS.gray[500]} />}
                    label="알림 설정"
                    onPress={() => router.push("/notifications")}
                    isMemorialMode={isMemorialMode}
                />
            </SectionCard>

            <SectionCard title="앱 정보" isMemorialMode={isMemorialMode}>
                <SettingsRow
                    icon={<Ionicons name="document-text-outline" size={22} color={COLORS.gray[500]} />}
                    label="이용약관"
                    onPress={() => {}}
                    isMemorialMode={isMemorialMode}
                />
                <SettingsRow
                    icon={<Ionicons name="shield-outline" size={22} color={COLORS.gray[500]} />}
                    label="개인정보처리방침"
                    onPress={() => {}}
                    isMemorialMode={isMemorialMode}
                />
                <View style={styles.versionRow}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <Ionicons name="information-circle-outline" size={22} color={COLORS.gray[500]} />
                        <Text style={{ fontSize: 14, color: isMemorialMode ? COLORS.gray[300] : COLORS.gray[700] }}>버전</Text>
                    </View>
                    <Text style={{ fontSize: 14, color: COLORS.gray[400] }}>1.0.0</Text>
                </View>
            </SectionCard>

            <View style={{ marginHorizontal: 16, marginBottom: 32 }}>
                <TouchableOpacity
                    onPress={handleSignOut}
                    disabled={signingOut}
                    style={[
                        styles.signoutBtn,
                        { backgroundColor: isMemorialMode ? "#1F0000" : COLORS.red[50] },
                    ]}
                >
                    {signingOut ? (
                        <ActivityIndicator color={COLORS.red[500]} />
                    ) : (
                        <Text style={{ color: COLORS.red[500], fontWeight: "600", fontSize: 14 }}>로그아웃</Text>
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
        <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
            <Text style={{
                fontSize: 12,
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 8,
                paddingHorizontal: 4,
                color: isMemorialMode ? COLORS.gray[500] : COLORS.gray[400],
            }}>
                {title}
            </Text>
            <View style={[
                styles.sectionCardInner,
                { backgroundColor: isMemorialMode ? COLORS.gray[900] : COLORS.white },
            ]}>
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
            style={[
                styles.settingsRow,
                { borderBottomColor: isMemorialMode ? COLORS.gray[800] : COLORS.gray[50] },
            ]}
        >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                {icon}
                <View>
                    <Text style={{
                        fontSize: 14,
                        color: labelColor ?? (isMemorialMode ? COLORS.gray[50] : COLORS.gray[900]),
                    }}>
                        {label}
                    </Text>
                    {sublabel && (
                        <Text style={{ fontSize: 12, color: COLORS.gray[400], marginTop: 2 }}>{sublabel}</Text>
                    )}
                </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.gray[400]} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    headerCard: {
        alignItems: "center",
        paddingTop: 32,
        paddingBottom: 24,
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 24,
    },
    avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
    avatarFallback: { alignItems: "center", justifyContent: "center" },
    badgeRow: { flexDirection: "row", gap: 8, marginTop: 12 },
    premiumBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 9999,
    },
    upgradeBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 9999,
        borderWidth: 1,
        borderColor: COLORS.memento[300],
    },
    pointBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 9999,
        backgroundColor: COLORS.gray[100],
    },
    sectionCardInner: { borderRadius: 16, overflow: "hidden" },
    settingsRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    petIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: COLORS.gray[100],
        alignItems: "center",
        justifyContent: "center",
    },
    versionRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    signoutBtn: {
        width: "100%",
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: "center",
        borderWidth: 1,
        borderColor: COLORS.red[200],
    },
});
