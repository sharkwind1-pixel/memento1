/**
 * 커뮤니티 탭
 */

import { useState, useEffect, useCallback } from "react";
import {
    View, Text, ScrollView, TouchableOpacity,
    FlatList, RefreshControl, ActivityIndicator,
    TextInput, StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { API_BASE_URL } from "@/config/constants";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { CommunityPost, CommunitySubcategory } from "@/types";
import { COLORS } from "@/lib/theme";

const SUBCATEGORIES: { id: CommunitySubcategory; label: string }[] = [
    { id: "free", label: "자유" },
    { id: "memorial", label: "추모" },
    { id: "adoption", label: "입양" },
    { id: "local", label: "지역" },
    { id: "lost", label: "분실" },
];

export default function CommunityScreen() {
    const router = useRouter();
    const { session } = useAuth();
    const { isMemorialMode } = usePet();
    const [activeTab, setActiveTab] = useState<CommunitySubcategory>("free");
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const accentColor = isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500];

    const fetchPosts = useCallback(async () => {
        try {
            const url = `${API_BASE_URL}/api/posts?subcategory=${activeTab}&limit=20`;
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (session) headers["Authorization"] = `Bearer ${session.access_token}`;

            const res = await fetch(url, { headers });
            if (!res.ok) return;
            const data = await res.json();
            setPosts(data.posts ?? data ?? []);
        } catch {
            // ignore
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [activeTab, session]);

    useEffect(() => {
        setIsLoading(true);
        fetchPosts();
    }, [fetchPosts]);

    async function onRefresh() {
        setRefreshing(true);
        await fetchPosts();
    }

    const bgColor = isMemorialMode ? COLORS.gray[950] : COLORS.white;

    return (
        <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
            <View style={styles.header}>
                <View style={styles.headerRow}>
                    <Text style={[styles.title, { color: isMemorialMode ? COLORS.white : COLORS.gray[900] }]}>
                        커뮤니티
                    </Text>
                    <TouchableOpacity
                        onPress={() => router.push({ pathname: "/post/write", params: { subcategory: activeTab } })}
                        style={[styles.writeBtn, { backgroundColor: accentColor + "20" }]}
                    >
                        <Ionicons name="create-outline" size={20} color={accentColor} />
                    </TouchableOpacity>
                </View>

                <View style={[styles.searchBar, { backgroundColor: isMemorialMode ? COLORS.gray[800] : COLORS.gray[100] }]}>
                    <Ionicons name="search-outline" size={16} color={COLORS.gray[400]} />
                    <TextInput
                        style={[styles.searchInput, { color: isMemorialMode ? COLORS.white : COLORS.gray[900] }]}
                        placeholder="게시글 검색..."
                        placeholderTextColor={COLORS.gray[400]}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.subcatScroll}
                contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}
            >
                {SUBCATEGORIES.map((cat) => (
                    <TouchableOpacity
                        key={cat.id}
                        onPress={() => setActiveTab(cat.id)}
                        style={[
                            styles.subcatPill,
                            {
                                backgroundColor: activeTab === cat.id
                                    ? accentColor
                                    : isMemorialMode ? COLORS.gray[800] : COLORS.gray[100],
                            },
                        ]}
                        activeOpacity={0.8}
                    >
                        <Text style={{
                            fontSize: 14,
                            fontWeight: "500",
                            color: activeTab === cat.id
                                ? "#fff"
                                : isMemorialMode ? COLORS.gray[400] : COLORS.gray[600],
                        }}>
                            {cat.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {isLoading ? (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <ActivityIndicator size="large" color={accentColor} />
                </View>
            ) : (
                <FlatList
                    data={posts.filter((p) =>
                        !searchQuery ||
                        p.title.includes(searchQuery) ||
                        (p.content ?? "").includes(searchQuery)
                    )}
                    keyExtractor={(item, i) => `${item.id ?? i}`}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
                    }
                    ListEmptyComponent={
                        <View style={{ alignItems: "center", paddingVertical: 64 }}>
                            <Ionicons name="chatbubbles-outline" size={44} color={COLORS.gray[300]} />
                            <Text style={{ color: COLORS.gray[400], marginTop: 12, fontSize: 14 }}>
                                아직 게시글이 없어요.
                            </Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <PostCard
                            post={item}
                            isMemorialMode={isMemorialMode}
                            accentColor={accentColor}
                            onPress={() => item.id && router.push(`/post/${item.id}`)}
                        />
                    )}
                    ItemSeparatorComponent={() => (
                        <View style={{ height: 1, marginVertical: 4, backgroundColor: isMemorialMode ? COLORS.gray[800] : COLORS.gray[100] }} />
                    )}
                />
            )}
        </SafeAreaView>
    );
}

function PostCard({ post, isMemorialMode, accentColor, onPress }: {
    post: CommunityPost;
    isMemorialMode: boolean;
    accentColor: string;
    onPress?: () => void;
}) {
    return (
        <TouchableOpacity style={{ paddingVertical: 16 }} activeOpacity={0.75} onPress={onPress}>
            {post.tag && (
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                    <View style={[styles.tagBadge, { backgroundColor: accentColor + "20" }]}>
                        <Text style={{ fontSize: 12, fontWeight: "500", color: accentColor }}>
                            {post.tag}
                        </Text>
                    </View>
                </View>
            )}
            <Text
                style={{
                    fontSize: 14,
                    fontWeight: "600",
                    lineHeight: 20,
                    color: isMemorialMode ? COLORS.white : COLORS.gray[900],
                }}
                numberOfLines={2}
            >
                {post.title}
            </Text>
            {post.preview && (
                <Text
                    style={{
                        fontSize: 12,
                        marginTop: 4,
                        lineHeight: 16,
                        color: isMemorialMode ? COLORS.gray[400] : COLORS.gray[500],
                    }}
                    numberOfLines={2}
                >
                    {post.preview}
                </Text>
            )}
            <View style={styles.metaRow}>
                <Text style={{
                    fontSize: 12,
                    color: isMemorialMode ? COLORS.gray[500] : COLORS.gray[400],
                }}>
                    {post.author}
                </Text>
                <Text style={{ fontSize: 12, color: isMemorialMode ? COLORS.gray[600] : COLORS.gray[300] }}>·</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Ionicons name="heart-outline" size={11} color={COLORS.gray[400]} />
                    <Text style={{ fontSize: 12, color: isMemorialMode ? COLORS.gray[500] : COLORS.gray[400] }}>
                        {post.likes}
                    </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Ionicons name="chatbubble-outline" size={11} color={COLORS.gray[400]} />
                    <Text style={{ fontSize: 12, color: isMemorialMode ? COLORS.gray[500] : COLORS.gray[400] }}>
                        {post.comments}
                    </Text>
                </View>
                {post.time && (
                    <>
                        <Text style={{ fontSize: 12, color: isMemorialMode ? COLORS.gray[600] : COLORS.gray[300] }}>·</Text>
                        <Text style={{ fontSize: 12, color: isMemorialMode ? COLORS.gray[500] : COLORS.gray[400] }}>
                            {post.time}
                        </Text>
                    </>
                )}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
    title: { fontSize: 20, fontWeight: "bold" },
    writeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
    subcatScroll: { marginBottom: 12 },
    subcatPill: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 9999 },
    tagBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999 },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 },
});
