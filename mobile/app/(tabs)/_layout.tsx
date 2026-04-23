/**
 * 탭 네비게이터 레이아웃
 * 5개 탭: 홈 / 기록 / AI펫톡 / 커뮤니티 / 매거진
 * 미니홈피는 기록 탭 내부 서브탭으로 이동
 */

import { Tabs } from "expo-router";
import { View, Text, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePet } from "@/contexts/PetContext";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

function TabIcon({
    name,
    focused,
    label,
    color,
}: {
    name: IoniconsName;
    focused: boolean;
    label: string;
    color: string;
}) {
    return (
        <View className="items-center justify-center pt-1">
            <Ionicons name={name} size={22} color={color} />
            <Text
                style={{
                    color,
                    fontSize: 10,
                    marginTop: 2,
                    fontWeight: focused ? "700" : "400",
                }}
            >
                {label}
            </Text>
        </View>
    );
}

export default function TabsLayout() {
    const { isMemorialMode } = usePet();
    const activeColor = isMemorialMode ? "#F59E0B" : "#05B2DC";

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: false,
                tabBarStyle: {
                    backgroundColor: "#fff",
                    borderTopColor: "#F3F4F6",
                    borderTopWidth: 1,
                    height: Platform.OS === "ios" ? 80 : 62,
                    paddingBottom: Platform.OS === "ios" ? 20 : 6,
                    elevation: 12,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.07,
                    shadowRadius: 12,
                },
                tabBarActiveTintColor: activeColor,
                tabBarInactiveTintColor: "#9CA3AF",
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    tabBarIcon: ({ focused, color }) => (
                        <TabIcon
                            name={focused ? "home" : "home-outline"}
                            focused={focused}
                            label="홈"
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="record"
                options={{
                    tabBarIcon: ({ focused, color }) => (
                        <TabIcon
                            name={focused ? "albums" : "albums-outline"}
                            focused={focused}
                            label="기록"
                            color={color}
                        />
                    ),
                }}
            />
            {/* AI 펫톡 — 중앙 강조 탭 */}
            <Tabs.Screen
                name="ai-chat"
                options={{
                    tabBarIcon: ({ focused, color }) => (
                        <View
                            style={{
                                width: 52,
                                height: 52,
                                borderRadius: 26,
                                backgroundColor: focused ? activeColor : "#E5E7EB",
                                alignItems: "center",
                                justifyContent: "center",
                                marginBottom: Platform.OS === "ios" ? 0 : 8,
                                shadowColor: activeColor,
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: focused ? 0.4 : 0,
                                shadowRadius: 8,
                                elevation: focused ? 6 : 0,
                            }}
                        >
                            <Ionicons
                                name={focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"}
                                size={24}
                                color={focused ? "#fff" : "#9CA3AF"}
                            />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="community"
                options={{
                    tabBarIcon: ({ focused, color }) => (
                        <TabIcon
                            name={focused ? "people" : "people-outline"}
                            focused={focused}
                            label="커뮤니티"
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="magazine"
                options={{
                    tabBarIcon: ({ focused, color }) => (
                        <TabIcon
                            name={focused ? "book" : "book-outline"}
                            focused={focused}
                            label="매거진"
                            color={color}
                        />
                    ),
                }}
            />
            {/* 미니홈피 — 탭에서 숨김, 기록 탭 내부에서 접근 */}
            <Tabs.Screen
                name="minihompy"
                options={{ href: null }}
            />
        </Tabs>
    );
}
