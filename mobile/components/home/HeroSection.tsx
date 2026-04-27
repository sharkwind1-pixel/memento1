/**
 * HeroSection — 홈 화면 상단 히어로 (웹 src/components/features/home/HeroSection.tsx 매칭)
 *
 * 웹 구조:
 * - rounded-3xl 카드 + 그라데이션 배경 (일상: #CBEBF0→#E0F3F6→#FFF8F6 / 추모: #091A2E→#1A2A3E→#3D2A1A)
 * - 배경 장식 blur 원 2개 (top-right, bottom-left)
 * - 정사각 일러스트 (아이+강아지 / 추모는 별빛 강아지)
 * - 카피: "특별한 매일을 함께"
 * - 2 CTA: primary 그라데이션, ghost arrow
 */

import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Session } from "@supabase/supabase-js";
import { COLORS } from "@/lib/theme";

interface Props {
    session: Session | null;
    isMemorialMode: boolean;
}

export default function HeroSection({ session, isMemorialMode }: Props) {
    const router = useRouter();

    const gradientColors = isMemorialMode
        ? (["#091A2E", "#1A2A3E", "#3D2A1A"] as const)
        : (["#CBEBF0", "#E0F3F6", "#FFF8F6"] as const);

    const ctaGradient: [string, string] = isMemorialMode
        ? [COLORS.memorial[500], "#FB923C"]
        : [COLORS.memento[500], COLORS.memento[400]];

    const titleColor = isMemorialMode ? "#FEF3C7" : COLORS.gray[800];
    const subtitleColor = isMemorialMode ? "rgba(254,243,199,0.8)" : COLORS.gray[600];
    const ghostTextColor = isMemorialMode ? "rgba(254,243,199,0.85)" : COLORS.gray[600];

    const decoTopColor = isMemorialMode ? "rgba(245,158,11,0.18)" : "rgba(186,230,253,0.45)";
    const decoBottomColor = isMemorialMode ? "rgba(251,146,60,0.12)" : "rgba(254,205,211,0.4)";

    const heroImage = isMemorialMode
        ? require("@/assets/hero-illustration-memorial.png")
        : require("@/assets/hero-illustration.png");

    function handleCta() {
        if (!session) router.push("/(auth)/login");
        else router.push("/(tabs)/ai-chat");
    }

    return (
        <View style={styles.section}>
            <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.card}
            >
                {/* 배경 장식 원 */}
                <View style={[styles.decoCircleTop, { backgroundColor: decoTopColor }]} />
                <View style={[styles.decoCircleBottom, { backgroundColor: decoBottomColor }]} />

                <View style={styles.content}>
                    {/* 일러스트 */}
                    <View style={styles.illustrationWrap}>
                        <Image source={heroImage} style={styles.illustration} resizeMode="cover" />
                    </View>

                    {/* 카피 */}
                    <Text style={[styles.title, { color: titleColor }]}>
                        특별한 매일을 함께
                    </Text>
                    <Text style={[styles.subtitle, { color: subtitleColor }]}>
                        반려동물과의 소중한 순간을 기록하고,{"\n"}따뜻한 추억으로 간직하세요
                    </Text>

                    {/* CTA */}
                    <View style={styles.ctaRow}>
                        <TouchableOpacity onPress={handleCta} activeOpacity={0.88} style={styles.ctaPrimaryWrap}>
                            <LinearGradient
                                colors={ctaGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.ctaPrimary}
                            >
                                <Text style={styles.ctaPrimaryText}>
                                    {session ? "지금 만나러 가기" : "시작하기"}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => router.push("/(tabs)/community")}
                            activeOpacity={0.7}
                            style={styles.ctaGhost}
                        >
                            <Text style={[styles.ctaGhostText, { color: ghostTextColor }]}>둘러보기</Text>
                            <Ionicons name="arrow-forward" size={16} color={ghostTextColor} style={{ marginLeft: 4 }} />
                        </TouchableOpacity>
                    </View>
                </View>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    card: {
        borderRadius: 24,
        overflow: "hidden",
        position: "relative",
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
    },
    decoCircleTop: {
        position: "absolute",
        top: -40,
        right: -40,
        width: 160,
        height: 160,
        borderRadius: 80,
    },
    decoCircleBottom: {
        position: "absolute",
        bottom: -40,
        left: -40,
        width: 128,
        height: 128,
        borderRadius: 64,
    },
    content: {
        padding: 24,
        alignItems: "center",
    },
    illustrationWrap: {
        width: 240,
        height: 240,
        borderRadius: 24,
        overflow: "hidden",
        marginBottom: 20,
        elevation: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
    },
    illustration: { width: "100%", height: "100%" },
    title: {
        fontSize: 26,
        fontWeight: "800",
        textAlign: "center",
        letterSpacing: -0.4,
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 14,
        lineHeight: 22,
        textAlign: "center",
        marginBottom: 20,
    },
    ctaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        justifyContent: "center",
    },
    ctaPrimaryWrap: {
        borderRadius: 16,
        elevation: 4,
        shadowColor: COLORS.memento[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    ctaPrimary: {
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 16,
        minWidth: 140,
        alignItems: "center",
    },
    ctaPrimaryText: {
        color: COLORS.white,
        fontSize: 15,
        fontWeight: "700",
    },
    ctaGhost: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 18,
        paddingVertical: 13,
        borderRadius: 16,
    },
    ctaGhostText: {
        fontSize: 15,
        fontWeight: "600",
    },
});
