/**
 * AppDrawer — 자체 구현 Modal 사이드바 (reanimated 의존 없이 Animated.Value)
 *
 * 햄버거 메뉴 클릭 시 좌측에서 슬라이드.
 * - 메뉴: 홈/기록/커뮤니티/AI펫톡/매거진/입양/지역/분실/미니홈피
 * - 계정: 닉네임, 프로필, 로그아웃
 */

import { useEffect, useRef } from "react";
import {
    Modal, View, Text, TouchableOpacity, Animated, Dimensions,
    Pressable, StyleSheet, ScrollView, Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { COLORS } from "@/lib/theme";

const { width: SCREEN_W } = Dimensions.get("window");
const DRAWER_W = Math.min(SCREEN_W * 0.82, 320);

interface AppDrawerProps {
    visible: boolean;
    onClose: () => void;
}

const MENU: Array<{
    id: string;
    label: string;
    icon: React.ComponentProps<typeof Ionicons>["name"];
    route: string;
}> = [
    { id: "home", label: "홈", icon: "home-outline", route: "/(tabs)" },
    { id: "record", label: "내 기록", icon: "albums-outline", route: "/(tabs)/record" },
    { id: "community", label: "커뮤니티", icon: "people-outline", route: "/(tabs)/community" },
    { id: "ai-chat", label: "AI펫톡", icon: "chatbubble-ellipses-outline", route: "/(tabs)/ai-chat" },
    { id: "magazine", label: "펫매거진", icon: "book-outline", route: "/(tabs)/magazine" },
    { id: "adoption", label: "입양정보", icon: "home-outline", route: "/adoption" },
    { id: "local", label: "지역정보", icon: "location-outline", route: "/local" },
    { id: "lost", label: "분실동물", icon: "search-outline", route: "/lost" },
    { id: "minihompy", label: "미니홈피", icon: "star-outline", route: "/(tabs)/minihompy" },
];

export default function AppDrawer({ visible, onClose }: AppDrawerProps) {
    const router = useRouter();
    const { user, profile, points, isPremium, signOut } = useAuth();
    const { isMemorialMode } = usePet();

    const slideAnim = useRef(new Animated.Value(-DRAWER_W)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const accentColor = isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500];
    const accentGradient: [string, string] = isMemorialMode
        ? [COLORS.memorial[400], "#F97316"]
        : [COLORS.memento[400], COLORS.memento[500]];

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(slideAnim, { toValue: 0, duration: 240, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 1, duration: 240, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, { toValue: -DRAWER_W, duration: 200, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
            ]).start();
        }
    }, [visible, slideAnim, fadeAnim]);

    function navigate(route: string) {
        onClose();
        // 약간의 delay 후 navigate (애니메이션 자연스럽게)
        setTimeout(() => {
            router.push(route as never);
        }, 200);
    }

    async function handleSignOut() {
        onClose();
        setTimeout(async () => {
            await signOut();
            router.replace("/(auth)/login");
        }, 200);
    }

    const nickname = profile?.nickname
        ?? (user?.user_metadata?.nickname as string | undefined)
        ?? user?.email?.split("@")[0]
        ?? "사용자";

    return (
        <Modal
            visible={visible}
            transparent
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
                    <Pressable style={{ flex: 1 }} onPress={onClose} />
                </Animated.View>
                <Animated.View
                    style={[
                        styles.drawer,
                        {
                            width: DRAWER_W,
                            transform: [{ translateX: slideAnim }],
                            backgroundColor: isMemorialMode ? COLORS.gray[950] : COLORS.white,
                        },
                    ]}
                >
                    {/* 상단: 사용자 카드 */}
                    <LinearGradient colors={accentGradient} style={styles.userCard}>
                        {profile?.avatar ? (
                            <Image source={{ uri: profile.avatar }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.avatarFallback]}>
                                <Ionicons name="person" size={26} color="#fff" />
                            </View>
                        )}
                        <View style={{ flex: 1 }}>
                            <Text style={styles.userName} numberOfLines={1}>{nickname}</Text>
                            <Text style={styles.userEmail} numberOfLines={1}>
                                {user?.email ?? ""}
                            </Text>
                            <View style={styles.userBadges}>
                                {isPremium && (
                                    <View style={styles.premiumBadge}>
                                        <Ionicons name="star" size={10} color="#fff" />
                                        <Text style={styles.premiumBadgeText}>프리미엄</Text>
                                    </View>
                                )}
                                <View style={styles.pointBadge}>
                                    <Ionicons name="star" size={10} color={accentColor} />
                                    <Text style={[styles.pointBadgeText, { color: accentColor }]}>
                                        {(points ?? 0).toLocaleString()}P
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </LinearGradient>

                    {/* 메뉴 */}
                    <ScrollView style={{ flex: 1 }}>
                        <View style={styles.menuSection}>
                            <Text style={styles.sectionLabel}>메뉴</Text>
                            {MENU.map((m) => (
                                <TouchableOpacity
                                    key={m.id}
                                    onPress={() => navigate(m.route)}
                                    style={styles.menuItem}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name={m.icon} size={20} color={isMemorialMode ? COLORS.gray[300] : COLORS.gray[600]} />
                                    <Text style={[styles.menuLabel, {
                                        color: isMemorialMode ? COLORS.gray[200] : COLORS.gray[800],
                                    }]}>
                                        {m.label}
                                    </Text>
                                    <Ionicons name="chevron-forward" size={16} color={COLORS.gray[400]} />
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={[styles.menuSection, { marginTop: 16 }]}>
                            <Text style={styles.sectionLabel}>계정</Text>
                            <TouchableOpacity
                                onPress={() => navigate("/profile")}
                                style={styles.menuItem}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="person-circle-outline" size={20} color={isMemorialMode ? COLORS.gray[300] : COLORS.gray[600]} />
                                <Text style={[styles.menuLabel, {
                                    color: isMemorialMode ? COLORS.gray[200] : COLORS.gray[800],
                                }]}>프로필</Text>
                                <Ionicons name="chevron-forward" size={16} color={COLORS.gray[400]} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => navigate("/subscription")}
                                style={styles.menuItem}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="card-outline" size={20} color={isMemorialMode ? COLORS.gray[300] : COLORS.gray[600]} />
                                <Text style={[styles.menuLabel, {
                                    color: isMemorialMode ? COLORS.gray[200] : COLORS.gray[800],
                                }]}>구독 관리</Text>
                                <Ionicons name="chevron-forward" size={16} color={COLORS.gray[400]} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => navigate("/notifications")}
                                style={styles.menuItem}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="notifications-outline" size={20} color={isMemorialMode ? COLORS.gray[300] : COLORS.gray[600]} />
                                <Text style={[styles.menuLabel, {
                                    color: isMemorialMode ? COLORS.gray[200] : COLORS.gray[800],
                                }]}>알림</Text>
                                <Ionicons name="chevron-forward" size={16} color={COLORS.gray[400]} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSignOut}
                                style={styles.menuItem}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="log-out-outline" size={20} color={COLORS.red[500]} />
                                <Text style={[styles.menuLabel, { color: COLORS.red[500] }]}>로그아웃</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={{ height: 24 }} />
                    </ScrollView>

                    {/* 하단 footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>메멘토애니 v1.0.0</Text>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, flexDirection: "row" },
    backdrop: {
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0,0,0,0.4)",
    },
    drawer: {
        height: "100%",
        elevation: 16,
        shadowColor: "#000",
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
    },
    userCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 20,
        paddingTop: 56,
    },
    avatar: { width: 52, height: 52, borderRadius: 26 },
    avatarFallback: {
        backgroundColor: "rgba(255,255,255,0.3)",
        alignItems: "center",
        justifyContent: "center",
    },
    userName: { fontSize: 16, fontWeight: "700", color: "#fff" },
    userEmail: { fontSize: 11, color: "rgba(255,255,255,0.85)", marginTop: 2 },
    userBadges: { flexDirection: "row", gap: 6, marginTop: 8 },
    premiumBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        backgroundColor: "rgba(255,255,255,0.25)",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 9999,
    },
    premiumBadgeText: { fontSize: 10, fontWeight: "600", color: "#fff" },
    pointBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        backgroundColor: "rgba(255,255,255,0.85)",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 9999,
    },
    pointBadgeText: { fontSize: 10, fontWeight: "600" },
    menuSection: { paddingHorizontal: 16, paddingTop: 16 },
    sectionLabel: {
        fontSize: 11,
        fontWeight: "600",
        color: COLORS.gray[400],
        textTransform: "uppercase",
        letterSpacing: 0.5,
        paddingHorizontal: 8,
        marginBottom: 8,
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 10,
    },
    menuLabel: { flex: 1, fontSize: 14, fontWeight: "500" },
    footer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: "rgba(0,0,0,0.06)",
    },
    footerText: {
        fontSize: 11,
        color: COLORS.gray[400],
        textAlign: "center",
    },
});
