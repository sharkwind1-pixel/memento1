/**
 * 매거진 탭 — 펫 정보 아티클 목록 (V3 Phase 2: 웹 디자인 1:1 매칭)
 *
 * 구조:
 * 1. 헤더 + 검색
 * 2. Stage 4개 가로 스크롤 카드 (그라데이션 + 아이콘)
 * 3. Topic 7개 가로 스크롤 칩
 * 4. 카드 그리드 (이미지 + 본문 + 메타)
 * 5. 무한 스크롤
 */

import { useState, useEffect, useCallback } from "react";
import {
    View, Text, FlatList, TouchableOpacity,
    Image, TextInput, RefreshControl, ActivityIndicator,
    ScrollView, StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { API_BASE_URL } from "@/config/constants";
import { usePet } from "@/contexts/PetContext";
import { useAuth } from "@/contexts/AuthContext";
import { COLORS } from "@/lib/theme";

interface Article {
    id: number;
    title: string;
    summary?: string;
    image_url?: string;
    badge?: string;        // "처음 키워요" / "함께 성장해요" / "오래오래 함께"
    category?: string;     // health / food / grooming / behavior / living / travel
    likes: number;
    views: number;
    liked?: boolean;
    created_at: string;
    author?: string;
    read_time?: number;
    tags?: string[];
}

const STAGES: Array<{
    id: string; label: string; icon: React.ComponentProps<typeof Ionicons>["name"];
    gradient: [string, string]; description: string;
}> = [
    { id: "all", label: "전체", icon: "book-outline", gradient: ["#10B981", "#14B8A6"], description: "모든 콘텐츠" },
    { id: "beginner", label: "처음 키워요", icon: "sparkles-outline", gradient: [COLORS.memento[400], COLORS.memento[500]], description: "초보 가이드" },
    { id: "companion", label: "함께 성장", icon: "heart-outline", gradient: ["#34D399", "#10B981"], description: "일상 케어" },
    { id: "senior", label: "오래오래", icon: "shield-outline", gradient: [COLORS.memorial[400], "#F97316"], description: "시니어 케어" },
];

const TOPICS: Array<{ id: string; label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }> = [
    { id: "all", label: "전체", icon: "book-outline" },
    { id: "health", label: "건강/의료", icon: "medkit-outline" },
    { id: "food", label: "사료/영양", icon: "restaurant-outline" },
    { id: "grooming", label: "미용/위생", icon: "cut-outline" },
    { id: "behavior", label: "행동/훈련", icon: "bulb-outline" },
    { id: "living", label: "생활/용품", icon: "home-outline" },
    { id: "travel", label: "여행/외출", icon: "airplane-outline" },
];

const PAGE_SIZE = 20;

export default function MagazineScreen() {
    const router = useRouter();
    const { session } = useAuth();
    const { isMemorialMode } = usePet();

    const [articles, setArticles] = useState<Article[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState("");
    const [selectedStage, setSelectedStage] = useState("all");
    const [selectedTopic, setSelectedTopic] = useState("all");
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const accentColor = isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500];

    const fetchArticles = useCallback(async (reset = false) => {
        const currentPage = reset ? 1 : page;
        try {
            const params = new URLSearchParams({
                page: String(currentPage),
                limit: String(PAGE_SIZE),
                ...(selectedStage !== "all" && { stage: selectedStage }),
                ...(selectedTopic !== "all" && { category: selectedTopic }),
                ...(search && { search }),
            });
            const headers: Record<string, string> = {};
            if (session) headers["Authorization"] = `Bearer ${session.access_token}`;

            const res = await fetch(`${API_BASE_URL}/api/magazine?${params}`, { headers });
            if (!res.ok) return;
            const data = await res.json();
            const rawList = Array.isArray(data?.articles) ? data.articles : Array.isArray(data) ? data : [];

            const items: Article[] = rawList.map((raw: Record<string, unknown>): Article => ({
                id: typeof raw.id === "number" ? raw.id : 0,
                title: typeof raw.title === "string" ? raw.title : "",
                summary: typeof raw.summary === "string" ? raw.summary : undefined,
                image_url: typeof raw.image_url === "string"
                    ? raw.image_url
                    : (typeof raw.imageUrl === "string" ? raw.imageUrl : undefined),
                badge: typeof raw.badge === "string"
                    ? raw.badge
                    : (typeof raw.stage === "string" ? raw.stage : undefined),
                category: typeof raw.category === "string" ? raw.category : undefined,
                likes: typeof raw.likes === "number" ? raw.likes : 0,
                views: typeof raw.views === "number" ? raw.views : 0,
                liked: typeof raw.liked === "boolean" ? raw.liked : undefined,
                created_at: typeof raw.created_at === "string"
                    ? raw.created_at
                    : (typeof raw.createdAt === "string" ? raw.createdAt : ""),
                author: typeof raw.author === "string" ? raw.author : undefined,
                read_time: typeof raw.read_time === "number"
                    ? raw.read_time
                    : (typeof raw.readTime === "number" ? raw.readTime : undefined),
                tags: Array.isArray(raw.tags) ? raw.tags.filter((t): t is string => typeof t === "string") : undefined,
            }));

            if (reset) {
                setArticles(items);
                setPage(2);
            } else {
                setArticles((prev) => [...prev, ...items]);
                setPage((p) => p + 1);
            }
            setHasMore(items.length === PAGE_SIZE);
        } catch {
            // 조용히
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [page, selectedStage, selectedTopic, search, session]);

    useEffect(() => {
        setIsLoading(true);
        fetchArticles(true);
    }, [selectedStage, selectedTopic]);

    function onRefresh() {
        setRefreshing(true);
        fetchArticles(true);
    }

    function clearFilters() {
        setSelectedStage("all");
        setSelectedTopic("all");
        setSearch("");
    }

    function badgeLabel(badge?: string) {
        if (!badge) return "";
        const map: Record<string, string> = {
            beginner: "처음 키워요",
            companion: "함께 성장",
            senior: "오래오래",
        };
        return map[badge] ?? badge;
    }

    function badgeColor(badge?: string): [string, string] {
        if (!badge) return [COLORS.gray[400], COLORS.gray[500]];
        const map: Record<string, [string, string]> = {
            beginner: [COLORS.memento[400], COLORS.memento[500]],
            companion: ["#34D399", "#10B981"],
            senior: [COLORS.memorial[400], "#F97316"],
        };
        return map[badge] ?? [COLORS.gray[400], COLORS.gray[500]];
    }

    const bgColor = isMemorialMode ? COLORS.gray[950] : COLORS.gray[50];
    const filtersActive = selectedStage !== "all" || selectedTopic !== "all" || search.length > 0;

    return (
        <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
            <FlatList
                data={isLoading ? [] : articles}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={{ paddingBottom: 32 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
                }
                onEndReached={() => { if (hasMore && !isLoading) fetchArticles(); }}
                onEndReachedThreshold={0.3}
                ListHeaderComponent={
                    <View>
                        {/* 헤더 + 검색 */}
                        <View style={styles.headerWrap}>
                            <Text style={[styles.title, { color: isMemorialMode ? COLORS.white : COLORS.gray[900] }]}>
                                펫 매거진
                            </Text>
                            <Text style={styles.titleSub}>전문가와 함께 만든 반려동물 정보</Text>

                            <View style={[styles.searchBar, {
                                backgroundColor: isMemorialMode ? COLORS.gray[800] : COLORS.white,
                                borderColor: isMemorialMode ? COLORS.gray[700] : COLORS.gray[200],
                            }]}>
                                <Ionicons name="search-outline" size={18} color={COLORS.gray[400]} />
                                <TextInput
                                    style={[styles.searchInput, { color: isMemorialMode ? COLORS.white : COLORS.gray[900] }]}
                                    placeholder="기사 검색..."
                                    placeholderTextColor={COLORS.gray[400]}
                                    value={search}
                                    onChangeText={setSearch}
                                    returnKeyType="search"
                                    onSubmitEditing={() => { setIsLoading(true); fetchArticles(true); }}
                                />
                                {search.length > 0 && (
                                    <TouchableOpacity onPress={() => { setSearch(""); fetchArticles(true); }}>
                                        <Ionicons name="close-circle" size={18} color={COLORS.gray[400]} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        {/* Stage 4개 큰 카드 */}
                        <Text style={styles.sectionLabel}>단계</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.stageScroll}
                        >
                            {STAGES.map((s) => {
                                const active = selectedStage === s.id;
                                return (
                                    <TouchableOpacity
                                        key={s.id}
                                        onPress={() => setSelectedStage(s.id)}
                                        activeOpacity={0.85}
                                    >
                                        {active ? (
                                            <LinearGradient
                                                colors={s.gradient}
                                                style={styles.stageCard}
                                            >
                                                <Ionicons name={s.icon} size={20} color="#fff" />
                                                <Text style={styles.stageLabelActive}>{s.label}</Text>
                                                <Text style={styles.stageDescActive}>{s.description}</Text>
                                            </LinearGradient>
                                        ) : (
                                            <View style={[styles.stageCard, styles.stageCardInactive, {
                                                backgroundColor: isMemorialMode ? COLORS.gray[800] : COLORS.white,
                                                borderColor: isMemorialMode ? COLORS.gray[700] : COLORS.gray[200],
                                            }]}>
                                                <Ionicons name={s.icon} size={20} color={s.gradient[1]} />
                                                <Text style={[styles.stageLabel, {
                                                    color: isMemorialMode ? COLORS.white : COLORS.gray[800],
                                                }]}>
                                                    {s.label}
                                                </Text>
                                                <Text style={styles.stageDesc}>{s.description}</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {/* Topic 7개 칩 */}
                        <Text style={[styles.sectionLabel, { marginTop: 16 }]}>주제</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.topicScroll}
                        >
                            {TOPICS.map((t) => {
                                const active = selectedTopic === t.id;
                                return (
                                    <TouchableOpacity
                                        key={t.id}
                                        onPress={() => setSelectedTopic(t.id)}
                                        style={[styles.topicChip, {
                                            backgroundColor: active
                                                ? "#10B981"
                                                : (isMemorialMode ? COLORS.gray[800] : COLORS.white),
                                            borderColor: active
                                                ? "#10B981"
                                                : (isMemorialMode ? COLORS.gray[700] : COLORS.gray[200]),
                                        }]}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons
                                            name={t.icon}
                                            size={14}
                                            color={active ? "#fff" : (isMemorialMode ? COLORS.gray[300] : COLORS.gray[600])}
                                        />
                                        <Text style={{
                                            fontSize: 13,
                                            fontWeight: "500",
                                            color: active ? "#fff" : (isMemorialMode ? COLORS.gray[300] : COLORS.gray[600]),
                                        }}>
                                            {t.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {/* 결과 카운트 */}
                        {filtersActive && !isLoading && (
                            <Text style={styles.resultCount}>{articles.length}개의 콘텐츠</Text>
                        )}

                        {/* 로딩 */}
                        {isLoading && (
                            <View style={{ paddingVertical: 64, alignItems: "center" }}>
                                <ActivityIndicator size="large" color={accentColor} />
                            </View>
                        )}
                    </View>
                }
                renderItem={({ item }) => (
                    <ArticleCard
                        article={item}
                        isMemorialMode={isMemorialMode}
                        onPress={() => router.push(`/magazine/${item.id}`)}
                        badgeLabel={badgeLabel}
                        badgeColor={badgeColor}
                    />
                )}
                ListFooterComponent={
                    !isLoading && hasMore ? (
                        <View style={{ paddingVertical: 16, alignItems: "center" }}>
                            <ActivityIndicator size="small" color={accentColor} />
                        </View>
                    ) : null
                }
                ListEmptyComponent={
                    !isLoading ? (
                        <View style={styles.emptyWrap}>
                            <View style={[styles.emptyIconBg, {
                                backgroundColor: isMemorialMode ? COLORS.gray[800] : COLORS.gray[100],
                            }]}>
                                <Ionicons name="book-outline" size={32} color={COLORS.gray[400]} />
                            </View>
                            <Text style={styles.emptyText}>
                                {filtersActive ? "해당 조건의 콘텐츠가 없습니다" : "아직 등록된 매거진 기사가 없습니다"}
                            </Text>
                            {filtersActive && (
                                <TouchableOpacity onPress={clearFilters} style={styles.resetBtn}>
                                    <Text style={styles.resetBtnText}>전체 보기</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : null
                }
            />
        </SafeAreaView>
    );
}

function ArticleCard({ article, isMemorialMode, onPress, badgeLabel, badgeColor }: {
    article: Article;
    isMemorialMode: boolean;
    onPress: () => void;
    badgeLabel: (b?: string) => string;
    badgeColor: (b?: string) => [string, string];
}) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.85}
            style={[styles.card, {
                backgroundColor: isMemorialMode ? COLORS.gray[900] : COLORS.white,
                borderColor: isMemorialMode ? COLORS.gray[800] : COLORS.gray[100],
            }]}
        >
            {article.image_url ? (
                <Image source={{ uri: article.image_url }} style={styles.cardImage} resizeMode="cover" />
            ) : (
                <View style={[styles.cardImage, {
                    backgroundColor: isMemorialMode ? COLORS.gray[800] : COLORS.gray[100],
                    alignItems: "center",
                    justifyContent: "center",
                }]}>
                    <Ionicons name="newspaper-outline" size={36} color={COLORS.gray[400]} />
                </View>
            )}

            <View style={styles.cardBody}>
                {article.badge ? (
                    <LinearGradient
                        colors={badgeColor(article.badge)}
                        style={styles.cardBadge}
                    >
                        <Text style={styles.cardBadgeText}>{badgeLabel(article.badge)}</Text>
                    </LinearGradient>
                ) : null}

                <Text style={[styles.cardTitle, {
                    color: isMemorialMode ? COLORS.white : COLORS.gray[800],
                }]} numberOfLines={2}>
                    {article.title}
                </Text>

                {article.summary ? (
                    <Text style={[styles.cardSummary, {
                        color: isMemorialMode ? COLORS.gray[400] : COLORS.gray[600],
                    }]} numberOfLines={2}>
                        {article.summary}
                    </Text>
                ) : null}

                {article.tags && article.tags.length > 0 ? (
                    <View style={styles.tagRow}>
                        {article.tags.slice(0, 3).map((tag) => (
                            <View key={tag} style={styles.tag}>
                                <Text style={styles.tagText}>#{tag}</Text>
                            </View>
                        ))}
                    </View>
                ) : null}

                <View style={styles.metaRow}>
                    <View style={styles.metaLeft}>
                        {article.author ? <Text style={styles.metaText}>{article.author}</Text> : null}
                        {article.author && article.created_at ? <Text style={styles.metaText}>·</Text> : null}
                        {article.created_at ? <Text style={styles.metaText}>{article.created_at.slice(0, 10)}</Text> : null}
                    </View>
                    <View style={styles.metaRight}>
                        <View style={styles.statRow}>
                            <Ionicons name="eye-outline" size={11} color={COLORS.gray[500]} />
                            <Text style={styles.metaText}>{article.views.toLocaleString()}</Text>
                        </View>
                        <View style={styles.statRow}>
                            <Ionicons
                                name={article.liked ? "heart" : "heart-outline"}
                                size={11}
                                color={article.liked ? "#EF4444" : COLORS.gray[500]}
                            />
                            <Text style={styles.metaText}>{article.likes}</Text>
                        </View>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    headerWrap: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
    title: { fontSize: 24, fontWeight: "700", marginBottom: 4 },
    titleSub: { fontSize: 13, color: COLORS.gray[500], marginBottom: 16 },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 14,
        borderWidth: 1,
    },
    searchInput: { flex: 1, fontSize: 14, padding: 0 },
    sectionLabel: {
        paddingHorizontal: 20,
        fontSize: 12,
        fontWeight: "500",
        color: COLORS.gray[500],
        marginBottom: 8,
    },
    stageScroll: { paddingHorizontal: 16, gap: 12 },
    stageCard: {
        width: 140,
        padding: 16,
        borderRadius: 16,
        gap: 6,
    },
    stageCardInactive: { borderWidth: 1 },
    stageLabel: { fontSize: 14, fontWeight: "700", marginTop: 4 },
    stageLabelActive: { fontSize: 14, fontWeight: "700", color: "#fff", marginTop: 4 },
    stageDesc: { fontSize: 11, color: COLORS.gray[500] },
    stageDescActive: { fontSize: 11, color: "rgba(255,255,255,0.85)" },
    topicScroll: { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
    topicChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 9999,
        borderWidth: 1,
    },
    resultCount: {
        paddingHorizontal: 20,
        marginTop: 16,
        fontSize: 13,
        color: COLORS.gray[500],
    },
    card: {
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 16,
        overflow: "hidden",
        borderWidth: 1,
    },
    cardImage: { width: "100%", height: 180 },
    cardBody: { padding: 16, gap: 8 },
    cardBadge: {
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    cardBadgeText: { fontSize: 11, fontWeight: "600", color: "#fff" },
    cardTitle: { fontSize: 17, fontWeight: "700", lineHeight: 22 },
    cardSummary: { fontSize: 13, lineHeight: 18 },
    tagRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
    tag: {
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 9999,
    },
    tagText: { fontSize: 11, color: "#059669" },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 4,
    },
    metaLeft: { flexDirection: "row", alignItems: "center", gap: 4 },
    metaRight: { flexDirection: "row", alignItems: "center", gap: 12 },
    statRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    metaText: { fontSize: 11, color: COLORS.gray[500] },
    emptyWrap: { alignItems: "center", paddingVertical: 64 },
    emptyIconBg: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    emptyText: { fontSize: 14, color: COLORS.gray[500] },
    resetBtn: {
        marginTop: 16,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.gray[300],
    },
    resetBtnText: { fontSize: 14, color: COLORS.gray[700] },
});
