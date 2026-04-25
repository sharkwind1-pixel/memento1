/**
 * 기록 탭 — 타임라인 + 사진 갤러리
 */

import { useState } from "react";
import {
    View, Text, ScrollView, TouchableOpacity,
    Image, FlatList, RefreshControl, ActivityIndicator, StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { usePet } from "@/contexts/PetContext";
import { COLORS } from "@/lib/theme";

type TabType = "timeline" | "gallery";

export default function RecordScreen() {
    const { selectedPet, isLoading, isMemorialMode, refreshPets } = usePet();
    const [activeTab, setActiveTab] = useState<TabType>("timeline");
    const [refreshing, setRefreshing] = useState(false);

    async function onRefresh() {
        setRefreshing(true);
        await refreshPets();
        setRefreshing(false);
    }

    const accentColor = isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500];

    if (isLoading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color={COLORS.memento[500]} />
            </View>
        );
    }

    const bgColor = isMemorialMode ? COLORS.gray[950] : COLORS.white;

    return (
        <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
            <View style={styles.headerRow}>
                <Text style={[styles.headerTitle, { color: isMemorialMode ? COLORS.white : COLORS.gray[900] }]}>
                    {selectedPet ? `${selectedPet.name}의 기록` : "기록"}
                </Text>
                <TouchableOpacity
                    style={[styles.addBtn, { backgroundColor: accentColor + "20" }]}
                >
                    <Ionicons name="add" size={22} color={accentColor} />
                </TouchableOpacity>
            </View>

            <View style={[styles.tabRow, { backgroundColor: isMemorialMode ? COLORS.gray[800] : COLORS.gray[100] }]}>
                {(["timeline", "gallery"] as TabType[]).map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        onPress={() => setActiveTab(tab)}
                        style={[styles.tabBtn, activeTab === tab ? styles.tabBtnActive : null]}
                        activeOpacity={0.8}
                    >
                        <Text
                            style={{
                                fontSize: 14,
                                fontWeight: "600",
                                color: activeTab === tab
                                    ? COLORS.gray[900]
                                    : isMemorialMode ? COLORS.gray[400] : COLORS.gray[500],
                            }}
                        >
                            {tab === "timeline" ? "타임라인" : "사진첩"}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {!selectedPet ? (
                <View style={styles.emptyCenter}>
                    <Ionicons name="paw-outline" size={48} color={COLORS.gray[300]} />
                    <Text style={styles.emptyText}>
                        반려동물을 선택하면{"\n"}기록을 볼 수 있어요.
                    </Text>
                </View>
            ) : activeTab === "timeline" ? (
                <TimelineView
                    pet={selectedPet}
                    isMemorialMode={isMemorialMode}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                />
            ) : (
                <GalleryView
                    photos={selectedPet.photos}
                    isMemorialMode={isMemorialMode}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                />
            )}
        </SafeAreaView>
    );
}

function TimelineView({ pet, isMemorialMode, refreshing, onRefresh }: {
    pet: NonNullable<ReturnType<typeof usePet>["selectedPet"]>;
    isMemorialMode: boolean;
    refreshing: boolean;
    onRefresh: () => void;
}) {
    const accentColor = isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500];

    return (
        <ScrollView
            style={styles.flex1PadH}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
            }
        >
            {pet.photos.length > 0 && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.photoStrip}
                    contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}
                >
                    {pet.photos.slice(0, 8).map((photo) => (
                        <TouchableOpacity key={photo.id} activeOpacity={0.9}>
                            <Image source={{ uri: photo.url }} style={styles.photoThumb} />
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}

            {pet.photos.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 64 }}>
                    <Ionicons name="camera-outline" size={48} color={COLORS.gray[300]} />
                    <Text style={{ color: COLORS.gray[400], marginTop: 12, textAlign: "center", fontSize: 14 }}>
                        첫 기록을 남겨보세요.{"\n"}소중한 순간이 타임라인에 쌓입니다.
                    </Text>
                </View>
            ) : (
                <View style={{ paddingBottom: 24, paddingHorizontal: 20 }}>
                    <Text style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: isMemorialMode ? COLORS.gray[400] : COLORS.gray[500],
                        marginBottom: 12,
                    }}>
                        최근 기록
                    </Text>
                    {pet.photos.slice(0, 5).map((photo) => (
                        <View
                            key={photo.id}
                            style={[
                                styles.timelineRow,
                                { backgroundColor: isMemorialMode ? COLORS.gray[900] : COLORS.gray[50] },
                            ]}
                        >
                            <Image source={{ uri: photo.url }} style={styles.timelineImg} />
                            <View style={{ flex: 1 }}>
                                <Text
                                    style={{
                                        fontSize: 14,
                                        fontWeight: "500",
                                        color: isMemorialMode ? COLORS.white : COLORS.gray[800],
                                    }}
                                    numberOfLines={2}
                                >
                                    {photo.caption || "기록"}
                                </Text>
                                <Text style={{
                                    fontSize: 12,
                                    marginTop: 4,
                                    color: isMemorialMode ? COLORS.gray[500] : COLORS.gray[400],
                                }}>
                                    {photo.date}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>
            )}
        </ScrollView>
    );
}

function GalleryView({ photos, isMemorialMode, refreshing, onRefresh }: {
    photos: NonNullable<ReturnType<typeof usePet>["selectedPet"]>["photos"];
    isMemorialMode: boolean;
    refreshing: boolean;
    onRefresh: () => void;
}) {
    const accentColor = isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500];

    if (photos.length === 0) {
        return (
            <View style={styles.emptyCenter}>
                <Ionicons name="images-outline" size={48} color={COLORS.gray[300]} />
                <Text style={styles.emptyText}>
                    아직 사진이 없어요.{"\n"}소중한 순간을 담아보세요.
                </Text>
            </View>
        );
    }

    return (
        <FlatList
            data={photos}
            keyExtractor={(item) => item.id}
            numColumns={3}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
            }
            renderItem={({ item }) => (
                <TouchableOpacity
                    activeOpacity={0.85}
                    style={{ flex: 1 / 3, aspectRatio: 1, padding: 1 }}
                >
                    <Image source={{ uri: item.url }} style={{ flex: 1 }} resizeMode="cover" />
                </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingBottom: 20 }}
        />
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    flex1PadH: { flex: 1 },
    loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.white },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
    },
    headerTitle: { fontSize: 20, fontWeight: "bold" },
    addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    tabRow: {
        flexDirection: "row",
        marginHorizontal: 20,
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
    },
    tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
    tabBtnActive: { backgroundColor: "#fff" },
    emptyCenter: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
    emptyText: { color: COLORS.gray[400], marginTop: 12, textAlign: "center", fontSize: 14 },
    photoStrip: { marginBottom: 20 },
    photoThumb: { width: 96, height: 96, borderRadius: 12 },
    timelineRow: { flexDirection: "row", gap: 12, marginBottom: 16, padding: 12, borderRadius: 16 },
    timelineImg: { width: 64, height: 64, borderRadius: 12 },
});
