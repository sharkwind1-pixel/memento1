/**
 * ExportChatModal.tsx — 웹 src/components/features/chat/ExportChatModal.tsx 1:1 RN 이식
 * react-native-view-shot captureRef로 캡처 → 갤러리 저장 or 공유
 */

import { useState, useRef } from "react";
import {
    View, Text, TouchableOpacity, Modal, ScrollView,
    StyleSheet, Alert, ActivityIndicator,
} from "react-native";
import { captureRef } from "react-native-view-shot";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/theme";
import type { ChatMessage, Pet } from "@/types";
import ExportChatCard, { type CardTemplate } from "./ExportChatCard";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    messages: ChatMessage[];
    pet: Pet;
    isMemorialMode: boolean;
}

const TEMPLATES: { id: CardTemplate; icon: keyof typeof Ionicons.glyphMap; name: string; desc: string }[] = [
    { id: "letter",   icon: "document-text-outline", name: "편지",       desc: "따뜻한 편지 스타일" },
    { id: "polaroid", icon: "image-outline",          name: "폴라로이드", desc: "심플한 사진 스타일" },
    { id: "memorial", icon: "star-outline",           name: "기억",       desc: "별이 빛나는 밤하늘" },
    { id: "cute",     icon: "heart-outline",          name: "귀여운",     desc: "파스텔 그라데이션" },
];

export default function ExportChatModal({ isOpen, onClose, messages, pet, isMemorialMode }: Props) {
    const [template, setTemplate] = useState<CardTemplate>(isMemorialMode ? "memorial" : "letter");
    const [loading, setLoading] = useState(false);
    const captureViewRef = useRef<View>(null);

    const chatMessages = messages.filter((m) => m.role === "user" || m.role === "pet");
    const accent = isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500];

    async function doCapture(): Promise<string | null> {
        if (!captureViewRef.current) return null;
        try {
            return await captureRef(captureViewRef, { format: "png", quality: 0.95 });
        } catch {
            return null;
        }
    }

    async function handleSave() {
        setLoading(true);
        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== "granted") {
                Alert.alert("권한 필요", "갤러리 저장을 위해 사진 접근 권한이 필요해요.");
                return;
            }
            const uri = await doCapture();
            if (!uri) { Alert.alert("오류", "이미지 생성에 실패했어요."); return; }
            await MediaLibrary.saveToLibraryAsync(uri);
            Alert.alert("저장 완료", "갤러리에 저장됐어요.");
            onClose();
        } finally {
            setLoading(false);
        }
    }

    async function handleShare() {
        setLoading(true);
        try {
            const uri = await doCapture();
            if (!uri) { Alert.alert("오류", "이미지 생성에 실패했어요."); return; }
            const available = await Sharing.isAvailableAsync();
            if (!available) { Alert.alert("오류", "공유 기능을 사용할 수 없어요."); return; }
            await Sharing.shareAsync(uri, { mimeType: "image/png" });
            onClose();
        } finally {
            setLoading(false);
        }
    }

    if (!isOpen) return null;

    if (chatMessages.length < 2) {
        return (
            <Modal visible transparent animationType="fade" onRequestClose={onClose}>
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
                    <View style={styles.smallCard}>
                        <Text style={styles.smallMsg}>
                            내보내기하려면 대화가 더 필요해요.{"\n"}{pet.name}와 더 이야기해볼까요?
                        </Text>
                        <TouchableOpacity
                            style={[styles.confirmBtn, { backgroundColor: accent }]}
                            onPress={onClose}
                        >
                            <Text style={{ color: "#fff", fontWeight: "600" }}>확인</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        );
    }

    return (
        <Modal visible transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.backdrop}>
                <View style={styles.sheet}>
                    {/* 헤더 */}
                    <View style={styles.sheetHeader}>
                        <Text style={styles.sheetTitle}>대화 내보내기</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons name="close" size={20} color={COLORS.gray[500]} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
                        {/* 템플릿 선택 */}
                        <Text style={styles.sectionLabel}>템플릿 선택</Text>
                        <View style={styles.templateGrid}>
                            {TEMPLATES.map((t) => (
                                <TouchableOpacity
                                    key={t.id}
                                    onPress={() => setTemplate(t.id)}
                                    style={[
                                        styles.templateBtn,
                                        template === t.id && { borderColor: accent, backgroundColor: isMemorialMode ? "rgba(245,158,11,0.08)" : "rgba(5,178,220,0.08)" },
                                    ]}
                                    activeOpacity={0.85}
                                >
                                    <Ionicons
                                        name={t.icon}
                                        size={20}
                                        color={template === t.id ? accent : COLORS.gray[500]}
                                        style={{ marginBottom: 6 }}
                                    />
                                    <Text style={[styles.templateName, template === t.id && { color: accent }]}>{t.name}</Text>
                                    <Text style={styles.templateDesc}>{t.desc}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* 미리보기 */}
                        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>미리보기</Text>
                        <View style={styles.preview}>
                            <View style={{ transform: [{ scale: 0.82 }], transformOrigin: "top center" as unknown as undefined }}>
                                <ExportChatCard
                                    messages={messages}
                                    pet={pet}
                                    isMemorialMode={isMemorialMode}
                                    template={template}
                                />
                            </View>
                        </View>
                    </ScrollView>

                    {/* 캡처 대상 (off-screen) */}
                    <View
                        ref={captureViewRef}
                        style={styles.offscreen}
                        collapsable={false}
                    >
                        <ExportChatCard
                            messages={messages}
                            pet={pet}
                            isMemorialMode={isMemorialMode}
                            template={template}
                        />
                    </View>

                    {/* 하단 버튼 */}
                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={styles.shareBtn}
                            onPress={handleShare}
                            disabled={loading}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.shareBtnText}>공유하기</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.saveBtn, { backgroundColor: accent }, loading && { opacity: 0.6 }]}
                            onPress={handleSave}
                            disabled={loading}
                            activeOpacity={0.85}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="download-outline" size={16} color="#fff" />
                                    <Text style={styles.saveBtnText}>저장하기</Text>
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
    backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
    sheet: {
        backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
        maxHeight: "90%", overflow: "hidden",
    },
    sheetHeader: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 20, paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.gray[200],
    },
    sheetTitle: { fontSize: 17, fontWeight: "700", color: COLORS.gray[900] },
    sectionLabel: { fontSize: 13, fontWeight: "600", color: COLORS.gray[700], marginBottom: 10 },
    templateGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    templateBtn: {
        width: "47%", padding: 12, borderRadius: 14, borderWidth: 1.5,
        borderColor: COLORS.gray[200], alignItems: "center",
    },
    templateName: { fontSize: 13, fontWeight: "600", color: COLORS.gray[800] },
    templateDesc: { fontSize: 11, color: COLORS.gray[400], marginTop: 2, textAlign: "center" },
    preview: { alignItems: "center", overflow: "hidden", minHeight: 220 },
    offscreen: { position: "absolute", top: 9999, left: 0 },
    footer: {
        flexDirection: "row", gap: 10, padding: 16,
        borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.gray[200],
    },
    shareBtn: {
        flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5,
        borderColor: COLORS.gray[200], alignItems: "center",
    },
    shareBtnText: { fontSize: 15, fontWeight: "600", color: COLORS.gray[700] },
    saveBtn: {
        flex: 1, paddingVertical: 14, borderRadius: 14,
        alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6,
    },
    saveBtnText: { fontSize: 15, fontWeight: "600", color: "#fff" },
    smallCard: {
        alignSelf: "center", backgroundColor: "#fff", borderRadius: 20,
        padding: 24, maxWidth: 320, alignItems: "center",
    },
    smallMsg: { fontSize: 15, color: COLORS.gray[600], textAlign: "center", lineHeight: 22, marginBottom: 16 },
    confirmBtn: { paddingHorizontal: 28, paddingVertical: 10, borderRadius: 20 },
});
