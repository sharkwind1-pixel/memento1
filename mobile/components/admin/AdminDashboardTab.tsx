/**
 * AdminDashboardTab — 통계 + 7일 추이 (웹 useAdminData.loadStats + AdminDashboardTab 이식)
 *
 * - 11개 통계 카드 (Promise.all로 병렬 supabase count 쿼리)
 * - 7일 추이 막대 그래프 (가입자/채팅/접속자) — 직접 그림 (chart-kit 미사용)
 */

import { useEffect, useState, useCallback } from "react";
import {
    View, Text, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, StyleSheet, Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { useDarkMode } from "@/contexts/ThemeContext";

const { width: SCREEN_W } = Dimensions.get("window");
const CHART_W = SCREEN_W - 64;

interface Stats {
    totalUsers: number;
    totalPets: number;
    totalPosts: number;
    totalChats: number;
    todayUsers: number;
    todayChats: number;
    premiumUsers: number;
    bannedUsers: number;
    todayActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
}

interface ChartDay {
    date: string;
    가입자: number;
    채팅: number;
    접속자: number;
}

export default function AdminDashboardTab() {
    const { isDarkMode } = useDarkMode();
    const [stats, setStats] = useState<Stats | null>(null);
    const [chart, setChart] = useState<ChartDay[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [chartMetric, setChartMetric] = useState<"가입자" | "채팅" | "접속자">("가입자");

    const load = useCallback(async () => {
        try {
            const today = new Date().toISOString().split("T")[0];
            const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
            const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

            const [
                { count: totalUsers },
                { count: totalPets },
                { count: totalPosts },
                { count: totalChats },
                { count: todayUsers },
                { count: todayChats },
                { count: premiumUsers },
                { count: bannedUsers },
                { count: todayActiveUsers },
                { count: weeklyActiveUsers },
                { count: monthlyActiveUsers },
            ] = await Promise.all([
                supabase.from("profiles").select("*", { count: "exact", head: true }),
                supabase.from("pets").select("*", { count: "exact", head: true }),
                supabase.from("community_posts").select("*", { count: "exact", head: true }),
                supabase.from("chat_messages").select("*", { count: "exact", head: true }),
                supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", today),
                supabase.from("chat_messages").select("*", { count: "exact", head: true }).gte("created_at", today),
                supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_premium", true),
                supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_banned", true),
                supabase.from("profiles").select("*", { count: "exact", head: true }).gte("last_seen_at", today),
                supabase.from("profiles").select("*", { count: "exact", head: true }).gte("last_seen_at", weekAgo),
                supabase.from("profiles").select("*", { count: "exact", head: true }).gte("last_seen_at", monthAgo),
            ]);

            setStats({
                totalUsers: totalUsers ?? 0,
                totalPets: totalPets ?? 0,
                totalPosts: totalPosts ?? 0,
                totalChats: totalChats ?? 0,
                todayUsers: todayUsers ?? 0,
                todayChats: todayChats ?? 0,
                premiumUsers: premiumUsers ?? 0,
                bannedUsers: bannedUsers ?? 0,
                todayActiveUsers: todayActiveUsers ?? 0,
                weeklyActiveUsers: weeklyActiveUsers ?? 0,
                monthlyActiveUsers: monthlyActiveUsers ?? 0,
            });

            // 7일 추이 (21개 쿼리 병렬)
            const dateInfos = Array.from({ length: 7 }, (_, idx) => {
                const i = 6 - idx;
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split("T")[0];
                const nextDateStr = new Date(date.getTime() + 86400000).toISOString().split("T")[0];
                return { dateStr, nextDateStr, displayDate: `${date.getMonth() + 1}/${date.getDate()}` };
            });

            const queries = dateInfos.flatMap(({ dateStr, nextDateStr }) => [
                supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", dateStr).lt("created_at", nextDateStr),
                supabase.from("chat_messages").select("*", { count: "exact", head: true }).gte("created_at", dateStr).lt("created_at", nextDateStr),
                supabase.from("profiles").select("*", { count: "exact", head: true }).gte("last_seen_at", dateStr).lt("last_seen_at", nextDateStr),
            ]);
            const chartResults = await Promise.all(queries);
            const days: ChartDay[] = dateInfos.map((info, idx) => ({
                date: info.displayDate,
                가입자: chartResults[idx * 3].count ?? 0,
                채팅: chartResults[idx * 3 + 1].count ?? 0,
                접속자: chartResults[idx * 3 + 2].count ?? 0,
            }));
            setChart(days);
        } catch {
            // 무시
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    async function handleRefresh() {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    }

    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.gray[50];
    const cardBg = isDarkMode ? COLORS.gray[900] : COLORS.white;
    const textColor = isDarkMode ? COLORS.white : COLORS.gray[900];
    const labelColor = isDarkMode ? COLORS.gray[400] : COLORS.gray[500];

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: bgColor }]}>
                <ActivityIndicator color={COLORS.memento[500]} />
            </View>
        );
    }
    if (!stats) {
        return (
            <View style={[styles.center, { backgroundColor: bgColor }]}>
                <Text style={{ color: labelColor }}>통계를 불러올 수 없어요</Text>
            </View>
        );
    }

    const chartValues = chart.map((d) => d[chartMetric]);
    const maxVal = Math.max(...chartValues, 1);

    const cards: Array<{ label: string; value: number; sub?: string; icon: React.ComponentProps<typeof Ionicons>["name"]; color: string }> = [
        { label: "전체 유저", value: stats.totalUsers, icon: "people", color: COLORS.memento[500] },
        { label: "오늘 가입", value: stats.todayUsers, icon: "person-add", color: "#10B981" },
        { label: "전체 펫", value: stats.totalPets, icon: "paw", color: COLORS.memorial[500] },
        { label: "전체 게시글", value: stats.totalPosts, icon: "document-text", color: "#3B82F6" },
        { label: "전체 채팅", value: stats.totalChats, icon: "chatbubbles", color: "#8B5CF6" },
        { label: "오늘 채팅", value: stats.todayChats, icon: "chatbubble", color: "#06B6D4" },
        { label: "프리미엄", value: stats.premiumUsers, icon: "star", color: "#F59E0B" },
        { label: "차단된 유저", value: stats.bannedUsers, icon: "ban", color: "#EF4444" },
        { label: "DAU (오늘)", value: stats.todayActiveUsers, icon: "pulse", color: "#10B981", sub: "Daily Active" },
        { label: "WAU (7일)", value: stats.weeklyActiveUsers, icon: "trending-up", color: "#3B82F6", sub: "Weekly Active" },
        { label: "MAU (30일)", value: stats.monthlyActiveUsers, icon: "stats-chart", color: "#8B5CF6", sub: "Monthly Active" },
    ];

    return (
        <ScrollView
            style={[styles.flex1, { backgroundColor: bgColor }]}
            contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 32 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.memento[500]} />}
        >
            {/* 통계 카드 그리드 */}
            <View style={styles.grid}>
                {cards.map((c) => (
                    <View key={c.label} style={[styles.statCard, { backgroundColor: cardBg }]}>
                        <View style={[styles.statIcon, { backgroundColor: c.color + "20" }]}>
                            <Ionicons name={c.icon} size={16} color={c.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.statLabel, { color: labelColor }]} numberOfLines={1}>
                                {c.label}
                            </Text>
                            <Text style={[styles.statValue, { color: textColor }]}>
                                {c.value.toLocaleString()}
                            </Text>
                            {c.sub && (
                                <Text style={[styles.statSub, { color: labelColor }]}>{c.sub}</Text>
                            )}
                        </View>
                    </View>
                ))}
            </View>

            {/* 7일 추이 막대 차트 */}
            <View style={[styles.chartCard, { backgroundColor: cardBg }]}>
                <View style={styles.chartHeader}>
                    <Text style={[styles.chartTitle, { color: textColor }]}>최근 7일 추이</Text>
                    <View style={styles.metricRow}>
                        {(["가입자", "채팅", "접속자"] as const).map((m) => {
                            const active = chartMetric === m;
                            return (
                                <TouchableOpacity
                                    key={m}
                                    onPress={() => setChartMetric(m)}
                                    style={[
                                        styles.metricChip,
                                        active && { backgroundColor: "#8B5CF6" },
                                    ]}
                                >
                                    <Text style={{
                                        fontSize: 10, fontWeight: "700",
                                        color: active ? "#fff" : labelColor,
                                    }}>{m}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                <View style={styles.chartBody}>
                    {chart.map((d, idx) => {
                        const v = d[chartMetric];
                        const heightPx = Math.max(4, (v / maxVal) * 120);
                        return (
                            <View key={idx} style={styles.barCol}>
                                <Text style={[styles.barValue, { color: labelColor }]}>{v.toLocaleString()}</Text>
                                <View style={[styles.bar, { height: heightPx, backgroundColor: "#8B5CF6" }]} />
                                <Text style={[styles.barDate, { color: labelColor }]}>{d.date}</Text>
                            </View>
                        );
                    })}
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    statCard: {
        width: (CHART_W - 16) / 2,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        padding: 10,
        borderRadius: 10,
        borderWidth: 1, borderColor: "rgba(0,0,0,0.06)",
    },
    statIcon: {
        width: 32, height: 32, borderRadius: 9999,
        alignItems: "center", justifyContent: "center",
    },
    statLabel: { fontSize: 10, fontWeight: "600" },
    statValue: { fontSize: 16, fontWeight: "800", marginTop: 2 },
    statSub: { fontSize: 9, marginTop: 1 },

    chartCard: {
        padding: 16, borderRadius: 14,
        borderWidth: 1, borderColor: "rgba(0,0,0,0.06)",
    },
    chartHeader: {
        flexDirection: "row", justifyContent: "space-between", alignItems: "center",
        marginBottom: 14,
    },
    chartTitle: { fontSize: 14, fontWeight: "700" },
    metricRow: { flexDirection: "row", gap: 4 },
    metricChip: {
        paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: 9999,
        backgroundColor: "rgba(0,0,0,0.04)",
    },
    chartBody: {
        flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
        height: 170, paddingHorizontal: 4,
    },
    barCol: { alignItems: "center", flex: 1, gap: 4 },
    barValue: { fontSize: 9, fontWeight: "600" },
    bar: { width: 18, borderRadius: 4, minHeight: 4 },
    barDate: { fontSize: 9, marginTop: 2 },
});
