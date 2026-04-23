/**
 * 매거진 기사 리더
 */

import { useState, useEffect } from "react";
import {
    View, Text, ScrollView, TouchableOpacity,
    Image, ActivityIndicator, Share,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { API_BASE_URL } from "@/config/constants";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";

interface ArticleDetail {
    id: number;
    title: string;
    content: string;
    summary?: string;
    image_url?: string;
    category?: string;
    stage?: string;
    likes: number;
    views: number;
    liked?: boolean;
    created_at: string;
    author?: string;
}

export default function MagazineReaderScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { session } = useAuth();
    const { isMemorialMode } = usePet();
    const [article, setArticle] = useState<ArticleDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLiking, setIsLiking] = useState(false);

    const accentColor = isMemorialMode ? "#F59E0B" : "#05B2DC";

    useEffect(() => {
        load();
    }, [id]);

    async function load() {
        try {
            const headers: Record<string, string> = {};
            if (session) headers["Authorization"] = `Bearer ${session.access_token}`;
            const res = await fetch(`${API_BASE_URL}/api/magazine/${id}`, { headers });
            if (res.ok) {
                const data = await res.json();
                setArticle(data.article ?? data);
            }
        } catch {
            // ignore
        } finally {
            setIsLoading(false);
        }
    }

    async function handleLike() {
        if (!session || !article || isLiking) return;
        setIsLiking(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const newLiked = !article.liked;
        setArticle((a) => a ? { ...a, liked: newLiked, likes: a.likes + (newLiked ? 1 : -1) } : a);
        try {
            await fetch(`${API_BASE_URL}/api/magazine`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ id: Number(id), action: newLiked ? "like" : "unlike" }),
            });
        } catch {
            setArticle((a) => a ? { ...a, liked: !newLiked, likes: a.likes + (newLiked ? -1 : 1) } : a);
        } finally {
            setIsLiking(false);
        }
    }

    async function handleShare() {
        if (!article) return;
        await Share.share({
            title: article.title,
            message: `${article.title}\n\nhttps://mementoani.com/magazine/${id}`,
        });
    }

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator size="large" color="#05B2DC" />
            </View>
        );
    }

    if (!article) {
        return (
            <View className="flex-1 items-center justify-center px-6">
                <Text className="text-gray-400">기사를 불러올 수 없습니다.</Text>
            </View>
        );
    }

    return (
        <View className={`flex-1 ${isMemorialMode ? "bg-gray-950" : "bg-white"}`}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* 히어로 이미지 */}
                {article.image_url && (
                    <Image
                        source={{ uri: article.image_url }}
                        className="w-full h-56"
                        resizeMode="cover"
                    />
                )}

                <View className="px-5 pt-5 pb-24">
                    {/* 카테고리 + 단계 */}
                    <View className="flex-row gap-2 mb-3">
                        {article.category && (
                            <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: accentColor + "20" }}>
                                <Text className="text-xs font-medium" style={{ color: accentColor }}>{article.category}</Text>
                            </View>
                        )}
                    </View>

                    {/* 제목 */}
                    <Text className={`text-xl font-bold leading-7 mb-2 ${isMemorialMode ? "text-white" : "text-gray-900"}`}>
                        {article.title}
                    </Text>
                    {article.summary && (
                        <Text className={`text-sm leading-5 mb-4 ${isMemorialMode ? "text-gray-400" : "text-gray-500"}`}>
                            {article.summary}
                        </Text>
                    )}

                    {/* 작성일 */}
                    <Text className="text-xs text-gray-400 mb-5">{article.created_at}</Text>

                    {/* 본문 구분선 */}
                    <View className="h-px mb-5" style={{ backgroundColor: isMemorialMode ? "#1F2937" : "#F3F4F6" }} />

                    {/* 본문 */}
                    <Text
                        className={`text-sm leading-7 ${isMemorialMode ? "text-gray-200" : "text-gray-700"}`}
                        selectable
                    >
                        {article.content}
                    </Text>
                </View>
            </ScrollView>

            {/* 하단 반응 바 */}
            <View
                className="absolute bottom-0 left-0 right-0 flex-row items-center justify-between px-5 py-4 border-t"
                style={{
                    backgroundColor: isMemorialMode ? "#111827" : "#fff",
                    borderTopColor: isMemorialMode ? "#1F2937" : "#F3F4F6",
                }}
            >
                <View className="flex-row items-center gap-4">
                    <TouchableOpacity onPress={handleLike} className="flex-row items-center gap-1.5" activeOpacity={0.7}>
                        <Ionicons
                            name={article.liked ? "heart" : "heart-outline"}
                            size={22}
                            color={article.liked ? "#EF4444" : "#9CA3AF"}
                        />
                        <Text className={`text-sm ${isMemorialMode ? "text-gray-400" : "text-gray-500"}`}>{article.likes}</Text>
                    </TouchableOpacity>
                    <View className="flex-row items-center gap-1.5">
                        <Ionicons name="eye-outline" size={20} color="#9CA3AF" />
                        <Text className="text-sm text-gray-400">{article.views}</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={handleShare} className="flex-row items-center gap-1.5" activeOpacity={0.7}>
                    <Ionicons name="share-outline" size={20} color="#9CA3AF" />
                    <Text className="text-sm text-gray-400">공유</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
