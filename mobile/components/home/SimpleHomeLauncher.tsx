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
    /** 라이트모드 아이콘 색 (웹 text-*-600) */
    iconColor: string;
    /** 다크모드 아이콘 색 (웹 dark:text-*-400 — 밝은 톤) */
    iconColorDark: string;
    /** 라이트모드 카드 배경 (웹 bg-*-200/50) */
    bgColor: string;
    /** 다크모드 카드 배경 (웹 dark:bg-*-900/20 — alpha 18% 톤) */
    bgColorDark: string;
}

const LAUNCHER_ITEMS: LauncherItem[] = [
    {
        id: "record",
        label: "내 반려동물",
        description: "사진, 일기, 기록",
        icon: "camera",
        route: "/(tabs)/record",
        iconColor: COLORS.memento[600],   // #0891B2
        iconColorDark: COLORS.memento[400], // #38BDF8
        bgColor: COLORS.memento[200],     // #BAE6FD
        bgColorDark: "rgba(8,145,178,0.18)",
    },
    {
        id: "ai-chat",
        label: "AI와 대화",
        description: "AI 펫톡 상담",
        icon: "chatbubble-ellipses",
        route: "/(tabs)/ai-chat",
        iconColor: "#059669",              // emerald-600
        iconColorDark: "#34D399",          // emerald-400
        bgColor: "#ECFDF5",                // emerald-50
        bgColorDark: "rgba(5,150,105,0.18)",
    },
    {
        id: "community",
        label: "커뮤니티",
        description: "자유게시판, 소통",
        icon: "people",
        route: "/(tabs)/community",
        iconColor: COLORS.memento[600],
        iconColorDark: COLORS.memento[400],
        bgColor: COLORS.memento[200],
        bgColorDark: "rgba(8,145,178,0.18)",
    },
    {
        id: "magazine",
        label: "펫매거진",
        description: "반려동물 정보",
        icon: "book",
        route: "/(tabs)/magazine",
        iconColor: "#9333EA",              // purple-600
        iconColorDark: "#C084FC",          // purple-400
        bgColor: "#FAF5FF",                // purple-50
        bgColorDark: "rgba(147,51,234,0.18)",
    },
    {
        id: "minihompy",
        label: "내 미니홈피",
        description: "나만의 공간",
        icon: "home",
        route: "/(tabs)/minihompy",
        iconColor: COLORS.memento[600],
        iconColorDark: COLORS.memento[400],
        bgColor: COLORS.memento[50],
        bgColorDark: "rgba(8,145,178,0.10)",
    },
    {
        id: "adoption",
        label: "입양정보",
        description: "유기동물 입양",
        icon: "heart",
        route: "/adoption",
        iconColor: "#E11D48",              // rose-600
        iconColorDark: "#FB7185",          // rose-400
        bgColor: "#FFF1F2",                // rose-50
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
                {/* 히어로 배너 — 웹 매칭: 일상은 to-br(대각), 추모는 to-b(수직) */}
                <LinearGradient
                    colors={heroGradient}
                    start={{ x: 0, y: 0 }}
                    end={isMemorialMode ? { x: 0, y: 1 } : { x: 1, y: 1 }}
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

                {/* 큰 카드 2x3 그리드 — 2개씩 row 분할 (RN flexWrap+퍼센트 폭 호환 이슈 회피) */}
                {[0, 2, 4].map((startIdx) => (
                    <View
                        key={`row-${startIdx}`}
                        style={{
                            flexDirection: "row",
                            gap: 12 * spacingScale,
                            marginBottom: 12 * spacingScale,
                        }}
                    >
                        {LAUNCHER_ITEMS.slice(startIdx, startIdx + 2).map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                onPress={() => handleCardPress(item)}
                                style={[styles.card, {
                                    flex: 1,
                                    // 웹 매칭: 다크모드는 카드별 색의 900/20 톤 (단색 gray 아님)
                                    backgroundColor: isDarkMode ? item.bgColorDark : item.bgColor,
                                    borderColor: isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.6)",
                                    padding: 20 * spacingScale,
                                    minHeight: 140 * spacingScale,
                                    gap: 10 * spacingScale,
                                }]}
                                activeOpacity={0.85}
                            >
                                <View style={[styles.cardIconWrap, {
                                    width: 56 * spacingScale,
                                    height: 56 * spacingScale,
                                    backgroundColor: isDarkMode ? "rgba(31,41,55,0.6)" : "rgba(255,255,255,0.7)",
                                }]}>
                                    <Ionicons name={item.icon} size={32 * iconScale} color={isDarkMode ? item.iconColorDark : item.iconColor} />
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
                ))}

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
    card: {
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
