/**
 * 알림 화면
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Modal, ScrollView, StyleSheet, RefreshControl, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "@/config/constants";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { usePet } from "@/contexts/PetContext";
import { useDarkMode } from "@/contexts/ThemeContext";
import { COLORS } from "@/lib/theme";
import AppHeader from "@/components/common/AppHeader";

function formatRelative(iso: string): string {
    if (!iso) return "";
    try {
        const t = new Date(iso).getTime();
        if (isNaN(t)) return iso;
        const diffSec = Math.floor((Date.now() - t) / 1000);
        if (diffSec < 60) return "방금 전";
        if (diffSec < 3600) return `${Math.floor(diffSec / 60)}분 전`;
        if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}시간 전`;
        if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)}일 전`;
        const d = new Date(t);
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
    } catch {
        return iso;
    }
}

interface Notification {
    id: string;
    type: string;
    title: string;
    body: string;
    isRead: boolean;
    createdAt: string;
    metadata?: Record<string, unknown>;
}

function iconForType(type: string): React.ComponentProps<typeof Ionicons>["name"] {
    if (type === "admin_notice") return "megaphone-outline";
    if (type === "admin_message") return "mail-outline";
    if (type.startsWith("subscription_")) return "card-outline";
    if (type.startsWith("payment_")) return "wallet-outline";
    if (type === "welcome") return "sparkles-outline";
    return "notifications-outline";
}

function badgeForType(type: string): { label: string; color: string } | null {
    if (type === "admin_notice") return { label: "공지", color: COLORS.memento[500] };
    if (type === "admin_message") return { label: "관리자", color: COLORS.memorial[500] };
    return null;
}

export default function NotificationsScreen() {
    const router = useRouter();
    const { session, user } = useAuth();
    const { isMemorialMode } = usePet();
    const { isDarkMode } = useDarkMode();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selected, setSelected] = useState<Notification | null>(null);
    const [markingAll, setMarkingAll] = useState(false);

    const unreadCount = useMemo(
        () => notifications.filter((n) => !n.isRead).length,
        [notifications],
    );

    const load = useCallback(async () => {
        try {
            const headers: Record<string, string> = {};
            if (session) headers["Authorization"] = `Bearer ${session.access_token}`;
            const res = await fetch(`${API_BASE_URL}/api/notifications`, { headers });
            if (res.ok) {
                const data = await res.json();
                const list = Array.isArray(data?.notifications)
                    ? data.notifications
                    : Array.isArray(data)
                        ? data
                        : [];
                // snake_case (is_read, created_at) ↔ camelCase 정규화
                setNotifications(list.map((raw: any): Notification => ({
                    id: typeof raw?.id === "string" ? raw.id : String(raw?.id ?? ""),
                    type: typeof raw?.type === "string" ? raw.type : "",
                    title: typeof raw?.title === "string" ? raw.title : "",
                    body: typeof raw?.body === "string" ? raw.body : "",
                    isRead: typeof raw?.isRead === "boolean"
                        ? raw.isRead
                        : (raw?.read_at != null || raw?.is_read === true),
                    createdAt: typeof raw?.createdAt === "string"
                        ? raw.createdAt
                        : (typeof raw?.created_at === "string" ? raw.created_at : ""),
                    metadata: raw?.metadata && typeof raw.metadata === "object" ? raw.metadata : undefined,
                })));
            }
        } catch {
            // ignore
        } finally {
            setIsLoading(false);
        }
    }, [session]);

    useEffect(() => { load(); }, [load]);

    // 실시간 알림 동기화 — 새 알림 INSERT/UPDATE 즉시 다시 로드 → 0.5초 이내 반영
    useEffect(() => {
        if (!user?.id) return;
        const channel = supabase
            .channel(`notifications:${user.id}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
                () => { load(); },
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [user?.id, load]);

    async function handleRefresh() {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    }

    async function markRead(id: string) {
        if (!session) return;
        try {
            await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
                method: "PUT",
                headers: { "Authorization": `Bearer ${session.access_token}` },
            });
            setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
        } catch {
            // silent
        }
    }

    async function markAllRead() {
        if (!session || markingAll || unreadCount === 0) return;
        setMarkingAll(true);
        // 낙관적 업데이트
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        try {
            // 서버 일괄 endpoint 우선 시도, 미지원 시 개별 호출 fallback
            const res = await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
                method: "PUT",
                headers: { "Authorization": `Bearer ${session.access_token}` },
            });
            if (!res.ok) {
                // fallback: 개별 PUT 병렬 호출
                const unread = notifications.filter((n) => !n.isRead);
                await Promise.all(unread.map((n) =>
                    fetch(`${API_BASE_URL}/api/notifications/${n.id}/read`, {
                        method: "PUT",
                        headers: { "Authorization": `Bearer ${session.access_token}` },
                    }).catch(() => {})
                ));
            }
        } catch {
            Alert.alert("실패", "모두 읽음 처리에 실패했어요. 잠시 후 다시 시도해주세요.");
            // 롤백 위해 다시 로드
            load();
        } finally {
            setMarkingAll(false);
        }
    }

    function handlePress(n: Notification) {
        if (!n.isRead) markRead(n.id);

        if (n.type === "admin_notice" || n.type === "admin_message") {
            setSelected(n);
            return;
        }
        const link = (n.metadata as { link?: unknown } | undefined)?.link;
        if (typeof link === "string" && link.length > 0) {
            router.push(link as never);
            return;
        }
        if (n.type.startsWith("subscription_") || n.type.startsWith("payment_")) {
            router.push("/subscription");
            return;
        }
        // 기타: 상세 모달
        setSelected(n);
    }

    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.white;

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
                <Stack.Screen options={{ headerShown: false }} />
                <AppHeader showBack title="알림" hideActions />
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <ActivityIndicator size="large" color={COLORS.memento[500]} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
            <Stack.Screen options={{ headerShown: false }} />
            <AppHeader showBack title={`알림${unreadCount > 0 ? ` (${unreadCount})` : ""}`} hideActions />

            {/* 헤더 액션 (모두 읽음) */}
            {notifications.length > 0 && (
                <View style={[styles.headerActions, { borderBottomColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[100] }]}>
                    <Text style={{ fontSize: 12, color: isDarkMode ? COLORS.gray[400] : COLORS.gray[500] }}>
                        {unreadCount > 0 ? `읽지 않은 알림 ${unreadCount}개` : "모든 알림을 확인했어요"}
                    </Text>
                    {unreadCount > 0 && (
                        <TouchableOpacity
                            onPress={markAllRead}
                            disabled={markingAll}
                            style={[styles.markAllBtn, { backgroundColor: isDarkMode ? "rgba(5,178,220,0.12)" : COLORS.memento[50] }]}
                            activeOpacity={0.7}
                        >
                            {markingAll ? (
                                <ActivityIndicator size="small" color={COLORS.memento[500]} />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-done-outline" size={14} color={COLORS.memento[600]} />
                                    <Text style={{ fontSize: 12, color: COLORS.memento[600], fontWeight: "600" }}>모두 읽음</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {notifications.length === 0 ? (
                <ScrollView
                    contentContainerStyle={styles.emptyCenter}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.memento[500]} />}
                >
                    <Ionicons name="notifications-off-outline" size={48} color={COLORS.gray[300]} />
                    <Text style={{ color: isDarkMode ? COLORS.gray[400] : COLORS.gray[500], marginTop: 12, fontSize: 14, textAlign: "center", fontWeight: "600" }}>
                        아직 알림이 없어요
                    </Text>
                    <Text style={{ color: isDarkMode ? COLORS.gray[500] : COLORS.gray[400], marginTop: 6, fontSize: 12, textAlign: "center", lineHeight: 18 }}>
                        공지/관리자 메시지/구독·결제 알림이{"\n"}여기에 표시돼요
                    </Text>
                </ScrollView>
            ) : (
                <FlatList
                    data={notifications}
                    style={{ flex: 1 }}
                    keyExtractor={(item) => item.id}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.memento[500]} />}
                    renderItem={({ item }) => {
                        const badge = badgeForType(item.type);
                        const iconName = iconForType(item.type);
                        return (
                            <TouchableOpacity
                                activeOpacity={0.75}
                                onPress={() => handlePress(item)}
                                style={[
                                    styles.row,
                                    { borderBottomColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[100] },
                                ]}
                            >
                                <View
                                    style={[
                                        styles.iconBg,
                                        {
                                            backgroundColor: item.isRead
                                                ? (isDarkMode ? COLORS.gray[800] : COLORS.gray[100])
                                                : (isDarkMode ? "rgba(5,178,220,0.2)" : COLORS.memento[100]),
                                        },
                                    ]}
                                >
                                    <Ionicons name={iconName} size={18} color={item.isRead ? COLORS.gray[400] : COLORS.memento[500]} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                        {badge && (
                                            <View style={[styles.typeBadge, { backgroundColor: badge.color + "1a" }]}>
                                                <Text style={[styles.typeBadgeText, { color: badge.color }]}>{badge.label}</Text>
                                            </View>
                                        )}
                                        <Text style={{
                                            fontSize: 14,
                                            fontWeight: "600",
                                            color: isDarkMode ? COLORS.white : COLORS.gray[900],
                                            flexShrink: 1,
                                        }}>
                                            {item.title}
                                        </Text>
                                    </View>
                                    <Text style={{
                                        fontSize: 12,
                                        marginTop: 2,
                                        lineHeight: 16,
                                        color: isDarkMode ? COLORS.gray[400] : COLORS.gray[500],
                                    }} numberOfLines={2}>
                                        {item.body}
                                    </Text>
                                    <Text style={{ fontSize: 12, color: COLORS.gray[400], marginTop: 4 }}>{formatRelative(item.createdAt)}</Text>
                                </View>
                                {!item.isRead && (
                                    <View style={styles.unreadDot} />
                                )}
                            </TouchableOpacity>
                        );
                    }}
                />
            )}

            <Modal
                visible={selected !== null}
                animationType="slide"
                transparent
                onRequestClose={() => setSelected(null)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={[styles.modalSheet, { backgroundColor: isDarkMode ? COLORS.gray[900] : "#fff" }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: isDarkMode ? COLORS.white : COLORS.gray[900] }]} numberOfLines={2}>
                                {selected?.title}
                            </Text>
                            <TouchableOpacity onPress={() => setSelected(null)} hitSlop={8}>
                                <Ionicons name="close" size={22} color={isDarkMode ? COLORS.gray[300] : COLORS.gray[700]} />
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.modalDate, { color: isDarkMode ? COLORS.gray[500] : COLORS.gray[400] }]}>{formatRelative(selected?.createdAt ?? "")}</Text>
                        <ScrollView style={{ maxHeight: 400 }} contentContainerStyle={{ paddingVertical: 8 }}>
                            <Text style={[
                                styles.modalBody,
                                { color: isDarkMode ? COLORS.gray[200] : COLORS.gray[700] },
                            ]}>
                                {selected?.body}
                            </Text>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    emptyCenter: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingVertical: 80 },
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    markAllBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 9999,
    },
    row: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    iconBg: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.memento[500],
        marginTop: 6,
    },
    typeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
    },
    typeBadgeText: { fontSize: 10, fontWeight: "700" },
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    modalSheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 32,
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        marginBottom: 4,
    },
    modalTitle: { flex: 1, fontSize: 18, fontWeight: "700" },
    modalDate: { fontSize: 12, marginBottom: 12 },
    modalBody: { fontSize: 14, lineHeight: 22 },
});
