/**
 * GreetingEditModal — 미니홈피 인사말 편집
 * PATCH /api/minihompy/settings { greeting: string }
 *
 * - 100자 이내, 빈 문자열 허용 (인사말 제거)
 * - 저장 시 부모에 새 인사말 전달
 */

import { useEffect, useState } from "react";
import {
    View, Text, Modal, TouchableOpacity, TextInput,
    StyleSheet, ActivityIndicator, Alert,
    KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/theme";
import { patchMinihompySettings } from "@/lib/minihompy-api";

const MAX_LENGTH = 100;

interface Props {
    visible: boolean;
    onClose: () => void;
    accessToken: string;
    initialGreeting: string;
    accentColor: string;
    onSaved: (greeting: string) => void;
}

export default function GreetingEditModal({
    visible, onClose, accessToken, initialGreeting, accentColor, onSaved,
}: Props) {
    const insets = useSafeAreaInsets();
    const [text, setText] = useState(initialGreeting);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (visible) setText(initialGreeting);
    }, [visible, initialGreeting]);

    async function handleSave() {
        if (saving) return;
        const trimmed = text.trim();
        setSaving(true);
        try {
            const updated = await patchMinihompySettings(accessToken, { greeting: trimmed });
            onSaved(updated.greeting);
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
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle}>인사말</Text>
                        <Text style={styles.headerSub}>방문자에게 보여줄 한마디</Text>
                    </View>
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
                        <TextInput
                            style={styles.input}
                            placeholder="예: 우리 아이 만나러 오세요!"
                            placeholderTextColor={COLORS.gray[400]}
                            value={text}
                            onChangeText={setText}
                            multiline
                            maxLength={MAX_LENGTH}
                            autoFocus
                        />
                        <View style={styles.metaRow}>
                            <Text style={styles.metaText}>
                                {text.length}/{MAX_LENGTH}
                            </Text>
                            {text.trim().length === 0 && initialGreeting.length > 0 && (
                                <Text style={styles.metaHint}>비우고 저장하면 인사말 제거</Text>
                            )}
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
    headerTitle: { fontSize: 17, fontWeight: "700", color: COLORS.gray[900] },
    headerSub: { fontSize: 11, color: COLORS.gray[500], marginTop: 2 },
    saveBtn: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 9999,
    },
    saveBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
    body: { padding: 16, gap: 8, flex: 1 },
    input: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
        lineHeight: 22,
        minHeight: 120,
        textAlignVertical: "top",
        borderWidth: 1,
        borderColor: COLORS.gray[200],
        color: COLORS.gray[900],
    },
    metaRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 4,
    },
    metaText: { fontSize: 11, color: COLORS.gray[500] },
    metaHint: { fontSize: 11, color: COLORS.gray[400], fontStyle: "italic" },
});
