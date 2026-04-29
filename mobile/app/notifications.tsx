/**
 * 알림 화면
 */

import { useState, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Modal, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "@/config/constants";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { useDarkMode } from "@/contexts/ThemeContext";
import { COLORS } from "@/lib/theme";
import AppHeader from "@/components/common/AppHeader";

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
    const { session } = useAuth();
    const { isMemorialMode } = usePet();
    const { isDarkMode } = useDarkMode();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selected, setSelected] = useState<Notification | null>(null);

    useEffect(() => { load(); }, []);

    async function load() {
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
            <AppHeader showBack title="알림" hideActions />
            {notifications.length === 0 ? (
                <View style={styles.emptyCenter}>
                    <Ionicons name="notifications-off-outline" size={48} color={COLORS.gray[300]} />
                    <Text style={{ color: COLORS.gray[400], marginTop: 12, fontSize: 14, textAlign: "center" }}>
                        아직 알림이 없어요.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    style={{ flex: 1 }}
                    keyExtractor={(item) => item.id}
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
                                        { backgroundColor: item.isRead ? COLORS.gray[100] : COLORS.memento[100] },
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
                                    <Text style={{ fontSize: 12, color: COLORS.gray[400], marginTop: 4 }}>{item.createdAt}</Text>
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
                            <Text style={[styles.modalTitle, { color: isMemorialMode ? "#fff" : COLORS.gray[900] }]} numberOfLines={2}>
                                {selected?.title}
                            </Text>
                            <TouchableOpacity onPress={() => setSelected(null)} hitSlop={8}>
                                <Ionicons name="close" size={22} color={isMemorialMode ? "#fff" : COLORS.gray[700]} />
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.modalDate, { color: COLORS.gray[400] }]}>{selected?.createdAt}</Text>
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
    emptyCenter: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
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
