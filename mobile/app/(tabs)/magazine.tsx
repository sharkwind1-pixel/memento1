/**
 * 매거진 탭 — 펫 정보 아티클 목록
 */

import { useState, useEffect, useCallback } from "react";
import {
    View, Text, FlatList, TouchableOpacity,
    Image, TextInput, RefreshControl, ActivityIndicator,
    ScrollView, StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { API_BASE_URL } from "@/config/constants";
import { usePet } from "@/contexts/PetContext";
import { useAuth } from "@/contexts/AuthContext";
import { COLORS } from "@/lib/theme";

interface Article {
    id: number;
    title: string;
    summary?: string;
    content?: string;
    image_url?: string;
    category?: string;
    stage?: string;
    likes: number;
    views: number;
    liked?: boolean;
    created_at: string;
}

const STAGES = [
    { id: "", label: "전체" },
    { id: "beginner", label: "처음 키워요" },
    { id: "growing", label: "함께 성장" },
    { id: "senior", label: "오래오래" },
];

const CATEGORIES = [
    { id: "", label: "전체" },
    { id: "health", label: "건강" },
    { id: "food", label: "사료" },
    { id: "grooming", label: "미용" },
    { id: "behavior", label: "행동" },
    { id: "life", label: "생활" },
    { id: "travel", label: "여행" },
];

export default function MagazineScreen() {
    const router = useRouter();
    const { session } = useAuth();
    const { isMemorialMode } = usePet();
    const [articles, setArticles] = useState<Article[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState("");
    const [selectedStage, setSelectedStage] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const accentColor = isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500];

    const fetchArticles = useCallback(async (reset = false) => {
        const currentPage = reset ? 1 : page;
        try {
            const params = new URLSearchParams({
                page: String(currentPage),
                limit: "20",
                ...(selectedStage && { stage: selectedStage }),
                ...(selectedCategory && { category: selectedCategory }),
                ...(search && { search }),
            });
            const headers: Record<string, string> = {};
            if (session) headers["Authorization"] = `Bearer ${session.access_token}`;

            const res = await fetch(`${API_BASE_URL}/api/magazine?${params}`, { headers });
            if (!res.ok) return;
            const data = await res.json();
            const items: Article[] = data.articles ?? data ?? [];

            if (reset) {
                setArticles(items);
                setPage(2);
            } else {
                setArticles((prev) => [...prev, ...items]);
                setPage((p) => p + 1);
            }
            setHasMore(items.length === 20);
        } catch {
            // ignore
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [page, selectedStage, selectedCategory, search, session]);

    useEffect(() => {
        setIsLoading(true);
        fetchArticles(true);
    }, [selectedStage, selectedCategory]);

    function onRefresh() {
        setRefreshing(true);
        fetchArticles(true);
    }

    const bgColor = isMemorialMode ? COLORS.gray[950] : COLORS.white;

    return (
        <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: isMemorialMode ? COLORS.white : COLORS.gray[900] }]}>
                    펫 매거진
                </Text>
                <View style={[styles.searchBar, { backgroundColor: isMemorialMode ? COLORS.gray[800] : COLORS.gray[100] }]}>
                    <Ionicons name="search-outline" size={16} color={COLORS.gray[400]} />
                    <TextInput
                        style={[styles.searchInput, { color: isMemorialMode ? COLORS.white : COLORS.gray[900] }]}
                        placeholder="기사 검색..."
                        placeholderTextColor={COLORS.gray[400]}
                        value={search}
                        onChangeText={(t) => setSearch(t)}
                        returnKeyType="search"
                        onSubmitEditing={() => { setIsLoading(true); fetchArticles(true); }}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => { setSearch(""); fetchArticles(true); }}>
                            <Ionicons name="close-circle" size={16} color={COLORS.gray[400]} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
                {STAGES.map((s) => (
                    <TouchableOpacity
                        key={s.id}
                        onPress={() => setSelectedStage(s.id)}
                        style={[
                            styles.stagePill,
                            {
                                backgroundColor: selectedStage === s.id
                                    ? accentColor
                                    : isMemorialMode ? COLORS.gray[800] : COLORS.gray[100],
                            },
                        ]}
                    >
                        <Text style={{
                            fontSize: 12,
                            fontWeight: "500",
                            color: selectedStage === s.id
                                ? "#fff"
                                : isMemorialMode ? COLORS.gray[400] : COLORS.gray[600],
                        }}>
                            {s.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
                {CATEGORIES.map((c) => (
                    <TouchableOpacity
                        key={c.id}
                        onPress={() => setSelectedCategory(c.id)}
                        style={[
                            styles.categoryPill,
                            {
                                borderColor: selectedCategory === c.id
                                    ? accentColor
                                    : isMemorialMode ? COLORS.gray[700] : COLORS.gray[200],
                            },
                        ]}
                    >
                        <Text style={{
                            fontSize: 12,
                            color: selectedCategory === c.id
                                ? accentColor
                                : isMemorialMode ? COLORS.gray[400] : COLORS.gray[500],
                        }}>
                            {c.label}
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
                    data={articles}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
                    onEndReached={() => { if (hasMore) fetchArticles(); }}
                    onEndReachedThreshold={0.3}
                    ListEmptyComponent={
                        <View style={{ alignItems: "center", paddingVertical: 64 }}>
                            <Ionicons name="newspaper-outline" size={44} color={COLORS.gray[300]} />
                            <Text style={{ color: COLORS.gray[400], marginTop: 12, fontSize: 14 }}>기사가 없어요.</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <ArticleCard
                            article={item}
                            isMemorialMode={isMemorialMode}
                            accentColor={accentColor}
                            onPress={() => router.push(`/magazine/${item.id}`)}
                        />
                    )}
                    ItemSeparatorComponent={() => (
                        <View style={{ height: 1, backgroundColor: isMemorialMode ? COLORS.gray[800] : COLORS.gray[100] }} />
                    )}
                />
            )}
        </SafeAreaView>
    );
}

function ArticleCard({ article, isMemorialMode, accentColor, onPress }: {
    article: Article;
    isMemorialMode: boolean;
    accentColor: string;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={{ paddingVertical: 16 }}>
            <View style={{ flexDirection: "row", gap: 12 }}>
                {article.image_url ? (
                    <Image
                        source={{ uri: article.image_url }}
                        style={styles.articleImg}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={[styles.articleImg, styles.articleImgPlaceholder, { backgroundColor: isMemorialMode ? COLORS.gray[800] : COLORS.gray[100] }]}>
                        <Ionicons name="newspaper-outline" size={28} color={COLORS.gray[400]} />
                    </View>
                )}
                <View style={{ flex: 1 }}>
                    {article.category && (
                        <Text style={{ fontSize: 12, marginBottom: 4, color: accentColor }}>
                            {article.category}
                        </Text>
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
                        {article.title}
                    </Text>
                    {article.summary && (
                        <Text
                            style={{
                                fontSize: 12,
                                marginTop: 4,
                                lineHeight: 16,
                                color: isMemorialMode ? COLORS.gray[400] : COLORS.gray[500],
                            }}
                            numberOfLines={2}
                        >
                            {article.summary}
                        </Text>
                    )}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Ionicons
                                name={article.liked ? "heart" : "heart-outline"}
                                size={11}
                                color={article.liked ? "#EF4444" : COLORS.gray[400]}
                            />
                            <Text style={{ fontSize: 12, color: COLORS.gray[400] }}>{article.likes}</Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Ionicons name="eye-outline" size={11} color={COLORS.gray[400]} />
                            <Text style={{ fontSize: 12, color: COLORS.gray[400] }}>{article.views}</Text>
                        </View>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
    title: { fontSize: 20, fontWeight: "bold", marginBottom: 12 },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
    filterRow: { marginBottom: 4, flexGrow: 0 },
    stagePill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 9999 },
    categoryPill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999, borderWidth: 1 },
    articleImg: { width: 80, height: 80, borderRadius: 12 },
    articleImgPlaceholder: { alignItems: "center", justifyContent: "center" },
});
