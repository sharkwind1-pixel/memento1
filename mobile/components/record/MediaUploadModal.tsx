/**
 * MediaUploadModal — 사진/영상 업로드 모달
 *
 * 웹 src/components/features/record/MediaUploadModal.tsx 매칭 (단순화).
 * - expo-image-picker로 다중 선택
 * - Supabase pet-media 버킷 업로드
 * - pet_media 테이블에 INSERT
 * - 캡션 입력 (선택)
 */

import { useState } from "react";
import {
    View, Text, Modal, TouchableOpacity, Image,
    TextInput, ScrollView, StyleSheet, ActivityIndicator,
    Alert, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useDarkMode } from "@/contexts/ThemeContext";
import { COLORS } from "@/lib/theme";

interface SelectedAsset {
    uri: string;
    type: "image" | "video";
    width?: number;
    height?: number;
}

interface Props {
    petId: string;
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function MediaUploadModal({ petId, visible, onClose, onSuccess }: Props) {
    const { user } = useAuth();
    const { isDarkMode } = useDarkMode();
    const [assets, setAssets] = useState<SelectedAsset[]>([]);
    const [caption, setCaption] = useState("");
    const [uploading, setUploading] = useState(false);

    function reset() {
        setAssets([]);
        setCaption("");
    }

    function handleClose() {
        if (uploading) return;
        reset();
        onClose();
    }

    function extToMime(ext: string, kind: "image" | "video"): string {
        const e = ext.toLowerCase();
        if (kind === "video") {
            if (e === "mov") return "video/quicktime";
            if (e === "m4v") return "video/x-m4v";
            if (e === "webm") return "video/webm";
            return "video/mp4";
        }
        if (e === "jpg" || e === "jpeg") return "image/jpeg";
        if (e === "png") return "image/png";
        if (e === "gif") return "image/gif";
        if (e === "webp") return "image/webp";
        if (e === "heic") return "image/heic";
        if (e === "heif") return "image/heif";
        return "image/jpeg";
    }

    async function pickMedia() {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
            Alert.alert("권한 필요", "사진/영상 라이브러리 접근 권한이 필요해요");
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsMultipleSelection: true,
            selectionLimit: 10,
            quality: 0.85,
        });
        if (!result.canceled) {
            const newAssets: SelectedAsset[] = result.assets.map((a) => ({
                uri: a.uri,
                type: a.type === "video" ? "video" : "image",
                width: a.width,
                height: a.height,
            }));
            setAssets((prev) => [...prev, ...newAssets].slice(0, 10));
        }
    }

    function removeAsset(idx: number) {
        setAssets((prev) => prev.filter((_, i) => i !== idx));
    }

    async function handleUpload() {
        if (!user || assets.length === 0) return;
        setUploading(true);
        let success = 0;
        try {
            for (let i = 0; i < assets.length; i++) {
                const a = assets[i];
                const ext = a.uri.split(".").pop()?.split("?")[0]?.toLowerCase() || (a.type === "video" ? "mp4" : "jpg");
                const path = `${user.id}/${petId}/${Date.now()}_${i}.${ext}`;

                const response = await fetch(a.uri);
                const arrayBuffer = await response.arrayBuffer();

                const contentType = extToMime(ext, a.type);

                const { error: uploadErr } = await supabase.storage
                    .from("pet-media")
                    .upload(path, new Uint8Array(arrayBuffer), {
                        cacheControl: "3600",
                        upsert: false,
                        contentType,
                    });
                if (uploadErr) {
                    console.warn("[Media] upload error:", uploadErr.message);
                    continue;
                }

                const { data: urlData } = supabase.storage
                    .from("pet-media")
                    .getPublicUrl(path);

                const { error: insertErr } = await supabase.from("pet_media").insert({
                    pet_id: petId,
                    user_id: user.id,
                    type: a.type,
                    url: urlData.publicUrl,
                    storage_path: path,
                    date: new Date().toISOString().slice(0, 10),
                    caption: caption.trim() || null,
                });
                if (insertErr) {
                    console.warn("[Media] insert error:", insertErr.message);
                    continue;
                }
                success++;
            }

            if (success > 0) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                Alert.alert("완료", `${success}개의 미디어가 업로드되었어요`);
                reset();
                onSuccess();
            } else {
                Alert.alert("실패", "업로드에 실패했습니다");
            }
        } catch (e) {
            Alert.alert("오류", e instanceof Error ? e.message : "업로드 중 오류가 발생했습니다");
        } finally {
            setUploading(false);
        }
    }

    const canSubmit = !uploading && assets.length > 0;

    const modalBg = isDarkMode ? COLORS.gray[900] : "#fff";
    const headerBorder = isDarkMode ? COLORS.gray[800] : COLORS.gray[100];
    const titleColor = isDarkMode ? COLORS.white : COLORS.gray[900];
    const labelColor = isDarkMode ? COLORS.gray[300] : COLORS.gray[700];
    const inputBg = isDarkMode ? COLORS.gray[800] : COLORS.gray[50];
    const inputBorder = isDarkMode ? COLORS.gray[700] : COLORS.gray[200];
    const inputColor = isDarkMode ? COLORS.gray[100] : COLORS.gray[800];
    const placeholderColor = isDarkMode ? COLORS.gray[500] : COLORS.gray[400];
    const gridItemBg = isDarkMode ? COLORS.gray[800] : COLORS.gray[100];
    const ghostBg = isDarkMode ? COLORS.gray[800] : COLORS.white;
    const ghostBorder = isDarkMode ? COLORS.gray[700] : COLORS.gray[300];
    const ghostTextColor = isDarkMode ? COLORS.gray[300] : COLORS.gray[700];

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
            <View style={styles.backdrop}>
                <View style={[styles.modal, { backgroundColor: modalBg }]}>
                    <View style={[styles.header, { borderBottomColor: headerBorder }]}>
                        <Text style={[styles.title, { color: titleColor }]}>미디어 업로드</Text>
                        <TouchableOpacity onPress={handleClose} hitSlop={8}>
                            <Ionicons name="close" size={20} color={isDarkMode ? COLORS.gray[400] : COLORS.gray[500]} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
                        {/* 선택된 미디어 그리드 */}
                        {assets.length === 0 ? (
                            <TouchableOpacity onPress={pickMedia} style={styles.pickerEmpty} activeOpacity={0.85}>
                                <Ionicons name="images" size={36} color={COLORS.memento[500]} />
                                <Text style={styles.pickerEmptyTitle}>사진/영상 선택</Text>
                                <Text style={styles.pickerEmptyHint}>최대 10개까지 한 번에 업로드</Text>
                            </TouchableOpacity>
                        ) : (
                            <>
                                <View style={styles.grid}>
                                    {assets.map((a, idx) => (
                                        <View key={idx} style={[styles.gridItem, { backgroundColor: gridItemBg }]}>
                                            <Image source={{ uri: a.uri }} style={styles.gridImg} />
                                            {a.type === "video" && (
                                                <View style={styles.videoBadge}>
                                                    <Ionicons name="videocam" size={10} color="#fff" />
                                                </View>
                                            )}
                                            <TouchableOpacity onPress={() => removeAsset(idx)} style={styles.removeBtn}>
                                                <Ionicons name="close" size={12} color="#fff" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                    {assets.length < 10 && (
                                        <TouchableOpacity onPress={pickMedia} style={[styles.gridItem, styles.addBtn]} activeOpacity={0.85}>
                                            <Ionicons name="add" size={28} color={COLORS.memento[500]} />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                <Text style={[styles.label, { color: labelColor }]}>캡션 (선택)</Text>
                                <TextInput
                                    value={caption}
                                    onChangeText={setCaption}
                                    placeholder="이 순간을 한마디로..."
                                    placeholderTextColor={placeholderColor}
                                    style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: inputColor }]}
                                    multiline
                                    maxLength={200}
                                />
                            </>
                        )}
                    </ScrollView>

                    <View style={[styles.footer, { borderTopColor: headerBorder }]}>
                        <TouchableOpacity
                            onPress={handleClose}
                            style={[styles.btn, styles.btnGhost, { backgroundColor: ghostBg, borderColor: ghostBorder }]}
                            disabled={uploading}
                            activeOpacity={0.85}
                        >
                            <Text style={[styles.btnGhostText, { color: ghostTextColor }]}>취소</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleUpload}
                            disabled={!canSubmit}
                            style={[styles.btn, styles.btnPrimary, !canSubmit && { opacity: 0.4 }]}
                            activeOpacity={0.85}
                        >
                            {uploading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
                                    <Text style={styles.btnPrimaryText}>
                                        업로드{assets.length > 0 ? ` (${assets.length})` : ""}
                                    </Text>
                                </>
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
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        padding: 16,
    },
    modal: {
        borderRadius: 24,
        maxHeight: "90%",
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
    pickerEmpty: {
        aspectRatio: 4 / 3,
        borderWidth: 2,
        borderStyle: "dashed",
        borderColor: COLORS.memento[400],
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        backgroundColor: COLORS.memento[50],
    },
    pickerEmptyTitle: { fontSize: 15, fontWeight: "700", color: COLORS.memento[600], marginTop: 6 },
    pickerEmptyHint: { fontSize: 12, color: COLORS.memento[500] },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
    gridItem: {
        width: "31%",
        aspectRatio: 1,
        borderRadius: 10,
        overflow: "hidden",
        position: "relative",
    },
    gridImg: { width: "100%", height: "100%" },
    addBtn: {
        backgroundColor: COLORS.memento[50],
        borderWidth: 2,
        borderStyle: "dashed",
        borderColor: COLORS.memento[300],
        alignItems: "center",
        justifyContent: "center",
    },
    videoBadge: {
        position: "absolute",
        bottom: 4,
        left: 4,
        backgroundColor: "rgba(0,0,0,0.6)",
        borderRadius: 4,
        padding: 3,
    },
    removeBtn: {
        position: "absolute",
        top: 4,
        right: 4,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: "rgba(0,0,0,0.6)",
        alignItems: "center",
        justifyContent: "center",
    },
    label: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: Platform.OS === "ios" ? 12 : 10,
        fontSize: 14,
        minHeight: 64,
        textAlignVertical: "top",
    },
    footer: {
        flexDirection: "row",
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderTopWidth: 1,
    },
    btn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 12,
        borderRadius: 12,
    },
    btnGhost: { borderWidth: 1 },
    btnGhostText: { fontSize: 14, fontWeight: "600" },
    btnPrimary: { backgroundColor: COLORS.memento[500] },
    btnPrimaryText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
