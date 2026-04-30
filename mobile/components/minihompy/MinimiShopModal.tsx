/**
 * MinimiShopModal — 미니미 도감 + 상점 + 장착
 *
 * 기능:
 *  - 카탈로그 fetch + 보유 인벤토리 fetch (병렬)
 *  - 카드 클릭: 보유 시 장착, 미보유 시 구매 확인 다이얼로그
 *  - 장착된 미니미는 별 표시
 *  - 카테고리 필터 (전체/강아지/고양이)
 */

import { useEffect, useState, useCallback } from "react";
import {
    View, Text, Modal, TouchableOpacity, FlatList,
    Image, StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/theme";
import { MINIMI_CATALOG } from "@/data/minihompyData";
import {
    getMinimiCatalog, getMinimiInventory,
    purchaseMinimi, equipMinimi, sellMinimi,
} from "@/lib/minihompy-api";
import type { MinimiCatalogItem, UserMinimiRow } from "@/types";

type CategoryFilter = "all" | "owned" | "dog" | "cat";

interface Props {
    visible: boolean;
    onClose: () => void;
    accessToken: string;
    points: number;
    onChanged: () => void;        // 구매/장착 후 부모 화면 새로고침 트리거
    accentColor: string;
}

export default function MinimiShopModal({
    visible, onClose, accessToken, points, onChanged, accentColor,
}: Props) {
    const insets = useSafeAreaInsets();
    const [catalog, setCatalog] = useState<MinimiCatalogItem[]>([]);
    const [ownedSlugs, setOwnedSlugs] = useState<Set<string>>(new Set());
    const [slugToUserMinimiId, setSlugToUserMinimiId] = useState<Record<string, string>>({});
    const [equippedSlug, setEquippedSlug] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [filter, setFilter] = useState<CategoryFilter>("all");

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [catalogData, inventory] = await Promise.all([
                getMinimiCatalog(accessToken).catch(() => null),
                getMinimiInventory(accessToken).catch(() => ({ owned: [], equippedSlug: null })),
            ]);
            // catalog API 실패 시 로컬 fallback
            setCatalog(catalogData ?? MINIMI_CATALOG.map((c, i) => ({
                ...c,
                id: c.slug,
                resellPrice: Math.ceil(c.price * 0.5),
                isAvailable: true,
                sortOrder: i,
            })));
            setOwnedSlugs(new Set(inventory.owned.map((o) => o.minimi_id)));
            // 판매(sell)는 user_minimi.id (UUID)가 필요 → slug → UUID 맵 구성
            const slugToId: Record<string, string> = {};
            inventory.owned.forEach((o: UserMinimiRow) => { slugToId[o.minimi_id] = o.id; });
            setSlugToUserMinimiId(slugToId);
            setEquippedSlug(inventory.equippedSlug);
        } finally {
            setLoading(false);
        }
    }, [accessToken]);

    useEffect(() => {
        if (visible) load();
    }, [visible, load]);

    async function doEquipToggle(item: MinimiCatalogItem, equipping: boolean) {
        setBusy(item.slug);
        try {
            await equipMinimi(accessToken, equipping ? item.slug : null);
            setEquippedSlug(equipping ? item.slug : null);
            onChanged();
        } catch (e) {
            Alert.alert("실패", e instanceof Error ? e.message : "장착 변경 실패");
        } finally {
            setBusy(null);
        }
    }

    async function doSell(item: MinimiCatalogItem) {
        const userMinimiId = slugToUserMinimiId[item.slug];
        if (!userMinimiId) {
            Alert.alert("판매 불가", "보유 정보를 찾을 수 없어요. 새로고침 후 다시 시도해주세요.");
            return;
        }
        Alert.alert(
            `${item.name} 판매`,
            `${item.resellPrice}P를 환불받고 판매할까요? (장착 중이면 자동 해제)`,
            [
                { text: "취소", style: "cancel" },
                {
                    text: "판매",
                    style: "destructive",
                    onPress: async () => {
                        setBusy(item.slug);
                        try {
                            const result = await sellMinimi(accessToken, userMinimiId);
                            // 보유/장착/맵 갱신
                            setOwnedSlugs((prev) => {
                                const next = new Set(prev);
                                next.delete(item.slug);
                                return next;
                            });
                            setSlugToUserMinimiId((prev) => {
                                const next = { ...prev };
                                delete next[item.slug];
                                return next;
                            });
                            if (equippedSlug === item.slug) setEquippedSlug(null);
                            onChanged();
                            Alert.alert("판매 완료", `${result.refundedPoints}P가 환불됐어요.`);
                        } catch (e) {
                            Alert.alert("판매 실패", e instanceof Error ? e.message : "");
                        } finally {
                            setBusy(null);
                        }
                    },
                },
            ],
        );
    }

    function handlePress(item: MinimiCatalogItem) {
        if (busy) return;

        const owned = ownedSlugs.has(item.slug);
        const equipped = equippedSlug === item.slug;

        if (owned) {
            // 보유한 미니미: 장착/해제 + 판매 옵션
            Alert.alert(
                item.name,
                equipped ? "장착 중인 미니미예요." : "보유 중인 미니미예요.",
                [
                    { text: "취소", style: "cancel" },
                    equipped
                        ? { text: "장착 해제", onPress: () => doEquipToggle(item, false) }
                        : { text: "장착하기", onPress: () => doEquipToggle(item, true) },
                    { text: `판매 (${item.resellPrice}P)`, style: "destructive", onPress: () => doSell(item) },
                ],
            );
            return;
        }

        // 구매 확인
        if (points < item.price) {
            Alert.alert(
                "포인트 부족",
                `${item.name}을(를) 구매하려면 ${item.price}P가 필요해요. 현재 ${points}P 보유 중.`,
            );
            return;
        }

        Alert.alert(
            `${item.name} 구매`,
            `${item.price}P를 사용해서 구매할까요?`,
            [
                { text: "취소", style: "cancel" },
                {
                    text: "구매",
                    style: "default",
                    onPress: async () => {
                        setBusy(item.slug);
                        try {
                            await purchaseMinimi(accessToken, item.slug);
                            setOwnedSlugs((prev) => new Set([...prev, item.slug]));
                            onChanged();
                            // 구매 직후 자동 장착 옵션
                            Alert.alert(
                                "구매 완료",
                                `${item.name}을(를) 바로 장착할까요?`,
                                [
                                    { text: "나중에", style: "cancel" },
                                    {
                                        text: "장착",
                                        onPress: async () => {
                                            try {
                                                await equipMinimi(accessToken, item.slug);
                                                setEquippedSlug(item.slug);
                                                onChanged();
                                            } catch {
                                                // 무시
                                            }
                                        },
                                    },
                                ],
                            );
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
        ? catalog
        : filter === "owned"
            ? catalog.filter((c) => ownedSlugs.has(c.slug))
            : catalog.filter((c) => c.category === filter);

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <SafeAreaView style={styles.flex1} edges={["top"]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.headerBtn}>
                        <Ionicons name="close" size={24} color={COLORS.gray[800]} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle}>미니미 상점</Text>
                        <Text style={styles.headerSub}>탭해서 구매 · 장착</Text>
                    </View>
                    <View style={styles.pointPill}>
                        <Ionicons name="star" size={12} color={COLORS.memento[500]} />
                        <Text style={styles.pointText}>{points.toLocaleString()}P</Text>
                    </View>
                </View>

                {/* 카테고리 필터 */}
                <View style={styles.filterRow}>
                    {(["all", "owned", "dog", "cat"] as CategoryFilter[]).map((c) => {
                        const ownedCount = ownedSlugs.size;
                        return (
                            <TouchableOpacity
                                key={c}
                                onPress={() => setFilter(c)}
                                style={[
                                    styles.filterChip,
                                    filter === c && { backgroundColor: accentColor, borderColor: accentColor },
                                ]}
                            >
                                <Text style={{
                                    fontSize: 12,
                                    fontWeight: "600",
                                    color: filter === c ? "#fff" : COLORS.gray[700],
                                }}>
                                    {c === "all" ? "전체"
                                        : c === "owned" ? `보관함 (${ownedCount})`
                                        : c === "dog" ? "강아지"
                                        : "고양이"}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {loading ? (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator color={accentColor} />
                    </View>
                ) : (
                    <FlatList
                        data={filtered}
                        keyExtractor={(item) => item.slug}
                        numColumns={2}
                        columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
                        contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 + insets.bottom, gap: 12 }}
                        renderItem={({ item }) => {
                            const owned = ownedSlugs.has(item.slug);
                            const equipped = equippedSlug === item.slug;
                            const itemBusy = busy === item.slug;
                            return (
                                <TouchableOpacity
                                    onPress={() => handlePress(item)}
                                    disabled={itemBusy}
                                    style={[
                                        styles.card,
                                        equipped && { borderColor: accentColor, borderWidth: 2 },
                                    ]}
                                    activeOpacity={0.85}
                                >
                                    <View style={styles.cardImgWrap}>
                                        <Image source={{ uri: item.imageUrl }} style={styles.cardImg} resizeMode="contain" />
                                        {equipped && (
                                            <View style={[styles.equippedBadge, { backgroundColor: accentColor }]}>
                                                <Ionicons name="star" size={10} color="#fff" />
                                                <Text style={styles.equippedText}>장착중</Text>
                                            </View>
                                        )}
                                        {itemBusy && (
                                            <View style={styles.cardOverlay}>
                                                <ActivityIndicator color="#fff" />
                                            </View>
                                        )}
                                    </View>
                                    <View style={{ padding: 10 }}>
                                        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                                        <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
                                        <View style={styles.cardFooter}>
                                            {owned ? (
                                                <Text style={[styles.cardPrice, { color: accentColor }]}>
                                                    {equipped ? "장착 중 · 탭" : "보유 · 탭"}
                                                </Text>
                                            ) : (
                                                <View style={styles.priceRow}>
                                                    <Ionicons name="star" size={11} color={COLORS.memento[500]} />
                                                    <Text style={styles.cardPrice}>{item.price.toLocaleString()}P</Text>
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
    flex1: { flex: 1, backgroundColor: COLORS.gray[50] },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.gray[100],
        backgroundColor: "#fff",
    },
    headerBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
    headerTitle: { fontSize: 17, fontWeight: "700", color: COLORS.gray[900] },
    headerSub: { fontSize: 11, color: COLORS.gray[500], marginTop: 2 },
    pointPill: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9999,
        backgroundColor: COLORS.memento[50],
    },
    pointText: { fontSize: 12, fontWeight: "700", color: COLORS.memento[600] },
    filterRow: {
        flexDirection: "row",
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: COLORS.gray[100],
    },
    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 9999,
        borderWidth: 1,
        borderColor: COLORS.gray[200],
        backgroundColor: "#fff",
    },
    loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
    card: {
        flex: 1,
        backgroundColor: "#fff",
        borderRadius: 14,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: COLORS.gray[100],
    },
    cardImgWrap: {
        backgroundColor: COLORS.gray[50],
        aspectRatio: 1,
        position: "relative",
    },
    cardImg: { width: "100%", height: "100%" },
    cardOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.4)",
    },
    equippedBadge: {
        position: "absolute",
        top: 6,
        right: 6,
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 9999,
    },
    equippedText: { color: "#fff", fontSize: 9, fontWeight: "700" },
    cardName: { fontSize: 13, fontWeight: "700", color: COLORS.gray[900] },
    cardDesc: { fontSize: 11, color: COLORS.gray[500], marginTop: 2, lineHeight: 15, minHeight: 30 },
    cardFooter: { marginTop: 8 },
    priceRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    cardPrice: { fontSize: 12, fontWeight: "700", color: COLORS.gray[700] },
});
