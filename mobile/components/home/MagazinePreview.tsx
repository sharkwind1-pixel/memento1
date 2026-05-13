/**
 * MagazinePreview — 홈의 "펫매거진" 섹션 (3개 미리보기)
 */

import { useEffect, useState } from "react";
import { useDarkMode } from "@/contexts/ThemeContext";
import { useSimpleMode } from "@/contexts/SimpleModeContext";
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Session } from "@supabase/supabase-js";
import { API_BASE_URL } from "@/config/constants";
import { COLORS, SPACING, RADIUS } from "@/lib/theme";
import SectionHeader from "./SectionHeader";

interface ArticlePreview {
    id: string;
    title: string;
    summary?: string;
    image_url?: string;
    category?: string;
}

interface Props {
    session: Session | null;
    isMemorialMode: boolean;
}

export default function MagazinePreview({ session, isMemorialMode }: Props) {
    const { isDarkMode } = useDarkMode();
    const { fontScale, spacingScale, iconScale } = useSimpleMode();
    const router = useRouter();
    const [articles, setArticles] = useState<ArticlePreview[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const headers: Record<string, string> = {};
                if (session) headers["Authorization"] = `Bearer ${session.access_token}`;
                const res = await fetch(`${API_BASE_URL}/api/magazine?limit=3`, { headers });
                if (!res.ok) return;
                const data = await res.json();
                const list = Array.isArray(data?.articles) ? data.articles : Array.isArray(data) ? data : [];
                setArticles(list.slice(0, 3).map((raw: any): ArticlePreview => ({
                    id: raw?.id != null ? String(raw.id) : "",
                    title: typeof raw?.title === "string" ? raw.title : "",
                    summary: typeof raw?.summary === "string" ? raw.summary : undefined,
                    image_url: typeof raw?.image_url === "string"
                        ? raw.image_url
                        : typeof raw?.imageUrl === "string" ? raw.imageUrl : undefined,
                    category: typeof raw?.category === "string" ? raw.category : undefined,
                })));
            } catch {
                // ignore
            } finally {
                setIsLoading(false);
            }
        })();
    }, [session]);

    const cardBg = isDarkMode ? COLORS.gray[900] : COLORS.white;
    const cardBorder = isDarkMode ? COLORS.gray[800] : COLORS.gray[100];
    const titleColor = isDarkMode ? COLORS.white : COLORS.gray[900];
    const thumbBg = isDarkMode ? COLORS.gray[800] : COLORS.gray[100];
    const emptyBg = isDarkMode ? COLORS.gray[900] : COLORS.gray[50];
    const emptyTextColor = isDarkMode ? COLORS.gray[400] : COLORS.gray[400];
    const categoryBadgeBg = isDarkMode ? COLORS.gray[800] : COLORS.memento[100];
    const categoryTextColor = isDarkMode ? COLORS.memento[300] : COLORS.memento[700];
    const accentColor = isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500];

    return (
        <View style={styles.section}>
            <SectionHeader
                icon="newspaper-outline"
                title="펫매거진"
                actionLabel="더보기"
                onAction={() => router.push("/(tabs)/magazine")}
                isMemorialMode={isMemorialMode}
            />

            {isLoading ? (
                <View style={styles.loading}>
                    <ActivityIndicator color={accentColor} />
                </View>
            ) : articles.length === 0 ? (
                <View style={[styles.empty, { backgroundColor: emptyBg }]}>
                    <Text style={[styles.emptyText, { color: emptyTextColor }]}>아직 매거진이 없어요</Text>
                </View>
            ) : (
                <View style={[styles.list, { gap: SPACING.sm * spacingScale }]}>
                    {articles.map((article, idx) => (
                        <TouchableOpacity
                            key={article.id || `idx-${idx}`}
                            onPress={() => router.push(`/magazine/${article.id}`)}
                            style={[styles.card, {
                                backgroundColor: cardBg,
                                borderColor: cardBorder,
                                padding: SPACING.sm * spacingScale,
                                gap: SPACING.md * spacingScale,
                            }]}
                            activeOpacity={0.85}
                        >
                            {article.image_url ? (
                                <Image source={{ uri: article.image_url }} style={[styles.thumb, {
                                    backgroundColor: thumbBg,
                                    width: 56 * spacingScale,
                                    height: 56 * spacingScale,
                                }]} />
                            ) : (
                                <View style={[styles.thumb, styles.thumbFallback, {
                                    backgroundColor: thumbBg,
                                    width: 56 * spacingScale,
                                    height: 56 * spacingScale,
                                }]}>
                                    <Ionicons name="newspaper" size={22 * iconScale} color={COLORS.gray[300]} />
                                </View>
                            )}
                            <View style={styles.cardBody}>
                                <Text style={[styles.title, {
                                    color: titleColor,
                                    fontSize: 14 * fontScale,
                                    lineHeight: 20 * fontScale,
                                }]} numberOfLines={2}>{article.title}</Text>
                                {article.category && (
                                    <View style={[styles.categoryBadge, { backgroundColor: categoryBadgeBg }]}>
                                        <Text style={[styles.categoryText, { color: categoryTextColor, fontSize: 10 * fontScale }]}>{article.category}</Text>
                                    </View>
                                )}
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
        backgroundColor: COLORS.gray[100],
    },
    thumbFallback: {
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
    categoryBadge: {
        alignSelf: "flex-start",
        paddingHorizontal: 8,
        paddingVertical: 2,
        backgroundColor: COLORS.memento[100],
        borderRadius: RADIUS.sm,
    },
    categoryText: {
        fontSize: 10,
        fontWeight: "600",
        color: COLORS.memento[700],
    },
});
