/**
 * 분실/발견 동물 — `/api/lost-pets`
 *
 * 분실(lost) 또는 발견(found) 동물 게시글 목록.
 * 작성/수정/삭제는 인증 필요 (현재는 리스트만 — 추후 작성 화면 추가 예정).
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
import { LostPet, LostPetType } from "@/types";
import { COLORS } from "@/lib/theme";
import { useDarkMode } from "@/contexts/ThemeContext";
import AppHeader from "@/components/common/AppHeader";
import LostDetailModal from "@/components/lost/LostDetailModal";

type TypeFilter = "all" | LostPetType;

const TYPE_LABELS: { id: TypeFilter; label: string }[] = [
    { id: "all", label: "전체" },
    { id: "lost", label: "분실" },
    { id: "found", label: "발견" },
];

export default function LostPetsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isDarkMode } = useDarkMode();
    const [posts, setPosts] = useState<LostPet[]>([]);
    const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [selected, setSelected] = useState<LostPet | null>(null);

    const fetchPosts = useCallback(
        async (targetPage: number, append: boolean) => {
            try {
                const params = new URLSearchParams({
                    page: String(targetPage),
                    size: "20",
                });
                if (typeFilter !== "all") params.set("type", typeFilter);

                const res = await fetch(`${API_BASE_URL}/api/lost-pets?${params}`);
                if (!res.ok) {
                    setHasMore(false);
                    return;
                }
                const data = await res.json();
                const list: LostPet[] = data.posts ?? data.items ?? [];

                setPosts((prev) => (append ? [...prev, ...list] : list));
                setHasMore(list.length >= 20);
            } catch {
                setHasMore(false);
            } finally {
                setIsLoading(false);
                setRefreshing(false);
            }
        },
        [typeFilter],
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
            <AppHeader showBack title="분실 / 발견" hideActions />

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
                style={styles.filterScrollOuter}
            >
                {TYPE_LABELS.map((t) => {
                    const active = typeFilter === t.id;
                    return (
                        <TouchableOpacity
                            key={t.id}
                            onPress={() => setTypeFilter(t.id)}
                            activeOpacity={0.85}
                            style={{ marginRight: 8 }}
                        >
                            {active ? (
                                <LinearGradient
                                    colors={["#F87171", "#EF4444"]}
                                    style={styles.chip}
                                >
                                    <Text style={styles.chipTextActive}>{t.label}</Text>
                                </LinearGradient>
                            ) : (
                                <View style={[
                                    styles.chip,
                                    { backgroundColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[100] },
                                ]}>
                                    <Text style={[
                                        styles.chipText,
                                        { color: isDarkMode ? COLORS.gray[300] : COLORS.gray[700] },
                                    ]}>{t.label}</Text>
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
                        <LostCard post={item} isDarkMode={isDarkMode} onPress={() => setSelected(item)} />
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
                                <Ionicons name="search-outline" size={48} color={COLORS.gray[300]} />
                                <Text style={[styles.helpText, { color: isDarkMode ? COLORS.gray[400] : COLORS.gray[500] }]}>아직 등록된 글이 없어요</Text>
                            </View>
                        ) : null
                    }
                    contentContainerStyle={posts.length === 0 ? { flex: 1 } : styles.listContent}
                />
            )}

            <TouchableOpacity
                onPress={() => router.push("/lost/new")}
                style={[styles.fab, { bottom: 24 + Math.max(insets.bottom, 8) }]}
                activeOpacity={0.85}
            >
                <Ionicons name="create" size={22} color="#fff" />
            </TouchableOpacity>

            <LostDetailModal
                visible={selected !== null}
                onClose={() => setSelected(null)}
                post={selected}
            />
        </SafeAreaView>
    );
}

function LostCard({ post, isDarkMode, onPress }: { post: LostPet; isDarkMode: boolean; onPress: () => void }) {
    const isLost = post.type === "lost";
    const accent = isLost ? COLORS.memorial[500] : COLORS.memento[500];
    const accentBg = isLost ? COLORS.memorial[100] : COLORS.memento[100];
    const cardBg = isDarkMode ? COLORS.gray[900] : COLORS.white;
    const titleColor = isDarkMode ? COLORS.white : COLORS.gray[900];
    const metaColor = isDarkMode ? COLORS.gray[400] : COLORS.gray[500];

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.card, { backgroundColor: cardBg, borderColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[100] }]}>
            {post.imageUrl ? (
                <Image source={{ uri: post.imageUrl }} style={styles.cardImage} resizeMode="cover" />
            ) : (
                <View style={[styles.cardImage, styles.imagePlaceholder]}>
                    <Ionicons name="paw" size={32} color={COLORS.gray[300]} />
                </View>
            )}
            <View style={styles.cardBody}>
                <View style={styles.cardHeaderRow}>
                    <View style={[styles.typeBadge, { backgroundColor: accentBg }]}>
                        <Text style={[styles.typeBadgeText, { color: accent }]}>
                            {isLost ? "분실" : "발견"}
                        </Text>
                    </View>
                    {post.petType ? (
                        <Text style={[styles.cardKind, { color: metaColor }]}>{post.petType}</Text>
                    ) : null}
                </View>
                <Text style={[styles.cardTitle, { color: titleColor }]} numberOfLines={1}>
                    {post.title}
                </Text>
                {post.region || post.district ? (
                    <Text style={[styles.cardLocation, { color: metaColor }]} numberOfLines={1}>
                        <Ionicons name="location-outline" size={12} color={metaColor} />
                        {" "}
                        {[post.region, post.district].filter(Boolean).join(" ")}
                    </Text>
                ) : null}
                {post.date ? (
                    <Text style={[styles.cardDate, { color: metaColor }]}>{post.date}</Text>
                ) : null}
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
        paddingHorizontal: 18,
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
        backgroundColor: "#EF4444",
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
    typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    typeBadgeText: { fontSize: 10, fontWeight: "700" },
    cardKind: { fontSize: 12, fontWeight: "600" },
    cardTitle: { fontSize: 14, fontWeight: "600" },
    cardLocation: { fontSize: 12 },
    cardDate: { fontSize: 11, color: COLORS.gray[400] },
});
