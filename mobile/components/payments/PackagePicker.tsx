/**
 * PackagePicker — AI 영상 묶음 사이즈 선택 picker
 *
 * 1회 / 5회 / 10회 옵션을 BottomSheet 형태로 보여주고,
 * 선택 시 onPick(size) 호출 후 자동 닫힘.
 *
 * 가격은 config/constants.ts의 VIDEO에서 가져옴.
 */

import {
    View, Text, Modal, TouchableOpacity, StyleSheet, Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/theme";
import { VIDEO } from "@/config/constants";

type PackageSize = 1 | 5 | 10;

interface PackageOption {
    size: PackageSize;
    label: string;
    price: number;
    perVideo: number;
    badge?: string;
}

const OPTIONS: PackageOption[] = [
    { size: 1, label: "AI 영상 1회권", price: VIDEO.SINGLE_PRICE, perVideo: VIDEO.SINGLE_PRICE },
    {
        size: 5,
        label: "AI 영상 5회 묶음",
        price: VIDEO.BUNDLE_5_PRICE,
        perVideo: Math.round(VIDEO.BUNDLE_5_PRICE / 5),
        badge: "인기",
    },
    {
        size: 10,
        label: "AI 영상 10회 묶음",
        price: VIDEO.BUNDLE_10_PRICE,
        perVideo: Math.round(VIDEO.BUNDLE_10_PRICE / 10),
        badge: "최대 할인",
    },
];

interface Props {
    visible: boolean;
    onClose: () => void;
    onPick: (size: PackageSize) => void;
    accentColor: string;
    isDarkMode: boolean;
}

export default function PackagePicker({ visible, onClose, onPick, accentColor, isDarkMode }: Props) {
    const bgColor = isDarkMode ? COLORS.gray[900] : COLORS.white;
    const cardBg = isDarkMode ? COLORS.gray[800] : "#F9FAFB";
    const borderColor = isDarkMode ? COLORS.gray[700] : COLORS.gray[200];
    const textColor = isDarkMode ? COLORS.white : COLORS.gray[900];
    const subColor = COLORS.gray[500];

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
            <View style={styles.overlay}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                <View style={[styles.sheet, { backgroundColor: bgColor }]}>
                    {/* 헤더 */}
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: textColor }]}>몇 회권으로 만드시겠어요?</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.closeBtn}>
                            <Ionicons name="close" size={22} color={subColor} />
                        </TouchableOpacity>
                    </View>
                    <Text style={[styles.subtitle, { color: subColor }]}>
                        많이 살수록 영상당 단가가 저렴해요
                    </Text>

                    {/* 옵션 카드 */}
                    <View style={styles.list}>
                        {OPTIONS.map((opt) => {
                            const discount = opt.size === 1
                                ? 0
                                : Math.round((1 - opt.perVideo / VIDEO.SINGLE_PRICE) * 100);
                            return (
                                <TouchableOpacity
                                    key={opt.size}
                                    onPress={() => onPick(opt.size)}
                                    style={[styles.card, { backgroundColor: cardBg, borderColor }]}
                                    activeOpacity={0.85}
                                >
                                    {opt.badge && (
                                        <View style={[styles.badge, { backgroundColor: accentColor }]}>
                                            <Text style={styles.badgeText}>{opt.badge}</Text>
                                        </View>
                                    )}
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.optLabel, { color: textColor }]}>{opt.label}</Text>
                                        {opt.size > 1 && (
                                            <Text style={[styles.optSub, { color: subColor }]}>
                                                영상당 {opt.perVideo.toLocaleString()}원
                                            </Text>
                                        )}
                                    </View>
                                    <View style={styles.priceCol}>
                                        <Text style={[styles.price, { color: accentColor }]}>
                                            {opt.price.toLocaleString()}원
                                        </Text>
                                        {discount > 0 && (
                                            <Text style={styles.discount}>{discount}% 할인</Text>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 36,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 4,
    },
    title: { fontSize: 16, fontWeight: "800" },
    subtitle: { fontSize: 12, marginBottom: 16 },
    closeBtn: { padding: 4 },
    list: { gap: 10 },
    card: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 16,
        borderRadius: 14,
        borderWidth: 1,
        position: "relative",
    },
    badge: {
        position: "absolute",
        top: -8,
        right: 14,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 9999,
    },
    badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
    optLabel: { fontSize: 14, fontWeight: "700" },
    optSub: { fontSize: 11, marginTop: 2 },
    priceCol: { alignItems: "flex-end" },
    price: { fontSize: 16, fontWeight: "800" },
    discount: { fontSize: 10, color: "#EF4444", fontWeight: "700", marginTop: 2 },
});
