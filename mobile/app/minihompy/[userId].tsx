/**
 * 다른 유저 펫홈 방문 화면
 *  - GET /api/minihompy/[userId] → settings + 주인 정보 + isLiked
 *  - POST /api/minihompy/[userId]/visit (마운트 시 1회)
 *  - POST /api/minihompy/[userId]/like (좋아요 토글)
 *  - 방명록 GuestbookModal (ownerUserId 전달)
 *  - 비공개 펫홈이거나 fetch 실패 시 안내 화면
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
    getNeighborStatus, getNeighborList, toggleNeighbor,
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

    // 이웃(팔로우) 상태
    const [iFollow, setIFollow] = useState(false);
    const [mutual, setMutual] = useState(false);
    const [neighborBusy, setNeighborBusy] = useState(false);
    // 파도타기: 이 집이 이웃 맺은 집들 (로그인 시에만)
    const [surfList, setSurfList] = useState<Array<{ userId: string; nickname: string; mutual: boolean }>>([]);

    const accessToken = session?.access_token ?? null;
    const isOwnHompy = user?.id === userId;
    const accentColor = COLORS.memento[500];

    const load = useCallback(async () => {
        if (!userId) {
            setLoading(false);
            setError("펫홈을 찾을 수 없어요.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            // 게스트(비로그인)도 공개 펫홈 열람 가능 (Phase 1 게스트차단 해제, 웹 /u/{nickname} 패리티).
            // 비공개면 API가 403 → 안내 화면.
            const result = await visitMinihompy(accessToken, userId);
            setData(result);

            // 본인 홈피가 아니고 첫 진입이면 visit POST (방문 카운트는 로그인 유저만)
            if (accessToken && !isOwnHompy && !visitPostedRef.current) {
                visitPostedRef.current = true;
                postMinihompyVisit(accessToken, userId).catch(() => {});
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "펫홈을 불러올 수 없어요.");
        } finally {
            setLoading(false);
        }
    }, [accessToken, userId, isOwnHompy]);

    useEffect(() => {
        load();
    }, [load]);

    // 이웃 상태 로드 (+로그인 시 파도타기 목록)
    useEffect(() => {
        if (!userId || isOwnHompy) return;
        let cancelled = false;
        getNeighborStatus(accessToken, userId)
            .then((s) => {
                if (cancelled) return;
                setIFollow(s.relation?.iFollow ?? false);
                setMutual(s.relation?.mutual ?? false);
            })
            .catch(() => {});
        if (accessToken) {
            getNeighborList(accessToken, userId)
                .then((items) => { if (!cancelled) setSurfList(items); })
                .catch(() => {});
        }
        return () => { cancelled = true; };
    }, [accessToken, userId, isOwnHompy]);

    // 이웃 추가/해제 토글
    async function handleNeighbor() {
        if (!userId || neighborBusy || isOwnHompy) return;
        if (!accessToken) {
            promptLogin("이웃을 맺고 소식을 받으려면 로그인이 필요해요. 무료로 시작할 수 있어요.");
            return;
        }
        setNeighborBusy(true);
        const wasFollowing = iFollow;
        setIFollow(!wasFollowing);
        if (wasFollowing) setMutual(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        try {
            const result = await toggleNeighbor(accessToken, userId, !wasFollowing);
            setIFollow(result.following);
            setMutual(result.mutual);
        } catch (e) {
            setIFollow(wasFollowing);
            Alert.alert("실패", e instanceof Error ? e.message : "이웃 처리에 실패했어요.");
        } finally {
            setNeighborBusy(false);
        }
    }

    // 맥락 가입후크 (① 패턴) — 게스트가 상호작용 시도 시 가치문구 + 로그인 경로
    function promptLogin(message: string) {
        Alert.alert("로그인 필요", message, [
            { text: "취소", style: "cancel" },
            { text: "로그인", onPress: () => router.push("/(auth)/login") },
        ]);
    }

    async function handleLike() {
        if (!userId || liking || isOwnHompy) return;
        if (!accessToken) {
            promptLogin("이 펫홈에 마음을 남기려면 로그인이 필요해요. 무료로 시작할 수 있어요.");
            return;
        }
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
                <AppHeader showBack title="펫홈" hideActions />
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
                <AppHeader showBack title="펫홈" hideActions />
                <View style={styles.center}>
                    <Ionicons name="alert-circle-outline" size={36} color={COLORS.gray[400]} />
                    <Text style={styles.errorText}>{error || "펫홈을 찾을 수 없어요"}</Text>
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
                <AppHeader showBack title="펫홈" hideActions />
                <View style={styles.center}>
                    <Ionicons name="lock-closed-outline" size={36} color={COLORS.gray[400]} />
                    <Text style={styles.errorText}>비공개 펫홈이에요</Text>
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
            <AppHeader showBack title={`${data.ownerNickname}님의 펫홈`} hideActions />

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

                {/* Stage — 자유배치 꼬미 우선, 없으면 단일 장착 꼬미 fallback */}
                <View style={styles.stageWrap}>
                    <StageBackground background={background}>
                        {data.greeting && (
                            <View style={styles.speechBubble}>
                                <Text style={styles.speechText}>{data.greeting}</Text>
                                <View style={styles.speechTail} />
                            </View>
                        )}

                        {/* 자유배치 꼬미 (read-only — 드래그 불가) */}
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
                    {!isOwnHompy && (
                        <TouchableOpacity
                            onPress={handleNeighbor}
                            disabled={neighborBusy}
                            style={[
                                styles.actionBtn,
                                {
                                    backgroundColor: iFollow ? COLORS.memento[50] : (isDarkMode ? COLORS.gray[900] : "#fff"),
                                    borderColor: iFollow ? COLORS.memento[300] : COLORS.gray[200],
                                },
                            ]}
                            activeOpacity={0.85}
                        >
                            <Ionicons
                                name={iFollow ? "person-circle" : "person-add-outline"}
                                size={20}
                                color={iFollow ? COLORS.memento[600] : COLORS.gray[600]}
                            />
                            <Text style={[
                                styles.actionText,
                                { color: iFollow ? COLORS.memento[600] : COLORS.gray[700] },
                            ]}>
                                {mutual ? "서로이웃" : iFollow ? "이웃" : "이웃 맺기"}
                            </Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        onPress={() => {
                            if (!accessToken) {
                                promptLogin("방명록을 남기려면 로그인이 필요해요. 무료로 시작할 수 있어요.");
                                return;
                            }
                            setGuestbookOpen(true);
                        }}
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

                {/* 파도타기 — 이 집의 이웃들 타고 구경 (웹 MinihompyVisitModal 1:1, 모바일은 스택 push라 뒤로가기 자연) */}
                {accessToken && surfList.filter((n) => n.userId !== user?.id && n.userId !== userId).length > 0 && (
                    <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
                            <Ionicons name="water-outline" size={16} color={COLORS.memento[500]} />
                            <Text style={{ fontSize: 14, fontWeight: "700", color: isDarkMode ? COLORS.gray[200] : COLORS.gray[700] }}>파도타기</Text>
                            <Text style={{ fontSize: 11, color: COLORS.gray[400] }}>이 집의 이웃집 구경가기</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                            {surfList
                                .filter((n) => n.userId !== user?.id && n.userId !== userId)
                                .map((n) => (
                                    <TouchableOpacity
                                        key={n.userId}
                                        activeOpacity={0.8}
                                        onPress={() => router.push(`/minihompy/${n.userId}`)}
                                        style={{ alignItems: "center", width: 60 }}
                                    >
                                        <View style={{
                                            width: 44, height: 44, borderRadius: 22,
                                            backgroundColor: "#E0F7FF", borderWidth: 1, borderColor: "#CBEBF0",
                                            alignItems: "center", justifyContent: "center",
                                        }}>
                                            <Text style={{ fontSize: 15, fontWeight: "700", color: COLORS.memento[600] }}>
                                                {n.nickname.slice(0, 1)}
                                            </Text>
                                        </View>
                                        <Text numberOfLines={1} style={{ fontSize: 10, color: COLORS.gray[500], marginTop: 4, maxWidth: 56, textAlign: "center" }}>
                                            {n.nickname}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                        </ScrollView>
                    </View>
                )}

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
