/**
 * 기록 탭 (V3 Phase 5: 4탭 확장)
 * - 타임라인 (timeline_entries)
 * - 사진첩 (pet_media)
 * - 앨범 (memory_albums) — AI 자동 생성 앨범
 * - 비디오 (video_generations) — AI 영상
 */

import { useState, useEffect, useCallback } from "react";
import {
    View, Text, ScrollView, TouchableOpacity,
    Image, FlatList, RefreshControl, ActivityIndicator,
    StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { API_BASE_URL } from "@/config/constants";
import { COLORS } from "@/lib/theme";
import AppHeader from "@/components/common/AppHeader";
import AppDrawer from "@/components/common/AppDrawer";
import TimelineWriteModal, { type TimelineEntryDraft, type TimelineMood } from "@/components/record/TimelineWriteModal";
import { supabase } from "@/lib/supabase";
import * as Haptics from "expo-haptics";
import { Alert as RNAlert } from "react-native";

type TabType = "timeline" | "gallery" | "albums" | "videos";

const TABS: Array<{ id: TabType; label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }> = [
    { id: "timeline", label: "타임라인", icon: "time-outline" },
    { id: "gallery", label: "사진첩", icon: "images-outline" },
    { id: "albums", label: "앨범", icon: "albums-outline" },
    { id: "videos", label: "AI 영상", icon: "videocam-outline" },
];

export default function RecordScreen() {
    const router = useRouter();
    const { selectedPet, isLoading: petsLoading, isMemorialMode, refreshPets } = usePet();
    const [activeTab, setActiveTab] = useState<TabType>("timeline");
    const [refreshing, setRefreshing] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);

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

    const bgColor = isMemorialMode ? COLORS.gray[950] : COLORS.gray[50];

    return (
        <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
            <AppHeader onOpenDrawer={() => setDrawerOpen(true)} />
            <AppDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
            {/* 헤더 */}
            <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.title, { color: isMemorialMode ? COLORS.white : COLORS.gray[900] }]}>
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

            {/* 탭 (가로 스크롤) */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabScroll}
            >
                {TABS.map((tab) => {
                    const active = activeTab === tab.id;
                    return (
                        <TouchableOpacity
                            key={tab.id}
                            onPress={() => setActiveTab(tab.id)}
                            activeOpacity={0.85}
                        >
                            {active ? (
                                <LinearGradient
                                    colors={accentGradient}
                                    style={styles.tabPill}
                                >
                                    <Ionicons name={tab.icon} size={14} color="#fff" />
                                    <Text numberOfLines={1} allowFontScaling={false} style={styles.tabLabelActive}>{tab.label}</Text>
                                </LinearGradient>
                            ) : (
                                <View style={[styles.tabPill, {
                                    backgroundColor: isMemorialMode ? COLORS.gray[800] : COLORS.white,
                                    borderWidth: 1,
                                    borderColor: isMemorialMode ? COLORS.gray[700] : COLORS.gray[200],
                                }]}>
                                    <Ionicons name={tab.icon} size={14} color={isMemorialMode ? COLORS.gray[400] : COLORS.gray[600]} />
                                    <Text
                                        numberOfLines={1}
                                        allowFontScaling={false}
                                        style={{
                                            fontSize: 13,
                                            fontWeight: "500",
                                            color: isMemorialMode ? COLORS.gray[400] : COLORS.gray[600],
                                            flexShrink: 0,
                                        }}
                                    >
                                        {tab.label}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* 컨텐츠 */}
            {!selectedPet ? (
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
                            photos={selectedPet.photos}
                            isMemorialMode={isMemorialMode}
                            accentColor={accentColor}
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                        />
                    )}
                    {activeTab === "albums" && (
                        <AlbumsTab
                            isMemorialMode={isMemorialMode}
                            accentColor={accentColor}
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                        />
                    )}
                    {activeTab === "videos" && (
                        <VideosTab
                            isMemorialMode={isMemorialMode}
                            accentColor={accentColor}
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                        />
                    )}
                </>
            )}
        </SafeAreaView>
    );
}

// ============================================
// 타임라인 탭
// ============================================
interface TimelineEntry {
    id: string;
    type: string;
    title: string;
    content: string;
    date: string;
    photos: string[];
}

function TimelineTab({ petId, petName, isMemorialMode, accentColor, refreshing, onRefresh }: {
    petId: string;
    petName: string;
    isMemorialMode: boolean;
    accentColor: string;
    refreshing: boolean;
    onRefresh: () => void;
}) {
    const { user, session } = useAuth();
    const [entries, setEntries] = useState<TimelineEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<TimelineEntryDraft | undefined>(undefined);

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
                // 수정
                const { error } = await supabase
                    .from("timeline_entries")
                    .update({
                        date: draft.date,
                        title: draft.title,
                        content: draft.content || null,
                        mood: draft.mood,
                    })
                    .eq("id", draft.id);
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
        } catch (e: any) {
            RNAlert.alert("저장 실패", e?.message || "다시 시도해주세요");
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
                    if (!session) return;
                    const { error } = await supabase
                        .from("timeline_entries")
                        .delete()
                        .eq("id", entryId);
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

    return (
        <>
            <FlatList
                data={entries}
                keyExtractor={(e) => e.id}
                contentContainerStyle={[styles.tabContent, { paddingBottom: 96 }]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
                ListHeaderComponent={
                    <View style={styles.timelineHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.timelineHeaderTitle, isMemorialMode && { color: COLORS.white }]}>
                                타임라인 일기
                            </Text>
                            <Text style={styles.timelineHeaderCount}>{entries.length}개</Text>
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
                        backgroundColor: isMemorialMode ? COLORS.gray[900] : COLORS.white,
                    }]}>
                        <View style={styles.timelineRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.timelineDate}>{item.date}</Text>
                                <Text style={[styles.timelineTitle, {
                                    color: isMemorialMode ? COLORS.white : COLORS.gray[900],
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
                            <Text style={[styles.timelineContent, isMemorialMode && { color: COLORS.gray[300] }]} numberOfLines={3}>
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
function GalleryTab({ photos, isMemorialMode, accentColor, refreshing, onRefresh }: {
    photos: NonNullable<ReturnType<typeof usePet>["selectedPet"]>["photos"];
    isMemorialMode: boolean;
    accentColor: string;
    refreshing: boolean;
    onRefresh: () => void;
}) {
    if (photos.length === 0) {
        return (
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
                contentContainerStyle={styles.tabContent}
            >
                <View style={styles.emptyCard}>
                    <Ionicons name="images-outline" size={36} color={COLORS.gray[300]} />
                    <Text style={styles.emptyCardTitle}>아직 사진이 없어요</Text>
                    <Text style={styles.emptyCardHint}>소중한 순간을 담아보세요</Text>
                </View>
            </ScrollView>
        );
    }

    return (
        <FlatList
            data={photos}
            keyExtractor={(item) => item.id}
            numColumns={3}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
            renderItem={({ item }) => (
                <TouchableOpacity activeOpacity={0.85} style={styles.gridItem}>
                    <Image source={{ uri: item.url }} style={styles.gridImg} resizeMode="cover" />
                </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingTop: 8, paddingBottom: 32 }}
        />
    );
}

// ============================================
// 앨범 탭 (memory_albums)
// ============================================
interface MemoryAlbum {
    id: string;
    title: string;
    coverImage: string | null;
    photoCount: number;
    createdAt: string;
}

function AlbumsTab({ isMemorialMode, accentColor, refreshing, onRefresh }: {
    isMemorialMode: boolean;
    accentColor: string;
    refreshing: boolean;
    onRefresh: () => void;
}) {
    const { session } = useAuth();
    const [albums, setAlbums] = useState<MemoryAlbum[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!session) { setLoading(false); return; }
        try {
            const res = await fetch(`${API_BASE_URL}/api/memory-albums`, {
                headers: { "Authorization": `Bearer ${session.access_token}` },
            });
            if (!res.ok) return;
            const data = await res.json();
            const list = Array.isArray(data?.albums) ? data.albums : Array.isArray(data) ? data : [];
            setAlbums(list.map((raw: Record<string, unknown>): MemoryAlbum => ({
                id: typeof raw.id === "string" ? raw.id : String(raw.id ?? ""),
                title: typeof raw.title === "string" ? raw.title : "",
                coverImage: typeof raw.coverImage === "string"
                    ? raw.coverImage
                    : (typeof raw.cover_image === "string" ? raw.cover_image : null),
                photoCount: typeof raw.photoCount === "number"
                    ? raw.photoCount
                    : (typeof raw.photo_count === "number" ? raw.photo_count : 0),
                createdAt: typeof raw.createdAt === "string"
                    ? raw.createdAt
                    : (typeof raw.created_at === "string" ? raw.created_at : ""),
            })));
        } catch {
            // 조용히
        } finally {
            setLoading(false);
        }
    }, [session]);

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
        <FlatList
            data={albums}
            keyExtractor={(a) => a.id}
            numColumns={2}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            columnWrapperStyle={{ gap: 12 }}
            renderItem={({ item }) => (
                <TouchableOpacity activeOpacity={0.85} style={[styles.albumCard, {
                    backgroundColor: isMemorialMode ? COLORS.gray[900] : COLORS.white,
                }]}>
                    {item.coverImage ? (
                        <Image source={{ uri: item.coverImage }} style={styles.albumCover} resizeMode="cover" />
                    ) : (
                        <View style={[styles.albumCover, {
                            backgroundColor: isMemorialMode ? COLORS.gray[800] : COLORS.gray[100],
                            alignItems: "center",
                            justifyContent: "center",
                        }]}>
                            <Ionicons name="albums" size={32} color={COLORS.gray[400]} />
                        </View>
                    )}
                    <View style={{ padding: 12 }}>
                        <Text style={[styles.albumTitle, {
                            color: isMemorialMode ? COLORS.white : COLORS.gray[800],
                        }]} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.albumMeta}>{item.photoCount}장 · {item.createdAt.slice(0, 10)}</Text>
                    </View>
                </TouchableOpacity>
            )}
        />
    );
}

// ============================================
// 비디오 탭 (AI 영상)
// ============================================
interface Video {
    id: string;
    status: string;
    videoUrl: string | null;
    thumbnailUrl: string | null;
    prompt: string;
    createdAt: string;
}

function VideosTab({ isMemorialMode, accentColor, refreshing, onRefresh }: {
    isMemorialMode: boolean;
    accentColor: string;
    refreshing: boolean;
    onRefresh: () => void;
}) {
    const { session } = useAuth();
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!session) { setLoading(false); return; }
        try {
            const res = await fetch(`${API_BASE_URL}/api/video/list`, {
                headers: { "Authorization": `Bearer ${session.access_token}` },
            });
            if (!res.ok) return;
            const data = await res.json();
            const list = Array.isArray(data?.videos) ? data.videos : Array.isArray(data) ? data : [];
            setVideos(list.map((raw: Record<string, unknown>): Video => ({
                id: typeof raw.id === "string" ? raw.id : String(raw.id ?? ""),
                status: typeof raw.status === "string" ? raw.status : "pending",
                videoUrl: typeof raw.videoUrl === "string"
                    ? raw.videoUrl
                    : (typeof raw.video_url === "string" ? raw.video_url : null),
                thumbnailUrl: typeof raw.thumbnailUrl === "string"
                    ? raw.thumbnailUrl
                    : (typeof raw.thumbnail_url === "string" ? raw.thumbnail_url : null),
                prompt: typeof raw.prompt === "string" ? raw.prompt : "",
                createdAt: typeof raw.createdAt === "string"
                    ? raw.createdAt
                    : (typeof raw.created_at === "string" ? raw.created_at : ""),
            })));
        } catch {
            // 조용히
        } finally {
            setLoading(false);
        }
    }, [session]);

    useEffect(() => { load(); }, [load]);

    if (loading) {
        return <View style={styles.loadingInline}><ActivityIndicator color={accentColor} /></View>;
    }

    if (videos.length === 0) {
        return (
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
                contentContainerStyle={styles.tabContent}
            >
                <View style={styles.emptyCard}>
                    <Ionicons name="videocam-outline" size={36} color={COLORS.gray[300]} />
                    <Text style={styles.emptyCardTitle}>AI 영상이 없어요</Text>
                    <Text style={styles.emptyCardHint}>
                        프리미엄 구독 시 월 3회{"\n"}AI 영상을 만들 수 있어요
                    </Text>
                </View>
            </ScrollView>
        );
    }

    return (
        <FlatList
            data={videos}
            keyExtractor={(v) => v.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
            contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 12 }}
            renderItem={({ item }) => (
                <View style={[styles.videoCard, {
                    backgroundColor: isMemorialMode ? COLORS.gray[900] : COLORS.white,
                }]}>
                    <View style={styles.videoHero}>
                        {item.thumbnailUrl ? (
                            <Image source={{ uri: item.thumbnailUrl }} style={styles.videoThumb} resizeMode="cover" />
                        ) : (
                            <LinearGradient
                                colors={[COLORS.memorial[400], "#F97316"]}
                                style={styles.videoThumb}
                            >
                                <Ionicons name="videocam" size={36} color="rgba(255,255,255,0.5)" />
                            </LinearGradient>
                        )}
                        {item.status === "completed" && item.videoUrl ? (
                            <View style={styles.playOverlay}>
                                <View style={styles.playCircle}>
                                    <Ionicons name="play" size={20} color={COLORS.memorial[600]} />
                                </View>
                            </View>
                        ) : item.status === "processing" ? (
                            <View style={styles.statusOverlay}>
                                <ActivityIndicator color="#fff" />
                                <Text style={styles.statusOverlayText}>생성 중...</Text>
                            </View>
                        ) : null}
                    </View>
                    <View style={{ padding: 12 }}>
                        <Text style={[styles.videoTitle, {
                            color: isMemorialMode ? COLORS.white : COLORS.gray[800],
                        }]} numberOfLines={2}>{item.prompt || "AI 영상"}</Text>
                        <Text style={styles.videoMeta}>{item.createdAt.slice(0, 10)} · {item.status}</Text>
                    </View>
                </View>
            )}
        />
    );
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
    tabScroll: { paddingHorizontal: 16, gap: 8, paddingVertical: 12 },
    tabPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 9999,
        flexShrink: 0,
    },
    tabLabelActive: { fontSize: 13, fontWeight: "600", color: "#fff", flexShrink: 0 },
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
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    primaryBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
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
    gridItem: { flex: 1 / 3, aspectRatio: 1, padding: 1 },
    gridImg: { flex: 1 },
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
});
