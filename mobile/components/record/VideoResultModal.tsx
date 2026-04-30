/**
 * VideoResultModal — AI 영상 결과 풀스크린 재생
 * 웹 src/components/features/video/VideoResultModal.tsx 매칭 (모바일 단순화).
 *
 * - expo-av Video로 자동 재생, 컨트롤 표시
 * - 다운로드(공유) / 자랑하기 두 액션
 * - 영상 정보 (이름 + 날짜)
 */

import { useRef, useState } from "react";
import {
    View, Text, Modal, TouchableOpacity, StyleSheet,
    ActivityIndicator, Alert, Share,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av";
import { COLORS } from "@/lib/theme";

export interface VideoResult {
    id: string;
    petName?: string;
    videoUrl: string | null;
    thumbnailUrl: string | null;
    prompt?: string;
    createdAt?: string;
    durationSeconds?: number | null;
}

interface Props {
    visible: boolean;
    onClose: () => void;
    video: VideoResult | null;
    accentColor: string;
    onShowOff?: (video: VideoResult) => void;
}

export default function VideoResultModal({ visible, onClose, video, accentColor, onShowOff }: Props) {
    const insets = useSafeAreaInsets();
    const videoRef = useRef<Video>(null);
    const [loading, setLoading] = useState(true);
    const [errored, setErrored] = useState(false);

    function handleLoad(status: AVPlaybackStatus) {
        if (status.isLoaded) {
            setLoading(false);
            setErrored(false);
        }
    }

    function handleError() {
        setLoading(false);
        setErrored(true);
    }

    async function handleShare() {
        if (!video?.videoUrl) return;
        try {
            await Share.share({
                message: `${video.petName ?? "우리 아이"}의 AI 영상\n${video.videoUrl}`,
                url: video.videoUrl,
            });
        } catch {
            // 사용자 취소 — 무시
        }
    }

    function handleShowOff() {
        if (!video) return;
        onShowOff?.(video);
    }

    if (!video) return null;

    return (
        <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
            <SafeAreaView style={styles.flex1} edges={["top", "bottom"]}>
                {/* 헤더 */}
                <View style={[styles.header, { paddingTop: insets.top > 0 ? 0 : 12 }]}>
                    <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.headerBtn}>
                        <Ionicons name="close" size={26} color="#fff" />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle} numberOfLines={1}>
                            {video.petName ?? "AI 영상"}
                        </Text>
                        {video.createdAt && (
                            <Text style={styles.headerSub}>{video.createdAt.slice(0, 10)}</Text>
                        )}
                    </View>
                    <TouchableOpacity onPress={handleShare} hitSlop={8} style={styles.headerBtn}>
                        <Ionicons name="share-outline" size={22} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* 비디오 */}
                <View style={styles.videoWrap}>
                    {video.videoUrl ? (
                        <>
                            <Video
                                ref={videoRef}
                                source={{ uri: video.videoUrl }}
                                style={StyleSheet.absoluteFill}
                                resizeMode={ResizeMode.CONTAIN}
                                useNativeControls
                                shouldPlay
                                isLooping
                                onLoad={handleLoad}
                                onError={handleError}
                            />
                            {loading && (
                                <View style={styles.loadingOverlay}>
                                    <ActivityIndicator size="large" color="#fff" />
                                </View>
                            )}
                            {errored && (
                                <View style={styles.errorOverlay}>
                                    <Ionicons name="alert-circle-outline" size={40} color="#fff" />
                                    <Text style={styles.errorText}>영상을 불러오지 못했어요</Text>
                                    <TouchableOpacity
                                        onPress={() => {
                                            setErrored(false);
                                            setLoading(true);
                                            videoRef.current?.loadAsync({ uri: video.videoUrl! }).catch(() => {});
                                        }}
                                        style={[styles.retryBtn, { borderColor: accentColor }]}
                                    >
                                        <Text style={[styles.retryText, { color: accentColor }]}>다시 시도</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </>
                    ) : (
                        <View style={styles.errorOverlay}>
                            <Ionicons name="videocam-off-outline" size={40} color="#fff" />
                            <Text style={styles.errorText}>아직 영상이 준비되지 않았어요</Text>
                        </View>
                    )}
                </View>

                {/* 프롬프트/설명 */}
                {video.prompt && (
                    <View style={styles.promptBox}>
                        <Text style={styles.promptLabel}>스타일</Text>
                        <Text style={styles.promptText}>{video.prompt}</Text>
                    </View>
                )}

                {/* 액션 */}
                <View style={[styles.actionRow, { paddingBottom: 12 + Math.max(insets.bottom, 0) }]}>
                    <TouchableOpacity
                        onPress={handleShare}
                        style={[styles.actionBtn, { backgroundColor: "#1F2937" }]}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="download-outline" size={18} color="#fff" />
                        <Text style={styles.actionText}>공유</Text>
                    </TouchableOpacity>
                    {onShowOff && (
                        <TouchableOpacity
                            onPress={handleShowOff}
                            style={[styles.actionBtn, { backgroundColor: accentColor, flex: 2 }]}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="sparkles" size={18} color="#fff" />
                            <Text style={styles.actionText}>자랑하기</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1, backgroundColor: "#000" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 12,
        gap: 8,
    },
    headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
    headerTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
    headerSub: { color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 2 },
    videoWrap: {
        flex: 1,
        backgroundColor: "#000",
        position: "relative",
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.4)",
    },
    errorOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        backgroundColor: "#000",
    },
    errorText: { color: "#fff", fontSize: 14 },
    retryBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 9999,
        borderWidth: 1,
    },
    retryText: { fontSize: 13, fontWeight: "600" },
    promptBox: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#111827",
        borderTopWidth: 1,
        borderTopColor: "#1F2937",
    },
    promptLabel: { color: "rgba(255,255,255,0.5)", fontSize: 11, marginBottom: 4 },
    promptText: { color: "#fff", fontSize: 13, lineHeight: 20 },
    actionRow: {
        flexDirection: "row",
        gap: 10,
        paddingHorizontal: 16,
        paddingTop: 12,
        backgroundColor: "#0F172A",
    },
    actionBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 14,
        borderRadius: 12,
    },
    actionText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});

export type { Props as VideoResultModalProps };
