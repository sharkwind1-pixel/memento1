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
import { useDarkMode } from "@/contexts/ThemeContext";
import { API_BASE_URL, VIDEO } from "@/config/constants";
import { COLORS } from "@/lib/theme";
import { VIDEO_TEMPLATES, CATEGORY_LABEL, type MobileVideoTemplate } from "@/data/videoTemplates";
import PaymentWebViewModal from "@/components/payments/PaymentWebViewModal";

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
    const { isDarkMode } = useDarkMode();
    const [step, setStep] = useState<Step>("photo");
    const [paymentMode, setPaymentMode] = useState<"video" | "subscription" | null>(null);
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

    /**
     * 단건 구매 — 인앱 WebView로 PortOne 결제창 호출.
     * 결제 검증 완료 후 quota 다시 fetch.
     */
    function handleSinglePurchase() {
        setPaymentMode("video");
    }

    /**
     * 정기 구독 — 인앱 WebView로 PortOne 배치결제(빌링키 발급) 호출.
     * 기본은 basic plan으로 시작 (사용자가 더 비싼 플랜 원하면 /subscription에서).
     */
    function handleSubscribe() {
        setPaymentMode("subscription");
    }

    // quota 로드 실패해도 시도는 가능. 서버가 quota 검증.
    const remaining = quota ? quota.limit - quota.used : 0;
    const canGenerate = !quota || remaining > 0;

    // 모드별 카테고리 분류
    const visibleTemplates = VIDEO_TEMPLATES.filter((t) => {
        if (t.category === "transform") return true;
        if (isMemorialMode) return t.category === "memorial";
        return t.category === "fun";
    });

    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.gray[50];
    const headerBg = isDarkMode ? COLORS.gray[900] : "#fff";
    const headerBorder = isDarkMode ? COLORS.gray[800] : COLORS.gray[100];
    const titleColor = isDarkMode ? COLORS.white : COLORS.gray[900];
    const subColor = isDarkMode ? COLORS.gray[400] : COLORS.gray[500];
    const cardBg = isDarkMode ? COLORS.gray[900] : "#fff";
    const cardBorder = isDarkMode ? COLORS.gray[700] : "transparent";
    const noticeBg = isDarkMode ? COLORS.gray[800] : COLORS.gray[100];
    const noticeColor = isDarkMode ? COLORS.gray[300] : COLORS.gray[600];
    const emptyTextColor = isDarkMode ? COLORS.gray[400] : COLORS.gray[500];
    const photoItemBg = isDarkMode ? COLORS.gray[800] : COLORS.gray[100];

    function renderHeader() {
        return (
            <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: headerBorder }]}>
                {step === "photo" ? (
                    <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.headerBtn}>
                        <Ionicons name="close" size={22} color={isDarkMode ? COLORS.gray[300] : COLORS.gray[800]} />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        onPress={() => setStep(step === "template" ? "photo" : "template")}
                        hitSlop={8}
                        style={styles.headerBtn}
                    >
                        <Ionicons name="chevron-back" size={22} color={isDarkMode ? COLORS.gray[300] : COLORS.gray[800]} />
                    </TouchableOpacity>
                )}
                <View style={{ flex: 1 }}>
                    <Text style={[styles.headerTitle, { color: titleColor }]}>AI 영상 생성</Text>
                    <Text style={[styles.headerSub, { color: subColor }]}>
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
            <View style={[styles.quotaCard, { backgroundColor: cardBg, borderColor: accentColor + "33" }]}>
                <Ionicons name="sparkles-outline" size={14} color={accentColor} />
                <Text style={[styles.quotaText, { color: isDarkMode ? COLORS.gray[300] : COLORS.gray[700] }]}>
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
                    <Ionicons name="image-outline" size={32} color={isDarkMode ? COLORS.gray[500] : COLORS.gray[400]} />
                    <Text style={[styles.emptyText, { color: emptyTextColor }]}>먼저 사진을 업로드해주세요</Text>
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
                                { backgroundColor: photoItemBg },
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
                                { backgroundColor: cardBg, borderColor: cardBorder },
                                selected && { borderColor: accentColor, backgroundColor: isDarkMode ? "rgba(5,178,220,0.12)" : (accentColor + "0a") },
                            ]}
                        >
                            <View style={[styles.templateIcon, { backgroundColor: accentColor + "1a" }]}>
                                <Ionicons name={t.icon} size={18} color={accentColor} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <View style={styles.templateNameRow}>
                                    <Text style={[styles.templateName, { color: titleColor }]}>{t.name}</Text>
                                    <View style={[styles.templateBadge, { backgroundColor: accentColor + "1a" }]}>
                                        <Text style={[styles.templateBadgeText, { color: accentColor }]}>
                                            {CATEGORY_LABEL[t.category]}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={[styles.templateDesc, { color: subColor }]}>{t.description}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={isDarkMode ? COLORS.gray[500] : COLORS.gray[400]} />
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
                <View style={[styles.confirmCard, { backgroundColor: cardBg }]}>
                    <Image source={{ uri: photo.url }} style={styles.confirmPhoto} />
                </View>
                <View style={[styles.confirmInfo, { backgroundColor: cardBg }]}>
                    <Text style={styles.confirmLabel}>{CATEGORY_LABEL[template.category]}</Text>
                    <Text style={[styles.confirmTitle, { color: titleColor }]}>{template.name}</Text>
                    <Text style={[styles.confirmDesc, { color: noticeColor }]}>{template.description}</Text>
                </View>
                <View style={[styles.noticeCard, { backgroundColor: noticeBg }]}>
                    <Ionicons name="information-circle-outline" size={16} color={noticeColor} />
                    <Text style={[styles.noticeText, { color: noticeColor }]}>
                        영상 생성은 1~3분 정도 걸려요. 완료되면 AI 영상 탭에서 확인할 수 있어요.
                    </Text>
                </View>
                {!canGenerate && quota ? (
                    <>
                        <View style={[styles.noticeCard, { backgroundColor: "#FEF3C7" }]}>
                            <Ionicons name="alert-circle-outline" size={16} color="#B45309" />
                            <Text style={[styles.noticeText, { color: "#92400E" }]}>
                                {quota.tier === "free"
                                    ? `평생 무료 1회를 모두 사용했어요. 단건 구매(${VIDEO.SINGLE_PRICE.toLocaleString()}원) 또는 정기 구독으로 추가 생성할 수 있어요.`
                                    : `이번 달 쿼터를 모두 사용했어요. 단건 구매(${VIDEO.SINGLE_PRICE.toLocaleString()}원) 또는 정기 구독으로 추가 생성할 수 있어요.`}
                            </Text>
                        </View>
                        {/* 단건 구매 + 정기 구독 동시 노출 */}
                        <View style={{ flexDirection: "row", gap: 8 }}>
                            <TouchableOpacity
                                onPress={handleSinglePurchase}
                                style={[styles.purchaseBtn, { backgroundColor: accentColor }]}
                                activeOpacity={0.85}
                            >
                                <Ionicons name="card-outline" size={16} color="#fff" />
                                <View style={{ alignItems: "center" }}>
                                    <Text style={styles.purchaseBtnText}>단건 구매</Text>
                                    <Text style={styles.purchaseBtnSub}>{VIDEO.SINGLE_PRICE.toLocaleString()}원</Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSubscribe}
                                style={[styles.purchaseBtn, {
                                    backgroundColor: isDarkMode ? COLORS.gray[800] : "#fff",
                                    borderWidth: 2,
                                    borderColor: accentColor,
                                }]}
                                activeOpacity={0.85}
                            >
                                <Ionicons name="ribbon-outline" size={16} color={accentColor} />
                                <View style={{ alignItems: "center" }}>
                                    <Text style={[styles.purchaseBtnText, { color: accentColor }]}>정기 구독</Text>
                                    <Text style={[styles.purchaseBtnSub, { color: accentColor }]}>월 9,900원~</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </>
                ) : (
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
                )}
            </View>
        );
    }

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
                {renderHeader()}
                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
                    {renderQuotaBadge()}
                    {step === "photo" && renderPhotoStep()}
                    {step === "template" && renderTemplateStep()}
                    {step === "confirm" && renderConfirmStep()}
                </ScrollView>

                {/* 인앱 결제 WebView */}
                <PaymentWebViewModal
                    visible={paymentMode !== null}
                    type={paymentMode ?? "video"}
                    plan={paymentMode === "subscription" ? "basic" : undefined}
                    onClose={() => setPaymentMode(null)}
                    onSuccess={() => {
                        setPaymentMode(null);
                        // 결제 성공 → quota 다시 가져오기 → canGenerate 갱신
                        loadQuota();
                    }}
                />
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        gap: 8,
    },
    headerBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
    headerTitle: { fontSize: 16, fontWeight: "700" },
    headerSub: { fontSize: 11, marginTop: 2 },
    quotaCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        marginBottom: 12,
    },
    quotaText: { fontSize: 12, fontWeight: "600" },
    photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    photoItem: {
        width: "32%",
        aspectRatio: 1,
        borderRadius: 10,
        overflow: "hidden",
        borderWidth: 0,
    },
    photoImg: { width: "100%", height: "100%" },
    emptyBox: { alignItems: "center", justifyContent: "center", paddingVertical: 48, gap: 8 },
    emptyText: { fontSize: 13 },
    templateRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderRadius: 14,
        padding: 12,
        borderWidth: 2,
    },
    templateIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    templateNameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
    templateName: { fontSize: 14, fontWeight: "700" },
    templateBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
    templateBadgeText: { fontSize: 10, fontWeight: "700" },
    templateDesc: { fontSize: 12 },
    confirmCard: {
        borderRadius: 14,
        overflow: "hidden",
    },
    confirmPhoto: { width: "100%", aspectRatio: 1 },
    confirmInfo: { borderRadius: 14, padding: 14 },
    confirmLabel: { fontSize: 12, fontWeight: "600", color: COLORS.memento[500], marginBottom: 4 },
    confirmTitle: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
    confirmDesc: { fontSize: 13, lineHeight: 20 },
    noticeCard: {
        flexDirection: "row",
        gap: 8,
        borderRadius: 10,
        padding: 12,
    },
    noticeText: { flex: 1, fontSize: 12, lineHeight: 18 },
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
    purchaseBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: 8,
    },
    purchaseBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
    purchaseBtnSub: { color: "#fff", fontSize: 11, marginTop: 1, opacity: 0.85 },
});
