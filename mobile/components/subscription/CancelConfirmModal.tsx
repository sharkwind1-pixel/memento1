/**
 * CancelConfirmModal — 정기결제 해지 확인 + 환불 미리보기
 *
 * 흐름:
 *  1. 모달 오픈 시 GET /api/subscription/refund-preview 자동 호출
 *  2. "이만큼 환불됩니다" 투명 노출 (24h 이내 전액 / 이후 ms 비율 / AI영상 사용 시 차감)
 *  3. 사용자 확인 → POST /api/subscription/cancel
 *  4. 결과 콜백 (성공 시 refreshProfile 권장)
 */

import { useEffect, useState } from "react";
import {
    View, Text, Modal, TouchableOpacity, ScrollView,
    StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/theme";
import {
    getRefundPreview, cancelSubscription,
    type RefundPreview, type CancelResult,
} from "@/lib/subscription-api";

interface Props {
    visible: boolean;
    onClose: () => void;
    accessToken: string;
    accentColor: string;
    onCancelled: (result: CancelResult) => void;
}

export default function CancelConfirmModal({
    visible, onClose, accessToken, accentColor, onCancelled,
}: Props) {
    const insets = useSafeAreaInsets();
    const [preview, setPreview] = useState<RefundPreview | null>(null);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!visible) return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        setPreview(null);
        getRefundPreview(accessToken)
            .then((p) => { if (!cancelled) setPreview(p); })
            .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "환불 정보를 불러올 수 없어요"); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [visible, accessToken]);

    function confirmCancel() {
        Alert.alert(
            "정말 해지할까요?",
            preview?.isFullRefund
                ? "24시간 이내 해지로 전액 환불됩니다."
                : `남은 기간 비율로 ${preview?.refundableAmount.toLocaleString()}원이 환불돼요.${
                    preview?.videosUsedCharged && preview.videosUsedCharged > 0
                        ? `\n사용한 AI 영상 ${preview.videosUsedCharged}건(건당 3,500원)이 차감됐어요.`
                        : ""
                }`,
            [
                { text: "더 생각해볼게요", style: "cancel" },
                {
                    text: "해지 진행",
                    style: "destructive",
                    onPress: async () => {
                        if (!accessToken || cancelling) return;
                        setCancelling(true);
                        try {
                            const result = await cancelSubscription(accessToken);
                            onCancelled(result);
                            onClose();
                            if (result.refundedAmount !== undefined) {
                                Alert.alert(
                                    "해지 완료",
                                    result.refundedAmount > 0
                                        ? `${result.refundedAmount.toLocaleString()}원이 환불 처리됐어요. 영업일 기준 3-5일 안에 카드사로 입금돼요.`
                                        : "해지가 완료됐어요. 다음 결제는 발생하지 않아요.",
                                );
                            } else {
                                Alert.alert("해지 완료", result.message ?? "정기결제가 해지됐어요.");
                            }
                        } catch (e) {
                            Alert.alert("해지 실패", e instanceof Error ? e.message : "");
                        } finally {
                            setCancelling(false);
                        }
                    },
                },
            ],
        );
    }

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <SafeAreaView style={styles.flex1} edges={["top"]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.headerBtn}>
                        <Ionicons name="close" size={24} color={COLORS.gray[800]} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>정기결제 해지</Text>
                    <View style={{ width: 32 }} />
                </View>

                <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 16 + insets.bottom }]}>
                    {loading ? (
                        <View style={styles.center}>
                            <ActivityIndicator color={accentColor} />
                            <Text style={styles.loadingText}>환불 정보를 불러오고 있어요...</Text>
                        </View>
                    ) : error ? (
                        <View style={styles.center}>
                            <Ionicons name="alert-circle-outline" size={36} color={COLORS.gray[400]} />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : preview ? (
                        <>
                            {/* 환불 요약 */}
                            <View style={[
                                styles.summaryCard,
                                preview.isFullRefund
                                    ? { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }
                                    : { backgroundColor: COLORS.gray[50], borderColor: COLORS.gray[200] },
                            ]}>
                                <View style={styles.summaryHeader}>
                                    <Ionicons
                                        name={preview.isFullRefund ? "checkmark-circle" : "information-circle"}
                                        size={20}
                                        color={preview.isFullRefund ? "#059669" : COLORS.gray[600]}
                                    />
                                    <Text style={[
                                        styles.summaryHeaderText,
                                        { color: preview.isFullRefund ? "#065F46" : COLORS.gray[700] },
                                    ]}>
                                        {preview.isFullRefund ? "24시간 이내 — 전액 환불" : "비율 환불"}
                                    </Text>
                                </View>
                                <Text style={styles.summaryAmount}>
                                    {preview.refundableAmount.toLocaleString()}원
                                </Text>
                                <Text style={styles.summarySub}>
                                    원 결제액 {preview.originalAmount.toLocaleString()}원 중
                                </Text>
                            </View>

                            {/* 세부 내역 */}
                            <View style={styles.detailCard}>
                                <DetailRow
                                    label="사용 일수"
                                    value={`${preview.daysUsed}일 / ${preview.daysTotal}일`}
                                />
                                <DetailRow
                                    label="잔여 일수"
                                    value={`${preview.daysRemaining}일`}
                                />
                                {typeof preview.grossRefund === "number" && preview.grossRefund !== preview.refundableAmount && (
                                    <DetailRow
                                        label="비율 환불액"
                                        value={`${preview.grossRefund.toLocaleString()}원`}
                                    />
                                )}
                                {typeof preview.videoDeduction === "number" && preview.videoDeduction > 0 && (
                                    <DetailRow
                                        label={`AI 영상 사용 (${preview.videosUsedCharged ?? 0}건)`}
                                        value={`-${preview.videoDeduction.toLocaleString()}원`}
                                        valueColor="#DC2626"
                                    />
                                )}
                                <View style={styles.divider} />
                                <DetailRow
                                    label="최종 환불액"
                                    value={`${preview.refundableAmount.toLocaleString()}원`}
                                    bold
                                    valueColor={accentColor}
                                />
                            </View>

                            {/* 안내 */}
                            <View style={styles.notice}>
                                <Text style={styles.noticeText}>
                                    {preview.isFullRefund
                                        ? "결제 후 24시간 이내라 전액 환불됩니다."
                                        : "사용한 일수 비율로 계산해 환불됩니다. AI 영상을 사용한 경우 건당 3,500원이 차감돼요."}
                                </Text>
                                <Text style={[styles.noticeText, { marginTop: 6, color: COLORS.gray[500] }]}>
                                    환불은 영업일 기준 3-5일 안에 결제 카드로 입금됩니다.
                                </Text>
                            </View>

                            {preview.note && (
                                <Text style={styles.noteText}>{preview.note}</Text>
                            )}
                        </>
                    ) : null}
                </ScrollView>

                {/* 하단 액션 */}
                <View style={[
                    styles.footer,
                    { paddingBottom: 12 + Math.max(insets.bottom, 0) },
                ]}>
                    <TouchableOpacity
                        onPress={onClose}
                        disabled={cancelling}
                        style={[styles.btn, styles.btnSecondary]}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.btnSecondaryText}>유지하기</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={confirmCancel}
                        disabled={cancelling || loading || !!error}
                        style={[
                            styles.btn,
                            { backgroundColor: cancelling || loading || error ? COLORS.gray[200] : "#EF4444" },
                        ]}
                        activeOpacity={0.85}
                    >
                        {cancelling ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.btnDangerText}>해지하기</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </Modal>
    );
}

function DetailRow({
    label, value, bold, valueColor,
}: { label: string; value: string; bold?: boolean; valueColor?: string }) {
    return (
        <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, bold && { fontWeight: "700", color: COLORS.gray[800] }]}>
                {label}
            </Text>
            <Text style={[
                styles.detailValue,
                bold && { fontSize: 16, fontWeight: "700" },
                valueColor && { color: valueColor },
            ]}>
                {value}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1, backgroundColor: COLORS.white },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.gray[100],
    },
    headerBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
    headerTitle: { flex: 1, fontSize: 17, fontWeight: "700", color: COLORS.gray[900], textAlign: "center" },
    body: { padding: 20 },
    center: { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 12 },
    loadingText: { fontSize: 13, color: COLORS.gray[500] },
    errorText: { fontSize: 13, color: COLORS.gray[600], textAlign: "center" },
    summaryCard: {
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 16,
    },
    summaryHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
    summaryHeaderText: { fontSize: 13, fontWeight: "700" },
    summaryAmount: { fontSize: 32, fontWeight: "800", color: COLORS.gray[900] },
    summarySub: { fontSize: 12, color: COLORS.gray[500], marginTop: 4 },
    detailCard: {
        padding: 16,
        borderRadius: 12,
        backgroundColor: COLORS.gray[50],
        borderWidth: 1,
        borderColor: COLORS.gray[100],
        marginBottom: 16,
    },
    detailRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 6,
    },
    detailLabel: { fontSize: 13, color: COLORS.gray[600] },
    detailValue: { fontSize: 13, fontWeight: "600", color: COLORS.gray[800] },
    divider: { height: 1, backgroundColor: COLORS.gray[200], marginVertical: 8 },
    notice: {
        padding: 14,
        borderRadius: 12,
        backgroundColor: "#FEF3C7",
        borderWidth: 1,
        borderColor: "#FDE68A",
        marginBottom: 12,
    },
    noticeText: { fontSize: 12, color: "#78350F", lineHeight: 18 },
    noteText: { fontSize: 11, color: COLORS.gray[500], textAlign: "center", marginTop: 8 },
    footer: {
        flexDirection: "row",
        gap: 10,
        paddingHorizontal: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.gray[100],
        backgroundColor: COLORS.white,
    },
    btn: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    btnSecondary: {
        backgroundColor: COLORS.gray[100],
    },
    btnSecondaryText: { fontSize: 15, fontWeight: "700", color: COLORS.gray[700] },
    btnDangerText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
