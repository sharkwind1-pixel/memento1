/**
 * ShowcaseSection — "함께 보기" 가로 캐러셀
 * GET /api/posts?badge=자랑&limit=10
 *
 * 4초 자동 슬라이드. 사용자가 터치하면 5초간 일시 정지.
 */

import { useEffect, useRef, useState } from "react";
import {
    View, Text, TouchableOpacity, ScrollView, Image,
    Dimensions, StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { API_BASE_URL } from "@/config/constants";
import { COLORS } from "@/lib/theme";

interface ShowcasePost {
    id: string;
    title: string;
    authorName: string;
    likes: number;
    comments: number;
    imageUrls: string[];
    videoUrl: string | null;
    createdAt: string;
}

const CARD_WIDTH = 260;
const CARD_GAP = 16;
const SLIDE_INTERVAL = 4000;

export default function ShowcaseSection() {
    const router = useRouter();
    const [posts, setPosts] = useState<ShowcasePost[]>([]);
    const scrollRef = useRef<ScrollView>(null);
    const isPausedRef = useRef(false);
    const indexRef = useRef(0);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/posts?badge=자랑&limit=10`);
                if (!res.ok) return;
                const data = await res.json();
                const list = Array.isArray(data?.posts) ? data.posts : [];
                setPosts(list.map((p: Record<string, unknown>): ShowcasePost => ({
                    id: typeof p.id === "string" ? p.id : String(p.id ?? ""),
                    title: typeof p.title === "string" ? p.title : "",
                    authorName: typeof p.authorName === "string"
                        ? p.authorName
                        : (typeof p.author === "string" ? p.author : "익명"),
                    likes: typeof p.likes === "number" ? p.likes : 0,
                    comments: typeof p.comments === "number" ? p.comments : 0,
                    imageUrls: Array.isArray(p.imageUrls)
                        ? p.imageUrls.filter((x): x is string => typeof x === "string")
                        : Array.isArray(p.images)
                            ? (p.images as unknown[]).filter((x): x is string => typeof x === "string")
                            : [],
                    videoUrl: typeof p.videoUrl === "string" ? p.videoUrl : null,
                    createdAt: typeof p.createdAt === "string"
                        ? p.createdAt
                        : (typeof p.created_at === "string" ? p.created_at : ""),
                })));
            } catch {
                // 조용히
            }
        })();
    }, []);

    useEffect(() => {
        if (posts.length <= 1) return;
        const timer = setInterval(() => {
            if (isPausedRef.current) return;
            indexRef.current = (indexRef.current + 1) % posts.length;
            scrollRef.current?.scrollTo({
                x: indexRef.current * (CARD_WIDTH + CARD_GAP),
                animated: true,
            });
        }, SLIDE_INTERVAL);
        return () => clearInterval(timer);
    }, [posts.length]);

    function handleTouch() {
        isPausedRef.current = true;
        setTimeout(() => { isPausedRef.current = false; }, 5000);
    }

    function formatTime(dateStr: string) {
        if (!dateStr) return "";
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "방금 전";
        if (mins < 60) return `${mins}분 전`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}시간 전`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}일 전`;
        return new Date(dateStr).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
    }

    return (
        <View style={styles.section}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <LinearGradient
                        colors={[COLORS.memorial[400], "#FBBF24"]}
                        style={styles.iconWrap}
                    >
                        <Ionicons name="star" size={18} color="#fff" />
                    </LinearGradient>
                    <View>
                        <Text style={styles.title}>함께 보기</Text>
                        <Text style={styles.subtitle}>AI로 만든 우리 아이 영상</Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={() => router.push("/(tabs)/community")}
                    style={styles.moreBtn}
                    activeOpacity={0.7}
                >
                    <Text style={styles.moreText}>더보기</Text>
                    <Ionicons name="arrow-forward" size={14} color={COLORS.memorial[600]} />
                </TouchableOpacity>
            </View>

            <ScrollView
                ref={scrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                onTouchStart={handleTouch}
                onScrollBeginDrag={handleTouch}
            >
                {posts.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="play-outline" size={36} color={COLORS.gray[300]} />
                        <Text style={styles.emptyText}>아직 영상이 없어요</Text>
                        <Text style={styles.emptyHint}>AI 영상을 만들어 자랑해보세요</Text>
                    </View>
                ) : posts.map((post) => {
                    const firstImage = post.imageUrls[0];
                    return (
                        <TouchableOpacity
                            key={post.id}
                            onPress={() => router.push(`/post/${post.id}`)}
                            style={styles.card}
                            activeOpacity={0.85}
                        >
                            <View style={styles.heroContainer}>
                                {firstImage ? (
                                    <Image source={{ uri: firstImage }} style={styles.heroImg} />
                                ) : (
                                    <LinearGradient
                                        colors={[COLORS.memorial[400], "#FBA74D"]}
                                        style={styles.heroImg}
                                    >
                                        <Ionicons name="paw" size={48} color="rgba(255,255,255,0.3)" />
                                    </LinearGradient>
                                )}
                                {post.videoUrl && (
                                    <View style={styles.playOverlay}>
                                        <Ionicons name="play" size={20} color={COLORS.memorial[600]} />
                                    </View>
                                )}
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>함께 보기</Text>
                                </View>
                            </View>

                            <View style={styles.cardBody}>
                                <Text style={styles.cardTitle} numberOfLines={2}>{post.title}</Text>
                                <Text style={styles.cardMeta} numberOfLines={1}>
                                    {post.authorName}님 · {formatTime(post.createdAt)}
                                </Text>
                                <View style={styles.cardFooter}>
                                    <View style={styles.statRow}>
                                        <Ionicons name="heart-outline" size={14} color={COLORS.gray[500]} />
                                        <Text style={styles.statText}>{post.likes}</Text>
                                    </View>
                                    <View style={styles.statRow}>
                                        <Ionicons name="chatbubble-outline" size={14} color={COLORS.gray[500]} />
                                        <Text style={styles.statText}>{post.comments}</Text>
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    section: { marginTop: 16 },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    title: { fontSize: 18, fontWeight: "700", color: COLORS.gray[800] },
    subtitle: { fontSize: 13, color: COLORS.gray[500], marginTop: 2 },
    moreBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    moreText: { fontSize: 13, color: COLORS.memorial[600], fontWeight: "500" },
    scrollContent: { paddingHorizontal: 16, gap: CARD_GAP, paddingBottom: 16 },
    card: {
        width: CARD_WIDTH,
        borderRadius: 16,
        backgroundColor: COLORS.white,
        overflow: "hidden",
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
    },
    heroContainer: { height: 160, position: "relative" },
    heroImg: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
    playOverlay: {
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        alignItems: "center",
        justifyContent: "center",
    },
    badge: {
        position: "absolute",
        bottom: 12,
        left: 12,
        backgroundColor: "rgba(251, 191, 36, 0.9)",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 9999,
    },
    badgeText: { fontSize: 11, fontWeight: "700", color: "#fff" },
    cardBody: { padding: 16 },
    cardTitle: { fontSize: 15, fontWeight: "700", color: COLORS.gray[800], lineHeight: 20, marginBottom: 6 },
    cardMeta: { fontSize: 12, color: COLORS.gray[500], marginBottom: 12 },
    cardFooter: { flexDirection: "row", gap: 12 },
    statRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    statText: { fontSize: 13, color: COLORS.gray[500] },
    emptyState: {
        width: Dimensions.get("window").width - 32,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 40,
        gap: 8,
    },
    emptyText: { fontSize: 14, color: COLORS.gray[500] },
    emptyHint: { fontSize: 12, color: COLORS.gray[400] },
});
