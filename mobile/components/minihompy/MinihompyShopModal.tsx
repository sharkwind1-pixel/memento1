/**
 * MinihompyShopModal — 통합 상점 (네이티브)
 * 웹 src/components/features/minihompy/MinihompyShop.tsx 이식.
 *
 * 꼬미 / 가구 / 배경 3탭을 한 모달에서 전부 구매.
 * - 꼬미: getMinimiCatalog + getMinimiInventory + purchaseMinimi (+ 자동 장착)
 * - 가구:  FURNITURE_CATALOG(로컬) + getFurnitureInventory + purchaseFurniture
 * - 배경:  BACKGROUND_CATALOG(로컬) + getOwnedBackgrounds + purchaseBackground
 *
 * "상점"은 구매 전담. 배치/적용은 보관함(편집모드 트레이 / 배경 보관함)에서.
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
import { MINIMI_CATALOG, BACKGROUND_CATALOG } from "@/data/minihompyData";
import { FURNITURE_CATALOG } from "@/data/furnitureCatalog";
import {
    getMinimiCatalog, getMinimiInventory, purchaseMinimi, equipMinimi,
    getFurnitureInventory, purchaseFurniture,
    getOwnedBackgrounds, purchaseBackground,
} from "@/lib/minihompy-api";
import type { MinimiCatalogItem, UserMinimiRow, FurnitureItem, BackgroundTheme } from "@/types";

type ShopTab = "minimi" | "furniture" | "background";

interface Props {
    visible: boolean;
    onClose: () => void;
    accessToken: string;
    points: number;
    onChanged: () => void;       // 구매 후 부모 새로고침
    accentColor: string;
    initialTab?: ShopTab;
}

export default function MinihompyShopModal({
    visible, onClose, accessToken, points, onChanged, accentColor, initialTab = "minimi",
}: Props) {
    const insets = useSafeAreaInsets();
    const { width: screenWidth } = useWindowDimensions();
    const { isDarkMode } = useDarkMode();
    const cardWidth = (screenWidth - 16 * 2 - 10 * 2) / 3;

    const [tab, setTab] = useState<ShopTab>(initialTab);

    // 꼬미
    const [catalog, setCatalog] = useState<MinimiCatalogItem[]>([]);
    const [ownedMinimi, setOwnedMinimi] = useState<Set<string>>(new Set());
    // 가구
    const [ownedFurnitureCounts, setOwnedFurnitureCounts] = useState<Record<string, number>>({});
    // 배경
    const [ownedBg, setOwnedBg] = useState<Set<string>>(new Set());

    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);

    useEffect(() => {
        if (visible) setTab(initialTab);
    }, [visible, initialTab]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [cat, inv, furniture, bgOwned] = await Promise.all([
                getMinimiCatalog(accessToken).catch(() => null),
                getMinimiInventory(accessToken).catch(() => ({ owned: [], equippedSlug: null })),
                getFurnitureInventory(accessToken).catch(() => []),
                getOwnedBackgrounds(accessToken).catch(() => []),
            ]);
            setCatalog(cat ?? MINIMI_CATALOG.map((c, i) => ({
                ...c, id: c.slug, resellPrice: Math.ceil(c.price * 0.5), isAvailable: true, sortOrder: i,
            })));
            setOwnedMinimi(new Set(inv.owned.map((o: UserMinimiRow) => o.minimi_id)));
            const fCounts: Record<string, number> = {};
            furniture.forEach((f) => { fCounts[f.furniture_id] = (fCounts[f.furniture_id] ?? 0) + 1; });
            setOwnedFurnitureCounts(fCounts);
            setOwnedBg(new Set(["default_sky", "room_default", ...bgOwned]));
        } finally {
            setLoading(false);
        }
    }, [accessToken]);

    useEffect(() => {
        if (visible) load();
    }, [visible, load]);

    function confirmBuy(name: string, price: number, onYes: () => void) {
        if (points < price) {
            Alert.alert("포인트 부족", `${name}을(를) 구매하려면 ${price}P가 필요해요. 현재 ${points}P 보유 중.`);
            return;
        }
        Alert.alert(`${name} 구매`, `${price}P를 사용해서 구매할까요?`, [
            { text: "취소", style: "cancel" },
            { text: "구매", onPress: onYes },
        ]);
    }

    async function buyMinimi(item: MinimiCatalogItem) {
        confirmBuy(item.name, item.price, async () => {
            setBusy(`minimi:${item.slug}`);
            try {
                await purchaseMinimi(accessToken, item.slug);
                try { await equipMinimi(accessToken, item.slug); } catch {}
                setOwnedMinimi((prev) => new Set([...prev, item.slug]));
                onChanged();
                Alert.alert("구매 완료", `${item.name}을(를) 구매하고 장착했어요!`);
            } catch (e) {
                Alert.alert("구매 실패", e instanceof Error ? e.message : "");
            } finally { setBusy(null); }
        });
    }

    async function buyFurniture(item: FurnitureItem) {
        confirmBuy(item.name, item.price, async () => {
            setBusy(`furniture:${item.slug}`);
            try {
                await purchaseFurniture(accessToken, item.slug);
                setOwnedFurnitureCounts((prev) => ({ ...prev, [item.slug]: (prev[item.slug] ?? 0) + 1 }));
                onChanged();
                Alert.alert("구매 완료", `${item.name}을(를) 구매했어요! 편집 모드 보관함에서 배치할 수 있어요.`);
            } catch (e) {
                Alert.alert("구매 실패", e instanceof Error ? e.message : "");
            } finally { setBusy(null); }
        });
    }

    async function buyBackground(item: BackgroundTheme) {
        confirmBuy(item.name, item.price, async () => {
            setBusy(`background:${item.slug}`);
            try {
                await purchaseBackground(accessToken, item.slug);
                setOwnedBg((prev) => new Set([...prev, item.slug]));
                onChanged();
                Alert.alert("구매 완료", `${item.name} 배경을 구매했어요! 배경 보관함에서 적용할 수 있어요.`);
            } catch (e) {
                Alert.alert("구매 실패", e instanceof Error ? e.message : "");
            } finally { setBusy(null); }
        });
    }

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
    const chipBg = isDarkMode ? COLORS.gray[800] : COLORS.gray[100];
    const chipColor = isDarkMode ? COLORS.gray[300] : COLORS.gray[600];
    const pointPillBg = isDarkMode ? "rgba(5,178,220,0.12)" : COLORS.memento[50];

    const TABS: { key: ShopTab; label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
        { key: "minimi", label: "꼬미", icon: "paw" },
        { key: "furniture", label: "가구", icon: "bed" },
        { key: "background", label: "배경", icon: "color-palette" },
    ];

    // 배경은 유료만 상점에 노출 (무료 = 기본 보유, 보관함에서 적용)
    const bgForSale = BACKGROUND_CATALOG.filter((b) => b.price > 0);

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
                <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: headerBorder }]}>
                    <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.headerBtn}>
                        <Ionicons name="close" size={24} color={isDarkMode ? COLORS.gray[300] : COLORS.gray[800]} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.headerTitle, { color: titleColor }]}>상점</Text>
                        <Text style={[styles.headerSub, { color: subColor }]}>꼬미 · 가구 · 배경 구매</Text>
                    </View>
                    <View style={[styles.pointPill, { backgroundColor: pointPillBg }]}>
                        <Ionicons name="star" size={12} color={COLORS.memento[500]} />
                        <Text style={styles.pointText}>{points.toLocaleString()}P</Text>
                    </View>
                </View>

                {/* 탭 */}
                <View style={[styles.tabRow, { backgroundColor: headerBg, borderBottomColor: headerBorder }]}>
                    {TABS.map((t) => (
                        <TouchableOpacity
                            key={t.key}
                            onPress={() => setTab(t.key)}
                            style={[styles.tabChip, { backgroundColor: chipBg }, tab === t.key && { backgroundColor: accentColor }]}
                        >
                            <Ionicons name={t.icon} size={14} color={tab === t.key ? "#fff" : chipColor} />
                            <Text style={{ fontSize: 12, fontWeight: "700", color: tab === t.key ? "#fff" : chipColor }}>{t.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {loading ? (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator color={accentColor} />
                    </View>
                ) : tab === "minimi" ? (
                    <FlatList
                        key="shop-minimi"
                        data={catalog}
                        keyExtractor={(item) => item.slug}
                        numColumns={3}
                        columnWrapperStyle={{ gap: 10, paddingHorizontal: 16 }}
                        contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 + insets.bottom, gap: 10 }}
                        renderItem={({ item }) => {
                            const owned = ownedMinimi.has(item.slug);
                            const itemBusy = busy === `minimi:${item.slug}`;
                            return (
                                <ShopCard
                                    width={cardWidth} imageUrl={item.imageUrl} name={item.name}
                                    price={item.price} owned={owned} ownedLabel="보유" rebuy={false}
                                    busy={itemBusy} accentColor={accentColor}
                                    cardBg={cardBg} cardBorder={cardBorder} cardImgBg={cardImgBg}
                                    nameColor={cardNameColor} priceColor={cardPriceColor}
                                    onBuy={() => buyMinimi(item)}
                                />
                            );
                        }}
                    />
                ) : tab === "furniture" ? (
                    <FlatList
                        key="shop-furniture"
                        data={FURNITURE_CATALOG}
                        keyExtractor={(item) => item.slug}
                        numColumns={3}
                        columnWrapperStyle={{ gap: 10, paddingHorizontal: 16 }}
                        contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 + insets.bottom, gap: 10 }}
                        renderItem={({ item }) => {
                            const count = ownedFurnitureCounts[item.slug] ?? 0;
                            const itemBusy = busy === `furniture:${item.slug}`;
                            return (
                                <ShopCard
                                    width={cardWidth} imageUrl={item.imageUrl} name={item.name}
                                    price={item.price} owned={count > 0} ownedLabel={count > 1 ? `x${count}` : "보유"} rebuy
                                    busy={itemBusy} accentColor="#F59E0B"
                                    cardBg={cardBg} cardBorder={cardBorder} cardImgBg={cardImgBg}
                                    nameColor={cardNameColor} priceColor={cardPriceColor}
                                    onBuy={() => buyFurniture(item)}
                                />
                            );
                        }}
                    />
                ) : (
                    <FlatList
                        key="shop-background"
                        data={bgForSale}
                        keyExtractor={(item) => item.slug}
                        numColumns={2}
                        columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
                        contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 + insets.bottom, gap: 12 }}
                        renderItem={({ item }) => {
                            const owned = ownedBg.has(item.slug);
                            const itemBusy = busy === `background:${item.slug}`;
                            return (
                                <BgCard
                                    bg={item} owned={owned} busy={itemBusy}
                                    cardBg={cardBg} cardBorder={cardBorder}
                                    nameColor={cardNameColor} descColor={subColor} priceColor={cardPriceColor}
                                    onBuy={() => buyBackground(item)}
                                />
                            );
                        }}
                    />
                )}

                <View style={[styles.footer, { backgroundColor: headerBg, borderTopColor: headerBorder, paddingBottom: 12 + insets.bottom }]}>
                    <Text style={[styles.footerText, { color: subColor }]}>구매한 아이템은 보관함에서 배치·적용할 수 있어요.</Text>
                </View>
            </SafeAreaView>
        </Modal>
    );
}

// ============================================================================
// 카드 컴포넌트
// ============================================================================

function ShopCard({
    width, imageUrl, name, price, owned, ownedLabel, rebuy, busy, accentColor,
    cardBg, cardBorder, cardImgBg, nameColor, priceColor, onBuy,
}: {
    width: number; imageUrl?: string; name: string; price: number;
    owned: boolean; ownedLabel: string; rebuy: boolean; busy: boolean; accentColor: string;
    cardBg: string; cardBorder: string; cardImgBg: string; nameColor: string; priceColor: string;
    onBuy: () => void;
}) {
    const disabled = busy || (owned && !rebuy);
    return (
        <TouchableOpacity
            onPress={onBuy}
            disabled={disabled}
            style={[styles.card, { width, backgroundColor: cardBg, borderColor: owned ? accentColor : cardBorder, borderWidth: owned ? 2 : 1 }]}
            activeOpacity={0.85}
        >
            <View style={[styles.cardImgWrap, { backgroundColor: cardImgBg }]}>
                {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.cardImg} resizeMode="contain" fadeDuration={0} />
                ) : (
                    <View style={styles.cardImg} />
                )}
                {owned && (
                    <View style={[styles.ownedBadge, { backgroundColor: accentColor }]}>
                        <Text style={styles.ownedBadgeText}>{ownedLabel}</Text>
                    </View>
                )}
                {busy && (
                    <View style={styles.cardOverlay}>
                        <ActivityIndicator color="#fff" />
                    </View>
                )}
            </View>
            <View style={{ paddingHorizontal: 6, paddingVertical: 6 }}>
                <Text style={[styles.cardName, { color: nameColor }]} numberOfLines={1}>{name}</Text>
                {owned && !rebuy ? (
                    <Text style={[styles.cardPrice, { color: accentColor, marginTop: 2 }]}>보유중</Text>
                ) : (
                    <View style={[styles.priceRow, { marginTop: 2 }]}>
                        <Ionicons name="star" size={9} color={accentColor} />
                        <Text style={[styles.cardPrice, { color: priceColor }]}>{price}P{owned ? " · 추가" : ""}</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
}

function BgCard({
    bg, owned, busy, cardBg, cardBorder, nameColor, descColor, priceColor, onBuy,
}: {
    bg: BackgroundTheme; owned: boolean; busy: boolean;
    cardBg: string; cardBorder: string; nameColor: string; descColor: string; priceColor: string;
    onBuy: () => void;
}) {
    return (
        <TouchableOpacity
            onPress={onBuy}
            disabled={busy || owned}
            style={[styles.bgCard, { backgroundColor: cardBg, borderColor: owned ? "#8B5CF6" : cardBorder, borderWidth: owned ? 2 : 1 }]}
            activeOpacity={0.85}
        >
            <View style={[styles.bgImgWrap, { backgroundColor: bg.cssBackground }]}>
                {bg.imageUrl && <Image source={{ uri: bg.imageUrl }} style={styles.bgImg} resizeMode="cover" />}
                {owned && (
                    <View style={[styles.ownedBadge, { backgroundColor: "#8B5CF6" }]}>
                        <Text style={styles.ownedBadgeText}>보유</Text>
                    </View>
                )}
                {busy && (
                    <View style={styles.cardOverlay}>
                        <ActivityIndicator color="#fff" />
                    </View>
                )}
            </View>
            <View style={{ padding: 10 }}>
                <Text style={[styles.cardName, { color: nameColor }]} numberOfLines={1}>{bg.name}</Text>
                {bg.description ? <Text style={[styles.bgDesc, { color: descColor }]} numberOfLines={1}>{bg.description}</Text> : null}
                {owned ? (
                    <Text style={[styles.cardPrice, { color: "#8B5CF6", marginTop: 6 }]}>보유중</Text>
                ) : (
                    <View style={[styles.priceRow, { marginTop: 6 }]}>
                        <Ionicons name="star" size={10} color="#8B5CF6" />
                        <Text style={[styles.cardPrice, { color: priceColor }]}>{bg.price.toLocaleString()}P</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    header: {
        flexDirection: "row", alignItems: "center", gap: 8,
        paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1,
    },
    headerBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
    headerTitle: { fontSize: 17, fontWeight: "700" },
    headerSub: { fontSize: 11, marginTop: 2 },
    pointPill: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9999,
    },
    pointText: { fontSize: 12, fontWeight: "700", color: COLORS.memento[600] },
    tabRow: {
        flexDirection: "row", gap: 8,
        paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1,
    },
    tabChip: {
        flexDirection: "row", alignItems: "center", gap: 5,
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9999,
    },
    loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
    card: { borderRadius: 10, overflow: "hidden" },
    cardImgWrap: { aspectRatio: 1, position: "relative", alignItems: "center", justifyContent: "center" },
    cardImg: { width: 52, height: 52 },
    cardOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.4)",
    },
    ownedBadge: {
        position: "absolute", top: 4, right: 4,
        paddingHorizontal: 6, paddingVertical: 2, borderRadius: 9999,
    },
    ownedBadgeText: { fontSize: 9, fontWeight: "700", color: "#fff" },
    cardName: { fontSize: 11, fontWeight: "700" },
    priceRow: { flexDirection: "row", alignItems: "center", gap: 3 },
    cardPrice: { fontSize: 10, fontWeight: "700" },
    bgCard: { flex: 1, borderRadius: 14, overflow: "hidden" },
    bgImgWrap: { aspectRatio: 1.4, position: "relative", overflow: "hidden" },
    bgImg: { width: "100%", height: "100%" },
    bgDesc: { fontSize: 10, marginTop: 2 },
    footer: { paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1 },
    footerText: { fontSize: 11, textAlign: "center" },
});
