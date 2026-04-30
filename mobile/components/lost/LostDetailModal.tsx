/**
 * LostDetailModal — 분실/발견 동물 상세 풀스크린 모달
 *
 * - 큰 이미지 + 분실/발견 정보 + 위치 + 사례금(분실만) + 연락처 전화 + 공유
 */

import {
    View, Text, Modal, TouchableOpacity, ScrollView,
    Image, StyleSheet, Linking, Share, Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/theme";
import { useDarkMode } from "@/contexts/ThemeContext";
import type { LostPet } from "@/types";

interface Props {
    visible: boolean;
    onClose: () => void;
    post: LostPet | null;
}

export default function LostDetailModal({ visible, onClose, post }: Props) {
    const insets = useSafeAreaInsets();
    const { isDarkMode } = useDarkMode();

    if (!post) return null;

    const isLost = post.type === "lost";
    const accent = isLost ? "#EF4444" : COLORS.memento[500];
    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.white;
    const cardBg = isDarkMode ? COLORS.gray[900] : COLORS.gray[50];
    const borderColor = isDarkMode ? COLORS.gray[800] : COLORS.gray[100];
    const textColor = isDarkMode ? COLORS.white : COLORS.gray[900];
    const labelColor = isDarkMode ? COLORS.gray[400] : COLORS.gray[500];

    function callContact() {
        if (!post?.contact) return;
        const tel = post.contact.replace(/[^0-9+]/g, "");
        Linking.openURL(`tel:${tel}`).catch(() =>
            Alert.alert("전화 실패", "전화 앱을 열 수 없어요."),
        );
    }

    async function handleShare() {
        if (!post) return;
        const lines = [
            `[${isLost ? "분실" : "발견"}] ${post.title}`,
            post.petType ? `종: ${post.petType}` : null,
            post.breed ? `품종: ${post.breed}` : null,
            post.color ? `털색: ${post.color}` : null,
            (post.region || post.district) ? `위치: ${[post.region, post.district].filter(Boolean).join(" ")}` : null,
            post.locationDetail ? `상세: ${post.locationDetail}` : null,
            post.date ? `${isLost ? "분실일" : "발견일"}: ${post.date}` : null,
            post.contact ? `연락처: ${post.contact}` : null,
            post.reward ? `사례금: ${post.reward}` : null,
        ].filter(Boolean).join("\n");
        try {
            await Share.share({
                message: lines + (post.imageUrl ? `\n\n${post.imageUrl}` : ""),
                title: post.title,
            });
        } catch {
            // 사용자 취소
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
                        {isLost ? "분실 신고" : "발견 신고"}
                    </Text>
                    <TouchableOpacity onPress={handleShare} hitSlop={8} style={styles.headerBtn}>
                        <Ionicons name="share-outline" size={22} color={textColor} />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={{ paddingBottom: 16 + insets.bottom }} showsVerticalScrollIndicator={false}>
                    {post.imageUrl ? (
                        <Image source={{ uri: post.imageUrl }} style={styles.heroImage} resizeMode="cover" />
                    ) : (
                        <View style={[styles.heroImage, styles.imagePlaceholder, { backgroundColor: cardBg }]}>
                            <Ionicons name="paw" size={64} color={COLORS.gray[300]} />
                        </View>
                    )}

                    <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
                        <View style={styles.titleRow}>
                            <View style={[styles.typeBadge, { backgroundColor: accent + "20" }]}>
                                <Text style={[styles.typeBadgeText, { color: accent }]}>
                                    {isLost ? "분실" : "발견"}
                                </Text>
                            </View>
                            {post.petType && (
                                <View style={[styles.kindBadge, { backgroundColor: cardBg }]}>
                                    <Text style={[styles.kindBadgeText, { color: labelColor }]}>{post.petType}</Text>
                                </View>
                            )}
                        </View>
                        <Text style={[styles.title, { color: textColor }]}>{post.title}</Text>
                    </View>

                    <Section title="기본 정보" labelColor={labelColor} cardBg={cardBg} borderColor={borderColor}>
                        <InfoRow label="품종" value={post.breed} textColor={textColor} labelColor={labelColor} />
                        <InfoRow label="털색" value={post.color} textColor={textColor} labelColor={labelColor} />
                        <InfoRow label="성별" value={post.gender} textColor={textColor} labelColor={labelColor} />
                        <InfoRow label="나이" value={post.age} textColor={textColor} labelColor={labelColor} />
                        <InfoRow label={isLost ? "분실일" : "발견일"} value={post.date} textColor={textColor} labelColor={labelColor} />
                    </Section>

                    {(post.region || post.district || post.locationDetail) && (
                        <Section title="위치" labelColor={labelColor} cardBg={cardBg} borderColor={borderColor}>
                            <InfoRow label="시/도" value={post.region} textColor={textColor} labelColor={labelColor} />
                            <InfoRow label="구/군" value={post.district} textColor={textColor} labelColor={labelColor} />
                            <InfoRow label="상세" value={post.locationDetail} textColor={textColor} labelColor={labelColor} />
                        </Section>
                    )}

                    {post.description && (
                        <Section title="설명" labelColor={labelColor} cardBg={cardBg} borderColor={borderColor}>
                            <Text style={[styles.bodyText, { color: textColor }]}>{post.description}</Text>
                        </Section>
                    )}

                    {(post.contact || post.reward) && (
                        <Section title="연락" labelColor={labelColor} cardBg={cardBg} borderColor={borderColor}>
                            {isLost && post.reward && (
                                <View style={[styles.rewardCard, { borderColor: accent }]}>
                                    <Ionicons name="gift" size={16} color={accent} />
                                    <Text style={[styles.rewardText, { color: accent }]}>사례금: {post.reward}</Text>
                                </View>
                            )}
                            {post.contact && (
                                <TouchableOpacity onPress={callContact} style={[styles.callBtn, { backgroundColor: accent }]} activeOpacity={0.85}>
                                    <Ionicons name="call" size={16} color="#fff" />
                                    <Text style={styles.callBtnText}>{post.contact}</Text>
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
    title: string; labelColor: string; cardBg: string; borderColor: string; children: React.ReactNode;
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
        flexDirection: "row", alignItems: "center", gap: 8,
        paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1,
    },
    headerBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
    headerTitle: { flex: 1, fontSize: 17, fontWeight: "700", textAlign: "center" },
    heroImage: { width: "100%", aspectRatio: 1.2 },
    imagePlaceholder: { alignItems: "center", justifyContent: "center" },
    titleRow: { flexDirection: "row", gap: 6, marginBottom: 8 },
    typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
    typeBadgeText: { fontSize: 11, fontWeight: "700" },
    kindBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
    kindBadgeText: { fontSize: 11, fontWeight: "600" },
    title: { fontSize: 22, fontWeight: "800", lineHeight: 30 },
    sectionTitle: {
        fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5,
        marginBottom: 8, paddingHorizontal: 4,
    },
    sectionCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
    infoRow: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingVertical: 8, gap: 12,
    },
    label: { fontSize: 12, fontWeight: "600" },
    value: { fontSize: 13, fontWeight: "600", flex: 1, textAlign: "right" },
    bodyText: { fontSize: 13, lineHeight: 22 },
    rewardCard: {
        flexDirection: "row", alignItems: "center", gap: 6,
        paddingHorizontal: 12, paddingVertical: 10,
        borderRadius: 10, borderWidth: 1, marginBottom: 10,
    },
    rewardText: { fontSize: 13, fontWeight: "700" },
    callBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
        paddingVertical: 12, borderRadius: 12,
    },
    callBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
