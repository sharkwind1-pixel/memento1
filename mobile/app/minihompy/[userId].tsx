/**
 * 다른 유저 미니홈피 방문 화면
 *  - GET /api/minihompy/[userId] → settings + 주인 정보 + isLiked
 *  - POST /api/minihompy/[userId]/visit (마운트 시 1회)
 *  - POST /api/minihompy/[userId]/like (좋아요 토글)
 *  - 방명록 GuestbookModal (ownerUserId 전달)
 *  - 비공개 미니홈피이거나 fetch 실패 시 안내 화면
 */

import { useEffect, useState, useCallback, useRef } from "react";
import {
    View, Text, ScrollView, TouchableOpacity,
    Image, Dimensions, StyleSheet, ActivityIndicator,
    Alert, ImageBackground,
} from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import { useDarkMode } from "@/contexts/ThemeContext";
import { COLORS } from "@/lib/theme";
import { findMinimi, findBackgroundOrDefault } from "@/data/minihompyData";
import {
    visitMinihompy, postMinihompyVisit, toggleMinihompyLike,
    type VisitedMinihompy,
} from "@/lib/minihompy-api";
import AppHeader from "@/components/common/AppHeader";
import GuestbookModal from "@/components/minihompy/GuestbookModal";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const STAGE_HEIGHT = 320;

export default function VisitMinihompyScreen() {
    const router = useRouter();
    const { userId } = useLocalSearchParams<{ userId: string }>();
    const { session, user } = useAuth();
    const { isDarkMode } = useDarkMode();

    const [data, setData] = useState<VisitedMinihompy | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [liking, setLiking] = useState(false);
    const [guestbookOpen, setGuestbookOpen] = useState(false);
    const visitPostedRef = useRef(false);

    const accessToken = session?.access_token ?? null;
    const isOwnHompy = user?.id === userId;
    const accentColor = COLORS.memento[500];

    const load = useCallback(async () => {
        if (!accessToken || !userId) {
            setLoading(false);
            setError("로그인이 필요해요.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const result = await visitMinihompy(accessToken, userId);
            setData(result);

            // 본인 홈피가 아니고 첫 진입이면 visit POST
            if (!isOwnHompy && !visitPostedRef.current) {
                visitPostedRef.current = true;
                postMinihompyVisit(accessToken, userId).catch(() => {});
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "미니홈피를 불러올 수 없어요.");
        } finally {
            setLoading(false);
        }
    }, [accessToken, userId, isOwnHompy]);

    useEffect(() => {
        load();
    }, [load]);

    async function handleLike() {
        if (!accessToken || !userId || liking || isOwnHompy) return;
        setLiking(true);
        // 낙관적 업데이트
        setData((prev) => prev ? {
            ...prev,
            isLiked: !prev.isLiked,
            totalLikes: prev.isLiked ? Math.max(0, prev.totalLikes - 1) : prev.totalLikes + 1,
        } : prev);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        try {
            const result = await toggleMinihompyLike(accessToken, userId);
            setData((prev) => prev ? {
                ...prev,
                isLiked: result.liked,
                totalLikes: result.totalLikes,
            } : prev);
        } catch (e) {
            // 롤백
            setData((prev) => prev ? {
                ...prev,
                isLiked: !prev.isLiked,
                totalLikes: prev.isLiked ? prev.totalLikes - 1 : prev.totalLikes + 1,
            } : prev);
            Alert.alert("실패", e instanceof Error ? e.message : "");
        } finally {
            setLiking(false);
        }
    }

    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.white;

    if (loading) {
        return (
            <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
                <Stack.Screen options={{ headerShown: false }} />
                <AppHeader showBack title="미니홈피" hideActions />
                <View style={styles.center}>
                    <ActivityIndicator color={accentColor} />
                </View>
            </SafeAreaView>
        );
    }

    if (error || !data) {
        return (
            <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
                <Stack.Screen options={{ headerShown: false }} />
                <AppHeader showBack title="미니홈피" hideActions />
                <View style={styles.center}>
                    <Ionicons name="alert-circle-outline" size={36} color={COLORS.gray[400]} />
                    <Text style={styles.errorText}>{error || "미니홈피를 찾을 수 없어요"}</Text>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Text style={{ color: accentColor, fontSize: 13, fontWeight: "600" }}>뒤로 가기</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    if (!data.isPublic && !isOwnHompy) {
        return (
            <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
                <Stack.Screen options={{ headerShown: false }} />
                <AppHeader showBack title="미니홈피" hideActions />
                <View style={styles.center}>
                    <Ionicons name="lock-closed-outline" size={36} color={COLORS.gray[400]} />
                    <Text style={styles.errorText}>비공개 미니홈피예요</Text>
                    <Text style={[styles.errorText, { fontSize: 12, color: COLORS.gray[400] }]}>
                        주인이 공개로 변경하면 볼 수 있어요
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    const background = findBackgroundOrDefault(data.backgroundSlug);
    const equippedMinimi = data.equippedMinimiSlug ? findMinimi(data.equippedMinimiSlug) : null;

    return (
        <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
            <Stack.Screen options={{ headerShown: false }} />
            <AppHeader showBack title={`${data.ownerNickname}님의 미니홈피`} hideActions />

            <ScrollView
                style={styles.flex1}
                showsVerticalScrollIndicator={false}
            >
                {/* 주인 헤더 */}
                <View style={styles.ownerRow}>
                    {data.ownerAvatar ? (
                        <Image source={{ uri: data.ownerAvatar }} style={styles.ownerAvatar} />
                    ) : (
                        <View style={[styles.ownerAvatar, styles.ownerAvatarFallback, { backgroundColor: accentColor + "20" }]}>
                            <Text style={{ fontSize: 16, fontWeight: "700", color: accentColor }}>
                                {data.ownerNickname[0]}
                            </Text>
                        </View>
                    )}
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.ownerName, { color: isDarkMode ? COLORS.white : COLORS.gray[900] }]}>
                            {data.ownerNickname}
                        </Text>
                        <View style={styles.statsRow}>
                            <Text style={styles.statsText}>
                                오늘 {data.todayVisitors}
                            </Text>
                            <Text style={styles.statsDot}>·</Text>
                            <Text style={styles.statsText}>
                                누적 {data.totalVisitors}
                            </Text>
                            <Text style={styles.statsDot}>·</Text>
                            <Text style={styles.statsText}>
                                좋아요 {data.totalLikes}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Stage — 자유배치 미니미 우선, 없으면 단일 장착 미니미 fallback */}
                <View style={styles.stageWrap}>
                    <StageBackground background={background}>
                        {data.greeting && (
                            <View style={styles.speechBubble}>
                                <Text style={styles.speechText}>{data.greeting}</Text>
                                <View style={styles.speechTail} />
                            </View>
                        )}

                        {/* 자유배치 미니미 (read-only — 드래그 불가) */}
                        {data.placedMinimi.length > 0 ? (
                            data.placedMinimi.map((p, idx) => {
                                const m = findMinimi(p.slug);
                                if (!m) return null;
                                return (
                                    <Image
                                        key={`${p.slug}-${idx}`}
                                        source={{ uri: m.imageUrl }}
                                        resizeMode="contain"
                                        style={[
                                            styles.placedMinimi,
                                            {
                                                left: `${p.x}%`,
                                                top: `${p.y}%`,
                                                zIndex: p.zIndex ?? idx,
                                            },
                                        ]}
                                    />
                                );
                            })
                        ) : (
                            <View style={styles.minimiSlot}>
                                {equippedMinimi ? (
                                    <Image source={{ uri: equippedMinimi.imageUrl }} style={styles.minimiImg} resizeMode="contain" />
                                ) : (
                                    <View style={[styles.minimiImg, styles.minimiImgFallback]}>
                                        <Text style={{ fontSize: 56 }}>🐾</Text>
                                    </View>
                                )}
                                <Text style={styles.minimiName}>
                                    {equippedMinimi?.name ?? data.ownerNickname}
                                </Text>
                            </View>
                        )}
                    </StageBackground>
                </View>

                {/* 액션 (좋아요 / 방명록) */}
                <View style={styles.actionRow}>
                    {!isOwnHompy && (
                        <TouchableOpacity
                            onPress={handleLike}
                            disabled={liking}
                            style={[
                                styles.actionBtn,
                                {
                                    backgroundColor: data.isLiked ? "#FEE2E2" : (isDarkMode ? COLORS.gray[900] : "#fff"),
                                    borderColor: data.isLiked ? "#FCA5A5" : COLORS.gray[200],
                                },
                            ]}
                            activeOpacity={0.85}
                        >
                            <Ionicons
                                name={data.isLiked ? "heart" : "heart-outline"}
                                size={20}
                                color={data.isLiked ? "#EF4444" : COLORS.gray[600]}
                            />
                            <Text style={[
                                styles.actionText,
                                { color: data.isLiked ? "#B91C1C" : COLORS.gray[700] },
                            ]}>
                                {data.isLiked ? "좋아요 취소" : "좋아요"}
                            </Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        onPress={() => setGuestbookOpen(true)}
                        style={[
                            styles.actionBtn,
                            {
                                backgroundColor: isDarkMode ? COLORS.gray[900] : "#fff",
                                borderColor: COLORS.gray[200],
                                flex: isOwnHompy ? 1 : 1,
                            },
                        ]}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="chatbubbles-outline" size={20} color={COLORS.gray[600]} />
                        <Text style={[styles.actionText, { color: COLORS.gray[700] }]}>방명록</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 32 }} />
            </ScrollView>

            {accessToken && (
                <GuestbookModal
                    visible={guestbookOpen}
                    onClose={() => setGuestbookOpen(false)}
                    accessToken={accessToken}
                    ownerUserId={userId!}
                    accentColor={accentColor}
                />
            )}
        </SafeAreaView>
    );
}

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

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    center: {
        flex: 1, alignItems: "center", justifyContent: "center",
        gap: 8, paddingHorizontal: 24,
    },
    errorText: {
        fontSize: 14, color: COLORS.gray[600],
        marginTop: 8, textAlign: "center",
    },
    backBtn: {
        marginTop: 16, paddingHorizontal: 16, paddingVertical: 8,
    },
    ownerRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 16,
    },
    ownerAvatar: { width: 48, height: 48, borderRadius: 24 },
    ownerAvatarFallback: { alignItems: "center", justifyContent: "center" },
    ownerName: { fontSize: 16, fontWeight: "800" },
    statsRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
    statsText: { fontSize: 11, color: COLORS.gray[500], fontWeight: "500" },
    statsDot: { color: COLORS.gray[300], fontSize: 11 },
    stageWrap: { marginHorizontal: 20, marginBottom: 16 },
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
        shadowOpacity: 0.1, shadowRadius: 8,
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
        borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 8,
        borderLeftColor: "transparent", borderRightColor: "transparent",
        borderTopColor: "rgba(255,255,255,0.95)",
    },
    minimiSlot: {
        position: "absolute",
        bottom: 28,
        alignSelf: "center",
        alignItems: "center",
    },
    minimiImg: { width: 140, height: 140 },
    minimiImgFallback: {
        backgroundColor: "rgba(255,255,255,0.5)",
        borderRadius: 70,
        alignItems: "center", justifyContent: "center",
    },
    placedMinimi: {
        position: "absolute",
        width: 60,
        height: 60,
        marginLeft: -30,
        marginTop: -30,
    },
    minimiName: {
        marginTop: 4, fontSize: 13, fontWeight: "700", color: "#111827",
        textShadowColor: "rgba(255,255,255,0.8)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    actionRow: {
        flexDirection: "row",
        gap: 10,
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    actionBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
    },
    actionText: { fontSize: 14, fontWeight: "700" },
});
