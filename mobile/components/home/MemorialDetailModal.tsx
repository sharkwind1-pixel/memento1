/**
 * MemorialDetailModal — 추모 펫 디테일 모달 (웹 src/components/features/home/MemorialDetailModal.tsx 매칭)
 *
 * 프로필 사진 + 정보 + 위로하기 버튼 + 위로의 말 (목록/프리셋 선택/삭제).
 * - GET /api/memorial-messages?petId=
 * - POST /api/memorial-messages
 * - DELETE /api/memorial-messages?id=
 * - POST /api/pets/{id}/condolence (토글)
 */

import { useState, useEffect, useCallback } from "react";
import {
    View, Text, ScrollView, TouchableOpacity, Image, Modal,
    StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL } from "@/config/constants";
import { COLORS } from "@/lib/theme";

interface MemorialPetItem {
    id: string;
    name: string;
    type: string;
    breed: string;
    profileImage: string | null;
    isNewlyRegistered: boolean;
    yearsLabel: string;
    condolenceCount: number;
}

interface CondolenceMessage {
    id: string;
    petId?: string;
    userId?: string;
    nickname?: string;
    message: string;
    createdAt: string;
}

const CONDOLENCE_PRESETS = [
    "영원히 기억할게요",
    "마음속에 언제나 함께할 거예요",
    "무지개다리 너머에서 행복하길",
    "따뜻한 기억으로 남아주어 고마워요",
    "언제까지나 사랑해",
    "함께했던 시간이 소중했어요",
    "편히 쉬고 있을 거라 믿어요",
    "당신의 이야기가 따뜻합니다",
];

interface Props {
    pet: MemorialPetItem | null;
    visible: boolean;
    isCondoled: boolean;
    onClose: () => void;
    onToggleCondolence: (petId: string) => void;
}

export default function MemorialDetailModal({
    pet, visible, isCondoled, onClose, onToggleCondolence,
}: Props) {
    const { user, session, isAdminUser } = useAuth();
    const [messages, setMessages] = useState<CondolenceMessage[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(true);
    const [sending, setSending] = useState(false);
    const [showPresets, setShowPresets] = useState(false);
    const [myMessageExists, setMyMessageExists] = useState(false);

    const isAdmin = isAdminUser;

    const loadMessages = useCallback(async () => {
        if (!pet) return;
        setLoadingMessages(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/memorial-messages?petId=${pet.id}`);
            if (res.ok) {
                const data = await res.json();
                const list: CondolenceMessage[] = Array.isArray(data?.messages) ? data.messages : [];
                setMessages(list);
                if (user) {
                    setMyMessageExists(list.some((m) => m.userId === user.id));
                }
            }
        } catch {
            // ignore
        } finally {
            setLoadingMessages(false);
        }
    }, [pet, user]);

    useEffect(() => {
        if (visible && pet) {
            loadMessages();
            setShowPresets(false);
        }
    }, [visible, pet, loadMessages]);

    async function handleSelectPreset(preset: string) {
        if (!pet || sending || !user || !session) {
            if (!session) Alert.alert("로그인 필요", "로그인 후 위로의 말을 남길 수 있어요");
            return;
        }
        Haptics.selectionAsync().catch(() => {});
        setSending(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/memorial-messages`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ petId: pet.id, message: preset }),
            });
            const data = await res.json();
            if (res.ok && data.message) {
                setMessages((prev) => [data.message, ...prev.filter((m) => m.userId !== user.id)]);
                setMyMessageExists(true);
                setShowPresets(false);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            } else {
                Alert.alert("전송 실패", data.error || "다시 시도해주세요");
            }
        } catch {
            Alert.alert("전송 실패", "네트워크 오류");
        } finally {
            setSending(false);
        }
    }

    async function handleDelete(messageId: string) {
        if (!session) return;
        try {
            const res = await fetch(
                `${API_BASE_URL}/api/memorial-messages?id=${messageId}`,
                {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${session.access_token}` },
                },
            );
            if (res.ok) {
                setMessages((prev) => prev.filter((m) => m.id !== messageId));
                setMyMessageExists(false);
            } else {
                const data = await res.json();
                Alert.alert("삭제 실패", data.error || "다시 시도해주세요");
            }
        } catch {
            Alert.alert("삭제 실패", "네트워크 오류");
        }
    }

    function canDelete(msg: CondolenceMessage): boolean {
        if (!user) return false;
        if (msg.userId === user.id) return true;
        if (isAdmin) return true;
        return false;
    }

    function formatDate(dateStr: string): string {
        try {
            const d = new Date(dateStr);
            return `${d.getMonth() + 1}/${d.getDate()}`;
        } catch {
            return "";
        }
    }

    if (!pet) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.backdrop}>
                <View style={styles.modal}>
                    {/* 닫기 */}
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
                        <Ionicons name="close" size={18} color="#fff" />
                    </TouchableOpacity>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* 프로필 사진 */}
                        <View style={styles.imageWrap}>
                            {pet.profileImage ? (
                                <Image source={{ uri: pet.profileImage }} style={styles.profileImage} />
                            ) : (
                                <LinearGradient
                                    colors={[COLORS.memorial[200], "#FCD34D"]}
                                    style={styles.profileImage}
                                >
                                    <Ionicons name="paw" size={72} color="rgba(245,158,11,0.4)" />
                                </LinearGradient>
                            )}
                            <LinearGradient
                                colors={["transparent", "rgba(0,0,0,0.4)"]}
                                style={styles.imageOverlay}
                            />
                        </View>

                        {/* 펫 정보 */}
                        <View style={styles.infoWrap}>
                            <Text style={styles.petName}>{pet.name}</Text>
                            <Text style={styles.petBreed}>
                                {pet.type}{pet.breed ? ` / ${pet.breed}` : ""}
                            </Text>
                            {pet.yearsLabel ? (
                                <Text style={styles.yearsLabel}>{pet.yearsLabel}</Text>
                            ) : null}

                            <TouchableOpacity
                                onPress={() => {
                                    Haptics.selectionAsync().catch(() => {});
                                    onToggleCondolence(pet.id);
                                }}
                                style={[styles.condolenceBtn, isCondoled && styles.condolenceBtnActive]}
                                activeOpacity={0.85}
                            >
                                <Ionicons
                                    name={isCondoled ? "heart" : "heart-outline"}
                                    size={18}
                                    color={isCondoled ? COLORS.memorial[600] : COLORS.memorial[500]}
                                />
                                <Text style={[
                                    styles.condolenceText,
                                    { color: isCondoled ? COLORS.memorial[600] : COLORS.memorial[500] },
                                ]}>
                                    {pet.condolenceCount > 0 ? `위로 ${pet.condolenceCount}` : "위로하기"}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.divider} />

                        {/* 위로의 말 섹션 */}
                        <View style={styles.messagesWrap}>
                            <Text style={styles.sectionTitle}>
                                위로의 말
                                {messages.length > 0 ? (
                                    <Text style={{ color: COLORS.memorial[500] }}> {messages.length}</Text>
                                ) : null}
                            </Text>

                            {loadingMessages ? (
                                <View style={styles.loadingRow}>
                                    <ActivityIndicator color={COLORS.memorial[400]} />
                                </View>
                            ) : messages.length === 0 ? (
                                <View style={styles.emptyRow}>
                                    <Text style={styles.emptyTitle}>아직 위로의 말이 없습니다</Text>
                                    <Text style={styles.emptyHint}>첫 번째 위로의 말을 남겨주세요</Text>
                                </View>
                            ) : (
                                <View style={{ gap: 10 }}>
                                    {messages.map((msg) => (
                                        <View key={msg.id} style={styles.messageRow}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.messageText}>{msg.message}</Text>
                                                <Text style={styles.messageMeta}>
                                                    {msg.nickname || "익명"}{"  "}
                                                    <Text style={{ color: COLORS.gray[300] }}>
                                                        {formatDate(msg.createdAt)}
                                                    </Text>
                                                </Text>
                                            </View>
                                            {canDelete(msg) ? (
                                                <TouchableOpacity
                                                    onPress={() => handleDelete(msg.id)}
                                                    hitSlop={6}
                                                    style={styles.deleteBtn}
                                                >
                                                    <Ionicons name="trash-outline" size={14} color="#EF4444" />
                                                </TouchableOpacity>
                                            ) : null}
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* 프리셋 메시지 */}
                            {user && !myMessageExists ? (
                                <View style={{ marginTop: 12 }}>
                                    {!showPresets ? (
                                        <TouchableOpacity
                                            onPress={() => setShowPresets(true)}
                                            style={styles.presetToggle}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={styles.presetToggleText}>위로의 말 남기기</Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <View style={{ gap: 6 }}>
                                            {CONDOLENCE_PRESETS.map((preset) => (
                                                <TouchableOpacity
                                                    key={preset}
                                                    onPress={() => handleSelectPreset(preset)}
                                                    disabled={sending}
                                                    style={styles.presetItem}
                                                    activeOpacity={0.85}
                                                >
                                                    <Text style={styles.presetText}>{preset}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            ) : null}
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    modal: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: "92%",
        overflow: "hidden",
    },
    closeBtn: {
        position: "absolute",
        top: 12,
        right: 12,
        zIndex: 10,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "rgba(0,0,0,0.4)",
        alignItems: "center",
        justifyContent: "center",
    },
    imageWrap: {
        width: "100%",
        aspectRatio: 1,
        backgroundColor: COLORS.memorial[100],
        position: "relative",
    },
    profileImage: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
    imageOverlay: { position: "absolute", left: 0, right: 0, bottom: 0, height: 120 },
    infoWrap: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, alignItems: "center" },
    petName: { fontSize: 20, fontWeight: "700", color: COLORS.gray[800] },
    petBreed: { fontSize: 14, color: COLORS.gray[500], marginTop: 2 },
    yearsLabel: { fontSize: 12, color: COLORS.memorial[600], fontWeight: "600", marginTop: 4 },
    condolenceBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 14,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 9999,
        backgroundColor: COLORS.memorial[50],
    },
    condolenceBtnActive: { backgroundColor: COLORS.memorial[100] },
    condolenceText: { fontSize: 14, fontWeight: "600" },
    divider: { marginHorizontal: 20, height: 1, backgroundColor: "rgba(245,158,11,0.18)" },
    messagesWrap: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 32 },
    sectionTitle: { fontSize: 14, fontWeight: "700", color: COLORS.gray[700], marginBottom: 10 },
    loadingRow: { paddingVertical: 16, alignItems: "center" },
    emptyRow: { paddingVertical: 24, alignItems: "center" },
    emptyTitle: { fontSize: 13, color: COLORS.gray[400] },
    emptyHint: { fontSize: 11, color: COLORS.gray[300], marginTop: 4 },
    messageRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
        padding: 10,
        borderRadius: 12,
        backgroundColor: "rgba(254,243,199,0.4)",
    },
    messageText: { fontSize: 13, color: COLORS.gray[700], lineHeight: 18 },
    messageMeta: { fontSize: 11, color: COLORS.gray[400], marginTop: 4 },
    deleteBtn: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    presetToggle: {
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: COLORS.memorial[50],
        alignItems: "center",
    },
    presetToggleText: { fontSize: 14, fontWeight: "600", color: COLORS.memorial[600] },
    presetItem: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: "rgba(254,243,199,0.3)",
    },
    presetText: { fontSize: 13, color: COLORS.gray[700] },
});
