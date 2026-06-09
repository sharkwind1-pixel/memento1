/**
 * HeroSection — 홈 화면 상단 히어로
 *
 * 3가지 모드:
 *  1. 비로그인: 기존 히어로 (일러스트 + "특별한 매일을 함께" + CTA)
 *  2. 로그인 + 미니미 없음: 쇼케이스 이미지 + 탭 → 미니홈피 탭으로 이동
 *  3. 로그인 + 미니미 있음: 개인 미니홈피 미리보기 + 탭 → 미니홈피 탭으로 이동
 */

import { useEffect, useState, useCallback } from "react";
import {
    View, Text, Image, TouchableOpacity, StyleSheet,
    ImageBackground, Dimensions, Modal, ScrollView, Pressable,
} from "react-native";
import { useDarkMode } from "@/contexts/ThemeContext";
import { useSimpleMode } from "@/contexts/SimpleModeContext";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Session } from "@supabase/supabase-js";
import { COLORS } from "@/lib/theme";
import { getMyMinihompySettings, getMinimiInventory } from "@/lib/minihompy-api";
import { findMinimiOrFallback, findBackgroundOrDefault } from "@/data/minihompyData";
import type { MinihompySettings, UserMinimiRow } from "@/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HERO_STAGE_HEIGHT = 260;

interface Props {
    session: Session | null;
    isMemorialMode: boolean;
}

export default function HeroSection({ session, isMemorialMode }: Props) {
    const { isDarkMode } = useDarkMode();
    const { fontScale, spacingScale, iconScale } = useSimpleMode();
    const router = useRouter();
    const accessToken = session?.access_token ?? null;

    // 미니홈피 데이터 (로그인 유저만)
    const [settings, setSettings] = useState<MinihompySettings | null>(null);
    const [ownedMinimis, setOwnedMinimis] = useState<UserMinimiRow[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (!accessToken) {
            setLoaded(true);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const [s, inv] = await Promise.all([
                    getMyMinihompySettings(accessToken).catch(() => null),
                    getMinimiInventory(accessToken).catch(() => ({ owned: [], equippedSlug: null })),
                ]);
                if (cancelled) return;
                if (s) setSettings(s);
                setOwnedMinimis(inv.owned);
            } finally {
                if (!cancelled) setLoaded(true);
            }
        })();
        return () => { cancelled = true; };
    }, [accessToken]);

    const [guideOpen, setGuideOpen] = useState(false);

    const hasMinimi = ownedMinimis.length > 0;
    const hasPlacedMinimi = (settings?.placedMinimi?.length ?? 0) > 0;

    // --- 비로그인: 기존 히어로 ---
    if (!session) {
        return <OriginalHero isMemorialMode={isMemorialMode} isDarkMode={isDarkMode} fontScale={fontScale} spacingScale={spacingScale} iconScale={iconScale} onCta={() => router.push("/(auth)/login")} onSecondary={() => router.push("/(tabs)/community")} />;
    }

    // 로딩 중이면 기존 히어로 잠깐 보여줌 (깜빡임 방지)
    if (!loaded) {
        return <OriginalHero isMemorialMode={isMemorialMode} isDarkMode={isDarkMode} fontScale={fontScale} spacingScale={spacingScale} iconScale={iconScale} onCta={() => router.push("/(tabs)/ai-chat")} onSecondary={() => router.push("/(tabs)/community")} ctaText="지금 만나러 가기" />;
    }

    // --- 추모 모드: 미니홈피/미니미를 히어로에 노출하지 않음 (추모 정서 보호) ---
    // 미니미·미니홈피는 일상(꾸미기) 요소라 추모 모드에선 추모 전용 히어로만 보여준다. (웹 HeroSection과 동일)
    if (isMemorialMode) {
        return <OriginalHero isMemorialMode isDarkMode={isDarkMode} fontScale={fontScale} spacingScale={spacingScale} iconScale={iconScale} onCta={() => router.push("/(tabs)/ai-chat")} onSecondary={() => router.push("/(tabs)/community")} ctaText="지금 만나러 가기" />;
    }

    // --- 로그인 + 미니미 있음: 개인 미니홈피 프리뷰 ---
    if (hasMinimi && hasPlacedMinimi) {
        const bg = findBackgroundOrDefault(settings?.backgroundSlug ?? "default_sky");
        return (
            <View style={styles.section}>
                <TouchableOpacity
                    activeOpacity={0.92}
                    onPress={() => router.push("/(tabs)/minihompy")}
                    style={styles.card}
                >
                    {bg.imageUrl ? (
                        <ImageBackground
                            source={{ uri: bg.imageUrl }}
                            style={[styles.personalStage, { height: HERO_STAGE_HEIGHT }]}
                            imageStyle={{ borderRadius: 24 }}
                            resizeMode="cover"
                        >
                            <PersonalOverlay settings={settings} isMemorialMode={isMemorialMode} isDarkMode={isDarkMode} />
                        </ImageBackground>
                    ) : (
                        <View style={[styles.personalStage, { height: HERO_STAGE_HEIGHT, backgroundColor: bg.cssBackground, borderRadius: 24 }]}>
                            <PersonalOverlay settings={settings} isMemorialMode={isMemorialMode} isDarkMode={isDarkMode} />
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        );
    }

    // --- 로그인 + 미니미 없음: 쇼케이스 히어로 ---
    return (
        <View style={styles.section}>
            <TouchableOpacity
                activeOpacity={0.92}
                onPress={() => setGuideOpen(true)}
                style={styles.card}
            >
                <Image
                    source={require("@/assets/hero-showcase.jpg")}
                    style={[styles.showcaseImage, { height: HERO_STAGE_HEIGHT }]}
                    resizeMode="cover"
                />
                {/* 하단 오버레이 — CTA */}
                <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.65)"]}
                    style={styles.showcaseOverlay}
                >
                    <View style={styles.showcaseCtaRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.showcaseTitle}>나만의 미니홈피</Text>
                            <Text style={styles.showcaseSub}>미니미를 모으고, 내 공간을 꾸며보세요</Text>
                        </View>
                        <View style={styles.showcaseArrow}>
                            <Ionicons name="arrow-forward" size={18} color="#fff" />
                        </View>
                    </View>
                </LinearGradient>
            </TouchableOpacity>

            {/* 미니홈피 안내 가이드 모달 */}
            <MinihompyGuideModal
                visible={guideOpen}
                onClose={() => setGuideOpen(false)}
                onStart={() => {
                    setGuideOpen(false);
                    router.push("/(tabs)/minihompy");
                }}
            />
        </View>
    );
}

// ============================================================================
// 개인 미니홈피 오버레이 (배치된 미니미 표시 + 인사말)
// ============================================================================

function PersonalOverlay({ settings, isMemorialMode, isDarkMode }: {
    settings: MinihompySettings | null;
    isMemorialMode: boolean;
    isDarkMode: boolean;
}) {
    const placed = settings?.placedMinimi ?? [];
    const stageW = SCREEN_WIDTH - 32; // 16px padding each side

    return (
        <>
            {/* 배치된 미니미들 */}
            {placed.map((p, i) => {
                const minimi = findMinimiOrFallback(p.slug);
                const left = (p.x / 100) * stageW;
                const top = (p.y / 100) * HERO_STAGE_HEIGHT;
                return (
                    <Image
                        key={`${p.slug}-${i}`}
                        source={{ uri: minimi.imageUrl }}
                        style={[styles.placedMinimi, {
                            left: Math.max(0, Math.min(left - 20, stageW - 40)),
                            top: Math.max(0, Math.min(top - 20, HERO_STAGE_HEIGHT - 40)),
                            zIndex: p.zIndex ?? i,
                        }]}
                        resizeMode="contain"
                    />
                );
            })}

            {/* 인사말 말풍선 */}
            {settings?.greeting && (
                <View style={styles.greetingBubble}>
                    <Text style={styles.greetingText}>{settings.greeting}</Text>
                    <View style={styles.greetingTail} />
                </View>
            )}

            {/* 하단 바 — 미니홈피 바로가기 힌트 */}
            <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.5)"]}
                style={styles.personalBottomBar}
            >
                <Ionicons name="home" size={14} color="rgba(255,255,255,0.9)" />
                <Text style={styles.personalHint}>내 미니홈피</Text>
                <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
        </>
    );
}

// ============================================================================
// 미니홈피 안내 가이드 모달
// ============================================================================

const GUIDE_STEPS = [
    {
        icon: "paw" as const,
        title: "미니미 캐릭터",
        desc: "강아지, 고양이, 햄스터 등 17종의 귀여운 미니미를 수집할 수 있어요.",
    },
    {
        icon: "star" as const,
        title: "포인트로 구매",
        desc: "출석(10P), 게시글(10P), 댓글(3P), AI 펫톡(1P) 등 활동하면 포인트가 쌓여요.",
    },
    {
        icon: "color-palette" as const,
        title: "내 공간 꾸미기",
        desc: "배경 테마를 바꾸고, 미니미를 배치하고, 인사말을 설정해보세요.",
    },
    {
        icon: "people" as const,
        title: "친구 방문 & 방명록",
        desc: "다른 유저의 미니홈피를 방문하고, 방명록도 남길 수 있어요.",
    },
];

function MinihompyGuideModal({ visible, onClose, onStart }: {
    visible: boolean;
    onClose: () => void;
    onStart: () => void;
}) {
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={guideStyles.backdrop} onPress={onClose}>
                <Pressable style={guideStyles.sheet} onPress={() => {}}>
                    {/* 핸들바 */}
                    <View style={guideStyles.handleRow}>
                        <View style={guideStyles.handle} />
                    </View>

                    <ScrollView
                        style={guideStyles.scroll}
                        contentContainerStyle={guideStyles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        bounces={false}
                    >
                        {/* 헤더 */}
                        <Text style={guideStyles.title}>미니홈피가 뭔가요?</Text>
                        <Text style={guideStyles.subtitle}>
                            포인트를 모아 미니미를 수집하고,{"\n"}나만의 공간을 꾸밀 수 있어요!
                        </Text>

                        {/* 단계 카드 */}
                        <View style={guideStyles.stepsWrap}>
                            {GUIDE_STEPS.map((step, i) => (
                                <View key={i} style={guideStyles.stepCard}>
                                    <View style={guideStyles.stepIconWrap}>
                                        <Ionicons name={step.icon} size={22} color={COLORS.memento[500]} />
                                    </View>
                                    <View style={guideStyles.stepTextWrap}>
                                        <Text style={guideStyles.stepTitle}>{step.title}</Text>
                                        <Text style={guideStyles.stepDesc}>{step.desc}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>

                        {/* 미니미 가격 참고 */}
                        <View style={guideStyles.priceHint}>
                            <Ionicons name="information-circle-outline" size={16} color={COLORS.gray[400]} />
                            <Text style={guideStyles.priceHintText}>미니미 1마리 = 200P, 배경 테마 = 200P</Text>
                        </View>
                    </ScrollView>

                    {/* CTA */}
                    <TouchableOpacity activeOpacity={0.88} onPress={onStart}>
                        <LinearGradient
                            colors={[COLORS.memento[500], COLORS.memento[400]]}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={guideStyles.ctaButton}
                        >
                            <Text style={guideStyles.ctaText}>미니홈피 시작하기</Text>
                            <Ionicons name="arrow-forward" size={18} color="#fff" />
                        </LinearGradient>
                    </TouchableOpacity>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const guideStyles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "flex-end",
    },
    sheet: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 24,
        paddingBottom: 36,
        maxHeight: "85%",
    },
    scroll: {
        // 내용이 길어도 ScrollView가 영역 안에서만 늘어나게 → CTA 버튼을 밀어내지 않음
        flexGrow: 0,
        flexShrink: 1,
    },
    scrollContent: {
        paddingBottom: 16,
    },
    handleRow: {
        alignItems: "center",
        paddingTop: 12,
        paddingBottom: 8,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.gray[200],
    },
    title: {
        fontSize: 22,
        fontWeight: "800",
        color: COLORS.gray[800],
        textAlign: "center",
        marginTop: 8,
        letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.gray[500],
        textAlign: "center",
        lineHeight: 20,
        marginTop: 8,
        marginBottom: 20,
    },
    stepsWrap: {
        gap: 12,
    },
    stepCard: {
        flexDirection: "row",
        backgroundColor: COLORS.gray[50],
        borderRadius: 16,
        padding: 16,
        alignItems: "flex-start",
        gap: 14,
    },
    stepIconWrap: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: "#E0F7FF",
        alignItems: "center",
        justifyContent: "center",
    },
    stepTextWrap: {
        flex: 1,
    },
    stepTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: COLORS.gray[800],
        marginBottom: 3,
    },
    stepDesc: {
        fontSize: 13,
        color: COLORS.gray[500],
        lineHeight: 18,
    },
    priceHint: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        marginTop: 16,
        marginBottom: 20,
    },
    priceHintText: {
        fontSize: 12,
        color: COLORS.gray[400],
    },
    ctaButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 16,
        borderRadius: 18,
    },
    ctaText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#fff",
    },
});

// ============================================================================
// 기존 히어로 (비로그인 / 로딩 중 폴백)
// ============================================================================

function OriginalHero({ isMemorialMode, isDarkMode, fontScale, spacingScale, iconScale, onCta, onSecondary, ctaText }: {
    isMemorialMode: boolean;
    isDarkMode: boolean;
    fontScale: number;
    spacingScale: number;
    iconScale: number;
    onCta: () => void;
    onSecondary: () => void;
    ctaText?: string;
}) {
    const gradientColors = isDarkMode
        ? ([COLORS.gray[800], COLORS.gray[800], COLORS.gray[700]] as const)
        : isMemorialMode
            ? (["#091A2E", "#1A2A3E", "#3D2A1A"] as const)
            : (["#CBEBF0", "#E0F3F6", "#FFF8F6"] as const);

    const ctaGradient: [string, string] = isMemorialMode
        ? [COLORS.memorial[500], "#FB923C"]
        : [COLORS.memento[500], COLORS.memento[400]];

    const titleColor = isMemorialMode
        ? "#FEF3C7"
        : (isDarkMode ? COLORS.white : COLORS.gray[800]);
    const subtitleColor = isMemorialMode
        ? "rgba(254,243,199,0.8)"
        : (isDarkMode ? COLORS.gray[300] : COLORS.gray[600]);
    const ghostTextColor = isMemorialMode
        ? "rgba(254,243,199,0.85)"
        : (isDarkMode ? COLORS.gray[300] : COLORS.gray[600]);

    const decoTopColor = isMemorialMode ? "rgba(245,158,11,0.18)" : "rgba(186,230,253,0.45)";
    const decoBottomColor = isMemorialMode ? "rgba(251,146,60,0.12)" : "rgba(254,205,211,0.4)";

    const heroImage = isMemorialMode
        ? require("@/assets/hero-illustration-memorial.png")
        : require("@/assets/hero-illustration.png");

    return (
        <View style={styles.section}>
            <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.card}
            >
                <View style={[styles.decoCircleTop, { backgroundColor: decoTopColor }]} />
                <View style={[styles.decoCircleBottom, { backgroundColor: decoBottomColor }]} />

                <View style={[styles.content, { padding: 24 * spacingScale }]}>
                    <View style={[styles.illustrationWrap, {
                        width: 240 * spacingScale,
                        height: 240 * spacingScale,
                        marginBottom: 20 * spacingScale,
                    }]}>
                        <Image source={heroImage} style={styles.illustration} resizeMode="cover" />
                    </View>

                    <Text style={[styles.title, { color: titleColor, fontSize: 26 * fontScale, marginBottom: 10 * spacingScale }]}>
                        우리 아이와 대화해보세요
                    </Text>
                    <Text style={[styles.subtitle, {
                        color: subtitleColor,
                        fontSize: 14 * fontScale,
                        lineHeight: 22 * fontScale,
                        marginBottom: 20 * spacingScale,
                    }]}>
                        AI 펫톡으로 성격 그대로 이야기하고,{"\n"}펫홈에 우리 아이의 매일을 담아요
                    </Text>

                    <View style={[styles.ctaRow, { gap: 12 * spacingScale }]}>
                        <TouchableOpacity onPress={onCta} activeOpacity={0.88} style={styles.ctaPrimaryWrap}>
                            <LinearGradient
                                colors={ctaGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[styles.ctaPrimary, {
                                    paddingHorizontal: 24 * spacingScale,
                                    paddingVertical: 14 * spacingScale,
                                    minWidth: 140 * spacingScale,
                                }]}
                            >
                                <Text style={[styles.ctaPrimaryText, { fontSize: 15 * fontScale }]}>
                                    {ctaText ?? "무료로 시작하기"}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={onSecondary}
                            activeOpacity={0.7}
                            style={[styles.ctaGhost, {
                                paddingHorizontal: 18 * spacingScale,
                                paddingVertical: 13 * spacingScale,
                            }]}
                        >
                            <Text style={[styles.ctaGhostText, { color: ghostTextColor, fontSize: 15 * fontScale }]}>둘러보기</Text>
                            <Ionicons name="arrow-forward" size={16 * iconScale} color={ghostTextColor} style={{ marginLeft: 4 }} />
                        </TouchableOpacity>
                    </View>
                </View>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    card: {
        borderRadius: 24,
        overflow: "hidden",
        position: "relative",
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
    },
    // 기존 히어로
    decoCircleTop: {
        position: "absolute",
        top: -40,
        right: -40,
        width: 160,
        height: 160,
        borderRadius: 80,
    },
    decoCircleBottom: {
        position: "absolute",
        bottom: -40,
        left: -40,
        width: 128,
        height: 128,
        borderRadius: 64,
    },
    content: {
        padding: 24,
        alignItems: "center",
    },
    illustrationWrap: {
        width: 240,
        height: 240,
        borderRadius: 24,
        overflow: "hidden",
        marginBottom: 20,
        elevation: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
    },
    illustration: { width: "100%", height: "100%" },
    title: {
        fontSize: 26,
        fontWeight: "800",
        textAlign: "center",
        letterSpacing: -0.4,
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 14,
        lineHeight: 22,
        textAlign: "center",
        marginBottom: 20,
    },
    ctaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        justifyContent: "center",
    },
    ctaPrimaryWrap: {
        borderRadius: 16,
        elevation: 4,
        shadowColor: COLORS.memento[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    ctaPrimary: {
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 16,
        minWidth: 140,
        alignItems: "center",
    },
    ctaPrimaryText: {
        color: COLORS.white,
        fontSize: 15,
        fontWeight: "700",
    },
    ctaGhost: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 18,
        paddingVertical: 13,
        borderRadius: 16,
    },
    ctaGhostText: {
        fontSize: 15,
        fontWeight: "600",
    },
    // 쇼케이스 히어로
    showcaseImage: {
        width: "100%",
        borderRadius: 24,
    },
    showcaseOverlay: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        paddingHorizontal: 20,
        paddingBottom: 18,
        paddingTop: 40,
    },
    showcaseCtaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    showcaseTitle: {
        color: "#fff",
        fontSize: 17,
        fontWeight: "800",
        letterSpacing: -0.3,
    },
    showcaseSub: {
        color: "rgba(255,255,255,0.8)",
        fontSize: 12,
        marginTop: 3,
    },
    showcaseArrow: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "rgba(255,255,255,0.2)",
        alignItems: "center",
        justifyContent: "center",
    },
    // 개인 미니홈피 프리뷰
    personalStage: {
        position: "relative",
        overflow: "hidden",
    },
    placedMinimi: {
        position: "absolute",
        width: 40,
        height: 40,
    },
    greetingBubble: {
        position: "absolute",
        top: 20,
        alignSelf: "center",
        left: 40,
        right: 40,
        backgroundColor: "rgba(255,255,255,0.92)",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 14,
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
        zIndex: 100,
    },
    greetingText: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.gray[800],
        textAlign: "center",
    },
    greetingTail: {
        position: "absolute",
        bottom: -6,
        alignSelf: "center",
        width: 0,
        height: 0,
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderTopWidth: 7,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderTopColor: "rgba(255,255,255,0.92)",
    },
    personalBottomBar: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 16,
        paddingBottom: 12,
        paddingTop: 24,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    personalHint: {
        color: "rgba(255,255,255,0.9)",
        fontSize: 13,
        fontWeight: "600",
        flex: 1,
    },
});
