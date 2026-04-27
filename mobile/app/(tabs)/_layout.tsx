/**
 * 탭 네비게이터 레이아웃 — 웹 모바일 매칭
 * 5개 탭: 기록 / 커뮤니티 / 홈 (가운데 강조) / AI펫톡 / 매거진
 * 미니홈피는 탭에서 숨김 (기록 탭 내부 서브탭으로 접근)
 */

import { Tabs } from "expo-router";
import { View, Text, Platform, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePet } from "@/contexts/PetContext";
import { COLORS } from "@/lib/theme";

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
        <View style={styles.tabIconWrap}>
            <Ionicons name={name} size={22} color={color} />
            <Text
                numberOfLines={1}
                ellipsizeMode="clip"
                allowFontScaling={false}
                style={{
                    color,
                    fontSize: 10,
                    marginTop: 2,
                    fontWeight: focused ? "700" : "400",
                    textAlign: "center",
                }}
            >
                {label}
            </Text>
        </View>
    );
}

export default function TabsLayout() {
    const { isMemorialMode } = usePet();
    const insets = useSafeAreaInsets();
    const activeColor = isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500];
    const homeGradient: [string, string] = isMemorialMode
        ? [COLORS.memorial[400], "#F97316"]
        : [COLORS.memento[400], COLORS.memento[500]];

    // 안드로이드 제스처 네비 + 홈 바, iOS 홈 인디케이터 회피용 패딩.
    // bottom inset이 0인 기기는 최소 8px 확보.
    const bottomInset = Math.max(insets.bottom, 8);
    const tabHeight = (Platform.OS === "ios" ? 56 : 56) + bottomInset;

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: false,
                tabBarItemStyle: { flex: 1, paddingHorizontal: 0 },
                tabBarStyle: {
                    backgroundColor: "#fff",
                    borderTopColor: COLORS.gray[100],
                    borderTopWidth: 1,
                    height: tabHeight,
                    paddingBottom: bottomInset,
                    paddingTop: 6,
                    elevation: 12,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.07,
                    shadowRadius: 12,
                },
                tabBarActiveTintColor: activeColor,
                tabBarInactiveTintColor: COLORS.gray[400],
            }}
        >
            {/* 1. 기록 */}
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
            {/* 2. 커뮤니티 */}
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
            {/* 3. 홈 — 가운데 강조 (웹 모바일과 동일) */}
            <Tabs.Screen
                name="index"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <View style={styles.homeBtnWrap}>
                            {focused ? (
                                <LinearGradient
                                    colors={homeGradient}
                                    style={styles.homeBtnActive}
                                >
                                    <Ionicons name="home" size={24} color="#fff" />
                                </LinearGradient>
                            ) : (
                                <View style={styles.homeBtnInactive}>
                                    <Ionicons name="home-outline" size={24} color={COLORS.gray[400]} />
                                </View>
                            )}
                        </View>
                    ),
                }}
            />
            {/* 4. AI펫톡 */}
            <Tabs.Screen
                name="ai-chat"
                options={{
                    tabBarIcon: ({ focused, color }) => (
                        <TabIcon
                            name={focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"}
                            focused={focused}
                            label="AI펫톡"
                            color={color}
                        />
                    ),
                }}
            />
            {/* 5. 매거진 */}
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
            <Tabs.Screen
                name="minihompy"
                options={{ href: null }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    tabIconWrap: { alignItems: "center", justifyContent: "center", paddingTop: 4 },
    homeBtnWrap: {
        alignItems: "center",
        justifyContent: "center",
    },
    homeBtnActive: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 0,
        shadowColor: COLORS.memento[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
    },
    homeBtnInactive: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: COLORS.gray[100],
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 0,
    },
});
