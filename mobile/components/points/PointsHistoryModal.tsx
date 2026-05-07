/**
 * PointsHistoryModal — 모바일
 *
 * 웹 src/components/features/points/PointsHistoryModal.tsx 1:1 이식.
 *  - GET /api/points/history (페이지네이션, Bearer)
 *  - 활동별 아이콘/색상 매핑
 *  - 등급 점수표 토글 (현재 등급 강조)
 */

import { useEffect, useState, useCallback } from "react";
import {
    Modal, View, Text, ScrollView, TouchableOpacity,
    ActivityIndicator, StyleSheet, Pressable,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useDarkMode } from "@/contexts/ThemeContext";
import {
    POINTS, POINT_LEVELS, getPointLevel, type PointActionType,
} from "@/config/constants";
import { API_BASE_URL } from "@/config/constants";

interface PointTransaction {
    id: string;
    actionType: PointActionType;
    pointsEarned: number;
    createdAt: string;
}

interface Props {
    visible: boolean;
    onClose: () => void;
}

const PAGE_SIZE = 20;

function getActionIcon(actionType: PointActionType): React.ComponentProps<typeof Ionicons>["name"] {
    switch (actionType) {
        case "daily_login": return "time-outline";
        case "write_post": return "create-outline";
        case "write_comment": return "chatbubble-outline";
        case "receive_like": return "heart-outline";
        case "receive_dislike": return "thumbs-down-outline";
        case "ai_chat": return "chatbubbles-outline";
        case "pet_registration": return "paw-outline";
        case "timeline_entry": return "star-outline";
        case "photo_upload": return "camera-outline";
        case "write_guestbook": return "book-outline";
        case "receive_guestbook": return "book-outline";
        default: return "star-outline";
    }
}

function getActionColor(actionType: PointActionType): string {
    switch (actionType) {
        case "daily_login": return "#F59E0B";
        case "write_post": return "#0EA5E9";
        case "write_comment": return "#10B981";
        case "receive_like": return "#F43F5E";
        case "receive_dislike": return "#9CA3AF";
        case "ai_chat": return "#8B5CF6";
        case "pet_registration": return "#FB923C";
        case "timeline_entry": return "#6366F1";
        case "photo_upload": return "#14B8A6";
        case "write_guestbook": return "#EC4899";
        case "receive_guestbook": return "#D946EF";
        default: return COLORS.gray[500];
    }
}

function formatDate(iso: string): string {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);
    if (diffMin < 1) return "방금 전";
    if (diffMin < 60) return `${diffMin}분 전`;
    if (diffHour < 24) return `${diffHour}시간 전`;
    if (diffDay < 7) return `${diffDay}일 전`;
    return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

export default function PointsHistoryModal({ visible, onClose }: Props) {
    const insets = useSafeAreaInsets();
    const { session, points } = useAuth();
    const { isDarkMode } = useDarkMode();
    const accessToken = session?.access_token;

    const [transactions, setTransactions] = useState<PointTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(false);
    const [offset, setOffset] = useState(0);
    const [showLevelChart, setShowLevelChart] = useState(false);

    const currentLevel = getPointLevel(points ?? 0);

    const fetchHistory = useCallback(async (curOffset: number) => {
        if (!accessToken) return;
        try {
            setLoading(true);
            const res = await fetch(
                `${API_BASE_URL}/api/points/history?limit=${PAGE_SIZE}&offset=${curOffset}`,
                { headers: { Authorization: `Bearer ${accessToken}` } },
            );
            if (!res.ok) return;
            const data = await res.json();
            const txs: PointTransaction[] = data.transactions ?? [];
            if (curOffset === 0) setTransactions(txs);
            else setTransactions((prev) => [...prev, ...txs]);
            setHasMore(!!data.hasMore);
        } finally {
            setLoading(false);
        }
    }, [accessToken]);

    useEffect(() => {
        if (visible) {
            setOffset(0);
            fetchHistory(0);
        }
    }, [visible, fetchHistory]);

    function loadMore() {
        const next = offset + PAGE_SIZE;
        setOffset(next);
        fetchHistory(next);
    }

    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.white;
    const textColor = isDarkMode ? COLORS.white : COLORS.gray[900];
    const subColor = COLORS.gray[500];

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                <SafeAreaView edges={["top"]} style={[styles.sheet, { backgroundColor: bgColor }]}>
                    <View style={styles.header}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.title, { color: textColor }]}>포인트 내역</Text>
                            <Text style={[styles.sub, { color: subColor }]}>
                                현재 보유: {(points ?? 0).toLocaleString()}P
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={12}>
                            <Ionicons name="close" size={22} color={subColor} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
                    >
                        {/* 등급 점수표 토글 */}
                        <TouchableOpacity
                            onPress={() => setShowLevelChart((v) => !v)}
                            style={[styles.levelChartBtn, { backgroundColor: isDarkMode ? COLORS.gray[900] : COLORS.memento[50] }]}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.levelDot, { backgroundColor: currentLevel.color }]}>
                                <Ionicons name="ribbon" size={14} color="#fff" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.levelLabel, { color: textColor }]}>등급 점수표</Text>
                                <Text style={styles.levelSub}>
                                    Lv.{currentLevel.level} · {currentLevel.label}
                                </Text>
                            </View>
                            <Ionicons
                                name={showLevelChart ? "chevron-up" : "chevron-down"}
                                size={16}
                                color={COLORS.gray[400]}
                            />
                        </TouchableOpacity>

                        {showLevelChart && (
                            <View style={[styles.levelList, { borderColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[200] }]}>
                                {POINT_LEVELS.map((lvl, i) => {
                                    const isCurrent = lvl.level === currentLevel.level;
                                    const achieved = (points ?? 0) >= lvl.minPoints;
                                    return (
                                        <View
                                            key={lvl.level}
                                            style={[
                                                styles.levelRow,
                                                i < POINT_LEVELS.length - 1 && {
                                                    borderBottomWidth: 1,
                                                    borderBottomColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[100],
                                                },
                                                isCurrent && { backgroundColor: isDarkMode ? "rgba(5,178,220,0.18)" : COLORS.memento[50] },
                                            ]}
                                        >
                                            <View
                                                style={[
                                                    styles.levelBadge,
                                                    { backgroundColor: lvl.color, opacity: achieved ? 1 : 0.35 },
                                                ]}
                                            >
                                                <Text style={styles.levelBadgeText}>Lv.{lvl.level}</Text>
                                            </View>
                                            <Text style={[styles.levelName, { color: achieved ? textColor : COLORS.gray[400] }]}>
                                                {lvl.label}
                                            </Text>
                                            <Text style={[styles.levelPoint, { color: achieved ? COLORS.gray[600] : COLORS.gray[300] }]}>
                                                {lvl.minPoints.toLocaleString()}P
                                            </Text>
                                            {isCurrent && (
                                                <View style={styles.currentBadge}>
                                                    <Text style={styles.currentBadgeText}>현재</Text>
                                                </View>
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        )}

                        {/* 내역 목록 */}
                        <View style={styles.txList}>
                            {loading && transactions.length === 0 ? (
                                <View style={styles.center}>
                                    <ActivityIndicator color={COLORS.memento[500]} />
                                </View>
                            ) : transactions.length === 0 ? (
                                <Text style={[styles.empty, { color: subColor }]}>
                                    아직 포인트 내역이 없습니다
                                </Text>
                            ) : (
                                <>
                                    {transactions.map((tx) => {
                                        const iconName = getActionIcon(tx.actionType);
                                        const iconColor = getActionColor(tx.actionType);
                                        const label = POINTS.LABELS[tx.actionType] ?? tx.actionType;
                                        return (
                                            <View
                                                key={tx.id}
                                                style={[styles.txRow, { backgroundColor: isDarkMode ? COLORS.gray[900] : COLORS.gray[50] }]}
                                            >
                                                <View style={[styles.txIcon, { backgroundColor: iconColor + "20" }]}>
                                                    <Ionicons name={iconName} size={16} color={iconColor} />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.txLabel, { color: textColor }]}>{label}</Text>
                                                    <Text style={styles.txDate}>{formatDate(tx.createdAt)}</Text>
                                                </View>
                                                <Text
                                                    style={[
                                                        styles.txPoint,
                                                        { color: tx.pointsEarned >= 0 ? COLORS.memento[600] : "#EF4444" },
                                                    ]}
                                                >
                                                    {tx.pointsEarned >= 0 ? "+" : ""}{tx.pointsEarned}P
                                                </Text>
                                            </View>
                                        );
                                    })}
                                    {hasMore && (
                                        <TouchableOpacity
                                            onPress={loadMore}
                                            disabled={loading}
                                            style={[styles.moreBtn, { opacity: loading ? 0.5 : 1 }]}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.moreText, { color: subColor }]}>
                                                {loading ? "불러오는 중..." : "더보기"}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </>
                            )}
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    sheet: {
        height: "85%",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(0,0,0,0.06)",
    },
    title: { fontSize: 18, fontWeight: "800" },
    sub: { fontSize: 12, marginTop: 2 },
    closeBtn: { padding: 4 },
    levelChartBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginHorizontal: 20,
        marginTop: 16,
        padding: 14,
        borderRadius: 12,
    },
    levelDot: {
        width: 32, height: 32, borderRadius: 10,
        alignItems: "center", justifyContent: "center",
    },
    levelLabel: { fontSize: 13, fontWeight: "700" },
    levelSub: { fontSize: 11, color: COLORS.gray[500], marginTop: 2 },
    levelList: {
        marginHorizontal: 20,
        marginTop: 8,
        borderWidth: 1,
        borderRadius: 12,
        overflow: "hidden",
    },
    levelRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        padding: 12,
    },
    levelBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 9999,
        minWidth: 50,
        alignItems: "center",
    },
    levelBadgeText: { fontSize: 10, fontWeight: "800", color: "#fff" },
    levelName: { flex: 1, fontSize: 13, fontWeight: "600" },
    levelPoint: { fontSize: 11, fontWeight: "600" },
    currentBadge: {
        backgroundColor: COLORS.memento[500],
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 9999,
        marginLeft: 4,
    },
    currentBadgeText: { fontSize: 10, fontWeight: "800", color: "#fff" },
    txList: { marginTop: 16, paddingHorizontal: 20, gap: 8 },
    txRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        padding: 12,
        borderRadius: 12,
    },
    txIcon: {
        width: 34, height: 34, borderRadius: 10,
        alignItems: "center", justifyContent: "center",
    },
    txLabel: { fontSize: 13, fontWeight: "600" },
    txDate: { fontSize: 11, color: COLORS.gray[500], marginTop: 2 },
    txPoint: { fontSize: 13, fontWeight: "800" },
    moreBtn: {
        paddingVertical: 14,
        alignItems: "center",
        borderRadius: 12,
        marginTop: 4,
    },
    moreText: { fontSize: 13 },
    center: { paddingVertical: 40, alignItems: "center" },
    empty: { textAlign: "center", paddingVertical: 40, fontSize: 13 },
});
