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
import { findBackgroundOrDefault } from "@/data/minihompyData";
import {
    getMyMinihompySettings, patchMinihompySettings, getMinimiInventory,
} from "@/lib/minihompy-api";
import type { MinihompySettings, PlacedMinimi, UserMinimiRow } from "@/types";
import AppHeader from "@/components/common/AppHeader";
import AppDrawer from "@/components/common/AppDrawer";
import PetSwitcher from "@/components/common/PetSwitcher";
import MinimiShopModal from "@/components/minihompy/MinimiShopModal";
import BackgroundShopModal from "@/components/minihompy/BackgroundShopModal";
import GuestbookModal from "@/components/minihompy/GuestbookModal";
import GreetingEditModal from "@/components/minihompy/GreetingEditModal";
import StageEditor from "@/components/minihompy/StageEditor";
import TouchParticles from "@/components/minihompy/TouchParticles";

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
const TIRED_DAILY = [
    "이제 좀 쉬자...",
    "헥헥, 너무 많이 놀았어",
    "잠깐만 쉬어도 될까?",
    "졸려졸려",
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
const TIRED_MEMORIAL = [
    "잠깐 같이 앉아 있을래?",
    "조용히 함께 있는 시간이 좋아.",
    "이대로 잠시...",
];

const TOUCH_PLAYFUL_THRESHOLD = 5;
const TOUCH_TIRED_THRESHOLD = 12;
const TOUCH_RESET_MS = 30_000;

export default function MinihompyScreen() {
    const router = useRouter();
    const { session, user, points, refreshProfile } = useAuth();
    const { selectedPet, isMemorialMode } = usePet();
    const { isDarkMode } = useDarkMode();

    const [settings, setSettings] = useState<MinihompySettings | null>(null);
    const [equippedSlug, setEquippedSlug] = useState<string | null>(null);
    const [ownedMinimis, setOwnedMinimis] = useState<UserMinimiRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [touchCount, setTouchCount] = useState(0);
    const [message, setMessage] = useState<string | null>(null);
    const [particleKey, setParticleKey] = useState(0); // 새로 터치할 때마다 +1 → 파티클 재생성
    const [particleVariant, setParticleVariant] = useState<"star" | "heart" | "rest">("star");
    const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const touchResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [shopOpen, setShopOpen] = useState(false);
    const [shopInitialFilter, setShopInitialFilter] = useState<"all" | "owned" | "dog" | "cat">("all");
    const [bgShopOpen, setBgShopOpen] = useState(false);
    const [guestbookOpen, setGuestbookOpen] = useState(false);
    const [greetingOpen, setGreetingOpen] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const accentColor = isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500];
    const accessToken = session?.access_token ?? null;
    const [stageEditing, setStageEditing] = useState(false);

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
            setOwnedMinimis(inv.owned);
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
        // 미니미가 배치/장착된 경우만 미니미 인사말. 그 외엔 터치 무반응 (혼동 방지)
        const hasMinimi = (settings?.placedMinimi && settings.placedMinimi.length > 0) || !!equippedSlug;
        if (!hasMinimi) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        const newCount = touchCount + 1;
        setTouchCount(newCount);

        // 3단계 진행:
        //  - 0~4: 인사말 (별 파티클)
        //  - 5~11: 장난스러운 반응 (하트 파티클)
        //  - 12+: 피곤/만족 (잔잔한 표시)
        const greetings = isMemorialMode ? GREETINGS_MEMORIAL : GREETINGS_DAILY;
        const playful = isMemorialMode ? PLAYFUL_MEMORIAL : PLAYFUL_DAILY;
        const tired = isMemorialMode ? TIRED_MEMORIAL : TIRED_DAILY;

        let pool: string[];
        let variant: "star" | "heart" | "rest";
        if (newCount >= TOUCH_TIRED_THRESHOLD) {
            pool = tired;
            variant = "rest";
        } else if (newCount >= TOUCH_PLAYFUL_THRESHOLD) {
            pool = playful;
            variant = "heart";
        } else {
            pool = greetings;
            variant = "star";
        }

        const msg = pool[Math.floor(Math.random() * pool.length)];
        setMessage(msg);
        setParticleVariant(variant);
        setParticleKey((k) => k + 1);

        if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
        messageTimerRef.current = setTimeout(() => setMessage(null), 2500);

        // 30초 동안 터치 없으면 카운트 리셋 (다시 인사말로 시작)
        if (touchResetTimerRef.current) clearTimeout(touchResetTimerRef.current);
        touchResetTimerRef.current = setTimeout(() => {
            setTouchCount(0);
        }, TOUCH_RESET_MS);
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
            setOwnedMinimis(inv.owned);
        } catch {}
        refreshProfile().catch(() => {});
    }

    function handlePlacedChanged(next: PlacedMinimi[]) {
        if (settings) setSettings({ ...settings, placedMinimi: next });
    }

    const bgSlug = settings?.backgroundSlug ?? "default_sky";
    const background = findBackgroundOrDefault(bgSlug);
    // equippedSlug는 StageEditor 내부에서 자체 처리. 단일 미니미 fallback 표시는 추후 추가.
    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.white;

    if (loading) {
        return (
            <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
                <AppHeader onOpenDrawer={() => setDrawerOpen(true)} />
                <AppDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
                <View style={styles.loadingBox}>
                    <ActivityIndicator color={accentColor} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
            <AppHeader onOpenDrawer={() => setDrawerOpen(true)} />
            <ScrollView
                style={styles.flex1}
                showsVerticalScrollIndicator={false}
                scrollEnabled={!stageEditing}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={accentColor} enabled={!stageEditing} />
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

                {/* Stage — 자유 배치 미니미가 있으면 StageEditor, 없으면 단일 장착 미니미 */}
                {(settings?.placedMinimi && settings.placedMinimi.length > 0) || ownedMinimis.length > 0 ? (
                    <View style={styles.stageWrap}>
                        {accessToken && (
                            <StageEditor
                                stageHeight={STAGE_HEIGHT}
                                background={background}
                                placedMinimi={settings?.placedMinimi ?? []}
                                ownedSlugs={ownedMinimis.map((o) => o.minimi_id)}
                                inventory={ownedMinimis}
                                accessToken={accessToken}
                                accentColor={accentColor}
                                isMemorialMode={isMemorialMode}
                                onChanged={handlePlacedChanged}
                                onEditingChange={setStageEditing}
                                onTouch={handleStageTouch}
                            />
                        )}
                        {/* 파티클 — 터치할 때마다 key 갱신되어 새로 마운트 */}
                        {particleKey > 0 && (
                            <TouchParticles
                                key={particleKey}
                                triggerKey={particleKey}
                                variant={particleVariant}
                                stageWidth={SCREEN_WIDTH - 32}
                                stageHeight={STAGE_HEIGHT}
                            />
                        )}
                        {/* 인사말 말풍선 (stage 위 절대 배치, pointerEvents=none으로 터치 통과) */}
                        {(message || settings?.greeting) && (
                            <View pointerEvents="none" style={styles.speechBubbleAbsolute}>
                                <Text style={styles.speechText}>
                                    {message ?? settings?.greeting ?? ""}
                                </Text>
                                <View style={styles.speechTail} />
                            </View>
                        )}
                    </View>
                ) : (
                    // 보유 미니미 0 + 배치 0 → 단일 stage + 상점 CTA
                    <View style={styles.stageWrap}>
                        <TouchableOpacity
                            activeOpacity={0.95}
                            onPress={handleStageTouch}
                            style={{ borderRadius: 24, overflow: "hidden", position: "relative" }}
                        >
                            <StageBackground background={background}>
                                {(message || settings?.greeting) && (
                                    <View style={styles.speechBubble}>
                                        <Text style={styles.speechText}>
                                            {message ?? settings?.greeting ?? ""}
                                        </Text>
                                        <View style={styles.speechTail} />
                                    </View>
                                )}

                                <View style={styles.minimiSlot}>
                                    {selectedPet?.profileImage ? (
                                        <Image source={{ uri: selectedPet.profileImage }} style={styles.petImg} />
                                    ) : (
                                        <View style={[styles.petImg, styles.petImgFallback]}>
                                            <Text style={{ fontSize: 56 }}>
                                                {selectedPet?.type === "강아지" ? "🐶" : selectedPet?.type === "고양이" ? "🐱" : "🐾"}
                                            </Text>
                                        </View>
                                    )}
                                    <Text style={styles.minimiName}>
                                        {selectedPet?.name ?? "내 친구"}
                                    </Text>
                                </View>

                                {/* 미니미 없으니 "탭해서 반응" 안내 X */}
                            </StageBackground>
                        </TouchableOpacity>

                        {/* 미니미 상점 CTA */}
                        <TouchableOpacity
                            onPress={() => setShopOpen(true)}
                            style={[styles.shopCta, { borderColor: accentColor + "40", backgroundColor: isDarkMode ? COLORS.gray[900] : "#fff" }]}
                            activeOpacity={0.85}
                        >
                            <View style={[styles.shopCtaIcon, { backgroundColor: accentColor + "15" }]}>
                                <Ionicons name="paw" size={18} color={accentColor} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.shopCtaTitle, { color: isDarkMode ? COLORS.white : COLORS.gray[900] }]}>
                                    미니미 캐릭터 만나보기
                                </Text>
                                <Text style={styles.shopCtaSub}>
                                    상점에서 미니미를 사면 스테이지에 자유롭게 배치할 수 있어요
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={accentColor} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* 액션 카드 (2 x 3 그리드) */}
                <View style={styles.actionGrid}>
                    <ActionCard
                        icon="paw"
                        label="미니미 상점"
                        sub="구매 · 장착"
                        color={COLORS.memento[500]}
                        bgColor={isDarkMode ? COLORS.gray[900] : COLORS.memento[50]}
                        onPress={() => { setShopInitialFilter("all"); setShopOpen(true); }}
                    />
                    <ActionCard
                        icon="library"
                        label={`내 미니미${ownedMinimis.length > 0 ? ` (${ownedMinimis.length})` : ""}`}
                        sub="컬렉션 · 장착"
                        color="#FB923C"
                        bgColor={isDarkMode ? COLORS.gray[900] : "#FFF7ED"}
                        onPress={() => { setShopInitialFilter("owned"); setShopOpen(true); }}
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

                {/* 인사말 편집 (탭하면 편집 모달) */}
                <TouchableOpacity
                    onPress={() => setGreetingOpen(true)}
                    activeOpacity={0.85}
                    style={styles.greetingHint}
                >
                    <View style={{ flex: 1 }}>
                        <Text style={styles.greetingHintTitle}>
                            {settings?.greeting ? "내 인사말" : "인사말 미설정"}
                        </Text>
                        <Text style={styles.greetingHintText}>
                            {settings?.greeting
                                ? `"${settings.greeting}"`
                                : "방문자에게 보여줄 인사말을 등록해보세요"}
                        </Text>
                    </View>
                    <Ionicons name="pencil" size={16} color={accentColor} />
                </TouchableOpacity>
            </ScrollView>

            {/* Drawer */}
            <AppDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />

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
                        initialFilter={shopInitialFilter}
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
                    <GreetingEditModal
                        visible={greetingOpen}
                        onClose={() => setGreetingOpen(false)}
                        accessToken={accessToken}
                        initialGreeting={settings?.greeting ?? ""}
                        accentColor={accentColor}
                        onSaved={(greeting) => {
                            if (settings) setSettings({ ...settings, greeting });
                        }}
                    />
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
    speechBubbleAbsolute: {
        position: "absolute",
        top: 32,
        alignSelf: "center",
        left: 0, right: 0,
        marginHorizontal: 60,
        backgroundColor: "rgba(255,255,255,0.95)",
        paddingHorizontal: 16, paddingVertical: 8,
        borderRadius: 16,
        shadowColor: "#000",
        shadowOpacity: 0.1, shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
        zIndex: 100,
        alignItems: "center",
    },
    tapAreaAbsolute: {
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 60,
        zIndex: 1,
    },
    shopCta: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginTop: 12,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
    },
    shopCtaIcon: {
        width: 36, height: 36, borderRadius: 12,
        alignItems: "center", justifyContent: "center",
    },
    shopCtaTitle: { fontSize: 14, fontWeight: "700" },
    shopCtaSub: { fontSize: 11, color: COLORS.gray[500], marginTop: 2 },
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
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
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
