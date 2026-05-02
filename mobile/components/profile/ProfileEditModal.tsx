/**
 * ProfileEditModal — 닉네임 + 아바타 편집
 * Supabase profiles 테이블 직접 update (모바일 RLS: auth.uid() = id).
 *
 * - 닉네임: 2~20자, 공백 trim
 * - 아바타: ImagePicker → Supabase Storage(pet-media/{userId}/avatar/...) → profiles.avatar_url update
 *   - 경로는 첫 폴더가 userId여야 함 (RLS 정책: auth.uid() = (storage.foldername)[1])
 *   - "avatars/" prefix 사용 시 RLS 위반 ("new row violates row-level security policy")
 * - 저장 시 onSaved 콜백 + AuthContext refreshProfile() 호출 권장
 */

import { useEffect, useState } from "react";
import {
    View, Text, Modal, TouchableOpacity, TextInput, Image,
    StyleSheet, ActivityIndicator, Alert,
    KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { COLORS } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

interface UploadResult {
    success: boolean;
    url?: string;
    error?: string;
}

async function uploadAvatar(uri: string, userId: string, mimeType?: string): Promise<UploadResult> {
    try {
        const response = await fetch(uri);
        if (!response.ok) return { success: false, error: `이미지 로드 실패 (HTTP ${response.status})` };
        const ab = await response.arrayBuffer();
        if (ab.byteLength > 5 * 1024 * 1024) return { success: false, error: "5MB 이하 이미지만 업로드 가능합니다" };

        const ext = (() => {
            if (mimeType?.startsWith("image/")) {
                const e = mimeType.split("/")[1] || "jpg";
                return e === "jpeg" ? "jpg" : e;
            }
            const tail = (uri.split(".").pop() ?? "jpg").toLowerCase().split("?")[0];
            return tail || "jpg";
        })();
        const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

        // RLS: pet-media 버킷은 첫 폴더가 userId여야 허용 → userId/avatar/... 패턴 사용
        const path = `${userId}/avatar/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
        const { data, error } = await supabase.storage
            .from("pet-media")
            .upload(path, new Uint8Array(ab), {
                cacheControl: "31536000",
                upsert: false,
                contentType: mime,
            });
        if (error) return { success: false, error: error.message };

        const { data: { publicUrl } } = supabase.storage.from("pet-media").getPublicUrl(data.path);
        return { success: true, url: publicUrl };
    } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : "업로드 실패" };
    }
}

interface Props {
    visible: boolean;
    onClose: () => void;
    userId: string;
    initialNickname: string;
    initialAvatar: string | null;
    accentColor: string;
    onSaved: (next: { nickname: string; avatar: string | null }) => void;
}

export default function ProfileEditModal({
    visible, onClose, userId, initialNickname, initialAvatar, accentColor, onSaved,
}: Props) {
    const insets = useSafeAreaInsets();
    const [nickname, setNickname] = useState(initialNickname);
    const [avatarUri, setAvatarUri] = useState<string | null>(initialAvatar);
    const [uploadedUrl, setUploadedUrl] = useState<string | null>(initialAvatar);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (visible) {
            setNickname(initialNickname);
            setAvatarUri(initialAvatar);
            setUploadedUrl(initialAvatar);
        }
    }, [visible, initialNickname, initialAvatar]);

    async function pickAvatar() {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("권한 필요", "갤러리 접근 권한이 필요합니다.");
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.85,
            allowsEditing: true,
            aspect: [1, 1],
        });
        if (result.canceled || !result.assets[0]) return;

        const asset = result.assets[0];
        setAvatarUri(asset.uri);
        setUploadedUrl(null);
        setUploading(true);
        const upload = await uploadAvatar(asset.uri, userId, asset.mimeType);
        setUploading(false);
        if (!upload.success || !upload.url) {
            Alert.alert("업로드 실패", upload.error || "이미지 업로드 실패");
            setAvatarUri(initialAvatar);
            setUploadedUrl(initialAvatar);
            return;
        }
        setUploadedUrl(upload.url);
    }

    async function handleSave() {
        const trimmed = nickname.trim();
        if (trimmed.length < 2 || trimmed.length > 20) {
            Alert.alert("닉네임 형식", "닉네임은 2~20자로 입력해주세요.");
            return;
        }
        if (uploading) {
            Alert.alert("업로드 진행 중", "이미지 업로드가 끝날 때까지 기다려주세요.");
            return;
        }
        if (saving) return;

        setSaving(true);
        try {
            const update: Record<string, unknown> = { nickname: trimmed };
            if (uploadedUrl !== initialAvatar) {
                update.avatar_url = uploadedUrl;
            }
            const { error } = await supabase
                .from("profiles")
                .update(update)
                .eq("id", userId);
            if (error) throw new Error(error.message);

            onSaved({ nickname: trimmed, avatar: uploadedUrl });
            onClose();
        } catch (e) {
            Alert.alert("저장 실패", e instanceof Error ? e.message : "");
        } finally {
            setSaving(false);
        }
    }

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <SafeAreaView style={styles.flex1} edges={["top"]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.headerBtn}>
                        <Ionicons name="close" size={24} color={COLORS.gray[800]} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>프로필 편집</Text>
                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={saving || uploading}
                        style={[
                            styles.saveBtn,
                            { backgroundColor: saving || uploading ? COLORS.gray[200] : accentColor },
                        ]}
                        activeOpacity={0.85}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.saveBtnText}>저장</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <KeyboardAvoidingView
                    style={styles.flex1}
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                >
                    <View style={[styles.body, { paddingBottom: 16 + insets.bottom }]}>
                        {/* 아바타 */}
                        <TouchableOpacity onPress={pickAvatar} style={styles.avatarWrap} activeOpacity={0.85}>
                            {avatarUri || uploadedUrl ? (
                                <Image source={{ uri: uploadedUrl ?? avatarUri ?? "" }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: accentColor + "20" }]}>
                                    <Ionicons name="person" size={48} color={accentColor} />
                                </View>
                            )}
                            <View style={[styles.avatarEdit, { backgroundColor: accentColor }]}>
                                {uploading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Ionicons name="camera" size={16} color="#fff" />
                                )}
                            </View>
                        </TouchableOpacity>
                        <Text style={styles.avatarHint}>사진을 탭해서 변경</Text>

                        {/* 닉네임 */}
                        <View style={styles.field}>
                            <Text style={styles.label}>닉네임</Text>
                            <TextInput
                                style={styles.input}
                                value={nickname}
                                onChangeText={setNickname}
                                placeholder="2~20자"
                                placeholderTextColor={COLORS.gray[400]}
                                maxLength={20}
                                autoCapitalize="none"
                            />
                            <Text style={styles.helperText}>{nickname.trim().length}/20</Text>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1, backgroundColor: COLORS.gray[50] },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.gray[100],
        backgroundColor: "#fff",
    },
    headerBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
    headerTitle: { flex: 1, fontSize: 17, fontWeight: "700", color: COLORS.gray[900] },
    saveBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9999 },
    saveBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
    body: { padding: 24, alignItems: "center", flex: 1 },
    avatarWrap: { position: "relative", marginTop: 16 },
    avatar: { width: 120, height: 120, borderRadius: 60 },
    avatarFallback: { alignItems: "center", justifyContent: "center" },
    avatarEdit: {
        position: "absolute",
        bottom: 0, right: 0,
        width: 36, height: 36, borderRadius: 18,
        alignItems: "center", justifyContent: "center",
        borderWidth: 3, borderColor: "#fff",
    },
    avatarHint: { fontSize: 12, color: COLORS.gray[500], marginTop: 12, marginBottom: 32 },
    field: { width: "100%" },
    label: { fontSize: 13, fontWeight: "600", color: COLORS.gray[700], marginBottom: 8 },
    input: {
        backgroundColor: "#fff",
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 14,
        fontSize: 16,
        borderWidth: 1,
        borderColor: COLORS.gray[200],
        color: COLORS.gray[900],
    },
    helperText: { fontSize: 11, color: COLORS.gray[400], marginTop: 6, alignSelf: "flex-end" },
});
