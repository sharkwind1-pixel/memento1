/**
 * 분실/발견 동물 신고 작성 — 웹 src/app/api/lost-pets POST 1:1 이식.
 *
 * 핵심 보강 (이전 버전 → 진짜 동작):
 *  - 이미지 업로드 (Supabase Storage prefix=lost-pets) → JSON에 imageUrl + imageStoragePath
 *  - 지역(region/district) 자유텍스트 → 17개 chip + 텍스트 보조
 *  - 다크모드 대응 (배경/입력/텍스트)
 *  - AppHeader 통일 (showBack)
 *  - 오늘 날짜 자동 채우기 (분실/발견일 기본값)
 *  - 제출 중 이미지 업로드 진행 상태 표시
 */

import { useState, useEffect } from "react";
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    Alert, ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet,
    Image,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { API_BASE_URL } from "@/config/constants";
import { useAuth } from "@/contexts/AuthContext";
import { useDarkMode } from "@/contexts/ThemeContext";
import { COLORS } from "@/lib/theme";
import { uploadLostPetImage } from "@/lib/community-upload";
import AppHeader from "@/components/common/AppHeader";

type LostType = "lost" | "found";

const PET_TYPES = ["강아지", "고양이", "기타"];

const REGIONS = [
    "서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산", "세종",
    "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
];

function todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function NewLostPet() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { session, user } = useAuth();
    const { isDarkMode } = useDarkMode();

    const [type, setType] = useState<LostType>("lost");
    const [title, setTitle] = useState("");
    const [petType, setPetType] = useState("강아지");
    const [breed, setBreed] = useState("");
    const [color, setColor] = useState("");
    const [region, setRegion] = useState("");
    const [district, setDistrict] = useState("");
    const [locationDetail, setLocationDetail] = useState("");
    const [date, setDate] = useState(todayStr());
    const [description, setDescription] = useState("");
    const [contact, setContact] = useState("");
    const [reward, setReward] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // 이미지 1장 (분실/발견은 사진 1장이 핵심)
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
    const [uploadedPath, setUploadedPath] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        // type 변경 시 reward 초기화 (found는 reward 없음)
        if (type === "found") setReward("");
    }, [type]);

    async function pickImage() {
        if (!user) {
            Alert.alert("로그인 필요", "로그인이 필요합니다.");
            return;
        }
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("권한 필요", "갤러리 접근 권한이 필요합니다.");
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.85,
            allowsEditing: false,
        });
        if (result.canceled || !result.assets[0]) return;

        const asset = result.assets[0];
        setImageUri(asset.uri);
        setUploadedUrl(null);
        setUploadedPath(null);
        setUploading(true);

        const upload = await uploadLostPetImage(asset.uri, user.id, { mimeType: asset.mimeType });
        setUploading(false);
        if (!upload.success || !upload.url) {
            Alert.alert("업로드 실패", upload.error || "이미지 업로드 실패");
            setImageUri(null);
            return;
        }
        setUploadedUrl(upload.url);
        setUploadedPath(upload.path ?? null);
    }

    function removeImage() {
        setImageUri(null);
        setUploadedUrl(null);
        setUploadedPath(null);
    }

    async function handleSubmit() {
        if (!title.trim() || !date.trim()) {
            Alert.alert("입력 필요", "제목과 날짜는 필수입니다.");
            return;
        }
        if (!session) {
            Alert.alert("로그인 필요", "로그인이 필요합니다.");
            return;
        }
        if (uploading) {
            Alert.alert("업로드 진행 중", "이미지 업로드가 끝날 때까지 기다려주세요.");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/lost-pets`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    type,
                    title: title.trim(),
                    petType,
                    breed: breed.trim() || null,
                    color: color.trim() || null,
                    region: region.trim() || null,
                    district: district.trim() || null,
                    locationDetail: locationDetail.trim() || null,
                    date,
                    description: description.trim() || null,
                    contact: contact.trim() || null,
                    reward: type === "lost" ? (reward.trim() || null) : null,
                    imageUrl: uploadedUrl,
                    imageStoragePath: uploadedPath,
                }),
            });
            if (!res.ok) {
                let msg = `HTTP ${res.status}`;
                try {
                    const err = await res.json();
                    msg = err.error || msg;
                } catch {
                    try { msg = (await res.text()).slice(0, 200) || msg; } catch {}
                }
                Alert.alert("등록 실패", msg);
                return;
            }
            Alert.alert("등록 완료", "신고가 등록되었어요.", [
                { text: "확인", onPress: () => router.back() },
            ]);
        } catch (e) {
            Alert.alert("오류", e instanceof Error ? e.message : "등록 중 문제가 발생했습니다.");
        } finally {
            setSubmitting(false);
        }
    }

    const accentColor = "#EF4444"; // lost는 빨강 톤
    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.white;
    const cardBg = isDarkMode ? COLORS.gray[900] : COLORS.gray[50];
    const borderColor = isDarkMode ? COLORS.gray[700] : COLORS.gray[200];
    const textColor = isDarkMode ? COLORS.white : COLORS.gray[900];
    const labelColor = isDarkMode ? COLORS.gray[400] : COLORS.gray[600];

    const canSubmit = !!title.trim() && !!date.trim() && !submitting && !uploading;

    return (
        <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
            <Stack.Screen options={{ headerShown: false }} />
            <AppHeader showBack title={type === "lost" ? "분실 신고" : "발견 신고"} hideActions />
            <KeyboardAvoidingView
                style={styles.flex1}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <ScrollView
                    contentContainerStyle={[styles.body, { paddingBottom: 96 + insets.bottom }]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* 분실/발견 토글 */}
                    <View style={styles.typeRow}>
                        {(["lost", "found"] as LostType[]).map((t) => {
                            const active = type === t;
                            return (
                                <TouchableOpacity
                                    key={t}
                                    onPress={() => setType(t)}
                                    style={[
                                        styles.typeBtn,
                                        active
                                            ? { backgroundColor: accentColor }
                                            : { backgroundColor: cardBg, borderWidth: 1, borderColor },
                                    ]}
                                >
                                    <Text style={[
                                        styles.typeBtnText,
                                        { color: active ? "#fff" : labelColor },
                                    ]}>
                                        {t === "lost" ? "분실" : "발견"}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* 사진 */}
                    <FieldLabel color={labelColor}>대표 사진</FieldLabel>
                    {imageUri ? (
                        <View style={{ marginBottom: 16 }}>
                            <View style={{ position: "relative" }}>
                                <Image source={{ uri: uploadedUrl ?? imageUri }} style={styles.photoPreview} />
                                {uploading && (
                                    <View style={styles.photoOverlay}>
                                        <ActivityIndicator color="#fff" />
                                        <Text style={{ color: "#fff", fontSize: 12, marginTop: 6 }}>업로드 중...</Text>
                                    </View>
                                )}
                                <TouchableOpacity onPress={removeImage} style={styles.photoRemove} hitSlop={6}>
                                    <Ionicons name="close" size={16} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <TouchableOpacity
                            onPress={pickImage}
                            style={[styles.addPhotoBtn, { borderColor, backgroundColor: cardBg }]}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="image-outline" size={20} color={accentColor} />
                            <Text style={{ fontSize: 13, color: accentColor, fontWeight: "600" }}>
                                사진 추가
                            </Text>
                        </TouchableOpacity>
                    )}

                    <Field label="제목" required color={labelColor}>
                        <TextInput
                            style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor }]}
                            placeholder={type === "lost" ? "예: 골든리트리버 분실 (서울 강남)" : "예: 시바견 발견 (부산 해운대)"}
                            placeholderTextColor={COLORS.gray[400]}
                            value={title}
                            onChangeText={setTitle}
                            maxLength={100}
                        />
                    </Field>

                    <Field label="동물 종류" required color={labelColor}>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                            {PET_TYPES.map((t) => {
                                const active = petType === t;
                                return (
                                    <TouchableOpacity
                                        key={t}
                                        onPress={() => setPetType(t)}
                                        style={[
                                            styles.chipBtn,
                                            active
                                                ? { backgroundColor: accentColor, borderColor: accentColor }
                                                : { backgroundColor: cardBg, borderColor },
                                        ]}
                                    >
                                        <Text style={{
                                            fontSize: 13, fontWeight: "600",
                                            color: active ? "#fff" : labelColor,
                                        }}>
                                            {t}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </Field>

                    <Field label="품종" color={labelColor}>
                        <TextInput
                            style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor }]}
                            placeholder="예: 말티즈, 코리안숏헤어"
                            placeholderTextColor={COLORS.gray[400]}
                            value={breed}
                            onChangeText={setBreed}
                        />
                    </Field>

                    <Field label="털 색깔" color={labelColor}>
                        <TextInput
                            style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor }]}
                            placeholder="예: 갈색, 흰색, 검정+흰색"
                            placeholderTextColor={COLORS.gray[400]}
                            value={color}
                            onChangeText={setColor}
                        />
                    </Field>

                    <Field label={`${type === "lost" ? "분실" : "발견"}일`} required color={labelColor}>
                        <TextInput
                            style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor }]}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={COLORS.gray[400]}
                            value={date}
                            onChangeText={setDate}
                            keyboardType="numbers-and-punctuation"
                            maxLength={10}
                        />
                    </Field>

                    <Field label="지역 (시/도)" color={labelColor}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 6, paddingVertical: 4 }}
                        >
                            {REGIONS.map((r) => {
                                const active = region === r;
                                return (
                                    <TouchableOpacity
                                        key={r}
                                        onPress={() => setRegion(active ? "" : r)}
                                        style={[
                                            styles.regionChip,
                                            active
                                                ? { backgroundColor: accentColor, borderColor: accentColor }
                                                : { backgroundColor: cardBg, borderColor },
                                        ]}
                                    >
                                        <Text style={{
                                            fontSize: 12, fontWeight: "600",
                                            color: active ? "#fff" : labelColor,
                                        }}>
                                            {r}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </Field>

                    <Field label="구/군" color={labelColor}>
                        <TextInput
                            style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor }]}
                            placeholder="예: 강남구"
                            placeholderTextColor={COLORS.gray[400]}
                            value={district}
                            onChangeText={setDistrict}
                        />
                    </Field>

                    <Field label="상세 위치" color={labelColor}>
                        <TextInput
                            style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor }]}
                            placeholder="예: OO공원 근처, OO역 5번 출구"
                            placeholderTextColor={COLORS.gray[400]}
                            value={locationDetail}
                            onChangeText={setLocationDetail}
                        />
                    </Field>

                    <Field label="설명" color={labelColor}>
                        <TextInput
                            style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor, minHeight: 120, textAlignVertical: "top" }]}
                            placeholder="특징, 행동, 인상착의 등을 자세히 적어주세요"
                            placeholderTextColor={COLORS.gray[400]}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            maxLength={1000}
                        />
                    </Field>

                    <Field label="연락처" color={labelColor}>
                        <TextInput
                            style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor }]}
                            placeholder="010-XXXX-XXXX"
                            placeholderTextColor={COLORS.gray[400]}
                            value={contact}
                            onChangeText={setContact}
                            keyboardType="phone-pad"
                        />
                    </Field>

                    {type === "lost" && (
                        <Field label="사례금 (선택)" color={labelColor}>
                            <TextInput
                                style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor }]}
                                placeholder="예: 30만원"
                                placeholderTextColor={COLORS.gray[400]}
                                value={reward}
                                onChangeText={setReward}
                            />
                        </Field>
                    )}
                </ScrollView>

                {/* 제출 바 */}
                <View style={[
                    styles.submitBar,
                    {
                        borderTopColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[100],
                        backgroundColor: bgColor,
                        paddingBottom: 12 + Math.max(insets.bottom, 0),
                    },
                ]}>
                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={!canSubmit}
                        style={[
                            styles.submitBtn,
                            { backgroundColor: canSubmit ? accentColor : COLORS.gray[200] },
                        ]}
                        activeOpacity={0.85}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={{
                                fontSize: 15, fontWeight: "700",
                                color: canSubmit ? "#fff" : COLORS.gray[400],
                            }}>
                                {type === "lost" ? "분실 신고 등록" : "발견 신고 등록"}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

function FieldLabel({ children, color }: { children: React.ReactNode; color: string }) {
    return (
        <Text style={{ fontSize: 12, fontWeight: "600", color, marginTop: 12, marginBottom: 6 }}>
            {children}
        </Text>
    );
}

function Field({
    label, required, color, children,
}: {
    label: string;
    required?: boolean;
    color: string;
    children: React.ReactNode;
}) {
    return (
        <View style={{ marginBottom: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 12, marginBottom: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color }}>{label}</Text>
                {required && <Text style={{ color: "#EF4444", fontSize: 12 }}>*</Text>}
            </View>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    body: { padding: 16 },
    typeRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
    typeBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: "center",
    },
    typeBtnText: { fontSize: 14, fontWeight: "700" },
    photoPreview: { width: "100%", height: 200, borderRadius: 12, backgroundColor: "#F3F4F6" },
    photoOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.45)",
        borderRadius: 12,
        alignItems: "center", justifyContent: "center",
    },
    photoRemove: {
        position: "absolute",
        top: 8, right: 8,
        width: 26, height: 26,
        backgroundColor: "rgba(0,0,0,0.6)",
        borderRadius: 13,
        alignItems: "center", justifyContent: "center",
    },
    addPhotoBtn: {
        flexDirection: "row",
        alignItems: "center", justifyContent: "center",
        gap: 6,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderStyle: "dashed",
        marginBottom: 4,
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
    },
    chipBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 9999,
        borderWidth: 1,
        alignItems: "center",
    },
    regionChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 9999,
        borderWidth: 1,
    },
    submitBar: {
        paddingHorizontal: 16,
        paddingTop: 10,
        borderTopWidth: 1,
    },
    submitBtn: {
        height: 48,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
});
