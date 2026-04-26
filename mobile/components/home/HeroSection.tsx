/**
 * HeroSection — 홈 화면 상단 히어로
 *
 * 웹 src/components/features/home/HeroSection.tsx 기반.
 * 그라데이션 배경 + 일러스트 + 메인 카피 + 2개 CTA 버튼.
 */

import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Session } from "@supabase/supabase-js";
import { COLORS, SPACING, RADIUS } from "@/lib/theme";

interface Props {
    session: Session | null;
    isMemorialMode: boolean;
}

export default function HeroSection({ session, isMemorialMode }: Props) {
    const router = useRouter();

    const gradientColors = isMemorialMode
        ? (["#091A2E", "#1A2A3E", "#3D2A1A"] as const)
        : (["#CBEBF0", "#E0F3F6", "#FFF8F6"] as const);

    const titleColor = isMemorialMode ? COLORS.white : COLORS.gray[900];
    const subtitleColor = isMemorialMode ? COLORS.gray[300] : COLORS.gray[600];
    const accentColor = isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500];

    return (
        <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.container}
        >
            <Image
                source={require("@/assets/icon.png")}
                style={styles.illustration}
                resizeMode="contain"
            />

            <Text style={[styles.title, { color: titleColor }]}>
                {isMemorialMode ? "다시 만날 그날까지" : "특별한 매일을 함께"}
            </Text>

            <Text style={[styles.subtitle, { color: subtitleColor }]}>
                {isMemorialMode
                    ? "함께했던 모든 순간을 따뜻하게 간직해요"
                    : "반려동물과의 소중한 순간을\n기록하고 따뜻한 추억으로 간직하세요"}
            </Text>

            <View style={styles.ctaRow}>
                {!session ? (
                    <TouchableOpacity
                        onPress={() => router.push("/(auth)/login")}
                        style={[styles.ctaPrimary, { backgroundColor: accentColor }]}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.ctaPrimaryText}>시작하기</Text>
                    </TouchableOpacity>
                ) : (
                    <>
                        <TouchableOpacity
                            onPress={() => router.push("/(tabs)/ai-chat")}
                            style={[styles.ctaPrimary, { backgroundColor: accentColor }]}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.ctaPrimaryText}>지금 만나러 가기</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => router.push("/(tabs)/community")}
                            style={[styles.ctaGhost, { borderColor: accentColor }]}
                            activeOpacity={0.85}
                        >
                            <Text style={[styles.ctaGhostText, { color: accentColor }]}>
                                둘러보기
                            </Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.xl,
        paddingBottom: SPACING.xl + SPACING.sm,
        alignItems: "center",
        borderBottomLeftRadius: RADIUS.xl,
        borderBottomRightRadius: RADIUS.xl,
    },
    illustration: {
        width: 200,
        height: 200,
        marginBottom: SPACING.md,
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: SPACING.sm,
    },
    subtitle: {
        fontSize: 14,
        lineHeight: 22,
        textAlign: "center",
        marginBottom: SPACING.lg,
    },
    ctaRow: {
        flexDirection: "row",
        gap: SPACING.sm,
        flexWrap: "wrap",
        justifyContent: "center",
    },
    ctaPrimary: {
        paddingHorizontal: SPACING.lg,
        paddingVertical: 14,
        borderRadius: RADIUS.full,
        minWidth: 140,
        alignItems: "center",
    },
    ctaPrimaryText: {
        color: COLORS.white,
        fontSize: 15,
        fontWeight: "600",
    },
    ctaGhost: {
        paddingHorizontal: SPACING.lg,
        paddingVertical: 13,
        borderRadius: RADIUS.full,
        borderWidth: 1.5,
        minWidth: 120,
        alignItems: "center",
        backgroundColor: "transparent",
    },
    ctaGhostText: {
        fontSize: 15,
        fontWeight: "600",
    },
});
