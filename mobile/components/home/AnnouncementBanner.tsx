/**
 * AnnouncementBanner — 전체 공지 (최대 3개)
 * GET /api/posts?notice_scope=global&limit=3
 */

import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { API_BASE_URL } from "@/config/constants";
import { COLORS } from "@/lib/theme";

interface Notice {
    id: string;
    title: string;
}

export default function AnnouncementBanner() {
    const router = useRouter();
    const [notices, setNotices] = useState<Notice[]>([]);
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/posts?notice_scope=global&limit=3`);
                if (!res.ok) return;
                const data = await res.json();
                const list = Array.isArray(data?.posts) ? data.posts : Array.isArray(data) ? data : [];
                setNotices(list.map((p: Record<string, unknown>) => ({
                    id: typeof p.id === "string" ? p.id : String(p.id ?? ""),
                    title: typeof p.title === "string" ? p.title : "",
                })));
            } catch {
                // 조용히 실패
            }
        })();
    }, []);

    const visible = notices.filter((n) => !dismissed.has(n.id));
    if (visible.length === 0) return null;

    return (
        <View style={styles.container}>
            {visible.map((n) => (
                <TouchableOpacity
                    key={n.id}
                    onPress={() => n.id && router.push(`/post/${n.id}`)}
                    activeOpacity={0.75}
                    style={styles.row}
                >
                    <Ionicons name="megaphone" size={14} color="#DC2626" />
                    <Text style={styles.title} numberOfLines={1}>[공지] {n.title}</Text>
                    <TouchableOpacity
                        onPress={(e) => {
                            e.stopPropagation();
                            setDismissed((prev) => new Set(prev).add(n.id));
                        }}
                        hitSlop={8}
                    >
                        <Ionicons name="close" size={14} color="#FCA5A5" />
                    </TouchableOpacity>
                </TouchableOpacity>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { paddingHorizontal: 16, gap: 8, marginBottom: 8 },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: "#FEF2F2",
        borderWidth: 1,
        borderColor: "#FECACA",
        borderRadius: 12,
    },
    title: {
        flex: 1,
        fontSize: 13,
        fontWeight: "500",
        color: "#B91C1C",
    },
});
