/**
 * PayMethodPicker — 결제 수단 선택 모달
 *
 * GET /api/payments/available-methods 응답 기반으로 사용 가능한 수단만 노출.
 * 현재 활성: 카드(KCP). 다날 채널 등록 시 휴대폰 자동 추가.
 */

import { useEffect, useState } from "react";
import { View, Text, Modal, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useDarkMode } from "@/contexts/ThemeContext";
import { COLORS } from "@/lib/theme";
import { API_BASE_URL } from "@/config/constants";
import type { PayMethod } from "./PaymentWebViewModal";

interface Props {
    visible: boolean;
    onClose: () => void;
    onPick: (method: PayMethod) => void;
    accentColor: string;
    /** 결제 금액 표시 (선택) */
    amountKRW?: number;
    /** 상품명 (선택) */
    title?: string;
}

interface MethodOption {
    id: PayMethod;
    label: string;
    sub: string;
    icon: React.ComponentProps<typeof Ionicons>["name"];
    color: string;
    bgColor: string;
}

// 카탈로그 — 서버가 활성화한 항목만 실제로 노출됨
const METHOD_CATALOG: Record<string, MethodOption> = {
    card: {
        id: "card",
        label: "신용/체크카드",
        sub: "안심클릭 · ISP",
        icon: "card-outline",
        color: "#1E40AF",
        bgColor: "#DBEAFE",
    },
    phone: {
        id: "phone",
        label: "휴대폰 결제",
        sub: "통신사 소액결제 (다날)",
        icon: "phone-portrait-outline",
        color: "#7C3AED",
        bgColor: "#EDE9FE",
    },
    trans: {
        id: "trans",
        label: "실시간 계좌이체",
        sub: "은행 계좌에서 즉시",
        icon: "swap-horizontal-outline",
        color: "#0891B2",
        bgColor: "#CFFAFE",
    },
    vbank: {
        id: "vbank",
        label: "가상계좌",
        sub: "발급된 계좌로 입금",
        icon: "business-outline",
        color: "#92400E",
        bgColor: "#FEF3C7",
    },
};

export default function PayMethodPicker({ visible, onClose, onPick, accentColor, amountKRW, title }: Props) {
    const insets = useSafeAreaInsets();
    const { isDarkMode } = useDarkMode();

    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.gray[50];
    const cardBg = isDarkMode ? COLORS.gray[900] : COLORS.white;
    const textColor = isDarkMode ? COLORS.white : COLORS.gray[900];
    const subColor = isDarkMode ? COLORS.gray[400] : COLORS.gray[500];

    void accentColor;

    // 서버가 활성화한 결제 수단 목록 fetch (모달 열릴 때 1회)
    const [available, setAvailable] = useState<string[] | null>(null);
    useEffect(() => {
        if (!visible) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/payments/available-methods`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                if (!cancelled && Array.isArray(data?.methods)) {
                    setAvailable(data.methods);
                }
            } catch {
                // 실패 시 기본값(card만) — 서비스 다운 fallback
                if (!cancelled) setAvailable(["card"]);
            }
        })();
        return () => { cancelled = true; };
    }, [visible]);

    // 카탈로그에서 활성화된 항목만 추출
    const methods: MethodOption[] = (available ?? [])
        .map((id) => METHOD_CATALOG[id])
        .filter((m): m is MethodOption => !!m);

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
            <View style={styles.backdrop}>
                <SafeAreaView style={[styles.sheet, { backgroundColor: bgColor }]} edges={["bottom"]}>
                    <View style={styles.handle} />

                    {/* 헤더 */}
                    <View style={styles.header}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.headerTitle, { color: textColor }]}>
                                결제 수단 선택
                            </Text>
                            {(title || amountKRW) && (
                                <Text style={[styles.headerSub, { color: subColor }]}>
                                    {title ?? ""}{amountKRW ? ` · ${amountKRW.toLocaleString()}원` : ""}
                                </Text>
                            )}
                        </View>
                        <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.closeBtn}>
                            <Ionicons name="close" size={22} color={textColor} />
                        </TouchableOpacity>
                    </View>

                    {/* 메소드 목록 */}
                    <View style={[styles.list, { paddingBottom: 16 + insets.bottom }]}>
                        {available === null ? (
                            <View style={{ alignItems: "center", paddingVertical: 32 }}>
                                <ActivityIndicator size="small" color={COLORS.memento[500]} />
                            </View>
                        ) : methods.length === 0 ? (
                            <Text style={{ color: subColor, textAlign: "center", paddingVertical: 24 }}>
                                현재 사용 가능한 결제 수단이 없어요.{"\n"}잠시 후 다시 시도해주세요.
                            </Text>
                        ) : methods.map((m) => (
                            <TouchableOpacity
                                key={m.id}
                                onPress={() => onPick(m.id)}
                                style={[styles.row, { backgroundColor: cardBg }]}
                                activeOpacity={0.85}
                            >
                                <View style={[styles.iconWrap, { backgroundColor: m.bgColor }]}>
                                    <Ionicons name={m.icon} size={20} color={m.color} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.rowLabel, { color: textColor }]}>{m.label}</Text>
                                    <Text style={[styles.rowSub, { color: subColor }]}>{m.sub}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={COLORS.gray[400]} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </SafeAreaView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    sheet: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: COLORS.gray[300],
        borderRadius: 2,
        alignSelf: "center",
        marginTop: 8,
        marginBottom: 8,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 16,
    },
    headerTitle: { fontSize: 17, fontWeight: "700" },
    headerSub: { fontSize: 12, marginTop: 2 },
    closeBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
    list: { paddingHorizontal: 16, gap: 8 },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderRadius: 12,
    },
    iconWrap: {
        width: 40, height: 40, borderRadius: 10,
        alignItems: "center", justifyContent: "center",
    },
    rowLabel: { fontSize: 14, fontWeight: "600" },
    rowSub: { fontSize: 11, marginTop: 2 },
});
