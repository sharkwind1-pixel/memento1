/**
 * QuestCard — 온보딩 미션 진행 카드 (단순화)
 *
 * 웹은 useQuests hook + 진행률 + 펼치기. 모바일은 우선 progress fetch만 + 카드 1개.
 * 모든 미션 완료 시 또는 hide 시 사라짐. AsyncStorage에 hide 상태 저장.
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

const HIDE_KEY = "memento-quest-card-hidden";

interface QuestProgress {
    currentTitle: string;
    currentDescription: string;
    actionLabel: string;
    targetTab: string;
    completedCount: number;
    totalCount: number;
    isAllDone: boolean;
}

export default function QuestCard() {
    const router = useRouter();
    const { session } = useAuth();
    const { isMemorialMode } = usePet();
    const [progress, setProgress] = useState<QuestProgress | null>(null);
    const [hidden, setHidden] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);

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
                const current = data?.currentQuest ?? {};
                setProgress({
                    currentTitle: typeof current.title === "string" ? current.title : "",
                    currentDescription: typeof current.description === "string" ? current.description : "",
                    actionLabel: typeof current.actionLabel === "string" ? current.actionLabel : "시작",
                    targetTab: typeof current.targetTab === "string" ? current.targetTab : "",
                    completedCount: typeof data?.completedCount === "number" ? data.completedCount : 0,
                    totalCount: typeof data?.totalCount === "number" ? data.totalCount : 5,
                    isAllDone: data?.isAllDone === true,
                });
            } catch {
                // ignore
            } finally {
                setLoading(false);
            }
        })();
    }, [session]);

    if (loading || hidden === null) return null;
    if (hidden || !progress || progress.isAllDone || !progress.currentTitle) return null;

    const percent = Math.round((progress.completedCount / Math.max(progress.totalCount, 1)) * 100);
    const accent = isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500];
    const bgGradStart = isMemorialMode ? COLORS.memorial[50] : COLORS.memento[50];
    const titleText = isMemorialMode ? "함께 걸어요" : "오늘의 미션";
    const subtitleText = isMemorialMode
        ? `천천히 한 걸음씩 (${progress.completedCount} / ${progress.totalCount})`
        : `${progress.totalCount}단계 중 ${progress.completedCount}단계 완료`;

    function handleHide() {
        AsyncStorage.setItem(HIDE_KEY, "true");
        setHidden(true);
    }

    function handleAction() {
        if (progress?.targetTab === "record") router.push("/(tabs)/record");
        else if (progress?.targetTab === "ai-chat") router.push("/(tabs)/ai-chat");
        else if (progress?.targetTab === "community") router.push("/(tabs)/community");
        else if (progress?.targetTab === "magazine") router.push("/(tabs)/magazine");
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

            <TouchableOpacity onPress={handleAction} activeOpacity={0.85} style={styles.action}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.questTitle} numberOfLines={1}>{progress.currentTitle}</Text>
                    {progress.currentDescription ? (
                        <Text style={styles.questDesc} numberOfLines={1}>{progress.currentDescription}</Text>
                    ) : null}
                </View>
                <View style={[styles.actionBtn, { backgroundColor: accent }]}>
                    <Text style={styles.actionLabel}>{progress.actionLabel}</Text>
                    <Ionicons name="arrow-forward" size={14} color="#fff" />
                </View>
            </TouchableOpacity>
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
        marginBottom: 16,
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
});
