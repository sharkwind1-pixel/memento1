/**
 * 탭 네비게이터 레이아웃 — 웹 모바일 매칭
 * 5개 탭: 기록 / 커뮤니티 / 홈 (가운데 강조) / AI펫톡 / 매거진
 *
 * React Navigation의 native tabBarLabel 시스템 사용 (커스텀 TabIcon 라벨 클립 방지).
 * 미니홈피는 탭에서 숨김 (기록 탭 내부 서브탭으로 접근).
 */

import { Tabs } from "expo-router";
import { View, Text, Platform, StyleSheet, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePet } from "@/contexts/PetContext";
import { COLORS } from "@/lib/theme";

const { width: SCREEN_W } = Dimensions.get("window");
const TAB_ITEM_W = Math.floor(SCREEN_W / 5);

function makeLabel(label: string) {
    return ({ color }: { color: string }) => (
        <Text
            numberOfLines={1}
            allowFontScaling={false}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={{
                color,
                fontSize: 10,
                fontWeight: "500",
                textAlign: "center",
                width: TAB_ITEM_W - 8,
                paddingHorizontal: 2,
                includeFontPadding: false,
            }}
        >
            {label}
        </Text>
    );
}

export default function TabsLayout() {
    const { isMemorialMode } = usePet();
    const insets = useSafeAreaInsets();
    const activeColor = isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500];
    const homeGradient: [string, string] = isMemorialMode
        ? [COLORS.memorial[400], "#F97316"]
        : [COLORS.memento[400], COLORS.memento[500]];

    const bottomInset = Math.max(insets.bottom, 8);
    const tabHeight = 60 + bottomInset;

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarItemStyle: { flex: 1, paddingHorizontal: 0 },
                tabBarLabelStyle: {
                    fontSize: 10,
                    marginTop: 0,
                    marginBottom: Platform.OS === "android" ? 4 : 0,
                    includeFontPadding: false,
                },
                tabBarIconStyle: { marginTop: 4 },
                tabBarStyle: {
                    backgroundColor: "#fff",
                    borderTopColor: COLORS.gray[100],
                    borderTopWidth: 1,
                    height: tabHeight,
                    paddingBottom: bottomInset,
                    paddingTop: 4,
                    elevation: 4,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 6,
                },
                tabBarActiveTintColor: activeColor,
                tabBarInactiveTintColor: COLORS.gray[400],
            }}
        >
            {/* 1. 기록 */}
            <Tabs.Screen
                name="record"
                options={{
                    tabBarLabel: makeLabel("기록"),
                    tabBarIcon: ({ focused, color }) => (
                        <Ionicons
                            name={focused ? "albums" : "albums-outline"}
                            size={22}
                            color={color}
                        />
                    ),
                }}
            />
            {/* 2. 커뮤니티 */}
            <Tabs.Screen
                name="community"
                options={{
                    tabBarLabel: makeLabel("커뮤니티"),
                    tabBarIcon: ({ focused, color }) => (
                        <Ionicons
                            name={focused ? "people" : "people-outline"}
                            size={22}
                            color={color}
                        />
                    ),
                }}
            />
            {/* 3. 홈 — 가운데 강조 */}
            <Tabs.Screen
                name="index"
                options={{
                    tabBarLabel: "",
                    tabBarIcon: ({ focused }) => (
                        <View style={styles.homeBtnWrap}>
                            {focused ? (
                                <LinearGradient
                                    colors={homeGradient}
                                    style={styles.homeBtnActive}
                                >
                                    <Ionicons name="home" size={22} color="#fff" />
                                </LinearGradient>
                            ) : (
                                <View style={styles.homeBtnInactive}>
                                    <Ionicons name="home-outline" size={22} color={COLORS.gray[400]} />
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
                    tabBarLabel: makeLabel("AI펫톡"),
                    tabBarIcon: ({ focused, color }) => (
                        <Ionicons
                            name={focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"}
                            size={22}
                            color={color}
                        />
                    ),
                }}
            />
            {/* 5. 매거진 */}
            <Tabs.Screen
                name="magazine"
                options={{
                    tabBarLabel: makeLabel("매거진"),
                    tabBarIcon: ({ focused, color }) => (
                        <Ionicons
                            name={focused ? "book" : "book-outline"}
                            size={22}
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
    homeBtnWrap: {
        alignItems: "center",
        justifyContent: "center",
    },
    homeBtnActive: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: COLORS.memento[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
    },
    homeBtnInactive: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.gray[100],
        alignItems: "center",
        justifyContent: "center",
    },
});
