/**
 * AdminReportsTab — 신고 관리 (웹 src/components/admin/tabs/AdminReportsTab.tsx 이식)
 *
 * - GET /api/admin/reports → ReportRow[]
 * - PATCH /api/admin/reports { reportId, status, adminNotes } → 상태 변경
 * - 상태 필터: pending / reviewing / resolved / rejected
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import {
    View, Text, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl, StyleSheet, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/theme";
import { API_BASE_URL } from "@/config/constants";
import { supabase } from "@/lib/supabase";
import { useDarkMode } from "@/contexts/ThemeContext";
import {
    type ReportRow, type ReportStatus,
    REPORT_REASON_LABELS, REPORT_TARGET_LABELS,
} from "@/types";

interface Props {
    accessToken: string;
}

const STATUS_LABELS: Record<ReportStatus | "all", string> = {
    all: "전체",
    pending: "대기",
    reviewing: "검토",
    resolved: "완료",
    rejected: "반려",
};

const STATUS_COLORS: Record<ReportStatus, string> = {
    pending: "#F59E0B",
    reviewing: "#3B82F6",
    resolved: "#10B981",
    rejected: "#6B7280",
};

export default function AdminReportsTab({ accessToken }: Props) {
    const { isDarkMode } = useDarkMode();
    const [reports, setReports] = useState<ReportRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<ReportStatus | "all">("pending");

    const load = useCallback(async () => {
        try {
            // /api/admin/reports route는 PATCH/DELETE만 지원 (GET 없음). 웹 useAdminData 패턴과 동일하게
            // supabase에서 직접 select. RLS는 admin role에 대해 통과 (profiles.is_admin = true).
            const { data, error } = await supabase
                .from("reports")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(200);
            if (error) throw new Error(error.message);
            setReports((data ?? []) as ReportRow[]);
        } catch (e) {
            console.error("[AdminReports] load error:", e);
            const detail = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
            Alert.alert("불러오기 실패", detail);
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

    async function updateStatus(reportId: string, status: ReportStatus, adminNotes?: string) {
        // 낙관 업데이트
        setReports((prev) => prev.map((r) =>
            r.id === reportId ? { ...r, status, resolution_note: adminNotes ?? r.resolution_note } : r,
        ));
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/reports`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ reportId, status, adminNotes }),
            });
            if (!res.ok) {
                let msg = `HTTP ${res.status}`;
                try { msg = (await res.json()).error || msg; } catch {}
                Alert.alert("처리 실패", msg);
                load(); // 롤백
            }
        } catch (e) {
            Alert.alert("오류", e instanceof Error ? e.message : "");
            load();
        }
    }

    function promptStatusChange(report: ReportRow, newStatus: ReportStatus) {
        Alert.prompt
            ? Alert.prompt(
                STATUS_LABELS[newStatus] + "로 변경",
                "관리자 메모 (선택)",
                [
                    { text: "취소", style: "cancel" },
                    { text: "확인", onPress: (text?: string) => updateStatus(report.id, newStatus, text || undefined) },
                ],
                "plain-text",
                report.resolution_note ?? "",
            )
            // Android: prompt 없음 → 메모 없이 처리
            : Alert.alert(
                STATUS_LABELS[newStatus] + "로 변경",
                "이 신고 상태를 변경할까요?",
                [
                    { text: "취소", style: "cancel" },
                    { text: "확인", onPress: () => updateStatus(report.id, newStatus) },
                ],
            );
    }

    const counts = useMemo(() => ({
        pending: reports.filter((r) => r.status === "pending").length,
        reviewing: reports.filter((r) => r.status === "reviewing").length,
        resolved: reports.filter((r) => r.status === "resolved").length,
        rejected: reports.filter((r) => r.status === "rejected").length,
    }), [reports]);

    const filtered = useMemo(
        () => filter === "all" ? reports : reports.filter((r) => r.status === filter),
        [reports, filter],
    );

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

    return (
        <View style={[styles.flex1, { backgroundColor: bgColor }]}>
            {/* 상태 필터 */}
            <View style={styles.filterRow}>
                {(["all", "pending", "reviewing", "resolved", "rejected"] as Array<ReportStatus | "all">).map((f) => {
                    const active = filter === f;
                    const cnt = f === "all" ? reports.length : counts[f as ReportStatus];
                    return (
                        <TouchableOpacity
                            key={f}
                            onPress={() => setFilter(f)}
                            style={[
                                styles.filterChip,
                                active
                                    ? { backgroundColor: f === "all" ? COLORS.gray[800] : (STATUS_COLORS[f as ReportStatus]) }
                                    : { backgroundColor: cardBg, borderColor: isDarkMode ? COLORS.gray[700] : COLORS.gray[200] },
                            ]}
                        >
                            <Text style={{
                                fontSize: 11, fontWeight: "700",
                                color: active ? "#fff" : labelColor,
                            }}>
                                {STATUS_LABELS[f]} {cnt}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <FlatList
                data={filtered}
                keyExtractor={(r) => r.id}
                contentContainerStyle={{ padding: 12, gap: 10 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.memento[500]} />}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="checkmark-done-circle-outline" size={36} color={COLORS.gray[300]} />
                        <Text style={{ color: labelColor, fontSize: 13, marginTop: 8 }}>
                            {filter === "all" ? "신고가 없어요" : `${STATUS_LABELS[filter]} 상태 신고가 없어요`}
                        </Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <ReportCard
                        report={item}
                        cardBg={cardBg}
                        textColor={textColor}
                        labelColor={labelColor}
                        onChangeStatus={(s) => promptStatusChange(item, s)}
                    />
                )}
            />
        </View>
    );
}

function ReportCard({
    report, cardBg, textColor, labelColor, onChangeStatus,
}: {
    report: ReportRow;
    cardBg: string;
    textColor: string;
    labelColor: string;
    onChangeStatus: (s: ReportStatus) => void;
}) {
    const reasonLabel = REPORT_REASON_LABELS[report.reason] ?? report.reason;
    const targetLabel = REPORT_TARGET_LABELS[report.target_type] ?? report.target_type;
    const statusColor = STATUS_COLORS[report.status];

    function formatDate(iso: string) {
        try {
            const d = new Date(iso);
            return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
        } catch { return iso; }
    }

    return (
        <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={styles.cardHeader}>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusText, { color: statusColor }]}>
                        {STATUS_LABELS[report.status]}
                    </Text>
                </View>
                <Text style={[styles.dateText, { color: labelColor }]}>{formatDate(report.created_at)}</Text>
            </View>

            <View style={styles.cardBody}>
                <View style={styles.targetRow}>
                    <View style={styles.tag}>
                        <Text style={styles.tagText}>{targetLabel}</Text>
                    </View>
                    <Text style={[styles.reasonText, { color: textColor }]}>{reasonLabel}</Text>
                </View>
                {report.description && (
                    <Text style={[styles.descText, { color: labelColor }]} numberOfLines={3}>
                        {report.description}
                    </Text>
                )}
                {report.reporter_email && (
                    <Text style={[styles.metaText, { color: labelColor }]}>
                        신고자: {report.reporter_email}
                    </Text>
                )}
                <Text style={[styles.metaText, { color: labelColor, fontFamily: "monospace" }]} numberOfLines={1}>
                    대상 ID: {report.target_id}
                </Text>
                {report.resolution_note && (
                    <View style={styles.noteBox}>
                        <Text style={styles.noteLabel}>관리자 메모</Text>
                        <Text style={styles.noteText}>{report.resolution_note}</Text>
                    </View>
                )}
            </View>

            {/* 상태 변경 버튼 */}
            {report.status !== "resolved" && report.status !== "rejected" && (
                <View style={styles.actionRow}>
                    {report.status === "pending" && (
                        <TouchableOpacity
                            onPress={() => onChangeStatus("reviewing")}
                            style={[styles.actionBtn, { backgroundColor: STATUS_COLORS.reviewing }]}
                        >
                            <Text style={styles.actionBtnText}>검토 시작</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        onPress={() => onChangeStatus("resolved")}
                        style={[styles.actionBtn, { backgroundColor: STATUS_COLORS.resolved }]}
                    >
                        <Text style={styles.actionBtnText}>처리 완료</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => onChangeStatus("rejected")}
                        style={[styles.actionBtn, { backgroundColor: STATUS_COLORS.rejected }]}
                    >
                        <Text style={styles.actionBtnText}>반려</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    filterRow: {
        flexDirection: "row", flexWrap: "wrap", gap: 6,
        paddingHorizontal: 12, paddingVertical: 10,
    },
    filterChip: {
        paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 9999, borderWidth: 1, borderColor: "transparent",
    },
    empty: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
    card: {
        borderRadius: 14, padding: 14, gap: 10,
        borderWidth: 1, borderColor: "rgba(0,0,0,0.06)",
    },
    cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    statusBadge: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 11, fontWeight: "700" },
    dateText: { fontSize: 11 },
    cardBody: { gap: 6 },
    targetRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, backgroundColor: COLORS.gray[100] },
    tagText: { fontSize: 10, fontWeight: "700", color: COLORS.gray[700] },
    reasonText: { fontSize: 14, fontWeight: "700" },
    descText: { fontSize: 12, lineHeight: 18 },
    metaText: { fontSize: 11 },
    noteBox: {
        marginTop: 4, padding: 10, borderRadius: 8,
        backgroundColor: "#FEF3C7",
    },
    noteLabel: { fontSize: 10, fontWeight: "700", color: "#92400E", marginBottom: 4 },
    noteText: { fontSize: 12, color: "#78350F", lineHeight: 18 },
    actionRow: { flexDirection: "row", gap: 6, marginTop: 6 },
    actionBtn: {
        flex: 1, paddingVertical: 10, borderRadius: 10,
        alignItems: "center", justifyContent: "center",
    },
    actionBtnText: { fontSize: 12, fontWeight: "700", color: "#fff" },
});
