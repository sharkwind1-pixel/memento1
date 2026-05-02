/**
 * ProfileEditModal — 닉네임 편집 (모바일 V1: 닉네임 only)
 * Supabase profiles 테이블 직접 update (RLS: auth.uid() = id).
 *
 * - 닉네임: 2~20자, 공백 trim
 * - 아바타: OAuth 제공 URL이 있으면 표시, 없으면 사람 아이콘 (편집 불가)
 *   → 모바일은 직접 업로드 기능 제거. 사진 업로드는 펫 등록/사진첩에서만.
 *   → 웹도 동일 (OAuth 아바타만, 직접 업로드 없음)
 */

import { useEffect, useState } from "react";
import {
    View, Text, Modal, TouchableOpacity, TextInput, Image,
    StyleSheet, ActivityIndicator, Alert,
    KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

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
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (visible) {
            setNickname(initialNickname);
        }
    }, [visible, initialNickname]);

    async function handleSave() {
        const trimmed = nickname.trim();
        if (trimmed.length < 2 || trimmed.length > 20) {
            Alert.alert("닉네임 형식", "닉네임은 2~20자로 입력해주세요.");
            return;
        }
        if (saving) return;

        setSaving(true);
        try {
            const { error } = await supabase
                .from("profiles")
                .update({ nickname: trimmed })
                .eq("id", userId);
            if (error) throw new Error(error.message);

            onSaved({ nickname: trimmed, avatar: initialAvatar });
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
                        disabled={saving}
                        style={[
                            styles.saveBtn,
                            { backgroundColor: saving ? COLORS.gray[200] : accentColor },
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
                        {/* 아바타 (편집 불가, OAuth 제공 시 표시) */}
                        <View style={styles.avatarWrap}>
                            {initialAvatar ? (
                                <Image source={{ uri: initialAvatar }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: accentColor + "20" }]}>
                                    <Ionicons name="person" size={48} color={accentColor} />
                                </View>
                            )}
                        </View>

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
    avatarWrap: { marginTop: 16, marginBottom: 32 },
    avatar: { width: 120, height: 120, borderRadius: 60 },
    avatarFallback: { alignItems: "center", justifyContent: "center" },
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
