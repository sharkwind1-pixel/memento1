/**
 * LocalDetailModal — 지역정보 게시글 상세 풀스크린 모달
 *
 * - 큰 이미지 (있을 때만) + 카테고리/뱃지 + 제목 + 위치 + 본문 + 공유
 */

import {
    View, Text, Modal, TouchableOpacity, ScrollView,
    Image, StyleSheet, Share,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/theme";
import { useDarkMode } from "@/contexts/ThemeContext";
import type { LocalPost, LocalPostCategory } from "@/types";

const CATEGORY_LABELS: Record<LocalPostCategory, string> = {
    hospital: "동물병원",
    walk:     "산책길",
    share:    "나눔",
    trade:    "거래",
    meet:     "모임",
    place:    "장소",
};

const CATEGORY_ICONS: Record<LocalPostCategory, React.ComponentProps<typeof Ionicons>["name"]> = {
    hospital: "medkit-outline",
    walk:     "walk-outline",
    share:    "gift-outline",
    trade:    "swap-horizontal-outline",
    meet:     "people-outline",
    place:    "location-outline",
};

interface Props {
    visible: boolean;
    onClose: () => void;
    post: LocalPost | null;
}

export default function LocalDetailModal({ visible, onClose, post }: Props) {
    const insets = useSafeAreaInsets();
    const { isDarkMode } = useDarkMode();

    if (!post) return null;

    const accent = "#8B5CF6";
    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.white;
    const cardBg = isDarkMode ? COLORS.gray[900] : COLORS.gray[50];
    const borderColor = isDarkMode ? COLORS.gray[800] : COLORS.gray[100];
    const textColor = isDarkMode ? COLORS.white : COLORS.gray[900];
    const labelColor = isDarkMode ? COLORS.gray[400] : COLORS.gray[500];

    async function handleShare() {
        if (!post) return;
        const lines = [
            `[${CATEGORY_LABELS[post.category] ?? "지역정보"}] ${post.title}`,
            (post.region || post.district) ? `위치: ${[post.region, post.district].filter(Boolean).join(" ")}` : null,
            post.content ? `\n${post.content}` : null,
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
                        지역정보
                    </Text>
                    <TouchableOpacity onPress={handleShare} hitSlop={8} style={styles.headerBtn}>
                        <Ionicons name="share-outline" size={22} color={textColor} />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={{ paddingBottom: 24 + insets.bottom }} showsVerticalScrollIndicator={false}>
                    {post.imageUrl && (
                        <Image source={{ uri: post.imageUrl }} style={styles.heroImage} resizeMode="cover" />
                    )}

                    <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
                        <View style={styles.titleRow}>
                            <View style={[styles.catChip, { backgroundColor: accent + "20" }]}>
                                <Ionicons name={CATEGORY_ICONS[post.category]} size={12} color={accent} />
                                <Text style={[styles.catChipText, { color: accent }]}>
                                    {CATEGORY_LABELS[post.category] ?? post.category}
                                </Text>
                            </View>
                            {post.badge && (
                                <View style={[styles.badgeChip, { backgroundColor: cardBg }]}>
                                    <Text style={[styles.badgeChipText, { color: labelColor }]}>{post.badge}</Text>
                                </View>
                            )}
                        </View>
                        <Text style={[styles.title, { color: textColor }]}>{post.title}</Text>

                        {(post.region || post.district) && (
                            <View style={styles.locationRow}>
                                <Ionicons name="location-outline" size={14} color={labelColor} />
                                <Text style={[styles.locationText, { color: labelColor }]}>
                                    {[post.region, post.district].filter(Boolean).join(" ")}
                                </Text>
                            </View>
                        )}

                        {(post.likesCount !== undefined || post.commentsCount !== undefined || post.views !== undefined) && (
                            <View style={styles.statsRow}>
                                {post.views !== undefined && (
                                    <Stat icon="eye-outline" value={post.views} color={labelColor} />
                                )}
                                {post.likesCount !== undefined && (
                                    <Stat icon="heart-outline" value={post.likesCount} color={labelColor} />
                                )}
                                {post.commentsCount !== undefined && (
                                    <Stat icon="chatbubble-outline" value={post.commentsCount} color={labelColor} />
                                )}
                            </View>
                        )}
                    </View>

                    {post.content && (
                        <View style={[styles.contentCard, {
                            backgroundColor: cardBg, borderColor,
                            marginHorizontal: 20, marginTop: 16,
                        }]}>
                            <Text style={[styles.contentText, { color: textColor }]}>{post.content}</Text>
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
}

function Stat({ icon, value, color }: { icon: React.ComponentProps<typeof Ionicons>["name"]; value: number; color: string }) {
    return (
        <View style={styles.statBox}>
            <Ionicons name={icon} size={13} color={color} />
            <Text style={{ fontSize: 12, color, fontWeight: "600" }}>{value}</Text>
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
    heroImage: { width: "100%", aspectRatio: 1.4 },
    titleRow: { flexDirection: "row", gap: 6, marginBottom: 10 },
    catChip: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999,
    },
    catChipText: { fontSize: 11, fontWeight: "700" },
    badgeChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
    badgeChipText: { fontSize: 11, fontWeight: "600" },
    title: { fontSize: 22, fontWeight: "800", lineHeight: 30 },
    locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
    locationText: { fontSize: 12, fontWeight: "500" },
    statsRow: { flexDirection: "row", gap: 12, marginTop: 12 },
    statBox: { flexDirection: "row", alignItems: "center", gap: 4 },
    contentCard: {
        borderRadius: 16, padding: 16, borderWidth: 1,
    },
    contentText: { fontSize: 14, lineHeight: 24 },
});
