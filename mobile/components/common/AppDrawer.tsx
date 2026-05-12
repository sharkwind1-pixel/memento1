/**
 * AppDrawer — 자체 구현 Modal 사이드바 (reanimated 의존 없이 Animated.Value)
 *
 * 햄버거 메뉴 클릭 시 좌측에서 슬라이드.
 * - 메뉴: 홈/기록/커뮤니티/AI펫톡/매거진/입양/지역/분실/미니홈피
 * - 계정: 닉네임, 프로필, 로그아웃
 */

import { useEffect, useRef, useState } from "react";
import {
    Modal, View, Text, TouchableOpacity, Animated, Dimensions,
    Pressable, StyleSheet, ScrollView, Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { useDarkMode } from "@/contexts/ThemeContext";
import { useSimpleMode } from "@/contexts/SimpleModeContext";
import { COLORS } from "@/lib/theme";
import PointsHistoryModal from "@/components/points/PointsHistoryModal";
import PointsShopModal from "@/components/points/PointsShopModal";
import { getPointLevel } from "@/config/constants";
import { POINT_LEVELS, type PetIconType } from "@/lib/levels";

const { width: SCREEN_W } = Dimensions.get("window");
const DRAWER_W = Math.min(SCREEN_W * 0.82, 320);

interface AppDrawerProps {
    visible: boolean;
    onClose: () => void;
}

// 웹 Sidebar.tsx와 동일 구조 (메인 5개)
const MAIN_MENU: Array<{
    id: string;
    label: string;
    icon: React.ComponentProps<typeof Ionicons>["name"];
    route: string;
    hasSubcategories?: boolean;
}> = [
    { id: "home", label: "홈", icon: "home-outline", route: "/(tabs)" },
    { id: "record", label: "내 기록", icon: "camera-outline", route: "/(tabs)/record" },
    { id: "community", label: "커뮤니티", icon: "people-outline", route: "/(tabs)/community", hasSubcategories: true },
    { id: "ai-chat", label: "AI 펫톡", icon: "chatbubble-ellipses-outline", route: "/(tabs)/ai-chat" },
    { id: "magazine", label: "매거진", icon: "book-outline", route: "/(tabs)/magazine" },
];

// 커뮤니티 서브카테고리 (웹과 동일)
const COMMUNITY_SUBS: Array<{
    id: string;
    label: string;
    icon: React.ComponentProps<typeof Ionicons>["name"];
    color: string;
    route: string;
}> = [
    { id: "free", label: "자유게시판", icon: "chatbox-outline", color: COLORS.memento[500], route: "/(tabs)/community" },
    { id: "memorial", label: "기억게시판", icon: "sparkles-outline", color: "#8B5CF6", route: "/(tabs)/community" },
    { id: "adoption", label: "입양정보", icon: "heart-outline", color: "#F43F5E", route: "/adoption" },
    { id: "local", label: "지역정보", icon: "location-outline", color: "#10B981", route: "/local" },
    { id: "lost", label: "분실동물", icon: "alert-circle-outline", color: COLORS.memorial[500], route: "/lost" },
];

export default function AppDrawer({ visible, onClose }: AppDrawerProps) {
    const router = useRouter();
    const { user, profile, points, isPremium, isAdminUser, signOut } = useAuth();
    const { isMemorialMode, selectedPet } = usePet();
    const { isDarkMode } = useDarkMode();
    const { isSimpleMode, toggleSimpleMode, fontScale } = useSimpleMode();
    const [communityExpanded, setCommunityExpanded] = useState(false);
    const [pointsHistoryOpen, setPointsHistoryOpen] = useState(false);
    const [pointsShopOpen, setPointsShopOpen] = useState(false);
    const currentLevel = getPointLevel(points ?? 0);

    // 펫 종류 → 등급 아이콘 매핑 (pets.type: "강아지" | "고양이" | 그 외)
    const petType: PetIconType =
        selectedPet?.type === "강아지" ? "dog" :
        selectedPet?.type === "고양이" ? "cat" : "other";

    // levels.ts에서 현재 레벨의 아이콘 png require 결과 (관리자면 어드민 등급)
    const levelIconSource = isAdminUser
        ? POINT_LEVELS[POINT_LEVELS.length - 1].icons[petType]
        : (POINT_LEVELS.find((l) => l.level === currentLevel.level)?.icons[petType]
            ?? POINT_LEVELS[0].icons[petType]);

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
                            backgroundColor: isDarkMode ? COLORS.gray[950] : COLORS.white,
                        },
                    ]}
                >
                    {/* 상단: 사용자 카드 */}
                    <LinearGradient colors={accentGradient} style={styles.userCard}>
                        {profile?.avatar ? (
                            <Image source={{ uri: profile.avatar }} style={styles.avatar} />
                        ) : (
                            // 웹과 동일하게 펫 종류 + 레벨에 따라 동물 등급 아이콘 표시 (이모지 X)
                            <View style={[styles.avatar, styles.avatarFallback]}>
                                <Image source={levelIconSource} style={styles.avatarLevelIcon} resizeMode="contain" />
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
                                <View style={styles.levelBadge}>
                                    <Text style={styles.levelBadgeText}>Lv.{currentLevel.level}</Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => setPointsHistoryOpen(true)}
                                    style={styles.pointBadge}
                                    activeOpacity={0.85}
                                    hitSlop={6}
                                >
                                    <Ionicons name="star" size={10} color={accentColor} />
                                    <Text style={[styles.pointBadgeText, { color: accentColor }]}>
                                        {(points ?? 0).toLocaleString()}P
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </LinearGradient>

                    {/* 메뉴 */}
                    <ScrollView style={{ flex: 1 }}>
                        <View style={styles.menuSection}>
                            <Text style={styles.sectionLabel}>메뉴</Text>
                            {MAIN_MENU.map((m) => (
                                <View key={m.id}>
                                    <TouchableOpacity
                                        onPress={() => {
                                            if (m.hasSubcategories) {
                                                setCommunityExpanded((v) => !v);
                                            } else {
                                                navigate(m.route);
                                            }
                                        }}
                                        style={styles.menuItem}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name={m.icon} size={20} color={isDarkMode ? COLORS.gray[300] : COLORS.gray[600]} />
                                        <Text style={[styles.menuLabel, {
                                            color: isDarkMode ? COLORS.gray[200] : COLORS.gray[800],
                                        }]}>
                                            {m.label}
                                        </Text>
                                        {m.hasSubcategories ? (
                                            <Ionicons
                                                name={communityExpanded ? "chevron-up" : "chevron-down"}
                                                size={16}
                                                color={COLORS.gray[400]}
                                            />
                                        ) : (
                                            <Ionicons name="chevron-forward" size={16} color={COLORS.gray[400]} />
                                        )}
                                    </TouchableOpacity>
                                    {m.hasSubcategories && communityExpanded && (
                                        <View style={styles.subMenu}>
                                            {COMMUNITY_SUBS.map((s) => (
                                                <TouchableOpacity
                                                    key={s.id}
                                                    onPress={() => navigate(s.route)}
                                                    style={styles.subMenuItem}
                                                    activeOpacity={0.7}
                                                >
                                                    <Ionicons name={s.icon} size={16} color={s.color} />
                                                    <Text style={[styles.subMenuLabel, {
                                                        color: isDarkMode ? COLORS.gray[300] : COLORS.gray[700],
                                                    }]}>
                                                        {s.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            ))}

                            {/* 관리자 메뉴 (관리자만 표시, 웹 Sidebar.tsx 매칭) */}
                            {isAdminUser && (
                                <TouchableOpacity
                                    onPress={() => navigate("/admin")}
                                    style={[styles.menuItem, styles.adminMenuItem]}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="shield-checkmark" size={20} color="#8B5CF6" />
                                    <Text style={[styles.menuLabel, { color: "#8B5CF6", fontWeight: "700" }]}>
                                        관리자 모드
                                    </Text>
                                    <Ionicons name="chevron-forward" size={16} color="#8B5CF6" />
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={[styles.menuSection, { marginTop: 16 }]}>
                            <Text style={styles.sectionLabel}>포인트</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    setPointsHistoryOpen(true);
                                }}
                                style={styles.menuItem}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="receipt-outline" size={20} color={isDarkMode ? COLORS.gray[300] : COLORS.gray[600]} />
                                <Text style={[styles.menuLabel, {
                                    color: isDarkMode ? COLORS.gray[200] : COLORS.gray[800],
                                }]}>포인트 내역</Text>
                                <Text style={styles.pointHint}>{(points ?? 0).toLocaleString()}P</Text>
                                <Ionicons name="chevron-forward" size={16} color={COLORS.gray[400]} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => {
                                    setPointsShopOpen(true);
                                }}
                                style={styles.menuItem}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="bag-handle-outline" size={20} color={COLORS.memorial[500]} />
                                <Text style={[styles.menuLabel, {
                                    color: isDarkMode ? COLORS.gray[200] : COLORS.gray[800],
                                }]}>포인트 상점</Text>
                                <Ionicons name="chevron-forward" size={16} color={COLORS.gray[400]} />
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.menuSection, { marginTop: 16 }]}>
                            <Text style={styles.sectionLabel}>계정</Text>
                            <TouchableOpacity
                                onPress={() => navigate("/profile")}
                                style={styles.menuItem}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="person-circle-outline" size={20} color={isDarkMode ? COLORS.gray[300] : COLORS.gray[600]} />
                                <Text style={[styles.menuLabel, {
                                    color: isDarkMode ? COLORS.gray[200] : COLORS.gray[800],
                                }]}>프로필</Text>
                                <Ionicons name="chevron-forward" size={16} color={COLORS.gray[400]} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => navigate("/subscription")}
                                style={styles.menuItem}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="card-outline" size={20} color={isDarkMode ? COLORS.gray[300] : COLORS.gray[600]} />
                                <Text style={[styles.menuLabel, {
                                    color: isDarkMode ? COLORS.gray[200] : COLORS.gray[800],
                                }]}>구독 관리</Text>
                                <Ionicons name="chevron-forward" size={16} color={COLORS.gray[400]} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => navigate("/notifications")}
                                style={styles.menuItem}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="notifications-outline" size={20} color={isDarkMode ? COLORS.gray[300] : COLORS.gray[600]} />
                                <Text style={[styles.menuLabel, {
                                    color: isDarkMode ? COLORS.gray[200] : COLORS.gray[800],
                                }]}>알림</Text>
                                <Ionicons name="chevron-forward" size={16} color={COLORS.gray[400]} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSignOut}
                                style={styles.menuItem}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="log-out-outline" size={20} color={COLORS.red[500]} />
                                <Text style={[styles.menuLabel, { color: COLORS.red[500], fontSize: 14 * fontScale }]}>로그아웃</Text>
                            </TouchableOpacity>
                        </View>

                        {/* 접근성: 크게 보기 토글 (웹 Sidebar 간편모드 매칭) */}
                        <View style={[styles.menuSection, { marginTop: 16 }]}>
                            <Text style={styles.sectionLabel}>접근성</Text>
                            <TouchableOpacity
                                onPress={toggleSimpleMode}
                                style={styles.menuItem}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name={isSimpleMode ? "eye" : "eye-outline"}
                                    size={20}
                                    color={isSimpleMode ? accentColor : (isDarkMode ? COLORS.gray[300] : COLORS.gray[600])}
                                />
                                <Text style={[styles.menuLabel, {
                                    color: isDarkMode ? COLORS.gray[200] : COLORS.gray[800],
                                    fontSize: 14 * fontScale,
                                    fontWeight: isSimpleMode ? "700" : "500",
                                }]}>
                                    크게 보기
                                </Text>
                                <View style={[
                                    styles.toggleTrack,
                                    isSimpleMode && { backgroundColor: accentColor },
                                ]}>
                                    <View style={[
                                        styles.toggleThumb,
                                        isSimpleMode && styles.toggleThumbOn,
                                    ]} />
                                </View>
                            </TouchableOpacity>
                            <Text style={[styles.simpleModeHint, { color: isDarkMode ? COLORS.gray[500] : COLORS.gray[400] }]}>
                                글자/버튼이 25% 더 커집니다
                            </Text>
                        </View>

                        <View style={{ height: 24 }} />
                    </ScrollView>

                    {/* 하단 footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>메멘토애니 v1.0.0</Text>
                    </View>
                </Animated.View>
            </View>

            {/* 포인트 모달 — Drawer 모달 내부에 렌더 (자체 Modal로 열림) */}
            <PointsHistoryModal
                visible={pointsHistoryOpen}
                onClose={() => setPointsHistoryOpen(false)}
            />
            <PointsShopModal
                visible={pointsShopOpen}
                onClose={() => setPointsShopOpen(false)}
            />
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
        overflow: "hidden",
    },
    avatarLevelIcon: { width: 44, height: 44 },
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
    levelBadge: {
        backgroundColor: "rgba(255,255,255,0.25)",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 9999,
    },
    levelBadgeText: { fontSize: 10, fontWeight: "700", color: "#fff" },
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
    toggleTrack: {
        width: 40,
        height: 22,
        borderRadius: 11,
        backgroundColor: "rgba(0,0,0,0.15)",
        padding: 2,
        justifyContent: "center",
    },
    toggleThumb: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: "#fff",
    },
    toggleThumbOn: {
        transform: [{ translateX: 18 }],
    },
    simpleModeHint: {
        fontSize: 11,
        marginTop: 4,
        marginLeft: 44,
    },
    pointHint: {
        fontSize: 11,
        color: COLORS.memento[600],
        fontWeight: "700",
        marginRight: 4,
    },
    adminMenuItem: {
        marginTop: 8,
        backgroundColor: "rgba(139, 92, 246, 0.08)",
        borderWidth: 1,
        borderColor: "rgba(139, 92, 246, 0.2)",
    },
    subMenu: { paddingLeft: 32, paddingRight: 4 },
    subMenuItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
    },
    subMenuLabel: { fontSize: 13, fontWeight: "500" },
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
