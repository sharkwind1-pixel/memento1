/**
 * 알림 화면
 */

import { useState, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "@/config/constants";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";

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
        return <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color="#05B2DC" /></View>;
    }

    return (
        <View className={`flex-1 ${isMemorialMode ? "bg-gray-950" : "bg-white"}`}>
            {notifications.length === 0 ? (
                <View className="flex-1 items-center justify-center px-6">
                    <Ionicons name="notifications-off-outline" size={48} color="#D1D5DB" />
                    <Text className="text-gray-400 mt-3 text-sm text-center">
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
                            className="flex-row items-start gap-3 px-5 py-4 border-b"
                            style={{ borderBottomColor: isMemorialMode ? "#1F2937" : "#F3F4F6" }}
                        >
                            <View
                                className="w-10 h-10 rounded-full items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: item.isRead ? "#F3F4F6" : "#E0F7FF" }}
                            >
                                <Ionicons name="notifications" size={18} color={item.isRead ? "#9CA3AF" : "#05B2DC"} />
                            </View>
                            <View className="flex-1">
                                <Text className={`text-sm font-semibold ${isMemorialMode ? "text-white" : "text-gray-900"}`}>
                                    {item.title}
                                </Text>
                                <Text className={`text-xs mt-0.5 leading-4 ${isMemorialMode ? "text-gray-400" : "text-gray-500"}`}>
                                    {item.body}
                                </Text>
                                <Text className="text-xs text-gray-400 mt-1">{item.createdAt}</Text>
                            </View>
                            {!item.isRead && (
                                <View className="w-2 h-2 rounded-full bg-memento-500 mt-1.5" />
                            )}
                        </TouchableOpacity>
                    )}
                />
            )}
        </View>
    );
}
