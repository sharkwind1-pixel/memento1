/**
 * TimelineWriteModal — 타임라인 일기 작성/수정 모달
 *
 * 웹 src/components/features/record/TimelineSection.tsx 의 작성 모달 매칭.
 * - 날짜, 제목, 내용, 감정 (happy/normal/sad/sick)
 * - 새로 작성 또는 기존 항목 수정
 */

import { useState, useEffect } from "react";
import {
    View, Text, TextInput, TouchableOpacity, Modal,
    ScrollView, StyleSheet, Alert, ActivityIndicator,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/theme";

export type TimelineMood = "happy" | "normal" | "sad" | "sick";

export interface TimelineEntryDraft {
    id?: string;
    date: string;
    title: string;
    content: string;
    mood: TimelineMood;
}

interface Props {
    visible: boolean;
    petName: string;
    initialEntry?: TimelineEntryDraft;
    onClose: () => void;
    onSave: (entry: TimelineEntryDraft) => Promise<boolean>;
}

const MOODS: Array<{ id: TimelineMood; label: string; icon: React.ComponentProps<typeof Ionicons>["name"]; color: string }> = [
    { id: "happy", label: "기쁨", icon: "happy-outline", color: "#FBBF24" },
    { id: "normal", label: "평범", icon: "ellipse-outline", color: "#94A3B8" },
    { id: "sad", label: "슬픔", icon: "sad-outline", color: "#60A5FA" },
    { id: "sick", label: "아픔", icon: "medkit-outline", color: "#F87171" },
];

function todayISO(): string {
    return new Date().toISOString().split("T")[0];
}

export default function TimelineWriteModal({ visible, petName, initialEntry, onClose, onSave }: Props) {
    const isEditing = !!initialEntry?.id;
    const [date, setDate] = useState(initialEntry?.date || todayISO());
    const [title, setTitle] = useState(initialEntry?.title || "");
    const [content, setContent] = useState(initialEntry?.content || "");
    const [mood, setMood] = useState<TimelineMood>(initialEntry?.mood || "normal");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (visible) {
            setDate(initialEntry?.date || todayISO());
            setTitle(initialEntry?.title || "");
            setContent(initialEntry?.content || "");
            setMood(initialEntry?.mood || "normal");
        }
    }, [visible, initialEntry]);

    async function handleSave() {
        if (!title.trim()) {
            Alert.alert("알림", "제목을 입력해주세요");
            return;
        }
        setSaving(true);
        const ok = await onSave({
            id: initialEntry?.id,
            date,
            title: title.trim(),
            content: content.trim(),
            mood,
        });
        setSaving(false);
        if (ok) onClose();
    }

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.backdrop}>
                <View style={styles.modal}>
                    {/* 헤더 */}
                    <View style={styles.header}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <Ionicons name="book-outline" size={20} color={COLORS.memento[500]} />
                            <Text style={styles.title}>
                                {isEditing ? "일기 수정" : `${petName}의 일기`}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} hitSlop={8}>
                            <Ionicons name="close" size={20} color={COLORS.gray[500]} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
                        {/* 날짜 */}
                        <Text style={styles.label}>날짜</Text>
                        <TextInput
                            value={date}
                            onChangeText={setDate}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={COLORS.gray[400]}
                            style={styles.input}
                        />

                        {/* 제목 */}
                        <Text style={styles.label}>제목 *</Text>
                        <TextInput
                            value={title}
                            onChangeText={setTitle}
                            placeholder="오늘의 한 줄"
                            placeholderTextColor={COLORS.gray[400]}
                            style={styles.input}
                            maxLength={100}
                        />

                        {/* 내용 */}
                        <Text style={styles.label}>내용</Text>
                        <TextInput
                            value={content}
                            onChangeText={setContent}
                            placeholder="오늘 있었던 일을 기록해보세요..."
                            placeholderTextColor={COLORS.gray[400]}
                            style={[styles.input, styles.textArea]}
                            multiline
                            maxLength={2000}
                            textAlignVertical="top"
                        />

                        {/* 감정 */}
                        <Text style={styles.label}>감정</Text>
                        <View style={styles.moodRow}>
                            {MOODS.map((m) => (
                                <TouchableOpacity
                                    key={m.id}
                                    onPress={() => setMood(m.id)}
                                    style={[
                                        styles.moodBtn,
                                        mood === m.id && { borderColor: m.color, backgroundColor: m.color + "15" },
                                    ]}
                                    activeOpacity={0.85}
                                >
                                    <Ionicons name={m.icon} size={20} color={mood === m.id ? m.color : COLORS.gray[400]} />
                                    <Text style={[styles.moodLabel, mood === m.id && { color: m.color, fontWeight: "700" }]}>
                                        {m.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    {/* 액션 버튼 */}
                    <View style={styles.actions}>
                        <TouchableOpacity
                            onPress={onClose}
                            style={[styles.actionBtn, styles.actionGhost]}
                            disabled={saving}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="close" size={16} color={COLORS.gray[700]} />
                            <Text style={styles.actionGhostText}>취소</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleSave}
                            style={[styles.actionBtn, styles.actionPrimary]}
                            disabled={saving}
                            activeOpacity={0.85}
                        >
                            {saving ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark" size={16} color="#fff" />
                                    <Text style={styles.actionPrimaryText}>{isEditing ? "수정" : "저장"}</Text>
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
        backgroundColor: "#fff",
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
        borderBottomColor: COLORS.gray[100],
    },
    title: { fontSize: 16, fontWeight: "700", color: COLORS.gray[900] },
    label: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.gray[700],
        marginBottom: 6,
        marginTop: 12,
    },
    input: {
        borderWidth: 1,
        borderColor: COLORS.gray[200],
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === "ios" ? 12 : 10,
        fontSize: 14,
        color: COLORS.gray[800],
    },
    textArea: { minHeight: 96 },
    moodRow: { flexDirection: "row", gap: 8 },
    moodBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: COLORS.gray[200],
    },
    moodLabel: { fontSize: 12, fontWeight: "500", color: COLORS.gray[500] },
    actions: {
        flexDirection: "row",
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: COLORS.gray[100],
    },
    actionBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 12,
        borderRadius: 12,
    },
    actionGhost: {
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: COLORS.gray[300],
    },
    actionGhostText: { fontSize: 14, fontWeight: "600", color: COLORS.gray[700] },
    actionPrimary: { backgroundColor: COLORS.memento[500] },
    actionPrimaryText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
