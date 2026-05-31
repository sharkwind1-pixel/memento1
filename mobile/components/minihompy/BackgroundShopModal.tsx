/**
 * BackgroundShopModal — 배경 선택/구매
 * 보유 배경은 바로 적용, 미보유는 구매 → 적용.
 */

import { useEffect, useState, useCallback } from "react";
import {
    View, Text, Modal, TouchableOpacity, FlatList,
    Image, StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/theme";
import { useDarkMode } from "@/contexts/ThemeContext";
import { BACKGROUND_CATALOG } from "@/data/minihompyData";
import {
    getOwnedBackgrounds, purchaseBackground, patchMinihompySettings,
} from "@/lib/minihompy-api";

interface Props {
    visible: boolean;
    onClose: () => void;
    accessToken: string;
    points: number;
    currentSlug: string;
    onApplied: (slug: string) => void;
    accentColor: string;
    /** 보관함 모드: 보유(또는 무료) 배경만 + 적용 전용 */
    storageMode?: boolean;
}

export default function BackgroundShopModal({
    visible, onClose, accessToken, points, currentSlug, onApplied, accentColor, storageMode = false,
}: Props) {
    const insets = useSafeAreaInsets();
    const { isDarkMode } = useDarkMode();
    const [owned, setOwned] = useState<Set<string>>(new Set(["default_sky"]));
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const list = await getOwnedBackgrounds(accessToken).catch(() => []);
            setOwned(new Set(["default_sky", ...list]));
        } finally {
            setLoading(false);
        }
    }, [accessToken]);

    useEffect(() => {
        if (visible) load();
    }, [visible, load]);

    async function applyBackground(slug: string) {
        setBusy(slug);
        try {
            await patchMinihompySettings(accessToken, { backgroundSlug: slug });
            onApplied(slug);
        } catch (e) {
            Alert.alert("적용 실패", e instanceof Error ? e.message : "");
        } finally {
            setBusy(null);
        }
    }

    function handlePress(slug: string, price: number, name: string) {
        if (busy) return;
        // 무료 배경(price 0)은 항상 보유로 취급 → 바로 적용 (구매 플로우 진입 X)
        const isOwned = owned.has(slug) || price === 0;

        if (isOwned) {
            applyBackground(slug);
            return;
        }

        if (points < price) {
            Alert.alert("포인트 부족", `${name}을(를) 구매하려면 ${price}P가 필요해요. 현재 ${points}P 보유 중.`);
            return;
        }

        Alert.alert(
            `${name} 구매`,
            `${price}P를 사용해서 구매할까요?`,
            [
                { text: "취소", style: "cancel" },
                {
                    text: "구매",
                    onPress: async () => {
                        setBusy(slug);
                        try {
                            await purchaseBackground(accessToken, slug);
                            setOwned((prev) => new Set([...prev, slug]));
                            await applyBackground(slug);
                        } catch (e) {
                            Alert.alert("구매 실패", e instanceof Error ? e.message : "");
                        } finally {
                            setBusy(null);
                        }
                    },
                },
            ],
        );
    }

    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.gray[50];
    const headerBg = isDarkMode ? COLORS.gray[900] : "#fff";
    const headerBorder = isDarkMode ? COLORS.gray[800] : COLORS.gray[100];
    const titleColor = isDarkMode ? COLORS.white : COLORS.gray[900];
    const subColor = isDarkMode ? COLORS.gray[400] : COLORS.gray[500];
    const cardBg = isDarkMode ? COLORS.gray[900] : "#fff";
    const cardBorder = isDarkMode ? COLORS.gray[800] : COLORS.gray[100];
    const pointPillBg = isDarkMode ? "rgba(5,178,220,0.12)" : COLORS.memento[50];
    const cardNameColor = isDarkMode ? COLORS.white : COLORS.gray[900];
    const cardDescColor = isDarkMode ? COLORS.gray[400] : COLORS.gray[500];
    const cardPriceColor = isDarkMode ? COLORS.gray[300] : COLORS.gray[700];

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
                <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: headerBorder }]}>
                    <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.headerBtn}>
                        <Ionicons name="close" size={24} color={isDarkMode ? COLORS.gray[300] : COLORS.gray[800]} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.headerTitle, { color: titleColor }]}>{storageMode ? "배경 보관함" : "배경 테마"}</Text>
                        <Text style={[styles.headerSub, { color: subColor }]}>{storageMode ? "탭해서 적용" : "탭해서 적용 · 구매"}</Text>
                    </View>
                    <View style={[styles.pointPill, { backgroundColor: pointPillBg }]}>
                        <Ionicons name="star" size={12} color={COLORS.memento[500]} />
                        <Text style={styles.pointText}>{points.toLocaleString()}P</Text>
                    </View>
                </View>

                {loading ? (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator color={accentColor} />
                    </View>
                ) : (
                    <FlatList
                        data={storageMode
                            ? BACKGROUND_CATALOG.filter((b) => owned.has(b.slug) || b.price === 0)
                            : BACKGROUND_CATALOG}
                        keyExtractor={(item) => item.slug}
                        numColumns={2}
                        columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
                        contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 + insets.bottom, gap: 12 }}
                        renderItem={({ item }) => {
                            const isOwned = owned.has(item.slug) || item.price === 0;
                            const isApplied = currentSlug === item.slug;
                            const itemBusy = busy === item.slug;
                            return (
                                <TouchableOpacity
                                    onPress={() => handlePress(item.slug, item.price, item.name)}
                                    disabled={itemBusy}
                                    style={[
                                        styles.card,
                                        { backgroundColor: cardBg, borderColor: cardBorder },
                                        isApplied && { borderColor: accentColor, borderWidth: 2 },
                                    ]}
                                    activeOpacity={0.85}
                                >
                                    <View style={[styles.cardImgWrap, { backgroundColor: item.cssBackground }]}>
                                        {item.imageUrl ? (
                                            <Image source={{ uri: item.imageUrl }} style={styles.cardImg} resizeMode="cover" />
                                        ) : (
                                            <View style={styles.cardImg} />
                                        )}
                                        {isApplied && (
                                            <View style={[styles.appliedBadge, { backgroundColor: accentColor }]}>
                                                <Ionicons name="checkmark" size={14} color="#fff" />
                                            </View>
                                        )}
                                        {itemBusy && (
                                            <View style={styles.cardOverlay}>
                                                <ActivityIndicator color="#fff" />
                                            </View>
                                        )}
                                    </View>
                                    <View style={{ padding: 10 }}>
                                        <Text style={[styles.cardName, { color: cardNameColor }]} numberOfLines={1}>{item.name}</Text>
                                        <Text style={[styles.cardDesc, { color: cardDescColor }]} numberOfLines={2}>{item.description || " "}</Text>
                                        <View style={styles.cardFooter}>
                                            {isOwned ? (
                                                <Text style={[styles.cardPrice, { color: accentColor }]}>
                                                    {isApplied ? "적용 중" : "탭해서 적용"}
                                                </Text>
                                            ) : (
                                                <View style={styles.priceRow}>
                                                    <Ionicons name="star" size={11} color={COLORS.memento[500]} />
                                                    <Text style={[styles.cardPrice, { color: cardPriceColor }]}>{item.price.toLocaleString()}P</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                    />
                )}
            </SafeAreaView>
        </Modal>
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
    headerBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
    headerTitle: { fontSize: 17, fontWeight: "700" },
    headerSub: { fontSize: 11, marginTop: 2 },
    pointPill: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9999,
    },
    pointText: { fontSize: 12, fontWeight: "700", color: COLORS.memento[600] },
    loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
    card: {
        flex: 1,
        borderRadius: 14,
        overflow: "hidden",
        borderWidth: 1,
    },
    cardImgWrap: {
        aspectRatio: 1,
        position: "relative",
        overflow: "hidden",
    },
    cardImg: { width: "100%", height: "100%" },
    cardOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: "center", justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.4)",
    },
    appliedBadge: {
        position: "absolute",
        top: 6, right: 6,
        width: 24, height: 24, borderRadius: 12,
        alignItems: "center", justifyContent: "center",
    },
    cardName: { fontSize: 13, fontWeight: "700" },
    cardDesc: { fontSize: 11, marginTop: 2, lineHeight: 15, minHeight: 30 },
    cardFooter: { marginTop: 8 },
    priceRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    cardPrice: { fontSize: 12, fontWeight: "700" },
});
