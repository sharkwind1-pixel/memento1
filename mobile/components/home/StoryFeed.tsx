/**
 * StoryFeed — 24h 스토리 피드 (가로 스크롤)
 * GET /api/stories
 */

import { useEffect, useState, useCallback } from "react";
import {
    View, Text, ScrollView, TouchableOpacity,
    Image, Alert, StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL } from "@/config/constants";
import { COLORS } from "@/lib/theme";

interface StoryUser {
    userId: string;
    nickname: string;
    avatar: string | null;
    storyCount: number;
}

export default function StoryFeed() {
    const { user, session } = useAuth();
    const [feed, setFeed] = useState<StoryUser[]>([]);

    const load = useCallback(async () => {
        try {
            const headers: Record<string, string> = {};
            if (session) headers["Authorization"] = `Bearer ${session.access_token}`;
            const res = await fetch(`${API_BASE_URL}/api/stories`, { headers });
            if (!res.ok) return;
            const data = await res.json();
            const raw = Array.isArray(data?.feed) ? data.feed : [];
            setFeed(raw.map((u: Record<string, unknown>) => ({
                userId: typeof u.userId === "string" ? u.userId : "",
                nickname: typeof u.nickname === "string" ? u.nickname : "익명",
                avatar: typeof u.avatar === "string" ? u.avatar : null,
                storyCount: Array.isArray(u.stories) ? u.stories.length : 0,
            })));
        } catch {
            // 조용히
        }
    }, [session]);

    useEffect(() => { load(); }, [load]);

    if (!user && feed.length === 0) return null;

    return (
        <View style={styles.section}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {user && (
                    <TouchableOpacity
                        style={styles.item}
                        onPress={() => Alert.alert("스토리", "스토리 작성은 다음 업데이트에 추가됩니다.")}
                        activeOpacity={0.75}
                    >
                        <View style={styles.addCircle}>
                            <Ionicons name="add" size={20} color={COLORS.memento[500]} />
                        </View>
                        <Text style={styles.label}>내 스토리</Text>
                    </TouchableOpacity>
                )}

                {feed.map((su) => (
                    <TouchableOpacity
                        key={su.userId}
                        style={styles.item}
                        onPress={() => Alert.alert(su.nickname, "스토리 뷰어는 다음 업데이트에 추가됩니다.")}
                        activeOpacity={0.75}
                    >
                        <LinearGradient
                            colors={[COLORS.memento[500], "#8B5CF6"]}
                            style={styles.avatarBorder}
                        >
                            <View style={styles.avatarInner}>
                                {su.avatar ? (
                                    <Image source={{ uri: su.avatar }} style={styles.avatarImg} />
                                ) : (
                                    <View style={[styles.avatarImg, styles.avatarFallback]}>
                                        <Ionicons name="camera-outline" size={16} color={COLORS.memento[500]} />
                                    </View>
                                )}
                            </View>
                        </LinearGradient>
                        <Text style={styles.label} numberOfLines={1}>
                            {su.nickname}
                        </Text>
                    </TouchableOpacity>
                ))}

                {feed.length === 0 && user && (
                    <Text style={styles.emptyHint}>첫 번째 스토리를 올려보세요</Text>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    section: { marginTop: -8, marginBottom: 8 },
    scrollContent: { paddingHorizontal: 16, gap: 12, paddingBottom: 8 },
    item: { alignItems: "center", gap: 4, width: 64 },
    addCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.gray[100],
        borderWidth: 2,
        borderStyle: "dashed",
        borderColor: COLORS.memento[400],
        alignItems: "center",
        justifyContent: "center",
    },
    avatarBorder: {
        width: 56,
        height: 56,
        borderRadius: 28,
        padding: 2,
    },
    avatarInner: {
        flex: 1,
        borderRadius: 26,
        backgroundColor: COLORS.white,
        padding: 2,
    },
    avatarImg: { flex: 1, borderRadius: 24 },
    avatarFallback: {
        backgroundColor: COLORS.memento[100],
        alignItems: "center",
        justifyContent: "center",
    },
    label: { fontSize: 10, color: COLORS.gray[600], maxWidth: 60 },
    emptyHint: { fontSize: 12, color: COLORS.gray[400], alignSelf: "center", marginLeft: 8 },
});
