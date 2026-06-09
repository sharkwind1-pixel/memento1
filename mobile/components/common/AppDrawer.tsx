/**
 * AppDrawer — 자체 구현 Modal 사이드바 (reanimated 의존 없이 Animated.Value)
 *
 * 햄버거 메뉴 클릭 시 좌측에서 슬라이드.
 * - 메뉴: 홈/기록/커뮤니티/AI펫톡/매거진/입양/지역/분실/펫홈
 * - 계정: 닉네임, 프로필, 로그아웃
 */

import { useEffect, useRef, useState } from "react";
import {
    Modal, View, Text, TouchableOpacity, Animated, Dimensions,
    Pressable, StyleSheet, ScrollView, Image, Linking,
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
import { getPointLevel, PRICING } from "@/config/constants";
import { POINT_LEVELS, ADMIN_ICONS, type PetIconType } from "@/lib/levels";

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
    { id: "local", label: "지역정보", icon: "location-outline", color: "#10B981", route: "/(tabs)/community?sub=local" },
    { id: "lost", label: "분실동물", icon: "alert-circle-outline", color: COLORS.memorial[500], route: "/(tabs)/community?sub=lost" },
];

export default function AppDrawer({ visible, onClose }: AppDrawerProps) {
    const router = useRouter();
    const { user, profile, points, isPremium, isAdminUser, signOut } = useAuth();
    const { isMemorialMode, selectedPet } = usePet();
    const { isDarkMode } = useDarkMode();
    const { isSimpleMode, toggleSimpleMode, fontScale, spacingScale, iconScale } = useSimpleMode();
    const [communityExpanded, setCommunityExpanded] = useState(false);
    const [pointsHistoryOpen, setPointsHistoryOpen] = useState(false);
    const [pointsShopOpen, setPointsShopOpen] = useState(false);
    const currentLevel = getPointLevel(points ?? 0);

    // 펫 종류 → 등급 아이콘 매핑 (pets.type: "강아지" | "고양이" | 그 외)
    const petType: PetIconType =
        selectedPet?.type === "강아지" ? "dog" :
        selectedPet?.type === "고양이" ? "cat" : "other";

    // 관리자는 ADMIN_ICONS PNG (별도 자산), 일반 유저는 현재 레벨 아이콘
    const levelIconSource = isAdminUser
        ? ADMIN_ICONS[petType]
        : (POINT_LEVELS.find((l) => l.level === currentLevel.level)?.icons[petType]
            ?? POINT_LEVELS[0].icons[petType]);

    const slideAnim = useRef(new Animated.Value(-DRAWER_W)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const accentColor = isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500];

    // 간편모드 비례 확대 (웹 zoom: 1.15 효과 모방)
    const sectionLabelStyle = {
        fontSize: 11 * fontScale,
        fontWeight: "600" as const,
        color: COLORS.gray[400],
        textTransform: "uppercase" as const,
        letterSpacing: 0.5,
        paddingHorizontal: 8 * spacingScale,
        marginBottom: 8 * spacingScale,
    };
    const menuItemStyle = {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 12 * spacingScale,
        paddingHorizontal: 12 * spacingScale,
        paddingVertical: 12 * spacingScale,
        borderRadius: 10,
    };
    const menuLabelStyle = {
        flex: 1,
        fontSize: 14 * fontScale,
        fontWeight: "500" as const,
    };
    const menuIconSize = 20 * iconScale;
    const chevronSize = 16 * iconScale;
    const subIconSize = 16 * iconScale;
    const subLabelStyle = {
        fontSize: 13 * fontScale,
        fontWeight: "500" as const,
    };
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

    // 사이드바 → 웹 결제 바로 연결 (앱 인앱결제 미연동, 웹에서 결제 후 동일 계정 로그인 시 적용)
    function openWebPayment() {
        onClose();
        setTimeout(() => {
            Linking.openURL("https://mementoani.com?tab=home#subscription").catch(() => {});
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
                            <Text style={[styles.userName, { fontSize: 16 * fontScale }]} numberOfLines={1}>{nickname}</Text>
                            <Text style={[styles.userEmail, { fontSize: 11 * fontScale }]} numberOfLines={1}>
                                {user?.email ?? ""}
                            </Text>
                            <View style={[styles.userBadges, { gap: 6 * spacingScale, marginTop: 8 * spacingScale }]}>
                                {isPremium && (
                                    <View style={styles.premiumBadge}>
                                        <Ionicons name="star" size={10 * iconScale} color="#fff" />
                                        <Text style={[styles.premiumBadgeText, { fontSize: 10 * fontScale }]}>프리미엄</Text>
                                    </View>
                                )}
                                <View style={styles.levelBadge}>
                                    <Text style={[styles.levelBadgeText, { fontSize: 10 * fontScale }]}>Lv.{currentLevel.level}</Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => setPointsHistoryOpen(true)}
                                    style={styles.pointBadge}
                                    activeOpacity={0.85}
                                    hitSlop={6}
                                >
                                    <Ionicons name="star" size={10 * iconScale} color={accentColor} />
                                    <Text style={[styles.pointBadgeText, { color: accentColor, fontSize: 10 * fontScale }]}>
                                        {(points ?? 0).toLocaleString()}P
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </LinearGradient>

                    {/* 크게 보기 토글 (웹 Sidebar.tsx 매칭 — 사용자 카드 바로 다음, 메뉴 위) */}
                    {user && (
                        <View style={[
                            styles.simpleModeBar,
                            {
                                borderBottomColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[100],
                                paddingHorizontal: 16 * spacingScale,
                                paddingVertical: 10 * spacingScale,
                            },
                        ]}>
                            <TouchableOpacity
                                onPress={toggleSimpleMode}
                                style={[styles.simpleModeBtn, {
                                    backgroundColor: isSimpleMode
                                        ? (isMemorialMode ? "rgba(245, 158, 11, 0.10)" : "rgba(5, 178, 220, 0.10)")
                                        : "transparent",
                                    paddingHorizontal: 12 * spacingScale,
                                    paddingVertical: 10 * spacingScale,
                                }]}
                                activeOpacity={0.75}
                            >
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 * spacingScale }}>
                                    <Ionicons
                                        name={isSimpleMode ? "eye" : "eye-outline"}
                                        size={20 * iconScale}
                                        color={isSimpleMode ? accentColor : (isDarkMode ? COLORS.gray[300] : COLORS.gray[600])}
                                    />
                                    <Text style={{
                                        color: isSimpleMode ? accentColor : (isDarkMode ? COLORS.gray[200] : COLORS.gray[800]),
                                        fontSize: 14 * fontScale,
                                        fontWeight: isSimpleMode ? "700" : "600",
                                    }}>
                                        크게 보기
                                    </Text>
                                </View>
                                <View style={[
                                    styles.toggleTrack,
                                    {
                                        width: 40 * spacingScale,
                                        height: 22 * spacingScale,
                                        borderRadius: 11 * spacingScale,
                                    },
                                    isSimpleMode && { backgroundColor: accentColor },
                                ]}>
                                    <View style={[
                                        styles.toggleThumb,
                                        {
                                            width: 18 * spacingScale,
                                            height: 18 * spacingScale,
                                            borderRadius: 9 * spacingScale,
                                        },
                                        isSimpleMode && { transform: [{ translateX: 18 * spacingScale }] },
                                    ]} />
                                </View>
                            </TouchableOpacity>
                            {isSimpleMode && (
                                <Text style={{
                                    fontSize: 11 * fontScale,
                                    color: isDarkMode ? COLORS.gray[500] : COLORS.gray[400],
                                    marginTop: 4,
                                    marginLeft: 12 * spacingScale + 12 + 20 * iconScale,
                                }}>
                                    글자·여백·아이콘이 함께 커집니다
                                </Text>
                            )}
                        </View>
                    )}

                    {/* 메뉴 */}
                    <ScrollView style={{ flex: 1 }}>
                        {/* 프리미엄 구독 결제 버튼 — 비프리미엄 유저에게만 (웹 결제로 바로 연결) */}
                        {user && !isPremium && (
                            <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
                                <TouchableOpacity activeOpacity={0.88} onPress={openWebPayment}>
                                    <LinearGradient
                                        colors={[COLORS.memento[500], COLORS.memento[400]]}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                        style={styles.premiumCta}
                                    >
                                        <View style={styles.premiumCtaIcon}>
                                            <Ionicons name="star" size={18 * iconScale} color="#fff" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.premiumCtaTitle, { fontSize: 14 * fontScale }]}>
                                                프리미엄 구독하기
                                            </Text>
                                            <Text style={[styles.premiumCtaSub, { fontSize: 11 * fontScale }]}>
                                                월 {PRICING.PREMIUM_MONTHLY.toLocaleString()}원 · AI 펫톡 무제한
                                            </Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={18 * iconScale} color="rgba(255,255,255,0.9)" />
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        )}

                        <View style={styles.menuSection}>
                            <Text style={sectionLabelStyle}>메뉴</Text>
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
                                        style={menuItemStyle}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name={m.icon} size={menuIconSize} color={isDarkMode ? COLORS.gray[300] : COLORS.gray[600]} />
                                        <Text style={[menuLabelStyle, {
                                            color: isDarkMode ? COLORS.gray[200] : COLORS.gray[800],
                                        }]}>
                                            {m.label}
                                        </Text>
                                        {m.hasSubcategories ? (
                                            <Ionicons
                                                name={communityExpanded ? "chevron-up" : "chevron-down"}
                                                size={chevronSize}
                                                color={COLORS.gray[400]}
                                            />
                                        ) : (
                                            <Ionicons name="chevron-forward" size={chevronSize} color={COLORS.gray[400]} />
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
                                                    <Ionicons name={s.icon} size={subIconSize} color={s.color} />
                                                    <Text style={[subLabelStyle, {
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
                                    style={[menuItemStyle, styles.adminMenuItem]}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="shield-checkmark" size={menuIconSize} color="#8B5CF6" />
                                    <Text style={[menuLabelStyle, { color: "#8B5CF6", fontWeight: "700" }]}>
                                        관리자 모드
                                    </Text>
                                    <Ionicons name="chevron-forward" size={chevronSize} color="#8B5CF6" />
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={[styles.menuSection, { marginTop: 16 }]}>
                            <Text style={sectionLabelStyle}>포인트</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    setPointsHistoryOpen(true);
                                }}
                                style={menuItemStyle}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="receipt-outline" size={menuIconSize} color={isDarkMode ? COLORS.gray[300] : COLORS.gray[600]} />
                                <Text style={[menuLabelStyle, {
                                    color: isDarkMode ? COLORS.gray[200] : COLORS.gray[800],
                                }]}>포인트 내역</Text>
                                <Text style={styles.pointHint}>{(points ?? 0).toLocaleString()}P</Text>
                                <Ionicons name="chevron-forward" size={chevronSize} color={COLORS.gray[400]} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => {
                                    setPointsShopOpen(true);
                                }}
                                style={menuItemStyle}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="bag-handle-outline" size={menuIconSize} color={COLORS.memorial[500]} />
                                <Text style={[menuLabelStyle, {
                                    color: isDarkMode ? COLORS.gray[200] : COLORS.gray[800],
                                }]}>포인트 상점</Text>
                                <Ionicons name="chevron-forward" size={chevronSize} color={COLORS.gray[400]} />
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.menuSection, { marginTop: 16 }]}>
                            <Text style={sectionLabelStyle}>계정</Text>
                            <TouchableOpacity
                                onPress={() => navigate("/profile")}
                                style={menuItemStyle}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="person-circle-outline" size={menuIconSize} color={isDarkMode ? COLORS.gray[300] : COLORS.gray[600]} />
                                <Text style={[menuLabelStyle, {
                                    color: isDarkMode ? COLORS.gray[200] : COLORS.gray[800],
                                }]}>프로필</Text>
                                <Ionicons name="chevron-forward" size={chevronSize} color={COLORS.gray[400]} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => navigate("/subscription")}
                                style={menuItemStyle}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="card-outline" size={menuIconSize} color={isDarkMode ? COLORS.gray[300] : COLORS.gray[600]} />
                                <Text style={[menuLabelStyle, {
                                    color: isDarkMode ? COLORS.gray[200] : COLORS.gray[800],
                                }]}>구독 관리</Text>
                                <Ionicons name="chevron-forward" size={chevronSize} color={COLORS.gray[400]} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => navigate("/notifications")}
                                style={menuItemStyle}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="notifications-outline" size={menuIconSize} color={isDarkMode ? COLORS.gray[300] : COLORS.gray[600]} />
                                <Text style={[menuLabelStyle, {
                                    color: isDarkMode ? COLORS.gray[200] : COLORS.gray[800],
                                }]}>알림</Text>
                                <Ionicons name="chevron-forward" size={chevronSize} color={COLORS.gray[400]} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSignOut}
                                style={menuItemStyle}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="log-out-outline" size={menuIconSize} color={COLORS.red[500]} />
                                <Text style={[menuLabelStyle, { color: COLORS.red[500] }]}>로그아웃</Text>
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
    premiumCta: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderRadius: 14,
        elevation: 3,
        shadowColor: COLORS.memento[500],
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    premiumCtaIcon: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: "rgba(255,255,255,0.25)",
        alignItems: "center", justifyContent: "center",
    },
    premiumCtaTitle: { fontSize: 14, fontWeight: "800", color: "#fff" },
    premiumCtaSub: { fontSize: 11, color: "rgba(255,255,255,0.9)", marginTop: 2 },
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
    simpleModeBar: {
        borderBottomWidth: 1,
    },
    simpleModeBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderRadius: 12,
    },
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
