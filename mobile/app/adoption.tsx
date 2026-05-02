/**
 * 입양정보 — 공공데이터 동물보호관리시스템 프록시 (`/api/adoption`)
 *
 * 외부 API 결과를 정규화해서 보여주는 읽기 전용 화면.
 * 인증 없이 접근 가능 (공개 데이터).
 */

import { useState, useEffect, useCallback } from "react";
import {
    View, Text, FlatList, TouchableOpacity, Image,
    ActivityIndicator, RefreshControl, ScrollView, StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { API_BASE_URL } from "@/config/constants";
import { AdoptionAnimal } from "@/types";
import { COLORS } from "@/lib/theme";
import { useDarkMode } from "@/contexts/ThemeContext";
import AppHeader from "@/components/common/AppHeader";
import AdoptionDetailModal from "@/components/adoption/AdoptionDetailModal";

type KindFilter = "all" | "dog" | "cat" | "etc";

const KIND_LABELS: { id: KindFilter; label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
    { id: "all", label: "전체", icon: "apps-outline" },
    { id: "dog", label: "강아지", icon: "paw-outline" },
    { id: "cat", label: "고양이", icon: "paw-outline" },
    { id: "etc", label: "기타", icon: "ellipsis-horizontal" },
];

export default function AdoptionScreen() {
    const { isDarkMode } = useDarkMode();
    const [animals, setAnimals] = useState<AdoptionAnimal[]>([]);
    const [kindFilter, setKindFilter] = useState<KindFilter>("all");
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [selected, setSelected] = useState<AdoptionAnimal | null>(null);

    const fetchAnimals = useCallback(
        async (targetPage: number, append: boolean) => {
            try {
                const params = new URLSearchParams({
                    page: String(targetPage),
                    size: "20",
                });
                if (kindFilter !== "all") params.set("kind", kindFilter);

                const res = await fetch(`${API_BASE_URL}/api/adoption?${params}`);
                if (!res.ok) {
                    setHasMore(false);
                    return;
                }
                const data = await res.json();
                const list: AdoptionAnimal[] = data.animals ?? data.items ?? [];

                setAnimals((prev) => (append ? [...prev, ...list] : list));
                setHasMore(list.length >= 20);
            } catch {
                setHasMore(false);
            } finally {
                setIsLoading(false);
                setRefreshing(false);
            }
        },
        [kindFilter],
    );

    useEffect(() => {
        setIsLoading(true);
        setPage(1);
        setHasMore(true);
        fetchAnimals(1, false);
    }, [fetchAnimals]);

    async function onRefresh() {
        setRefreshing(true);
        setPage(1);
        setHasMore(true);
        await fetchAnimals(1, false);
    }

    function loadMore() {
        if (!hasMore || isLoading || refreshing) return;
        const next = page + 1;
        setPage(next);
        fetchAnimals(next, true);
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? COLORS.gray[950] : COLORS.white }]} edges={["top"]}>
            <Stack.Screen options={{ headerShown: false }} />
            <AppHeader showBack title="입양정보" hideActions />

            {/* 카인드 필터 */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
                style={styles.filterScrollOuter}
            >
                {KIND_LABELS.map((k) => {
                    const active = kindFilter === k.id;
                    return (
                        <TouchableOpacity
                            key={k.id}
                            onPress={() => setKindFilter(k.id)}
                            activeOpacity={0.85}
                            style={{ marginRight: 8 }}
                        >
                            {active ? (
                                <LinearGradient
                                    colors={[COLORS.memento[500], COLORS.memento[400]]}
                                    style={styles.chip}
                                >
                                    <Ionicons name={k.icon} size={14} color="#fff" style={{ marginRight: 6 }} />
                                    <Text style={styles.chipTextActive}>{k.label}</Text>
                                </LinearGradient>
                            ) : (
                                <View style={[
                                    styles.chip,
                                    { backgroundColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[100] },
                                ]}>
                                    <Ionicons
                                        name={k.icon}
                                        size={14}
                                        color={isDarkMode ? COLORS.gray[300] : COLORS.gray[700]}
                                        style={{ marginRight: 6 }}
                                    />
                                    <Text style={[
                                        styles.chipText,
                                        { color: isDarkMode ? COLORS.gray[300] : COLORS.gray[700] },
                                    ]}>{k.label}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* 리스트 */}
            {isLoading && animals.length === 0 ? (
                <View style={styles.center}>
                    <ActivityIndicator color={COLORS.memento[500]} />
                    <Text style={[styles.helpText, { color: isDarkMode ? COLORS.gray[400] : COLORS.gray[500] }]}>입양 가능한 아이들을 불러오고 있어요</Text>
                </View>
            ) : (
                <FlatList
                    data={animals}
                    keyExtractor={(item) => item.id}
                    style={{ flex: 1 }}
                    renderItem={({ item }) => (
                        <AnimalCard animal={item} isDarkMode={isDarkMode} onPress={() => setSelected(item)} />
                    )}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={COLORS.memento[500]}
                        />
                    }
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.4}
                    ListFooterComponent={
                        hasMore && animals.length > 0 ? (
                            <View style={styles.footer}>
                                <ActivityIndicator color={COLORS.memento[500]} />
                            </View>
                        ) : null
                    }
                    ListEmptyComponent={
                        !isLoading ? (
                            <View style={styles.center}>
                                <Ionicons name="paw-outline" size={48} color={COLORS.gray[300]} />
                                <Text style={[styles.helpText, { color: isDarkMode ? COLORS.gray[400] : COLORS.gray[500] }]}>현재 등록된 아이가 없어요</Text>
                            </View>
                        ) : null
                    }
                    contentContainerStyle={animals.length === 0 ? { flex: 1 } : styles.listContent}
                />
            )}

            <AdoptionDetailModal
                visible={selected !== null}
                onClose={() => setSelected(null)}
                animal={selected}
            />
        </SafeAreaView>
    );
}

function AnimalCard({ animal, isDarkMode, onPress }: {
    animal: AdoptionAnimal;
    isDarkMode: boolean;
    onPress: () => void;
}) {
    const isAvailable = animal.status === "공고중" || animal.status === "보호중";
    const cardBg = isDarkMode ? COLORS.gray[900] : COLORS.white;
    const titleColor = isDarkMode ? COLORS.white : COLORS.gray[900];
    const metaColor = isDarkMode ? COLORS.gray[400] : COLORS.gray[600];
    const shelterColor = isDarkMode ? COLORS.gray[500] : COLORS.gray[500];

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.card, { backgroundColor: cardBg }]}>
            {animal.thumbnailUrl || animal.imageUrl ? (
                <Image
                    source={{ uri: animal.thumbnailUrl ?? animal.imageUrl }}
                    style={styles.cardImage}
                    resizeMode="cover"
                />
            ) : (
                <View style={[styles.cardImage, styles.imagePlaceholder]}>
                    <Ionicons name="paw" size={36} color={COLORS.gray[300]} />
                </View>
            )}
            <View style={styles.cardBody}>
                <View style={styles.cardHeaderRow}>
                    <View style={styles.kindBadge}>
                        <Text style={styles.kindBadgeText}>{animal.kind ?? "기타"}</Text>
                    </View>
                    {isAvailable ? (
                        <View style={styles.statusBadge}>
                            <View style={styles.statusDot} />
                            <Text style={styles.statusText}>{animal.status}</Text>
                        </View>
                    ) : null}
                </View>
                <Text style={[styles.cardTitle, { color: titleColor }]} numberOfLines={1}>
                    {animal.breed ?? "품종 정보 없음"}
                </Text>
                <View style={styles.cardMetaRow}>
                    {animal.gender ? <Text style={[styles.cardMeta, { color: metaColor }]}>{animal.gender}</Text> : null}
                    {animal.age ? <Text style={[styles.cardMeta, { color: metaColor }]}> · {animal.age}</Text> : null}
                    {animal.color ? <Text style={[styles.cardMeta, { color: metaColor }]}> · {animal.color}</Text> : null}
                </View>
                {animal.shelterName ? (
                    <View style={styles.shelterRow}>
                        <Ionicons name="location-outline" size={11} color={shelterColor} />
                        <Text style={[styles.cardShelter, { color: shelterColor }]} numberOfLines={1}>{animal.shelterName}</Text>
                    </View>
                ) : null}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    filterScrollOuter: { flexGrow: 0, flexShrink: 0 },
    filterRow: { paddingHorizontal: 16, paddingVertical: 12 },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 9999,
    },
    chipText: { fontSize: 13, fontWeight: "500" },
    chipTextActive: { fontSize: 13, fontWeight: "600", color: "#fff" },
    center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 },
    helpText: { fontSize: 13 },
    listContent: { padding: 12, gap: 12, paddingBottom: 32 },
    footer: { paddingVertical: 24, alignItems: "center" },
    card: {
        flexDirection: "row",
        borderRadius: 16,
        overflow: "hidden",
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
    },
    cardImage: { width: 104, height: 104 },
    imagePlaceholder: { alignItems: "center", justifyContent: "center" },
    cardBody: { flex: 1, padding: 12, gap: 6 },
    cardHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    kindBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        backgroundColor: COLORS.memento[100],
        borderRadius: 6,
    },
    kindBadgeText: { fontSize: 11, fontWeight: "700", color: COLORS.memento[700] },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        backgroundColor: "#10B98115",
        borderRadius: 6,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#10B981" },
    statusText: { fontSize: 10, fontWeight: "600", color: "#059669" },
    cardTitle: { fontSize: 15, fontWeight: "700" },
    cardMetaRow: { flexDirection: "row", flexWrap: "wrap" },
    cardMeta: { fontSize: 12 },
    shelterRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
    cardShelter: { fontSize: 11, flex: 1 },
});
