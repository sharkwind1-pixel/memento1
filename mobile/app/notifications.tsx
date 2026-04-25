/**
 * 알림 화면
 */

import { useState, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "@/config/constants";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { COLORS } from "@/lib/theme";

interface Notification {
    id: string;
    type: string;
    title: string;
    body: string;
    isRead: boolean;
    createdAt: string;
}

export default function NotificationsScreen() {
    const { session } = useAuth();
    const { isMemorialMode } = usePet();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => { load(); }, []);

    async function load() {
        try {
            const headers: Record<string, string> = {};
            if (session) headers["Authorization"] = `Bearer ${session.access_token}`;
            const res = await fetch(`${API_BASE_URL}/api/notifications`, { headers });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications ?? data ?? []);
            }
        } catch {
            // ignore
        } finally {
            setIsLoading(false);
        }
    }

    if (isLoading) {
        return (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator size="large" color={COLORS.memento[500]} />
            </View>
        );
    }

    const bgColor = isMemorialMode ? COLORS.gray[950] : COLORS.white;

    return (
        <View style={[styles.flex1, { backgroundColor: bgColor }]}>
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
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            activeOpacity={0.75}
                            style={[
                                styles.row,
                                { borderBottomColor: isMemorialMode ? COLORS.gray[800] : COLORS.gray[100] },
                            ]}
                        >
                            <View
                                style={[
                                    styles.iconBg,
                                    { backgroundColor: item.isRead ? COLORS.gray[100] : COLORS.memento[100] },
                                ]}
                            >
                                <Ionicons name="notifications" size={18} color={item.isRead ? COLORS.gray[400] : COLORS.memento[500]} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{
                                    fontSize: 14,
                                    fontWeight: "600",
                                    color: isMemorialMode ? COLORS.white : COLORS.gray[900],
                                }}>
                                    {item.title}
                                </Text>
                                <Text style={{
                                    fontSize: 12,
                                    marginTop: 2,
                                    lineHeight: 16,
                                    color: isMemorialMode ? COLORS.gray[400] : COLORS.gray[500],
                                }}>
                                    {item.body}
                                </Text>
                                <Text style={{ fontSize: 12, color: COLORS.gray[400], marginTop: 4 }}>{item.createdAt}</Text>
                            </View>
                            {!item.isRead && (
                                <View style={styles.unreadDot} />
                            )}
                        </TouchableOpacity>
                    )}
                />
            )}
        </View>
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
});
