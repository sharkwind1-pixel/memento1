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
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/contexts/AuthContext";
import { useDarkMode } from "@/contexts/ThemeContext";
import { API_BASE_URL, VIDEO } from "@/config/constants";
import { COLORS } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { VIDEO_TEMPLATES, CATEGORY_LABEL, type MobileVideoTemplate } from "@/data/videoTemplates";
import PaymentWebViewModal, { type PayMethod } from "@/components/payments/PaymentWebViewModal";
import PayMethodPicker from "@/components/payments/PayMethodPicker";
import PackagePicker from "@/components/payments/PackagePicker";

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
    const { session, user } = useAuth();
    const { isDarkMode } = useDarkMode();
    const [step, setStep] = useState<Step>("photo");
    const [paymentMode, setPaymentMode] = useState<"video" | "subscription" | null>(null);
    const [methodPickerOpen, setMethodPickerOpen] = useState(false);
    const [pickedMethod, setPickedMethod] = useState<PayMethod | null>(null);
    const [pickedPackageSize, setPickedPackageSize] = useState<1 | 5 | 10>(5); // 기본 5회 묶음 (인기)
    const [packagePickerOpen, setPackagePickerOpen] = useState(false);
    const [photo, setPhoto] = useState<PetPhoto | null>(null);
    const [uploadingNew, setUploadingNew] = useState(false);
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
            // 진행 안내 + 푸시 알림 안내 (모바일은 영상 완료 시 푸시로 알림 도달)
            Alert.alert(
                "영상 생성 시작",
                "영상을 만들고 있어요! 완성되면 알림으로 알려드릴게요. 다른 활동 즐기고 계세요.",
            );
            onSuccess(data.generationId ?? data.id ?? "");
            onClose();
        } catch {
            Alert.alert("네트워크 오류", "잠시 후 다시 시도해주세요.");
        } finally {
            setSubmitting(false);
        }
    }

    /**
     * 영상 구매 (단품 + 묶음) — 1차로 묶음 사이즈 picker → 결제 수단 picker → WebView.
     */
    function handleSinglePurchase() {
        setPackagePickerOpen(true);
    }

    function handlePackagePicked(size: 1 | 5 | 10) {
        setPickedPackageSize(size);
        setPackagePickerOpen(false);
        setMethodPickerOpen(true);
    }

    function handleMethodPicked(method: PayMethod) {
        setMethodPickerOpen(false);
        setPickedMethod(method);
        setPaymentMode("video");
    }

    /**
     * 정기 구독 — KCP 빌링키 발급은 카드만 가능 → method picker 생략, 바로 진행.
     */
    function handleSubscribe() {
        setPickedMethod(null);
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

    /**
     * 갤러리에서 사진 직접 선택 → pet-media에 업로드 → 그 사진으로 영상 생성.
     * 업로드도 같이 되니까 기록(사진첩)에도 영구 저장.
     */
    async function pickFromGallery() {
        if (!user || uploadingNew) return;
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (perm.status !== "granted") {
            Alert.alert("권한 필요", "사진첩 접근 권한이 필요해요");
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.9,
        });
        if (result.canceled || !result.assets[0]) return;

        setUploadingNew(true);
        try {
            const asset = result.assets[0];
            const ext = asset.uri.split(".").pop()?.split("?")[0]?.toLowerCase() || "jpg";
            const path = `${user.id}/${pet.id}/${Date.now()}_video_src.${ext}`;
            const response = await fetch(asset.uri);
            const arrayBuffer = await response.arrayBuffer();

            const { error: upErr } = await supabase.storage
                .from("pet-media")
                .upload(path, new Uint8Array(arrayBuffer), {
                    contentType: ext === "png" ? "image/png" : "image/jpeg",
                    upsert: false,
                });
            if (upErr) throw new Error(upErr.message);

            const { data: urlData } = supabase.storage.from("pet-media").getPublicUrl(path);
            const { data: insertData, error: insertErr } = await supabase
                .from("pet_media")
                .insert({
                    pet_id: pet.id,
                    user_id: user.id,
                    type: "image",
                    url: urlData.publicUrl,
                    storage_path: path,
                    date: new Date().toISOString().slice(0, 10),
                })
                .select("id, url")
                .single();
            if (insertErr || !insertData) throw new Error(insertErr?.message ?? "DB 저장 실패");

            // 새로 업로드한 사진을 바로 선택 + 다음 단계로
            const newPhoto: PetPhoto = { id: insertData.id, url: insertData.url, type: "image" };
            setPhoto(newPhoto);
            setStep("template");
        } catch (e) {
            Alert.alert("업로드 실패", e instanceof Error ? e.message : "다시 시도해주세요");
        } finally {
            setUploadingNew(false);
        }
    }

    function renderPhotoStep() {
        return (
            <View>
                {/* 갤러리에서 직접 선택하기 (항상 노출) */}
                <TouchableOpacity
                    onPress={pickFromGallery}
                    disabled={uploadingNew}
                    activeOpacity={0.85}
                    style={[styles.galleryBtn, { borderColor: accentColor, backgroundColor: cardBg }]}
                >
                    {uploadingNew ? (
                        <ActivityIndicator size="small" color={accentColor} />
                    ) : (
                        <>
                            <Ionicons name="cloud-upload-outline" size={18} color={accentColor} />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.galleryBtnTitle, { color: accentColor }]}>
                                    갤러리에서 사진 가져오기
                                </Text>
                                <Text style={[styles.galleryBtnSub, { color: emptyTextColor }]}>
                                    사진첩에 자동 저장 + 영상 생성에 사용
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={accentColor} />
                        </>
                    )}
                </TouchableOpacity>

                {imagePhotos.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <Ionicons name="image-outline" size={32} color={isDarkMode ? COLORS.gray[500] : COLORS.gray[400]} />
                        <Text style={[styles.emptyText, { color: emptyTextColor }]}>
                            저장된 사진이 없어요. 위 버튼으로 사진을 골라주세요.
                        </Text>
                    </View>
                ) : (
                    <>
                        <Text style={[styles.sectionLabel, { color: emptyTextColor }]}>
                            저장된 사진에서 선택
                        </Text>
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
                    </>
                )}
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

                {/* 묶음 사이즈 picker (단품 / 5회 / 10회) */}
                <PackagePicker
                    visible={packagePickerOpen}
                    onClose={() => setPackagePickerOpen(false)}
                    onPick={handlePackagePicked}
                    accentColor={accentColor}
                    isDarkMode={isDarkMode}
                />

                {/* 결제 수단 picker (단건만) */}
                <PayMethodPicker
                    visible={methodPickerOpen}
                    onClose={() => setMethodPickerOpen(false)}
                    onPick={handleMethodPicked}
                    accentColor={accentColor}
                    title={
                        pickedPackageSize === 1 ? "AI 영상 1회권"
                            : pickedPackageSize === 5 ? "AI 영상 5회 묶음"
                                : "AI 영상 10회 묶음"
                    }
                    amountKRW={
                        pickedPackageSize === 1 ? VIDEO.SINGLE_PRICE
                            : pickedPackageSize === 5 ? VIDEO.BUNDLE_5_PRICE
                                : VIDEO.BUNDLE_10_PRICE
                    }
                />

                {/* 인앱 결제 WebView */}
                <PaymentWebViewModal
                    visible={paymentMode !== null}
                    type={paymentMode ?? "video"}
                    plan={paymentMode === "subscription" ? "basic" : undefined}
                    method={paymentMode === "video" ? (pickedMethod ?? undefined) : undefined}
                    packageSize={paymentMode === "video" ? pickedPackageSize : undefined}
                    onClose={() => {
                        setPaymentMode(null);
                        setPickedMethod(null);
                    }}
                    onSuccess={() => {
                        setPaymentMode(null);
                        setPickedMethod(null);
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
    galleryBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 14,
        borderRadius: 12,
        borderWidth: 2,
        borderStyle: "dashed",
        marginBottom: 16,
    },
    galleryBtnTitle: { fontSize: 14, fontWeight: "700" },
    galleryBtnSub: { fontSize: 11, marginTop: 2 },
    sectionLabel: { fontSize: 12, fontWeight: "600", marginBottom: 8 },
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
