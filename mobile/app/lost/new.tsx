/**
 * 분실/발견 동물 신고 작성 (V3 Phase 7)
 * POST /api/lost-pets
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

type LostType = "lost" | "found";

const PET_TYPES = ["강아지", "고양이", "기타"];

export default function NewLostPet() {
    const router = useRouter();
    const { session } = useAuth();

    const [type, setType] = useState<LostType>("lost");
    const [title, setTitle] = useState("");
    const [petType, setPetType] = useState("강아지");
    const [breed, setBreed] = useState("");
    const [color, setColor] = useState("");
    const [region, setRegion] = useState("");
    const [district, setDistrict] = useState("");
    const [locationDetail, setLocationDetail] = useState("");
    const [date, setDate] = useState("");
    const [description, setDescription] = useState("");
    const [contact, setContact] = useState("");
    const [reward, setReward] = useState("");
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit() {
        if (!title.trim() || !date.trim()) {
            Alert.alert("알림", "제목과 날짜는 필수입니다.");
            return;
        }
        if (!session) {
            Alert.alert("로그인 필요", "로그인이 필요합니다.");
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
                }),
            });
            if (!res.ok) {
                const err = await res.text();
                Alert.alert("등록 실패", err.slice(0, 200));
                return;
            }
            Alert.alert("등록 완료", "신고가 등록되었습니다.", [
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
                    <Text style={styles.headerTitle}>{type === "lost" ? "분실 신고" : "발견 신고"}</Text>
                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={submitting}
                        style={styles.submitBtn}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <LinearGradient colors={["#F87171", "#EF4444"]} style={styles.submitBtnGrad}>
                                <Text style={styles.submitBtnText}>등록</Text>
                            </LinearGradient>
                        )}
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
                    {/* 타입 선택 */}
                    <View style={styles.typeRow}>
                        {(["lost", "found"] as LostType[]).map((t) => (
                            <TouchableOpacity
                                key={t}
                                onPress={() => setType(t)}
                                style={[styles.typeBtn, type === t && styles.typeBtnActive]}
                            >
                                <Text style={[styles.typeBtnText, type === t && styles.typeBtnTextActive]}>
                                    {t === "lost" ? "분실" : "발견"}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Field label="제목 *">
                        <TextInput
                            style={styles.input}
                            placeholder={type === "lost" ? "예: 골든리트리버 분실 (서울 강남)" : "예: 시바견 발견 (부산 해운대)"}
                            placeholderTextColor={COLORS.gray[400]}
                            value={title}
                            onChangeText={setTitle}
                            maxLength={100}
                        />
                    </Field>

                    <Field label="동물 종류 *">
                        <View style={{ flexDirection: "row", gap: 8 }}>
                            {PET_TYPES.map((t) => (
                                <TouchableOpacity
                                    key={t}
                                    onPress={() => setPetType(t)}
                                    style={[styles.chipBtn, petType === t && styles.chipBtnActive]}
                                >
                                    <Text style={[styles.chipText, petType === t && styles.chipTextActive]}>
                                        {t}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Field>

                    <Field label="품종">
                        <TextInput
                            style={styles.input}
                            placeholder="예: 말티즈, 코리안숏헤어"
                            placeholderTextColor={COLORS.gray[400]}
                            value={breed}
                            onChangeText={setBreed}
                        />
                    </Field>

                    <Field label="털 색깔">
                        <TextInput
                            style={styles.input}
                            placeholder="예: 갈색, 흰색, 검정+흰색"
                            placeholderTextColor={COLORS.gray[400]}
                            value={color}
                            onChangeText={setColor}
                        />
                    </Field>

                    <Field label={`${type === "lost" ? "분실" : "발견"}일 *`}>
                        <TextInput
                            style={styles.input}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={COLORS.gray[400]}
                            value={date}
                            onChangeText={setDate}
                            keyboardType="numbers-and-punctuation"
                            maxLength={10}
                        />
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

                    <Field label="상세 위치">
                        <TextInput
                            style={styles.input}
                            placeholder="예: OO공원 근처, OO역 5번 출구"
                            placeholderTextColor={COLORS.gray[400]}
                            value={locationDetail}
                            onChangeText={setLocationDetail}
                        />
                    </Field>

                    <Field label="설명">
                        <TextInput
                            style={[styles.input, { minHeight: 100, textAlignVertical: "top" }]}
                            placeholder="특징, 행동, 인상착의 등을 자세히 적어주세요"
                            placeholderTextColor={COLORS.gray[400]}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            maxLength={1000}
                        />
                    </Field>

                    <Field label="연락처">
                        <TextInput
                            style={styles.input}
                            placeholder="010-XXXX-XXXX"
                            placeholderTextColor={COLORS.gray[400]}
                            value={contact}
                            onChangeText={setContact}
                            keyboardType="phone-pad"
                        />
                    </Field>

                    {type === "lost" && (
                        <Field label="사례금 (선택)">
                            <TextInput
                                style={styles.input}
                                placeholder="예: 30만원"
                                placeholderTextColor={COLORS.gray[400]}
                                value={reward}
                                onChangeText={setReward}
                            />
                        </Field>
                    )}

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
    submitBtn: { borderRadius: 10, overflow: "hidden" },
    submitBtnGrad: { paddingHorizontal: 16, paddingVertical: 8 },
    submitBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
    body: { padding: 20, paddingBottom: 40 },
    typeRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
    typeBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: COLORS.gray[100],
        alignItems: "center",
    },
    typeBtnActive: { backgroundColor: "#EF4444" },
    typeBtnText: { fontSize: 14, fontWeight: "600", color: COLORS.gray[600] },
    typeBtnTextActive: { color: "#fff" },
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
    chipBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.gray[200],
        backgroundColor: COLORS.gray[50],
        alignItems: "center",
    },
    chipBtnActive: { backgroundColor: "#EF4444", borderColor: "#EF4444" },
    chipText: { fontSize: 13, fontWeight: "500", color: COLORS.gray[600] },
    chipTextActive: { color: "#fff" },
});
