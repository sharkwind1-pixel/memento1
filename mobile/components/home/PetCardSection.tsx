/**
 * PetCardSection — 선택된 펫 미리보기 카드 (홈)
 *
 * 펫이 있으면 큰 카드로 표시 (이름, 종, 사진수, 모드 토글),
 * 없으면 "반려동물을 등록해보세요" 빈 상태.
 */

import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pet } from "@/types";
import { COLORS, SPACING, RADIUS } from "@/lib/theme";

interface Props {
    pet: Pet | null;
    isMemorialMode: boolean;
}

export default function PetCardSection({ pet, isMemorialMode }: Props) {
    const router = useRouter();
    const accentColor = isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500];
    const accentSoft = isMemorialMode ? COLORS.memorial[100] : COLORS.memento[100];

    if (!pet) {
        return (
            <View style={styles.container}>
                <View style={styles.emptyCard}>
                    <View style={[styles.emptyIcon, { backgroundColor: accentSoft }]}>
                        <Ionicons name="paw" size={28} color={accentColor} />
                    </View>
                    <Text style={styles.emptyTitle}>반려동물을 등록해보세요</Text>
                    <Text style={styles.emptySubtitle}>소중한 순간들을 함께 기록하고 추억해요</Text>
                    <TouchableOpacity
                        onPress={() => router.push("/pet/new")}
                        style={[styles.emptyCta, { backgroundColor: accentColor }]}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.emptyCtaText}>등록하기</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const photoCount = pet.photos?.length ?? 0;
    const isMemorial = pet.status === "memorial";

    return (
        <View style={styles.container}>
            <TouchableOpacity
                onPress={() => router.push(`/pet/${pet.id}`)}
                activeOpacity={0.92}
                style={[
                    styles.card,
                    isMemorial && { backgroundColor: COLORS.memorial[50] },
                ]}
            >
                <View style={styles.cardLeft}>
                    {pet.profileImage ? (
                        <Image source={{ uri: pet.profileImage }} style={styles.profileImage} />
                    ) : (
                        <View style={[styles.profileImage, styles.profilePlaceholder]}>
                            <Ionicons name="paw" size={28} color={COLORS.gray[300]} />
                        </View>
                    )}
                </View>
                <View style={styles.cardRight}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name}>{pet.name}</Text>
                        {isMemorial && (
                            <View style={styles.memorialBadge}>
                                <Text style={styles.memorialBadgeText}>추모</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.meta}>
                        {pet.type}{pet.breed ? ` · ${pet.breed}` : ""}{pet.gender ? ` · ${pet.gender}` : ""}
                    </Text>
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Ionicons name="image-outline" size={14} color={COLORS.gray[500]} />
                            <Text style={styles.statText}>{photoCount}장</Text>
                        </View>
                        {pet.togetherPeriod && (
                            <View style={styles.statItem}>
                                <Ionicons name="heart-outline" size={14} color={COLORS.gray[500]} />
                                <Text style={styles.statText}>{pet.togetherPeriod}</Text>
                            </View>
                        )}
                    </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: SPACING.md,
        marginTop: -SPACING.lg,
    },
    emptyCard: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.xl,
        padding: SPACING.lg,
        alignItems: "center",
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    emptyIcon: {
        width: 56,
        height: 56,
        borderRadius: RADIUS.full,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: SPACING.md,
    },
    emptyTitle: {
        fontSize: 17,
        fontWeight: "bold",
        color: COLORS.gray[900],
        marginBottom: SPACING.xs,
    },
    emptySubtitle: {
        fontSize: 13,
        color: COLORS.gray[500],
        marginBottom: SPACING.md,
    },
    emptyCta: {
        paddingHorizontal: SPACING.xl,
        paddingVertical: 12,
        borderRadius: RADIUS.full,
    },
    emptyCtaText: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: "600",
    },
    card: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.xl,
        padding: SPACING.md,
        gap: SPACING.md,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    cardLeft: {},
    profileImage: {
        width: 64,
        height: 64,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.gray[100],
    },
    profilePlaceholder: {
        alignItems: "center",
        justifyContent: "center",
    },
    cardRight: {
        flex: 1,
        gap: 4,
    },
    nameRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.sm,
    },
    name: {
        fontSize: 17,
        fontWeight: "bold",
        color: COLORS.gray[900],
    },
    memorialBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        backgroundColor: COLORS.memorial[100],
        borderRadius: RADIUS.sm,
    },
    memorialBadgeText: {
        fontSize: 10,
        fontWeight: "700",
        color: COLORS.memorial[700],
    },
    meta: {
        fontSize: 12,
        color: COLORS.gray[500],
    },
    statsRow: {
        flexDirection: "row",
        gap: SPACING.md,
        marginTop: 4,
    },
    statItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    statText: {
        fontSize: 12,
        color: COLORS.gray[500],
    },
});
