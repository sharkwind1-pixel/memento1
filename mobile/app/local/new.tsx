/**
 * 지역 정보 게시글 작성 — 웹 src/app/api/local-posts POST 1:1 이식.
 *
 * 보강:
 *  - 이미지 업로드 (Supabase Storage prefix=local-posts) → JSON에 imageUrl + imageStoragePath
 *  - 지역(시/도) 자유텍스트 → 17개 chip + 텍스트 보조
 *  - 다크모드 대응
 *  - AppHeader 통일
 *  - 보라 톤 (지역정보 카테고리 컬러)
 */

import { useState } from "react";
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
import { uploadLocalPostImage } from "@/lib/community-upload";
import AppHeader from "@/components/common/AppHeader";

const CATEGORIES = [
    { id: "hospital", label: "동물병원", icon: "medkit-outline" as const },
    { id: "walk",     label: "산책길",   icon: "walk-outline" as const },
    { id: "share",    label: "나눔",     icon: "gift-outline" as const },
    { id: "trade",    label: "거래",     icon: "swap-horizontal-outline" as const },
    { id: "meet",     label: "모임",     icon: "people-outline" as const },
    { id: "place",    label: "장소",     icon: "location-outline" as const },
];

const BADGES = ["질문", "모집중", "나눔", "판매", "후기", "정보", "기타"];

const REGIONS = [
    "서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산", "세종",
    "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
];

export default function NewLocalPost() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { session, user } = useAuth();
    const { isDarkMode } = useDarkMode();

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [category, setCategory] = useState("hospital");
    const [region, setRegion] = useState("");
    const [district, setDistrict] = useState("");
    const [badge, setBadge] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [imageUri, setImageUri] = useState<string | null>(null);
    const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
    const [uploadedPath, setUploadedPath] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const accentColor = "#8B5CF6";

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
        });
        if (result.canceled || !result.assets[0]) return;

        const asset = result.assets[0];
        setImageUri(asset.uri);
        setUploadedUrl(null);
        setUploadedPath(null);
        setUploading(true);

        const upload = await uploadLocalPostImage(asset.uri, user.id, { mimeType: asset.mimeType });
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
        if (!title.trim()) {
            Alert.alert("입력 필요", "제목은 필수입니다.");
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
            const res = await fetch(`${API_BASE_URL}/api/local-posts`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    title: title.trim(),
                    content: content.trim() || null,
                    category,
                    region: region.trim() || null,
                    district: district.trim() || null,
                    badge: badge || null,
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
            Alert.alert("등록 완료", "게시글이 등록되었어요.", [
                { text: "확인", onPress: () => router.back() },
            ]);
        } catch (e) {
            Alert.alert("오류", e instanceof Error ? e.message : "등록 중 문제가 발생했습니다.");
        } finally {
            setSubmitting(false);
        }
    }

    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.white;
    const cardBg = isDarkMode ? COLORS.gray[900] : COLORS.gray[50];
    const borderColor = isDarkMode ? COLORS.gray[700] : COLORS.gray[200];
    const textColor = isDarkMode ? COLORS.white : COLORS.gray[900];
    const labelColor = isDarkMode ? COLORS.gray[400] : COLORS.gray[600];

    const canSubmit = !!title.trim() && !submitting && !uploading;

    return (
        <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
            <Stack.Screen options={{ headerShown: false }} />
            <AppHeader showBack title="지역정보 작성" hideActions />
            <KeyboardAvoidingView
                style={styles.flex1}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <ScrollView
                    contentContainerStyle={[styles.body, { paddingBottom: 96 + insets.bottom }]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <Field label="카테고리" required color={labelColor}>
                        <View style={styles.catGrid}>
                            {CATEGORIES.map((c) => {
                                const active = category === c.id;
                                return (
                                    <TouchableOpacity
                                        key={c.id}
                                        onPress={() => setCategory(c.id)}
                                        style={[
                                            styles.catBtn,
                                            active
                                                ? { backgroundColor: accentColor, borderColor: accentColor }
                                                : { backgroundColor: cardBg, borderColor },
                                        ]}
                                        activeOpacity={0.85}
                                    >
                                        <Ionicons name={c.icon} size={18} color={active ? "#fff" : labelColor} />
                                        <Text style={{
                                            fontSize: 12, fontWeight: "600",
                                            color: active ? "#fff" : labelColor,
                                        }}>
                                            {c.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </Field>

                    <Field label="대표 사진" color={labelColor}>
                        {imageUri ? (
                            <View style={{ position: "relative", marginTop: 4 }}>
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
                    </Field>

                    <Field label="제목" required color={labelColor}>
                        <TextInput
                            style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor }]}
                            placeholder="제목을 입력해주세요"
                            placeholderTextColor={COLORS.gray[400]}
                            value={title}
                            onChangeText={setTitle}
                            maxLength={200}
                        />
                    </Field>

                    <Field label="말머리 (선택)" color={labelColor}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                            {BADGES.map((b) => {
                                const active = badge === b;
                                return (
                                    <TouchableOpacity
                                        key={b}
                                        onPress={() => setBadge(active ? null : b)}
                                        style={[
                                            styles.badgeBtn,
                                            active
                                                ? { backgroundColor: accentColor, borderColor: accentColor }
                                                : { backgroundColor: cardBg, borderColor },
                                        ]}
                                    >
                                        <Text style={{
                                            fontSize: 12, fontWeight: "600",
                                            color: active ? "#fff" : labelColor,
                                        }}>
                                            {b}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
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

                    <Field label="내용" color={labelColor}>
                        <TextInput
                            style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor, minHeight: 200, textAlignVertical: "top" }]}
                            placeholder="자세한 내용을 적어주세요"
                            placeholderTextColor={COLORS.gray[400]}
                            value={content}
                            onChangeText={setContent}
                            multiline
                            maxLength={5000}
                        />
                    </Field>
                </ScrollView>

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
                                지역정보 등록
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
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
    catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    catBtn: {
        width: "31%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
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
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
    },
    badgeBtn: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 9999,
        borderWidth: 1,
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
