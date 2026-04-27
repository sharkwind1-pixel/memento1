/**
 * StoryViewer — 풀스크린 스토리 뷰어 (웹 src/components/features/home/StoryViewer.tsx 매칭)
 *
 * - 프로그레스 바 (각 스토리 5초)
 * - 좌측 1/3 탭: 이전 / 우측 2/3 탭: 다음
 * - 자동 진행 / X 버튼 닫기
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
    View, Text, TouchableWithoutFeedback, Image, Modal,
    StyleSheet, Dimensions, TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/theme";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

interface StoryItem {
    id: string;
    image_url: string | null;
    text_content: string | null;
    background_color: string;
    created_at: string;
}

interface StoryUser {
    userId: string;
    nickname: string;
    avatar: string | null;
    stories: StoryItem[];
}

interface Props {
    user: StoryUser | null;
    visible: boolean;
    onClose: () => void;
}

const DURATION = 5000;
const INTERVAL = 50;

export default function StoryViewer({ user, visible, onClose }: Props) {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [progress, setProgress] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const story = user?.stories[currentIdx];

    const goNext = useCallback(() => {
        if (!user) return;
        if (currentIdx < user.stories.length - 1) {
            setCurrentIdx((p) => p + 1);
            setProgress(0);
        } else {
            onClose();
        }
    }, [currentIdx, user, onClose]);

    const goPrev = useCallback(() => {
        if (currentIdx > 0) {
            setCurrentIdx((p) => p - 1);
            setProgress(0);
        }
    }, [currentIdx]);

    useEffect(() => {
        if (!visible) {
            setCurrentIdx(0);
            setProgress(0);
            return;
        }
        setProgress(0);
        timerRef.current = setInterval(() => {
            setProgress((p) => {
                const next = p + (INTERVAL / DURATION) * 100;
                if (next >= 100) {
                    goNext();
                    return 0;
                }
                return next;
            });
        }, INTERVAL);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [currentIdx, goNext, visible]);

    function handleTap(e: any) {
        const x = e.nativeEvent.locationX;
        if (x < SCREEN_W / 3) goPrev();
        else goNext();
    }

    function getRelativeTime(dateStr: string): string {
        const diff = Date.now() - new Date(dateStr).getTime();
        const hours = Math.floor(diff / 3600000);
        if (hours < 1) return `${Math.max(1, Math.floor(diff / 60000))}분 전`;
        return `${hours}시간 전`;
    }

    if (!user || !story) return null;

    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
            <View style={styles.fullscreen}>
                <TouchableWithoutFeedback onPress={handleTap}>
                    <View style={styles.storyArea}>
                        {story.image_url ? (
                            <Image source={{ uri: story.image_url }} style={styles.image} resizeMode="cover" />
                        ) : (
                            <View style={[styles.textBg, { backgroundColor: story.background_color || "#05B2DC" }]}>
                                <Text style={styles.textContent}>{story.text_content}</Text>
                            </View>
                        )}
                    </View>
                </TouchableWithoutFeedback>

                {/* 프로그레스 바 */}
                <View style={styles.progressRow} pointerEvents="none">
                    {user.stories.map((_, i) => (
                        <View key={i} style={styles.progressTrack}>
                            <View style={[
                                styles.progressFill,
                                {
                                    width: i < currentIdx ? "100%" :
                                        i === currentIdx ? `${progress}%` : "0%",
                                },
                            ]} />
                        </View>
                    ))}
                </View>

                {/* 헤더 */}
                <View style={styles.header} pointerEvents="box-none">
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{user.nickname[0]}</Text>
                    </View>
                    <Text style={styles.nickname}>{user.nickname}</Text>
                    <Text style={styles.time}>{getRelativeTime(story.created_at)}</Text>
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity onPress={onClose} hitSlop={10} style={styles.closeBtn}>
                        <Ionicons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    fullscreen: {
        flex: 1,
        backgroundColor: "#000",
        position: "relative",
    },
    storyArea: { flex: 1, width: SCREEN_W, height: SCREEN_H },
    image: { width: "100%", height: "100%" },
    textBg: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
    textContent: {
        fontSize: 22,
        fontWeight: "700",
        color: "#fff",
        textAlign: "center",
        lineHeight: 32,
        textShadowColor: "rgba(0,0,0,0.3)",
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    progressRow: {
        position: "absolute",
        top: 12,
        left: 0,
        right: 0,
        flexDirection: "row",
        gap: 4,
        paddingHorizontal: 12,
        zIndex: 20,
    },
    progressTrack: {
        flex: 1,
        height: 2,
        backgroundColor: "rgba(255,255,255,0.3)",
        borderRadius: 1,
        overflow: "hidden",
    },
    progressFill: { height: "100%", backgroundColor: "#fff" },
    header: {
        position: "absolute",
        top: 32,
        left: 16,
        right: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        zIndex: 20,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "rgba(255,255,255,0.2)",
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: { color: "#fff", fontSize: 14, fontWeight: "700" },
    nickname: { color: "#fff", fontSize: 14, fontWeight: "600" },
    time: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
    closeBtn: { padding: 4 },
});
