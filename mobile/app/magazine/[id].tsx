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
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { API_BASE_URL } from "@/config/constants";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { useDarkMode } from "@/contexts/ThemeContext";
import { COLORS } from "@/lib/theme";
import { buildMagazineCards, type MagazineCard } from "@/lib/magazine-cards";
import { supabase } from "@/lib/supabase";

interface ArticleDetail {
    id: string;
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
    read_time?: string | number;
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
        id: r.id != null ? String(r.id) : "",
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
        // DB는 read_time이 string ("5분") — string/number 모두 허용
        read_time: typeof r.read_time === "string" || typeof r.read_time === "number"
            ? r.read_time
            : (typeof r.readTime === "string" || typeof r.readTime === "number" ? r.readTime : undefined),
    };
}

export default function MagazineReaderScreen() {
    const { isDarkMode } = useDarkMode();
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

    // 조회수 증가 — session 준비된 후 1회 (id 또는 session 변경 시 재시도)
    useEffect(() => {
        if (id && session?.access_token) {
            incrementView();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, session?.access_token]);

    async function incrementView() {
        // 서버 PATCH는 인증 필수 (조회수/좋아요 조작 방지). 비로그인은 카운트 안 됨.
        if (!session?.access_token) return;
        try {
            await fetch(`${API_BASE_URL}/api/magazine`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ articleId: id, action: "view" }),
            });
        } catch {
            // silent
        }
    }

    async function load() {
        try {
            // 웹은 /magazine/[id] SSR 페이지에서 Supabase 직접 조회 (GET API 없음).
            // 모바일은 supabase 클라이언트로 동일 쿼리 + 좋아요 join.
            const { data: row, error } = await supabase
                .from("magazine_articles")
                .select("*")
                .eq("id", id)
                .eq("status", "published")
                .maybeSingle();
            if (error || !row) {
                setIsLoading(false);
                return;
            }

            // 좋아요 여부 별도 조회 (RLS로 본인 것만 보임)
            let liked = false;
            if (session?.access_token && row.id) {
                const { data: likeRow } = await supabase
                    .from("magazine_likes")
                    .select("id")
                    .eq("article_id", row.id)
                    .maybeSingle();
                liked = !!likeRow;
            }

            setArticle(normalizeArticle({ ...row, liked }));
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
        const prevLiked = article.liked;
        const prevLikes = article.likes;
        const newLiked = !prevLiked;
        // 낙관적 업데이트
        setArticle((a) => a ? { ...a, liked: newLiked, likes: a.likes + (newLiked ? 1 : -1) } : a);
        try {
            const res = await fetch(`${API_BASE_URL}/api/magazine`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ articleId: id, action: newLiked ? "like" : "unlike" }),
            });
            if (!res.ok) throw new Error("PATCH failed");
            const data = await res.json();
            // 서버 응답으로 truth 정렬 (race/중복 클릭 방어)
            if (typeof data.liked === "boolean" && typeof data.likes === "number") {
                setArticle((a) => a ? { ...a, liked: data.liked, likes: data.likes } : a);
            }
        } catch {
            // 롤백
            setArticle((a) => a ? { ...a, liked: prevLiked, likes: prevLikes } : a);
        } finally {
            setIsLiking(false);
        }
    }

    async function handleShare() {
        if (!article) return;
        const url = `https://mementoani.com/magazine/${id}`;
        const summary = article.summary?.trim();
        // iOS는 url 별도 필드로 rich preview, Android는 message에 포함
        const message = summary
            ? `${article.title}\n\n${summary}\n\n${url}`
            : `${article.title}\n\n${url}`;
        try {
            await Share.share({
                title: article.title,
                message,
                url, // iOS용 — 카카오톡/메시지/메일에서 rich link 표시
            });
        } catch {
            // 사용자 취소 — silent
        }
    }

    // 카드 빌드: 웹과 동일한 splitContent 로직 (HTML <hr>/<h2>/<img>/<blockquote> 인식)
    const cards = useMemo<MagazineCard[]>(() => {
        if (!article) return [];
        return buildMagazineCards(article);
    }, [article]);

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? COLORS.gray[950] : COLORS.white }]}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={accentColor} />
                </View>
            </SafeAreaView>
        );
    }

    if (!article) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? COLORS.gray[950] : COLORS.white }]}>
                <View style={styles.center}>
                    <Text style={{ color: COLORS.gray[500] }}>기사를 불러올 수 없습니다.</Text>
                </View>
            </SafeAreaView>
        );
    }

    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.white;
    const totalCards = cards.length;
    const progressPct = Math.min(100, Math.round(((currentCard + 1) / totalCards) * 100));

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={["top"]}>
            <Stack.Screen options={{ headerShown: false }} />
            {/* 상단 바: close + progress + share */}
            <View style={styles.topBar}>
                <TouchableOpacity
                    onPress={() => {
                        if (router.canGoBack()) router.back();
                        else router.replace("/(tabs)/magazine");
                    }}
                    hitSlop={8}
                >
                    <Ionicons name="arrow-back" size={22} color={isDarkMode ? COLORS.white : COLORS.gray[800]} />
                </TouchableOpacity>
                <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: accentColor }]} />
                </View>
                <TouchableOpacity onPress={handleShare} hitSlop={8}>
                    <Ionicons name="share-outline" size={22} color={isDarkMode ? COLORS.white : COLORS.gray[800]} />
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
                    if (card.type === "text") {
                        return <TextCard key={idx} card={card} isMemorialMode={isMemorialMode} index={idx} />;
                    }
                    if (card.type === "image") {
                        return <ImageCard key={idx} card={card} isMemorialMode={isMemorialMode} />;
                    }
                    if (card.type === "quote") {
                        return <QuoteCard key={idx} card={card} accentColor={accentColor} />;
                    }
                    return (
                        <EndCard
                            key={idx}
                            article={article}
                            isMemorialMode={isMemorialMode}
                            accentColor={accentColor}
                            isLiking={isLiking}
                            onLike={handleLike}
                            onBack={() => {
                                // router.back()이 stack 상태에 따라 hang하는 케이스 회피.
                                // 매거진 탭으로 명시적 navigate.
                                if (router.canGoBack()) {
                                    router.back();
                                } else {
                                    router.replace("/(tabs)/magazine");
                                }
                            }}
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
                    <Ionicons name="chevron-back" size={20} color={isDarkMode ? COLORS.white : COLORS.gray[800]} />
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
                    <Ionicons name="chevron-forward" size={20} color={isDarkMode ? COLORS.white : COLORS.gray[800]} />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

function CoverCard({ article, isMemorialMode }: { article: ArticleDetail; isMemorialMode: boolean }) {
    const { isDarkMode } = useDarkMode();
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
                    color: isDarkMode ? COLORS.white : COLORS.gray[900],
                }]}>
                    {article.title}
                </Text>

                {article.author || article.created_at || article.read_time ? (
                    <View style={styles.coverMetaRow}>
                        <Text style={styles.coverMeta}>
                            {article.author ? `${article.author} · ` : ""}
                            {article.created_at.slice(0, 10)}
                        </Text>
                        {article.read_time ? (
                            <View style={styles.readTimeBadge}>
                                <Ionicons name="time-outline" size={11} color="#fff" />
                                <Text style={styles.readTimeText}>
                                    {typeof article.read_time === "number"
                                        ? `${article.read_time}분 읽기`
                                        : `${article.read_time} 읽기`}
                                </Text>
                            </View>
                        ) : null}
                    </View>
                ) : null}
            </View>
        </View>
    );
}

function SummaryCard({ article, isMemorialMode, accentColor }: { article: ArticleDetail; isMemorialMode: boolean; accentColor: string }) {
    const { isDarkMode } = useDarkMode();
    return (
        <ScrollView
            style={[styles.card, { width: SCREEN_W }]}
            contentContainerStyle={styles.cardScrollContent}
        >
            <Text style={[styles.cardLabel, { color: accentColor }]}>요약</Text>
            <View style={[styles.summaryBox, {
                backgroundColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[50],
                borderLeftColor: accentColor,
            }]}>
                <Text style={[styles.summaryText, {
                    color: isDarkMode ? COLORS.gray[200] : COLORS.gray[700],
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

function TextCard({ card, isMemorialMode, index }: { card: MagazineCard; isMemorialMode: boolean; index: number }) {
    const { isDarkMode } = useDarkMode();
    const isAlt = index % 2 === 0;
    const bg = isDarkMode
        ? (isAlt ? COLORS.gray[900] : COLORS.gray[950])
        : (isAlt ? COLORS.gray[50] : COLORS.white);
    const textColor = isDarkMode ? COLORS.gray[200] : COLORS.gray[800];

    return (
        <ScrollView
            style={[styles.card, { width: SCREEN_W, backgroundColor: bg }]}
            contentContainerStyle={styles.cardScrollContent}
        >
            {card.heading ? (
                <Text style={[styles.bodyHeading, { color: isDarkMode ? COLORS.white : COLORS.gray[900] }]}>
                    {card.heading}
                </Text>
            ) : null}
            {(card.paragraphs ?? []).map((p, i) => (
                <Text
                    key={i}
                    style={[styles.bodyText, { color: textColor, marginBottom: 16 }]}
                >
                    {p}
                </Text>
            ))}
        </ScrollView>
    );
}

function ImageCard({ card, isMemorialMode }: { card: MagazineCard; isMemorialMode: boolean }) {
    const { isDarkMode } = useDarkMode();
    const bg = isDarkMode ? COLORS.gray[950] : COLORS.gray[50];
    return (
        <ScrollView
            style={[styles.card, { width: SCREEN_W, backgroundColor: bg }]}
            contentContainerStyle={[styles.cardScrollContent, { padding: 0, paddingBottom: 80 }]}
        >
            {card.imageSrc ? (
                <Image
                    source={{ uri: card.imageSrc }}
                    style={{ width: SCREEN_W, height: SCREEN_W * 0.7 }}
                    resizeMode="cover"
                />
            ) : null}
            {card.caption ? (
                <Text style={[styles.imageCaption, {
                    color: isDarkMode ? COLORS.gray[400] : COLORS.gray[500],
                }]}>
                    {card.caption}
                </Text>
            ) : null}
        </ScrollView>
    );
}

function QuoteCard({ card, accentColor }: { card: MagazineCard; accentColor: string }) {
    const { isDarkMode } = useDarkMode();
    const bg = isDarkMode ? COLORS.gray[900] : COLORS.gray[50];
    return (
        <ScrollView
            style={[styles.card, { width: SCREEN_W, backgroundColor: bg }]}
            contentContainerStyle={[styles.cardScrollContent, { justifyContent: "center" }]}
        >
            <View style={[styles.quoteBox, { borderLeftColor: accentColor }]}>
                <Ionicons
                    name="chatbox-ellipses"
                    size={32}
                    color={accentColor}
                    style={{ opacity: 0.3, marginBottom: 8 }}
                />
                <Text style={[styles.quoteText, {
                    color: isDarkMode ? COLORS.white : COLORS.gray[800],
                }]}>
                    {card.text}
                </Text>
            </View>
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
    const { isDarkMode } = useDarkMode();
    return (
        <ScrollView
            style={[styles.card, { width: SCREEN_W }]}
            contentContainerStyle={styles.cardScrollContent}
        >
            <View style={styles.endTop}>
                <Ionicons name="checkmark-circle" size={48} color={accentColor} />
                <Text style={[styles.endTitle, {
                    color: isDarkMode ? COLORS.white : COLORS.gray[900],
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
    coverMetaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
    },
    readTimeBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "rgba(0,0,0,0.5)",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 9999,
    },
    readTimeText: { fontSize: 10, fontWeight: "600", color: "#fff" },
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
    bodyHeading: { fontSize: 22, fontWeight: "700", marginBottom: 16, lineHeight: 30 },
    imageCaption: {
        fontSize: 13,
        fontStyle: "italic",
        textAlign: "center",
        paddingHorizontal: 24,
        paddingVertical: 12,
    },
    quoteBox: {
        borderLeftWidth: 4,
        paddingLeft: 16,
        paddingVertical: 8,
    },
    quoteText: {
        fontSize: 22,
        lineHeight: 34,
        fontWeight: "500",
        fontStyle: "italic",
    },
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
