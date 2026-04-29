/**
 * AlbumDetailModal — AI 추억 앨범 상세 뷰
 *
 * 웹 src/components/features/record/MemoryAlbumViewer.tsx 매칭 (단순화).
 * - 풀스크린 모달
 * - 헤더: 제목 + 닫기
 * - 설명/컨셉 카드
 * - 사진 그리드 (3열)
 * - 사진 탭하면 PhotoLightbox 풀스크린
 */

import { useState } from "react";
import { useDarkMode } from "@/contexts/ThemeContext";
import {
    View, Text, Modal, TouchableOpacity, Image,
    ScrollView, StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/theme";
import PhotoLightbox from "./PhotoLightbox";

interface AlbumPhoto {
    id: string;
    url: string;
    caption?: string | null;
}

interface Album {
    id: string;
    title: string;
    description: string;
    concept: string;
    photos: AlbumPhoto[];
    createdAt: string;
}

interface Props {
    album: Album | null;
    visible: boolean;
    onClose: () => void;
    isMemorialMode: boolean;
}

export default function AlbumDetailModal({ album, visible, onClose, isMemorialMode }: Props) {
    const { isDarkMode } = useDarkMode();
    const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

    if (!album) return null;

    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.gray[50];
    const cardBg = isDarkMode ? COLORS.gray[900] : "#fff";
    const titleColor = isMemorialMode ? "#fff" : COLORS.gray[900];
    const subColor = isDarkMode ? COLORS.gray[300] : COLORS.gray[600];

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
                <View style={[styles.header, { borderBottomColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[100] }]}>
                    <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.headerBtn}>
                        <Ionicons name="close" size={22} color={titleColor} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: titleColor }]} numberOfLines={1}>
                        추억 앨범
                    </Text>
                    <View style={{ width: 32 }} />
                </View>

                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
                    {/* 컨셉 / 제목 */}
                    <View style={[styles.titleCard, { backgroundColor: cardBg }]}>
                        {album.concept ? (
                            <Text style={[styles.concept, { color: COLORS.memento[500] }]}>
                                {album.concept}
                            </Text>
                        ) : null}
                        <Text style={[styles.title, { color: titleColor }]}>{album.title}</Text>
                        <Text style={[styles.date, { color: subColor }]}>
                            {album.createdAt.slice(0, 10)} · {album.photos.length}장
                        </Text>
                        {album.description ? (
                            <Text style={[styles.description, { color: subColor }]}>
                                {album.description}
                            </Text>
                        ) : null}
                    </View>

                    {/* 사진 그리드 */}
                    {album.photos.length > 0 ? (
                        <View style={styles.grid}>
                            {album.photos.map((photo, idx) => (
                                <TouchableOpacity
                                    key={photo.id}
                                    activeOpacity={0.85}
                                    onPress={() => setLightboxIdx(idx)}
                                    style={styles.gridItem}
                                >
                                    <Image source={{ uri: photo.url }} style={styles.gridImg} resizeMode="cover" />
                                </TouchableOpacity>
                            ))}
                        </View>
                    ) : (
                        <View style={styles.emptyBox}>
                            <Ionicons name="image-outline" size={28} color={COLORS.gray[400]} />
                            <Text style={[styles.emptyText, { color: subColor }]}>
                                포함된 사진이 없어요
                            </Text>
                        </View>
                    )}
                </ScrollView>

                <PhotoLightbox
                    photos={album.photos.map((p) => ({ id: p.id, url: p.url, caption: p.caption }))}
                    initialIndex={lightboxIdx ?? 0}
                    visible={lightboxIdx !== null}
                    onClose={() => setLightboxIdx(null)}
                />
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        gap: 12,
    },
    headerBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
    headerTitle: { flex: 1, fontSize: 16, fontWeight: "700", textAlign: "center" },
    titleCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    concept: { fontSize: 12, fontWeight: "600", marginBottom: 4 },
    title: { fontSize: 20, fontWeight: "700", marginBottom: 6 },
    date: { fontSize: 12, marginBottom: 10 },
    description: { fontSize: 14, lineHeight: 22 },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
    gridItem: {
        width: "32.6%",
        aspectRatio: 1,
        backgroundColor: COLORS.gray[100],
        borderRadius: 6,
        overflow: "hidden",
    },
    gridImg: { width: "100%", height: "100%" },
    emptyBox: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 36,
        gap: 6,
    },
    emptyText: { fontSize: 13 },
});
