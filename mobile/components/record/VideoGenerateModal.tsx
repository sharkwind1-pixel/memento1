/**
 * VideoGenerateModal — AI 영상 생성 (모바일 V1)
 *
 * 웹 src/components/features/video/VideoGenerateModal.tsx 매칭 (단순화).
 * - Step 1: 사진 선택 (selectedPet.photos에서 1장)
 * - Step 2: 템플릿 선택 (모드별 카테고리)
 * - Step 3: 확인 + 생성 (POST /api/video/generate)
 *
 * 쿼터 체크는 모달 오픈 시 GET /api/video/quota.
 * 단건 구매 안내는 V1에서 안내만, 결제 플로우는 V2에서 구현.
 */

import { useState, useEffect } from "react";
import {
    View, Text, Modal, TouchableOpacity, Image,
    ScrollView, StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL } from "@/config/constants";
import { COLORS } from "@/lib/theme";
import { VIDEO_TEMPLATES, CATEGORY_LABEL, type VideoTemplateCategory, type MobileVideoTemplate } from "@/data/videoTemplates";

interface PetPhoto {
    id: string;
    url: string;
    type?: string;
}

interface Pet {
    id: string;
    name: string;
    status?: string;
    photos: PetPhoto[];
}

interface Quota {
    used: number;
    limit: number;
    tier: string;
    isLifetimeFree: boolean;
    bonusCredits: number;
}

interface Props {
    visible: boolean;
    onClose: () => void;
    onSuccess: (generationId: string) => void;
    pet: Pet;
    isMemorialMode: boolean;
}

type Step = "photo" | "template" | "confirm";

export default function VideoGenerateModal({ visible, onClose, onSuccess, pet, isMemorialMode }: Props) {
    const { session } = useAuth();
    const [step, setStep] = useState<Step>("photo");
    const [photo, setPhoto] = useState<PetPhoto | null>(null);
    const [template, setTemplate] = useState<MobileVideoTemplate | null>(null);
    const [quota, setQuota] = useState<Quota | null>(null);
    const [loadingQuota, setLoadingQuota] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const accentColor = isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500];
    const imagePhotos = pet.photos.filter((p) => p.type !== "video");

    useEffect(() => {
        if (!visible) return;
        setStep("photo");
        setPhoto(null);
        setTemplate(null);
        loadQuota();
    }, [visible]);

    async function loadQuota() {
        if (!session) return;
        setLoadingQuota(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/video/quota`, {
                headers: { "Authorization": `Bearer ${session.access_token}` },
            });
            if (!res.ok) return;
            const data = await res.json();
            setQuota({
                used: data.used ?? 0,
                limit: data.limit ?? 0,
                tier: data.tier ?? "free",
                isLifetimeFree: data.isLifetimeFree ?? false,
                bonusCredits: data.bonusCredits ?? 0,
            });
        } catch {
            // 무시
        } finally {
            setLoadingQuota(false);
        }
    }

    async function handleGenerate() {
        if (!session || !photo || !template || submitting) return;
        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/video/generate`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${session.access_token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    petId: pet.id,
                    petName: pet.name,
                    sourcePhotoUrl: photo.url,
                    templateId: template.id,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                Alert.alert("생성 실패", data?.error || "영상 생성을 시작하지 못했어요.");
                setSubmitting(false);
                return;
            }
            onSuccess(data.generationId ?? data.id ?? "");
            onClose();
        } catch {
            Alert.alert("네트워크 오류", "잠시 후 다시 시도해주세요.");
        } finally {
            setSubmitting(false);
        }
    }

    const remaining = quota ? quota.limit - quota.used : 0;
    const canGenerate = quota !== null && remaining > 0;

    // 모드별 카테고리 분류
    const visibleTemplates = VIDEO_TEMPLATES.filter((t) => {
        if (t.category === "transform") return true;
        if (isMemorialMode) return t.category === "memorial";
        return t.category === "fun";
    });

    function renderHeader() {
        return (
            <View style={[styles.header, { borderBottomColor: COLORS.gray[100] }]}>
                {step === "photo" ? (
                    <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.headerBtn}>
                        <Ionicons name="close" size={22} color={COLORS.gray[800]} />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        onPress={() => setStep(step === "template" ? "photo" : "template")}
                        hitSlop={8}
                        style={styles.headerBtn}
                    >
                        <Ionicons name="chevron-back" size={22} color={COLORS.gray[800]} />
                    </TouchableOpacity>
                )}
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>AI 영상 생성</Text>
                    <Text style={styles.headerSub}>
                        {step === "photo" && "1단계 · 사진 선택"}
                        {step === "template" && "2단계 · 컨셉 선택"}
                        {step === "confirm" && "3단계 · 확인"}
                    </Text>
                </View>
                <View style={{ width: 32 }} />
            </View>
        );
    }

    function renderQuotaBadge() {
        if (loadingQuota) return null;
        if (!quota) return null;
        return (
            <View style={[styles.quotaCard, { borderColor: accentColor + "33" }]}>
                <Ionicons name="sparkles-outline" size={14} color={accentColor} />
                <Text style={styles.quotaText}>
                    {quota.tier === "free"
                        ? `평생 무료 ${quota.used}/${quota.limit}회`
                        : `이번 달 ${quota.used}/${quota.limit}회`}
                    {quota.bonusCredits > 0 ? ` (+${quota.bonusCredits} 단건)` : ""}
                </Text>
            </View>
        );
    }

    function renderPhotoStep() {
        if (imagePhotos.length === 0) {
            return (
                <View style={styles.emptyBox}>
                    <Ionicons name="image-outline" size={32} color={COLORS.gray[400]} />
                    <Text style={styles.emptyText}>먼저 사진을 업로드해주세요</Text>
                </View>
            );
        }
        return (
            <View style={styles.photoGrid}>
                {imagePhotos.map((p) => {
                    const selected = photo?.id === p.id;
                    return (
                        <TouchableOpacity
                            key={p.id}
                            activeOpacity={0.85}
                            onPress={() => {
                                setPhoto(p);
                                setStep("template");
                            }}
                            style={[
                                styles.photoItem,
                                selected && { borderColor: accentColor, borderWidth: 3 },
                            ]}
                        >
                            <Image source={{ uri: p.url }} style={styles.photoImg} />
                        </TouchableOpacity>
                    );
                })}
            </View>
        );
    }

    function renderTemplateStep() {
        return (
            <View style={{ gap: 8 }}>
                {visibleTemplates.map((t) => {
                    const selected = template?.id === t.id;
                    return (
                        <TouchableOpacity
                            key={t.id}
                            activeOpacity={0.85}
                            onPress={() => {
                                setTemplate(t);
                                setStep("confirm");
                            }}
                            style={[
                                styles.templateRow,
                                selected && { borderColor: accentColor, backgroundColor: accentColor + "0a" },
                            ]}
                        >
                            <View style={[styles.templateIcon, { backgroundColor: accentColor + "1a" }]}>
                                <Ionicons name={t.icon} size={18} color={accentColor} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <View style={styles.templateNameRow}>
                                    <Text style={styles.templateName}>{t.name}</Text>
                                    <View style={[styles.templateBadge, { backgroundColor: accentColor + "1a" }]}>
                                        <Text style={[styles.templateBadgeText, { color: accentColor }]}>
                                            {CATEGORY_LABEL[t.category]}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.templateDesc}>{t.description}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={COLORS.gray[400]} />
                        </TouchableOpacity>
                    );
                })}
            </View>
        );
    }

    function renderConfirmStep() {
        if (!photo || !template) return null;
        return (
            <View style={{ gap: 12 }}>
                <View style={styles.confirmCard}>
                    <Image source={{ uri: photo.url }} style={styles.confirmPhoto} />
                </View>
                <View style={styles.confirmInfo}>
                    <Text style={styles.confirmLabel}>{CATEGORY_LABEL[template.category]}</Text>
                    <Text style={styles.confirmTitle}>{template.name}</Text>
                    <Text style={styles.confirmDesc}>{template.description}</Text>
                </View>
                <View style={styles.noticeCard}>
                    <Ionicons name="information-circle-outline" size={16} color={COLORS.gray[600]} />
                    <Text style={styles.noticeText}>
                        영상 생성은 1~3분 정도 걸려요. 완료되면 AI 영상 탭에서 확인할 수 있어요.
                    </Text>
                </View>
                {!canGenerate && quota ? (
                    <View style={[styles.noticeCard, { backgroundColor: "#FEF3C7" }]}>
                        <Ionicons name="alert-circle-outline" size={16} color="#B45309" />
                        <Text style={[styles.noticeText, { color: "#92400E" }]}>
                            {quota.tier === "free"
                                ? "평생 무료 1회를 모두 사용했어요. 단건 구매(3,500원)로 추가 생성할 수 있어요."
                                : "이번 달 쿼터를 모두 사용했어요. 단건 구매(3,500원)로 추가 생성할 수 있어요."}
                        </Text>
                    </View>
                ) : null}
                <TouchableOpacity
                    onPress={handleGenerate}
                    disabled={!canGenerate || submitting}
                    style={[
                        styles.generateBtn,
                        { backgroundColor: accentColor },
                        (!canGenerate || submitting) && { opacity: 0.5 },
                    ]}
                    activeOpacity={0.85}
                >
                    {submitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="sparkles" size={16} color="#fff" />
                            <Text style={styles.generateBtnText}>영상 만들기</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <SafeAreaView style={styles.flex1} edges={["top"]}>
                {renderHeader()}
                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
                    {renderQuotaBadge()}
                    {step === "photo" && renderPhotoStep()}
                    {step === "template" && renderTemplateStep()}
                    {step === "confirm" && renderConfirmStep()}
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1, backgroundColor: COLORS.gray[50] },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        backgroundColor: "#fff",
        gap: 8,
    },
    headerBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
    headerTitle: { fontSize: 16, fontWeight: "700", color: COLORS.gray[900] },
    headerSub: { fontSize: 11, color: COLORS.gray[500], marginTop: 2 },
    quotaCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        backgroundColor: "#fff",
        marginBottom: 12,
    },
    quotaText: { fontSize: 12, fontWeight: "600", color: COLORS.gray[700] },
    photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    photoItem: {
        width: "32%",
        aspectRatio: 1,
        borderRadius: 10,
        overflow: "hidden",
        backgroundColor: COLORS.gray[100],
        borderWidth: 0,
    },
    photoImg: { width: "100%", height: "100%" },
    emptyBox: { alignItems: "center", justifyContent: "center", paddingVertical: 48, gap: 8 },
    emptyText: { fontSize: 13, color: COLORS.gray[500] },
    templateRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 12,
        borderWidth: 2,
        borderColor: "transparent",
    },
    templateIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    templateNameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
    templateName: { fontSize: 14, fontWeight: "700", color: COLORS.gray[900] },
    templateBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
    templateBadgeText: { fontSize: 10, fontWeight: "700" },
    templateDesc: { fontSize: 12, color: COLORS.gray[500] },
    confirmCard: {
        backgroundColor: "#fff",
        borderRadius: 14,
        overflow: "hidden",
    },
    confirmPhoto: { width: "100%", aspectRatio: 1 },
    confirmInfo: { backgroundColor: "#fff", borderRadius: 14, padding: 14 },
    confirmLabel: { fontSize: 12, fontWeight: "600", color: COLORS.memento[500], marginBottom: 4 },
    confirmTitle: { fontSize: 18, fontWeight: "700", color: COLORS.gray[900], marginBottom: 4 },
    confirmDesc: { fontSize: 13, color: COLORS.gray[600], lineHeight: 20 },
    noticeCard: {
        flexDirection: "row",
        gap: 8,
        backgroundColor: COLORS.gray[100],
        borderRadius: 10,
        padding: 12,
    },
    noticeText: { flex: 1, fontSize: 12, color: COLORS.gray[600], lineHeight: 18 },
    generateBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 14,
        borderRadius: 12,
        marginTop: 8,
    },
    generateBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
