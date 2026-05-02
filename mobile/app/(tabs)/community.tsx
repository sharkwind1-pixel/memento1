/**
 * 커뮤니티 탭 (V3 Phase 4: 디자인 강화)
 *
 * - 5개 서브카테고리 가로 칩 (free/memorial/adoption/local/lost)
 * - 검색바
 * - FAB 글쓰기 버튼
 * - 카드 (이미지 + 본문 + 좋아요/댓글/시간 메타)
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
    View, Text, ScrollView, TouchableOpacity,
    FlatList, RefreshControl, ActivityIndicator,
    TextInput, Image, StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { API_BASE_URL } from "@/config/constants";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { useDarkMode } from "@/contexts/ThemeContext";
import { CommunityPost, CommunitySubcategory } from "@/types";
import { COLORS } from "@/lib/theme";
import AppHeader from "@/components/common/AppHeader";
import AppDrawer from "@/components/common/AppDrawer";

const SUBCATEGORIES: Array<{
    id: CommunitySubcategory;
    label: string;
    icon: React.ComponentProps<typeof Ionicons>["name"];
    gradient: [string, string];
}> = [
    { id: "free", label: "자유", icon: "chatbubbles-outline", gradient: [COLORS.memento[400], COLORS.memento[500]] },
    { id: "memorial", label: "추모", icon: "heart-outline", gradient: [COLORS.memorial[400], "#F97316"] },
    { id: "adoption", label: "입양", icon: "home-outline", gradient: ["#34D399", "#10B981"] },
    { id: "local", label: "지역", icon: "location-outline", gradient: ["#A78BFA", "#8B5CF6"] },
    { id: "lost", label: "분실", icon: "search-outline", gradient: ["#F87171", "#EF4444"] },
];

function asString(v: unknown, fb = ""): string {
    return typeof v === "string" ? v : typeof v === "number" ? String(v) : fb;
}
function asNumber(v: unknown, fb = 0): number {
    return typeof v === "number" ? v : fb;
}

function relativeTime(dateStr?: string): string {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "방금";
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}일 전`;
    return new Date(dateStr).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

export default function CommunityScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ view?: string }>();
    const { session } = useAuth();
    const { isMemorialMode } = usePet();
    const { isDarkMode } = useDarkMode();
    // view=showcase 진입(홈 "함께 보기" 더보기 → 자랑 갤러리 모드)
    const showcaseMode = params.view === "showcase";
    const [activeTab, setActiveTab] = useState<CommunitySubcategory>("free");
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [sortBy, setSortBy] = useState<"latest" | "popular" | "comments">("latest");
    const [trendingTags, setTrendingTags] = useState<string[]>([]);
    const [activeTag, setActiveTag] = useState<string | null>(null);

    const accentColor = isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500];
    const activeSubcat = SUBCATEGORIES.find((s) => s.id === activeTab)!;

    // 검색 디바운싱 — 300ms 후 적용 (입력 도중 API 호출 방지)
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => {
            setSearchQuery(searchInput);
        }, 300);
        return () => {
            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        };
    }, [searchInput]);

    // 인기 해시태그 로드 (마운트 1회)
    useEffect(() => {
        fetch(`${API_BASE_URL}/api/hashtags?type=trending&limit=10`)
            .then((r) => r.ok ? r.json() : null)
            .then((d) => {
                if (Array.isArray(d?.tags)) {
                    setTrendingTags(
                        d.tags
                            .map((t: unknown) => {
                                if (typeof t === "string") return t;
                                if (t && typeof t === "object" && "tag" in t) {
                                    const v = (t as { tag: unknown }).tag;
                                    return typeof v === "string" ? v : null;
                                }
                                return null;
                            })
                            .filter((x: unknown): x is string => typeof x === "string"),
                    );
                }
            })
            .catch(() => {});
    }, []);

    const fetchPosts = useCallback(async () => {
        try {
            const queryParams = new URLSearchParams();
            if (showcaseMode) {
                queryParams.set("subcategory", "free");
                queryParams.set("badge", "자랑");
            } else {
                queryParams.set("subcategory", activeTab);
                if (activeTab === "free") queryParams.set("exclude_badge", "자랑");
            }
            queryParams.set("limit", "20");
            if (sortBy !== "latest") queryParams.set("sort", sortBy);
            if (activeTag) queryParams.set("tag", activeTag);
            const url = `${API_BASE_URL}/api/posts?${queryParams.toString()}`;
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (session) headers["Authorization"] = `Bearer ${session.access_token}`;

            const res = await fetch(url, { headers });
            if (!res.ok) return;
            const data = await res.json();
            const list = Array.isArray(data?.posts) ? data.posts : Array.isArray(data) ? data : [];

            setPosts(list.map((raw: Record<string, unknown>): CommunityPost => ({
                id: raw?.id != null ? String(raw.id) : undefined,
                title: asString(raw?.title),
                content: asString(raw?.content),
                author: asString(raw?.authorName ?? raw?.author ?? raw?.author_name ?? raw?.nickname, "익명"),
                authorId: asString(raw?.authorId ?? raw?.author_id ?? raw?.user_id),
                authorAvatar: typeof raw?.authorAvatar === "string"
                    ? raw.authorAvatar
                    : (typeof raw?.author_avatar === "string" ? raw.author_avatar : undefined),
                likes: asNumber(raw?.likes),
                comments: asNumber(raw?.comments ?? raw?.comments_count),
                views: asNumber(raw?.views),
                category: typeof raw?.category === "string" ? raw.category : undefined,
                subcategory: typeof raw?.subcategory === "string"
                    ? raw.subcategory as CommunitySubcategory
                    : undefined,
                tag: typeof raw?.tag === "string" ? raw.tag as CommunityPost["tag"] : undefined,
                isLiked: typeof raw?.userLiked === "boolean"
                    ? raw.userLiked
                    : typeof raw?.isLiked === "boolean"
                        ? raw.isLiked
                        : typeof raw?.user_liked === "boolean"
                            ? raw.user_liked
                            : undefined,
                preview: typeof raw?.preview === "string"
                    ? raw.preview
                    : (typeof raw?.content === "string" ? raw.content.slice(0, 120) : undefined),
                createdAt: typeof raw?.createdAt === "string"
                    ? raw.createdAt
                    : (typeof raw?.created_at === "string" ? raw.created_at : undefined),
                images: Array.isArray(raw?.images)
                    ? raw.images.filter((x): x is string => typeof x === "string")
                    : (Array.isArray(raw?.imageUrls)
                        ? raw.imageUrls.filter((x): x is string => typeof x === "string")
                        : (Array.isArray(raw?.image_urls)
                            ? raw.image_urls.filter((x): x is string => typeof x === "string")
                            : undefined)),
            })));
        } catch {
            // 조용히
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [activeTab, session, showcaseMode, sortBy, activeTag]);

    useEffect(() => {
        setIsLoading(true);
        fetchPosts();
    }, [fetchPosts]);

    async function onRefresh() {
        setRefreshing(true);
        await fetchPosts();
    }

    const filtered = posts.filter((p) =>
        !searchQuery
        || p.title.toLowerCase().includes(searchQuery.toLowerCase())
        || (p.content ?? "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.gray[50];

    return (
        <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
            <AppHeader onOpenDrawer={() => setDrawerOpen(true)} />
            <AppDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
            {/* 헤더 + 검색 */}
            <View style={styles.headerWrap}>
                <View style={styles.headerRow}>
                    {showcaseMode && (
                        <TouchableOpacity onPress={() => router.replace("/(tabs)/community")} hitSlop={8} style={{ marginRight: 8 }}>
                            <Ionicons name="chevron-back" size={22} color={isDarkMode ? COLORS.white : COLORS.gray[900]} />
                        </TouchableOpacity>
                    )}
                    <Text style={[styles.title, { color: isDarkMode ? COLORS.white : COLORS.gray[900] }]}>
                        {showcaseMode ? "함께 보기" : "커뮤니티"}
                    </Text>
                </View>

                <View style={[styles.searchBar, {
                    backgroundColor: isDarkMode ? COLORS.gray[800] : COLORS.white,
                    borderColor: isDarkMode ? COLORS.gray[700] : COLORS.gray[200],
                }]}>
                    <Ionicons name="search-outline" size={18} color={COLORS.gray[400]} />
                    <TextInput
                        style={[styles.searchInput, { color: isDarkMode ? COLORS.white : COLORS.gray[900] }]}
                        placeholder="게시글 검색..."
                        placeholderTextColor={COLORS.gray[400]}
                        value={searchInput}
                        onChangeText={setSearchInput}
                    />
                    {searchInput.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchInput("")}>
                            <Ionicons name="close-circle" size={18} color={COLORS.gray[400]} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* 서브카테고리 탭 (showcase 모드에서는 숨김) */}
            {!showcaseMode && (
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.subcatScroll}
                style={styles.subcatScrollOuter}
            >
                {SUBCATEGORIES.map((cat) => {
                    const active = activeTab === cat.id;
                    const inactiveBg = isDarkMode ? COLORS.gray[800] : COLORS.gray[100];
                    const inactiveColor = isDarkMode ? COLORS.gray[300] : COLORS.gray[700];
                    return (
                        <TouchableOpacity
                            key={cat.id}
                            onPress={() => {
                                if (cat.id === "adoption") { router.push("/adoption"); return; }
                                if (cat.id === "lost") { router.push("/lost"); return; }
                                if (cat.id === "local") { router.push("/local"); return; }
                                setActiveTab(cat.id);
                            }}
                            activeOpacity={0.85}
                            style={{ marginRight: 8 }}
                        >
                            {active ? (
                                <LinearGradient colors={cat.gradient} style={styles.subcatPill}>
                                    <Ionicons name={cat.icon} size={14} color="#fff" style={{ marginRight: 6 }} />
                                    <Text style={styles.subcatLabelActive}>{cat.label}</Text>
                                </LinearGradient>
                            ) : (
                                <View style={[styles.subcatPill, { backgroundColor: inactiveBg }]}>
                                    <Ionicons name={cat.icon} size={14} color={inactiveColor} style={{ marginRight: 6 }} />
                                    <Text style={[styles.subcatLabel, { color: inactiveColor }]}>{cat.label}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
            )}

            {/* 정렬 + 인기 해시태그 (showcase 모드 제외) */}
            {!showcaseMode && (
                <View style={styles.toolbar}>
                    {/* 정렬 칩 */}
                    <View style={styles.sortRow}>
                        {(["latest", "popular", "comments"] as const).map((s) => {
                            const active = sortBy === s;
                            const label = s === "latest" ? "최신순" : s === "popular" ? "인기순" : "댓글순";
                            return (
                                <TouchableOpacity
                                    key={s}
                                    onPress={() => setSortBy(s)}
                                    style={[
                                        styles.sortChip,
                                        active
                                            ? { backgroundColor: accentColor }
                                            : {
                                                backgroundColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[100],
                                            },
                                    ]}
                                    activeOpacity={0.85}
                                >
                                    <Text style={[
                                        styles.sortChipText,
                                        {
                                            color: active
                                                ? "#fff"
                                                : (isDarkMode ? COLORS.gray[300] : COLORS.gray[700]),
                                        },
                                    ]}>
                                        {label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* 인기 해시태그 (있으면 노출) */}
                    {trendingTags.length > 0 && (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.hashRow}
                            style={styles.hashRowOuter}
                        >
                            {activeTag && (
                                <TouchableOpacity
                                    onPress={() => setActiveTag(null)}
                                    style={[
                                        styles.hashChip,
                                        { backgroundColor: COLORS.red[100], borderColor: COLORS.red[200] },
                                    ]}
                                    activeOpacity={0.85}
                                >
                                    <Ionicons name="close" size={11} color={COLORS.red[600]} />
                                    <Text style={[styles.hashChipText, { color: COLORS.red[600] }]}>
                                        {activeTag}
                                    </Text>
                                </TouchableOpacity>
                            )}
                            {trendingTags.filter((t) => t !== activeTag).slice(0, 10).map((tag) => (
                                <TouchableOpacity
                                    key={tag}
                                    onPress={() => setActiveTag(tag)}
                                    style={[
                                        styles.hashChip,
                                        {
                                            backgroundColor: isDarkMode ? COLORS.gray[800] : COLORS.white,
                                            borderColor: isDarkMode ? COLORS.gray[700] : COLORS.gray[200],
                                        },
                                    ]}
                                    activeOpacity={0.85}
                                >
                                    <Text style={[styles.hashChipText, {
                                        color: isDarkMode ? COLORS.gray[300] : COLORS.gray[700],
                                    }]}>
                                        #{tag}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                </View>
            )}

            {/* 카드 리스트 */}
            {isLoading ? (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <ActivityIndicator size="large" color={accentColor} />
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(item, i) => `${item.id ?? i}`}
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: 96 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyWrap}>
                            <View style={styles.emptyIconBg}>
                                <Ionicons name={activeSubcat.icon} size={32} color={COLORS.gray[400]} />
                            </View>
                            <Text style={styles.emptyText}>아직 게시글이 없어요</Text>
                            <Text style={styles.emptyHint}>첫 글을 남겨보세요</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <PostCard
                            post={item}
                            isMemorialMode={isMemorialMode}
                            onPress={() => item.id && router.push(`/post/${item.id}`)}
                        />
                    )}
                />
            )}

            {/* FAB 글쓰기 */}
            <TouchableOpacity
                onPress={() => router.push({ pathname: "/post/write", params: { subcategory: activeTab } })}
                style={[styles.fab, { bottom: 84 + Math.max(insets.bottom, 8) }]}
                activeOpacity={0.85}
            >
                <LinearGradient
                    colors={activeSubcat.gradient}
                    style={styles.fabGradient}
                >
                    <Ionicons name="create" size={22} color="#fff" />
                </LinearGradient>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

function PostCard({ post, isMemorialMode, onPress }: {
    post: CommunityPost;
    isMemorialMode: boolean;
    onPress: () => void;
}) {
    const { isDarkMode } = useDarkMode();
    const hasImage = post.images && post.images.length > 0;
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.85}
            style={[styles.card, {
                backgroundColor: isDarkMode ? COLORS.gray[900] : COLORS.white,
                borderColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[100],
            }]}
        >
            <View style={styles.cardBody}>
                {post.tag ? (
                    <View style={styles.tagBadge}>
                        <Text style={styles.tagBadgeText}>{post.tag}</Text>
                    </View>
                ) : null}

                <Text style={[styles.cardTitle, {
                    color: isDarkMode ? COLORS.white : COLORS.gray[900],
                }]} numberOfLines={2}>
                    {post.title}
                </Text>

                {post.preview ? (
                    <Text style={[styles.cardPreview, {
                        color: isDarkMode ? COLORS.gray[400] : COLORS.gray[600],
                    }]} numberOfLines={2}>
                        {post.preview}
                    </Text>
                ) : null}

                {hasImage && post.images ? (
                    <View style={styles.imagesRow}>
                        {post.images.slice(0, 3).map((img, idx) => (
                            <Image key={idx} source={{ uri: img }} style={styles.thumb} resizeMode="cover" />
                        ))}
                        {post.images.length > 3 ? (
                            <View style={[styles.thumb, styles.moreThumb]}>
                                <Text style={styles.moreText}>+{post.images.length - 3}</Text>
                            </View>
                        ) : null}
                    </View>
                ) : null}

                <View style={styles.metaRow}>
                    <Text style={[styles.metaText, {
                        color: isMemorialMode ? COLORS.gray[500] : COLORS.gray[500],
                    }]}>
                        {post.author}
                    </Text>
                    <Text style={styles.metaDot}>·</Text>
                    <Text style={styles.metaText}>{relativeTime(post.createdAt)}</Text>

                    <View style={styles.metaRight}>
                        <View style={styles.statRow}>
                            <Ionicons
                                name={post.isLiked ? "heart" : "heart-outline"}
                                size={12}
                                color={post.isLiked ? "#EF4444" : COLORS.gray[500]}
                            />
                            <Text style={styles.metaText}>{post.likes}</Text>
                        </View>
                        <View style={styles.statRow}>
                            <Ionicons name="chatbubble-outline" size={12} color={COLORS.gray[500]} />
                            <Text style={styles.metaText}>{post.comments}</Text>
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
    headerRow: { marginBottom: 12 },
    title: { fontSize: 24, fontWeight: "700" },
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
    subcatScrollOuter: { flexGrow: 0, flexShrink: 0 },
    subcatScroll: { paddingHorizontal: 16, paddingVertical: 12 },
    subcatPill: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 9999,
    },
    subcatLabel: { fontSize: 13, fontWeight: "500" },
    subcatLabelActive: { fontSize: 13, fontWeight: "600", color: "#fff" },
    toolbar: {
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    sortRow: {
        flexDirection: "row",
        gap: 6,
        marginBottom: 8,
    },
    sortChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 9999,
    },
    sortChipText: { fontSize: 12, fontWeight: "600" },
    hashRowOuter: { flexGrow: 0, flexShrink: 0 },
    hashRow: { gap: 6, paddingRight: 16 },
    hashChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 9999,
        borderWidth: 1,
    },
    hashChipText: { fontSize: 11, fontWeight: "600" },
    card: {
        marginHorizontal: 16,
        marginVertical: 6,
        borderRadius: 14,
        borderWidth: 1,
        overflow: "hidden",
    },
    cardBody: { padding: 16, gap: 8 },
    tagBadge: {
        alignSelf: "flex-start",
        backgroundColor: "rgba(5, 178, 220, 0.1)",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    tagBadgeText: { fontSize: 11, fontWeight: "500", color: COLORS.memento[600] },
    cardTitle: { fontSize: 15, fontWeight: "700", lineHeight: 20 },
    cardPreview: { fontSize: 13, lineHeight: 18 },
    imagesRow: { flexDirection: "row", gap: 6, marginTop: 4 },
    thumb: { width: 64, height: 64, borderRadius: 8, backgroundColor: COLORS.gray[100] },
    moreThumb: { alignItems: "center", justifyContent: "center" },
    moreText: { fontSize: 12, fontWeight: "600", color: COLORS.gray[600] },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
    metaText: { fontSize: 11, color: COLORS.gray[500] },
    metaDot: { fontSize: 11, color: COLORS.gray[300] },
    metaRight: { flexDirection: "row", alignItems: "center", gap: 12, marginLeft: "auto" },
    statRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    emptyWrap: { alignItems: "center", paddingVertical: 64 },
    emptyIconBg: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: COLORS.gray[100],
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    emptyText: { fontSize: 15, fontWeight: "500", color: COLORS.gray[600] },
    emptyHint: { fontSize: 13, color: COLORS.gray[400], marginTop: 4 },
    fab: {
        position: "absolute",
        bottom: 24,
        right: 24,
        elevation: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    fabGradient: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: "center",
        justifyContent: "center",
    },
});
