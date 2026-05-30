/**
 * FurnitureShopModal — 미니홈피 가구/소품 상점 (네이티브)
 *
 * 웹 src/components/features/minihompy/FurnitureShopModal.tsx 이식.
 * - 카탈로그(FURNITURE_CATALOG, 로컬) + 보유 인벤토리(getFurnitureInventory) 병렬 로드
 * - 카드 탭: 구매 확인 → purchaseFurniture (중복 구매 허용, 장착/판매 없음)
 * - 카테고리 필터 (전체 + 카탈로그에 실제 존재하는 카테고리)
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import {
    View, Text, Modal, TouchableOpacity, FlatList,
    Image, StyleSheet, ActivityIndicator, Alert,
    useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/theme";
import { useDarkMode } from "@/contexts/ThemeContext";
import { FURNITURE_CATALOG, FURNITURE_CATEGORY_LABELS } from "@/data/furnitureCatalog";
import { getFurnitureInventory, purchaseFurniture } from "@/lib/minihompy-api";
import type { FurnitureItem, FurnitureCategory, UserFurnitureRow } from "@/types";

type CategoryFilter = "all" | FurnitureCategory;

interface Props {
    visible: boolean;
    onClose: () => void;
    accessToken: string;
    points: number;
    onChanged: () => void;        // 구매 후 부모 화면 새로고침 트리거
    accentColor: string;
}

export default function FurnitureShopModal({
    visible, onClose, accessToken, points, onChanged, accentColor,
}: Props) {
    const insets = useSafeAreaInsets();
    const { width: screenWidth } = useWindowDimensions();
    const { isDarkMode } = useDarkMode();
    const cardWidth = (screenWidth - 16 * 2 - 10 * 2) / 3;

    const [ownedCounts, setOwnedCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [filter, setFilter] = useState<CategoryFilter>("all");

    // 카탈로그에 실제 존재하는 카테고리만 필터칩으로 노출
    const categories = useMemo<CategoryFilter[]>(() => {
        const present = new Set<FurnitureCategory>();
        FURNITURE_CATALOG.forEach((f) => present.add(f.category));
        return ["all", ...Array.from(present)];
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const items = await getFurnitureInventory(accessToken).catch(() => [] as UserFurnitureRow[]);
            const counts: Record<string, number> = {};
            items.forEach((o) => {
                counts[o.furniture_id] = (counts[o.furniture_id] ?? 0) + 1;
            });
            setOwnedCounts(counts);
        } finally {
            setLoading(false);
        }
    }, [accessToken]);

    useEffect(() => {
        if (visible) {
            setFilter("all");
            load();
        }
    }, [visible, load]);

    function doBuy(item: FurnitureItem) {
        if (points < item.price) {
            Alert.alert("포인트 부족", `${item.name}을(를) 구매하려면 ${item.price}P가 필요해요. 현재 ${points}P 보유 중.`);
            return;
        }
        const owned = (ownedCounts[item.slug] ?? 0) > 0;
        Alert.alert(
            `${item.name} 구매`,
            `${item.price}P를 사용해서 구매할까요?${owned ? " (이미 보유 중)" : ""}`,
            [
                { text: "취소", style: "cancel" },
                {
                    text: "구매",
                    style: "default",
                    onPress: async () => {
                        setBusy(item.slug);
                        try {
                            await purchaseFurniture(accessToken, item.slug);
                            setOwnedCounts((prev) => ({ ...prev, [item.slug]: (prev[item.slug] ?? 0) + 1 }));
                            onChanged();
                            Alert.alert("구매 완료", `${item.name}을(를) 구매했어요! 편집 모드 보관함에서 배치할 수 있어요.`);
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

    const filtered = filter === "all"
        ? FURNITURE_CATALOG
        : FURNITURE_CATALOG.filter((f) => f.category === filter);

    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.gray[50];
    const headerBg = isDarkMode ? COLORS.gray[900] : "#fff";
    const headerBorder = isDarkMode ? COLORS.gray[800] : COLORS.gray[100];
    const titleColor = isDarkMode ? COLORS.white : COLORS.gray[900];
    const subColor = isDarkMode ? COLORS.gray[400] : COLORS.gray[500];
    const cardBg = isDarkMode ? COLORS.gray[900] : "#fff";
    const cardBorder = isDarkMode ? COLORS.gray[800] : COLORS.gray[100];
    const cardImgBg = isDarkMode ? COLORS.gray[800] : COLORS.gray[50];
    const cardNameColor = isDarkMode ? COLORS.white : COLORS.gray[900];
    const cardPriceColor = isDarkMode ? COLORS.gray[300] : COLORS.gray[700];
    const filterChipBg = isDarkMode ? COLORS.gray[900] : "#fff";
    const filterChipBorder = isDarkMode ? COLORS.gray[700] : COLORS.gray[200];
    const filterChipColor = isDarkMode ? COLORS.gray[300] : COLORS.gray[700];
    const pointPillBg = isDarkMode ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.08)";

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
                <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: headerBorder }]}>
                    <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.headerBtn}>
                        <Ionicons name="close" size={24} color={isDarkMode ? COLORS.gray[300] : COLORS.gray[800]} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.headerTitle, { color: titleColor }]}>가구 상점</Text>
                        <Text style={[styles.headerSub, { color: subColor }]}>탭해서 구매 · 편집 모드에서 배치</Text>
                    </View>
                    <View style={[styles.pointPill, { backgroundColor: pointPillBg }]}>
                        <Ionicons name="star" size={12} color="#f59e0b" />
                        <Text style={styles.pointText}>{points.toLocaleString()}P</Text>
                    </View>
                </View>

                {/* 카테고리 필터 */}
                <View style={[styles.filterRow, { backgroundColor: headerBg, borderBottomColor: headerBorder }]}>
                    {categories.map((c) => (
                        <TouchableOpacity
                            key={c}
                            onPress={() => setFilter(c)}
                            style={[
                                styles.filterChip,
                                { backgroundColor: filterChipBg, borderColor: filterChipBorder },
                                filter === c && { backgroundColor: accentColor, borderColor: accentColor },
                            ]}
                        >
                            <Text style={{
                                fontSize: 12,
                                fontWeight: "600",
                                color: filter === c ? "#fff" : filterChipColor,
                            }}>
                                {c === "all" ? "전체" : FURNITURE_CATEGORY_LABELS[c]}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {loading ? (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator color={accentColor} />
                    </View>
                ) : (
                    <FlatList
                        data={filtered}
                        keyExtractor={(item) => item.slug}
                        numColumns={3}
                        columnWrapperStyle={{ gap: 10, paddingHorizontal: 16 }}
                        contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 + insets.bottom, gap: 10 }}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Ionicons name="cube-outline" size={36} color={COLORS.gray[300]} />
                                <Text style={[styles.emptyText, { color: subColor }]}>아직 등록된 가구가 없어요</Text>
                            </View>
                        }
                        renderItem={({ item }) => {
                            const count = ownedCounts[item.slug] ?? 0;
                            const owned = count > 0;
                            const itemBusy = busy === item.slug;
                            return (
                                <TouchableOpacity
                                    onPress={() => !itemBusy && doBuy(item)}
                                    disabled={itemBusy}
                                    style={[
                                        styles.card,
                                        { width: cardWidth, backgroundColor: cardBg, borderColor: cardBorder },
                                        owned && { borderColor: accentColor, borderWidth: 2 },
                                    ]}
                                    activeOpacity={0.85}
                                >
                                    <View style={[styles.cardImgWrap, { backgroundColor: cardImgBg }]}>
                                        <Image source={{ uri: item.imageUrl }} style={styles.cardImg} resizeMode="contain" fadeDuration={0} />
                                        {owned && (
                                            <View style={[styles.ownedBadge, { backgroundColor: accentColor }]}>
                                                <Text style={styles.ownedBadgeText}>{count > 1 ? `x${count}` : "보유"}</Text>
                                            </View>
                                        )}
                                        {itemBusy && (
                                            <View style={styles.cardOverlay}>
                                                <ActivityIndicator color="#fff" />
                                            </View>
                                        )}
                                    </View>
                                    <View style={{ paddingHorizontal: 6, paddingVertical: 6 }}>
                                        <Text style={[styles.cardName, { color: cardNameColor }]} numberOfLines={1}>{item.name}</Text>
                                        <View style={[styles.priceRow, { marginTop: 2 }]}>
                                            <Ionicons name="star" size={9} color="#f59e0b" />
                                            <Text style={[styles.cardPrice, { color: cardPriceColor }]}>{item.price}P</Text>
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
    pointText: { fontSize: 12, fontWeight: "700", color: "#d97706" },
    filterRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 9999,
        borderWidth: 1,
    },
    loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
    empty: { padding: 60, alignItems: "center", gap: 8 },
    emptyText: { fontSize: 13, fontWeight: "600", marginTop: 8 },
    card: {
        borderRadius: 10,
        overflow: "hidden",
        borderWidth: 1,
    },
    cardImgWrap: {
        aspectRatio: 1,
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
    },
    cardImg: { width: 64, height: 64 },
    cardOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.4)",
    },
    ownedBadge: {
        position: "absolute",
        top: 4,
        right: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 9999,
    },
    ownedBadgeText: { fontSize: 9, fontWeight: "700", color: "#fff" },
    cardName: { fontSize: 11, fontWeight: "700" },
    priceRow: { flexDirection: "row", alignItems: "center", gap: 3 },
    cardPrice: { fontSize: 10, fontWeight: "700" },
});
