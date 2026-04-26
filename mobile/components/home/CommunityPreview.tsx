/**
 * CommunityPreview — 홈의 "인기 있는 이야기" 섹션
 * /api/posts?featured=true&limit=5 호출, 카드 리스트.
 */

import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Session } from "@supabase/supabase-js";
import { API_BASE_URL } from "@/config/constants";
import { COLORS, SPACING, RADIUS } from "@/lib/theme";
import SectionHeader from "./SectionHeader";

interface CommunityPostPreview {
    id: number;
    title: string;
    author: string;
    likes: number;
    comments: number;
    tag?: string;
}

const GRADIENT_COLORS = [
    [COLORS.memento[400], COLORS.memento[300]],
    ["#F472B6", "#FCA5A5"],
    ["#A78BFA", "#C4B5FD"],
    ["#34D399", "#6EE7B7"],
    [COLORS.memorial[400], COLORS.memorial[300]],
] as const;

interface Props {
    session: Session | null;
    isMemorialMode: boolean;
}

export default function CommunityPreview({ session, isMemorialMode }: Props) {
    const router = useRouter();
    const [posts, setPosts] = useState<CommunityPostPreview[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const headers: Record<string, string> = {};
                if (session) headers["Authorization"] = `Bearer ${session.access_token}`;
                const res = await fetch(`${API_BASE_URL}/api/posts?featured=true&limit=5`, { headers });
                if (!res.ok) return;
                const data = await res.json();
                const list = Array.isArray(data?.posts) ? data.posts : Array.isArray(data) ? data : [];
                setPosts(list.map((raw: any): CommunityPostPreview => ({
                    id: typeof raw?.id === "number" ? raw.id : 0,
                    title: typeof raw?.title === "string" ? raw.title : "",
                    author: typeof raw?.author === "string"
                        ? raw.author
                        : typeof raw?.author_name === "string" ? raw.author_name : "익명",
                    likes: typeof raw?.likes === "number" ? raw.likes : 0,
                    comments: typeof raw?.comments === "number"
                        ? raw.comments
                        : typeof raw?.comments_count === "number" ? raw.comments_count : 0,
                    tag: typeof raw?.tag === "string" ? raw.tag : undefined,
                })));
            } catch {
                // ignore
            } finally {
                setIsLoading(false);
            }
        })();
    }, [session]);

    return (
        <View style={styles.section}>
            <SectionHeader
                icon="flame-outline"
                title="인기 있는 이야기"
                actionLabel="더보기"
                onAction={() => router.push("/(tabs)/community")}
                isMemorialMode={isMemorialMode}
            />

            {isLoading ? (
                <View style={styles.loading}>
                    <ActivityIndicator color={COLORS.memento[500]} />
                </View>
            ) : posts.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={styles.emptyText}>아직 인기 게시글이 없어요</Text>
                </View>
            ) : (
                <View style={styles.list}>
                    {posts.map((post, idx) => (
                        <TouchableOpacity
                            key={post.id}
                            onPress={() => router.push(`/post/${post.id}`)}
                            style={styles.card}
                            activeOpacity={0.85}
                        >
                            <View
                                style={[
                                    styles.thumb,
                                    {
                                        backgroundColor: GRADIENT_COLORS[idx % GRADIENT_COLORS.length][0],
                                    },
                                ]}
                            >
                                <Ionicons name="paw" size={24} color={COLORS.white} />
                            </View>
                            <View style={styles.cardBody}>
                                <Text style={styles.title} numberOfLines={2}>{post.title}</Text>
                                <View style={styles.metaRow}>
                                    <Text style={styles.author}>{post.author}</Text>
                                    <View style={styles.statsRow}>
                                        <Ionicons name="heart-outline" size={12} color={COLORS.gray[400]} />
                                        <Text style={styles.statText}>{post.likes}</Text>
                                        <Ionicons name="chatbubble-outline" size={12} color={COLORS.gray[400]} style={{ marginLeft: 6 }} />
                                        <Text style={styles.statText}>{post.comments}</Text>
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    section: { marginTop: SPACING.lg },
    loading: { paddingVertical: SPACING.xl, alignItems: "center" },
    empty: {
        marginHorizontal: SPACING.md,
        paddingVertical: SPACING.lg,
        alignItems: "center",
        backgroundColor: COLORS.gray[50],
        borderRadius: RADIUS.lg,
    },
    emptyText: { fontSize: 13, color: COLORS.gray[400] },
    list: {
        paddingHorizontal: SPACING.md,
        gap: SPACING.sm,
    },
    card: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.lg,
        padding: SPACING.sm,
        gap: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.gray[100],
    },
    thumb: {
        width: 56,
        height: 56,
        borderRadius: RADIUS.md,
        alignItems: "center",
        justifyContent: "center",
    },
    cardBody: { flex: 1, gap: 4 },
    title: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.gray[900],
        lineHeight: 20,
    },
    metaRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    author: {
        fontSize: 11,
        color: COLORS.gray[500],
    },
    statsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
    },
    statText: {
        fontSize: 11,
        color: COLORS.gray[500],
    },
});
