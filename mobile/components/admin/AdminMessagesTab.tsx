/**
 * AdminMessagesTab — 관리자 메시지 발송 (웹 src/components/admin/tabs/AdminMessagesTab.tsx 이식)
 *
 * - 수신자: 전체 / 프리미엄 / 무료 / 활성(7일) / 특정 유저ID
 * - 제목 + 본문
 * - POST /api/admin/messages
 * - 발송 이력 GET /api/admin/messages
 */

import { useEffect, useState, useCallback } from "react";
import {
    View, Text, TextInput, ScrollView, TouchableOpacity,
    ActivityIndicator, StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/theme";
import { API_BASE_URL } from "@/config/constants";
import { useDarkMode } from "@/contexts/ThemeContext";

const TITLE_MAX = 100;
const BODY_MAX = 1000;

type Recipient = "all_users" | "premium" | "free" | "active_7d" | "custom";

const RECIPIENT_LABELS: Record<Recipient, string> = {
    all_users: "전체 회원",
    premium: "프리미엄만",
    free: "무료만",
    active_7d: "최근 7일 활성",
    custom: "특정 유저 ID",
};

interface SentMessage {
    id: string;
    title: string;
    body: string;
    recipient_count: number;
    created_at: string;
    type?: string;
}

interface Props {
    accessToken: string;
}

export default function AdminMessagesTab({ accessToken }: Props) {
    const { isDarkMode } = useDarkMode();
    const [recipient, setRecipient] = useState<Recipient>("all_users");
    const [customIds, setCustomIds] = useState("");
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [sending, setSending] = useState(false);
    const [history, setHistory] = useState<SentMessage[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    const loadHistory = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/messages`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (!res.ok) return;
            const data = await res.json();
            setHistory(Array.isArray(data?.messages) ? data.messages : []);
        } catch {
            // 무시
        } finally {
            setLoadingHistory(false);
        }
    }, [accessToken]);

    useEffect(() => { loadHistory(); }, [loadHistory]);

    async function handleSend() {
        if (!title.trim()) {
            Alert.alert("입력 필요", "제목을 입력해주세요");
            return;
        }
        if (!body.trim()) {
            Alert.alert("입력 필요", "본문을 입력해주세요");
            return;
        }

        let recipientPayload: unknown = recipient;
        if (recipient === "custom") {
            const ids = customIds
                .split(/[\s,\n]+/)
                .map((s) => s.trim())
                .filter(Boolean);
            if (ids.length === 0) {
                Alert.alert("유저 ID 필요", "특정 유저로 발송하려면 ID를 1개 이상 입력해주세요");
                return;
            }
            recipientPayload = { userIds: ids };
        }

        Alert.alert(
            "발송 확인",
            `${RECIPIENT_LABELS[recipient]} ${recipient === "custom" ? `(${customIds.split(/[\s,\n]+/).filter(Boolean).length}명)` : ""}에게 발송할까요?`,
            [
                { text: "취소", style: "cancel" },
                {
                    text: "발송",
                    style: "destructive",
                    onPress: async () => {
                        setSending(true);
                        try {
                            const res = await fetch(`${API_BASE_URL}/api/admin/messages`, {
                                method: "POST",
                                headers: {
                                    Authorization: `Bearer ${accessToken}`,
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                    recipient: recipientPayload,
                                    title: title.trim(),
                                    body: body.trim(),
                                    type: "admin_message",
                                }),
                            });
                            if (!res.ok) {
                                let msg = `HTTP ${res.status}`;
                                try { msg = (await res.json()).error || msg; } catch {}
                                Alert.alert("발송 실패", msg);
                                return;
                            }
                            const data = await res.json();
                            Alert.alert("발송 완료", `${data.recipientCount ?? data.recipient_count ?? "N"}명에게 발송했어요`);
                            setTitle("");
                            setBody("");
                            setCustomIds("");
                            loadHistory();
                        } catch (e) {
                            Alert.alert("오류", e instanceof Error ? e.message : "");
                        } finally {
                            setSending(false);
                        }
                    },
                },
            ],
        );
    }

    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.gray[50];
    const cardBg = isDarkMode ? COLORS.gray[900] : COLORS.white;
    const textColor = isDarkMode ? COLORS.white : COLORS.gray[900];
    const labelColor = isDarkMode ? COLORS.gray[400] : COLORS.gray[500];
    const inputBg = isDarkMode ? COLORS.gray[800] : "#fff";
    const borderColor = isDarkMode ? COLORS.gray[700] : COLORS.gray[200];

    return (
        <KeyboardAvoidingView
            style={[styles.flex1, { backgroundColor: bgColor }]}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <ScrollView contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 32 }}>
                {/* 발송 폼 */}
                <View style={[styles.card, { backgroundColor: cardBg }]}>
                    <Text style={[styles.cardTitle, { color: textColor }]}>새 메시지 발송</Text>

                    {/* 수신자 */}
                    <Text style={[styles.label, { color: labelColor }]}>수신자</Text>
                    <View style={styles.recipientRow}>
                        {(["all_users", "premium", "free", "active_7d", "custom"] as Recipient[]).map((r) => {
                            const active = recipient === r;
                            return (
                                <TouchableOpacity
                                    key={r}
                                    onPress={() => setRecipient(r)}
                                    style={[
                                        styles.chip,
                                        active
                                            ? { backgroundColor: "#8B5CF6", borderColor: "#8B5CF6" }
                                            : { backgroundColor: inputBg, borderColor },
                                    ]}
                                >
                                    <Text style={{
                                        fontSize: 11, fontWeight: "700",
                                        color: active ? "#fff" : labelColor,
                                    }}>
                                        {RECIPIENT_LABELS[r]}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {recipient === "custom" && (
                        <>
                            <Text style={[styles.label, { color: labelColor, marginTop: 8 }]}>
                                유저 ID (여러 개는 줄바꿈/콤마로 구분)
                            </Text>
                            <TextInput
                                value={customIds}
                                onChangeText={setCustomIds}
                                placeholder="uuid-1234-...&#10;uuid-5678-..."
                                placeholderTextColor={labelColor}
                                multiline
                                style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor, minHeight: 80, textAlignVertical: "top" }]}
                            />
                        </>
                    )}

                    {/* 제목 */}
                    <Text style={[styles.label, { color: labelColor, marginTop: 8 }]}>
                        제목 ({title.length}/{TITLE_MAX})
                    </Text>
                    <TextInput
                        value={title}
                        onChangeText={(v) => v.length <= TITLE_MAX && setTitle(v)}
                        placeholder="알림 제목"
                        placeholderTextColor={labelColor}
                        style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]}
                    />

                    {/* 본문 */}
                    <Text style={[styles.label, { color: labelColor, marginTop: 8 }]}>
                        본문 ({body.length}/{BODY_MAX})
                    </Text>
                    <TextInput
                        value={body}
                        onChangeText={(v) => v.length <= BODY_MAX && setBody(v)}
                        placeholder="알림 내용"
                        placeholderTextColor={labelColor}
                        multiline
                        style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor, minHeight: 120, textAlignVertical: "top" }]}
                    />

                    {/* 발송 버튼 */}
                    <TouchableOpacity
                        onPress={handleSend}
                        disabled={sending || !title.trim() || !body.trim()}
                        style={[
                            styles.sendBtn,
                            { backgroundColor: sending || !title.trim() || !body.trim() ? COLORS.gray[300] : "#8B5CF6" },
                        ]}
                        activeOpacity={0.85}
                    >
                        {sending ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="paper-plane" size={14} color="#fff" />
                                <Text style={styles.sendBtnText}>발송</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* 발송 이력 */}
                <View style={[styles.card, { backgroundColor: cardBg }]}>
                    <Text style={[styles.cardTitle, { color: textColor }]}>최근 발송</Text>
                    {loadingHistory ? (
                        <ActivityIndicator color={COLORS.memento[500]} style={{ marginVertical: 16 }} />
                    ) : history.length === 0 ? (
                        <Text style={[styles.empty, { color: labelColor }]}>발송 이력이 없어요</Text>
                    ) : (
                        history.slice(0, 10).map((m) => (
                            <View key={m.id} style={[styles.historyItem, { borderTopColor: borderColor }]}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.historyTitle, { color: textColor }]} numberOfLines={1}>
                                        {m.title}
                                    </Text>
                                    <Text style={[styles.historyBody, { color: labelColor }]} numberOfLines={2}>
                                        {m.body}
                                    </Text>
                                    <Text style={[styles.historyMeta, { color: labelColor }]}>
                                        {m.recipient_count?.toLocaleString() ?? 0}명 · {formatDate(m.created_at)}
                                    </Text>
                                </View>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

function formatDate(iso: string): string {
    try {
        const d = new Date(iso);
        const diff = Date.now() - d.getTime();
        const min = Math.floor(diff / 60000);
        if (min < 60) return `${min}분 전`;
        const hour = Math.floor(min / 60);
        if (hour < 24) return `${hour}시간 전`;
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
    } catch { return iso; }
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    card: {
        borderRadius: 14, padding: 16,
        borderWidth: 1, borderColor: "rgba(0,0,0,0.06)",
    },
    cardTitle: { fontSize: 15, fontWeight: "700", marginBottom: 8 },
    label: { fontSize: 11, fontWeight: "600", marginBottom: 6 },
    recipientRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    chip: {
        paddingHorizontal: 10, paddingVertical: 6,
        borderRadius: 9999, borderWidth: 1,
    },
    input: {
        borderWidth: 1, borderRadius: 10,
        paddingHorizontal: 12, paddingVertical: 10,
        fontSize: 13,
    },
    sendBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
        paddingVertical: 12, borderRadius: 12, marginTop: 12,
    },
    sendBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
    empty: { textAlign: "center", paddingVertical: 16, fontSize: 12 },
    historyItem: {
        flexDirection: "row", paddingVertical: 10, borderTopWidth: 1, gap: 10,
    },
    historyTitle: { fontSize: 13, fontWeight: "700" },
    historyBody: { fontSize: 11, marginTop: 2, lineHeight: 16 },
    historyMeta: { fontSize: 10, marginTop: 4 },
});
