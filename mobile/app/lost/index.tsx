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
import { API_BASE_URL } from "@/config/constants";
import { LostPet, LostPetType } from "@/types";
import { COLORS } from "@/lib/theme";

type TypeFilter = "all" | LostPetType;

const TYPE_LABELS: { id: TypeFilter; label: string }[] = [
    { id: "all", label: "전체" },
    { id: "lost", label: "분실" },
    { id: "found", label: "발견" },
];

export default function LostPetsScreen() {
    const router = useRouter();
    const [posts, setPosts] = useState<LostPet[]>([]);
    const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

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
        <SafeAreaView style={styles.container} edges={["top"]}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={COLORS.gray[700]} />
                </TouchableOpacity>
                <Text style={styles.title}>분실 / 발견</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
            >
                {TYPE_LABELS.map((t) => {
                    const active = typeFilter === t.id;
                    return (
                        <TouchableOpacity
                            key={t.id}
                            onPress={() => setTypeFilter(t.id)}
                            style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
                            activeOpacity={0.85}
                        >
                            <Text style={[styles.chipText, { color: active ? COLORS.white : COLORS.gray[700] }]}>
                                {t.label}
                            </Text>
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
                    renderItem={({ item }) => <LostCard post={item} />}
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
                                <Text style={styles.helpText}>아직 등록된 글이 없어요</Text>
                            </View>
                        ) : null
                    }
                    contentContainerStyle={posts.length === 0 ? { flex: 1 } : styles.listContent}
                />
            )}

            <TouchableOpacity
                onPress={() => router.push("/lost/new")}
                style={{
                    position: "absolute",
                    bottom: 24,
                    right: 24,
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: "#EF4444",
                    alignItems: "center",
                    justifyContent: "center",
                    elevation: 6,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                }}
                activeOpacity={0.85}
            >
                <Ionicons name="create" size={22} color="#fff" />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

function LostCard({ post }: { post: LostPet }) {
    const isLost = post.type === "lost";
    const accent = isLost ? COLORS.memorial[500] : COLORS.memento[500];
    const accentBg = isLost ? COLORS.memorial[100] : COLORS.memento[100];

    return (
        <View style={styles.card}>
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
                        <Text style={styles.cardKind}>{post.petType}</Text>
                    ) : null}
                </View>
                <Text style={styles.cardTitle} numberOfLines={1}>
                    {post.title}
                </Text>
                {post.region || post.district ? (
                    <Text style={styles.cardLocation} numberOfLines={1}>
                        <Ionicons name="location-outline" size={12} color={COLORS.gray[500]} />
                        {" "}
                        {[post.region, post.district].filter(Boolean).join(" ")}
                    </Text>
                ) : null}
                {post.date ? (
                    <Text style={styles.cardDate}>{post.date}</Text>
                ) : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.white },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.gray[100],
    },
    backBtn: { padding: 8, width: 40 },
    title: { fontSize: 18, fontWeight: "bold", color: COLORS.gray[900] },
    filterRow: { paddingHorizontal: 12, paddingVertical: 12, gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, marginRight: 8 },
    chipActive: { backgroundColor: COLORS.memento[500] },
    chipInactive: { backgroundColor: COLORS.gray[100] },
    chipText: { fontSize: 13, fontWeight: "600" },
    center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 },
    helpText: { fontSize: 13, color: COLORS.gray[500] },
    listContent: { padding: 12, gap: 12 },
    footer: { paddingVertical: 24, alignItems: "center" },
    card: {
        flexDirection: "row",
        backgroundColor: COLORS.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.gray[100],
        overflow: "hidden",
    },
    cardImage: { width: 96, height: 96, backgroundColor: COLORS.gray[50] },
    imagePlaceholder: { alignItems: "center", justifyContent: "center" },
    cardBody: { flex: 1, padding: 12, gap: 4 },
    cardHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    typeBadgeText: { fontSize: 10, fontWeight: "700" },
    cardKind: { fontSize: 12, fontWeight: "600", color: COLORS.gray[600] },
    cardTitle: { fontSize: 14, fontWeight: "600", color: COLORS.gray[900] },
    cardLocation: { fontSize: 12, color: COLORS.gray[500] },
    cardDate: { fontSize: 11, color: COLORS.gray[400] },
});
