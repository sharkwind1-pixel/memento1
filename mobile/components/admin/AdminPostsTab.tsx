/**
 * AdminPostsTab — 게시글 관리 (웹 src/components/admin/tabs/AdminPostsTab.tsx 이식)
 *
 * - posts 직접 fetch (최근 200개)
 * - 검색 (제목/작성자)
 * - 확장 패널 (본문/이미지)
 * - 숨김 토글 (PATCH /api/admin/posts)
 * - 삭제 (DELETE /api/admin/posts)
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import {
    View, Text, TextInput, FlatList, TouchableOpacity, Image,
    ActivityIndicator, RefreshControl, StyleSheet, Alert, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/theme";
import { API_BASE_URL } from "@/config/constants";
import { supabase } from "@/lib/supabase";
import { useDarkMode } from "@/contexts/ThemeContext";

const CATEGORY_LABELS: Record<string, string> = {
    general: "자유",
    tips: "꿀팁",
    qna: "질문",
    share: "자랑",
    healing: "치유",
};

interface AdminPost {
    id: string;
    title: string;
    content: string;
    author_id: string;
    author_email: string;
    author_nickname: string | null;
    created_at: string;
    is_hidden: boolean;
    views: number;
    likes_count: number;
    comments_count: number;
    image_urls: string[];
    category: string | null;
}

interface Props {
    accessToken: string;
}

export default function AdminPostsTab({ accessToken }: Props) {
    const { isDarkMode } = useDarkMode();
    const [posts, setPosts] = useState<AdminPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState("");
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from("posts")
                .select("id, title, content, author_id, created_at, is_hidden, views, likes_count, comments_count, image_urls, category")
                .order("created_at", { ascending: false })
                .limit(200);
            if (error) throw new Error(error.message);

            const authorIds = Array.from(new Set((data ?? []).map((p) => p.author_id)));
            const { data: profiles } = authorIds.length > 0
                ? await supabase
                    .from("profiles")
                    .select("id, email, nickname")
                    .in("id", authorIds)
                : { data: [] };
            const profileMap = new Map<string, { email: string; nickname: string | null }>();
            (profiles ?? []).forEach((p) => {
                profileMap.set(p.id, { email: p.email ?? "", nickname: p.nickname ?? null });
            });

            const list: AdminPost[] = (data ?? []).map((p) => {
                const prof = profileMap.get(p.author_id);
                return {
                    id: p.id,
                    title: p.title ?? "",
                    content: p.content ?? "",
                    author_id: p.author_id,
                    author_email: prof?.email ?? "",
                    author_nickname: prof?.nickname ?? null,
                    created_at: p.created_at,
                    is_hidden: !!p.is_hidden,
                    views: p.views ?? 0,
                    likes_count: p.likes_count ?? 0,
                    comments_count: p.comments_count ?? 0,
                    image_urls: Array.isArray(p.image_urls) ? p.image_urls : [],
                    category: p.category ?? null,
                };
            });
            setPosts(list);
        } catch (e) {
            Alert.alert("불러오기 실패", e instanceof Error ? e.message : "");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    async function handleRefresh() {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    }

    function toggleHide(post: AdminPost) {
        const next = !post.is_hidden;
        const action = next ? "숨김" : "숨김 해제";
        Alert.alert(
            action,
            `"${post.title}" ${action}할까요?`,
            [
                { text: "취소", style: "cancel" },
                {
                    text: action,
                    onPress: async () => {
                        try {
                            const res = await fetch(`${API_BASE_URL}/api/admin/posts`, {
                                method: "PATCH",
                                headers: {
                                    Authorization: `Bearer ${accessToken}`,
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify({ postId: post.id, isHidden: next }),
                            });
                            if (!res.ok) {
                                let msg = `HTTP ${res.status}`;
                                try { msg = (await res.json()).error || msg; } catch {}
                                Alert.alert("실패", msg);
                                return;
                            }
                            setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, is_hidden: next } : p));
                        } catch (e) {
                            Alert.alert("오류", e instanceof Error ? e.message : "");
                        }
                    },
                },
            ],
        );
    }

    function deletePost(post: AdminPost) {
        Alert.alert(
            "게시글 삭제",
            `"${post.title}" 삭제할까요?\n되돌릴 수 없어요.`,
            [
                { text: "취소", style: "cancel" },
                {
                    text: "삭제",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const res = await fetch(`${API_BASE_URL}/api/admin/posts`, {
                                method: "DELETE",
                                headers: {
                                    Authorization: `Bearer ${accessToken}`,
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify({ postId: post.id }),
                            });
                            if (!res.ok) {
                                let msg = `HTTP ${res.status}`;
                                try { msg = (await res.json()).error || msg; } catch {}
                                Alert.alert("실패", msg);
                                return;
                            }
                            setPosts((prev) => prev.filter((p) => p.id !== post.id));
                            setExpandedId(null);
                        } catch (e) {
                            Alert.alert("오류", e instanceof Error ? e.message : "");
                        }
                    },
                },
            ],
        );
    }

    const filtered = useMemo(() => {
        const s = search.trim().toLowerCase();
        if (!s) return posts;
        return posts.filter((p) =>
            p.title.toLowerCase().includes(s) ||
            p.author_email.toLowerCase().includes(s) ||
            (p.author_nickname?.toLowerCase().includes(s) ?? false)
        );
    }, [posts, search]);

    const hiddenCount = useMemo(() => posts.filter((p) => p.is_hidden).length, [posts]);

    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.gray[50];
    const cardBg = isDarkMode ? COLORS.gray[900] : COLORS.white;
    const textColor = isDarkMode ? COLORS.white : COLORS.gray[900];
    const labelColor = isDarkMode ? COLORS.gray[400] : COLORS.gray[500];
    const inputBg = isDarkMode ? COLORS.gray[800] : "#fff";
    const borderColor = isDarkMode ? COLORS.gray[700] : COLORS.gray[200];

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: bgColor }]}>
                <ActivityIndicator color={COLORS.memento[500]} />
            </View>
        );
    }

    return (
        <View style={[styles.flex1, { backgroundColor: bgColor }]}>
            {/* 검색 */}
            <View style={styles.searchRow}>
                <View style={[styles.searchBox, { backgroundColor: inputBg, borderColor }]}>
                    <Ionicons name="search-outline" size={16} color={labelColor} />
                    <TextInput
                        value={search}
                        onChangeText={setSearch}
                        placeholder="제목 / 작성자 검색"
                        placeholderTextColor={labelColor}
                        autoCapitalize="none"
                        style={[styles.searchInput, { color: textColor }]}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
                            <Ionicons name="close-circle" size={16} color={COLORS.gray[400]} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* 통계 */}
            <View style={styles.statsRow}>
                <Text style={[styles.statText, { color: labelColor }]}>전체 {posts.length}</Text>
                <Text style={[styles.statText, { color: labelColor }]}>숨김 {hiddenCount}</Text>
                {search.length > 0 && (
                    <Text style={[styles.statText, { color: labelColor }]}>검색 {filtered.length}</Text>
                )}
            </View>

            <FlatList
                data={filtered}
                keyExtractor={(p) => p.id}
                contentContainerStyle={{ padding: 12, gap: 6 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.memento[500]} />}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="document-text-outline" size={36} color={COLORS.gray[300]} />
                        <Text style={{ color: labelColor, fontSize: 13, marginTop: 8 }}>
                            {search ? "검색 결과 없음" : "게시글이 없어요"}
                        </Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <PostCard
                        post={item}
                        expanded={expandedId === item.id}
                        onToggleExpand={() => setExpandedId(expandedId === item.id ? null : item.id)}
                        onToggleHide={() => toggleHide(item)}
                        onDelete={() => deletePost(item)}
                        cardBg={cardBg}
                        textColor={textColor}
                        labelColor={labelColor}
                        borderColor={borderColor}
                        isDarkMode={isDarkMode}
                    />
                )}
            />
        </View>
    );
}

function PostCard({
    post, expanded, onToggleExpand, onToggleHide, onDelete,
    cardBg, textColor, labelColor, borderColor, isDarkMode,
}: {
    post: AdminPost;
    expanded: boolean;
    onToggleExpand: () => void;
    onToggleHide: () => void;
    onDelete: () => void;
    cardBg: string;
    textColor: string;
    labelColor: string;
    borderColor: string;
    isDarkMode: boolean;
}) {
    function formatDate(iso: string) {
        try {
            const d = new Date(iso);
            return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
        } catch { return iso; }
    }

    const author = post.author_nickname || post.author_email || "—";
    const hiddenBg = isDarkMode ? "rgba(239,68,68,0.1)" : "#FEF2F2";
    const hiddenBorder = isDarkMode ? "rgba(239,68,68,0.3)" : "#FECACA";

    return (
        <View>
            <TouchableOpacity
                onPress={onToggleExpand}
                style={[
                    styles.card,
                    {
                        backgroundColor: post.is_hidden ? hiddenBg : cardBg,
                        borderColor: post.is_hidden ? hiddenBorder : borderColor,
                    },
                ]}
                activeOpacity={0.85}
            >
                <View style={styles.cardTopRow}>
                    <View style={{ flex: 1 }}>
                        <View style={styles.titleRow}>
                            {post.category && CATEGORY_LABELS[post.category] && (
                                <View style={[styles.miniBadge, { backgroundColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[200] }]}>
                                    <Text style={[styles.miniBadgeText, { color: labelColor }]}>
                                        {CATEGORY_LABELS[post.category]}
                                    </Text>
                                </View>
                            )}
                            {post.is_hidden && (
                                <View style={[styles.miniBadge, { backgroundColor: "#FEE2E2" }]}>
                                    <Text style={[styles.miniBadgeText, { color: "#B91C1C" }]}>숨김</Text>
                                </View>
                            )}
                            <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
                                {post.title}
                            </Text>
                        </View>
                        <View style={styles.metaRow}>
                            <Text style={[styles.metaText, { color: labelColor }]} numberOfLines={1}>
                                {author} · {formatDate(post.created_at)}
                            </Text>
                            {post.views > 0 && (
                                <View style={styles.metaIcon}>
                                    <Ionicons name="eye-outline" size={11} color={labelColor} />
                                    <Text style={[styles.metaText, { color: labelColor }]}>{post.views}</Text>
                                </View>
                            )}
                            {post.likes_count > 0 && (
                                <View style={styles.metaIcon}>
                                    <Ionicons name="heart-outline" size={11} color={labelColor} />
                                    <Text style={[styles.metaText, { color: labelColor }]}>{post.likes_count}</Text>
                                </View>
                            )}
                            {post.comments_count > 0 && (
                                <View style={styles.metaIcon}>
                                    <Ionicons name="chatbubble-outline" size={11} color={labelColor} />
                                    <Text style={[styles.metaText, { color: labelColor }]}>{post.comments_count}</Text>
                                </View>
                            )}
                            {post.image_urls.length > 0 && (
                                <View style={styles.metaIcon}>
                                    <Ionicons name="image-outline" size={11} color={labelColor} />
                                    <Text style={[styles.metaText, { color: labelColor }]}>{post.image_urls.length}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                    <Ionicons
                        name={expanded ? "chevron-up" : "chevron-down"}
                        size={16}
                        color={labelColor}
                    />
                </View>
            </TouchableOpacity>

            {expanded && (
                <View style={[styles.expandPanel, { backgroundColor: cardBg, borderColor }]}>
                    <Text style={[styles.bodyText, { color: textColor }]}>
                        {post.content || "(내용 없음)"}
                    </Text>

                    {post.image_urls.length > 0 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                            <View style={{ flexDirection: "row", gap: 6 }}>
                                {post.image_urls.map((url, idx) => (
                                    <Image
                                        key={`${url}-${idx}`}
                                        source={{ uri: url }}
                                        style={[styles.thumb, { borderColor }]}
                                    />
                                ))}
                            </View>
                        </ScrollView>
                    )}

                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            onPress={onToggleHide}
                            style={[styles.actionBtn, { backgroundColor: post.is_hidden ? "#10B981" : COLORS.gray[500] }]}
                            activeOpacity={0.85}
                        >
                            <Ionicons name={post.is_hidden ? "eye-outline" : "eye-off-outline"} size={12} color="#fff" />
                            <Text style={styles.actionBtnText}>
                                {post.is_hidden ? "숨김 해제" : "숨김"}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={onDelete}
                            style={[styles.actionBtn, { backgroundColor: "#EF4444" }]}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="trash-outline" size={12} color="#fff" />
                            <Text style={styles.actionBtnText}>삭제</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    searchRow: { paddingHorizontal: 12, paddingTop: 10 },
    searchBox: {
        flexDirection: "row", alignItems: "center", gap: 6,
        paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: 9999, borderWidth: 1,
    },
    searchInput: { flex: 1, fontSize: 13, paddingVertical: 0 },
    statsRow: { flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
    statText: { fontSize: 11, fontWeight: "600" },
    empty: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
    card: {
        padding: 12, borderRadius: 10, borderWidth: 1,
    },
    cardTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
    titleRow: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
    miniBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    miniBadgeText: { fontSize: 9, fontWeight: "700" },
    title: { fontSize: 13, fontWeight: "700", flexShrink: 1 },
    metaRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 4 },
    metaIcon: { flexDirection: "row", alignItems: "center", gap: 2 },
    metaText: { fontSize: 10 },
    expandPanel: {
        marginTop: -1,
        padding: 12,
        borderWidth: 1,
        borderTopWidth: 0,
        borderBottomLeftRadius: 10,
        borderBottomRightRadius: 10,
    },
    bodyText: { fontSize: 12, lineHeight: 18, maxHeight: 180 },
    thumb: { width: 80, height: 80, borderRadius: 8, borderWidth: 1 },
    actionRow: { flexDirection: "row", gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.06)" },
    actionBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
        paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8,
    },
    actionBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});
