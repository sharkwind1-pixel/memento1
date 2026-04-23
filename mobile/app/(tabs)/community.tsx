/**
 * 커뮤니티 탭
 */

import { useState, useEffect, useCallback } from "react";
import {
    View, Text, ScrollView, TouchableOpacity,
    FlatList, RefreshControl, ActivityIndicator,
    TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "@/config/constants";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { CommunityPost, CommunitySubcategory } from "@/types";

const SUBCATEGORIES: { id: CommunitySubcategory; label: string }[] = [
    { id: "free", label: "자유" },
    { id: "memorial", label: "추모" },
    { id: "adoption", label: "입양" },
    { id: "local", label: "지역" },
    { id: "lost", label: "분실" },
];

export default function CommunityScreen() {
    const { session } = useAuth();
    const { isMemorialMode } = usePet();
    const [activeTab, setActiveTab] = useState<CommunitySubcategory>("free");
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const accentColor = isMemorialMode ? "#F59E0B" : "#05B2DC";

    const fetchPosts = useCallback(async () => {
        try {
            const url = `${API_BASE_URL}/api/posts?subcategory=${activeTab}&limit=20`;
            const headers: Record<string, string> = {
                "Content-Type": "application/json",
            };
            if (session) headers["Authorization"] = `Bearer ${session.access_token}`;

            const res = await fetch(url, { headers });
            if (!res.ok) return;
            const data = await res.json();
            setPosts(data.posts ?? data ?? []);
        } catch {
            // 에러 무시
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

    return (
        <SafeAreaView
            className={`flex-1 ${isMemorialMode ? "bg-gray-950" : "bg-white"}`}
            edges={["top"]}
        >
            {/* 헤더 */}
            <View className="px-5 pt-4 pb-3">
                <View className="flex-row items-center justify-between mb-3">
                    <Text className={`text-xl font-bold ${isMemorialMode ? "text-white" : "text-gray-900"}`}>
                        커뮤니티
                    </Text>
                    <TouchableOpacity
                        className="w-9 h-9 rounded-full items-center justify-center"
                        style={{ backgroundColor: accentColor + "20" }}
                    >
                        <Ionicons name="create-outline" size={20} color={accentColor} />
                    </TouchableOpacity>
                </View>

                {/* 검색 */}
                <View
                    className={`flex-row items-center rounded-xl px-3 py-2.5 ${
                        isMemorialMode ? "bg-gray-800" : "bg-gray-100"
                    }`}
                >
                    <Ionicons name="search-outline" size={16} color="#9CA3AF" />
                    <TextInput
                        className={`flex-1 ml-2 text-sm ${isMemorialMode ? "text-white" : "text-gray-900"}`}
                        placeholder="게시글 검색..."
                        placeholderTextColor="#9CA3AF"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            {/* 서브카테고리 탭 */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="px-5 mb-3"
                contentContainerStyle={{ gap: 8 }}
            >
                {SUBCATEGORIES.map((cat) => (
                    <TouchableOpacity
                        key={cat.id}
                        onPress={() => setActiveTab(cat.id)}
                        className="px-4 py-1.5 rounded-full"
                        style={{
                            backgroundColor:
                                activeTab === cat.id
                                    ? accentColor
                                    : isMemorialMode ? "#1F2937" : "#F3F4F6",
                        }}
                        activeOpacity={0.8}
                    >
                        <Text
                            className={`text-sm font-medium ${
                                activeTab === cat.id ? "text-white" :
                                isMemorialMode ? "text-gray-400" : "text-gray-600"
                            }`}
                        >
                            {cat.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* 게시글 목록 */}
            {isLoading ? (
                <View className="flex-1 items-center justify-center">
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
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={accentColor}
                        />
                    }
                    ListEmptyComponent={
                        <View className="items-center py-16">
                            <Ionicons name="chatbubbles-outline" size={44} color="#D1D5DB" />
                            <Text className="text-gray-400 mt-3 text-sm">
                                아직 게시글이 없어요.
                            </Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <PostCard post={item} isMemorialMode={isMemorialMode} accentColor={accentColor} />
                    )}
                    ItemSeparatorComponent={() => (
                        <View
                            className="h-px mx-0 my-1"
                            style={{ backgroundColor: isMemorialMode ? "#1F2937" : "#F3F4F6" }}
                        />
                    )}
                />
            )}
        </SafeAreaView>
    );
}

function PostCard({ post, isMemorialMode, accentColor }: {
    post: CommunityPost;
    isMemorialMode: boolean;
    accentColor: string;
}) {
    return (
        <TouchableOpacity
            className="py-4"
            activeOpacity={0.75}
        >
            <View className="flex-row items-start gap-2 mb-1.5">
                {post.tag && (
                    <View
                        className="px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: accentColor + "20" }}
                    >
                        <Text className="text-xs font-medium" style={{ color: accentColor }}>
                            {post.tag}
                        </Text>
                    </View>
                )}
            </View>
            <Text
                className={`text-sm font-semibold leading-5 ${isMemorialMode ? "text-white" : "text-gray-900"}`}
                numberOfLines={2}
            >
                {post.title}
            </Text>
            {post.preview && (
                <Text
                    className={`text-xs mt-1 leading-4 ${isMemorialMode ? "text-gray-400" : "text-gray-500"}`}
                    numberOfLines={2}
                >
                    {post.preview}
                </Text>
            )}
            <View className="flex-row items-center gap-3 mt-2">
                <Text className={`text-xs ${isMemorialMode ? "text-gray-500" : "text-gray-400"}`}>
                    {post.author}
                </Text>
                <Text className={`text-xs ${isMemorialMode ? "text-gray-600" : "text-gray-300"}`}>·</Text>
                <View className="flex-row items-center gap-1">
                    <Ionicons name="heart-outline" size={11} color="#9CA3AF" />
                    <Text className={`text-xs ${isMemorialMode ? "text-gray-500" : "text-gray-400"}`}>
                        {post.likes}
                    </Text>
                </View>
                <View className="flex-row items-center gap-1">
                    <Ionicons name="chatbubble-outline" size={11} color="#9CA3AF" />
                    <Text className={`text-xs ${isMemorialMode ? "text-gray-500" : "text-gray-400"}`}>
                        {post.comments}
                    </Text>
                </View>
                {post.time && (
                    <>
                        <Text className={`text-xs ${isMemorialMode ? "text-gray-600" : "text-gray-300"}`}>·</Text>
                        <Text className={`text-xs ${isMemorialMode ? "text-gray-500" : "text-gray-400"}`}>
                            {post.time}
                        </Text>
                    </>
                )}
            </View>
        </TouchableOpacity>
    );
}
