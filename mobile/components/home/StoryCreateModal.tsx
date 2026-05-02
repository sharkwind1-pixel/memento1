/**
 * StoryCreateModal — 스토리 작성 (웹 src/components/features/home/StoryCreateModal.tsx 매칭)
 *
 * - 사진/텍스트 모드
 * - 텍스트는 8개 배경색 중 선택
 * - 24시간 후 자동 삭제
 * - Supabase pet-media 버킷에 업로드
 */

import { useState } from "react";
import {
    View, Text, TextInput, TouchableOpacity, Modal, Image,
    ScrollView, StyleSheet, Alert, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/contexts/AuthContext";
import { useDarkMode } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";
import { API_BASE_URL } from "@/config/constants";
import { COLORS } from "@/lib/theme";

const BG_COLORS = [
    "#05B2DC", "#F59E0B", "#8B5CF6", "#EC4899",
    "#10B981", "#F97316", "#3B82F6", "#EF4444",
];

type StoryMode = "photo" | "text";

interface Props {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function StoryCreateModal({ visible, onClose, onSuccess }: Props) {
    const { user, session } = useAuth();
    const { isDarkMode } = useDarkMode();
    const [mode, setMode] = useState<StoryMode>("text");
    const [textContent, setTextContent] = useState("");
    const [bgColor, setBgColor] = useState(BG_COLORS[0]);
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    function reset() {
        setTextContent("");
        setBgColor(BG_COLORS[0]);
        setImageUri(null);
        setMode("text");
    }

    function handleClose() {
        if (submitting) return;
        reset();
        onClose();
    }

    async function pickImage() {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
            Alert.alert("권한 필요", "사진 라이브러리 접근 권한이 필요해요");
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.85,
            allowsEditing: false,
        });
        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
                Alert.alert("크기 초과", "10MB 이하의 이미지만 가능합니다");
                return;
            }
            setImageUri(asset.uri);
            setMode("photo");
        }
    }

    async function handleSubmit() {
        if (!user || !session) {
            Alert.alert("로그인 필요", "로그인 후 다시 시도해주세요");
            return;
        }
        if (mode === "text" && !textContent.trim()) {
            Alert.alert("알림", "텍스트를 입력해주세요");
            return;
        }
        if (mode === "photo" && !imageUri) {
            Alert.alert("알림", "사진을 선택해주세요");
            return;
        }

        setSubmitting(true);
        try {
            let imageUrl: string | null = null;

            if (mode === "photo" && imageUri) {
                const ext = imageUri.split(".").pop()?.split("?")[0] || "jpg";
                const path = `stories/${user.id}/${Date.now()}.${ext}`;

                // RN fetch + arrayBuffer 패턴
                const response = await fetch(imageUri);
                const arrayBuffer = await response.arrayBuffer();

                const { error: uploadErr } = await supabase.storage
                    .from("pet-media")
                    .upload(path, new Uint8Array(arrayBuffer), {
                        cacheControl: "86400",
                        upsert: false,
                        contentType: `image/${ext === "jpg" ? "jpeg" : ext}`,
                    });

                if (uploadErr) throw new Error("이미지 업로드 실패: " + uploadErr.message);

                const { data } = supabase.storage.from("pet-media").getPublicUrl(path);
                imageUrl = data.publicUrl;
            }

            const res = await fetch(`${API_BASE_URL}/api/stories`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    imageUrl,
                    textContent: mode === "text" ? textContent.trim() : null,
                    backgroundColor: mode === "text" ? bgColor : null,
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "스토리 작성 실패");
            }

            Alert.alert("완료", "스토리가 올라갔어요 (24시간 후 자동 삭제)");
            reset();
            onSuccess();
        } catch (e) {
            Alert.alert("실패", (e as Error).message || "스토리 작성 실패");
        } finally {
            setSubmitting(false);
        }
    }

    const canSubmit = !submitting && (
        (mode === "text" && textContent.trim().length > 0) ||
        (mode === "photo" && !!imageUri)
    );

    const modalBg = isDarkMode ? COLORS.gray[900] : "#fff";
    const headerBorder = isDarkMode ? COLORS.gray[800] : COLORS.gray[100];
    const titleColor = isDarkMode ? COLORS.white : COLORS.gray[900];
    const modeBorder = isDarkMode ? COLORS.gray[700] : COLORS.gray[200];
    const modeActiveBg = isDarkMode ? "rgba(5,178,220,0.12)" : COLORS.memento[50];
    const modeInactiveColor = isDarkMode ? COLORS.gray[400] : COLORS.gray[500];
    const previewBg = isDarkMode ? COLORS.gray[800] : COLORS.gray[100];
    const pickerBorder = isDarkMode ? COLORS.gray[700] : COLORS.gray[300];
    const inputBorder = isDarkMode ? COLORS.gray[700] : COLORS.gray[200];
    const inputBg = isDarkMode ? COLORS.gray[800] : "#fff";
    const inputColor = isDarkMode ? COLORS.gray[100] : COLORS.gray[800];
    const placeholderColor = isDarkMode ? COLORS.gray[500] : COLORS.gray[400];
    const colorLabelColor = isDarkMode ? COLORS.gray[400] : COLORS.gray[500];
    const colorDotActiveBorder = isDarkMode ? COLORS.gray[300] : COLORS.gray[800];
    const submitHintColor = isDarkMode ? COLORS.gray[500] : COLORS.gray[400];

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
            <View style={styles.backdrop}>
                <View style={[styles.modal, { backgroundColor: modalBg }]}>
                    {/* 헤더 */}
                    <View style={[styles.header, { borderBottomColor: headerBorder }]}>
                        <Text style={[styles.title, { color: titleColor }]}>스토리 올리기</Text>
                        <TouchableOpacity onPress={handleClose} hitSlop={8} style={styles.closeBtn}>
                            <Ionicons name="close" size={20} color={modeInactiveColor} />
                        </TouchableOpacity>
                    </View>

                    {/* 모드 선택 */}
                    <View style={styles.modeRow}>
                        <TouchableOpacity
                            onPress={() => setMode("photo")}
                            style={[
                                styles.modeBtn,
                                { borderColor: modeBorder },
                                mode === "photo" && { borderColor: COLORS.memento[500], backgroundColor: modeActiveBg },
                            ]}
                            activeOpacity={0.85}
                        >
                            <Ionicons
                                name="camera-outline"
                                size={16}
                                color={mode === "photo" ? COLORS.memento[600] : modeInactiveColor}
                            />
                            <Text style={[
                                styles.modeText,
                                { color: modeInactiveColor },
                                mode === "photo" && { color: COLORS.memento[600] },
                            ]}>사진</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setMode("text")}
                            style={[
                                styles.modeBtn,
                                { borderColor: modeBorder },
                                mode === "text" && { borderColor: COLORS.memento[500], backgroundColor: modeActiveBg },
                            ]}
                            activeOpacity={0.85}
                        >
                            <Ionicons
                                name="text-outline"
                                size={16}
                                color={mode === "text" ? COLORS.memento[600] : modeInactiveColor}
                            />
                            <Text style={[
                                styles.modeText,
                                { color: modeInactiveColor },
                                mode === "text" && { color: COLORS.memento[600] },
                            ]}>텍스트</Text>
                        </TouchableOpacity>
                    </View>

                    {/* 콘텐츠 */}
                    <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
                        {mode === "photo" ? (
                            imageUri ? (
                                <View style={[styles.imagePreview, { backgroundColor: previewBg }]}>
                                    <Image source={{ uri: imageUri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                                    <TouchableOpacity
                                        onPress={() => setImageUri(null)}
                                        style={styles.imageCloseBtn}
                                        hitSlop={6}
                                    >
                                        <Ionicons name="close" size={16} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity onPress={pickImage} style={[styles.imagePicker, { borderColor: pickerBorder }]} activeOpacity={0.85}>
                                    <Ionicons name="camera" size={36} color={placeholderColor} />
                                    <Text style={[styles.imagePickerText, { color: placeholderColor }]}>사진 선택</Text>
                                </TouchableOpacity>
                            )
                        ) : (
                            <View>
                                {/* 미리보기 */}
                                <View style={[styles.textPreview, { backgroundColor: bgColor }]}>
                                    <Text style={styles.textPreviewContent}>
                                        {textContent || "여기에 텍스트가 표시됩니다"}
                                    </Text>
                                </View>

                                <TextInput
                                    value={textContent}
                                    onChangeText={setTextContent}
                                    placeholder="오늘의 한마디..."
                                    placeholderTextColor={placeholderColor}
                                    multiline
                                    maxLength={500}
                                    style={[styles.textInput, { borderColor: inputBorder, backgroundColor: inputBg, color: inputColor }]}
                                />

                                {/* 배경색 */}
                                <View style={styles.colorRow}>
                                    <Text style={[styles.colorLabel, { color: colorLabelColor }]}>배경</Text>
                                    {BG_COLORS.map((color) => (
                                        <TouchableOpacity
                                            key={color}
                                            onPress={() => setBgColor(color)}
                                            style={[
                                                styles.colorDot,
                                                { backgroundColor: color },
                                                bgColor === color && { borderColor: colorDotActiveBorder, transform: [{ scale: 1.1 }] },
                                            ]}
                                            activeOpacity={0.7}
                                        />
                                    ))}
                                </View>
                            </View>
                        )}
                    </ScrollView>

                    {/* 발행 */}
                    <View style={styles.submitWrap}>
                        <Text style={[styles.submitHint, { color: submitHintColor }]}>스토리는 24시간 후 자동으로 사라집니다</Text>
                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={!canSubmit}
                            style={[styles.submitBtn, !canSubmit && { opacity: 0.4 }]}
                            activeOpacity={0.85}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.submitText}>스토리 올리기</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
    },
    modal: {
        width: "100%",
        maxWidth: 400,
        maxHeight: "90%",
        borderRadius: 24,
        overflow: "hidden",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    title: { fontSize: 16, fontWeight: "700" },
    closeBtn: { padding: 6 },
    modeRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingTop: 16 },
    modeBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 2,
    },
    modeText: { fontSize: 14, fontWeight: "600" },
    imagePreview: {
        width: "100%",
        aspectRatio: 9 / 16,
        maxHeight: 320,
        borderRadius: 16,
        overflow: "hidden",
        position: "relative",
    },
    imageCloseBtn: {
        position: "absolute",
        top: 8,
        right: 8,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "rgba(0,0,0,0.5)",
        alignItems: "center",
        justifyContent: "center",
    },
    imagePicker: {
        width: "100%",
        aspectRatio: 9 / 16,
        maxHeight: 320,
        borderRadius: 16,
        borderWidth: 2,
        borderStyle: "dashed",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    imagePickerText: { fontSize: 13 },
    textPreview: {
        width: "100%",
        aspectRatio: 9 / 16,
        maxHeight: 200,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
        marginBottom: 12,
    },
    textPreviewContent: {
        fontSize: 18,
        fontWeight: "700",
        color: "#fff",
        textAlign: "center",
        lineHeight: 26,
        textShadowColor: "rgba(0,0,0,0.3)",
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    textInput: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        marginBottom: 12,
        minHeight: 64,
        textAlignVertical: "top",
    },
    colorRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
    colorLabel: { fontSize: 12, marginRight: 4 },
    colorDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: "transparent",
    },
    submitWrap: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        paddingTop: 8,
    },
    submitHint: {
        fontSize: 10,
        textAlign: "center",
        marginBottom: 12,
    },
    submitBtn: {
        backgroundColor: COLORS.memento[500],
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: "center",
    },
    submitText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
