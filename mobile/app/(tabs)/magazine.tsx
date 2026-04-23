/**
 * 매거진 탭 — 펫 정보 아티클 목록
 * 웹 /api/magazine 그대로 재사용
 */

import { useState, useEffect, useCallback } from "react";
import {
    View, Text, FlatList, TouchableOpacity,
    Image, TextInput, RefreshControl, ActivityIndicator,
    ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { API_BASE_URL } from "@/config/constants";
import { usePet } from "@/contexts/PetContext";
import { useAuth } from "@/contexts/AuthContext";

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

    const accentColor = isMemorialMode ? "#F59E0B" : "#05B2DC";

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

    return (
        <SafeAreaView
            className={`flex-1 ${isMemorialMode ? "bg-gray-950" : "bg-white"}`}
            edges={["top"]}
        >
            {/* 헤더 */}
            <View className="px-5 pt-4 pb-2">
                <Text className={`text-xl font-bold mb-3 ${isMemorialMode ? "text-white" : "text-gray-900"}`}>
                    펫 매거진
                </Text>
                {/* 검색 */}
                <View
                    className={`flex-row items-center rounded-xl px-3 py-2.5 ${isMemorialMode ? "bg-gray-800" : "bg-gray-100"}`}
                >
                    <Ionicons name="search-outline" size={16} color="#9CA3AF" />
                    <TextInput
                        className={`flex-1 ml-2 text-sm ${isMemorialMode ? "text-white" : "text-gray-900"}`}
                        placeholder="기사 검색..."
                        placeholderTextColor="#9CA3AF"
                        value={search}
                        onChangeText={(t) => { setSearch(t); }}
                        returnKeyType="search"
                        onSubmitEditing={() => { setIsLoading(true); fetchArticles(true); }}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => { setSearch(""); fetchArticles(true); }}>
                            <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* 단계 필터 */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-5 mb-1" contentContainerStyle={{ gap: 8 }}>
                {STAGES.map((s) => (
                    <TouchableOpacity
                        key={s.id}
                        onPress={() => setSelectedStage(s.id)}
                        className="px-3.5 py-1.5 rounded-full"
                        style={{ backgroundColor: selectedStage === s.id ? accentColor : (isMemorialMode ? "#1F2937" : "#F3F4F6") }}
                    >
                        <Text className={`text-xs font-medium ${selectedStage === s.id ? "text-white" : (isMemorialMode ? "text-gray-400" : "text-gray-600")}`}>
                            {s.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* 카테고리 필터 */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-5 mb-3" contentContainerStyle={{ gap: 8 }}>
                {CATEGORIES.map((c) => (
                    <TouchableOpacity
                        key={c.id}
                        onPress={() => setSelectedCategory(c.id)}
                        className="px-3 py-1 rounded-full border"
                        style={{ borderColor: selectedCategory === c.id ? accentColor : (isMemorialMode ? "#374151" : "#E5E7EB") }}
                    >
                        <Text
                            className="text-xs"
                            style={{ color: selectedCategory === c.id ? accentColor : (isMemorialMode ? "#9CA3AF" : "#6B7280") }}
                        >
                            {c.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* 기사 목록 */}
            {isLoading ? (
                <View className="flex-1 items-center justify-center">
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
                        <View className="items-center py-16">
                            <Ionicons name="newspaper-outline" size={44} color="#D1D5DB" />
                            <Text className="text-gray-400 mt-3 text-sm">기사가 없어요.</Text>
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
                        <View className="h-px" style={{ backgroundColor: isMemorialMode ? "#1F2937" : "#F3F4F6" }} />
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
        <TouchableOpacity onPress={onPress} activeOpacity={0.75} className="py-4">
            <View className="flex-row gap-3">
                {article.image_url ? (
                    <Image
                        source={{ uri: article.image_url }}
                        className="w-20 h-20 rounded-xl flex-shrink-0"
                        resizeMode="cover"
                    />
                ) : (
                    <View
                        className="w-20 h-20 rounded-xl flex-shrink-0 items-center justify-center"
                        style={{ backgroundColor: isMemorialMode ? "#1F2937" : "#F3F4F6" }}
                    >
                        <Ionicons name="newspaper-outline" size={28} color="#9CA3AF" />
                    </View>
                )}
                <View className="flex-1">
                    {article.category && (
                        <Text className="text-xs mb-1" style={{ color: accentColor }}>
                            {article.category}
                        </Text>
                    )}
                    <Text
                        className={`text-sm font-semibold leading-5 ${isMemorialMode ? "text-white" : "text-gray-900"}`}
                        numberOfLines={2}
                    >
                        {article.title}
                    </Text>
                    {article.summary && (
                        <Text
                            className={`text-xs mt-1 leading-4 ${isMemorialMode ? "text-gray-400" : "text-gray-500"}`}
                            numberOfLines={2}
                        >
                            {article.summary}
                        </Text>
                    )}
                    <View className="flex-row items-center gap-3 mt-2">
                        <View className="flex-row items-center gap-1">
                            <Ionicons name={article.liked ? "heart" : "heart-outline"} size={11} color={article.liked ? "#EF4444" : "#9CA3AF"} />
                            <Text className="text-xs text-gray-400">{article.likes}</Text>
                        </View>
                        <View className="flex-row items-center gap-1">
                            <Ionicons name="eye-outline" size={11} color="#9CA3AF" />
                            <Text className="text-xs text-gray-400">{article.views}</Text>
                        </View>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}
