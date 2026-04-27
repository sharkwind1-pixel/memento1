/**
 * 지역 정보 게시글 작성 (V3 Phase 7)
 * POST /api/local-posts
 */

import { useState } from "react";
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    Alert, ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { API_BASE_URL } from "@/config/constants";
import { useAuth } from "@/contexts/AuthContext";
import { COLORS } from "@/lib/theme";

const CATEGORIES = [
    { id: "hospital", label: "동물병원", icon: "medkit-outline" as const },
    { id: "walk", label: "산책길", icon: "walk-outline" as const },
    { id: "share", label: "나눔", icon: "gift-outline" as const },
    { id: "trade", label: "거래", icon: "swap-horizontal-outline" as const },
    { id: "meet", label: "모임", icon: "people-outline" as const },
    { id: "place", label: "장소", icon: "location-outline" as const },
];

const BADGES = ["질문", "모집중", "나눔", "판매", "후기", "정보", "기타"];

export default function NewLocalPost() {
    const router = useRouter();
    const { session } = useAuth();

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [category, setCategory] = useState("hospital");
    const [region, setRegion] = useState("");
    const [district, setDistrict] = useState("");
    const [badge, setBadge] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit() {
        if (!title.trim()) {
            Alert.alert("알림", "제목은 필수입니다.");
            return;
        }
        if (!session) {
            Alert.alert("로그인 필요", "로그인이 필요합니다.");
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
                }),
            });
            if (!res.ok) {
                const err = await res.text();
                Alert.alert("등록 실패", err.slice(0, 200));
                return;
            }
            Alert.alert("등록 완료", "게시글이 등록되었습니다.", [
                { text: "확인", onPress: () => router.back() },
            ]);
        } catch (e) {
            Alert.alert("오류", (e as Error).message || "등록 중 문제가 발생했습니다.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <SafeAreaView style={styles.flex1} edges={["top"]}>
            <KeyboardAvoidingView
                style={styles.flex1}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <View style={styles.headerBar}>
                    <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.gray[800]} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>지역정보 작성</Text>
                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color={COLORS.gray[600]} />
                        ) : (
                            <LinearGradient colors={["#A78BFA", "#8B5CF6"]} style={styles.submitBtnGrad}>
                                <Text style={styles.submitBtnText}>등록</Text>
                            </LinearGradient>
                        )}
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
                    <Field label="카테고리 *">
                        <View style={styles.catGrid}>
                            {CATEGORIES.map((c) => {
                                const active = category === c.id;
                                return (
                                    <TouchableOpacity
                                        key={c.id}
                                        onPress={() => setCategory(c.id)}
                                        style={[styles.catBtn, active && styles.catBtnActive]}
                                    >
                                        <Ionicons name={c.icon} size={18} color={active ? "#fff" : COLORS.gray[600]} />
                                        <Text style={[styles.catText, active && styles.catTextActive]}>
                                            {c.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </Field>

                    <Field label="제목 *">
                        <TextInput
                            style={styles.input}
                            placeholder="제목을 입력하세요"
                            placeholderTextColor={COLORS.gray[400]}
                            value={title}
                            onChangeText={setTitle}
                            maxLength={200}
                        />
                    </Field>

                    <Field label="말머리 (선택)">
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                            {BADGES.map((b) => {
                                const active = badge === b;
                                return (
                                    <TouchableOpacity
                                        key={b}
                                        onPress={() => setBadge(active ? null : b)}
                                        style={[styles.badgeBtn, active && styles.badgeBtnActive]}
                                    >
                                        <Text style={[styles.badgeText, active && styles.badgeTextActive]}>
                                            {b}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </Field>

                    <Field label="지역 (시/도)">
                        <TextInput
                            style={styles.input}
                            placeholder="예: 서울특별시"
                            placeholderTextColor={COLORS.gray[400]}
                            value={region}
                            onChangeText={setRegion}
                        />
                    </Field>

                    <Field label="구/군">
                        <TextInput
                            style={styles.input}
                            placeholder="예: 강남구"
                            placeholderTextColor={COLORS.gray[400]}
                            value={district}
                            onChangeText={setDistrict}
                        />
                    </Field>

                    <Field label="내용">
                        <TextInput
                            style={[styles.input, { minHeight: 200, textAlignVertical: "top" }]}
                            placeholder="자세한 내용을 적어주세요"
                            placeholderTextColor={COLORS.gray[400]}
                            value={content}
                            onChangeText={setContent}
                            multiline
                            maxLength={5000}
                        />
                    </Field>

                    <View style={{ height: 24 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <View style={{ marginBottom: 16 }}>
            <Text style={styles.label}>{label}</Text>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1, backgroundColor: COLORS.white },
    headerBar: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.gray[100],
    },
    headerTitle: { flex: 1, fontSize: 17, fontWeight: "700", color: COLORS.gray[900] },
    submitBtnGrad: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
    submitBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
    body: { padding: 20, paddingBottom: 40 },
    label: { fontSize: 13, fontWeight: "500", color: COLORS.gray[700], marginBottom: 6 },
    input: {
        borderWidth: 1,
        borderColor: COLORS.gray[200],
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        color: COLORS.gray[900],
        backgroundColor: COLORS.gray[50],
    },
    catGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    catBtn: {
        width: "31%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.gray[200],
        backgroundColor: COLORS.gray[50],
    },
    catBtnActive: { backgroundColor: "#8B5CF6", borderColor: "#8B5CF6" },
    catText: { fontSize: 12, fontWeight: "500", color: COLORS.gray[700] },
    catTextActive: { color: "#fff" },
    badgeBtn: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 9999,
        borderWidth: 1,
        borderColor: COLORS.gray[200],
    },
    badgeBtnActive: { backgroundColor: "#8B5CF6", borderColor: "#8B5CF6" },
    badgeText: { fontSize: 12, fontWeight: "500", color: COLORS.gray[600] },
    badgeTextActive: { color: "#fff" },
});
