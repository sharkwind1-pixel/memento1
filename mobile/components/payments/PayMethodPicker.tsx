/**
 * PayMethodPicker — 결제 수단 선택 모달
 *
 * 단건 결제 진입 전에 사용자가 결제 수단을 고르는 단계.
 * KCP가 지원하는 메소드만 노출:
 *  - 신용/체크카드 (안심클릭/ISP)
 *  - 휴대폰 소액결제
 *  - 실시간 계좌이체
 *  - 카카오페이
 *  - 토스페이
 *  - 네이버페이
 */

import { View, Text, Modal, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useDarkMode } from "@/contexts/ThemeContext";
import { COLORS } from "@/lib/theme";
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

// 현재 KCP 가맹 계약은 신용/체크카드만 활성화 (M025: 미가입 가맹점).
// 휴대폰결제/계좌이체/가상계좌는 KCP에 별도 심사·계약 추가하면 다시 노출 가능.
// 카카오페이/토스페이 등 간편결제는 PortOne 콘솔에서 PG 채널 추가 후 가능.
const METHODS: MethodOption[] = [
    {
        id: "card",
        label: "신용/체크카드",
        sub: "안심클릭 · ISP",
        icon: "card-outline",
        color: "#1E40AF",
        bgColor: "#DBEAFE",
    },
];

export default function PayMethodPicker({ visible, onClose, onPick, accentColor, amountKRW, title }: Props) {
    const insets = useSafeAreaInsets();
    const { isDarkMode } = useDarkMode();

    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.gray[50];
    const cardBg = isDarkMode ? COLORS.gray[900] : COLORS.white;
    const textColor = isDarkMode ? COLORS.white : COLORS.gray[900];
    const subColor = isDarkMode ? COLORS.gray[400] : COLORS.gray[500];

    void accentColor;

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
                        {METHODS.map((m) => (
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
