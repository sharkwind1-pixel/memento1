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
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "@/config/constants";
import { AdoptionAnimal } from "@/types";
import { COLORS } from "@/lib/theme";

type KindFilter = "all" | "dog" | "cat" | "etc";

const KIND_LABELS: { id: KindFilter; label: string }[] = [
    { id: "all", label: "전체" },
    { id: "dog", label: "강아지" },
    { id: "cat", label: "고양이" },
    { id: "etc", label: "기타" },
];

export default function AdoptionScreen() {
    const router = useRouter();
    const [animals, setAnimals] = useState<AdoptionAnimal[]>([]);
    const [kindFilter, setKindFilter] = useState<KindFilter>("all");
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

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
        <SafeAreaView style={styles.container} edges={["top"]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* 헤더 */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={COLORS.gray[700]} />
                </TouchableOpacity>
                <Text style={styles.title}>입양정보</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* 카인드 필터 */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
            >
                {KIND_LABELS.map((k) => {
                    const active = kindFilter === k.id;
                    return (
                        <TouchableOpacity
                            key={k.id}
                            onPress={() => setKindFilter(k.id)}
                            style={[
                                styles.chip,
                                active ? styles.chipActive : styles.chipInactive,
                            ]}
                            activeOpacity={0.85}
                        >
                            <Text style={[styles.chipText, { color: active ? COLORS.white : COLORS.gray[700] }]}>
                                {k.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* 리스트 */}
            {isLoading && animals.length === 0 ? (
                <View style={styles.center}>
                    <ActivityIndicator color={COLORS.memento[500]} />
                    <Text style={styles.helpText}>입양 가능한 아이들을 불러오고 있어요</Text>
                </View>
            ) : (
                <FlatList
                    data={animals}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <AnimalCard animal={item} />}
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
                                <Text style={styles.helpText}>현재 등록된 아이가 없어요</Text>
                            </View>
                        ) : null
                    }
                    contentContainerStyle={animals.length === 0 ? { flex: 1 } : styles.listContent}
                />
            )}
        </SafeAreaView>
    );
}

function AnimalCard({ animal }: { animal: AdoptionAnimal }) {
    const isAvailable = animal.status === "공고중" || animal.status === "보호중";

    return (
        <View style={styles.card}>
            {animal.thumbnailUrl || animal.imageUrl ? (
                <Image
                    source={{ uri: animal.thumbnailUrl ?? animal.imageUrl }}
                    style={styles.cardImage}
                    resizeMode="cover"
                />
            ) : (
                <View style={[styles.cardImage, styles.imagePlaceholder]}>
                    <Ionicons name="paw" size={32} color={COLORS.gray[300]} />
                </View>
            )}
            <View style={styles.cardBody}>
                <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardKind}>{animal.kind ?? "기타"}</Text>
                    {isAvailable ? (
                        <View style={styles.badgeAvailable}>
                            <Text style={styles.badgeText}>{animal.status}</Text>
                        </View>
                    ) : null}
                </View>
                <Text style={styles.cardTitle} numberOfLines={1}>
                    {animal.breed ?? "품종 정보 없음"}
                </Text>
                <View style={styles.cardMetaRow}>
                    {animal.gender ? (
                        <Text style={styles.cardMeta}>{animal.gender}</Text>
                    ) : null}
                    {animal.age ? (
                        <Text style={styles.cardMeta}> · {animal.age}</Text>
                    ) : null}
                    {animal.color ? (
                        <Text style={styles.cardMeta}> · {animal.color}</Text>
                    ) : null}
                </View>
                {animal.shelterName ? (
                    <Text style={styles.cardShelter} numberOfLines={1}>
                        <Ionicons name="location-outline" size={12} color={COLORS.gray[500]} />
                        {" "}
                        {animal.shelterName}
                    </Text>
                ) : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.white },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.gray[100],
    },
    backBtn: { padding: 8, width: 40 },
    title: { fontSize: 18, fontWeight: "bold", color: COLORS.gray[900] },
    filterRow: {
        paddingHorizontal: 12,
        paddingVertical: 12,
        gap: 8,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
        marginRight: 8,
    },
    chipActive: { backgroundColor: COLORS.memento[500] },
    chipInactive: { backgroundColor: COLORS.gray[100] },
    chipText: { fontSize: 13, fontWeight: "600" },
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        gap: 8,
    },
    helpText: { fontSize: 13, color: COLORS.gray[500] },
    listContent: { padding: 12, gap: 12 },
    footer: { paddingVertical: 24, alignItems: "center" },
    card: {
        flexDirection: "row",
        backgroundColor: COLORS.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.gray[100],
        overflow: "hidden",
    },
    cardImage: { width: 96, height: 96, backgroundColor: COLORS.gray[50] },
    imagePlaceholder: { alignItems: "center", justifyContent: "center" },
    cardBody: { flex: 1, padding: 12, gap: 4 },
    cardHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    cardKind: { fontSize: 12, fontWeight: "700", color: COLORS.memento[600] },
    badgeAvailable: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        backgroundColor: COLORS.memento[100],
        borderRadius: 4,
    },
    badgeText: { fontSize: 10, fontWeight: "600", color: COLORS.memento[700] },
    cardTitle: { fontSize: 14, fontWeight: "600", color: COLORS.gray[900] },
    cardMetaRow: { flexDirection: "row", flexWrap: "wrap" },
    cardMeta: { fontSize: 12, color: COLORS.gray[500] },
    cardShelter: { fontSize: 11, color: COLORS.gray[500], marginTop: 2 },
});
