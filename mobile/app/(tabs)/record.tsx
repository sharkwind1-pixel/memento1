/**
 * 기록 탭 (V3 Phase 5: 4탭 확장)
 * - 타임라인 (timeline_entries)
 * - 사진첩 (pet_media)
 * - 앨범 (memory_albums) — AI 자동 생성 앨범
 * - 비디오 (video_generations) — AI 영상
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
    View, Text, ScrollView, TouchableOpacity,
    Image, FlatList, RefreshControl, ActivityIndicator,
    StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Video as ExpoVideo, ResizeMode } from "expo-av";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { useDarkMode } from "@/contexts/ThemeContext";
import { API_BASE_URL, VIDEO } from "@/config/constants";
import { COLORS } from "@/lib/theme";
import type { TimelineEntry } from "@/types";
import VideoResultModal, { type VideoResult } from "@/components/record/VideoResultModal";
import AppHeader from "@/components/common/AppHeader";
import AppDrawer from "@/components/common/AppDrawer";
import PageBackground, { usePageBgColor } from "@/components/common/PageBackground";
import PetSwitcher from "@/components/common/PetSwitcher";
import TimelineWriteModal, { type TimelineEntryDraft, type TimelineMood } from "@/components/record/TimelineWriteModal";
import MediaUploadModal from "@/components/record/MediaUploadModal";
import PhotoLightbox from "@/components/record/PhotoLightbox";
import AlbumDetailModal from "@/components/record/AlbumDetailModal";
import VideoGenerateModal from "@/components/record/VideoGenerateModal";
import RemindersSummary from "@/components/record/RemindersSummary";
import HealingJourneySummary from "@/components/record/HealingJourneySummary";
import MemoryAlbumsSection from "@/components/record/MemoryAlbumsSection";
import { supabase } from "@/lib/supabase";
import * as Haptics from "expo-haptics";
import { Alert as RNAlert } from "react-native";

type TabType = "timeline" | "gallery" | "albums" | "videos" | "minihompy";

const TABS: Array<{ id: TabType; label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }> = [
    { id: "timeline", label: "타임라인", icon: "time-outline" },
    { id: "gallery", label: "사진첩", icon: "images-outline" },
    { id: "albums", label: "앨범", icon: "albums-outline" },
    { id: "videos", label: "AI 영상", icon: "videocam-outline" },
    { id: "minihompy", label: "미니홈피", icon: "home-outline" },
];

export default function RecordScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ openVideo?: string }>();
    const { user } = useAuth();
    const { selectedPet, isLoading: petsLoading, isMemorialMode, refreshPets } = usePet();
    const { isDarkMode } = useDarkMode();
    const [activeTab, setActiveTab] = useState<TabType>("timeline");
    const [refreshing, setRefreshing] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    // 함께 보기 → AI 영상 생성 진입 트리거 (community FAB에서 ?openVideo=1)
    const [autoOpenVideoGen, setAutoOpenVideoGen] = useState(false);

    // openVideo 파라미터 감지 → videos 탭 + 모달 자동 열기
    // (URL 파라미터는 setParams로 비워서 다시 마운트해도 재트리거 X. router.replace는
    //  같은 화면 self-replace 시 navigator REPLACE/index 에러 발생 → 사용 X)
    useEffect(() => {
        if (params.openVideo === "1") {
            setActiveTab("videos");
            setAutoOpenVideoGen(true);
            router.setParams({ openVideo: undefined });
        }
    }, [params.openVideo, router]);

    const accentColor = isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500];
    const accentGradient: [string, string] = isMemorialMode
        ? [COLORS.memorial[400], "#F97316"]
        : [COLORS.memento[400], COLORS.memento[500]];

    async function onRefresh() {
        setRefreshing(true);
        await refreshPets();
        setRefreshing(false);
    }

    if (petsLoading) {
        return (
            <View style={styles.loadingCenter}>
                <ActivityIndicator size="large" color={accentColor} />
            </View>
        );
    }

    const bgColor = usePageBgColor();

    return (
        <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
            <PageBackground />
            <AppHeader onOpenDrawer={() => setDrawerOpen(true)} />
            <AppDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
            {/* 헤더 */}
            <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.title, { color: isDarkMode ? COLORS.white : COLORS.gray[900] }]}>
                        {selectedPet ? `${selectedPet.name}의 기록` : "우리의 기록"}
                    </Text>
                    {selectedPet ? (
                        <Text style={styles.subtitle}>
                            {selectedPet.breed || selectedPet.type}
                            {selectedPet.gender ? ` · ${selectedPet.gender}` : ""}
                        </Text>
                    ) : null}
                </View>
                <TouchableOpacity
                    onPress={() => router.push("/pet/new")}
                    style={[styles.addBtn, { backgroundColor: accentColor + "20" }]}
                    activeOpacity={0.7}
                >
                    <Ionicons name="add" size={22} color={accentColor} />
                </TouchableOpacity>
            </View>

            {/* 펫 카드 가로 스크롤 (2마리 이상 시) */}
            <PetSwitcher accentColor={accentColor} onAddPet={() => router.push("/pet/new")} />

            {/* 탭 (가로 스크롤) */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabScroll}
                style={styles.tabScrollOuter}
            >
                {TABS.map((tab) => {
                    const active = activeTab === tab.id;
                    const inactiveBg = isDarkMode ? COLORS.gray[800] : COLORS.gray[100];
                    const inactiveColor = isDarkMode ? COLORS.gray[300] : COLORS.gray[700];
                    return (
                        <TouchableOpacity
                            key={tab.id}
                            onPress={() => {
                                if (tab.id === "minihompy") {
                                    router.push("/(tabs)/minihompy");
                                } else {
                                    setActiveTab(tab.id);
                                }
                            }}
                            activeOpacity={0.85}
                            style={{ marginRight: 8 }}
                        >
                            {active ? (
                                <LinearGradient colors={accentGradient} style={styles.tabPill}>
                                    <Ionicons name={tab.icon} size={14} color="#fff" style={{ marginRight: 6 }} />
                                    <Text style={styles.tabLabelActive}>{tab.label}</Text>
                                </LinearGradient>
                            ) : (
                                <View style={[styles.tabPill, { backgroundColor: inactiveBg }]}>
                                    <Ionicons name={tab.icon} size={14} color={inactiveColor} style={{ marginRight: 6 }} />
                                    <Text style={[styles.tabLabel, { color: inactiveColor }]}>{tab.label}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* 컨텐츠 */}
            {!user ? (
                <View style={styles.emptyCenter}>
                    <View style={[styles.emptyIcon, { backgroundColor: accentColor + "1a" }]}>
                        <Ionicons name="lock-closed-outline" size={32} color={accentColor} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: isDarkMode ? COLORS.white : COLORS.gray[900] }]}>
                        로그인이 필요해요
                    </Text>
                    <Text style={styles.emptyHint}>
                        반려동물을 등록하고 기록을 남기려면{"\n"}먼저 로그인해주세요
                    </Text>
                    <TouchableOpacity
                        onPress={() => router.push("/(auth)/login")}
                        style={[styles.primaryBtn, { backgroundColor: accentColor }]}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="log-in-outline" size={16} color="#fff" />
                        <Text style={styles.primaryBtnText}>로그인하기</Text>
                    </TouchableOpacity>
                </View>
            ) : !selectedPet ? (
                <View style={styles.emptyCenter}>
                    <Ionicons name="paw-outline" size={48} color={COLORS.gray[300]} />
                    <Text style={styles.emptyHint}>
                        반려동물을 등록하면{"\n"}기록을 남길 수 있어요.
                    </Text>
                    <TouchableOpacity
                        onPress={() => router.push("/pet/new")}
                        style={[styles.primaryBtn, { backgroundColor: accentColor }]}
                    >
                        <Text style={styles.primaryBtnText}>반려동물 등록</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    {activeTab === "timeline" && (
                        <TimelineTab
                            petId={selectedPet.id}
                            petName={selectedPet.name}
                            isMemorialMode={isMemorialMode}
                            accentColor={accentColor}
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                        />
                    )}
                    {activeTab === "gallery" && (
                        <GalleryTab
                            petId={selectedPet.id}
                            photos={selectedPet.photos}
                            isMemorialMode={isMemorialMode}
                            accentColor={accentColor}
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                        />
                    )}
                    {activeTab === "albums" && (
                        <AlbumsTab
                            petId={selectedPet.id}
                            isMemorialMode={isMemorialMode}
                            accentColor={accentColor}
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                        />
                    )}
                    {activeTab === "videos" && (
                        <VideosTab
                            pet={selectedPet}
                            isMemorialMode={isMemorialMode}
                            accentColor={accentColor}
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            autoOpenGenerate={autoOpenVideoGen}
                            onAutoOpenConsumed={() => setAutoOpenVideoGen(false)}
                        />
                    )}
                </>
            )}
        </SafeAreaView>
    );
}

// ============================================
// 타임라인 탭 — TimelineEntry는 @/types에서 import (CLAUDE.md 컨벤션)
// ============================================

function TimelineTab({ petId, petName, isMemorialMode, accentColor, refreshing, onRefresh }: {
    petId: string;
    petName: string;
    isMemorialMode: boolean;
    accentColor: string;
    refreshing: boolean;
    onRefresh: () => void;
}) {
    const { isDarkMode } = useDarkMode();
    const { user, session } = useAuth();
    const [entries, setEntries] = useState<TimelineEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<TimelineEntryDraft | undefined>(undefined);
    const [moodFilter, setMoodFilter] = useState<TimelineMood | "all">("all");

    const load = useCallback(async () => {
        if (!session) { setLoading(false); return; }
        try {
            const { data, error } = await supabase
                .from("timeline_entries")
                .select("id, pet_id, date, title, content, mood, media_ids, created_at")
                .eq("pet_id", petId)
                .order("date", { ascending: false });
            if (error) {
                console.warn("[Timeline] load error", error.message);
                setEntries([]);
                return;
            }
            const list: TimelineEntry[] = (data || []).map((e: any) => ({
                id: e.id,
                petId: e.pet_id,
                title: e.title,
                content: e.content || "",
                date: e.date,
                mood: e.mood as TimelineMood | undefined,
                mediaIds: e.media_ids || undefined,
                createdAt: e.created_at,
            }));
            setEntries(list);
        } catch {
            setEntries([]);
        } finally {
            setLoading(false);
        }
    }, [session, petId]);

    useEffect(() => { load(); }, [load]);

    // 실시간 timeline 동기화 — 다른 디바이스/AI 자동 기록 시 즉시 반영
    useEffect(() => {
        if (!petId) return;
        const channel = supabase
            .channel(`timeline:${petId}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "timeline_entries", filter: `pet_id=eq.${petId}` },
                () => { load(); },
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [petId, load]);

    function openAdd() {
        setEditingEntry(undefined);
        setModalOpen(true);
    }

    function openEdit(entry: TimelineEntry) {
        setEditingEntry({
            id: entry.id,
            date: entry.date,
            title: entry.title,
            content: entry.content || "",
            mood: (entry.mood as TimelineMood) || "normal",
        });
        setModalOpen(true);
    }

    async function handleSave(draft: TimelineEntryDraft): Promise<boolean> {
        if (!user || !session) {
            RNAlert.alert("로그인 필요", "로그인 후 다시 시도해주세요");
            return false;
        }
        try {
            if (draft.id) {
                // 수정 — RLS 의존 + defense-in-depth로 user_id 명시
                const { error } = await supabase
                    .from("timeline_entries")
                    .update({
                        date: draft.date,
                        title: draft.title,
                        content: draft.content || null,
                        mood: draft.mood,
                    })
                    .eq("id", draft.id)
                    .eq("user_id", user.id);
                if (error) throw error;
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                await load();
                return true;
            } else {
                // 추가
                const { error } = await supabase
                    .from("timeline_entries")
                    .insert([{
                        pet_id: petId,
                        user_id: user.id,
                        date: draft.date,
                        title: draft.title,
                        content: draft.content || null,
                        mood: draft.mood,
                    }]);
                if (error) throw error;
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                await load();
                return true;
            }
        } catch (e) {
            RNAlert.alert("저장 실패", e instanceof Error ? e.message : "다시 시도해주세요");
            return false;
        }
    }

    function handleDelete(entryId: string) {
        RNAlert.alert("삭제 확인", "이 일기를 삭제할까요?", [
            { text: "취소", style: "cancel" },
            {
                text: "삭제",
                style: "destructive",
                onPress: async () => {
                    if (!session || !user) return;
                    // RLS 의존 + defense-in-depth로 user_id 명시
                    const { error } = await supabase
                        .from("timeline_entries")
                        .delete()
                        .eq("id", entryId)
                        .eq("user_id", user.id);
                    if (error) {
                        RNAlert.alert("삭제 실패", error.message);
                        return;
                    }
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                    setEntries((prev) => prev.filter((e) => e.id !== entryId));
                },
            },
        ]);
    }

    if (loading) {
        return <View style={styles.loadingInline}><ActivityIndicator color={accentColor} /></View>;
    }

    // 무드 필터 적용
    const filteredEntries = moodFilter === "all"
        ? entries
        : entries.filter((e) => e.mood === moodFilter);

    return (
        <>
            <FlatList
                data={filteredEntries}
                keyExtractor={(e) => e.id}
                style={{ flex: 1 }}
                contentContainerStyle={[styles.tabContent, { paddingBottom: 96 }]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
                ListHeaderComponent={
                    <View>
                        {/* 모드별 상단 위젯 — 추모: 치유의 여정 + 추억 앨범, 일상: 케어 리마인더 */}
                        {isMemorialMode ? (
                            <>
                                <HealingJourneySummary
                                    petId={petId}
                                    petName={petName}
                                    accentColor={accentColor}
                                />
                                <MemoryAlbumsSection
                                    petId={petId}
                                    petName={petName}
                                    isMemorialMode
                                />
                            </>
                        ) : (
                            <RemindersSummary
                                petId={petId}
                                petName={petName}
                                accentColor={accentColor}
                            />
                        )}

                        <View style={styles.timelineHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.timelineHeaderTitle, {
                                    color: isDarkMode
                                        ? COLORS.white
                                        : (isMemorialMode ? COLORS.memorial[700] : COLORS.gray[800]),
                                }]}>
                                    타임라인 일기
                                </Text>
                                <Text style={styles.timelineHeaderCount}>
                                    {filteredEntries.length}개{moodFilter !== "all" ? ` (${entries.length}개 중)` : ""}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={openAdd}
                                style={[styles.addEntryBtn, { backgroundColor: accentColor }]}
                                activeOpacity={0.85}
                            >
                                <Ionicons name="add" size={16} color="#fff" />
                                <Text style={styles.addEntryText}>일기 쓰기</Text>
                            </TouchableOpacity>
                        </View>

                        {/* 무드 필터 (entries 1개 이상일 때만) */}
                        {entries.length > 0 && (
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.moodFilterRow}
                                style={styles.moodFilterOuter}
                            >
                                {(["all", "happy", "normal", "sad", "sick"] as const).map((m) => {
                                    const active = moodFilter === m;
                                    const meta = m === "all"
                                        ? { label: "전체", icon: "list-outline" as const, color: COLORS.gray[500] }
                                        : m === "happy" ? { label: "기쁨", icon: "happy-outline" as const, color: "#FBBF24" }
                                        : m === "normal" ? { label: "평범", icon: "ellipse-outline" as const, color: "#94A3B8" }
                                        : m === "sad" ? { label: "슬픔", icon: "sad-outline" as const, color: "#60A5FA" }
                                        : { label: "아픔", icon: "medkit-outline" as const, color: "#F87171" };
                                    return (
                                        <TouchableOpacity
                                            key={m}
                                            onPress={() => setMoodFilter(m)}
                                            style={[
                                                styles.moodFilterChip,
                                                active
                                                    ? { backgroundColor: meta.color }
                                                    : {
                                                        backgroundColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[100],
                                                    },
                                            ]}
                                            activeOpacity={0.85}
                                        >
                                            <Ionicons name={meta.icon} size={12} color={active ? "#fff" : meta.color} />
                                            <Text style={[
                                                styles.moodFilterText,
                                                {
                                                    color: active
                                                        ? "#fff"
                                                        : (isDarkMode ? COLORS.gray[300] : COLORS.gray[700]),
                                                },
                                            ]}>
                                                {meta.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        )}
                    </View>
                }
                ListEmptyComponent={
                    <View style={styles.emptyCard}>
                        <Ionicons name="book-outline" size={36} color={COLORS.gray[300]} />
                        <Text style={styles.emptyCardTitle}>아직 기록된 일기가 없어요</Text>
                        <Text style={styles.emptyCardHint}>
                            오늘 하루를 기록해보세요.{"\n"}AI 펫톡 10턴마다 자동 기록도 됩니다.
                        </Text>
                        <TouchableOpacity
                            onPress={openAdd}
                            style={[styles.emptyAction, { borderColor: accentColor }]}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="create-outline" size={16} color={accentColor} />
                            <Text style={[styles.emptyActionText, { color: accentColor }]}>첫 일기 쓰기</Text>
                        </TouchableOpacity>
                    </View>
                }
                renderItem={({ item }) => (
                    <View style={[styles.timelineItem, {
                        backgroundColor: isDarkMode ? COLORS.gray[900] : COLORS.white,
                    }]}>
                        <View style={styles.timelineRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.timelineDate}>{item.date}</Text>
                                <Text style={[styles.timelineTitle, {
                                    color: isDarkMode ? COLORS.white : COLORS.gray[900],
                                }]}>{item.title}</Text>
                            </View>
                            <View style={styles.timelineActions}>
                                <TouchableOpacity onPress={() => openEdit(item)} hitSlop={6} style={styles.iconBtnSm}>
                                    <Ionicons name="pencil" size={14} color={COLORS.gray[400]} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDelete(item.id)} hitSlop={6} style={styles.iconBtnSm}>
                                    <Ionicons name="trash-outline" size={14} color={COLORS.gray[400]} />
                                </TouchableOpacity>
                            </View>
                        </View>
                        {item.content ? (
                            <Text style={[styles.timelineContent, {
                                color: isDarkMode
                                    ? COLORS.gray[300]
                                    : (isMemorialMode ? COLORS.memorial[800] : COLORS.gray[600]),
                            }]} numberOfLines={3}>
                                {item.content}
                            </Text>
                        ) : null}
                    </View>
                )}
            />
            <TimelineWriteModal
                visible={modalOpen}
                petName={petName}
                initialEntry={editingEntry}
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
            />
        </>
    );
}

// ============================================
// 사진첩 탭
// ============================================
function GalleryTab({ petId, photos, isMemorialMode, accentColor, refreshing, onRefresh }: {
    petId: string;
    photos: NonNullable<ReturnType<typeof usePet>["selectedPet"]>["photos"];
    isMemorialMode: boolean;
    accentColor: string;
    refreshing: boolean;
    onRefresh: () => void;
}) {
    const { deletePhotos } = usePet();
    const { isDarkMode } = useDarkMode();
    const [uploadOpen, setUploadOpen] = useState(false);
    const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
    const [selectionMode, setSelectionMode] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [deleting, setDeleting] = useState(false);
    const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");

    // 정렬된 사진 (원본 mutate 방지)
    const sortedPhotos = [...photos].sort((a, b) => {
        const aDate = (a as { date?: string }).date ?? "";
        const bDate = (b as { date?: string }).date ?? "";
        return sortBy === "newest" ? bDate.localeCompare(aDate) : aDate.localeCompare(bDate);
    });

    function exitSelection() {
        setSelectionMode(false);
        setSelected(new Set());
    }

    function toggleSelect(photoId: string) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(photoId)) next.delete(photoId);
            else next.add(photoId);
            return next;
        });
    }

    function enterSelection(photoId: string) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        setSelectionMode(true);
        setSelected(new Set([photoId]));
    }

    function handleItemPress(photoId: string, index: number) {
        if (selectionMode) {
            toggleSelect(photoId);
            return;
        }
        setLightboxIdx(index);
    }

    function confirmDelete() {
        if (selected.size === 0) return;
        RNAlert.alert(
            "사진 삭제",
            `선택한 ${selected.size}개의 사진을 삭제할까요? 되돌릴 수 없어요.`,
            [
                { text: "취소", style: "cancel" },
                {
                    text: "삭제",
                    style: "destructive",
                    onPress: async () => {
                        setDeleting(true);
                        const result = await deletePhotos(petId, Array.from(selected));
                        setDeleting(false);
                        if (result.success) {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                            exitSelection();
                            onRefresh();
                        } else {
                            RNAlert.alert("오류", "사진 삭제에 실패했어요. 다시 시도해주세요.");
                        }
                    },
                },
            ],
        );
    }

    return (
        <>
            <FlatList
                data={sortedPhotos}
                keyExtractor={(item) => item.id}
                numColumns={3}
                style={{ flex: 1 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
                ListHeaderComponent={
                    <View>
                        <View style={styles.galleryHeader}>
                            {selectionMode ? (
                                <>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.galleryHeaderTitle, {
                                    color: isDarkMode
                                        ? COLORS.white
                                        : (isMemorialMode ? COLORS.memorial[700] : COLORS.gray[800]),
                                }]}>
                                            {selected.size}개 선택됨
                                        </Text>
                                        <Text style={styles.galleryHeaderCount}>길게 눌러 시작 · 탭하여 추가</Text>
                                    </View>
                                    <TouchableOpacity onPress={exitSelection} style={styles.galleryActionBtn} activeOpacity={0.85}>
                                        <Text style={styles.galleryActionText}>취소</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={confirmDelete}
                                        disabled={selected.size === 0 || deleting}
                                        style={[
                                            styles.galleryActionBtn,
                                            { backgroundColor: "#EF4444" },
                                            (selected.size === 0 || deleting) && { opacity: 0.5 },
                                        ]}
                                        activeOpacity={0.85}
                                    >
                                        <Ionicons name="trash-outline" size={14} color="#fff" />
                                        <Text style={[styles.galleryActionText, { color: "#fff" }]}>삭제</Text>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.galleryHeaderTitle, {
                                    color: isDarkMode
                                        ? COLORS.white
                                        : (isMemorialMode ? COLORS.memorial[700] : COLORS.gray[800]),
                                }]}>
                                            사진/영상
                                        </Text>
                                        <Text style={styles.galleryHeaderCount}>{photos.length}장 · 길게 눌러 선택</Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => setSortBy(sortBy === "newest" ? "oldest" : "newest")}
                                        style={styles.galleryActionBtn}
                                        activeOpacity={0.85}
                                    >
                                        <Ionicons
                                            name={sortBy === "newest" ? "arrow-down" : "arrow-up"}
                                            size={12}
                                            color={COLORS.gray[700]}
                                        />
                                        <Text style={styles.galleryActionText}>
                                            {sortBy === "newest" ? "최신순" : "오래된순"}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => setUploadOpen(true)}
                                        style={[styles.uploadBtn, { backgroundColor: accentColor }]}
                                        activeOpacity={0.85}
                                    >
                                        <Ionicons name="add" size={16} color="#fff" />
                                        <Text style={styles.uploadBtnText}>업로드</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </View>
                }
                ListEmptyComponent={
                    <View style={styles.emptyCard}>
                        <Ionicons name="images-outline" size={36} color={COLORS.gray[300]} />
                        <Text style={styles.emptyCardTitle}>아직 사진이 없어요</Text>
                        <Text style={styles.emptyCardHint}>소중한 순간을 담아보세요</Text>
                        <TouchableOpacity
                            onPress={() => setUploadOpen(true)}
                            style={[styles.emptyAction, { borderColor: accentColor }]}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="cloud-upload-outline" size={16} color={accentColor} />
                            <Text style={[styles.emptyActionText, { color: accentColor }]}>첫 사진 올리기</Text>
                        </TouchableOpacity>
                    </View>
                }
                renderItem={({ item, index }) => {
                    const isSelected = selected.has(item.id);
                    return (
                        <TouchableOpacity
                            activeOpacity={0.85}
                            style={styles.gridItem}
                            onPress={() => handleItemPress(item.id, index)}
                            onLongPress={() => enterSelection(item.id)}
                            delayLongPress={300}
                        >
                            <Image source={{ uri: item.url }} style={styles.gridImg} resizeMode="cover" />
                            {selectionMode && (
                                <View style={[
                                    styles.selectOverlay,
                                    isSelected && { backgroundColor: "rgba(5,178,220,0.35)" },
                                ]}>
                                    <View style={[
                                        styles.selectCheck,
                                        isSelected
                                            ? { backgroundColor: accentColor, borderColor: "#fff" }
                                            : { backgroundColor: "rgba(255,255,255,0.7)", borderColor: "rgba(0,0,0,0.2)" },
                                    ]}>
                                        {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                                    </View>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                }}
                contentContainerStyle={photos.length === 0 ? { padding: 16 } : { padding: 12, paddingBottom: 32 }}
            />
            <MediaUploadModal
                petId={petId}
                visible={uploadOpen}
                onClose={() => setUploadOpen(false)}
                onSuccess={() => { setUploadOpen(false); onRefresh(); }}
            />
            <PhotoLightbox
                photos={sortedPhotos.map((p) => ({ id: p.id, url: p.url, caption: (p as any).caption }))}
                initialIndex={lightboxIdx ?? 0}
                visible={lightboxIdx !== null}
                onClose={() => setLightboxIdx(null)}
            />
        </>
    );
}

// ============================================
// 앨범 탭 (memory_albums)
// ============================================
interface AlbumPhoto {
    id: string;
    url: string;
    caption?: string | null;
}

interface MemoryAlbum {
    id: string;
    title: string;
    description: string;
    concept: string;
    coverImage: string | null;
    photoCount: number;
    createdAt: string;
    photos: AlbumPhoto[];
}

function AlbumsTab({ petId, isMemorialMode, accentColor, refreshing, onRefresh }: {
    petId: string;
    isMemorialMode: boolean;
    accentColor: string;
    refreshing: boolean;
    onRefresh: () => void;
}) {
    const { isDarkMode } = useDarkMode();
    const { session } = useAuth();
    const [albums, setAlbums] = useState<MemoryAlbum[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<MemoryAlbum | null>(null);

    const load = useCallback(async () => {
        if (!session || !petId) { setLoading(false); return; }
        try {
            const res = await fetch(`${API_BASE_URL}/api/memory-albums?petId=${encodeURIComponent(petId)}`, {
                headers: { "Authorization": `Bearer ${session.access_token}` },
            });
            if (!res.ok) return;
            const data = await res.json();
            const list = Array.isArray(data?.albums) ? data.albums : Array.isArray(data) ? data : [];
            setAlbums(list.map((raw: Record<string, unknown>): MemoryAlbum => {
                const photosRaw = Array.isArray(raw.photos) ? raw.photos : [];
                const photos: AlbumPhoto[] = photosRaw
                    .map((p: Record<string, unknown>) => ({
                        id: typeof p.id === "string" ? p.id : String(p.id ?? ""),
                        url: typeof p.url === "string" ? p.url : "",
                        caption: typeof p.caption === "string" ? p.caption : null,
                    }))
                    .filter((p: AlbumPhoto) => p.url.length > 0);
                return {
                    id: typeof raw.id === "string" ? raw.id : String(raw.id ?? ""),
                    title: typeof raw.title === "string" ? raw.title : "",
                    description: typeof raw.description === "string" ? raw.description : "",
                    concept: typeof raw.concept === "string" ? raw.concept : "",
                    coverImage: photos[0]?.url ?? null,
                    photoCount: photos.length,
                    createdAt: typeof raw.createdDate === "string"
                        ? raw.createdDate
                        : (typeof raw.createdAt === "string"
                            ? raw.createdAt
                            : (typeof raw.created_at === "string" ? raw.created_at : "")),
                    photos,
                };
            }));
        } catch {
            // 조용히
        } finally {
            setLoading(false);
        }
    }, [session, petId]);

    useEffect(() => { load(); }, [load]);

    if (loading) {
        return <View style={styles.loadingInline}><ActivityIndicator color={accentColor} /></View>;
    }

    if (albums.length === 0) {
        return (
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
                contentContainerStyle={styles.tabContent}
            >
                <View style={styles.emptyCard}>
                    <Ionicons name="albums-outline" size={36} color={COLORS.gray[300]} />
                    <Text style={styles.emptyCardTitle}>아직 앨범이 없어요</Text>
                    <Text style={styles.emptyCardHint}>
                        AI 펫톡 대화 + 사진을 토대로{"\n"}앨범이 자동 생성됩니다
                    </Text>
                </View>
            </ScrollView>
        );
    }

    return (
        <>
            <FlatList
                data={albums}
                keyExtractor={(a) => a.id}
                numColumns={2}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
                contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                columnWrapperStyle={{ gap: 12 }}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => setSelected(item)}
                        style={[styles.albumCard, {
                            backgroundColor: isDarkMode ? COLORS.gray[900] : COLORS.white,
                        }]}
                    >
                        {item.coverImage ? (
                            <Image source={{ uri: item.coverImage }} style={styles.albumCover} resizeMode="cover" />
                        ) : (
                            <View style={[styles.albumCover, {
                                backgroundColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[100],
                                alignItems: "center",
                                justifyContent: "center",
                            }]}>
                                <Ionicons name="albums" size={32} color={COLORS.gray[400]} />
                            </View>
                        )}
                        <View style={{ padding: 12 }}>
                            <Text style={[styles.albumTitle, {
                                color: isDarkMode ? COLORS.white : COLORS.gray[800],
                            }]} numberOfLines={1}>{item.title}</Text>
                            <Text style={styles.albumMeta}>{item.photoCount}장 · {item.createdAt.slice(0, 10)}</Text>
                        </View>
                    </TouchableOpacity>
                )}
            />
            <AlbumDetailModal
                album={selected}
                visible={selected !== null}
                onClose={() => setSelected(null)}
                isMemorialMode={isMemorialMode}
            />
        </>
    );
}

// ============================================
// 비디오 탭 (AI 영상) — 웹 VideoGenerationSection 1:1 매칭
//   - 마운트 시 list 패치 + 진행 중 항목 발견 시 자동 폴링
//   - generate 성공 시 activeGeneration 설정 → 15초 간격 폴링
//   - completed: 리스트 갱신 + 결과 모달 자동 오픈
//   - failed: 에러 알림 + 리스트에서 제거
//   - max 60회(15분) 초과 시 폴링 중단 + 안내
// ============================================

interface Video {
    id: string;
    status: string;
    videoUrl: string | null;
    thumbnailUrl: string | null;
    prompt: string;
    petName?: string;
    createdAt: string;
    errorMessage?: string;
    durationSeconds?: number | null;
}

function normalizeVideo(raw: Record<string, unknown>): Video {
    const get = <T,>(snake: string, camel: string): T | undefined => {
        const v = (raw[camel] ?? raw[snake]) as T | undefined;
        return v;
    };
    return {
        id: typeof raw.id === "string" ? raw.id : String(raw.id ?? ""),
        status: typeof raw.status === "string" ? raw.status : "pending",
        videoUrl: (get<string>("video_url", "videoUrl") as string | null) ?? null,
        thumbnailUrl: (get<string>("thumbnail_url", "thumbnailUrl") as string | null) ?? null,
        prompt: typeof raw.prompt === "string"
            ? raw.prompt
            : (typeof raw.custom_prompt === "string"
                ? raw.custom_prompt
                : (typeof raw.template_id === "string" ? raw.template_id : "")),
        petName: typeof raw.pet_name === "string"
            ? raw.pet_name
            : (typeof raw.petName === "string" ? raw.petName : undefined),
        createdAt: typeof raw.createdAt === "string"
            ? raw.createdAt
            : (typeof raw.created_at === "string" ? raw.created_at : ""),
        errorMessage: typeof raw.errorMessage === "string"
            ? raw.errorMessage
            : (typeof raw.error_message === "string" ? raw.error_message : undefined),
        durationSeconds: typeof raw.durationSeconds === "number"
            ? raw.durationSeconds
            : (typeof raw.duration_seconds === "number" ? raw.duration_seconds : null),
    };
}

function VideosTab({ pet, isMemorialMode, accentColor, refreshing, onRefresh, autoOpenGenerate, onAutoOpenConsumed }: {
    pet: NonNullable<ReturnType<typeof usePet>["selectedPet"]>;
    isMemorialMode: boolean;
    accentColor: string;
    refreshing: boolean;
    onRefresh: () => void;
    autoOpenGenerate?: boolean;
    onAutoOpenConsumed?: () => void;
}) {
    const { isDarkMode } = useDarkMode();
    const { session, profile } = useAuth();
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [generateOpen, setGenerateOpen] = useState(false);
    const [activeGenId, setActiveGenId] = useState<string | null>(null);
    const [activeStartedAt, setActiveStartedAt] = useState<number | null>(null);
    const [selectedVideo, setSelectedVideo] = useState<VideoResult | null>(null);
    const [tick, setTick] = useState(0); // 경과 시간 매초 갱신

    // 함께 보기 → AI 영상 생성 진입 시 자동으로 모달 열기
    useEffect(() => {
        if (autoOpenGenerate) {
            setGenerateOpen(true);
            onAutoOpenConsumed?.();
        }
    }, [autoOpenGenerate, onAutoOpenConsumed]);

    const pollCountRef = useRef(0);
    const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const load = useCallback(async () => {
        if (!session) { setLoading(false); return; }
        try {
            const res = await fetch(`${API_BASE_URL}/api/video/list?petId=${pet.id}&limit=10`, {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (!res.ok) return;
            const data = await res.json();
            const list = Array.isArray(data?.videos) ? data.videos : Array.isArray(data) ? data : [];
            const normalized = list.map(normalizeVideo);
            setVideos(normalized);
            // 진행 중 항목 자동 인식
            const inProgress = normalized.find((v: Video) => v.status === "pending" || v.status === "processing");
            if (inProgress && !activeGenId) {
                setActiveGenId(inProgress.id);
                setActiveStartedAt(inProgress.createdAt ? new Date(inProgress.createdAt).getTime() : Date.now());
            }
        } catch {
            // 조용히
        } finally {
            setLoading(false);
        }
    }, [session, pet.id, activeGenId]);

    useEffect(() => { load(); }, [load]);

    // 폴링 정지 헬퍼
    const stopPolling = useCallback(() => {
        if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
        }
        if (elapsedTimerRef.current) {
            clearInterval(elapsedTimerRef.current);
            elapsedTimerRef.current = null;
        }
        pollCountRef.current = 0;
    }, []);

    // 폴링 effect
    useEffect(() => {
        if (!activeGenId || !session?.access_token) {
            stopPolling();
            return;
        }
        if (pollTimerRef.current) return; // 중복 방지

        pollCountRef.current = 0;

        // 경과 시간 매초 업데이트
        elapsedTimerRef.current = setInterval(() => setTick((t) => t + 1), 1000);

        const poll = async () => {
            pollCountRef.current += 1;
            if (pollCountRef.current > VIDEO.MAX_POLL_COUNT) {
                stopPolling();
                setActiveGenId(null);
                setActiveStartedAt(null);
                RNAlert.alert(
                    "영상 생성 지연",
                    "예상보다 오래 걸리고 있어요. 잠시 후 다시 확인해주세요.",
                );
                return;
            }
            try {
                const res = await fetch(`${API_BASE_URL}/api/video/status/${activeGenId}`, {
                    headers: { Authorization: `Bearer ${session.access_token}` },
                });
                if (!res.ok) return;
                const data = await res.json();
                const updated = normalizeVideo(data);

                if (updated.status === "completed") {
                    stopPolling();
                    setActiveGenId(null);
                    setActiveStartedAt(null);
                    setVideos((prev) => {
                        const filtered = prev.filter((v) => v.id !== updated.id);
                        return [updated, ...filtered];
                    });
                    // 결과 모달 자동 오픈
                    setSelectedVideo({
                        id: updated.id,
                        petName: updated.petName ?? pet.name,
                        videoUrl: updated.videoUrl,
                        thumbnailUrl: updated.thumbnailUrl,
                        prompt: updated.prompt,
                        createdAt: updated.createdAt,
                        durationSeconds: updated.durationSeconds,
                    });
                } else if (updated.status === "failed") {
                    stopPolling();
                    setActiveGenId(null);
                    setActiveStartedAt(null);
                    setVideos((prev) => prev.filter((v) => v.id !== updated.id));
                    RNAlert.alert(
                        "영상 생성 실패",
                        updated.errorMessage || "영상 생성에 실패했어요. 다시 시도해주세요.",
                    );
                } else {
                    // 진행 중 — 리스트에 반영
                    setVideos((prev) => {
                        const exists = prev.find((v) => v.id === updated.id);
                        if (exists) {
                            return prev.map((v) => v.id === updated.id ? updated : v);
                        }
                        return [updated, ...prev];
                    });
                }
            } catch {
                // 네트워크 에러 — 다음 사이클에 재시도
            }
        };

        // 즉시 한 번 + 그 뒤 15초 간격
        poll();
        pollTimerRef.current = setInterval(poll, VIDEO.POLL_INTERVAL_MS);

        return stopPolling;
    }, [activeGenId, session?.access_token, stopPolling, pet.name]);

    // 컴포넌트 unmount 시 폴링 정리
    useEffect(() => {
        return () => stopPolling();
    }, [stopPolling]);

    function handleGenerationSuccess(generationId: string) {
        setGenerateOpen(false);
        if (!generationId) return;
        // 진행 중 placeholder 추가
        setVideos((prev) => [{
            id: generationId,
            status: "pending",
            videoUrl: null,
            thumbnailUrl: null,
            prompt: "",
            createdAt: new Date().toISOString(),
        }, ...prev]);
        setActiveGenId(generationId);
        setActiveStartedAt(Date.now());
    }

    /**
     * AI 영상 자랑하기 — 커뮤니티 "함께 보기"에 게시글 등록.
     * 웹 src/components/features/video/VideoResultModal.tsx handleShowOff와 동일 패턴.
     */
    async function handleShowOff(video: VideoResult) {
        if (!video.videoUrl) {
            RNAlert.alert("등록 실패", "영상이 아직 준비되지 않았어요");
            return;
        }
        if (!session?.access_token) {
            RNAlert.alert("등록 실패", "로그인이 필요합니다");
            return;
        }
        try {
            const res = await fetch(`${API_BASE_URL}/api/posts`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    boardType: "free",
                    badge: "자랑",
                    title: video.petName
                        ? `${video.petName}의 특별한 영상`
                        : "우리 아이의 AI 영상",
                    content: video.petName
                        ? `${video.petName}의 AI 영상을 만들었어요! 함께 감상해주세요.`
                        : "AI로 만든 우리 아이의 특별한 영상이에요!",
                    authorName: profile?.nickname || "익명",
                    videoUrl: video.videoUrl,
                }),
            });
            if (res.ok) {
                RNAlert.alert("등록 완료", "함께 보기에 영상이 등록되었어요!");
                setSelectedVideo(null);
            } else {
                const data = await res.json().catch(() => ({}));
                RNAlert.alert("등록 실패", data.error || "다시 시도해주세요");
            }
        } catch {
            RNAlert.alert("등록 실패", "네트워크 오류가 발생했어요");
        }
    }

    function getElapsed(): string {
        if (!activeStartedAt) return "";
        const sec = Math.floor((Date.now() - activeStartedAt) / 1000);
        if (sec < 60) return `${sec}초`;
        const min = Math.floor(sec / 60);
        return `${min}분 ${sec % 60}초`;
    }

    if (loading) {
        return <View style={styles.loadingInline}><ActivityIndicator color={accentColor} /></View>;
    }

    const hasActive = activeGenId !== null;
    const completedVideos = videos.filter((v) => v.status === "completed");

    if (videos.length === 0) {
        return (
            <>
                <ScrollView
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
                    contentContainerStyle={styles.tabContent}
                >
                    <View style={styles.emptyCard}>
                        <Ionicons name="videocam-outline" size={36} color={COLORS.gray[300]} />
                        <Text style={styles.emptyCardTitle}>AI 영상이 없어요</Text>
                        <Text style={styles.emptyCardHint}>
                            반려동물 사진을 토대로{"\n"}AI 영상을 만들어보세요
                        </Text>
                        <TouchableOpacity
                            onPress={() => setGenerateOpen(true)}
                            style={[styles.emptyAction, { borderColor: accentColor }]}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="sparkles-outline" size={16} color={accentColor} />
                            <Text style={[styles.emptyActionText, { color: accentColor }]}>첫 영상 만들기</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
                <VideoGenerateModal
                    visible={generateOpen}
                    onClose={() => setGenerateOpen(false)}
                    onSuccess={handleGenerationSuccess}
                    pet={pet}
                    isMemorialMode={isMemorialMode}
                />
            </>
        );
    }

    // tick은 경과 시간 표시 트리거용 (eslint 경고 회피)
    void tick;

    return (
        <>
            <FlatList
                data={videos}
                keyExtractor={(v) => v.id}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
                contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 12 }}
                ListHeaderComponent={
                    <>
                        <View style={styles.galleryHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.galleryHeaderTitle, {
                                    color: isDarkMode
                                        ? COLORS.white
                                        : (isMemorialMode ? COLORS.memorial[700] : COLORS.gray[800]),
                                }]}>
                                    AI 영상
                                </Text>
                                <Text style={styles.galleryHeaderCount}>
                                    {completedVideos.length}개{hasActive ? " · 1개 생성 중" : ""}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setGenerateOpen(true)}
                                disabled={hasActive}
                                style={[
                                    styles.uploadBtn,
                                    { backgroundColor: accentColor, opacity: hasActive ? 0.4 : 1 },
                                ]}
                                activeOpacity={0.85}
                            >
                                <Ionicons name="sparkles" size={14} color="#fff" />
                                <Text style={styles.uploadBtnText}>{hasActive ? "생성 중" : "새로 만들기"}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* 진행 중 카드 */}
                        {hasActive && (
                            <View style={[styles.activeGenCard, { borderColor: accentColor + "33", backgroundColor: accentColor + "0a" }]}>
                                <View style={[styles.activeGenDot, { backgroundColor: accentColor }]} />
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.activeGenTitle, { color: isDarkMode ? COLORS.white : COLORS.gray[900] }]}>
                                        영상을 만들고 있어요...
                                    </Text>
                                    <Text style={styles.activeGenSub}>
                                        경과 시간: {getElapsed()} · 보통 5~10분
                                    </Text>
                                    <Text style={styles.activeGenHint}>
                                        다른 페이지로 이동해도 괜찮아요
                                    </Text>
                                </View>
                                <ActivityIndicator color={accentColor} />
                            </View>
                        )}
                    </>
                }
                renderItem={({ item }) => {
                    const playable = item.status === "completed" && !!item.videoUrl;
                    return (
                        <TouchableOpacity
                            disabled={!playable}
                            onPress={() => {
                                if (!playable) return;
                                setSelectedVideo({
                                    id: item.id,
                                    petName: item.petName ?? pet.name,
                                    videoUrl: item.videoUrl,
                                    thumbnailUrl: item.thumbnailUrl,
                                    prompt: item.prompt,
                                    createdAt: item.createdAt,
                                    durationSeconds: item.durationSeconds,
                                });
                            }}
                            activeOpacity={0.85}
                            style={[styles.videoCard, {
                                backgroundColor: isDarkMode ? COLORS.gray[900] : COLORS.white,
                            }]}
                        >
                            <View style={styles.videoHero}>
                                {item.thumbnailUrl ? (
                                    <Image source={{ uri: item.thumbnailUrl }} style={styles.videoThumb} resizeMode="cover" />
                                ) : item.videoUrl ? (
                                    // 영상 첫 프레임 표시 (paused + muted)
                                    <ExpoVideo
                                        source={{ uri: item.videoUrl }}
                                        style={styles.videoThumb}
                                        resizeMode={ResizeMode.COVER}
                                        shouldPlay={false}
                                        isMuted
                                        positionMillis={300}
                                    />
                                ) : (
                                    <LinearGradient
                                        colors={[COLORS.memorial[400], "#F97316"]}
                                        style={styles.videoThumb}
                                    >
                                        <Ionicons name="videocam" size={36} color="rgba(255,255,255,0.5)" />
                                    </LinearGradient>
                                )}
                                {playable ? (
                                    <View style={styles.playOverlay}>
                                        <View style={styles.playCircle}>
                                            <Ionicons name="play" size={20} color={COLORS.memorial[600]} />
                                        </View>
                                    </View>
                                ) : item.status === "processing" || item.status === "pending" ? (
                                    <View style={styles.statusOverlay}>
                                        <ActivityIndicator color="#fff" />
                                        <Text style={styles.statusOverlayText}>
                                            {item.status === "pending" ? "대기 중..." : "생성 중..."}
                                        </Text>
                                    </View>
                                ) : item.status === "failed" ? (
                                    <View style={styles.statusOverlay}>
                                        <Ionicons name="close-circle-outline" size={28} color="#fff" />
                                        <Text style={styles.statusOverlayText}>실패</Text>
                                    </View>
                                ) : null}
                            </View>
                            <View style={{ padding: 12 }}>
                                <Text style={[styles.videoTitle, {
                                    color: isDarkMode ? COLORS.white : COLORS.gray[800],
                                }]} numberOfLines={2}>{item.prompt || "AI 영상"}</Text>
                                <Text style={styles.videoMeta}>
                                    {item.createdAt.slice(0, 10)} · {translateStatus(item.status)}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                }}
            />
            <VideoGenerateModal
                visible={generateOpen}
                onClose={() => setGenerateOpen(false)}
                onSuccess={handleGenerationSuccess}
                pet={pet}
                isMemorialMode={isMemorialMode}
            />
            <VideoResultModal
                visible={selectedVideo !== null}
                onClose={() => setSelectedVideo(null)}
                video={selectedVideo}
                accentColor={accentColor}
                onShowOff={handleShowOff}
            />
        </>
    );
}

function translateStatus(s: string): string {
    switch (s) {
        case "pending": return "대기 중";
        case "processing": return "생성 중";
        case "completed": return "완료";
        case "failed": return "실패";
        default: return s;
    }
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    loadingCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
    loadingInline: { paddingVertical: 32, alignItems: "center" },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 8,
    },
    title: { fontSize: 22, fontWeight: "700" },
    subtitle: { fontSize: 13, color: COLORS.gray[500], marginTop: 2 },
    addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    tabScrollOuter: { flexGrow: 0, flexShrink: 0 },
    tabScroll: { paddingHorizontal: 16, paddingVertical: 12 },
    tabPill: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 9999,
    },
    tabLabel: { fontSize: 13, fontWeight: "500" },
    tabLabelActive: { fontSize: 13, fontWeight: "600", color: "#fff" },
    tabContent: { padding: 16, paddingBottom: 32 },
    emptyCenter: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        paddingHorizontal: 24,
    },
    emptyHint: {
        fontSize: 14,
        color: COLORS.gray[500],
        textAlign: "center",
        marginTop: 8,
    },
    primaryBtn: {
        marginTop: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    primaryBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
    emptyIcon: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 4,
    },
    emptyTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
    emptyCard: {
        alignItems: "center",
        paddingVertical: 64,
        paddingHorizontal: 24,
        gap: 12,
    },
    emptyCardTitle: { fontSize: 15, fontWeight: "600", color: COLORS.gray[600] },
    emptyCardHint: { fontSize: 13, color: COLORS.gray[400], textAlign: "center", lineHeight: 18 },
    timelineItem: {
        padding: 16,
        borderRadius: 14,
        marginBottom: 12,
    },
    timelineRow: { flexDirection: "row", alignItems: "flex-start" },
    timelineActions: { flexDirection: "row", gap: 4 },
    iconBtnSm: { padding: 6 },
    timelineDate: { fontSize: 11, color: COLORS.gray[500], marginBottom: 4 },
    timelineTitle: { fontSize: 15, fontWeight: "700", marginBottom: 6 },
    timelineContent: { fontSize: 13, color: COLORS.gray[600], lineHeight: 18 },
    timelineHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    timelineHeaderTitle: { fontSize: 16, fontWeight: "700", color: COLORS.gray[800] },
    timelineHeaderCount: { fontSize: 12, color: COLORS.gray[400], marginTop: 2 },
    addEntryBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
    },
    addEntryText: { color: "#fff", fontSize: 13, fontWeight: "700" },
    moodFilterOuter: { flexGrow: 0, flexShrink: 0, marginBottom: 8 },
    moodFilterRow: { gap: 6, paddingRight: 16 },
    moodFilterChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 9999,
    },
    moodFilterText: { fontSize: 11, fontWeight: "600" },
    emptyAction: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1.5,
    },
    emptyActionText: { fontSize: 13, fontWeight: "600" },
    galleryHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    galleryHeaderTitle: { fontSize: 16, fontWeight: "700", color: COLORS.gray[800] },
    galleryHeaderCount: { fontSize: 12, color: COLORS.gray[400], marginTop: 2 },
    uploadBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
    },
    uploadBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
    gridItem: { flex: 1 / 3, aspectRatio: 1, padding: 1 },
    gridImg: { flex: 1 },
    selectOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "transparent",
        justifyContent: "flex-start",
        alignItems: "flex-end",
        padding: 6,
    },
    selectCheck: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        alignItems: "center",
        justifyContent: "center",
    },
    galleryActionBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: COLORS.gray[100],
        marginLeft: 6,
    },
    galleryActionText: { fontSize: 13, fontWeight: "600", color: COLORS.gray[700] },
    albumCard: {
        flex: 1,
        borderRadius: 14,
        overflow: "hidden",
        marginBottom: 12,
    },
    albumCover: { width: "100%", aspectRatio: 1 },
    albumTitle: { fontSize: 14, fontWeight: "600" },
    albumMeta: { fontSize: 11, color: COLORS.gray[500], marginTop: 4 },
    videoCard: {
        borderRadius: 14,
        overflow: "hidden",
    },
    videoHero: { width: "100%", aspectRatio: 16 / 9, position: "relative" },
    videoThumb: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
    playOverlay: {
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        alignItems: "center",
        justifyContent: "center",
    },
    playCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "rgba(255,255,255,0.9)",
        alignItems: "center",
        justifyContent: "center",
    },
    statusOverlay: {
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    statusOverlayText: { color: "#fff", fontSize: 12, fontWeight: "500" },
    videoTitle: { fontSize: 14, fontWeight: "600", lineHeight: 18 },
    videoMeta: { fontSize: 11, color: COLORS.gray[500], marginTop: 4 },
    activeGenCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
    },
    activeGenDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    activeGenTitle: { fontSize: 14, fontWeight: "700" },
    activeGenSub: { fontSize: 12, color: COLORS.gray[500], marginTop: 2 },
    activeGenHint: { fontSize: 11, color: COLORS.gray[400], marginTop: 2 },
});
