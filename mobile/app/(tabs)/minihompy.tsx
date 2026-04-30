/**
 * 미니홈피 탭 — 웹 src/components/features/minihompy/MiniHomepyTab.tsx 1:1 이식
 *
 *  - settings GET → 배경 적용 + 인사말 표시
 *  - inventory GET → 장착된 미니미 stage에 표시
 *  - stage 터치 → 미니미 인사말 (인벤토리 + 모드 + 연속터치 기반)
 *  - 4개 액션: 미니미 상점 / 배경 / 방명록 / 공개 토글
 *  - 변경 시 settings refresh
 */

import { useEffect, useState, useCallback, useRef } from "react";
import {
    View, Text, ScrollView, TouchableOpacity,
    Image, Dimensions, StyleSheet, ActivityIndicator,
    Alert, ImageBackground, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { useDarkMode } from "@/contexts/ThemeContext";
import { COLORS } from "@/lib/theme";
import { findMinimi, findBackgroundOrDefault } from "@/data/minihompyData";
import {
    getMyMinihompySettings, patchMinihompySettings, getMinimiInventory,
} from "@/lib/minihompy-api";
import type { MinihompySettings } from "@/types";
import AppHeader from "@/components/common/AppHeader";
import AppDrawer from "@/components/common/AppDrawer";
import PetSwitcher from "@/components/common/PetSwitcher";
import MinimiShopModal from "@/components/minihompy/MinimiShopModal";
import BackgroundShopModal from "@/components/minihompy/BackgroundShopModal";
import GuestbookModal from "@/components/minihompy/GuestbookModal";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const STAGE_HEIGHT = 300;

const GREETINGS_DAILY = [
    "반가워! 오늘도 왔구나!",
    "헤헤, 또 만났네!",
    "오늘 뭐 했어?",
    "나 보고 싶었지?",
    "같이 놀자!",
];
const PLAYFUL_DAILY = [
    "간지러워~",
    "야야야 그만 건드려",
    "흐흐 좋긴 한데...",
    "기분 좋다",
];
const GREETINGS_MEMORIAL = [
    "오늘도 보러 와줘서 고마워.",
    "여기서 항상 기다리고 있을게.",
    "잊지 않아줘서 고마워.",
    "나는 늘 너랑 같이 있어.",
];
const PLAYFUL_MEMORIAL = [
    "이렇게 만져주니까 따뜻해.",
    "예전 생각이 나네.",
    "고마워, 정말.",
];

export default function MinihompyScreen() {
    const router = useRouter();
    const { session, user, points, refreshProfile } = useAuth();
    const { selectedPet, isMemorialMode } = usePet();
    const { isDarkMode } = useDarkMode();

    const [settings, setSettings] = useState<MinihompySettings | null>(null);
    const [equippedSlug, setEquippedSlug] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [touchCount, setTouchCount] = useState(0);
    const [message, setMessage] = useState<string | null>(null);
    const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [shopOpen, setShopOpen] = useState(false);
    const [bgShopOpen, setBgShopOpen] = useState(false);
    const [guestbookOpen, setGuestbookOpen] = useState(false);

    const accentColor = isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500];
    const accessToken = session?.access_token ?? null;

    const load = useCallback(async () => {
        if (!accessToken) {
            setLoading(false);
            return;
        }
        try {
            const [s, inv] = await Promise.all([
                getMyMinihompySettings(accessToken).catch(() => null),
                getMinimiInventory(accessToken).catch(() => ({ owned: [], equippedSlug: null })),
            ]);
            if (s) setSettings(s);
            setEquippedSlug(inv.equippedSlug);
        } finally {
            setLoading(false);
        }
    }, [accessToken]);

    useEffect(() => {
        load();
    }, [load]);

    async function handleRefresh() {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    }

    function handleStageTouch() {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        const newCount = touchCount + 1;
        setTouchCount(newCount);

        const greetings = isMemorialMode ? GREETINGS_MEMORIAL : GREETINGS_DAILY;
        const playful = isMemorialMode ? PLAYFUL_MEMORIAL : PLAYFUL_DAILY;
        const pool = newCount >= 5 ? playful : greetings;
        const msg = pool[Math.floor(Math.random() * pool.length)];
        setMessage(msg);

        if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
        messageTimerRef.current = setTimeout(() => setMessage(null), 2500);
    }

    async function togglePublic() {
        if (!accessToken || !settings) return;
        const next = !settings.isPublic;
        // 낙관적 업데이트
        setSettings({ ...settings, isPublic: next });
        try {
            const updated = await patchMinihompySettings(accessToken, { isPublic: next });
            setSettings(updated);
        } catch (e) {
            // 롤백
            setSettings({ ...settings, isPublic: !next });
            Alert.alert("실패", e instanceof Error ? e.message : "공개 설정 변경 실패");
        }
    }

    function handleBackgroundApplied(slug: string) {
        if (settings) setSettings({ ...settings, backgroundSlug: slug });
        setBgShopOpen(false);
    }

    async function handleShopChanged() {
        // 인벤토리/장착 + 포인트 갱신
        if (!accessToken) return;
        try {
            const inv = await getMinimiInventory(accessToken);
            setEquippedSlug(inv.equippedSlug);
        } catch {}
        refreshProfile().catch(() => {});
    }

    const bgSlug = settings?.backgroundSlug ?? "default_sky";
    const background = findBackgroundOrDefault(bgSlug);
    const equippedMinimi = equippedSlug ? findMinimi(equippedSlug) : null;
    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.white;

    if (loading) {
        return (
            <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
                <AppHeader />
                <View style={styles.loadingBox}>
                    <ActivityIndicator color={accentColor} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
            <AppHeader />
            <ScrollView
                style={styles.flex1}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={accentColor} />
                }
            >
                <View style={styles.headerRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.title, { color: isDarkMode ? COLORS.white : COLORS.gray[900] }]}>
                            미니홈피
                        </Text>
                        {settings && (
                            <View style={styles.statsRow}>
                                <Text style={styles.statsText}>
                                    오늘 방문 {settings.todayVisitors ?? 0}
                                </Text>
                                <Text style={styles.statsDot}>·</Text>
                                <Text style={styles.statsText}>
                                    누적 {settings.totalVisitors ?? 0}
                                </Text>
                                <Text style={styles.statsDot}>·</Text>
                                <Text style={styles.statsText}>
                                    좋아요 {settings.totalLikes ?? 0}
                                </Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.pointPill}>
                        <Ionicons name="star" size={13} color={COLORS.memento[500]} />
                        <Text style={styles.pointText}>
                            {(points ?? 0).toLocaleString()}P
                        </Text>
                    </View>
                </View>

                <PetSwitcher accentColor={accentColor} onAddPet={() => router.push("/pet/new")} />

                {/* Stage */}
                <TouchableOpacity
                    activeOpacity={0.95}
                    onPress={handleStageTouch}
                    style={styles.stageWrap}
                >
                    <StageBackground background={background}>
                        {/* 인사말 말풍선 (settings.greeting 또는 터치 메시지) */}
                        {(message || settings?.greeting) && (
                            <View style={styles.speechBubble}>
                                <Text style={styles.speechText}>
                                    {message ?? settings?.greeting ?? ""}
                                </Text>
                                <View style={styles.speechTail} />
                            </View>
                        )}

                        {/* 장착된 미니미 (없으면 펫 프로필 폴백) */}
                        <View style={styles.minimiSlot}>
                            {equippedMinimi ? (
                                <Image source={{ uri: equippedMinimi.imageUrl }} style={styles.minimiImg} resizeMode="contain" />
                            ) : selectedPet?.profileImage ? (
                                <Image source={{ uri: selectedPet.profileImage }} style={styles.petImg} />
                            ) : (
                                <View style={[styles.petImg, styles.petImgFallback]}>
                                    <Text style={{ fontSize: 56 }}>
                                        {selectedPet?.type === "강아지" ? "🐶" : selectedPet?.type === "고양이" ? "🐱" : "🐾"}
                                    </Text>
                                </View>
                            )}
                            <Text style={styles.minimiName}>
                                {equippedMinimi?.name ?? selectedPet?.name ?? "미니미"}
                            </Text>
                        </View>

                        <Text style={styles.tapHint}>탭해서 반응 보기</Text>
                    </StageBackground>
                </TouchableOpacity>

                {/* 4개 액션 카드 */}
                <View style={styles.actionGrid}>
                    <ActionCard
                        icon="paw"
                        label="미니미 상점"
                        sub="구매 · 장착"
                        color={COLORS.memento[500]}
                        bgColor={isDarkMode ? COLORS.gray[900] : COLORS.memento[50]}
                        onPress={() => setShopOpen(true)}
                    />
                    <ActionCard
                        icon="color-palette"
                        label="배경 테마"
                        sub="선택 · 구매"
                        color="#8B5CF6"
                        bgColor={isDarkMode ? COLORS.gray[900] : "#F5F3FF"}
                        onPress={() => setBgShopOpen(true)}
                    />
                    <ActionCard
                        icon="chatbubbles"
                        label="방명록"
                        sub="메시지 보기"
                        color={COLORS.memorial[500]}
                        bgColor={isDarkMode ? COLORS.gray[900] : COLORS.memorial[50]}
                        onPress={() => setGuestbookOpen(true)}
                    />
                    <ActionCard
                        icon={settings?.isPublic ? "lock-open" : "lock-closed"}
                        label={settings?.isPublic ? "공개 중" : "비공개"}
                        sub="탭해서 전환"
                        color={settings?.isPublic ? "#10B981" : "#6B7280"}
                        bgColor={isDarkMode ? COLORS.gray[900] : (settings?.isPublic ? "#ECFDF5" : "#F3F4F6")}
                        onPress={togglePublic}
                    />
                </View>

                {/* 인사말 편집 안내 */}
                <View style={styles.greetingHint}>
                    <Text style={styles.greetingHintTitle}>
                        {settings?.greeting ? "내 인사말" : "인사말 미설정"}
                    </Text>
                    <Text style={styles.greetingHintText}>
                        {settings?.greeting
                            ? `"${settings.greeting}"`
                            : "방문자에게 보여줄 인사말을 등록할 수 있어요. (웹에서 설정)"}
                    </Text>
                </View>
            </ScrollView>

            {/* Drawer */}
            <AppDrawer visible={false} onClose={() => {}} />

            {/* 모달들 */}
            {accessToken && (
                <>
                    <MinimiShopModal
                        visible={shopOpen}
                        onClose={() => setShopOpen(false)}
                        accessToken={accessToken}
                        points={points ?? 0}
                        onChanged={handleShopChanged}
                        accentColor={accentColor}
                    />
                    <BackgroundShopModal
                        visible={bgShopOpen}
                        onClose={() => setBgShopOpen(false)}
                        accessToken={accessToken}
                        points={points ?? 0}
                        currentSlug={bgSlug}
                        onApplied={handleBackgroundApplied}
                        accentColor={accentColor}
                    />
                    {user && (
                        <GuestbookModal
                            visible={guestbookOpen}
                            onClose={() => setGuestbookOpen(false)}
                            accessToken={accessToken}
                            ownerUserId={user.id}
                            accentColor={accentColor}
                        />
                    )}
                </>
            )}
        </SafeAreaView>
    );
}

// ============================================================================
// 헬퍼 컴포넌트
// ============================================================================

function StageBackground({
    background, children,
}: {
    background: ReturnType<typeof findBackgroundOrDefault>;
    children: React.ReactNode;
}) {
    if (background.imageUrl) {
        return (
            <ImageBackground
                source={{ uri: background.imageUrl }}
                style={styles.stage}
                imageStyle={{ borderRadius: 24 }}
                resizeMode="cover"
            >
                {children}
            </ImageBackground>
        );
    }
    return (
        <View style={[styles.stage, { backgroundColor: background.cssBackground }]}>
            {children}
        </View>
    );
}

function ActionCard({ icon, label, sub, color, bgColor, onPress }: {
    icon: React.ComponentProps<typeof Ionicons>["name"];
    label: string;
    sub: string;
    color: string;
    bgColor: string;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.85}
            style={[styles.actionCard, { backgroundColor: bgColor }]}
        >
            <View style={[styles.actionIconBg, { backgroundColor: color + "20" }]}>
                <Ionicons name={icon} size={20} color={color} />
            </View>
            <Text style={styles.actionLabel}>{label}</Text>
            <Text style={styles.actionSub}>{sub}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 8,
    },
    title: { fontSize: 22, fontWeight: "800" },
    statsRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
    statsText: { fontSize: 11, color: COLORS.gray[500], fontWeight: "500" },
    statsDot: { color: COLORS.gray[300], fontSize: 11 },
    pointPill: {
        flexDirection: "row", alignItems: "center", gap: 6,
        backgroundColor: COLORS.memento[50],
        borderRadius: 9999,
        paddingHorizontal: 12, paddingVertical: 6,
    },
    pointText: { color: COLORS.memento[600], fontSize: 12, fontWeight: "700" },
    stageWrap: {
        marginHorizontal: 20,
        marginBottom: 16,
    },
    stage: {
        height: STAGE_HEIGHT,
        borderRadius: 24,
        overflow: "hidden",
        position: "relative",
    },
    speechBubble: {
        position: "absolute",
        top: 24,
        alignSelf: "center",
        backgroundColor: "rgba(255,255,255,0.95)",
        paddingHorizontal: 16, paddingVertical: 8,
        borderRadius: 16,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
        maxWidth: SCREEN_WIDTH - 80,
    },
    speechText: { fontSize: 13, fontWeight: "600", color: COLORS.gray[900] },
    speechTail: {
        position: "absolute",
        bottom: -7,
        alignSelf: "center",
        width: 0, height: 0,
        borderLeftWidth: 7,
        borderRightWidth: 7,
        borderTopWidth: 8,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderTopColor: "rgba(255,255,255,0.95)",
    },
    minimiSlot: {
        position: "absolute",
        bottom: 28,
        alignSelf: "center",
        alignItems: "center",
    },
    minimiImg: { width: 140, height: 140 },
    petImg: {
        width: 120, height: 120, borderRadius: 60,
        borderWidth: 4, borderColor: "#fff",
    },
    petImgFallback: {
        backgroundColor: "#FAFAFA",
        alignItems: "center", justifyContent: "center",
    },
    minimiName: {
        marginTop: 4,
        fontSize: 13, fontWeight: "700",
        color: "#111827",
        textShadowColor: "rgba(255,255,255,0.8)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    tapHint: {
        position: "absolute",
        bottom: 8,
        alignSelf: "center",
        fontSize: 10, color: "rgba(255,255,255,0.85)",
        textShadowColor: "rgba(0,0,0,0.5)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    actionGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        paddingHorizontal: 20,
        gap: 10,
        marginBottom: 16,
    },
    actionCard: {
        width: (SCREEN_WIDTH - 50) / 2,
        borderRadius: 16,
        padding: 14,
        gap: 8,
    },
    actionIconBg: {
        width: 36, height: 36, borderRadius: 12,
        alignItems: "center", justifyContent: "center",
    },
    actionLabel: { fontSize: 14, fontWeight: "700", color: COLORS.gray[900] },
    actionSub: { fontSize: 11, color: COLORS.gray[500] },
    greetingHint: {
        marginHorizontal: 20,
        marginBottom: 32,
        padding: 14,
        borderRadius: 14,
        backgroundColor: COLORS.gray[50],
        borderWidth: 1,
        borderColor: COLORS.gray[100],
    },
    greetingHintTitle: { fontSize: 12, fontWeight: "700", color: COLORS.gray[700] },
    greetingHintText: { fontSize: 12, color: COLORS.gray[500], marginTop: 4, lineHeight: 18 },
});
