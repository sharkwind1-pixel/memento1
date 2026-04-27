/**
 * PhotoLightbox — 사진 풀스크린 뷰어
 *
 * 웹 src/components/features/home/Lightbox.tsx 매칭 (단순화).
 * - 가로 스와이프로 이전/다음
 * - X 버튼으로 닫기
 * - 페이지 인디케이터
 */

import { useRef, useEffect, useState } from "react";
import {
    View, Text, Modal, TouchableOpacity, Image,
    Dimensions, FlatList, StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/theme";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

interface Props {
    photos: Array<{ id: string; url: string; caption?: string | null }>;
    initialIndex: number;
    visible: boolean;
    onClose: () => void;
}

export default function PhotoLightbox({ photos, initialIndex, visible, onClose }: Props) {
    const flatListRef = useRef<FlatList<typeof photos[0]>>(null);
    const [currentIdx, setCurrentIdx] = useState(initialIndex);

    useEffect(() => {
        if (visible) {
            setCurrentIdx(initialIndex);
            // 모달이 열린 직후 initialIndex로 스크롤
            setTimeout(() => {
                flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false });
            }, 50);
        }
    }, [visible, initialIndex]);

    if (!photos[currentIdx]) return null;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.fullscreen}>
                {/* 닫기 + 카운터 */}
                <View style={styles.topBar} pointerEvents="box-none">
                    <Text style={styles.counter}>{currentIdx + 1} / {photos.length}</Text>
                    <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.closeBtn}>
                        <Ionicons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                <FlatList
                    ref={flatListRef}
                    data={photos}
                    keyExtractor={(item) => item.id}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    initialScrollIndex={initialIndex}
                    getItemLayout={(_, index) => ({
                        length: SCREEN_W,
                        offset: SCREEN_W * index,
                        index,
                    })}
                    onMomentumScrollEnd={(e) => {
                        const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
                        setCurrentIdx(idx);
                    }}
                    renderItem={({ item }) => (
                        <View style={styles.page}>
                            <Image
                                source={{ uri: item.url }}
                                style={styles.image}
                                resizeMode="contain"
                            />
                        </View>
                    )}
                />

                {/* 캡션 */}
                {photos[currentIdx]?.caption ? (
                    <View style={styles.captionBar}>
                        <Text style={styles.captionText}>{photos[currentIdx].caption}</Text>
                    </View>
                ) : null}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    fullscreen: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.95)",
    },
    topBar: {
        position: "absolute",
        top: 40,
        left: 0,
        right: 0,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        zIndex: 10,
    },
    counter: { color: "#fff", fontSize: 14, fontWeight: "600" },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "rgba(0,0,0,0.4)",
        alignItems: "center",
        justifyContent: "center",
    },
    page: {
        width: SCREEN_W,
        height: SCREEN_H,
        alignItems: "center",
        justifyContent: "center",
    },
    image: { width: SCREEN_W, height: SCREEN_H * 0.85 },
    captionBar: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 40,
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    captionText: { color: "#fff", fontSize: 14, lineHeight: 20, textAlign: "center" },
});
