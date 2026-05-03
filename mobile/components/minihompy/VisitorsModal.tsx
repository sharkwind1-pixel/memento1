/**
 * VisitorsModal — 미니홈피 방문자 목록 (본인만)
 *
 * GET /api/minihompy/[userId]/visitors → 최근 50명
 *  - 로그인 방문자: 닉네임 + 아바타 (탭하면 그 사람 미니홈피로 이동)
 *  - 익명 방문자: "익명 방문자"
 */

import { useEffect, useState, useCallback } from "react";
import {
    View, Text, Modal, TouchableOpacity, Image,
    FlatList, StyleSheet, ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useDarkMode } from "@/contexts/ThemeContext";
import { COLORS } from "@/lib/theme";
import { getMyVisitors, type VisitorEntry } from "@/lib/minihompy-api";

interface Props {
    visible: boolean;
    onClose: () => void;
    accentColor: string;
}

function relativeTime(iso: string): string {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "방금";
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}일 전`;
    return new Date(iso).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

export default function VisitorsModal({ visible, onClose, accentColor }: Props) {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { session, user } = useAuth();
    const { isDarkMode } = useDarkMode();
    const [visitors, setVisitors] = useState<VisitorEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!session?.access_token || !user?.id) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const list = await getMyVisitors(session.access_token, user.id);
            setVisitors(list);
        } catch (e) {
            setError(e instanceof Error ? e.message : "방문자 목록을 불러올 수 없어요");
        } finally {
            setLoading(false);
        }
    }, [session?.access_token, user?.id]);

    useEffect(() => {
        if (visible) load();
    }, [visible, load]);

    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.gray[50];
    const cardBg = isDarkMode ? COLORS.gray[900] : COLORS.white;
    const textColor = isDarkMode ? COLORS.white : COLORS.gray[900];
    const subColor = isDarkMode ? COLORS.gray[400] : COLORS.gray[500];

    function handleVisitorTap(v: VisitorEntry) {
        if (!v.visitorId) return;
        onClose();
        router.push(`/minihompy/${v.visitorId}`);
    }

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
                <View style={[styles.header, { backgroundColor: cardBg }]}>
                    <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.headerBtn}>
                        <Ionicons name="close" size={24} color={textColor} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: textColor }]}>방문자 기록</Text>
                    <View style={{ width: 32 }} />
                </View>

                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={accentColor} />
                    </View>
                ) : error ? (
                    <View style={styles.center}>
                        <Ionicons name="alert-circle-outline" size={32} color={COLORS.gray[400]} />
                        <Text style={[styles.errorText, { color: subColor }]}>{error}</Text>
                    </View>
                ) : visitors.length === 0 ? (
                    <View style={styles.center}>
                        <Ionicons name="footsteps-outline" size={36} color={COLORS.gray[300]} />
                        <Text style={[styles.emptyText, { color: subColor }]}>
                            아직 방문자가 없어요
                        </Text>
                        <Text style={[styles.emptyHint, { color: subColor }]}>
                            미니홈피를 공개하면 누군가 다녀갈 수 있어요
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={visitors}
                        keyExtractor={(v) => v.id}
                        contentContainerStyle={[
                            styles.listContent,
                            { paddingBottom: 16 + insets.bottom },
                        ]}
                        ListHeaderComponent={
                            <Text style={[styles.summary, { color: subColor }]}>
                                최근 {visitors.length}명이 다녀갔어요
                            </Text>
                        }
                        ItemSeparatorComponent={() => (
                            <View style={[styles.separator, {
                                backgroundColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[100],
                            }]} />
                        )}
                        renderItem={({ item }) => {
                            const clickable = !!item.visitorId;
                            return (
                                <TouchableOpacity
                                    onPress={() => handleVisitorTap(item)}
                                    disabled={!clickable}
                                    activeOpacity={clickable ? 0.7 : 1}
                                    style={[styles.row, { backgroundColor: cardBg }]}
                                >
                                    {item.visitorAvatar ? (
                                        <Image source={{ uri: item.visitorAvatar }} style={styles.avatar} />
                                    ) : (
                                        <View style={[styles.avatar, styles.avatarFallback, {
                                            backgroundColor: clickable
                                                ? accentColor + "20"
                                                : (isDarkMode ? COLORS.gray[800] : COLORS.gray[100]),
                                        }]}>
                                            <Ionicons
                                                name={clickable ? "person" : "eye-off-outline"}
                                                size={18}
                                                color={clickable ? accentColor : COLORS.gray[400]}
                                            />
                                        </View>
                                    )}
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.name, { color: textColor }]}>
                                            {item.visitorNickname}
                                        </Text>
                                        <Text style={[styles.time, { color: subColor }]}>
                                            {relativeTime(item.visitedAt)}
                                        </Text>
                                    </View>
                                    {clickable && (
                                        <Ionicons name="chevron-forward" size={16} color={COLORS.gray[400]} />
                                    )}
                                </TouchableOpacity>
                            );
                        }}
                    />
                )}
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(0,0,0,0.05)",
    },
    headerBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
    headerTitle: { flex: 1, fontSize: 17, fontWeight: "700", textAlign: "center" },
    center: {
        flex: 1, alignItems: "center", justifyContent: "center",
        gap: 8, paddingHorizontal: 24,
    },
    errorText: { fontSize: 14, textAlign: "center", marginTop: 8 },
    emptyText: { fontSize: 14, fontWeight: "600" },
    emptyHint: { fontSize: 12, textAlign: "center" },
    listContent: { padding: 16, gap: 0 },
    summary: { fontSize: 12, marginBottom: 8, paddingHorizontal: 4 },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    separator: { height: 1 },
    avatar: { width: 40, height: 40, borderRadius: 20 },
    avatarFallback: { alignItems: "center", justifyContent: "center" },
    name: { fontSize: 14, fontWeight: "600" },
    time: { fontSize: 11, marginTop: 2 },
});
