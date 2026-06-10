/**
 * CommunityPreview — 홈 "인기 있는 이야기" (웹 src/components/features/home/CommunitySection.tsx 매칭)
 *
 * 웹 디자인 매칭:
 * - 헤더: 그라데이션 원 아이콘 + 제목/부제 + 더 많은 이야기 →
 * - 리스트: 64x64 그라데이션 썸네일 + 제목 + 작성자/좋아요/댓글
 * - 좋아요 토글 (낙관적 업데이트 + 하트 팝 애니메이션)
 * - 5개 그라데이션 사이클 (일상/추모 분기)
 */

import { useEffect, useState, useRef } from "react";
import { useDarkMode } from "@/contexts/ThemeContext";
import { useSimpleMode } from "@/contexts/SimpleModeContext";
import {
    View, Text, TouchableOpacity, StyleSheet,
    ActivityIndicator, Animated, Image, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Session } from "@supabase/supabase-js";
import { API_BASE_URL } from "@/config/constants";
import { COLORS } from "@/lib/theme";

interface CommunityPostPreview {
    id: string;
    title: string;
    author: string;
    likes: number;
    comments: number;
    badge?: string;
    isLiked?: boolean;
    imageUrl?: string;
}

const DAILY_GRADIENTS: Array<[string, string]> = [
    [COLORS.memento[500], COLORS.memento[300]],
    ["#F43F5E", "#FDA4AF"],
    ["#8B5CF6", "#D8B4FE"],
    ["#10B981", "#6EE7B7"],
    [COLORS.memorial[500], "#FBA74D"],
];
const MEMORIAL_GRADIENTS: Array<[string, string]> = [
    [COLORS.memorial[500], "#FBA74D"],
    [COLORS.memorial[400], "#FCD34D"],
    ["#FB923C", COLORS.memorial[300]],
    ["#FBBF24", COLORS.memorial[300]],
    [COLORS.memorial[600], "#F97316"],
];

interface Props {
    session: Session | null;
    isMemorialMode: boolean;
}

export default function CommunityPreview({ session, isMemorialMode }: Props) {
    const { isDarkMode } = useDarkMode();
    const { fontScale, spacingScale, iconScale } = useSimpleMode();
    const router = useRouter();
    const [posts, setPosts] = useState<CommunityPostPreview[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const accentColor = isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500];
    const headerGradient: [string, string] = isMemorialMode
        ? [COLORS.memorial[500], "#FB923C"]
        : [COLORS.memento[500], COLORS.memento[400]];
    const gradients = isMemorialMode ? MEMORIAL_GRADIENTS : DAILY_GRADIENTS;

    useEffect(() => {
        (async () => {
            try {
                const headers: Record<string, string> = {};
                if (session) headers["Authorization"] = `Bearer ${session.access_token}`;
                // 인기글 = 자유게시판 + 자랑 제외 (웹 기준)
                const res = await fetch(`${API_BASE_URL}/api/posts?featured=true&subcategory=free&exclude_badge=자랑&limit=5`, { headers });
                if (!res.ok) return;
                const data = await res.json();
                const list = Array.isArray(data?.posts) ? data.posts : Array.isArray(data) ? data : [];
                setPosts(list.map((raw: any): CommunityPostPreview => {
                    const imgs: unknown = raw?.imageUrls ?? raw?.image_urls ?? raw?.images;
                    const firstImg = Array.isArray(imgs)
                        ? (typeof imgs[0] === "string" ? imgs[0] : undefined)
                        : (typeof imgs === "string" ? imgs : undefined);
                    return {
                        id: raw?.id != null ? String(raw.id) : "",
                        title: typeof raw?.title === "string" ? raw.title : "",
                        author: (typeof raw?.authorName === "string" && raw.authorName.trim())
                            ? raw.authorName
                            : (typeof raw?.author === "string" && raw.author.trim())
                                ? raw.author
                                : (typeof raw?.author_name === "string" && raw.author_name.trim())
                                    ? raw.author_name
                                    : "익명",
                        likes: typeof raw?.likes === "number" ? raw.likes : 0,
                        comments: typeof raw?.comments === "number"
                            ? raw.comments
                            : typeof raw?.comments_count === "number" ? raw.comments_count : 0,
                        badge: typeof raw?.tag === "string" ? raw.tag
                            : (typeof raw?.badge === "string" ? raw.badge : undefined),
                        isLiked: typeof raw?.isLiked === "boolean" ? raw.isLiked
                            : (typeof raw?.is_liked === "boolean" ? raw.is_liked : false),
                        imageUrl: firstImg && firstImg.startsWith("http") ? firstImg : undefined,
                    };
                }));
            } catch {
                // ignore
            } finally {
                setIsLoading(false);
            }
        })();
    }, [session]);

    async function toggleLike(postId: string) {
        if (!session) {
            Alert.alert("로그인 필요", "좋아요를 남기려면 로그인이 필요해요. 무료로 시작할 수 있어요.", [
                { text: "취소", style: "cancel" },
                { text: "로그인", onPress: () => router.push("/(auth)/login") },
            ]);
            return;
        }
        // 낙관적 업데이트
        const target = posts.find((p) => p.id === postId);
        if (!target) return;
        const willLike = !target.isLiked;
        Haptics.selectionAsync().catch(() => {});

        setPosts((prev) => prev.map((p) =>
            p.id === postId ? { ...p, isLiked: willLike, likes: p.likes + (willLike ? 1 : -1) } : p
        ));

        try {
            const res = await fetch(`${API_BASE_URL}/api/posts/${postId}/like`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
            });
            if (!res.ok) {
                // 롤백
                setPosts((prev) => prev.map((p) =>
                    p.id === postId ? { ...p, isLiked: !willLike, likes: p.likes + (willLike ? -1 : 1) } : p
                ));
            }
        } catch {
            setPosts((prev) => prev.map((p) =>
                p.id === postId ? { ...p, isLiked: !willLike, likes: p.likes + (willLike ? -1 : 1) } : p
            ));
        }
    }

    return (
        <View style={styles.section}>
            {/* 헤더 */}
            <View style={styles.header}>
                <View style={[styles.headerLeft, { gap: 12 * spacingScale }]}>
                    <LinearGradient colors={headerGradient} style={[styles.headerIcon, {
                        width: 40 * spacingScale,
                        height: 40 * spacingScale,
                    }]}>
                        <Ionicons name="trending-up" size={18 * iconScale} color="#fff" />
                    </LinearGradient>
                    <View>
                        <Text style={[styles.title, {
                            fontSize: 16 * fontScale,
                            color: isDarkMode
                                ? COLORS.white
                                : (isMemorialMode ? COLORS.memorial[700] : COLORS.gray[800]),
                        }]}>인기 있는 이야기</Text>
                        <Text style={[styles.subtitle, { fontSize: 12 * fontScale }]}>커뮤니티에서 가장 사랑받는 글들</Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={() => router.push("/(tabs)/community")}
                    style={styles.moreBtn}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.moreText, { color: accentColor, fontSize: 13 * fontScale }]}>더 많은 이야기</Text>
                    <Ionicons name="arrow-forward" size={14 * iconScale} color={accentColor} />
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View style={styles.loading}>
                    <ActivityIndicator color={accentColor} />
                </View>
            ) : posts.length === 0 ? (
                <View style={styles.empty}>
                    <Ionicons name="paw-outline" size={36} color={COLORS.gray[300]} />
                    <Text style={styles.emptyText}>아직 이야기가 없어요</Text>
                    <Text style={styles.emptyHint}>커뮤니티에서 첫 번째 이야기를 작성해보세요</Text>
                </View>
            ) : (
                <View style={[styles.list, { gap: 8 * spacingScale }]}>
                    {posts.map((post, idx) => (
                        <CommunityCard
                            key={post.id || `idx-${idx}`}
                            post={post}
                            gradient={gradients[idx % gradients.length]}
                            isMemorialMode={isMemorialMode}
                            fontScale={fontScale}
                            spacingScale={spacingScale}
                            iconScale={iconScale}
                            onPress={() => post.id && router.push(`/post/${post.id}`)}
                            onToggleLike={() => post.id && toggleLike(post.id)}
                        />
                    ))}
                </View>
            )}
        </View>
    );
}

interface CardProps {
    post: CommunityPostPreview;
    gradient: [string, string];
    isMemorialMode: boolean;
    fontScale: number;
    spacingScale: number;
    iconScale: number;
    onPress: () => void;
    onToggleLike: () => void;
}

function CommunityCard({ post, gradient, fontScale, spacingScale, iconScale, onPress, onToggleLike }: CardProps) {
    const { isDarkMode } = useDarkMode();
    const heartScale = useRef(new Animated.Value(1)).current;

    function handleLike() {
        Animated.sequence([
            Animated.timing(heartScale, { toValue: 1.4, duration: 120, useNativeDriver: true }),
            Animated.timing(heartScale, { toValue: 1, duration: 120, useNativeDriver: true }),
        ]).start();
        onToggleLike();
    }

    // 이미지 첨부된 게시글만 썸네일 표시. 텍스트 게시글에 발자국 그라데이션 강제로 안 그림.
    const hasImage = !!post.imageUrl;

    return (
        <TouchableOpacity onPress={onPress} style={[styles.card, {
            gap: 16 * spacingScale,
            padding: 12 * spacingScale,
            backgroundColor: isDarkMode ? COLORS.gray[900] : "rgba(255,255,255,0.7)",
        }]} activeOpacity={0.85}>
            {hasImage ? (
                <View style={[styles.thumb, { width: 64 * spacingScale, height: 64 * spacingScale }]}>
                    <Image source={{ uri: post.imageUrl }} style={styles.thumbImg} />
                    {post.badge ? (
                        <View style={styles.badge}>
                            <Text style={[styles.badgeText, { fontSize: 9 * fontScale }]} numberOfLines={1}>{post.badge}</Text>
                        </View>
                    ) : null}
                </View>
            ) : null}

            {/* 본문 */}
            <View style={styles.body}>
                {!hasImage && post.badge ? (
                    <LinearGradient
                        colors={gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.inlineBadge}
                    >
                        <Text style={[styles.inlineBadgeText, { fontSize: 10 * fontScale }]} numberOfLines={1}>{post.badge}</Text>
                    </LinearGradient>
                ) : null}
                <Text style={[styles.cardTitle, {
                    fontSize: 14 * fontScale,
                    lineHeight: 20 * fontScale,
                    color: isDarkMode ? COLORS.white : COLORS.gray[800],
                }]} numberOfLines={2}>{post.title}</Text>
                <View style={[styles.metaRow, { gap: 8 * spacingScale }]}>
                    <Text style={[styles.author, { fontSize: 12 * fontScale }]} numberOfLines={1}>{post.author}</Text>
                    <TouchableOpacity onPress={handleLike} hitSlop={8} activeOpacity={0.7} style={styles.metaItem}>
                        <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                            <Ionicons
                                name={post.isLiked ? "heart" : "heart-outline"}
                                size={13 * iconScale}
                                color={post.isLiked ? "#EF4444" : COLORS.gray[400]}
                            />
                        </Animated.View>
                        <Text style={[styles.statText, { fontSize: 11 * fontScale }, post.isLiked && { color: "#EF4444" }]}>{post.likes}</Text>
                    </TouchableOpacity>
                    <View style={styles.metaItem}>
                        <Ionicons name="chatbubble-outline" size={12 * iconScale} color={COLORS.gray[400]} />
                        <Text style={[styles.statText, { fontSize: 11 * fontScale }]}>{post.comments}</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    section: { marginTop: 24 },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
    headerIcon: {
        width: 40,
        height: 40,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    title: { fontSize: 16, fontWeight: "700", color: COLORS.gray[800] },
    subtitle: { fontSize: 12, color: COLORS.gray[500], marginTop: 2 },
    moreBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    moreText: { fontSize: 13, fontWeight: "600" },
    loading: { paddingVertical: 32, alignItems: "center" },
    empty: {
        alignItems: "center",
        paddingVertical: 40,
        gap: 6,
    },
    emptyText: { fontSize: 14, color: COLORS.gray[500], marginTop: 8 },
    emptyHint: { fontSize: 12, color: COLORS.gray[400] },
    list: {
        paddingHorizontal: 16,
        gap: 8,
    },
    card: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        padding: 12,
        borderRadius: 16,
        backgroundColor: "rgba(255,255,255,0.7)",
    },
    thumb: {
        width: 64,
        height: 64,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        backgroundColor: COLORS.gray[100],
    },
    thumbImg: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
    },
    inlineBadge: {
        alignSelf: "flex-start",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        marginBottom: 4,
    },
    inlineBadgeText: {
        fontSize: 10,
        fontWeight: "700",
        color: "#fff",
    },
    badge: {
        position: "absolute",
        bottom: 3,
        right: 3,
        backgroundColor: "rgba(0,0,0,0.4)",
        borderRadius: 4,
        paddingHorizontal: 4,
        paddingVertical: 1,
        maxWidth: "85%",
    },
    badgeText: { fontSize: 9, fontWeight: "700", color: "#fff" },
    body: { flex: 1, gap: 6 },
    cardTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.gray[800],
        lineHeight: 20,
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    author: {
        flex: 1,
        fontSize: 12,
        color: COLORS.gray[400],
    },
    metaItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
    },
    statText: { fontSize: 11, color: COLORS.gray[400] },
});
