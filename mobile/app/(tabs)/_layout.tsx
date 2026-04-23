/**
 * 탭 네비게이터 레이아웃
 * 5개 탭: 홈 / 기록 / AI펫톡 / 커뮤니티 / 미니홈피
 */

import { Tabs } from "expo-router";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePet } from "@/contexts/PetContext";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

interface TabIconProps {
    name: IoniconsName;
    focused: boolean;
    label: string;
    color: string;
}

function TabIcon({ name, focused, label, color }: TabIconProps) {
    return (
        <View className="items-center justify-center pt-1">
            <Ionicons name={name} size={22} color={color} />
            <Text
                style={{ color, fontSize: 10, marginTop: 2, fontWeight: focused ? "600" : "400" }}
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
                    height: 60,
                    paddingBottom: 4,
                    elevation: 8,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.06,
                    shadowRadius: 8,
                },
                tabBarActiveTintColor: activeColor,
                tabBarInactiveTintColor: "#9CA3AF",
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    tabBarIcon: ({ focused, color }) => (
                        <TabIcon name={focused ? "home" : "home-outline"} focused={focused} label="홈" color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="record"
                options={{
                    tabBarIcon: ({ focused, color }) => (
                        <TabIcon name={focused ? "camera" : "camera-outline"} focused={focused} label="기록" color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="ai-chat"
                options={{
                    tabBarIcon: ({ focused, color }) => (
                        <TabIcon name={focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"} focused={focused} label="AI펫톡" color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="community"
                options={{
                    tabBarIcon: ({ focused, color }) => (
                        <TabIcon name={focused ? "people" : "people-outline"} focused={focused} label="커뮤니티" color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="minihompy"
                options={{
                    tabBarIcon: ({ focused, color }) => (
                        <TabIcon name={focused ? "star" : "star-outline"} focused={focused} label="미니홈피" color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
