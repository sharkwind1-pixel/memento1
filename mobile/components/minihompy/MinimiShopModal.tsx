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
    useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/theme";
import { useDarkMode } from "@/contexts/ThemeContext";
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
    /** 모달 열릴 때 미리 선택할 필터 (예: "내 미니미" 진입 시 "owned") */
    initialFilter?: CategoryFilter;
}

export default function MinimiShopModal({
    visible, onClose, accessToken, points, onChanged, accentColor, initialFilter = "all",
}: Props) {
    const insets = useSafeAreaInsets();
    const { width: screenWidth } = useWindowDimensions();
    const { isDarkMode } = useDarkMode();
    const cardWidth = (screenWidth - 16 * 2 - 12) / 2;
    const [catalog, setCatalog] = useState<MinimiCatalogItem[]>([]);
    const [ownedSlugs, setOwnedSlugs] = useState<Set<string>>(new Set());
    const [ownedCounts, setOwnedCounts] = useState<Record<string, number>>({});
    const [slugToUserMinimiIds, setSlugToUserMinimiIds] = useState<Record<string, string[]>>({});
    const [equippedSlug, setEquippedSlug] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [filter, setFilter] = useState<CategoryFilter>(initialFilter);

    // 모달 열릴 때 initialFilter 적용
    useEffect(() => {
        if (visible) setFilter(initialFilter);
    }, [visible, initialFilter]);

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
            const counts: Record<string, number> = {};
            const slugIds: Record<string, string[]> = {};
            inventory.owned.forEach((o: UserMinimiRow) => {
                counts[o.minimi_id] = (counts[o.minimi_id] ?? 0) + 1;
                slugIds[o.minimi_id] = [...(slugIds[o.minimi_id] ?? []), o.id];
            });
            setOwnedSlugs(new Set(Object.keys(counts)));
            setOwnedCounts(counts);
            setSlugToUserMinimiIds(slugIds);
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
        const ids = slugToUserMinimiIds[item.slug] ?? [];
        const userMinimiId = ids[0]; // 가장 오래된 복사본 판매
        if (!userMinimiId) {
            Alert.alert("판매 불가", "보유 정보를 찾을 수 없어요. 새로고침 후 다시 시도해주세요.");
            return;
        }
        const count = ownedCounts[item.slug] ?? 0;
        Alert.alert(
            `${item.name} 판매`,
            `${item.resellPrice}P를 환불받고 1마리 판매할까요?${count > 1 ? ` (보유 ${count}마리 중 1마리)` : ""}`,
            [
                { text: "취소", style: "cancel" },
                {
                    text: "판매",
                    style: "destructive",
                    onPress: async () => {
                        setBusy(item.slug);
                        try {
                            const result = await sellMinimi(accessToken, userMinimiId);
                            // 수량 1 감소, 0이 되면 보유 Set에서도 제거
                            setOwnedCounts((prev) => {
                                const next = { ...prev };
                                if ((next[item.slug] ?? 0) > 1) {
                                    next[item.slug]--;
                                } else {
                                    delete next[item.slug];
                                }
                                return next;
                            });
                            setSlugToUserMinimiIds((prev) => {
                                const next = { ...prev };
                                const remaining = (next[item.slug] ?? []).slice(1);
                                if (remaining.length > 0) next[item.slug] = remaining;
                                else delete next[item.slug];
                                return next;
                            });
                            setOwnedSlugs((prev) => {
                                if ((ownedCounts[item.slug] ?? 0) <= 1) {
                                    const next = new Set(prev);
                                    next.delete(item.slug);
                                    return next;
                                }
                                return prev;
                            });
                            if ((ownedCounts[item.slug] ?? 0) <= 1 && equippedSlug === item.slug) {
                                setEquippedSlug(null);
                            }
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

    async function doBuy(item: MinimiCatalogItem) {
        if (points < item.price) {
            Alert.alert("포인트 부족", `${item.name}을(를) 구매하려면 ${item.price}P가 필요해요. 현재 ${points}P 보유 중.`);
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
                            // 카운트 증가 (새 UUID는 reload 시 갱신)
                            setOwnedSlugs((prev) => new Set([...prev, item.slug]));
                            setOwnedCounts((prev) => ({ ...prev, [item.slug]: (prev[item.slug] ?? 0) + 1 }));
                            onChanged();
                            const isFirst = (ownedCounts[item.slug] ?? 0) === 0;
                            if (isFirst) {
                                Alert.alert(
                                    "구매 완료",
                                    `${item.name}을(를) 바로 장착할까요?`,
                                    [
                                        { text: "나중에", style: "cancel" },
                                        {
                                            text: "장착",
                                            onPress: async () => {
                                                try { await equipMinimi(accessToken, item.slug); setEquippedSlug(item.slug); onChanged(); } catch {}
                                            },
                                        },
                                    ],
                                );
                            } else {
                                Alert.alert("구매 완료", `${item.name} ${(ownedCounts[item.slug] ?? 0) + 1}마리째를 구매했어요!`);
                            }
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

    function handlePress(item: MinimiCatalogItem) {
        if (busy) return;

        const count = ownedCounts[item.slug] ?? 0;
        const owned = count > 0;
        const equipped = equippedSlug === item.slug;

        if (owned) {
            Alert.alert(
                item.name,
                count > 1 ? `${count}마리 보유 중이에요.` : (equipped ? "장착 중이에요." : "보유 중이에요."),
                [
                    { text: "취소", style: "cancel" },
                    equipped
                        ? { text: "장착 해제", onPress: () => doEquipToggle(item, false) }
                        : { text: "장착하기", onPress: () => doEquipToggle(item, true) },
                    { text: `한 마리 더 (${item.price}P)`, onPress: () => doBuy(item) },
                    { text: `판매 (${item.resellPrice}P)`, style: "destructive", onPress: () => doSell(item) },
                ],
            );
            return;
        }

        doBuy(item);
    }

    const filtered = filter === "all"
        ? catalog
        : filter === "owned"
            ? catalog.filter((c) => ownedSlugs.has(c.slug))
            : catalog.filter((c) => c.category === filter);

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
    const pointPillBg = isDarkMode ? "rgba(5,178,220,0.12)" : COLORS.memento[50];

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
                <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: headerBorder }]}>
                    <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.headerBtn}>
                        <Ionicons name="close" size={24} color={isDarkMode ? COLORS.gray[300] : COLORS.gray[800]} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.headerTitle, { color: titleColor }]}>미니미 상점</Text>
                        <Text style={[styles.headerSub, { color: subColor }]}>탭해서 구매 · 장착</Text>
                    </View>
                    <View style={[styles.pointPill, { backgroundColor: pointPillBg }]}>
                        <Ionicons name="star" size={12} color={COLORS.memento[500]} />
                        <Text style={styles.pointText}>{points.toLocaleString()}P</Text>
                    </View>
                </View>

                {/* 카테고리 필터 */}
                <View style={[styles.filterRow, { backgroundColor: headerBg, borderBottomColor: headerBorder }]}>
                    {(["all", "owned", "dog", "cat"] as CategoryFilter[]).map((c) => {
                        const ownedCount = ownedSlugs.size;
                        return (
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
                            const count = ownedCounts[item.slug] ?? 0;
                            const owned = count > 0;
                            const equipped = equippedSlug === item.slug;
                            const itemBusy = busy === item.slug;
                            return (
                                <TouchableOpacity
                                    onPress={() => handlePress(item)}
                                    disabled={itemBusy}
                                    style={[
                                        styles.card,
                                        { width: cardWidth, backgroundColor: cardBg, borderColor: cardBorder },
                                        equipped && { borderColor: accentColor, borderWidth: 2 },
                                    ]}
                                    activeOpacity={0.85}
                                >
                                    <View style={[styles.cardImgWrap, { backgroundColor: cardImgBg }]}>
                                        <Image source={{ uri: item.imageUrl }} style={styles.cardImg} resizeMode="contain" fadeDuration={0} />
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
                                        <Text style={[styles.cardName, { color: cardNameColor }]} numberOfLines={1}>{item.name}</Text>
                                        <Text style={[styles.cardDesc, { color: subColor }]} numberOfLines={2}>{item.description}</Text>
                                        <View style={styles.cardFooter}>
                                            {owned ? (
                                                <Text style={[styles.cardPrice, { color: accentColor }]}>
                                                    {equipped ? `장착 중 · ${count}마리` : `보유 ${count}마리`}
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
    filterRow: {
        flexDirection: "row",
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
    card: {
        borderRadius: 14,
        overflow: "hidden",
        borderWidth: 1,
    },
    cardImgWrap: {
        aspectRatio: 1,
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
    },
    cardImg: { width: 72, height: 72 },
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
    cardName: { fontSize: 13, fontWeight: "700" },
    cardDesc: { fontSize: 11, marginTop: 2, lineHeight: 15, minHeight: 30 },
    cardFooter: { marginTop: 8 },
    priceRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    cardPrice: { fontSize: 12, fontWeight: "700" },
});
