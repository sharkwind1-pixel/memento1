/**
 * AdminWithdrawalsTab — 탈퇴 관리 (웹 src/components/admin/tabs/AdminWithdrawalsTab.tsx 이식)
 *
 * - withdrawn_users 직접 fetch
 * - 유형 필터 (전체/악용/차단/해결)
 * - 이메일 수동 차단 폼 (POST /api/admin/block-email)
 * - 재가입 허용 (POST /api/admin/allow-rejoin)
 * - 탈퇴 기록 삭제 (직접 supabase delete)
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import {
    View, Text, TextInput, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl, StyleSheet, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/theme";
import { API_BASE_URL } from "@/config/constants";
import { supabase } from "@/lib/supabase";
import { useDarkMode } from "@/contexts/ThemeContext";

type WithdrawalType = "abuse_concern" | "banned" | "error_resolution";

interface WithdrawnUser {
    id: string;
    user_id: string;
    email: string;
    nickname: string | null;
    ip_address: string | null;
    withdrawal_type: WithdrawalType;
    withdrawn_at: string;
    rejoin_allowed_at: string | null;
    reason: string | null;
}

const TYPE_LABELS: Record<WithdrawalType, string> = {
    abuse_concern: "악용",
    banned: "차단",
    error_resolution: "해결",
};

const TYPE_COLORS: Record<WithdrawalType, { bg: string; fg: string }> = {
    abuse_concern: { bg: "#FEF3C7", fg: "#A16207" },
    banned: { bg: "#FEE2E2", fg: "#B91C1C" },
    error_resolution: { bg: "#D1FAE5", fg: "#047857" },
};

interface Props {
    accessToken: string;
}

export default function AdminWithdrawalsTab({ accessToken }: Props) {
    const { isDarkMode } = useDarkMode();
    const [list, setList] = useState<WithdrawnUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<WithdrawalType | "all">("all");

    const [showBlockForm, setShowBlockForm] = useState(false);
    const [blockEmail, setBlockEmail] = useState("");
    const [blockReason, setBlockReason] = useState("");
    const [blocking, setBlocking] = useState(false);

    const load = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from("withdrawn_users")
                .select("*")
                .order("withdrawn_at", { ascending: false })
                .limit(200);
            if (error) throw new Error(error.message);
            setList((data ?? []) as WithdrawnUser[]);
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

    async function handleBlockEmail() {
        if (!blockEmail.trim()) {
            Alert.alert("이메일 필요", "이메일을 입력해주세요");
            return;
        }
        setBlocking(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/block-email`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: blockEmail.trim(),
                    reason: blockReason.trim() || "관리자 수동 차단",
                    withdrawalType: "banned",
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.success === false) {
                Alert.alert("차단 실패", data.message || data.error || `HTTP ${res.status}`);
                return;
            }
            Alert.alert("차단 완료", `${blockEmail} 차단됐어요`);
            setBlockEmail("");
            setBlockReason("");
            setShowBlockForm(false);
            load();
        } catch (e) {
            Alert.alert("오류", e instanceof Error ? e.message : "");
        } finally {
            setBlocking(false);
        }
    }

    function allowRejoin(w: WithdrawnUser) {
        if (w.withdrawal_type === "banned") {
            // RN Alert.prompt는 iOS만, Android는 미지원 → iOS만 사유 prompt, Android는 confirm만
            const promptApi = (Alert as unknown as { prompt?: (...args: unknown[]) => void }).prompt;
            if (typeof promptApi === "function") {
                promptApi(
                    "영구 차단 해제",
                    `${w.email}\n해제 사유를 입력해주세요`,
                    [
                        { text: "취소", style: "cancel" },
                        { text: "해제", onPress: (text?: string) => {
                            if (!text?.trim()) {
                                Alert.alert("사유 필요", "사유를 입력해주세요");
                                return;
                            }
                            executeAllowRejoin(w, text.trim());
                        }},
                    ],
                    "plain-text",
                );
            } else {
                Alert.alert(
                    "영구 차단 해제",
                    `${w.email}의 영구 차단을 해제할까요?`,
                    [
                        { text: "취소", style: "cancel" },
                        { text: "해제", style: "destructive", onPress: () => executeAllowRejoin(w, "관리자 해제") },
                    ],
                );
            }
        } else {
            Alert.alert(
                "재가입 허용",
                `${w.email}의 재가입을 허용할까요?`,
                [
                    { text: "취소", style: "cancel" },
                    { text: "허용", onPress: () => executeAllowRejoin(w) },
                ],
            );
        }
    }

    async function executeAllowRejoin(w: WithdrawnUser, reason?: string) {
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/allow-rejoin`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: w.email,
                    userId: w.user_id,
                    nickname: w.nickname,
                    reason,
                    previousReason: w.reason,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.success === false) {
                Alert.alert("실패", data.error || `HTTP ${res.status}`);
                return;
            }
            Alert.alert(
                "완료",
                w.withdrawal_type === "banned" ? "영구 차단 해제됐어요" : "재가입 허용됐어요",
            );
            load();
        } catch (e) {
            Alert.alert("오류", e instanceof Error ? e.message : "");
        }
    }

    function deleteRecord(w: WithdrawnUser) {
        Alert.alert(
            "탈퇴 기록 삭제",
            `${w.email}의 탈퇴 기록을 삭제할까요?\n되돌릴 수 없어요.`,
            [
                { text: "취소", style: "cancel" },
                {
                    text: "삭제",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from("withdrawn_users")
                                .delete()
                                .eq("id", w.id);
                            if (error) throw new Error(error.message);
                            setList((prev) => prev.filter((x) => x.id !== w.id));
                        } catch (e) {
                            Alert.alert("삭제 실패", e instanceof Error ? e.message : "");
                        }
                    },
                },
            ],
        );
    }

    const filtered = useMemo(() => {
        const s = search.trim().toLowerCase();
        return list.filter((w) => {
            if (filter !== "all" && w.withdrawal_type !== filter) return false;
            if (!s) return true;
            return w.email.toLowerCase().includes(s) || (w.nickname?.toLowerCase().includes(s) ?? false);
        });
    }, [list, search, filter]);

    const counts = useMemo(() => ({
        all: list.length,
        abuse_concern: list.filter((w) => w.withdrawal_type === "abuse_concern").length,
        banned: list.filter((w) => w.withdrawal_type === "banned").length,
        error_resolution: list.filter((w) => w.withdrawal_type === "error_resolution").length,
    }), [list]);

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
            {/* 검색 + 차단 폼 토글 */}
            <View style={styles.topRow}>
                <View style={[styles.searchBox, { backgroundColor: inputBg, borderColor, flex: 1 }]}>
                    <Ionicons name="search-outline" size={16} color={labelColor} />
                    <TextInput
                        value={search}
                        onChangeText={setSearch}
                        placeholder="이메일 / 닉네임 검색"
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
                <TouchableOpacity
                    onPress={() => setShowBlockForm(!showBlockForm)}
                    style={[styles.blockToggleBtn, {
                        backgroundColor: inputBg,
                        borderColor: "#FCA5A5",
                    }]}
                >
                    <Ionicons name="shield-outline" size={14} color="#DC2626" />
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#DC2626" }}>차단</Text>
                </TouchableOpacity>
            </View>

            {/* 수동 차단 폼 */}
            {showBlockForm && (
                <View style={[styles.blockFormCard, {
                    backgroundColor: cardBg,
                    borderColor: "#FCA5A5",
                }]}>
                    <View style={styles.blockFormTitle}>
                        <Ionicons name="shield" size={14} color="#DC2626" />
                        <Text style={{ fontSize: 12, fontWeight: "700", color: "#DC2626" }}>이메일 수동 차단</Text>
                    </View>
                    <TextInput
                        value={blockEmail}
                        onChangeText={setBlockEmail}
                        placeholder="차단할 이메일"
                        placeholderTextColor={labelColor}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]}
                    />
                    <TextInput
                        value={blockReason}
                        onChangeText={setBlockReason}
                        placeholder="차단 사유 (선택)"
                        placeholderTextColor={labelColor}
                        style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]}
                    />
                    <View style={styles.blockFormActions}>
                        <TouchableOpacity
                            onPress={() => { setShowBlockForm(false); setBlockEmail(""); setBlockReason(""); }}
                            style={[styles.smallBtn, { backgroundColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[200] }]}
                        >
                            <Text style={{ fontSize: 11, fontWeight: "700", color: textColor }}>취소</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleBlockEmail}
                            disabled={blocking || !blockEmail.trim()}
                            style={[styles.smallBtn, {
                                backgroundColor: blocking || !blockEmail.trim() ? COLORS.gray[300] : "#DC2626",
                            }]}
                        >
                            {blocking ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={{ fontSize: 11, fontWeight: "700", color: "#fff" }}>차단</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* 유형 필터 */}
            <View style={styles.filterRow}>
                <FilterChip
                    label={`전체 ${counts.all}`}
                    active={filter === "all"}
                    onPress={() => setFilter("all")}
                    color={{ bg: COLORS.gray[700], fg: "#fff" }}
                    activeColor={{ bg: "#1F2937", fg: "#fff" }}
                />
                {(["abuse_concern", "banned", "error_resolution"] as WithdrawalType[]).map((t) => (
                    <FilterChip
                        key={t}
                        label={`${TYPE_LABELS[t]} ${counts[t]}`}
                        active={filter === t}
                        onPress={() => setFilter(filter === t ? "all" : t)}
                        color={TYPE_COLORS[t]}
                        activeColor={{ bg: TYPE_COLORS[t].fg, fg: "#fff" }}
                    />
                ))}
            </View>

            <FlatList
                data={filtered}
                keyExtractor={(w) => w.id}
                contentContainerStyle={{ padding: 12, gap: 8 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.memento[500]} />}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="ban-outline" size={36} color={COLORS.gray[300]} />
                        <Text style={{ color: labelColor, fontSize: 13, marginTop: 8 }}>탈퇴자가 없어요</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <WithdrawnCard
                        user={item}
                        onAllowRejoin={() => allowRejoin(item)}
                        onDelete={() => deleteRecord(item)}
                        cardBg={cardBg}
                        textColor={textColor}
                        labelColor={labelColor}
                        borderColor={borderColor}
                    />
                )}
            />
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
                { backgroundColor: active ? activeColor.bg : color.bg, opacity: active ? 1 : 0.7 },
            ]}
        >
            <Text style={{ fontSize: 11, fontWeight: "700", color: active ? activeColor.fg : color.fg }}>
                {label}
            </Text>
        </TouchableOpacity>
    );
}

function WithdrawnCard({
    user, onAllowRejoin, onDelete, cardBg, textColor, labelColor, borderColor,
}: {
    user: WithdrawnUser;
    onAllowRejoin: () => void;
    onDelete: () => void;
    cardBg: string;
    textColor: string;
    labelColor: string;
    borderColor: string;
}) {
    const typeColor = TYPE_COLORS[user.withdrawal_type];
    const canRejoin =
        user.withdrawal_type === "error_resolution" ||
        (user.withdrawal_type === "abuse_concern" &&
            user.rejoin_allowed_at &&
            new Date(user.rejoin_allowed_at) <= new Date());

    function formatDate(iso: string) {
        try {
            const d = new Date(iso);
            return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
        } catch { return iso; }
    }

    return (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <Text style={[styles.email, { color: textColor }]} numberOfLines={1}>
                {user.email}
            </Text>
            <View style={styles.cardTopRow}>
                {user.nickname && (
                    <Text style={[styles.nickname, { color: labelColor }]} numberOfLines={1}>
                        {user.nickname}
                    </Text>
                )}
                <View style={[styles.miniBadge, { backgroundColor: typeColor.bg }]}>
                    <Text style={[styles.miniBadgeText, { color: typeColor.fg }]}>
                        {TYPE_LABELS[user.withdrawal_type]}
                    </Text>
                </View>
                <Text style={[styles.dateText, { color: labelColor }]}>
                    {formatDate(user.withdrawn_at)}
                </Text>
            </View>

            {user.reason && (
                <Text style={[styles.reasonBox, { color: labelColor, borderColor }]} numberOfLines={2}>
                    {user.reason}
                </Text>
            )}

            {user.withdrawal_type === "abuse_concern" && user.rejoin_allowed_at && (
                <Text style={[styles.metaText, { color: "#A16207" }]}>
                    재가입: {formatDate(user.rejoin_allowed_at)}
                    {canRejoin && " (가능)"}
                </Text>
            )}

            {user.ip_address && (
                <Text style={[styles.metaText, { color: labelColor }]}>
                    IP: {user.ip_address}
                </Text>
            )}

            <View style={styles.actionRow}>
                {user.withdrawal_type !== "error_resolution" && (
                    <TouchableOpacity
                        onPress={onAllowRejoin}
                        style={[styles.actionBtn, {
                            backgroundColor: user.withdrawal_type === "banned" ? "#A16207" : "#10B981",
                        }]}
                    >
                        <Ionicons
                            name={user.withdrawal_type === "banned" ? "lock-open-outline" : "person-add-outline"}
                            size={12} color="#fff"
                        />
                        <Text style={styles.actionBtnText}>
                            {user.withdrawal_type === "banned" ? "차단 해제" : "재가입 허용"}
                        </Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    onPress={onDelete}
                    style={[styles.actionBtn, { backgroundColor: "#EF4444" }]}
                >
                    <Ionicons name="trash-outline" size={12} color="#fff" />
                    <Text style={styles.actionBtnText}>기록 삭제</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    topRow: { flexDirection: "row", gap: 6, paddingHorizontal: 12, paddingTop: 10 },
    searchBox: {
        flexDirection: "row", alignItems: "center", gap: 6,
        paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: 9999, borderWidth: 1,
    },
    searchInput: { flex: 1, fontSize: 13, paddingVertical: 0 },
    blockToggleBtn: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 10, paddingVertical: 6,
        borderRadius: 8, borderWidth: 1,
    },
    blockFormCard: {
        marginHorizontal: 12, marginTop: 8,
        padding: 12, borderRadius: 10, borderWidth: 1, gap: 8,
    },
    blockFormTitle: { flexDirection: "row", alignItems: "center", gap: 4 },
    input: {
        borderWidth: 1, borderRadius: 8,
        paddingHorizontal: 12, paddingVertical: 8,
        fontSize: 13,
    },
    blockFormActions: { flexDirection: "row", gap: 6, justifyContent: "flex-end" },
    smallBtn: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
        alignItems: "center", justifyContent: "center", minWidth: 60,
    },
    filterRow: { flexDirection: "row", gap: 4, paddingHorizontal: 12, paddingTop: 8 },
    chip: {
        flex: 1, alignItems: "center", justifyContent: "center",
        paddingVertical: 6, paddingHorizontal: 4, borderRadius: 6,
    },
    empty: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
    card: { padding: 12, borderRadius: 10, borderWidth: 1, gap: 4 },
    email: { fontSize: 13, fontWeight: "700" },
    cardTopRow: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
    nickname: { fontSize: 11 },
    miniBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    miniBadgeText: { fontSize: 9, fontWeight: "700" },
    dateText: { fontSize: 10, marginLeft: "auto" },
    reasonBox: {
        fontSize: 11, lineHeight: 16, padding: 8,
        borderRadius: 6, borderWidth: 1,
    },
    metaText: { fontSize: 10 },
    actionRow: {
        flexDirection: "row", gap: 6, marginTop: 6,
        paddingTop: 8, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.06)",
    },
    actionBtn: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6,
    },
    actionBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});
