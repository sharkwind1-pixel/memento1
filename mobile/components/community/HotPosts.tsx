/**
 * HotPosts — 모바일
 *
 * 웹 src/components/features/community/HotPosts.tsx 1:1 이식.
 *  - GET /api/posts?board=...&hot=true&limit=5
 *  - 24시간 내 좋아요 많은 5개
 *  - 카드 탭 → onSelectPost(postId)
 */

import { useEffect, useState } from "react";
import {
    View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/theme";
import { useDarkMode } from "@/contexts/ThemeContext";
import { API_BASE_URL } from "@/config/constants";

interface HotPost {
    id: string;
    title: string;
    likes?: number;
    comments?: number;
    authorName?: string;
}

interface Props {
    boardType: string;
    onSelectPost: (id: string) => void;
}

export default function HotPosts({ boardType, onSelectPost }: Props) {
    const { isDarkMode } = useDarkMode();
    const [posts, setPosts] = useState<HotPost[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const res = await fetch(
                    `${API_BASE_URL}/api/posts?board=${boardType}&hot=true&limit=5`,
                );
                if (!res.ok) {
                    if (!cancelled) setPosts([]);
                    return;
                }
                const data = await res.json();
                if (!cancelled) setPosts(data.posts ?? []);
            } catch {
                if (!cancelled) setPosts([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [boardType]);

    if (loading) {
        return (
            <View style={styles.skeleton}>
                <ActivityIndicator size="small" color="#FB923C" />
            </View>
        );
    }
    if (posts.length === 0) return null;

    const bgColor = isDarkMode ? "rgba(251,146,60,0.10)" : "rgba(255,237,213,0.85)";
    const borderColor = isDarkMode ? "rgba(251,146,60,0.30)" : "rgba(254,215,170,0.75)";
    const textColor = isDarkMode ? COLORS.gray[100] : COLORS.gray[800];

    return (
        <View style={[styles.section, { backgroundColor: bgColor, borderColor }]}>
            <View style={styles.headerRow}>
                <Ionicons name="flame" size={14} color="#F97316" />
                <Text style={styles.headerLabel}>인기글</Text>
                <Text style={styles.headerSub}>24시간</Text>
            </View>

            <View style={styles.list}>
                {posts.map((post, idx) => (
                    <TouchableOpacity
                        key={post.id}
                        onPress={() => onSelectPost(post.id)}
                        style={styles.row}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.rank}>{idx + 1}</Text>
                        <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
                            {post.title}
                        </Text>
                        <View style={styles.metaRow}>
                            <View style={styles.metaItem}>
                                <Ionicons name="heart-outline" size={11} color={COLORS.gray[400]} />
                                <Text style={styles.metaText}>{post.likes ?? 0}</Text>
                            </View>
                            <View style={styles.metaItem}>
                                <Ionicons name="chatbubble-outline" size={11} color={COLORS.gray[400]} />
                                <Text style={styles.metaText}>{post.comments ?? 0}</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    skeleton: { height: 60, alignItems: "center", justifyContent: "center", marginHorizontal: 16, marginBottom: 12 },
    section: {
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 16,
        borderWidth: 1,
        padding: 12,
    },
    headerRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
    headerLabel: { fontSize: 12, fontWeight: "800", color: "#C2410C" },
    headerSub: { fontSize: 10, color: "#FB923C" },
    list: { gap: 4 },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 10,
    },
    rank: { fontSize: 12, fontWeight: "800", color: "#F97316", width: 18, textAlign: "center" },
    title: { flex: 1, fontSize: 12 },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    metaItem: { flexDirection: "row", alignItems: "center", gap: 2 },
    metaText: { fontSize: 10, color: COLORS.gray[400] },
});
