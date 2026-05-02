/**
 * HealingJourneySummary — 추모 모드 기록 탭 상단 위젯
 *
 * GET /api/healing-journey?petId=...
 * 응답: conversationCount, summary.currentGriefStage, milestones[], emotionTrend[], recentPositiveRatio
 *
 * 웹 src/components/features/record/HealingJourneySection.tsx의 모바일 요약 버전.
 * 펫이 추모 모드일 때만 노출.
 */

import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useDarkMode } from "@/contexts/ThemeContext";
import { API_BASE_URL } from "@/config/constants";
import { COLORS } from "@/lib/theme";

interface Milestone {
    id: string;
    title: string;
    achieved: boolean;
    achievedDate?: string;
}

interface HealingData {
    conversationCount: number;
    emotionTrend: Array<{ date: string; dominant: string; category: "positive" | "neutral" | "negative" }>;
    milestones: Milestone[];
    recentPositiveRatio: number;
    summary: {
        totalSessions: number;
        milestonesAchieved: number;
        totalMilestones: number;
        currentGriefStage: string | null;
    };
}

const GRIEF_STAGE_NAMES: Record<string, string> = {
    denial: "부정",
    anger: "분노",
    bargaining: "협상",
    depression: "슬픔",
    acceptance: "수용",
    unknown: "시작",
};

const GRIEF_STAGE_DESCRIPTIONS: Record<string, string> = {
    denial: "이별을 받아들이기 어려운 단계",
    anger: "상실에 대한 감정을 표출하는 단계",
    bargaining: "'만약에...'라는 생각이 드는 단계",
    depression: "깊은 슬픔을 느끼는 단계",
    acceptance: "이별을 받아들이고 추억을 간직하는 단계",
    unknown: "아직 대화를 시작하지 않았어요",
};

interface Props {
    petId: string;
    petName: string;
    accentColor: string;
}

export default function HealingJourneySummary({ petId, petName, accentColor }: Props) {
    const router = useRouter();
    const { session } = useAuth();
    const { isDarkMode } = useDarkMode();
    const [data, setData] = useState<HealingData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!session || !petId) { setLoading(false); return; }
        try {
            const res = await fetch(`${API_BASE_URL}/api/healing-journey?petId=${encodeURIComponent(petId)}`, {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (res.ok) {
                const json = await res.json();
                setData(json);
                setError(null);
            } else {
                setError("지금은 불러올 수 없어요");
            }
        } catch {
            setError("인터넷 연결을 확인해주세요");
        } finally {
            setLoading(false);
        }
    }, [session, petId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const cardBg = isDarkMode ? COLORS.gray[900] : "#FFF7ED";
    const titleColor = isDarkMode ? COLORS.memorial[100] : COLORS.memorial[700];
    const subColor = isDarkMode ? COLORS.memorial[400] : COLORS.memorial[600];

    if (loading) {
        return (
            <View style={[styles.card, { backgroundColor: cardBg }]}>
                <ActivityIndicator color={accentColor} />
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.card, { backgroundColor: cardBg }]}>
                <Text style={[styles.sub, { color: subColor, textAlign: "center" }]}>{error}</Text>
            </View>
        );
    }

    // 대화 0회 — 안내 카드
    if (!data || data.conversationCount === 0) {
        return (
            <TouchableOpacity
                onPress={() => router.push("/(tabs)/ai-chat")}
                activeOpacity={0.85}
                style={[styles.card, { backgroundColor: cardBg }]}
            >
                <View style={styles.headerRow}>
                    <Ionicons name="heart" size={18} color={accentColor} />
                    <Text style={[styles.title, { color: titleColor }]}>{petName}의 치유의 여정</Text>
                </View>
                <Text style={[styles.sub, { color: subColor, marginTop: 6 }]}>
                    AI 펫톡에서 {petName}와(과) 대화를 시작하면{"\n"}치유의 여정을 기록해 드릴게요
                </Text>
                <View style={styles.ctaRow}>
                    <Text style={[styles.ctaText, { color: accentColor }]}>대화 시작하기</Text>
                    <Ionicons name="arrow-forward" size={14} color={accentColor} />
                </View>
            </TouchableOpacity>
        );
    }

    const currentStage = data.summary.currentGriefStage || "unknown";
    const recentTrend = data.emotionTrend.slice(-5);

    return (
        <TouchableOpacity
            onPress={() => router.push("/(tabs)/ai-chat")}
            activeOpacity={0.85}
            style={[styles.card, { backgroundColor: cardBg }]}
        >
            {/* 헤더 */}
            <View style={styles.headerRow}>
                <Ionicons name="heart" size={18} color={accentColor} />
                <Text style={[styles.title, { color: titleColor, flex: 1 }]}>
                    {petName}의 치유의 여정
                </Text>
                <Text style={[styles.headerCount, { color: subColor }]}>
                    {data.conversationCount}번의 대화
                </Text>
            </View>

            {/* 현재 단계 */}
            <View style={styles.stageBox}>
                <LinearGradient
                    colors={[COLORS.memorial[400], "#F97316"]}
                    style={styles.stageIcon}
                >
                    <Ionicons name="trending-up" size={16} color="#fff" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.stageLabel, { color: subColor }]}>현재 단계</Text>
                    <Text style={[styles.stageName, { color: titleColor }]}>
                        {GRIEF_STAGE_NAMES[currentStage]}
                    </Text>
                </View>
            </View>
            <Text style={[styles.stageDesc, { color: subColor }]}>
                {GRIEF_STAGE_DESCRIPTIONS[currentStage]}
            </Text>

            {/* 감정 흐름 */}
            {recentTrend.length > 0 && (
                <View style={{ marginTop: 12 }}>
                    <Text style={[styles.sectionLabel, { color: subColor }]}>최근 감정 흐름</Text>
                    <View style={styles.emotionRow}>
                        {recentTrend.map((item, idx) => {
                            const bg = item.category === "positive"
                                ? "#DCFCE7"
                                : item.category === "negative"
                                    ? "#FEE2E2"
                                    : "#F3F4F6";
                            const icon = item.category === "positive"
                                ? "happy-outline"
                                : item.category === "negative"
                                    ? "sad-outline"
                                    : "remove-outline";
                            const color = item.category === "positive"
                                ? "#16A34A"
                                : item.category === "negative"
                                    ? "#DC2626"
                                    : "#6B7280";
                            return (
                                <View key={idx} style={[styles.emotionPill, { backgroundColor: bg }]}>
                                    <Ionicons name={icon} size={14} color={color} />
                                </View>
                            );
                        })}
                    </View>
                    {data.recentPositiveRatio > 0.4 && (
                        <View style={styles.positiveHint}>
                            <Ionicons name="sparkles-outline" size={12} color="#16A34A" />
                            <Text style={styles.positiveHintText}>따뜻한 감정들이 찾아오고 있어요</Text>
                        </View>
                    )}
                </View>
            )}

            {/* 마일스톤 요약 */}
            <View style={styles.milestoneRow}>
                <Ionicons name="ribbon-outline" size={14} color={accentColor} />
                <Text style={[styles.milestoneText, { color: subColor }]}>
                    마일스톤 {data.summary.milestonesAchieved}/{data.summary.totalMilestones}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        marginBottom: 12,
        padding: 14,
        borderRadius: 14,
    },
    headerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    title: { fontSize: 14, fontWeight: "700" },
    headerCount: { fontSize: 11 },
    sub: { fontSize: 12, lineHeight: 18 },
    ctaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 12,
        alignSelf: "flex-start",
    },
    ctaText: { fontSize: 12, fontWeight: "700" },
    stageBox: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginTop: 10,
    },
    stageIcon: {
        width: 36, height: 36, borderRadius: 18,
        alignItems: "center", justifyContent: "center",
    },
    stageLabel: { fontSize: 10 },
    stageName: { fontSize: 14, fontWeight: "700" },
    stageDesc: { fontSize: 12, marginTop: 6, lineHeight: 18 },
    sectionLabel: { fontSize: 10, marginBottom: 6 },
    emotionRow: { flexDirection: "row", gap: 6 },
    emotionPill: {
        flex: 1, height: 28,
        borderRadius: 8,
        alignItems: "center", justifyContent: "center",
    },
    positiveHint: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 6,
    },
    positiveHintText: { fontSize: 10, color: "#16A34A" },
    milestoneRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 12,
    },
    milestoneText: { fontSize: 11 },
});
