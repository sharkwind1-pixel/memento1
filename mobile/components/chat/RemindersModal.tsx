/**
 * RemindersModal — 펫 리마인더 목록 + 추가
 *
 * 웹 src/app/api/reminders/route.ts와 매칭.
 * - GET /api/reminders?petId=...
 * - POST /api/reminders { petId, type, title, schedule }
 * - DELETE /api/reminders/[id]
 *
 * 모바일 V1: 일일 리마인더만 (schedule.type = "daily" + time HH:MM).
 * 주간/월간/특정일은 향후 확장.
 */

import { useState, useEffect, useCallback } from "react";
import {
    View, Text, Modal, TouchableOpacity, TextInput,
    ScrollView, FlatList, StyleSheet, ActivityIndicator, Alert,
    Switch, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useDarkMode } from "@/contexts/ThemeContext";
import { API_BASE_URL } from "@/config/constants";
import { COLORS } from "@/lib/theme";

interface Reminder {
    id: string;
    petId: string;
    type: string;
    title: string;
    description?: string;
    schedule: {
        type: string;
        time: string;
    };
    enabled: boolean;
}

interface Props {
    visible: boolean;
    onClose: () => void;
    petId: string;
    petName: string;
    accentColor: string;
    isMemorialMode: boolean;
}

const REMINDER_TYPES = [
    { id: "feeding", label: "사료/간식", icon: "restaurant-outline" as const },
    { id: "walk", label: "산책", icon: "walk-outline" as const },
    { id: "medicine", label: "투약", icon: "medkit-outline" as const },
    { id: "grooming", label: "미용/목욕", icon: "water-outline" as const },
    { id: "vet", label: "병원", icon: "heart-outline" as const },
    { id: "other", label: "기타", icon: "ellipsis-horizontal-outline" as const },
];

export default function RemindersModal({ visible, onClose, petId, petName, accentColor, isMemorialMode }: Props) {
    const { session } = useAuth();
    const { isDarkMode } = useDarkMode();
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // 새 리마인더 폼
    const [newType, setNewType] = useState("feeding");
    const [newTitle, setNewTitle] = useState("");
    const [newTime, setNewTime] = useState("09:00");

    const load = useCallback(async () => {
        if (!session || !petId) { setLoading(false); return; }
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/reminders?petId=${encodeURIComponent(petId)}`, {
                headers: { "Authorization": `Bearer ${session.access_token}` },
            });
            if (!res.ok) return;
            const data = await res.json();
            const list = Array.isArray(data?.reminders) ? data.reminders : [];
            setReminders(list);
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    }, [session, petId]);

    useEffect(() => {
        if (visible) {
            load();
            setAdding(false);
            setNewTitle("");
            setNewTime("09:00");
            setNewType("feeding");
        }
    }, [visible, load]);

    function validTime(t: string): boolean {
        return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
    }

    async function handleAdd() {
        if (!session || !petId) return;
        const title = newTitle.trim();
        if (!title) {
            Alert.alert("알림", "제목을 입력해주세요");
            return;
        }
        if (!validTime(newTime)) {
            Alert.alert("알림", "시간 형식은 HH:MM 이어야 해요 (예: 09:00)");
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/reminders`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    petId,
                    type: newType,
                    title,
                    schedule: { type: "daily", time: newTime },
                }),
            });
            if (!res.ok) {
                let errMsg = "";
                try {
                    const data = await res.json();
                    errMsg = data?.error ?? "";
                } catch {
                    try { errMsg = (await res.text()).slice(0, 200); } catch {}
                }
                Alert.alert(
                    `리마인더 생성 실패 (${res.status})`,
                    errMsg || "다시 시도해주세요",
                );
                return;
            }
            setAdding(false);
            setNewTitle("");
            await load();
        } catch (e) {
            Alert.alert(
                "네트워크 오류",
                e instanceof Error ? e.message : "다시 시도해주세요",
            );
        } finally {
            setSubmitting(false);
        }
    }

    async function handleToggle(reminder: Reminder) {
        if (!session) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/reminders/${reminder.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ enabled: !reminder.enabled }),
            });
            if (!res.ok) return;
            setReminders((prev) =>
                prev.map((r) => (r.id === reminder.id ? { ...r, enabled: !r.enabled } : r)),
            );
        } catch {
            // silent
        }
    }

    async function handleDelete(reminder: Reminder) {
        if (!session) return;
        Alert.alert("리마인더 삭제", `"${reminder.title}"을(를) 삭제할까요?`, [
            { text: "취소", style: "cancel" },
            {
                text: "삭제",
                style: "destructive",
                onPress: async () => {
                    try {
                        await fetch(`${API_BASE_URL}/api/reminders/${reminder.id}`, {
                            method: "DELETE",
                            headers: { "Authorization": `Bearer ${session.access_token}` },
                        });
                        setReminders((prev) => prev.filter((r) => r.id !== reminder.id));
                    } catch {
                        // silent
                    }
                },
            },
        ]);
    }

    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.gray[50];
    const cardBg = isDarkMode ? COLORS.gray[900] : "#fff";
    const titleColor = isDarkMode ? COLORS.white : COLORS.gray[900];
    const subColor = isDarkMode ? COLORS.gray[300] : COLORS.gray[600];
    const placeholderColor = isDarkMode ? COLORS.gray[500] : COLORS.gray[400];
    void isMemorialMode; // 추모 모드 시 추후 강조 분기 가능 (현재 미사용)

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
                <View style={[styles.header, { borderBottomColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[100] }]}>
                    <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.headerBtn}>
                        <Ionicons name="close" size={22} color={titleColor} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.headerTitle, { color: titleColor }]}>{petName} 리마인더</Text>
                        <Text style={[styles.headerSub, { color: subColor }]}>매일 정해진 시각에 알림</Text>
                    </View>
                    {!adding && (
                        <TouchableOpacity
                            onPress={() => setAdding(true)}
                            style={[styles.addBtn, { backgroundColor: accentColor }]}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="add" size={16} color="#fff" />
                            <Text style={styles.addBtnText}>추가</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {adding ? (
                    <ScrollView contentContainerStyle={{ padding: 16 }}>
                        <Text style={[styles.fieldLabel, { color: titleColor }]}>종류</Text>
                        <View style={styles.typeGrid}>
                            {REMINDER_TYPES.map((t) => {
                                const active = newType === t.id;
                                return (
                                    <TouchableOpacity
                                        key={t.id}
                                        onPress={() => setNewType(t.id)}
                                        activeOpacity={0.85}
                                        style={[
                                            styles.typeChip,
                                            { backgroundColor: cardBg },
                                            active && { borderColor: accentColor, backgroundColor: accentColor + "1a" },
                                        ]}
                                    >
                                        <Ionicons name={t.icon} size={14} color={active ? accentColor : subColor} />
                                        <Text style={[styles.typeChipText, { color: active ? accentColor : subColor }]}>
                                            {t.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <Text style={[styles.fieldLabel, { color: titleColor }]}>제목</Text>
                        <TextInput
                            value={newTitle}
                            onChangeText={setNewTitle}
                            placeholder="예: 사료 주기"
                            placeholderTextColor={placeholderColor}
                            style={[styles.input, {
                                backgroundColor: cardBg,
                                color: titleColor,
                                borderColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[200],
                            }]}
                            maxLength={100}
                        />

                        <Text style={[styles.fieldLabel, { color: titleColor }]}>시간 (HH:MM)</Text>
                        <TextInput
                            value={newTime}
                            onChangeText={setNewTime}
                            placeholder="09:00"
                            placeholderTextColor={placeholderColor}
                            style={[styles.input, {
                                backgroundColor: cardBg,
                                color: titleColor,
                                borderColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[200],
                            }]}
                            maxLength={5}
                            keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "default"}
                        />

                        <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
                            <TouchableOpacity
                                onPress={() => setAdding(false)}
                                style={[styles.formBtn, { backgroundColor: cardBg, borderWidth: 1, borderColor: COLORS.gray[200] }]}
                                activeOpacity={0.85}
                            >
                                <Text style={[styles.formBtnText, { color: subColor }]}>취소</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleAdd}
                                disabled={submitting}
                                style={[styles.formBtn, { backgroundColor: accentColor }, submitting && { opacity: 0.5 }]}
                                activeOpacity={0.85}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={[styles.formBtnText, { color: "#fff" }]}>저장</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                ) : loading ? (
                    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                        <ActivityIndicator color={accentColor} />
                    </View>
                ) : reminders.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <Ionicons name="alarm-outline" size={36} color={COLORS.gray[300]} />
                        <Text style={[styles.emptyTitle, { color: titleColor }]}>리마인더가 없어요</Text>
                        <Text style={[styles.emptyHint, { color: subColor }]}>
                            매일 같은 시간에 챙겨야 할 일을{"\n"}리마인더로 등록해보세요
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={reminders}
                        keyExtractor={(r) => r.id}
                        contentContainerStyle={{ padding: 16, gap: 8 }}
                        renderItem={({ item }) => (
                            <View style={[styles.reminderCard, { backgroundColor: cardBg }]}>
                                <View style={[styles.reminderIcon, { backgroundColor: accentColor + "1a" }]}>
                                    <Ionicons name="alarm" size={18} color={accentColor} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.reminderTitle, { color: titleColor }]} numberOfLines={1}>
                                        {item.title}
                                    </Text>
                                    <Text style={[styles.reminderMeta, { color: subColor }]}>
                                        매일 {item.schedule.time}
                                    </Text>
                                </View>
                                <Switch
                                    value={item.enabled}
                                    onValueChange={() => handleToggle(item)}
                                    trackColor={{ false: COLORS.gray[200], true: accentColor }}
                                />
                                <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={8} style={{ paddingLeft: 6 }}>
                                    <Ionicons name="trash-outline" size={18} color={COLORS.gray[400]} />
                                </TouchableOpacity>
                            </View>
                        )}
                    />
                )}
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        gap: 12,
    },
    headerBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
    headerTitle: { fontSize: 16, fontWeight: "700" },
    headerSub: { fontSize: 11, marginTop: 2 },
    addBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
    },
    addBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
    fieldLabel: { fontSize: 12, fontWeight: "600", marginBottom: 8, marginTop: 12 },
    typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 4 },
    typeChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: "transparent",
    },
    typeChipText: { fontSize: 12, fontWeight: "600" },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
    },
    formBtn: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        borderRadius: 12,
    },
    formBtnText: { fontSize: 14, fontWeight: "700" },
    emptyBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 8 },
    emptyTitle: { fontSize: 16, fontWeight: "700" },
    emptyHint: { fontSize: 13, lineHeight: 20, textAlign: "center" },
    reminderCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 12,
        borderRadius: 14,
    },
    reminderIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    reminderTitle: { fontSize: 14, fontWeight: "600" },
    reminderMeta: { fontSize: 12, marginTop: 2 },
});
