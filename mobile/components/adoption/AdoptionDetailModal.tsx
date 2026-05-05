/**
 * AdoptionDetailModal — 입양 동물 상세 풀스크린 모달
 *
 * - 큰 이미지 + 동물 정보 풀 + 공고 정보 + 보호소 정보(전화 걸기)
 * - 공유 (Share API): 이미지 URL + 동물 정보
 */

import {
    View, Text, Modal, TouchableOpacity, ScrollView,
    Image, StyleSheet, Linking, Share, Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/theme";
import { useDarkMode } from "@/contexts/ThemeContext";
import type { AdoptionAnimal } from "@/types";

interface Props {
    visible: boolean;
    onClose: () => void;
    animal: AdoptionAnimal | null;
}

export default function AdoptionDetailModal({ visible, onClose, animal }: Props) {
    const insets = useSafeAreaInsets();
    const { isDarkMode } = useDarkMode();

    if (!animal) return null;

    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.white;
    const cardBg = isDarkMode ? COLORS.gray[900] : COLORS.gray[50];
    const borderColor = isDarkMode ? COLORS.gray[800] : COLORS.gray[100];
    const textColor = isDarkMode ? COLORS.white : COLORS.gray[900];
    const labelColor = isDarkMode ? COLORS.gray[400] : COLORS.gray[500];

    const isAvailable = animal.status === "공고중" || animal.status === "보호중";
    const imageUri = animal.imageUrl ?? animal.thumbnailUrl;

    function callShelter() {
        if (!animal?.shelterTel) return;
        const tel = animal.shelterTel.replace(/[^0-9+]/g, "");
        Linking.openURL(`tel:${tel}`).catch(() =>
            Alert.alert("전화 실패", "전화 앱을 열 수 없어요."),
        );
    }

    async function handleShare() {
        if (!animal) return;
        const lines = [
            `${animal.kind ?? ""} ${animal.breed ?? ""} 입양 정보`,
            animal.gender ? `성별: ${animal.gender}` : null,
            animal.age ? `나이: ${animal.age}` : null,
            animal.color ? `털색: ${animal.color}` : null,
            animal.specialMark ? `특이사항: ${animal.specialMark}` : null,
            animal.shelterName ? `보호소: ${animal.shelterName}` : null,
            animal.shelterTel ? `연락처: ${animal.shelterTel}` : null,
            animal.shelterAddr ? `주소: ${animal.shelterAddr}` : null,
        ].filter(Boolean).join("\n");
        try {
            await Share.share({
                message: lines + (imageUri ? `\n\n${imageUri}` : ""),
                title: `${animal.kind ?? "동물"} 입양 정보`,
            });
        } catch {
            // 사용자 취소 — 무시
        }
    }

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
                <View style={[styles.header, { borderBottomColor: borderColor }]}>
                    <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.headerBtn}>
                        <Ionicons name="close" size={24} color={textColor} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: textColor }]} numberOfLines={1}>
                        {animal.kind ?? "동물"} 상세
                    </Text>
                    <TouchableOpacity onPress={handleShare} hitSlop={8} style={styles.headerBtn}>
                        <Ionicons name="share-outline" size={22} color={textColor} />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={{ paddingBottom: 16 + insets.bottom }} showsVerticalScrollIndicator={false}>
                    {/* 큰 이미지 */}
                    {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.heroImage} resizeMode="cover" />
                    ) : (
                        <View style={[styles.heroImage, styles.imagePlaceholder, { backgroundColor: cardBg }]}>
                            <Ionicons name="paw" size={64} color={COLORS.gray[300]} />
                        </View>
                    )}

                    {/* 상태 */}
                    <View style={styles.statusRow}>
                        {isAvailable && (
                            <View style={styles.statusBadge}>
                                <View style={styles.statusDot} />
                                <Text style={styles.statusText}>{animal.status}</Text>
                            </View>
                        )}
                        {animal.kind && (
                            <View style={[styles.kindBadge, { backgroundColor: COLORS.memento[100] }]}>
                                <Text style={styles.kindBadgeText}>{animal.kind}</Text>
                            </View>
                        )}
                    </View>

                    {/* 동물 정보 */}
                    <Section title="동물 정보" labelColor={labelColor} cardBg={cardBg} borderColor={borderColor}>
                        <InfoRow label="품종" value={animal.breed} textColor={textColor} labelColor={labelColor} />
                        <InfoRow label="성별" value={animal.gender} textColor={textColor} labelColor={labelColor} />
                        <InfoRow label="나이" value={animal.age} textColor={textColor} labelColor={labelColor} />
                        <InfoRow label="체중" value={animal.weight} textColor={textColor} labelColor={labelColor} />
                        <InfoRow label="털색" value={animal.color} textColor={textColor} labelColor={labelColor} />
                        <InfoRow label="중성화" value={animal.neutered} textColor={textColor} labelColor={labelColor} />
                        {animal.specialMark && (
                            <View style={{ marginTop: 8 }}>
                                <Text style={[styles.label, { color: labelColor }]}>특이사항</Text>
                                <Text style={[styles.bodyText, { color: textColor }]}>{animal.specialMark}</Text>
                            </View>
                        )}
                    </Section>

                    {/* 공고 정보 */}
                    {(animal.noticeNo || animal.noticeStart || animal.noticeEnd) && (
                        <Section title="공고 정보" labelColor={labelColor} cardBg={cardBg} borderColor={borderColor}>
                            <InfoRow label="공고번호" value={animal.noticeNo} textColor={textColor} labelColor={labelColor} />
                            <InfoRow label="공고기간" value={
                                [animal.noticeStart, animal.noticeEnd].filter(Boolean).join(" ~ ") || undefined
                            } textColor={textColor} labelColor={labelColor} />
                            <InfoRow label="발견일" value={animal.foundDate} textColor={textColor} labelColor={labelColor} />
                            <InfoRow label="발견장소" value={animal.foundPlace} textColor={textColor} labelColor={labelColor} />
                        </Section>
                    )}

                    {/* 보호소 정보 */}
                    {(animal.shelterName || animal.shelterTel || animal.shelterAddr) && (
                        <Section title="보호소" labelColor={labelColor} cardBg={cardBg} borderColor={borderColor}>
                            <InfoRow label="이름" value={animal.shelterName} textColor={textColor} labelColor={labelColor} />
                            <InfoRow label="주소" value={animal.shelterAddr} textColor={textColor} labelColor={labelColor} />
                            {animal.shelterTel && (
                                <TouchableOpacity onPress={callShelter} style={styles.callBtn} activeOpacity={0.85}>
                                    <Ionicons name="call" size={16} color="#fff" />
                                    <Text style={styles.callBtnText}>{animal.shelterTel}로 전화</Text>
                                </TouchableOpacity>
                            )}
                        </Section>
                    )}
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
}

function Section({
    title, labelColor, cardBg, borderColor, children,
}: {
    title: string;
    labelColor: string;
    cardBg: string;
    borderColor: string;
    children: React.ReactNode;
}) {
    return (
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
            <Text style={[styles.sectionTitle, { color: labelColor }]}>{title}</Text>
            <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor }]}>
                {children}
            </View>
        </View>
    );
}

function InfoRow({
    label, value, textColor, labelColor,
}: { label: string; value?: string; textColor: string; labelColor: string }) {
    if (!value) return null;
    return (
        <View style={styles.infoRow}>
            <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
            <Text style={[styles.value, { color: textColor }]}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    headerBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
    headerTitle: { flex: 1, fontSize: 17, fontWeight: "700", textAlign: "center" },
    heroImage: { width: "100%", aspectRatio: 1.2 },
    imagePlaceholder: { alignItems: "center", justifyContent: "center" },
    statusRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, marginTop: 16 },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: "#10B98115",
        borderRadius: 9999,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#10B981" },
    statusText: { fontSize: 11, fontWeight: "700", color: "#059669" },
    kindBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
    kindBadgeText: { fontSize: 11, fontWeight: "700", color: COLORS.memento[700] },
    sectionTitle: {
        fontSize: 12, fontWeight: "700",
        textTransform: "uppercase", letterSpacing: 0.5,
        marginBottom: 8, paddingHorizontal: 4,
    },
    sectionCard: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 8,
        gap: 12,
    },
    label: { fontSize: 12, fontWeight: "600" },
    value: { fontSize: 13, fontWeight: "600", flex: 1, textAlign: "right" },
    bodyText: { fontSize: 13, lineHeight: 20, marginTop: 4 },
    callBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        marginTop: 12,
        backgroundColor: COLORS.memento[500],
        paddingVertical: 12,
        borderRadius: 12,
    },
    callBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
