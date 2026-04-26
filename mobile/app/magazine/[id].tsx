/**
 * 매거진 기사 리더
 */

import { useState, useEffect } from "react";
import {
    View, Text, ScrollView, TouchableOpacity,
    Image, ActivityIndicator, Share, StyleSheet,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { API_BASE_URL } from "@/config/constants";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { COLORS } from "@/lib/theme";

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

    const accentColor = isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500];

    useEffect(() => { load(); }, [id]);

    async function load() {
        try {
            const headers: Record<string, string> = {};
            if (session) headers["Authorization"] = `Bearer ${session.access_token}`;
            const res = await fetch(`${API_BASE_URL}/api/magazine/${id}`, { headers });
            if (res.ok) {
                const data = await res.json();
                const raw = data?.article ?? data;
                if (raw && typeof raw === "object") {
                    setArticle({
                        id: typeof raw.id === "number" ? raw.id : 0,
                        title: typeof raw.title === "string" ? raw.title : "",
                        content: typeof raw.content === "string" ? raw.content : "",
                        summary: typeof raw.summary === "string" ? raw.summary : undefined,
                        image_url: typeof raw.image_url === "string"
                            ? raw.image_url
                            : (typeof raw.imageUrl === "string" ? raw.imageUrl : undefined),
                        category: typeof raw.category === "string" ? raw.category : undefined,
                        stage: typeof raw.stage === "string" ? raw.stage : undefined,
                        likes: typeof raw.likes === "number" ? raw.likes : 0,
                        views: typeof raw.views === "number" ? raw.views : 0,
                        liked: typeof raw.liked === "boolean" ? raw.liked : undefined,
                        created_at: typeof raw.created_at === "string"
                            ? raw.created_at
                            : (typeof raw.createdAt === "string" ? raw.createdAt : ""),
                        author: typeof raw.author === "string"
                            ? raw.author
                            : (typeof raw.author_name === "string" ? raw.author_name : undefined),
                    });
                }
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
            <View style={styles.loading}>
                <ActivityIndicator size="large" color={COLORS.memento[500]} />
            </View>
        );
    }

    if (!article) {
        return (
            <View style={styles.loading}>
                <Text style={{ color: COLORS.gray[400] }}>기사를 불러올 수 없습니다.</Text>
            </View>
        );
    }

    const bgColor = isMemorialMode ? COLORS.gray[950] : COLORS.white;

    return (
        <View style={[styles.flex1, { backgroundColor: bgColor }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {article.image_url && (
                    <Image source={{ uri: article.image_url }} style={styles.heroImg} resizeMode="cover" />
                )}

                <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 96 }}>
                    <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                        {article.category && (
                            <View style={[styles.catBadge, { backgroundColor: accentColor + "20" }]}>
                                <Text style={{ fontSize: 12, fontWeight: "500", color: accentColor }}>
                                    {article.category}
                                </Text>
                            </View>
                        )}
                    </View>

                    <Text style={{
                        fontSize: 20,
                        fontWeight: "bold",
                        lineHeight: 28,
                        marginBottom: 8,
                        color: isMemorialMode ? COLORS.white : COLORS.gray[900],
                    }}>
                        {article.title}
                    </Text>
                    {article.summary && (
                        <Text style={{
                            fontSize: 14,
                            lineHeight: 20,
                            marginBottom: 16,
                            color: isMemorialMode ? COLORS.gray[400] : COLORS.gray[500],
                        }}>
                            {article.summary}
                        </Text>
                    )}

                    <Text style={{ fontSize: 12, color: COLORS.gray[400], marginBottom: 20 }}>{article.created_at}</Text>

                    <View style={[styles.divider, { backgroundColor: isMemorialMode ? COLORS.gray[800] : COLORS.gray[100] }]} />

                    <Text
                        style={{
                            fontSize: 14,
                            lineHeight: 28,
                            color: isMemorialMode ? COLORS.gray[200] : COLORS.gray[700],
                        }}
                        selectable
                    >
                        {article.content}
                    </Text>
                </View>
            </ScrollView>

            <View style={[
                styles.footer,
                {
                    backgroundColor: isMemorialMode ? COLORS.gray[900] : COLORS.white,
                    borderTopColor: isMemorialMode ? COLORS.gray[800] : COLORS.gray[100],
                },
            ]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                    <TouchableOpacity onPress={handleLike} style={styles.footerBtn} activeOpacity={0.7}>
                        <Ionicons
                            name={article.liked ? "heart" : "heart-outline"}
                            size={22}
                            color={article.liked ? "#EF4444" : COLORS.gray[400]}
                        />
                        <Text style={{ fontSize: 14, color: isMemorialMode ? COLORS.gray[400] : COLORS.gray[500] }}>
                            {article.likes}
                        </Text>
                    </TouchableOpacity>
                    <View style={styles.footerBtn}>
                        <Ionicons name="eye-outline" size={20} color={COLORS.gray[400]} />
                        <Text style={{ fontSize: 14, color: COLORS.gray[400] }}>{article.views}</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={handleShare} style={styles.footerBtn} activeOpacity={0.7}>
                    <Ionicons name="share-outline" size={20} color={COLORS.gray[400]} />
                    <Text style={{ fontSize: 14, color: COLORS.gray[400] }}>공유</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.white, paddingHorizontal: 24 },
    heroImg: { width: "100%", height: 224 },
    catBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
    divider: { height: 1, marginBottom: 20 },
    footer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
    },
    footerBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
});
