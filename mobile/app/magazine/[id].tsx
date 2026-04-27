/**
 * 매거진 기사 리더 (V3 Phase 3: 카드뉴스 스타일)
 *
 * 좌우 스와이프 paging:
 * - 0번: Cover (이미지 + 제목 + 배지)
 * - 1번: Summary (요약 + 메타)
 * - 2~N번: Body (단락별 카드)
 * - N+1번: End (태그 + 좋아요/조회수 + 뒤로)
 */

import { useState, useEffect, useRef, useMemo } from "react";
import {
    View, Text, ScrollView, TouchableOpacity,
    Image, ActivityIndicator, Share, Dimensions, StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { API_BASE_URL } from "@/config/constants";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { COLORS } from "@/lib/theme";

interface ArticleDetail {
    id: number;
    title: string;
    content: string;
    summary?: string;
    image_url?: string;
    badge?: string;
    likes: number;
    views: number;
    liked?: boolean;
    created_at: string;
    author?: string;
    tags?: string[];
}

const { width: SCREEN_W } = Dimensions.get("window");

const STAGE_GRADIENTS: Record<string, [string, string]> = {
    beginner: [COLORS.memento[400], COLORS.memento[500]],
    companion: ["#34D399", "#10B981"],
    senior: [COLORS.memorial[400], "#F97316"],
};

const STAGE_LABELS: Record<string, string> = {
    beginner: "처음 키워요",
    companion: "함께 성장",
    senior: "오래오래",
};

function asString(v: unknown, fb = ""): string {
    return typeof v === "string" ? v : typeof v === "number" ? String(v) : fb;
}
function asNumber(v: unknown, fb = 0): number {
    return typeof v === "number" ? v : fb;
}

function normalizeArticle(raw: unknown): ArticleDetail | null {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    return {
        id: asNumber(r.id),
        title: asString(r.title),
        content: asString(r.content),
        summary: typeof r.summary === "string" ? r.summary : undefined,
        image_url: typeof r.image_url === "string"
            ? r.image_url
            : (typeof r.imageUrl === "string" ? r.imageUrl : undefined),
        badge: typeof r.badge === "string"
            ? r.badge
            : (typeof r.stage === "string" ? r.stage : undefined),
        likes: asNumber(r.likes),
        views: asNumber(r.views),
        liked: typeof r.liked === "boolean" ? r.liked : undefined,
        created_at: asString(r.created_at ?? r.createdAt),
        author: typeof r.author === "string" ? r.author : undefined,
        tags: Array.isArray(r.tags) ? r.tags.filter((t): t is string => typeof t === "string") : undefined,
    };
}

export default function MagazineReaderScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { session } = useAuth();
    const { isMemorialMode } = usePet();
    const scrollRef = useRef<ScrollView>(null);

    const [article, setArticle] = useState<ArticleDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLiking, setIsLiking] = useState(false);
    const [currentCard, setCurrentCard] = useState(0);

    const accentColor = isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500];

    useEffect(() => { load(); }, [id]);

    async function load() {
        try {
            const headers: Record<string, string> = {};
            if (session) headers["Authorization"] = `Bearer ${session.access_token}`;
            const res = await fetch(`${API_BASE_URL}/api/magazine/${id}`, { headers });
            if (res.ok) {
                const data = await res.json();
                setArticle(normalizeArticle(data?.article ?? data));
            }
        } catch {
            // ignore
        } finally {
            setIsLoading(false);
        }
    }

    async function handleLike() {
        if (!session || !article || isLiking) return;
        setIsLiking(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const newLiked = !article.liked;
        setArticle((a) => a ? { ...a, liked: newLiked, likes: a.likes + (newLiked ? 1 : -1) } : a);
        try {
            await fetch(`${API_BASE_URL}/api/magazine`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ articleId: Number(id), action: newLiked ? "like" : "unlike" }),
            });
        } catch {
            setArticle((a) => a ? { ...a, liked: !newLiked, likes: a.likes + (newLiked ? -1 : 1) } : a);
        } finally {
            setIsLiking(false);
        }
    }

    async function handleShare() {
        if (!article) return;
        await Share.share({
            title: article.title,
            message: `${article.title}\n\nhttps://mementoani.com/magazine/${id}`,
        });
    }

    // 카드 빌드: cover + summary + bodies + end
    const cards = useMemo(() => {
        if (!article) return [];
        const list: Array<{ type: "cover" | "summary" | "body" | "end"; text?: string }> = [];
        list.push({ type: "cover" });
        if (article.summary) list.push({ type: "summary" });

        // 본문을 단락으로 분할 (\n\n 또는 .\n) — 각 단락이 한 카드
        const paragraphs = article.content
            .split(/\n\n+/)
            .map((p) => p.trim())
            .filter((p) => p.length > 0);

        for (const para of paragraphs) {
            list.push({ type: "body", text: para });
        }

        list.push({ type: "end" });
        return list;
    }, [article]);

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: isMemorialMode ? COLORS.gray[950] : COLORS.white }]}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={accentColor} />
                </View>
            </SafeAreaView>
        );
    }

    if (!article) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: isMemorialMode ? COLORS.gray[950] : COLORS.white }]}>
                <View style={styles.center}>
                    <Text style={{ color: COLORS.gray[500] }}>기사를 불러올 수 없습니다.</Text>
                </View>
            </SafeAreaView>
        );
    }

    const bgColor = isMemorialMode ? COLORS.gray[950] : COLORS.white;
    const totalCards = cards.length;
    const progressPct = Math.min(100, Math.round(((currentCard + 1) / totalCards) * 100));

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={["top"]}>
            {/* 상단 바: close + progress + share */}
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
                    <Ionicons name="arrow-back" size={22} color={isMemorialMode ? COLORS.white : COLORS.gray[800]} />
                </TouchableOpacity>
                <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: accentColor }]} />
                </View>
                <TouchableOpacity onPress={handleShare} hitSlop={8}>
                    <Ionicons name="share-outline" size={22} color={isMemorialMode ? COLORS.white : COLORS.gray[800]} />
                </TouchableOpacity>
            </View>

            <Text style={styles.cardCounter}>{currentCard + 1} / {totalCards}</Text>

            <ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
                    setCurrentCard(idx);
                }}
            >
                {cards.map((card, idx) => {
                    if (card.type === "cover") {
                        return <CoverCard key={idx} article={article} isMemorialMode={isMemorialMode} />;
                    }
                    if (card.type === "summary") {
                        return <SummaryCard key={idx} article={article} isMemorialMode={isMemorialMode} accentColor={accentColor} />;
                    }
                    if (card.type === "body") {
                        return <BodyCard key={idx} text={card.text ?? ""} isMemorialMode={isMemorialMode} index={idx} />;
                    }
                    return (
                        <EndCard
                            key={idx}
                            article={article}
                            isMemorialMode={isMemorialMode}
                            accentColor={accentColor}
                            isLiking={isLiking}
                            onLike={handleLike}
                            onBack={() => router.back()}
                        />
                    );
                })}
            </ScrollView>

            {/* 하단 좌우 화살표 (옵션) */}
            <View style={styles.bottomNav}>
                <TouchableOpacity
                    onPress={() => {
                        if (currentCard > 0) {
                            scrollRef.current?.scrollTo({ x: (currentCard - 1) * SCREEN_W, animated: true });
                        }
                    }}
                    disabled={currentCard === 0}
                    style={[styles.navBtn, currentCard === 0 && { opacity: 0.3 }]}
                >
                    <Ionicons name="chevron-back" size={20} color={isMemorialMode ? COLORS.white : COLORS.gray[800]} />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => {
                        if (currentCard < totalCards - 1) {
                            scrollRef.current?.scrollTo({ x: (currentCard + 1) * SCREEN_W, animated: true });
                        }
                    }}
                    disabled={currentCard >= totalCards - 1}
                    style={[styles.navBtn, currentCard >= totalCards - 1 && { opacity: 0.3 }]}
                >
                    <Ionicons name="chevron-forward" size={20} color={isMemorialMode ? COLORS.white : COLORS.gray[800]} />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

function CoverCard({ article, isMemorialMode }: { article: ArticleDetail; isMemorialMode: boolean }) {
    const gradient = STAGE_GRADIENTS[article.badge ?? ""] ?? [COLORS.gray[400], COLORS.gray[500]];
    return (
        <View style={[styles.card, { width: SCREEN_W }]}>
            <View style={styles.coverImageWrap}>
                {article.image_url ? (
                    <Image source={{ uri: article.image_url }} style={styles.coverImage} resizeMode="cover" />
                ) : (
                    <LinearGradient colors={gradient} style={styles.coverImage} />
                )}
                <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.7)"]}
                    style={styles.coverOverlay}
                />
            </View>

            <View style={styles.coverBody}>
                {article.badge ? (
                    <LinearGradient colors={gradient} style={styles.coverBadge}>
                        <Text style={styles.coverBadgeText}>{STAGE_LABELS[article.badge] ?? article.badge}</Text>
                    </LinearGradient>
                ) : null}

                <Text style={[styles.coverTitle, {
                    color: isMemorialMode ? COLORS.white : COLORS.gray[900],
                }]}>
                    {article.title}
                </Text>

                {article.author || article.created_at ? (
                    <Text style={styles.coverMeta}>
                        {article.author ? `${article.author} · ` : ""}
                        {article.created_at.slice(0, 10)}
                    </Text>
                ) : null}
            </View>
        </View>
    );
}

function SummaryCard({ article, isMemorialMode, accentColor }: { article: ArticleDetail; isMemorialMode: boolean; accentColor: string }) {
    return (
        <ScrollView
            style={[styles.card, { width: SCREEN_W }]}
            contentContainerStyle={styles.cardScrollContent}
        >
            <Text style={[styles.cardLabel, { color: accentColor }]}>요약</Text>
            <View style={[styles.summaryBox, {
                backgroundColor: isMemorialMode ? COLORS.gray[800] : COLORS.gray[50],
                borderLeftColor: accentColor,
            }]}>
                <Text style={[styles.summaryText, {
                    color: isMemorialMode ? COLORS.gray[200] : COLORS.gray[700],
                }]}>
                    {article.summary}
                </Text>
            </View>

            <View style={styles.summaryStats}>
                <View style={styles.statBox}>
                    <Ionicons name="eye-outline" size={16} color={COLORS.gray[500]} />
                    <Text style={styles.statValue}>{article.views.toLocaleString()}</Text>
                    <Text style={styles.statLabel}>조회</Text>
                </View>
                <View style={styles.statBox}>
                    <Ionicons name="heart-outline" size={16} color={COLORS.gray[500]} />
                    <Text style={styles.statValue}>{article.likes}</Text>
                    <Text style={styles.statLabel}>좋아요</Text>
                </View>
            </View>
        </ScrollView>
    );
}

function BodyCard({ text, isMemorialMode, index }: { text: string; isMemorialMode: boolean; index: number }) {
    const isAlt = index % 2 === 0;
    const bg = isMemorialMode
        ? (isAlt ? COLORS.gray[900] : COLORS.gray[950])
        : (isAlt ? COLORS.gray[50] : COLORS.white);

    return (
        <ScrollView
            style={[styles.card, { width: SCREEN_W, backgroundColor: bg }]}
            contentContainerStyle={styles.cardScrollContent}
        >
            <Text style={[styles.bodyText, {
                color: isMemorialMode ? COLORS.gray[200] : COLORS.gray[800],
            }]}>
                {text}
            </Text>
        </ScrollView>
    );
}

function EndCard({ article, isMemorialMode, accentColor, isLiking, onLike, onBack }: {
    article: ArticleDetail;
    isMemorialMode: boolean;
    accentColor: string;
    isLiking: boolean;
    onLike: () => void;
    onBack: () => void;
}) {
    return (
        <ScrollView
            style={[styles.card, { width: SCREEN_W }]}
            contentContainerStyle={styles.cardScrollContent}
        >
            <View style={styles.endTop}>
                <Ionicons name="checkmark-circle" size={48} color={accentColor} />
                <Text style={[styles.endTitle, {
                    color: isMemorialMode ? COLORS.white : COLORS.gray[900],
                }]}>
                    읽어주셔서 감사해요
                </Text>
                <Text style={styles.endSub}>{article.title}</Text>
            </View>

            {article.tags && article.tags.length > 0 ? (
                <View style={styles.tagWrap}>
                    {article.tags.map((tag) => (
                        <View key={tag} style={styles.tagPill}>
                            <Text style={styles.tagPillText}>#{tag}</Text>
                        </View>
                    ))}
                </View>
            ) : null}

            <TouchableOpacity
                onPress={onLike}
                disabled={isLiking}
                style={[styles.likeBtn, {
                    backgroundColor: article.liked ? accentColor : "transparent",
                    borderColor: accentColor,
                }]}
                activeOpacity={0.85}
            >
                <Ionicons
                    name={article.liked ? "heart" : "heart-outline"}
                    size={20}
                    color={article.liked ? "#fff" : accentColor}
                />
                <Text style={[styles.likeBtnText, { color: article.liked ? "#fff" : accentColor }]}>
                    {article.liked ? "좋아요 취소" : "좋아요"} · {article.likes}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
                <Ionicons name="list" size={18} color={COLORS.gray[600]} />
                <Text style={styles.backBtnText}>매거진 목록으로</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
    topBar: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    progressTrack: {
        flex: 1,
        height: 4,
        backgroundColor: "rgba(0,0,0,0.08)",
        borderRadius: 2,
        overflow: "hidden",
    },
    progressFill: { height: "100%", borderRadius: 2 },
    cardCounter: {
        textAlign: "center",
        fontSize: 11,
        color: COLORS.gray[400],
        marginBottom: 8,
    },
    card: { flex: 1 },
    cardScrollContent: { padding: 24, paddingBottom: 80 },
    cardLabel: {
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1,
        textTransform: "uppercase",
        marginBottom: 16,
    },
    coverImageWrap: { width: SCREEN_W, height: SCREEN_W * 0.7, position: "relative" },
    coverImage: { width: "100%", height: "100%" },
    coverOverlay: { position: "absolute", left: 0, right: 0, bottom: 0, height: "60%" },
    coverBody: { padding: 24, gap: 12 },
    coverBadge: {
        alignSelf: "flex-start",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 9999,
    },
    coverBadgeText: { fontSize: 12, fontWeight: "700", color: "#fff" },
    coverTitle: { fontSize: 26, fontWeight: "800", lineHeight: 34 },
    coverMeta: { fontSize: 13, color: COLORS.gray[500] },
    summaryBox: {
        padding: 20,
        borderRadius: 16,
        borderLeftWidth: 4,
    },
    summaryText: { fontSize: 17, lineHeight: 28, fontWeight: "500" },
    summaryStats: {
        flexDirection: "row",
        gap: 16,
        marginTop: 24,
    },
    statBox: {
        flex: 1,
        alignItems: "center",
        gap: 4,
        padding: 16,
        backgroundColor: "rgba(0,0,0,0.04)",
        borderRadius: 12,
    },
    statValue: { fontSize: 20, fontWeight: "700", color: COLORS.gray[800] },
    statLabel: { fontSize: 11, color: COLORS.gray[500] },
    bodyText: { fontSize: 17, lineHeight: 30 },
    endTop: { alignItems: "center", paddingVertical: 32, gap: 8 },
    endTitle: { fontSize: 22, fontWeight: "700" },
    endSub: { fontSize: 14, color: COLORS.gray[500], textAlign: "center" },
    tagWrap: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginVertical: 16,
        justifyContent: "center",
    },
    tagPill: {
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 9999,
    },
    tagPillText: { fontSize: 12, color: "#059669" },
    likeBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 2,
        marginTop: 16,
    },
    likeBtnText: { fontSize: 14, fontWeight: "600" },
    backBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 12,
        marginTop: 8,
    },
    backBtnText: { fontSize: 13, color: COLORS.gray[600] },
    bottomNav: {
        position: "absolute",
        left: 0, right: 0, bottom: 16,
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 16,
    },
    navBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.9)",
        alignItems: "center",
        justifyContent: "center",
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
});
