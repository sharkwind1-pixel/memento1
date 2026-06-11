/**
 * PethomeStartGuideModal — 새 유저 펫홈 시작 가이드
 * 웹 src/components/features/minihompy/PethomeStartGuideModal.tsx 1:1 이식.
 * 빈 펫홈에서 "펫홈 꾸미러 가기" → 펫홈이 무엇인지 + 꾸미는 3단계 설명 → 상점 안내.
 */

import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/theme";

const STEPS = [
    { icon: "storefront" as const, title: "꼬미 데려오기", desc: "상점에서 우리 아이를 닮은 꼬미를 데려와요" },
    { icon: "location" as const, title: "펫홈에 배치하기", desc: "꼬미와 가구를 원하는 자리에 놓아요" },
    { icon: "chatbubbles" as const, title: "배경·인사말로 꾸미기", desc: "배경을 바꾸고 인사말을 남겨 나만의 공간으로" },
];

interface Props {
    visible: boolean;
    onClose: () => void;
    onStart: () => void;
    accentColor: string;
    isDark?: boolean;
}

export default function PethomeStartGuideModal({ visible, onClose, onStart, accentColor, isDark = false }: Props) {
    const cardBg = isDark ? COLORS.gray[900] : "#fff";
    const titleColor = isDark ? COLORS.white : COLORS.gray[900];

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Pressable style={[styles.card, { backgroundColor: cardBg }]} onPress={() => {}}>
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={8}>
                        <Ionicons name="close" size={20} color={COLORS.gray[400]} />
                    </TouchableOpacity>

                    <View style={[styles.iconCircle, { backgroundColor: accentColor + "20" }]}>
                        <Ionicons name="sparkles" size={24} color={accentColor} />
                    </View>
                    <Text style={[styles.title, { color: titleColor }]}>펫홈을 꾸며볼까요?</Text>
                    <Text style={styles.sub}>우리 아이의 공간이에요. 세 단계로 시작해요</Text>

                    <View style={styles.steps}>
                        {STEPS.map((s, i) => (
                            <View key={i} style={styles.stepRow}>
                                <View style={[styles.stepIcon, { backgroundColor: accentColor + "15" }]}>
                                    <Ionicons name={s.icon} size={16} color={accentColor} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.stepTitle, { color: titleColor }]}>{i + 1}. {s.title}</Text>
                                    <Text style={styles.stepDesc}>{s.desc}</Text>
                                </View>
                            </View>
                        ))}
                    </View>

                    <TouchableOpacity style={[styles.cta, { backgroundColor: accentColor }]} onPress={onStart} activeOpacity={0.85}>
                        <Ionicons name="storefront" size={16} color="#fff" />
                        <Text style={styles.ctaText}>상점에서 꼬미 데려오기</Text>
                    </TouchableOpacity>
                    <Text style={styles.hint}>포인트는 출석·활동으로 모을 수 있어요</Text>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
    },
    card: {
        width: "100%",
        maxWidth: 360,
        borderRadius: 20,
        padding: 24,
    },
    closeBtn: { position: "absolute", top: 12, right: 12, zIndex: 2 },
    iconCircle: {
        width: 48, height: 48, borderRadius: 24,
        alignItems: "center", justifyContent: "center",
        alignSelf: "center", marginBottom: 12,
    },
    title: { fontSize: 18, fontWeight: "800", textAlign: "center" },
    sub: { fontSize: 13, color: COLORS.gray[500], textAlign: "center", marginTop: 4, marginBottom: 20 },
    steps: { gap: 12, marginBottom: 24 },
    stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    stepIcon: {
        width: 32, height: 32, borderRadius: 8,
        alignItems: "center", justifyContent: "center",
    },
    stepTitle: { fontSize: 14, fontWeight: "700" },
    stepDesc: { fontSize: 12, color: COLORS.gray[500], marginTop: 2, lineHeight: 17 },
    cta: {
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
        paddingVertical: 14, borderRadius: 14,
    },
    ctaText: { color: "#fff", fontSize: 15, fontWeight: "700" },
    hint: { fontSize: 11, color: COLORS.gray[400], textAlign: "center", marginTop: 8 },
});
