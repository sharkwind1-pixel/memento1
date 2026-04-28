/**
 * QuestCard — 온보딩 미션 진행 카드 (전체 단계 펼치기 포함)
 *
 * 웹 useQuests + 진행 카드 매칭. progress 응답을 기반으로 클라이언트가 계산.
 * - 카드: 진행률 + 현재 미션 + 액션 CTA
 * - 펼치기: 전체 단계 리스트 + 완료 체크 (웹 패턴)
 */

import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { API_BASE_URL } from "@/config/constants";
import { COLORS } from "@/lib/theme";
import { computeQuestState, type QuestDef } from "@/data/quests";

const HIDE_KEY = "memento-quest-card-hidden";

export default function QuestCard() {
    const router = useRouter();
    const { session } = useAuth();
    const { isMemorialMode } = usePet();
    const [progress, setProgress] = useState<Record<string, string> | null>(null);
    const [hidden, setHidden] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem(HIDE_KEY).then((v) => setHidden(v === "true"));
    }, []);

    useEffect(() => {
        if (!session) {
            setLoading(false);
            return;
        }
        (async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/quests`, {
                    headers: { "Authorization": `Bearer ${session.access_token}` },
                });
                if (!res.ok) return;
                const data = await res.json();
                setProgress((data?.progress as Record<string, string>) ?? {});
            } catch {
                // ignore
            } finally {
                setLoading(false);
            }
        })();
    }, [session]);

    if (loading || hidden === null) return null;
    if (hidden || progress === null) return null;

    const state = computeQuestState(progress, isMemorialMode);
    if (state.isAllDone || !state.currentQuest) return null;

    const percent = Math.round((state.completedCount / Math.max(state.totalCount, 1)) * 100);
    const accent = isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500];
    const bgGradStart = isMemorialMode ? COLORS.memorial[50] : COLORS.memento[50];
    const titleText = isMemorialMode ? "함께 걸어요" : "오늘의 미션";
    const subtitleText = isMemorialMode
        ? `천천히 한 걸음씩 (${state.completedCount} / ${state.totalCount})`
        : `${state.totalCount}단계 중 ${state.completedCount}단계 완료`;

    function handleHide() {
        AsyncStorage.setItem(HIDE_KEY, "true");
        setHidden(true);
    }

    function navigateTab(targetTab: string) {
        if (targetTab === "record") router.push("/(tabs)/record");
        else if (targetTab === "ai-chat") router.push("/(tabs)/ai-chat");
        else if (targetTab === "community") router.push("/(tabs)/community");
        else if (targetTab === "magazine") router.push("/(tabs)/magazine");
    }

    function renderQuestItem(q: QuestDef, idx: number) {
        const done = !!progress?.[q.id];
        const isCurrent = state.currentQuest?.id === q.id;
        return (
            <TouchableOpacity
                key={q.id}
                onPress={() => navigateTab(q.targetTab)}
                activeOpacity={0.85}
                style={[
                    styles.stepRow,
                    isCurrent && { backgroundColor: accent + "12" },
                ]}
            >
                <View style={[
                    styles.stepDot,
                    done && { backgroundColor: accent, borderColor: accent },
                    !done && isCurrent && { borderColor: accent },
                ]}>
                    {done
                        ? <Ionicons name="checkmark" size={12} color="#fff" />
                        : <Text style={[styles.stepDotText, isCurrent && { color: accent }]}>{idx + 1}</Text>
                    }
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[
                        styles.stepTitle,
                        done && { color: COLORS.gray[400], textDecorationLine: "line-through" },
                    ]} numberOfLines={1}>
                        {q.title}
                    </Text>
                    {!done && (
                        <Text style={styles.stepDesc} numberOfLines={1}>{q.description}</Text>
                    )}
                </View>
                {q.bonusPoints > 0 && !done && (
                    <Text style={[styles.stepBonus, { color: accent }]}>+{q.bonusPoints}P</Text>
                )}
            </TouchableOpacity>
        );
    }

    return (
        <View style={[styles.card, { backgroundColor: bgGradStart, borderColor: accent + "40" }]}>
            <View style={styles.header}>
                <View style={[styles.iconWrap, { backgroundColor: accent + "20" }]}>
                    <Ionicons name="sparkles" size={18} color={accent} />
                </View>
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={styles.title}>{titleText}</Text>
                        <Text style={[styles.percent, { color: accent }]}>{percent}%</Text>
                    </View>
                    <Text style={styles.subtitle}>{subtitleText}</Text>
                </View>
                <TouchableOpacity onPress={handleHide} hitSlop={8}>
                    <Ionicons name="close" size={16} color={COLORS.gray[400]} />
                </TouchableOpacity>
            </View>

            <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: accent }]} />
            </View>

            <TouchableOpacity
                onPress={() => navigateTab(state.currentQuest!.targetTab)}
                activeOpacity={0.85}
                style={styles.action}
            >
                <View style={{ flex: 1 }}>
                    <Text style={styles.questTitle} numberOfLines={1}>{state.currentQuest.title}</Text>
                    {state.currentQuest.description ? (
                        <Text style={styles.questDesc} numberOfLines={1}>{state.currentQuest.description}</Text>
                    ) : null}
                </View>
                <View style={[styles.actionBtn, { backgroundColor: accent }]}>
                    <Text style={styles.actionLabel}>{state.currentQuest.actionLabel}</Text>
                    <Ionicons name="arrow-forward" size={14} color="#fff" />
                </View>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => setExpanded((v) => !v)}
                activeOpacity={0.85}
                style={styles.expandBtn}
            >
                <Text style={[styles.expandText, { color: accent }]}>
                    {expanded ? "접기" : "전체 단계 보기"}
                </Text>
                <Ionicons
                    name={expanded ? "chevron-up" : "chevron-down"}
                    size={14}
                    color={accent}
                />
            </TouchableOpacity>

            {expanded && (
                <View style={styles.stepsList}>
                    {state.quests.map(renderQuestItem)}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 16,
        borderWidth: 1,
        overflow: "hidden",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
    },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    title: { fontSize: 14, fontWeight: "700", color: COLORS.gray[900] },
    percent: { fontSize: 12, fontWeight: "600" },
    subtitle: { fontSize: 12, color: COLORS.gray[500], marginTop: 2 },
    progressBg: {
        marginHorizontal: 16,
        marginBottom: 12,
        height: 6,
        backgroundColor: "rgba(255,255,255,0.6)",
        borderRadius: 9999,
        overflow: "hidden",
    },
    progressFill: { height: "100%", borderRadius: 9999 },
    action: {
        marginHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 12,
        borderRadius: 12,
        backgroundColor: "rgba(255,255,255,0.8)",
    },
    questTitle: { fontSize: 14, fontWeight: "600", color: COLORS.gray[900] },
    questDesc: { fontSize: 12, color: COLORS.gray[500], marginTop: 2 },
    actionBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
    },
    actionLabel: { fontSize: 12, color: "#fff", fontWeight: "500" },
    expandBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        paddingVertical: 10,
    },
    expandText: { fontSize: 12, fontWeight: "600" },
    stepsList: {
        marginHorizontal: 16,
        marginBottom: 16,
        gap: 4,
    },
    stepRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 10,
        paddingVertical: 10,
        borderRadius: 10,
    },
    stepDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: COLORS.gray[300],
        alignItems: "center",
        justifyContent: "center",
    },
    stepDotText: { fontSize: 11, fontWeight: "700", color: COLORS.gray[400] },
    stepTitle: { fontSize: 13, fontWeight: "600", color: COLORS.gray[800] },
    stepDesc: { fontSize: 11, color: COLORS.gray[500], marginTop: 1 },
    stepBonus: { fontSize: 11, fontWeight: "700" },
});
