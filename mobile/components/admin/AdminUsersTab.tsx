/**
 * AdminUsersTab — 회원 관리 (웹 src/components/admin/tabs/AdminUsersTab.tsx 이식)
 *
 * - profiles 테이블 직접 fetch (최근 200명, 탈퇴자 제외)
 * - 검색 (이메일 / 닉네임)
 * - 차단/해제 (PATCH /api/admin/update-profile)
 * - 관리자 권한 토글
 * - 포인트 부여 (POST /api/admin/points)
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

interface AdminUser {
    id: string;
    email: string;
    nickname: string | null;
    created_at: string;
    is_banned: boolean;
    is_premium: boolean;
    is_admin: boolean;
    points: number;
    premium_expires_at: string | null;
}

interface Props {
    accessToken: string;
}

export default function AdminUsersTab({ accessToken }: Props) {
    const { isDarkMode } = useDarkMode();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<"all" | "banned" | "premium" | "admin">("all");

    const load = useCallback(async () => {
        try {
            const { data: withdrawn } = await supabase
                .from("withdrawn_users")
                .select("user_id");
            const withdrawnIds = new Set((withdrawn ?? []).map((w) => w.user_id));

            const { data, error } = await supabase
                .from("profiles")
                .select("id, email, nickname, created_at, is_banned, is_premium, is_admin, points, premium_expires_at")
                .order("created_at", { ascending: false })
                .limit(200);
            if (error) throw new Error(error.message);

            const list: AdminUser[] = (data ?? [])
                .filter((p) => !withdrawnIds.has(p.id))
                .map((p) => ({
                    id: p.id,
                    email: p.email ?? "",
                    nickname: p.nickname ?? null,
                    created_at: p.created_at,
                    is_banned: !!p.is_banned,
                    is_premium: !!p.is_premium,
                    is_admin: !!p.is_admin,
                    points: p.points ?? 0,
                    premium_expires_at: p.premium_expires_at,
                }));
            setUsers(list);
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

    async function patchProfile(targetUserId: string, updates: Record<string, unknown>): Promise<boolean> {
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/update-profile`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ targetUserId, updates }),
            });
            if (!res.ok) {
                let msg = `HTTP ${res.status}`;
                try { msg = (await res.json()).error || msg; } catch {}
                Alert.alert("실패", msg);
                return false;
            }
            return true;
        } catch (e) {
            Alert.alert("오류", e instanceof Error ? e.message : "");
            return false;
        }
    }

    function toggleBan(user: AdminUser) {
        const next = !user.is_banned;
        Alert.alert(
            next ? "차단" : "차단 해제",
            `${user.email}을(를) ${next ? "차단" : "차단 해제"} 할까요?`,
            [
                { text: "취소", style: "cancel" },
                {
                    text: next ? "차단" : "해제",
                    style: next ? "destructive" : "default",
                    onPress: async () => {
                        const ok = await patchProfile(user.id, { is_banned: next });
                        if (ok) setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, is_banned: next } : u));
                    },
                },
            ],
        );
    }

    function toggleAdmin(user: AdminUser) {
        const next = !user.is_admin;
        Alert.alert(
            next ? "관리자 권한 부여" : "관리자 권한 해제",
            `${user.email}의 관리자 권한을 ${next ? "부여" : "해제"} 할까요?`,
            [
                { text: "취소", style: "cancel" },
                {
                    text: "확인",
                    onPress: async () => {
                        const ok = await patchProfile(user.id, { is_admin: next });
                        if (ok) setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, is_admin: next } : u));
                    },
                },
            ],
        );
    }

    function awardPoints(user: AdminUser) {
        const promptApi = (Alert as unknown as { prompt?: (...args: unknown[]) => void }).prompt;
        if (typeof promptApi === "function") {
            promptApi(
                "포인트 지급",
                `${user.email} (현재 ${user.points.toLocaleString()}P)\n양수: 지급, 음수: 차감`,
                [
                    { text: "취소", style: "cancel" },
                    { text: "확인", onPress: (text?: string) => doAward(user, text) },
                ],
                "plain-text",
                "1000",
            );
        } else {
            Alert.alert(
                "포인트 지급",
                "Android는 prompt 미지원. 웹 관리자에서 처리해주세요.",
            );
        }
    }

    async function doAward(user: AdminUser, text?: string) {
        if (!text) return;
        const points = parseInt(text, 10);
        if (isNaN(points) || points === 0) {
            Alert.alert("잘못된 입력", "정수 (양수/음수)로 입력해주세요");
            return;
        }
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/points`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    targetUserId: user.id,
                    points,
                    reason: "관리자 지급",
                }),
            });
            if (!res.ok) {
                let msg = `HTTP ${res.status}`;
                try { msg = (await res.json()).error || msg; } catch {}
                Alert.alert("실패", msg);
                return;
            }
            const data = await res.json();
            const newPoints = typeof data.newPoints === "number" ? data.newPoints : user.points + points;
            setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, points: newPoints } : u));
            Alert.alert("완료", `${points > 0 ? "+" : ""}${points.toLocaleString()}P → 현재 ${newPoints.toLocaleString()}P`);
        } catch (e) {
            Alert.alert("오류", e instanceof Error ? e.message : "");
        }
    }

    const filtered = useMemo(() => {
        const s = search.trim().toLowerCase();
        return users.filter((u) => {
            if (filter === "banned" && !u.is_banned) return false;
            if (filter === "premium" && !u.is_premium) return false;
            if (filter === "admin" && !u.is_admin) return false;
            if (!s) return true;
            return (u.email.toLowerCase().includes(s) || (u.nickname?.toLowerCase().includes(s) ?? false));
        });
    }, [users, search, filter]);

    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.gray[50];
    const cardBg = isDarkMode ? COLORS.gray[900] : COLORS.white;
    const textColor = isDarkMode ? COLORS.white : COLORS.gray[900];
    const labelColor = isDarkMode ? COLORS.gray[400] : COLORS.gray[500];
    const inputBg = isDarkMode ? COLORS.gray[800] : "#fff";

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: bgColor }]}>
                <ActivityIndicator color={COLORS.memento[500]} />
            </View>
        );
    }

    return (
        <View style={[styles.flex1, { backgroundColor: bgColor }]}>
            {/* 검색 + 필터 */}
            <View style={styles.searchRow}>
                <View style={[styles.searchBox, { backgroundColor: inputBg, borderColor: isDarkMode ? COLORS.gray[700] : COLORS.gray[200] }]}>
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
            </View>
            <View style={styles.filterRow}>
                {(["all", "banned", "premium", "admin"] as const).map((f) => {
                    const active = filter === f;
                    const labels = { all: "전체", banned: "차단", premium: "프리미엄", admin: "관리자" };
                    return (
                        <TouchableOpacity
                            key={f}
                            onPress={() => setFilter(f)}
                            style={[
                                styles.filterChip,
                                active
                                    ? { backgroundColor: "#8B5CF6", borderColor: "#8B5CF6" }
                                    : { backgroundColor: cardBg, borderColor: isDarkMode ? COLORS.gray[700] : COLORS.gray[200] },
                            ]}
                        >
                            <Text style={{ fontSize: 11, fontWeight: "700", color: active ? "#fff" : labelColor }}>
                                {labels[f]}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
                <Text style={[styles.countText, { color: labelColor }]}>{filtered.length}명</Text>
            </View>

            <FlatList
                data={filtered}
                keyExtractor={(u) => u.id}
                contentContainerStyle={{ padding: 12, gap: 8 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.memento[500]} />}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="people-outline" size={36} color={COLORS.gray[300]} />
                        <Text style={{ color: labelColor, fontSize: 13, marginTop: 8 }}>회원이 없어요</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <UserCard
                        user={item}
                        cardBg={cardBg}
                        textColor={textColor}
                        labelColor={labelColor}
                        onToggleBan={() => toggleBan(item)}
                        onToggleAdmin={() => toggleAdmin(item)}
                        onAwardPoints={() => awardPoints(item)}
                    />
                )}
            />
        </View>
    );
}

function UserCard({
    user, cardBg, textColor, labelColor,
    onToggleBan, onToggleAdmin, onAwardPoints,
}: {
    user: AdminUser;
    cardBg: string;
    textColor: string;
    labelColor: string;
    onToggleBan: () => void;
    onToggleAdmin: () => void;
    onAwardPoints: () => void;
}) {
    function formatDate(iso: string) {
        try {
            const d = new Date(iso);
            return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
        } catch { return iso; }
    }

    return (
        <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                        <Text style={[styles.nickname, { color: textColor }]} numberOfLines={1}>
                            {user.nickname || "—"}
                        </Text>
                        {user.is_admin && (
                            <View style={[styles.miniBadge, { backgroundColor: "#8B5CF615" }]}>
                                <Text style={[styles.miniBadgeText, { color: "#8B5CF6" }]}>관리자</Text>
                            </View>
                        )}
                        {user.is_premium && (
                            <View style={[styles.miniBadge, { backgroundColor: COLORS.memento[100] }]}>
                                <Text style={[styles.miniBadgeText, { color: COLORS.memento[700] }]}>프리미엄</Text>
                            </View>
                        )}
                        {user.is_banned && (
                            <View style={[styles.miniBadge, { backgroundColor: "#FEE2E2" }]}>
                                <Text style={[styles.miniBadgeText, { color: "#B91C1C" }]}>차단</Text>
                            </View>
                        )}
                    </View>
                    <Text style={[styles.email, { color: labelColor }]} numberOfLines={1}>
                        {user.email}
                    </Text>
                    <Text style={[styles.meta, { color: labelColor }]}>
                        {formatDate(user.created_at)} · {user.points.toLocaleString()}P
                    </Text>
                </View>
            </View>

            <View style={styles.actionRow}>
                <TouchableOpacity
                    onPress={onToggleBan}
                    style={[styles.actionBtn, { backgroundColor: user.is_banned ? "#10B981" : "#EF4444" }]}
                    activeOpacity={0.85}
                >
                    <Ionicons name={user.is_banned ? "lock-open-outline" : "ban-outline"} size={12} color="#fff" />
                    <Text style={styles.actionBtnText}>{user.is_banned ? "차단 해제" : "차단"}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={onToggleAdmin}
                    style={[styles.actionBtn, { backgroundColor: user.is_admin ? COLORS.gray[400] : "#8B5CF6" }]}
                    activeOpacity={0.85}
                >
                    <Ionicons name={user.is_admin ? "shield-outline" : "shield-checkmark"} size={12} color="#fff" />
                    <Text style={styles.actionBtnText}>{user.is_admin ? "관리자 해제" : "관리자 부여"}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={onAwardPoints}
                    style={[styles.actionBtn, { backgroundColor: COLORS.memorial[500] }]}
                    activeOpacity={0.85}
                >
                    <Ionicons name="star" size={12} color="#fff" />
                    <Text style={styles.actionBtnText}>포인트</Text>
                </TouchableOpacity>
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
    filterRow: {
        flexDirection: "row", alignItems: "center", gap: 6,
        paddingHorizontal: 12, paddingVertical: 8,
    },
    filterChip: {
        paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: 9999, borderWidth: 1,
    },
    countText: { marginLeft: "auto", fontSize: 11, fontWeight: "600" },
    empty: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
    card: { borderRadius: 12, padding: 12, gap: 10, borderWidth: 1, borderColor: "rgba(0,0,0,0.06)" },
    cardHeader: { flexDirection: "row", gap: 10 },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
    nickname: { fontSize: 14, fontWeight: "700", flexShrink: 1 },
    miniBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    miniBadgeText: { fontSize: 9, fontWeight: "700" },
    email: { fontSize: 11, marginTop: 2 },
    meta: { fontSize: 10, marginTop: 4 },
    actionRow: { flexDirection: "row", gap: 6 },
    actionBtn: {
        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
        paddingVertical: 8, borderRadius: 8,
    },
    actionBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});
