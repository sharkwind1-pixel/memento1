/**
 * MemoryAlbumsSection — 모바일
 *
 * 웹 src/components/features/record/MemoryAlbumsSection.tsx 1:1 이식.
 *  - GET /api/memory-albums?petId=...
 *  - 가로 스크롤 카드
 *  - 카드 탭 → 풀스크린 모달 슬라이드쇼
 *  - PATCH /api/memory-albums/:id/read (읽음 처리)
 */

import { useEffect, useState, useCallback, useRef } from "react";
import {
    View, Text, ScrollView, TouchableOpacity, Image, Modal,
    StyleSheet, ActivityIndicator, Pressable, Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/contexts/AuthContext";
import { useDarkMode } from "@/contexts/ThemeContext";
import { COLORS } from "@/lib/theme";
import { API_BASE_URL } from "@/config/constants";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

interface AlbumPhoto {
    id: string;
    url: string;
    caption?: string | null;
}

interface MemoryAlbum {
    id: string;
    petId: string;
    title: string;
    description?: string;
    isRead: boolean;
    createdDate: string;
    createdAt: string;
    photos?: AlbumPhoto[];
}

interface Props {
    petId: string;
    petName: string;
    isMemorialMode?: boolean;
}

export default function MemoryAlbumsSection({ petId, petName, isMemorialMode = true }: Props) {
    const { session } = useAuth();
    const { isDarkMode } = useDarkMode();
    const accessToken = session?.access_token;

    const [albums, setAlbums] = useState<MemoryAlbum[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<MemoryAlbum | null>(null);

    const loadAlbums = useCallback(async () => {
        if (!accessToken || !petId) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/memory-albums?petId=${petId}`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (!res.ok) {
                setAlbums([]);
                setUnreadCount(0);
                return;
            }
            const data = await res.json();
            setAlbums(data.albums ?? []);
            setUnreadCount(data.unreadCount ?? 0);
        } catch {
            setAlbums([]);
            setUnreadCount(0);
        } finally {
            setLoading(false);
        }
    }, [accessToken, petId]);

    useEffect(() => {
        loadAlbums();
    }, [loadAlbums]);

    async function handleClose() {
        if (selected && !selected.isRead && accessToken) {
            // 낙관적 업데이트
            setAlbums((prev) => prev.map((a) => (a.id === selected.id ? { ...a, isRead: true } : a)));
            setUnreadCount((prev) => Math.max(0, prev - 1));
            try {
                await fetch(`${API_BASE_URL}/api/memory-albums/${selected.id}/read`, {
                    method: "PATCH",
                    headers: { Authorization: `Bearer ${accessToken}` },
                });
            } catch {}
        }
        setSelected(null);
    }

    function formatDate(s: string): string {
        try {
            const d = new Date(s);
            return `${d.getMonth() + 1}월 ${d.getDate()}일`;
        } catch {
            return s;
        }
    }

    if (loading) {
        return (
            <View style={styles.section}>
                <View style={styles.headerRow}>
                    <Ionicons name="images" size={18} color={COLORS.memorial[500]} />
                    <Text style={[styles.title, { color: isDarkMode ? COLORS.memorial[200] : COLORS.gray[900] }]}>
                        추억 앨범
                    </Text>
                </View>
                <ActivityIndicator color={COLORS.memorial[500]} style={{ paddingVertical: 24 }} />
            </View>
        );
    }

    if (albums.length === 0) return null;

    return (
        <View style={styles.section}>
            <View style={styles.headerRow}>
                <Ionicons name="images" size={18} color={COLORS.memorial[500]} />
                <Text style={[styles.title, { color: isDarkMode ? COLORS.memorial[200] : COLORS.gray[900] }]}>
                    추억 앨범
                </Text>
                {unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                    </View>
                )}
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {albums.map((album) => {
                    const cover = album.photos?.[0]?.url;
                    return (
                        <TouchableOpacity
                            key={album.id}
                            onPress={() => setSelected(album)}
                            activeOpacity={0.85}
                            style={[
                                styles.card,
                                { backgroundColor: isDarkMode ? COLORS.gray[900] : COLORS.memorial[50] },
                            ]}
                        >
                            <View style={styles.cardImgWrap}>
                                {cover ? (
                                    <Image source={{ uri: cover }} style={styles.cardImg} resizeMode="cover" />
                                ) : (
                                    <View style={[styles.cardImg, styles.placeholder]}>
                                        <Ionicons name="images-outline" size={28} color={COLORS.memorial[300]} />
                                    </View>
                                )}
                                {!album.isRead && (
                                    <View style={styles.newBadge}>
                                        <Text style={styles.newBadgeText}>NEW</Text>
                                    </View>
                                )}
                                {album.photos && album.photos.length > 1 && (
                                    <View style={styles.countBadge}>
                                        <Text style={styles.countBadgeText}>{album.photos.length}장</Text>
                                    </View>
                                )}
                            </View>
                            <View style={styles.cardText}>
                                <Text
                                    style={[styles.cardTitle, { color: isDarkMode ? COLORS.gray[100] : COLORS.gray[900] }]}
                                    numberOfLines={1}
                                >
                                    {album.title}
                                </Text>
                                <Text style={styles.cardDate}>{formatDate(album.createdDate)}</Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* 풀스크린 뷰어 */}
            {selected && (
                <AlbumViewerModal album={selected} onClose={handleClose} />
            )}
        </View>
    );
}

// =============================================================================
// 풀스크린 뷰어 (간단한 좌우 스와이프 / 자동재생)
// =============================================================================
function AlbumViewerModal({ album, onClose }: { album: MemoryAlbum; onClose: () => void }) {
    const photos = album.photos ?? [];
    const total = photos.length;
    const [idx, setIdx] = useState(0);
    const [autoPlay, setAutoPlay] = useState(true);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!autoPlay || total <= 1) return;
        timerRef.current = setInterval(() => {
            setIdx((i) => (i >= total - 1 ? 0 : i + 1));
        }, 2200);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [autoPlay, total]);

    function prev() { setIdx((i) => (i <= 0 ? total - 1 : i - 1)); }
    function next() { setIdx((i) => (i >= total - 1 ? 0 : i + 1)); }

    const photo = photos[idx];

    return (
        <Modal visible animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
            <View style={viewerStyles.root}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

                {/* 상단 헤더 */}
                <View style={viewerStyles.topBar}>
                    <View style={{ flex: 1 }}>
                        <Text style={viewerStyles.title} numberOfLines={1}>{album.title}</Text>
                        {album.description ? (
                            <Text style={viewerStyles.desc} numberOfLines={2}>{album.description}</Text>
                        ) : null}
                    </View>
                    <TouchableOpacity onPress={onClose} style={viewerStyles.closeBtn} hitSlop={12}>
                        <Ionicons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* 사진 영역 */}
                <View style={viewerStyles.imageBox}>
                    {photo ? (
                        <Image source={{ uri: photo.url }} style={viewerStyles.image} resizeMode="contain" />
                    ) : (
                        <View style={viewerStyles.image} />
                    )}

                    {/* 좌우 탭 영역 */}
                    {total > 1 && (
                        <>
                            <Pressable style={viewerStyles.leftTap} onPress={prev} />
                            <Pressable style={viewerStyles.rightTap} onPress={next} />
                        </>
                    )}
                </View>

                {/* 캡션 */}
                {photo?.caption && (
                    <View style={viewerStyles.captionBox}>
                        <Text style={viewerStyles.captionText} numberOfLines={3}>{photo.caption}</Text>
                    </View>
                )}

                {/* 하단 컨트롤 */}
                <View style={viewerStyles.bottomBar}>
                    <TouchableOpacity onPress={prev} style={viewerStyles.ctrlBtn} hitSlop={8}>
                        <Ionicons name="chevron-back" size={22} color="#fff" />
                    </TouchableOpacity>
                    <View style={viewerStyles.indicators}>
                        {photos.map((_, i) => (
                            <View
                                key={i}
                                style={[
                                    viewerStyles.dot,
                                    i === idx && viewerStyles.dotActive,
                                ]}
                            />
                        ))}
                    </View>
                    <TouchableOpacity onPress={() => setAutoPlay((v) => !v)} style={viewerStyles.ctrlBtn} hitSlop={8}>
                        <Ionicons name={autoPlay ? "pause" : "play"} size={20} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={next} style={viewerStyles.ctrlBtn} hitSlop={8}>
                        <Ionicons name="chevron-forward" size={22} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    section: { marginBottom: 16 },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 4,
        marginBottom: 10,
    },
    title: { fontSize: 15, fontWeight: "700" },
    unreadBadge: {
        backgroundColor: COLORS.memorial[500],
        minWidth: 20,
        height: 20,
        paddingHorizontal: 6,
        borderRadius: 9999,
        alignItems: "center",
        justifyContent: "center",
    },
    unreadBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
    scrollContent: { paddingHorizontal: 4, gap: 10 },
    card: {
        width: 128,
        borderRadius: 14,
        overflow: "hidden",
        marginRight: 8,
    },
    cardImgWrap: {
        width: "100%",
        aspectRatio: 3 / 4,
        position: "relative",
    },
    cardImg: { width: "100%", height: "100%" },
    placeholder: { backgroundColor: COLORS.memorial[100], alignItems: "center", justifyContent: "center" },
    newBadge: {
        position: "absolute",
        top: 8, right: 8,
        backgroundColor: COLORS.memorial[500],
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    newBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
    countBadge: {
        position: "absolute",
        bottom: 8, right: 8,
        backgroundColor: "rgba(0,0,0,0.45)",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    countBadgeText: { color: "#fff", fontSize: 9, fontWeight: "600" },
    cardText: { padding: 8 },
    cardTitle: { fontSize: 12, fontWeight: "700" },
    cardDate: { fontSize: 10, color: COLORS.gray[500], marginTop: 2 },
});

const viewerStyles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "rgba(0,0,0,0.93)" },
    topBar: {
        position: "absolute",
        top: 50,
        left: 16,
        right: 16,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        zIndex: 10,
    },
    title: { color: "#fff", fontSize: 16, fontWeight: "700" },
    desc: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 4, lineHeight: 16 },
    closeBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: "rgba(255,255,255,0.18)",
        alignItems: "center", justifyContent: "center",
    },
    imageBox: { flex: 1, justifyContent: "center", alignItems: "center" },
    image: { width: SCREEN_W, height: SCREEN_H * 0.7 },
    leftTap: {
        position: "absolute",
        top: 0, bottom: 0, left: 0,
        width: SCREEN_W * 0.3,
    },
    rightTap: {
        position: "absolute",
        top: 0, bottom: 0, right: 0,
        width: SCREEN_W * 0.3,
    },
    captionBox: {
        position: "absolute",
        bottom: 86,
        left: 24, right: 24,
        backgroundColor: "rgba(0,0,0,0.55)",
        borderRadius: 12,
        padding: 12,
    },
    captionText: { color: "#fff", fontSize: 13, lineHeight: 19 },
    bottomBar: {
        position: "absolute",
        bottom: 36,
        left: 16, right: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    ctrlBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.2)",
        alignItems: "center", justifyContent: "center",
    },
    indicators: {
        flex: 1,
        flexDirection: "row",
        justifyContent: "center",
        gap: 4,
    },
    dot: {
        width: 6, height: 6, borderRadius: 3,
        backgroundColor: "rgba(255,255,255,0.4)",
    },
    dotActive: { backgroundColor: "#fff", width: 18 },
});
