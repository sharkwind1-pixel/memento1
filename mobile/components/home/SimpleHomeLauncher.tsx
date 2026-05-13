/**
 * SimpleHomeLauncher (모바일) — 간편모드 홈 화면
 *
 * 웹 src/components/features/home/SimpleHomeLauncher.tsx 1:1 매칭.
 *
 * 일반 8섹션 스크롤 홈 → 큰 카드 2x3 그리드 런처로 완전 교체.
 * 노인 사용자 타겟 (큰 글씨/큰 터치 타겟/단순 구조).
 */

import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { useDarkMode } from "@/contexts/ThemeContext";
import { useSimpleMode } from "@/contexts/SimpleModeContext";
import { COLORS } from "@/lib/theme";
import QuestCard from "@/components/home/QuestCard";

interface LauncherItem {
    id: string;
    label: string;
    description: string;
    icon: React.ComponentProps<typeof Ionicons>["name"];
    route: string;
    iconColor: string;
    bgColor: string;
    bgColorDark: string;
}

const LAUNCHER_ITEMS: LauncherItem[] = [
    {
        id: "record",
        label: "내 반려동물",
        description: "사진, 일기, 기록",
        icon: "camera",
        route: "/(tabs)/record",
        iconColor: COLORS.memento[600],
        bgColor: COLORS.memento[200],
        bgColorDark: "rgba(8,145,178,0.18)",
    },
    {
        id: "ai-chat",
        label: "AI와 대화",
        description: "AI 펫톡 상담",
        icon: "chatbubble-ellipses",
        route: "/(tabs)/ai-chat",
        iconColor: "#059669",
        bgColor: "#ECFDF5",
        bgColorDark: "rgba(5,150,105,0.18)",
    },
    {
        id: "community",
        label: "커뮤니티",
        description: "자유게시판, 소통",
        icon: "people",
        route: "/(tabs)/community",
        iconColor: COLORS.memento[600],
        bgColor: COLORS.memento[200],
        bgColorDark: "rgba(8,145,178,0.18)",
    },
    {
        id: "magazine",
        label: "펫매거진",
        description: "반려동물 정보",
        icon: "book",
        route: "/(tabs)/magazine",
        iconColor: "#9333EA",
        bgColor: "#FAF5FF",
        bgColorDark: "rgba(147,51,234,0.18)",
    },
    {
        id: "minihompy",
        label: "내 미니홈피",
        description: "나만의 공간",
        icon: "home",
        route: "/(tabs)/minihompy",
        iconColor: COLORS.memento[600],
        bgColor: COLORS.memento[50],
        bgColorDark: "rgba(8,145,178,0.10)",
    },
    {
        id: "adoption",
        label: "입양정보",
        description: "유기동물 입양",
        icon: "heart",
        route: "/adoption",
        iconColor: "#E11D48",
        bgColor: "#FFF1F2",
        bgColorDark: "rgba(225,29,72,0.18)",
    },
];

export default function SimpleHomeLauncher() {
    const router = useRouter();
    const { user, profile } = useAuth();
    const { isMemorialMode } = usePet();
    const { isDarkMode } = useDarkMode();
    const { toggleSimpleMode, fontScale, spacingScale, iconScale } = useSimpleMode();

    const nickname = profile?.nickname
        ?? (user?.user_metadata?.nickname as string | undefined)
        ?? user?.email?.split("@")[0]
        ?? "사용자";

    const heroGradient: [string, string, string] = isMemorialMode
        ? ["#091A2E", "#1A2A3E", "#3D2A1A"]
        : ["#CBEBF0", "#E0F3F6", "#FFF8F6"];

    const heroTitleColor = isMemorialMode ? "#FEF3C7" : COLORS.gray[800];
    const heroSubColor = isMemorialMode ? "rgba(254,243,199,0.7)" : COLORS.gray[500];

    const heroImage = isMemorialMode
        ? require("@/assets/hero-illustration-memorial.png")
        : require("@/assets/hero-illustration.png");

    const screenBg: [string, string, string] = isDarkMode
        ? [COLORS.gray[900], COLORS.gray[800], COLORS.gray[900]]
        : isMemorialMode
            ? ["rgba(255,251,235,0.8)", "rgba(255,251,235,0.3)", "rgba(255,247,237,0.2)"]
            : ["rgba(186,230,253,0.8)", "rgba(186,230,253,0.4)", COLORS.white];

    const cardLabelColor = isDarkMode ? COLORS.gray[100] : COLORS.gray[800];
    const cardDescColor = isDarkMode ? COLORS.gray[400] : COLORS.gray[500];

    function handleCardPress(item: LauncherItem) {
        router.push(item.route as never);
    }

    return (
        <LinearGradient colors={screenBg} style={styles.container}>
            <ScrollView contentContainerStyle={[styles.scrollContent, { padding: 16 * spacingScale }]} showsVerticalScrollIndicator={false}>
                {/* 히어로 배너 */}
                <LinearGradient
                    colors={heroGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.heroCard, { marginBottom: 24 * spacingScale }]}
                >
                    <View style={[styles.heroInner, {
                        padding: 20 * spacingScale,
                        gap: 16 * spacingScale,
                    }]}>
                        <Image
                            source={heroImage}
                            style={{
                                width: 100 * spacingScale,
                                height: 100 * spacingScale,
                            }}
                            resizeMode="contain"
                        />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.heroTitle, {
                                color: heroTitleColor,
                                fontSize: 20 * fontScale,
                                lineHeight: 28 * fontScale,
                            }]} numberOfLines={2}>
                                안녕하세요,{"\n"}{nickname}님
                            </Text>
                            <Text style={[styles.heroSub, {
                                color: heroSubColor,
                                fontSize: 13 * fontScale,
                                marginTop: 6 * spacingScale,
                            }]}>
                                어떤 것을 하시겠어요?
                            </Text>
                        </View>
                    </View>
                </LinearGradient>

                {/* 온보딩 미션 카드 (웹 매칭) */}
                <View style={{ marginBottom: 16 * spacingScale }}>
                    <QuestCard />
                </View>

                {/* 큰 카드 2x3 그리드 */}
                <View style={[styles.grid, { gap: 12 * spacingScale }]}>
                    {LAUNCHER_ITEMS.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            onPress={() => handleCardPress(item)}
                            style={[styles.card, {
                                backgroundColor: isDarkMode ? COLORS.gray[800] : item.bgColor,
                                borderColor: isDarkMode ? COLORS.gray[700] : "rgba(255,255,255,0.7)",
                                padding: 20 * spacingScale,
                                minHeight: 140 * spacingScale,
                                gap: 10 * spacingScale,
                            }]}
                            activeOpacity={0.85}
                        >
                            <View style={[styles.cardIconWrap, {
                                width: 56 * spacingScale,
                                height: 56 * spacingScale,
                                backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.7)",
                            }]}>
                                <Ionicons name={item.icon} size={32 * iconScale} color={item.iconColor} />
                            </View>
                            <View style={{ alignItems: "center" }}>
                                <Text style={[styles.cardLabel, {
                                    color: cardLabelColor,
                                    fontSize: 17 * fontScale,
                                }]} numberOfLines={1}>
                                    {item.label}
                                </Text>
                                <Text style={[styles.cardDesc, {
                                    color: cardDescColor,
                                    fontSize: 12 * fontScale,
                                    marginTop: 2 * spacingScale,
                                }]} numberOfLines={1}>
                                    {item.description}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* 일반모드 전환 버튼 (웹 매칭) */}
                <TouchableOpacity
                    onPress={toggleSimpleMode}
                    style={[styles.exitBtn, { marginTop: 32 * spacingScale, paddingVertical: 12 * spacingScale }]}
                    activeOpacity={0.6}
                >
                    <Text style={{
                        fontSize: 13 * fontScale,
                        color: isDarkMode ? COLORS.gray[500] : COLORS.gray[400],
                        textDecorationLine: "underline",
                    }}>
                        일반모드로 전환
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { paddingBottom: 40 },
    heroCard: {
        borderRadius: 24,
        overflow: "hidden",
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
    },
    heroInner: {
        flexDirection: "row",
        alignItems: "center",
    },
    heroTitle: { fontWeight: "800", letterSpacing: -0.3 },
    heroSub: { fontWeight: "500" },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
    },
    card: {
        width: "48%",
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
    },
    cardIconWrap: {
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    cardLabel: { fontWeight: "700" },
    cardDesc: { fontWeight: "500" },
    exitBtn: {
        alignItems: "center",
    },
});
