/**
 * NeighborNewsSection — 홈 "이웃 새소식" (웹 src/components/features/home/NeighborNewsSection.tsx 1:1)
 *
 * 내가 이웃 맺은 유저들의 최근 커뮤니티 글 가로 카드. 탭 → /post/{id}.
 * 비로그인/이웃 0명/새글 0건이면 렌더 안 함 (웹 동일).
 */

import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Session } from "@supabase/supabase-js";
import { useDarkMode } from "@/contexts/ThemeContext";
import { API_BASE_URL } from "@/config/constants";
import { COLORS } from "@/lib/theme";

interface FeedItem {
    postId: string;
    nickname: string;
    avatarUrl: string | null;
    title: string;
    badge: string | null;
    createdAt: string;
    likes: number;
}

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "방금";
    if (m < 60) return `${m}분 전`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}시간 전`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}일 전`;
    return new Date(iso).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

export default function NeighborNewsSection({ session, isMemorialMode }: {
    session: Session | null;
    isMemorialMode: boolean;
}) {
    const { isDarkMode } = useDarkMode();
    const router = useRouter();
    const [items, setItems] = useState<FeedItem[]>([]);

    useEffect(() => {
        if (!session) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/neighbors/feed`, {
                    headers: { Authorization: `Bearer ${session.access_token}` },
                });
                if (!res.ok) return;
                const data = await res.json();
                if (!cancelled && Array.isArray(data.items)) setItems(data.items);
            } catch { /* silent — 홈 본 피드 영향 없음 */ }
        })();
        return () => { cancelled = true; };
    }, [session]);

    if (items.length === 0) return null;

    const accent = isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500];
    const cardBg = isDarkMode ? COLORS.gray[800] : "rgba(255,255,255,0.92)";
    const cardBorder = isDarkMode ? COLORS.gray[700] : COLORS.gray[100];
    const titleColor = isDarkMode ? COLORS.gray[100] : COLORS.gray[800];
    const chipBg = isMemorialMode ? "#FEF3C7" : "#E0F7FF";
    const chipText = isMemorialMode ? COLORS.memorial[600] : COLORS.memento[600];

    return (
        <View style={styles.section}>
            <View style={styles.headerRow}>
                <Ionicons name="water-outline" size={18} color={accent} />
                <Text style={[styles.headerTitle, { color: titleColor }]}>이웃 새소식</Text>
                <Text style={styles.headerSub}>이웃들이 광장에 남긴 이야기</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollRow}>
                {items.map((it) => (
                    <TouchableOpacity
                        key={it.postId}
                        activeOpacity={0.85}
                        onPress={() => router.push(`/post/${it.postId}`)}
                        style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}
                    >
                        <View style={styles.cardTop}>
                            {it.avatarUrl ? (
                                <Image source={{ uri: it.avatarUrl }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatar, { backgroundColor: chipBg, alignItems: "center", justifyContent: "center" }]}>
                                    <Text style={{ fontSize: 11, fontWeight: "700", color: chipText }}>{it.nickname.slice(0, 1)}</Text>
                                </View>
                            )}
                            <Text style={[styles.nick, { color: isDarkMode ? COLORS.gray[200] : COLORS.gray[700] }]} numberOfLines={1}>{it.nickname}</Text>
                            <Text style={styles.time}>{timeAgo(it.createdAt)}</Text>
                        </View>
                        <Text style={[styles.title, { color: titleColor }]} numberOfLines={2}>
                            {it.badge ? `[${it.badge}] ` : ""}{it.title}
                        </Text>
                        <View style={styles.cardBottom}>
                            <Ionicons name="heart-outline" size={12} color={COLORS.gray[400]} />
                            <Text style={styles.likes}>{it.likes}</Text>
                            <Ionicons name="chevron-forward" size={12} color={COLORS.gray[400]} style={{ marginLeft: "auto" }} />
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    section: { paddingTop: 20 },
    headerRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, marginBottom: 10 },
    headerTitle: { fontSize: 16, fontWeight: "700" },
    headerSub: { fontSize: 11, color: COLORS.gray[400] },
    scrollRow: { paddingHorizontal: 16, gap: 10 },
    card: {
        width: 220,
        borderRadius: 16,
        borderWidth: 1,
        padding: 12,
        elevation: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
    },
    cardTop: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
    avatar: { width: 26, height: 26, borderRadius: 13 },
    nick: { fontSize: 12, fontWeight: "600", flexShrink: 1 },
    time: { fontSize: 10, color: COLORS.gray[400], marginLeft: "auto" },
    title: { fontSize: 13, fontWeight: "500", lineHeight: 18, minHeight: 36 },
    cardBottom: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 8 },
    likes: { fontSize: 10, color: COLORS.gray[400] },
});
