/**
 * VoiceMemorySection (mobile) — "다시 듣고 싶은 목소리" 추모 모드 전용.
 * 웹 src/components/features/record/VoiceMemorySection.tsx 패리티.
 *
 * 업로드된 영상(원본 오디오 포함)을 모아 우리 아이의 진짜 목소리를 다시 들을 수 있게 한다.
 * 재사용: selectedPet.photos(영상)·expo-av. 새 저장소/업로드 경로 없음.
 * 수동재생: ExpoVideo useNativeControls + shouldPlay={false} — 갑작스러운 재생 방지.
 * 본인 record 안에서만 렌더 → 본인전용. (모바일 공유 PhotoLightbox는 Image만 지원해 영상 재생 불가 → 자체 플레이어.)
 */

import { useState } from "react";
import {
    View, Text, TouchableOpacity, Image, Modal, ScrollView, StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Video as ExpoVideo, ResizeMode } from "expo-av";
import { COLORS } from "@/lib/theme";

interface PhotoLike {
    id: string;
    url: string;
    type?: "image" | "video";
    caption?: string | null;
    thumbnailUrl?: string | null;
}

interface Props {
    petName: string;
    photos: PhotoLike[];
    onUploadPress: () => void;
}

export default function VoiceMemorySection({ petName, photos, onUploadPress }: Props) {
    const videos = photos.filter((p) => p.type === "video");
    const [playUrl, setPlayUrl] = useState<string | null>(null);

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <Ionicons name="volume-high" size={18} color={COLORS.memorial[500]} />
                <Text style={styles.title}>다시 듣고 싶은 목소리</Text>
            </View>

            {videos.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={styles.emptyText}>
                        {petName}의 영상을 올리면{"\n"}언제든 그 목소리를 다시 들을 수 있어요.
                    </Text>
                    <TouchableOpacity style={styles.uploadBtn} onPress={onUploadPress} activeOpacity={0.85}>
                        <Text style={styles.uploadBtnText}>영상 올리기</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    <Text style={styles.hint}>조용한 곳에서 천천히 들어보세요. 소리가 함께 재생돼요.</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.thumbRow}
                    >
                        {videos.map((v) => (
                            <TouchableOpacity
                                key={v.id}
                                style={styles.thumb}
                                activeOpacity={0.85}
                                onPress={() => setPlayUrl(v.url)}
                                accessibilityLabel={`${v.caption || petName} 영상 재생`}
                            >
                                {v.thumbnailUrl ? (
                                    <Image source={{ uri: v.thumbnailUrl }} style={styles.thumbImg} resizeMode="cover" />
                                ) : (
                                    <View style={[styles.thumbImg, styles.thumbFallback]} />
                                )}
                                <View style={styles.playOverlay}>
                                    <View style={styles.playCircle}>
                                        <Ionicons name="play" size={18} color={COLORS.memorial[600]} />
                                    </View>
                                </View>
                                {v.caption ? (
                                    <Text numberOfLines={1} style={styles.thumbCaption}>{v.caption}</Text>
                                ) : null}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </>
            )}

            <Modal visible={playUrl !== null} transparent animationType="fade" onRequestClose={() => setPlayUrl(null)}>
                <View style={styles.playerBackdrop}>
                    <TouchableOpacity style={styles.playerClose} onPress={() => setPlayUrl(null)} hitSlop={12}>
                        <Ionicons name="close" size={26} color="#fff" />
                    </TouchableOpacity>
                    {playUrl ? (
                        <ExpoVideo
                            source={{ uri: playUrl }}
                            style={styles.player}
                            resizeMode={ResizeMode.CONTAIN}
                            useNativeControls
                            shouldPlay={false}
                        />
                    ) : null}
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.memorial[50],
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "rgba(217,119,6,0.2)",
        gap: 10,
    },
    header: { flexDirection: "row", alignItems: "center", gap: 6 },
    title: { fontSize: 15, fontWeight: "700", color: COLORS.memorial[800] },
    hint: { fontSize: 12, color: COLORS.memorial[700], opacity: 0.85 },
    empty: { alignItems: "center", paddingVertical: 12 },
    emptyText: { fontSize: 13, color: COLORS.memorial[700], textAlign: "center", lineHeight: 20 },
    uploadBtn: {
        marginTop: 12,
        backgroundColor: COLORS.memorial[500],
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 999,
    },
    uploadBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
    thumbRow: { gap: 12, paddingVertical: 2 },
    thumb: {
        width: 104,
        height: 104,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "rgba(0,0,0,0.8)",
    },
    thumbImg: { width: "100%", height: "100%" },
    thumbFallback: { backgroundColor: COLORS.memorial[200] },
    playOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
    playCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: "rgba(255,255,255,0.85)",
        alignItems: "center",
        justifyContent: "center",
    },
    thumbCaption: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 6,
        paddingVertical: 4,
        fontSize: 11,
        color: "#fff",
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    playerBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", alignItems: "center", justifyContent: "center" },
    playerClose: { position: "absolute", top: 44, right: 20, zIndex: 10 },
    player: { width: "100%", height: "70%" },
});
