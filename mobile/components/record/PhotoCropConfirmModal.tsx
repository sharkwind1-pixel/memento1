/**
 * PhotoCropConfirmModal — 펫 프로필/게시글 이미지 picker 후 확정 단계
 *
 * 흐름:
 *  1. ImagePicker(allowsEditing=true)로 1차 자르기
 *  2. 이 모달이 결과를 보여주고 회전/리테이크/확정 옵션 제공
 *  3. expo-image-manipulator로 회전 적용 (좌/우 90도)
 *
 * 부모 측에서 onConfirm(uri)으로 최종 URI 수신.
 */

import { useEffect, useState } from "react";
import {
    View, Text, Modal, TouchableOpacity, Image,
    StyleSheet, ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImageManipulator from "expo-image-manipulator";
import { useDarkMode } from "@/contexts/ThemeContext";
import { COLORS } from "@/lib/theme";

interface Props {
    visible: boolean;
    initialUri: string | null;
    accentColor: string;
    onClose: () => void;
    onConfirm: (uri: string) => void;
    onRetake: () => void; // 다시 고르기 (부모가 ImagePicker 재실행)
}

export default function PhotoCropConfirmModal({
    visible, initialUri, accentColor, onClose, onConfirm, onRetake,
}: Props) {
    const insets = useSafeAreaInsets();
    const { isDarkMode } = useDarkMode();
    const [uri, setUri] = useState<string | null>(initialUri);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (visible) setUri(initialUri);
    }, [visible, initialUri]);

    async function rotate(direction: "left" | "right") {
        if (!uri || busy) return;
        setBusy(true);
        try {
            const rotation = direction === "left" ? -90 : 90;
            const result = await ImageManipulator.manipulateAsync(
                uri,
                [{ rotate: rotation }],
                { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
            );
            setUri(result.uri);
        } catch {
            // 조용히 실패
        } finally {
            setBusy(false);
        }
    }

    function handleConfirm() {
        if (!uri) return;
        onConfirm(uri);
    }

    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.gray[900];

    return (
        <Modal visible={visible} animationType="fade" onRequestClose={onClose} transparent={false}>
            <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
                {/* 헤더 */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.headerBtn}>
                        <Ionicons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>사진 확인</Text>
                    <View style={{ width: 32 }} />
                </View>

                {/* 미리보기 */}
                <View style={styles.preview}>
                    {uri ? (
                        <Image source={{ uri }} style={styles.image} resizeMode="contain" />
                    ) : (
                        <Text style={{ color: "#aaa" }}>이미지가 없어요</Text>
                    )}
                    {busy && (
                        <View style={styles.busyOverlay}>
                            <ActivityIndicator size="large" color="#fff" />
                        </View>
                    )}
                </View>

                {/* 회전 버튼 */}
                <View style={styles.rotateRow}>
                    <TouchableOpacity
                        onPress={() => rotate("left")}
                        disabled={!uri || busy}
                        style={styles.rotateBtn}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-undo" size={20} color="#fff" />
                        <Text style={styles.rotateText}>왼쪽 회전</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => rotate("right")}
                        disabled={!uri || busy}
                        style={styles.rotateBtn}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-redo" size={20} color="#fff" />
                        <Text style={styles.rotateText}>오른쪽 회전</Text>
                    </TouchableOpacity>
                </View>

                {/* 하단 액션 */}
                <View style={[styles.actionRow, { paddingBottom: 16 + insets.bottom }]}>
                    <TouchableOpacity
                        onPress={onRetake}
                        disabled={busy}
                        style={[styles.secondaryBtn, busy && { opacity: 0.5 }]}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="image-outline" size={18} color="#fff" />
                        <Text style={styles.secondaryBtnText}>다시 고르기</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={handleConfirm}
                        disabled={!uri || busy}
                        style={[
                            styles.primaryBtn,
                            { backgroundColor: accentColor, opacity: !uri || busy ? 0.5 : 1 },
                        ]}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="checkmark" size={18} color="#fff" />
                        <Text style={styles.primaryBtnText}>이대로 사용</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    headerBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
    headerTitle: { flex: 1, color: "#fff", fontSize: 17, fontWeight: "700", textAlign: "center" },
    preview: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
    },
    image: { width: "100%", height: "100%" },
    busyOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.4)",
        alignItems: "center",
        justifyContent: "center",
    },
    rotateRow: {
        flexDirection: "row",
        gap: 12,
        paddingHorizontal: 16,
        paddingBottom: 16,
        justifyContent: "center",
    },
    rotateBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: "rgba(255,255,255,0.15)",
    },
    rotateText: { color: "#fff", fontSize: 13, fontWeight: "600" },
    actionRow: {
        flexDirection: "row",
        gap: 10,
        paddingHorizontal: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "rgba(255,255,255,0.1)",
    },
    secondaryBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: "rgba(255,255,255,0.15)",
    },
    secondaryBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
    primaryBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 14,
        borderRadius: 12,
    },
    primaryBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
