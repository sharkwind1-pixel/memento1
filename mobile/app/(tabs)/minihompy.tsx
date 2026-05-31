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
    getMyMinihompySettings, patchMinihompySettings, getMinimiInventory, getFurnitureInventory,
} from "@/lib/minihompy-api";
import type { MinihompySettings, PlacedMinimi, UserMinimiRow } from "@/types";
import AppHeader from "@/components/common/AppHeader";
import AppDrawer from "@/components/common/AppDrawer";
import PageBackground, { usePageBgColor } from "@/components/common/PageBackground";
import PetSwitcher from "@/components/common/PetSwitcher";
import MinimiShopModal from "@/components/minihompy/MinimiShopModal";
import MinihompyShopModal from "@/components/minihompy/MinihompyShopModal";
import BackgroundShopModal from "@/components/minihompy/BackgroundShopModal";
import GuestbookModal from "@/components/minihompy/GuestbookModal";
import GreetingEditModal from "@/components/minihompy/GreetingEditModal";
import StageEditor from "@/components/minihompy/StageEditor";
import TouchParticles from "@/components/minihompy/TouchParticles";
import VisitorsModal from "@/components/minihompy/VisitorsModal";
import { pickReaction, getTouchLevel } from "@/data/minimiReactions";
import type { Pet } from "@/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const STAGE_HEIGHT = 300;

const TOUCH_RESET_MS = 30_000;

// 반려동물 품종 → minimiReactions 슬러그 매핑
function getBreedSlug(pet: Pet | null): string {
    if (!pet) return "";
    const b = (pet.breed ?? "").toLowerCase();
    const t = pet.type;
    if (t === "강아지") {
        if (b.includes("말티") || b.includes("malti") || b.includes("비숑") || b.includes("푸들") || b.includes("포메")) return "maltipoo";
        if (b.includes("요크") || b.includes("york") || b.includes("치와와") || b.includes("닥스")) return "yorkshire";
        if (b.includes("골든") || b.includes("리트리버") || b.includes("golden") || b.includes("허스키") || b.includes("보더") || b.includes("진도") || b.includes("코카")) return "golden_retriever";
    } else if (t === "고양이") {
        if (b.includes("러시안") || b.includes("russian") || b.includes("샴")) return "russian_blue";
        if (b.includes("랙돌") || b.includes("ragdoll") || b.includes("스코티시") || b.includes("페르시안") || b.includes("메인쿤")) return "ragdoll";
        if (b.includes("코숏") || b.includes("치즈") || b.includes("먼치킨") || b.includes("아비") || b.includes("터키시")) return "cheese_cat";
    }
    return "";
}

export default function MinihompyScreen() {
    const router = useRouter();
    const { session, user, points, refreshProfile } = useAuth();
    const { selectedPet, isMemorialMode } = usePet();
    const { isDarkMode } = useDarkMode();

    const [settings, setSettings] = useState<MinihompySettings | null>(null);
    const [equippedSlug, setEquippedSlug] = useState<string | null>(null);
    const [ownedMinimis, setOwnedMinimis] = useState<UserMinimiRow[]>([]);
    const [ownedFurniture, setOwnedFurniture] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [touchCount, setTouchCount] = useState(0);
    const [message, setMessage] = useState<string | null>(null);
    const [particleKey, setParticleKey] = useState(0); // 새로 터치할 때마다 +1 → 파티클 재생성
    const [particleVariant, setParticleVariant] = useState<"star" | "heart" | "rest">("star");
    const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const touchResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [shopOpen, setShopOpen] = useState(false);              // 미니미 보관함(장착/판매/추가구매)
    const [unifiedShopOpen, setUnifiedShopOpen] = useState(false); // 통합 상점(미니미/가구/배경 구매)
    const [shopInitialFilter, setShopInitialFilter] = useState<"all" | "owned" | "dog" | "cat">("all");
    const [bgShopOpen, setBgShopOpen] = useState(false);
    const [guestbookOpen, setGuestbookOpen] = useState(false);
    const [greetingOpen, setGreetingOpen] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [visitorsOpen, setVisitorsOpen] = useState(false);

    const accentColor = isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500];
    const accessToken = session?.access_token ?? null;
    const [stageEditing, setStageEditing] = useState(false);

    const load = useCallback(async () => {
        if (!accessToken) {
            setLoading(false);
            return;
        }
        try {
            const [s, inv, furniture] = await Promise.all([
                getMyMinihompySettings(accessToken).catch(() => null),
                getMinimiInventory(accessToken).catch(() => ({ owned: [], equippedSlug: null })),
                getFurnitureInventory(accessToken).catch(() => []),
            ]);
            if (s) setSettings(s);
            setEquippedSlug(inv.equippedSlug);
            setOwnedMinimis(inv.owned);
            setOwnedFurniture(furniture.map((f) => f.furniture_id));
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

        const slug = getBreedSlug(selectedPet);
        const reaction = pickReaction(slug, isMemorialMode ? "memorial" : "daily", newCount);
        setMessage(reaction.message);

        const level = getTouchLevel(newCount);
        const variant: "star" | "heart" | "rest" =
            level === "greeting" ? "star" :
            level === "playful" ? "heart" : "rest";
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

    async function handleFurnitureChanged() {
        // 가구 인벤토리 + 포인트 갱신
        if (!accessToken) return;
        try {
            const furniture = await getFurnitureInventory(accessToken);
            setOwnedFurniture(furniture.map((f) => f.furniture_id));
        } catch {}
        refreshProfile().catch(() => {});
    }

    function handlePlacedChanged(next: PlacedMinimi[]) {
        if (settings) setSettings({ ...settings, placedMinimi: next });
    }

    const bgSlug = settings?.backgroundSlug ?? "room_default";
    const background = findBackgroundOrDefault(bgSlug);
    // equippedSlug는 StageEditor 내부에서 자체 처리. 단일 미니미 fallback 표시는 추후 추가.
    const bgColor = usePageBgColor();

    if (loading) {
        return (
            <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
                <PageBackground />
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
                            <TouchableOpacity
                                onPress={() => setVisitorsOpen(true)}
                                activeOpacity={0.7}
                                style={styles.statsRow}
                                hitSlop={4}
                            >
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
                                <Ionicons name="chevron-forward" size={11} color={COLORS.gray[400]} style={{ marginLeft: 2 }} />
                            </TouchableOpacity>
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
                                ownedFurniture={ownedFurniture}
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
                                {message && (
                                    <View style={styles.speechBubble}>
                                        <Text style={styles.speechText}>
                                            {message}
                                        </Text>
                                        <View style={styles.speechTail} />
                                    </View>
                                )}
                            </StageBackground>
                        </TouchableOpacity>

                        {/* 상점 CTA */}
                        <TouchableOpacity
                            onPress={() => setUnifiedShopOpen(true)}
                            style={[styles.shopCta, { borderColor: accentColor + "40", backgroundColor: isDarkMode ? COLORS.gray[900] : "#fff" }]}
                            activeOpacity={0.85}
                        >
                            <View style={[styles.shopCtaIcon, { backgroundColor: accentColor + "15" }]}>
                                <Ionicons name="paw" size={18} color={accentColor} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.shopCtaTitle, { color: isDarkMode ? COLORS.white : COLORS.gray[900] }]}>
                                    상점 둘러보기
                                </Text>
                                <Text style={styles.shopCtaSub}>
                                    미니미·가구·배경을 사서 나만의 공간을 꾸며보세요
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={accentColor} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* 액션 카드 (2 x 3 그리드) */}
                <View style={styles.actionGrid}>
                    <ActionCard
                        icon="storefront"
                        label="상점"
                        color={COLORS.memento[500]}
                        bgColor={isDarkMode ? COLORS.gray[900] : COLORS.memento[50]}
                        onPress={() => setUnifiedShopOpen(true)}
                    />
                    <ActionCard
                        icon="library"
                        label={`미니미${ownedMinimis.length > 0 ? ` ${ownedMinimis.length}` : ""}`}
                        color="#FB923C"
                        bgColor={isDarkMode ? COLORS.gray[900] : "#FFF7ED"}
                        onPress={() => { setShopInitialFilter("owned"); setShopOpen(true); }}
                    />
                    <ActionCard
                        icon="color-palette"
                        label="배경"
                        color="#8B5CF6"
                        bgColor={isDarkMode ? COLORS.gray[900] : "#F5F3FF"}
                        onPress={() => setBgShopOpen(true)}
                    />
                    <ActionCard
                        icon="chatbubbles"
                        label="방명록"
                        color={COLORS.memorial[500]}
                        bgColor={isDarkMode ? COLORS.gray[900] : COLORS.memorial[50]}
                        onPress={() => setGuestbookOpen(true)}
                    />
                    <ActionCard
                        icon={settings?.isPublic ? "lock-open" : "lock-closed"}
                        label={settings?.isPublic ? "공개" : "비공개"}
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
                    {/* 통합 상점 (미니미/가구/배경 구매) */}
                    <MinihompyShopModal
                        visible={unifiedShopOpen}
                        onClose={() => setUnifiedShopOpen(false)}
                        accessToken={accessToken}
                        points={points ?? 0}
                        onChanged={() => { handleShopChanged(); handleFurnitureChanged(); }}
                        accentColor={accentColor}
                        initialTab="minimi"
                    />
                    {/* 미니미 보관함 (보유 미니미 장착/판매/추가구매) */}
                    <MinimiShopModal
                        visible={shopOpen}
                        onClose={() => setShopOpen(false)}
                        accessToken={accessToken}
                        points={points ?? 0}
                        onChanged={handleShopChanged}
                        accentColor={accentColor}
                        initialFilter={shopInitialFilter}
                    />
                    {/* 배경 보관함 (보유 배경 적용 전용) */}
                    <BackgroundShopModal
                        visible={bgShopOpen}
                        onClose={() => setBgShopOpen(false)}
                        accessToken={accessToken}
                        points={points ?? 0}
                        currentSlug={bgSlug}
                        onApplied={handleBackgroundApplied}
                        accentColor={accentColor}
                        storageMode
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
                    <VisitorsModal
                        visible={visitorsOpen}
                        onClose={() => setVisitorsOpen(false)}
                        accentColor={accentColor}
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

function ActionCard({ icon, label, color, bgColor, onPress }: {
    icon: React.ComponentProps<typeof Ionicons>["name"];
    label: string;
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
                <Ionicons name={icon} size={16} color={color} />
            </View>
            <Text style={[styles.actionLabel, { color }]} numberOfLines={1}>{label}</Text>
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
        gap: 8,
        marginBottom: 16,
    },
    actionCard: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 8,
    },
    actionIconBg: {
        width: 28, height: 28, borderRadius: 8,
        alignItems: "center", justifyContent: "center",
    },
    actionLabel: { fontSize: 13, fontWeight: "700" },
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
