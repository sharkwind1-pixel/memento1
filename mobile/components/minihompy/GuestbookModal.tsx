/**
 * GuestbookModal — 방명록 목록 + 작성
 *
 * - ownerUserId의 방명록을 fetch + 매 작성 시 갱신
 * - 자기 자신 미니홈피일 때만 작성 가능 / 다른 유저면 모두 작성 가능 (서버가 검증)
 */

import { useEffect, useState, useCallback } from "react";
import {
    View, Text, Modal, TouchableOpacity, FlatList,
    TextInput, StyleSheet, ActivityIndicator, Alert,
    KeyboardAvoidingView, Platform, Image,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/theme";
import { useDarkMode } from "@/contexts/ThemeContext";
import { getGuestbook, postGuestbookEntry } from "@/lib/minihompy-api";
import type { GuestbookEntry } from "@/types";

interface Props {
    visible: boolean;
    onClose: () => void;
    accessToken: string;
    ownerUserId: string;        // 미니홈피 주인의 user_id
    accentColor: string;
    canWrite?: boolean;
}

export default function GuestbookModal({
    visible, onClose, accessToken, ownerUserId, accentColor, canWrite = true,
}: Props) {
    const insets = useSafeAreaInsets();
    const { isDarkMode } = useDarkMode();
    const [entries, setEntries] = useState<GuestbookEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [input, setInput] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const list = await getGuestbook(accessToken, ownerUserId).catch(() => []);
            setEntries(list);
        } finally {
            setLoading(false);
        }
    }, [accessToken, ownerUserId]);

    useEffect(() => {
        if (visible && ownerUserId) load();
    }, [visible, ownerUserId, load]);

    async function handleSubmit() {
        const trimmed = input.trim();
        if (!trimmed || submitting) return;
        setSubmitting(true);
        try {
            await postGuestbookEntry(accessToken, ownerUserId, trimmed);
            setInput("");
            await load();
        } catch (e) {
            Alert.alert("등록 실패", e instanceof Error ? e.message : "");
        } finally {
            setSubmitting(false);
        }
    }

    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.gray[50];
    const headerBg = isDarkMode ? COLORS.gray[900] : "#fff";
    const headerBorder = isDarkMode ? COLORS.gray[800] : COLORS.gray[100];
    const titleColor = isDarkMode ? COLORS.white : COLORS.gray[900];
    const subColor = isDarkMode ? COLORS.gray[400] : COLORS.gray[500];
    const cardBg = isDarkMode ? COLORS.gray[900] : "#fff";
    const cardBorder = isDarkMode ? COLORS.gray[800] : COLORS.gray[100];
    const entryNameColor = isDarkMode ? COLORS.white : COLORS.gray[900];
    const entryContentColor = isDarkMode ? COLORS.gray[200] : COLORS.gray[700];
    const entryDateColor = isDarkMode ? COLORS.gray[500] : COLORS.gray[400];
    const inputBg = isDarkMode ? COLORS.gray[800] : COLORS.gray[100];
    const inputColor = isDarkMode ? COLORS.gray[100] : COLORS.gray[900];
    const placeholderColor = isDarkMode ? COLORS.gray[500] : COLORS.gray[400];
    const emptyHintColor = isDarkMode ? COLORS.gray[500] : COLORS.gray[400];

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
                <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: headerBorder }]}>
                    <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.headerBtn}>
                        <Ionicons name="close" size={24} color={isDarkMode ? COLORS.gray[300] : COLORS.gray[800]} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.headerTitle, { color: titleColor }]}>방명록</Text>
                        <Text style={[styles.headerSub, { color: subColor }]}>{entries.length}개</Text>
                    </View>
                </View>

                <KeyboardAvoidingView
                    style={styles.flex1}
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                >
                    {loading ? (
                        <View style={styles.loadingBox}>
                            <ActivityIndicator color={accentColor} />
                        </View>
                    ) : entries.length === 0 ? (
                        <View style={styles.emptyBox}>
                            <Ionicons name="chatbubbles-outline" size={36} color={COLORS.gray[300]} />
                            <Text style={[styles.emptyText, { color: isDarkMode ? COLORS.gray[300] : COLORS.gray[600] }]}>아직 방명록이 없어요</Text>
                            <Text style={[styles.emptyHint, { color: emptyHintColor }]}>첫 번째 메시지를 남겨보세요</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={entries}
                            keyExtractor={(e) => e.id}
                            contentContainerStyle={{ padding: 16, paddingBottom: 96, gap: 10 }}
                            renderItem={({ item }) => (
                                <View style={[styles.entryCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                                    {item.writerAvatar ? (
                                        <Image source={{ uri: item.writerAvatar }} style={styles.avatar} />
                                    ) : (
                                        <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: accentColor + "20" }]}>
                                            <Text style={{ fontSize: 14, fontWeight: "700", color: accentColor }}>
                                                {(item.writerNickname ?? "익명")[0]}
                                            </Text>
                                        </View>
                                    )}
                                    <View style={{ flex: 1 }}>
                                        <View style={styles.entryHeader}>
                                            <Text style={[styles.entryName, { color: entryNameColor }]}>{item.writerNickname ?? "익명"}</Text>
                                            <Text style={[styles.entryDate, { color: entryDateColor }]}>{formatDate(item.createdAt)}</Text>
                                        </View>
                                        <Text style={[styles.entryContent, { color: entryContentColor }]}>{item.content}</Text>
                                    </View>
                                </View>
                            )}
                        />
                    )}

                    {canWrite && (
                        <View style={[
                            styles.inputRow,
                            { backgroundColor: headerBg, borderTopColor: headerBorder, paddingBottom: 12 + Math.max(insets.bottom, 0) },
                        ]}>
                            <TextInput
                                style={[styles.textInput, { backgroundColor: inputBg, color: inputColor }]}
                                placeholder="따뜻한 한 줄을 남겨주세요..."
                                placeholderTextColor={placeholderColor}
                                value={input}
                                onChangeText={setInput}
                                multiline
                                maxLength={300}
                                editable={!submitting}
                            />
                            <TouchableOpacity
                                onPress={handleSubmit}
                                disabled={!input.trim() || submitting}
                                style={[
                                    styles.sendBtn,
                                    { backgroundColor: input.trim() && !submitting ? accentColor : COLORS.gray[200] },
                                ]}
                                activeOpacity={0.85}
                            >
                                {submitting ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Ionicons
                                        name="arrow-up"
                                        size={18}
                                        color={input.trim() ? "#fff" : COLORS.gray[400]}
                                    />
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </KeyboardAvoidingView>
            </SafeAreaView>
        </Modal>
    );
}

function formatDate(iso: string): string {
    try {
        const d = new Date(iso);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return "방금";
        if (diffMin < 60) return `${diffMin}분 전`;
        const diffHour = Math.floor(diffMin / 60);
        if (diffHour < 24) return `${diffHour}시간 전`;
        const diffDay = Math.floor(diffHour / 24);
        if (diffDay < 7) return `${diffDay}일 전`;
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
    } catch {
        return "";
    }
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    headerBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
    headerTitle: { fontSize: 17, fontWeight: "700" },
    headerSub: { fontSize: 11, marginTop: 2 },
    loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
    emptyBox: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    emptyText: { fontSize: 14, fontWeight: "600", marginTop: 8 },
    emptyHint: { fontSize: 12 },
    entryCard: {
        flexDirection: "row",
        gap: 10,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
    },
    avatar: { width: 36, height: 36, borderRadius: 18 },
    avatarFallback: { alignItems: "center", justifyContent: "center" },
    entryHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 4,
    },
    entryName: { fontSize: 13, fontWeight: "700" },
    entryDate: { fontSize: 11 },
    entryContent: { fontSize: 13, lineHeight: 18 },
    inputRow: {
        flexDirection: "row",
        gap: 8,
        paddingHorizontal: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        alignItems: "flex-end",
    },
    textInput: {
        flex: 1,
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 13,
        maxHeight: 96,
    },
    sendBtn: {
        width: 40, height: 40, borderRadius: 20,
        alignItems: "center", justifyContent: "center",
    },
});
