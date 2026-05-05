/**
 * AdminInquiriesTab — 문의 관리 (웹 src/components/admin/tabs/AdminInquiriesTab.tsx 이식)
 *
 * - support_inquiries 직접 fetch (최근 200개)
 * - 카테고리 필터 (전체/질문/신고/건의)
 * - 상태 변경 (처리시작/완료/종료)
 * - 답변 모달 (RN Modal, status=resolved + admin_response 저장)
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import {
    View, Text, TextInput, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl, StyleSheet, Alert,
    Modal, KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { useDarkMode } from "@/contexts/ThemeContext";

type InquiryStatus = "pending" | "in_progress" | "resolved" | "closed";
type InquiryCategory = "question" | "report" | "suggestion";

interface AdminInquiry {
    id: string;
    user_id: string | null;
    email: string;
    category: InquiryCategory;
    title: string;
    content: string;
    status: InquiryStatus;
    admin_response: string | null;
    responded_at: string | null;
    created_at: string;
}

const CATEGORY_LABELS: Record<InquiryCategory, string> = {
    question: "질문",
    report: "신고",
    suggestion: "건의",
};

const CATEGORY_ICONS: Record<InquiryCategory, React.ComponentProps<typeof Ionicons>["name"]> = {
    question: "help-circle-outline",
    report: "alert-circle-outline",
    suggestion: "bulb-outline",
};

const CATEGORY_COLORS: Record<InquiryCategory, { bg: string; fg: string }> = {
    question: { bg: "#DBEAFE", fg: "#1D4ED8" },
    report: { bg: "#FEE2E2", fg: "#B91C1C" },
    suggestion: { bg: "#FEF3C7", fg: "#A16207" },
};

const STATUS_LABELS: Record<InquiryStatus, string> = {
    pending: "대기",
    in_progress: "처리중",
    resolved: "완료",
    closed: "종료",
};

const STATUS_COLORS: Record<InquiryStatus, { bg: string; fg: string }> = {
    pending: { bg: COLORS.gray[200], fg: COLORS.gray[700] },
    in_progress: { bg: "#DBEAFE", fg: "#1D4ED8" },
    resolved: { bg: "#D1FAE5", fg: "#047857" },
    closed: { bg: COLORS.gray[300], fg: COLORS.gray[700] },
};

export default function AdminInquiriesTab() {
    const { isDarkMode } = useDarkMode();
    const [inquiries, setInquiries] = useState<AdminInquiry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<InquiryCategory | "all">("all");
    const [selected, setSelected] = useState<AdminInquiry | null>(null);
    const [response, setResponse] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from("support_inquiries")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(200);
            if (error) throw new Error(error.message);
            setInquiries((data ?? []) as AdminInquiry[]);
        } catch (e) {
            Alert.alert("불러오기 실패", e instanceof Error ? e.message : "");
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

    async function updateStatus(id: string, status: InquiryStatus) {
        try {
            const { error } = await supabase
                .from("support_inquiries")
                .update({ status })
                .eq("id", id);
            if (error) throw new Error(error.message);
            setInquiries((prev) => prev.map((i) => i.id === id ? { ...i, status } : i));
        } catch (e) {
            Alert.alert("상태 변경 실패", e instanceof Error ? e.message : "");
        }
    }

    function openResponse(inquiry: AdminInquiry) {
        setSelected(inquiry);
        setResponse(inquiry.admin_response ?? "");
    }

    function closeResponse() {
        setSelected(null);
        setResponse("");
    }

    async function submitResponse() {
        if (!selected || !response.trim()) return;
        setSubmitting(true);
        try {
            const respondedAt = new Date().toISOString();
            const { error } = await supabase
                .from("support_inquiries")
                .update({
                    admin_response: response.trim(),
                    status: "resolved",
                    responded_at: respondedAt,
                })
                .eq("id", selected.id);
            if (error) throw new Error(error.message);
            setInquiries((prev) => prev.map((i) =>
                i.id === selected.id
                    ? { ...i, admin_response: response.trim(), status: "resolved", responded_at: respondedAt }
                    : i
            ));
            closeResponse();
            Alert.alert("저장 완료");
        } catch (e) {
            Alert.alert("저장 실패", e instanceof Error ? e.message : "");
        } finally {
            setSubmitting(false);
        }
    }

    const filtered = useMemo(() => {
        const s = search.trim().toLowerCase();
        return inquiries.filter((i) => {
            if (filter !== "all" && i.category !== filter) return false;
            if (!s) return true;
            return i.title.toLowerCase().includes(s) || i.email.toLowerCase().includes(s);
        });
    }, [inquiries, search, filter]);

    const counts = useMemo(() => ({
        all: inquiries.length,
        question: inquiries.filter((i) => i.category === "question").length,
        report: inquiries.filter((i) => i.category === "report").length,
        suggestion: inquiries.filter((i) => i.category === "suggestion").length,
    }), [inquiries]);

    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.gray[50];
    const cardBg = isDarkMode ? COLORS.gray[900] : COLORS.white;
    const textColor = isDarkMode ? COLORS.white : COLORS.gray[900];
    const labelColor = isDarkMode ? COLORS.gray[400] : COLORS.gray[500];
    const inputBg = isDarkMode ? COLORS.gray[800] : "#fff";
    const borderColor = isDarkMode ? COLORS.gray[700] : COLORS.gray[200];

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: bgColor }]}>
                <ActivityIndicator color={COLORS.memento[500]} />
            </View>
        );
    }

    return (
        <View style={[styles.flex1, { backgroundColor: bgColor }]}>
            {/* 검색 */}
            <View style={styles.searchRow}>
                <View style={[styles.searchBox, { backgroundColor: inputBg, borderColor }]}>
                    <Ionicons name="search-outline" size={16} color={labelColor} />
                    <TextInput
                        value={search}
                        onChangeText={setSearch}
                        placeholder="제목 / 이메일 검색"
                        placeholderTextColor={labelColor}
                        autoCapitalize="none"
                        style={[styles.searchInput, { color: textColor }]}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
                            <Ionicons name="close-circle" size={16} color={COLORS.gray[400]} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* 카테고리 필터 */}
            <View style={styles.filterRow}>
                <FilterChip
                    label={`전체 ${counts.all}`}
                    active={filter === "all"}
                    onPress={() => setFilter("all")}
                    color={{ bg: COLORS.gray[700], fg: "#fff" }}
                    activeColor={{ bg: "#1F2937", fg: "#fff" }}
                />
                {(["question", "report", "suggestion"] as InquiryCategory[]).map((c) => (
                    <FilterChip
                        key={c}
                        label={`${CATEGORY_LABELS[c]} ${counts[c]}`}
                        active={filter === c}
                        onPress={() => setFilter(filter === c ? "all" : c)}
                        color={{ bg: CATEGORY_COLORS[c].bg, fg: CATEGORY_COLORS[c].fg }}
                        activeColor={{ bg: CATEGORY_COLORS[c].fg, fg: "#fff" }}
                    />
                ))}
            </View>

            <FlatList
                data={filtered}
                keyExtractor={(i) => i.id}
                contentContainerStyle={{ padding: 12, gap: 8 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.memento[500]} />}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="help-circle-outline" size={36} color={COLORS.gray[300]} />
                        <Text style={{ color: labelColor, fontSize: 13, marginTop: 8 }}>문의가 없어요</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <InquiryCard
                        inquiry={item}
                        onUpdateStatus={(s) => updateStatus(item.id, s)}
                        onOpenResponse={() => openResponse(item)}
                        cardBg={cardBg}
                        textColor={textColor}
                        labelColor={labelColor}
                        borderColor={borderColor}
                    />
                )}
            />

            {/* 답변 모달 */}
            <Modal
                visible={selected !== null}
                animationType="slide"
                transparent
                onRequestClose={closeResponse}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                >
                    <TouchableOpacity style={styles.modalBackdrop} onPress={closeResponse} activeOpacity={1} />
                    <View style={[styles.modalCard, { backgroundColor: cardBg }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
                            <Text style={[styles.modalTitle, { color: textColor }]}>문의 답변</Text>
                            <TouchableOpacity onPress={closeResponse} hitSlop={8}>
                                <Ionicons name="close" size={20} color={labelColor} />
                            </TouchableOpacity>
                        </View>

                        {selected && (
                            <View style={{ padding: 16, gap: 12 }}>
                                <Text style={[styles.modalSubtitle, { color: labelColor }]}>
                                    {selected.title}
                                </Text>
                                <View style={[styles.contentBox, { backgroundColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[100] }]}>
                                    <Text style={[styles.contentLabel, { color: labelColor }]}>문의 내용</Text>
                                    <Text style={[styles.contentText, { color: textColor }]}>
                                        {selected.content}
                                    </Text>
                                </View>
                                <Text style={[styles.label, { color: labelColor }]}>답변 내용</Text>
                                <TextInput
                                    value={response}
                                    onChangeText={setResponse}
                                    placeholder="답변을 입력하세요"
                                    placeholderTextColor={labelColor}
                                    multiline
                                    style={[styles.input, {
                                        backgroundColor: inputBg, color: textColor, borderColor,
                                        minHeight: 120, textAlignVertical: "top",
                                    }]}
                                />
                            </View>
                        )}

                        <View style={[styles.modalFooter, { borderTopColor: borderColor }]}>
                            <TouchableOpacity
                                onPress={closeResponse}
                                style={[styles.footerBtn, { backgroundColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[200] }]}
                            >
                                <Text style={{ color: textColor, fontSize: 13, fontWeight: "700" }}>취소</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={submitResponse}
                                disabled={submitting || !response.trim()}
                                style={[styles.footerBtn, {
                                    backgroundColor: submitting || !response.trim() ? COLORS.gray[300] : "#10B981",
                                }]}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>저장</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

function FilterChip({
    label, active, onPress, color, activeColor,
}: {
    label: string;
    active: boolean;
    onPress: () => void;
    color: { bg: string; fg: string };
    activeColor: { bg: string; fg: string };
}) {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={[
                styles.chip,
                {
                    backgroundColor: active ? activeColor.bg : color.bg,
                    opacity: active ? 1 : 0.7,
                },
            ]}
        >
            <Text style={{
                fontSize: 11, fontWeight: "700",
                color: active ? activeColor.fg : color.fg,
            }}>
                {label}
            </Text>
        </TouchableOpacity>
    );
}

function InquiryCard({
    inquiry, onUpdateStatus, onOpenResponse, cardBg, textColor, labelColor, borderColor,
}: {
    inquiry: AdminInquiry;
    onUpdateStatus: (s: InquiryStatus) => void;
    onOpenResponse: () => void;
    cardBg: string;
    textColor: string;
    labelColor: string;
    borderColor: string;
}) {
    const catColor = CATEGORY_COLORS[inquiry.category];
    const stColor = STATUS_COLORS[inquiry.status];

    function formatDate(iso: string) {
        try {
            const d = new Date(iso);
            return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
        } catch { return iso; }
    }

    return (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.cardTopRow}>
                <View style={[styles.miniBadge, { backgroundColor: catColor.bg, flexDirection: "row", alignItems: "center", gap: 2 }]}>
                    <Ionicons name={CATEGORY_ICONS[inquiry.category]} size={10} color={catColor.fg} />
                    <Text style={[styles.miniBadgeText, { color: catColor.fg }]}>
                        {CATEGORY_LABELS[inquiry.category]}
                    </Text>
                </View>
                <View style={[styles.miniBadge, { backgroundColor: stColor.bg }]}>
                    <Text style={[styles.miniBadgeText, { color: stColor.fg }]}>
                        {STATUS_LABELS[inquiry.status]}
                    </Text>
                </View>
                <Text style={[styles.dateText, { color: labelColor }]}>
                    {formatDate(inquiry.created_at)}
                </Text>
            </View>

            <Text style={[styles.cardTitle, { color: textColor }]} numberOfLines={1}>
                {inquiry.title}
            </Text>
            <Text style={[styles.cardBody, { color: labelColor }]} numberOfLines={2}>
                {inquiry.content}
            </Text>
            <Text style={[styles.cardEmail, { color: labelColor }]} numberOfLines={1}>
                {inquiry.email}
            </Text>

            {inquiry.admin_response && (
                <View style={[styles.responseBox, { backgroundColor: "#D1FAE5" }]}>
                    <Text style={[styles.responseLabel, { color: "#047857" }]}>관리자 답변</Text>
                    <Text style={[styles.responseText, { color: COLORS.gray[800] }]} numberOfLines={3}>
                        {inquiry.admin_response}
                    </Text>
                </View>
            )}

            <View style={styles.actionRow}>
                {inquiry.status === "pending" && (
                    <TouchableOpacity
                        onPress={() => onUpdateStatus("in_progress")}
                        style={[styles.actionBtn, { backgroundColor: "#3B82F6" }]}
                    >
                        <Text style={styles.actionBtnText}>처리시작</Text>
                    </TouchableOpacity>
                )}
                {(inquiry.status === "pending" || inquiry.status === "in_progress") && (
                    <TouchableOpacity
                        onPress={onOpenResponse}
                        style={[styles.actionBtn, { backgroundColor: "#10B981" }]}
                    >
                        <Text style={styles.actionBtnText}>답변</Text>
                    </TouchableOpacity>
                )}
                {(inquiry.status === "pending" || inquiry.status === "in_progress") && (
                    <TouchableOpacity
                        onPress={() => onUpdateStatus("resolved")}
                        style={[styles.actionBtn, { backgroundColor: COLORS.gray[500] }]}
                    >
                        <Text style={styles.actionBtnText}>완료</Text>
                    </TouchableOpacity>
                )}
                {inquiry.status === "resolved" && (
                    <TouchableOpacity
                        onPress={() => onUpdateStatus("closed")}
                        style={[styles.actionBtn, { backgroundColor: COLORS.gray[500] }]}
                    >
                        <Text style={styles.actionBtnText}>종료</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    searchRow: { paddingHorizontal: 12, paddingTop: 10 },
    searchBox: {
        flexDirection: "row", alignItems: "center", gap: 6,
        paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: 9999, borderWidth: 1,
    },
    searchInput: { flex: 1, fontSize: 13, paddingVertical: 0 },
    filterRow: { flexDirection: "row", gap: 4, paddingHorizontal: 12, paddingTop: 8 },
    chip: {
        flex: 1, alignItems: "center", justifyContent: "center",
        paddingVertical: 6, paddingHorizontal: 4, borderRadius: 6,
    },
    empty: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
    card: { padding: 12, borderRadius: 10, borderWidth: 1, gap: 4 },
    cardTopRow: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
    miniBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    miniBadgeText: { fontSize: 9, fontWeight: "700" },
    dateText: { fontSize: 10, marginLeft: "auto" },
    cardTitle: { fontSize: 13, fontWeight: "700", marginTop: 4 },
    cardBody: { fontSize: 11, lineHeight: 16 },
    cardEmail: { fontSize: 10 },
    responseBox: {
        padding: 8, borderRadius: 6, gap: 2, marginTop: 4,
    },
    responseLabel: { fontSize: 10, fontWeight: "700" },
    responseText: { fontSize: 11, lineHeight: 15 },
    actionRow: {
        flexDirection: "row", gap: 6, marginTop: 8,
        paddingTop: 8, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.06)",
    },
    actionBtn: {
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6,
    },
    actionBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },

    modalOverlay: { flex: 1, justifyContent: "flex-end" },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
    modalCard: {
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        maxHeight: "90%",
    },
    modalHeader: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
    },
    modalTitle: { fontSize: 16, fontWeight: "700" },
    modalSubtitle: { fontSize: 13 },
    contentBox: { padding: 12, borderRadius: 10, gap: 4 },
    contentLabel: { fontSize: 11, fontWeight: "700" },
    contentText: { fontSize: 13, lineHeight: 19 },
    label: { fontSize: 11, fontWeight: "700" },
    input: {
        borderWidth: 1, borderRadius: 10,
        paddingHorizontal: 12, paddingVertical: 10,
        fontSize: 13,
    },
    modalFooter: {
        flexDirection: "row", gap: 8,
        paddingHorizontal: 16, paddingVertical: 12,
        borderTopWidth: 1,
    },
    footerBtn: {
        flex: 1, alignItems: "center", justifyContent: "center",
        paddingVertical: 12, borderRadius: 10,
    },
});
