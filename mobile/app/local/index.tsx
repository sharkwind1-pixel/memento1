/**
 * 지역정보 — `/api/local-posts`
 *
 * 지역별 동물병원 / 산책 / 나눔 / 거래 / 모임 / 장소 게시판.
 * 작성/수정/삭제는 인증 필요 (현재는 리스트만).
 */

import { useState, useEffect, useCallback } from "react";
import {
    View, Text, FlatList, TouchableOpacity, Image,
    ActivityIndicator, RefreshControl, ScrollView, StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_BASE_URL } from "@/config/constants";
import { LocalPost, LocalPostCategory } from "@/types";
import { COLORS } from "@/lib/theme";
import { useDarkMode } from "@/contexts/ThemeContext";
import AppHeader from "@/components/common/AppHeader";
import LocalDetailModal from "@/components/local/LocalDetailModal";

type CategoryFilter = "all" | LocalPostCategory;

const CATEGORY_LABELS: { id: CategoryFilter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: "all", label: "전체", icon: "apps-outline" },
    { id: "hospital", label: "병원", icon: "medkit-outline" },
    { id: "walk", label: "산책", icon: "walk-outline" },
    { id: "share", label: "나눔", icon: "gift-outline" },
    { id: "trade", label: "거래", icon: "swap-horizontal-outline" },
    { id: "meet", label: "모임", icon: "people-outline" },
    { id: "place", label: "장소", icon: "location-outline" },
];

export default function LocalPostsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isDarkMode } = useDarkMode();
    const [posts, setPosts] = useState<LocalPost[]>([]);
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [selected, setSelected] = useState<LocalPost | null>(null);

    const fetchPosts = useCallback(
        async (targetPage: number, append: boolean) => {
            try {
                const params = new URLSearchParams({
                    page: String(targetPage),
                    size: "20",
                });
                if (categoryFilter !== "all") params.set("category", categoryFilter);

                const res = await fetch(`${API_BASE_URL}/api/local-posts?${params}`);
                if (!res.ok) {
                    setHasMore(false);
                    return;
                }
                const data = await res.json();
                const list: LocalPost[] = data.posts ?? data.items ?? [];

                setPosts((prev) => (append ? [...prev, ...list] : list));
                setHasMore(list.length >= 20);
            } catch {
                setHasMore(false);
            } finally {
                setIsLoading(false);
                setRefreshing(false);
            }
        },
        [categoryFilter],
    );

    useEffect(() => {
        setIsLoading(true);
        setPage(1);
        setHasMore(true);
        fetchPosts(1, false);
    }, [fetchPosts]);

    async function onRefresh() {
        setRefreshing(true);
        setPage(1);
        setHasMore(true);
        await fetchPosts(1, false);
    }

    function loadMore() {
        if (!hasMore || isLoading || refreshing) return;
        const next = page + 1;
        setPage(next);
        fetchPosts(next, true);
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? COLORS.gray[950] : COLORS.white }]} edges={["top"]}>
            <Stack.Screen options={{ headerShown: false }} />
            <AppHeader showBack title="지역정보" hideActions />

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
                style={styles.filterScrollOuter}
            >
                {CATEGORY_LABELS.map((c) => {
                    const active = categoryFilter === c.id;
                    return (
                        <TouchableOpacity
                            key={c.id}
                            onPress={() => setCategoryFilter(c.id)}
                            activeOpacity={0.85}
                            style={{ marginRight: 8 }}
                        >
                            {active ? (
                                <LinearGradient
                                    colors={["#A78BFA", "#8B5CF6"]}
                                    style={styles.chip}
                                >
                                    <Ionicons name={c.icon} size={14} color="#fff" style={{ marginRight: 6 }} />
                                    <Text style={styles.chipTextActive}>{c.label}</Text>
                                </LinearGradient>
                            ) : (
                                <View style={[
                                    styles.chip,
                                    { backgroundColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[100] },
                                ]}>
                                    <Ionicons
                                        name={c.icon}
                                        size={14}
                                        color={isDarkMode ? COLORS.gray[300] : COLORS.gray[700]}
                                        style={{ marginRight: 6 }}
                                    />
                                    <Text style={[
                                        styles.chipText,
                                        { color: isDarkMode ? COLORS.gray[300] : COLORS.gray[700] },
                                    ]}>{c.label}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {isLoading && posts.length === 0 ? (
                <View style={styles.center}>
                    <ActivityIndicator color={COLORS.memento[500]} />
                </View>
            ) : (
                <FlatList
                    data={posts}
                    keyExtractor={(item) => item.id}
                    style={{ flex: 1 }}
                    renderItem={({ item }) => (
                        <LocalCard post={item} isDarkMode={isDarkMode} onPress={() => setSelected(item)} />
                    )}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={COLORS.memento[500]}
                        />
                    }
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.4}
                    ListFooterComponent={
                        hasMore && posts.length > 0 ? (
                            <View style={styles.footer}>
                                <ActivityIndicator color={COLORS.memento[500]} />
                            </View>
                        ) : null
                    }
                    ListEmptyComponent={
                        !isLoading ? (
                            <View style={styles.center}>
                                <Ionicons name="map-outline" size={48} color={COLORS.gray[300]} />
                                <Text style={[styles.helpText, { color: isDarkMode ? COLORS.gray[400] : COLORS.gray[500] }]}>아직 등록된 글이 없어요</Text>
                            </View>
                        ) : null
                    }
                    contentContainerStyle={posts.length === 0 ? { flex: 1 } : styles.listContent}
                />
            )}

            <TouchableOpacity
                onPress={() => router.push("/local/new")}
                style={[styles.fab, { bottom: 24 + Math.max(insets.bottom, 8) }]}
                activeOpacity={0.85}
            >
                <Ionicons name="create" size={22} color="#fff" />
            </TouchableOpacity>

            <LocalDetailModal
                visible={selected !== null}
                onClose={() => setSelected(null)}
                post={selected}
            />
        </SafeAreaView>
    );
}

function LocalCard({ post, isDarkMode, onPress }: { post: LocalPost; isDarkMode: boolean; onPress: () => void }) {
    const cat = CATEGORY_LABELS.find((c) => c.id === post.category);
    const cardBg = isDarkMode ? COLORS.gray[900] : COLORS.white;
    const titleColor = isDarkMode ? COLORS.white : COLORS.gray[900];
    const metaColor = isDarkMode ? COLORS.gray[400] : COLORS.gray[500];

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.85}
            style={[styles.card, { backgroundColor: cardBg, borderColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[100] }]}
        >
            {post.imageUrl ? (
                <Image source={{ uri: post.imageUrl }} style={styles.cardImage} resizeMode="cover" />
            ) : (
                <View style={[styles.cardImage, styles.imagePlaceholder]}>
                    <Ionicons name={cat?.icon ?? "location-outline"} size={32} color={COLORS.gray[300]} />
                </View>
            )}
            <View style={styles.cardBody}>
                <View style={styles.cardHeaderRow}>
                    {cat ? (
                        <View style={styles.catBadge}>
                            <Text style={styles.catBadgeText}>{cat.label}</Text>
                        </View>
                    ) : null}
                    {post.badge ? (
                        <Text style={styles.postBadge}>{post.badge}</Text>
                    ) : null}
                </View>
                <Text style={[styles.cardTitle, { color: titleColor }]} numberOfLines={2}>
                    {post.title}
                </Text>
                {post.region || post.district ? (
                    <Text style={[styles.cardLocation, { color: metaColor }]} numberOfLines={1}>
                        <Ionicons name="location-outline" size={12} color={metaColor} />
                        {" "}
                        {[post.region, post.district].filter(Boolean).join(" ")}
                    </Text>
                ) : null}
                <View style={styles.cardStats}>
                    <View style={styles.statItem}>
                        <Ionicons name="heart-outline" size={12} color={metaColor} />
                        <Text style={[styles.statText, { color: metaColor }]}>{post.likesCount ?? 0}</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Ionicons name="chatbubble-outline" size={12} color={metaColor} />
                        <Text style={[styles.statText, { color: metaColor }]}>{post.commentsCount ?? 0}</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    filterScrollOuter: { flexGrow: 0, flexShrink: 0 },
    filterRow: { paddingHorizontal: 16, paddingVertical: 12 },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 9999,
    },
    chipText: { fontSize: 13, fontWeight: "500" },
    chipTextActive: { fontSize: 13, fontWeight: "600", color: "#fff" },
    fab: {
        position: "absolute",
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#8B5CF6",
        alignItems: "center",
        justifyContent: "center",
        elevation: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
    },
    center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 },
    helpText: { fontSize: 13 },
    listContent: { padding: 12, gap: 12 },
    footer: { paddingVertical: 24, alignItems: "center" },
    card: {
        flexDirection: "row",
        borderRadius: 12,
        borderWidth: 1,
        overflow: "hidden",
    },
    cardImage: { width: 96, height: 96 },
    imagePlaceholder: { alignItems: "center", justifyContent: "center" },
    cardBody: { flex: 1, padding: 12, gap: 4 },
    cardHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    catBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        backgroundColor: COLORS.memento[100],
        borderRadius: 4,
    },
    catBadgeText: { fontSize: 10, fontWeight: "700", color: COLORS.memento[700] },
    postBadge: { fontSize: 11, fontWeight: "600", color: COLORS.gray[600] },
    cardTitle: { fontSize: 14, fontWeight: "600" },
    cardLocation: { fontSize: 12, color: COLORS.gray[500] },
    cardStats: { flexDirection: "row", gap: 12, marginTop: 4 },
    statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
    statText: { fontSize: 11, color: COLORS.gray[500] },
});
