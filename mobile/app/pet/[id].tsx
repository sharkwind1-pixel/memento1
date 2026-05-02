/**
 * 펫 상세 화면 — 프로필/사진첩/추모 전환/삭제
 *
 * profile.tsx의 펫 카드, RecordPage의 펫 선택 등에서 진입.
 *
 * - 프로필 이미지 + 이름/종/품종/생일/체중/성격
 * - 추모 전환 토글 (active ↔ memorial)
 * - 사진첩 가로 스크롤 (PhotoLightbox 진입)
 * - 펫 정보 편집 (PetFormStep 마법사로 push 또는 인라인)
 * - 삭제 (이중 확인 + 모든 미디어/타임라인/대화 함께 삭제 안내)
 */

import { useState, useMemo } from "react";
import {
    View, Text, ScrollView, TouchableOpacity,
    Image, Alert, ActivityIndicator, StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { useDarkMode } from "@/contexts/ThemeContext";
import { COLORS } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { josa } from "@/lib/chat-helpers";
import AppHeader from "@/components/common/AppHeader";
import PhotoLightbox from "@/components/record/PhotoLightbox";

function formatDate(iso?: string): string {
    if (!iso) return "";
    try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso;
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
    } catch { return iso; }
}

function calculateAge(birthday?: string): string | null {
    if (!birthday) return null;
    try {
        const b = new Date(birthday);
        if (isNaN(b.getTime())) return null;
        const now = new Date();
        let years = now.getFullYear() - b.getFullYear();
        const m = now.getMonth() - b.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < b.getDate())) years--;
        if (years < 1) {
            const months = (now.getFullYear() - b.getFullYear()) * 12 + m;
            return `${Math.max(0, months)}개월`;
        }
        return `${years}살`;
    } catch { return null; }
}

export default function PetDetailScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();
    const { pets, refreshPets, setSelectedPet } = usePet();
    const { isDarkMode } = useDarkMode();
    const [busy, setBusy] = useState(false);
    const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

    const pet = useMemo(() => pets.find((p) => p.id === id) ?? null, [pets, id]);
    const isMemorial = pet?.status === "memorial";
    const accentColor = isMemorial ? COLORS.memorial[500] : COLORS.memento[500];
    const age = calculateAge(pet?.birthday);

    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.gray[50];
    const cardBg = isDarkMode ? COLORS.gray[900] : COLORS.white;
    const borderColor = isDarkMode ? COLORS.gray[800] : COLORS.gray[100];
    const textColor = isDarkMode ? COLORS.white : COLORS.gray[900];
    const labelColor = isDarkMode ? COLORS.gray[400] : COLORS.gray[500];

    if (!pet) {
        return (
            <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
                <Stack.Screen options={{ headerShown: false }} />
                <AppHeader showBack title="반려동물" hideActions />
                <View style={styles.center}>
                    <Ionicons name="paw-outline" size={48} color={COLORS.gray[300]} />
                    <Text style={[styles.errorText, { color: labelColor }]}>반려동물을 찾을 수 없어요</Text>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Text style={{ color: accentColor, fontSize: 13, fontWeight: "600" }}>뒤로</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    async function setPrimary() {
        if (!pet || !user || busy) return;
        if (pet.isPrimary) {
            Alert.alert("대표 펫", `${pet.name}${josa(pet.name, "은/는")} 이미 대표 펫이에요.`);
            return;
        }
        Alert.alert(
            "대표 펫 지정",
            `${pet.name}${josa(pet.name, "을/를")} 홈 화면 기본 펫으로 지정할까요?`,
            [
                { text: "취소", style: "cancel" },
                {
                    text: "지정",
                    onPress: async () => {
                        setBusy(true);
                        try {
                            // 다른 모든 펫의 대표 해제 → 이 펫만 대표
                            await supabase
                                .from("pets")
                                .update({ is_primary: false })
                                .eq("user_id", user.id);
                            const { error } = await supabase
                                .from("pets")
                                .update({ is_primary: true })
                                .eq("id", pet.id)
                                .eq("user_id", user.id);
                            if (error) throw new Error(error.message);
                            await refreshPets();
                        } catch (e) {
                            Alert.alert("실패", e instanceof Error ? e.message : "");
                        } finally {
                            setBusy(false);
                        }
                    },
                },
            ],
        );
    }

    async function toggleMemorial() {
        if (!pet || !user || busy) return;
        const next = isMemorial ? "active" : "memorial";
        const title = isMemorial ? "일상 모드로 되돌릴까요?" : "추모 모드로 전환할까요?";
        const message = isMemorial
            ? `${pet.name}${josa(pet.name, "을/를")} 일상 모드로 되돌립니다.`
            : `${pet.name}${josa(pet.name, "을/를")} 무지개다리 건너편으로 보내드릴게요. 추모 게시판/AI 위로 대화로 자동 전환됩니다.`;
        Alert.alert(title, message, [
            { text: "취소", style: "cancel" },
            {
                text: "전환",
                onPress: async () => {
                    setBusy(true);
                    try {
                        const update: Record<string, unknown> = { status: next };
                        if (next === "memorial") {
                            update.memorial_date = new Date().toISOString().slice(0, 10);
                        }
                        const { error } = await supabase
                            .from("pets")
                            .update(update)
                            .eq("id", pet.id)
                            .eq("user_id", user.id);
                        if (error) throw new Error(error.message);
                        await refreshPets();
                    } catch (e) {
                        Alert.alert("실패", e instanceof Error ? e.message : "");
                    } finally {
                        setBusy(false);
                    }
                },
            },
        ]);
    }

    function handleDelete() {
        if (!pet || !user || busy) return;
        Alert.alert(
            "반려동물 삭제",
            `${pet.name}의 모든 사진, 타임라인, AI 대화 기록이 함께 삭제돼요. 복구할 수 없어요.`,
            [
                { text: "취소", style: "cancel" },
                {
                    text: "삭제",
                    style: "destructive",
                    onPress: () => {
                        Alert.alert(
                            "다시 한번 확인",
                            "정말 삭제할까요?",
                            [
                                { text: "취소", style: "cancel" },
                                {
                                    text: "영구 삭제",
                                    style: "destructive",
                                    onPress: async () => {
                                        setBusy(true);
                                        try {
                                            const { error } = await supabase
                                                .from("pets")
                                                .delete()
                                                .eq("id", pet.id)
                                                .eq("user_id", user.id);
                                            if (error) throw new Error(error.message);
                                            await refreshPets();
                                            // 선택 펫이면 다른 펫으로 자동 전환은 PetContext가 처리
                                            router.back();
                                        } catch (e) {
                                            Alert.alert("삭제 실패", e instanceof Error ? e.message : "");
                                        } finally {
                                            setBusy(false);
                                        }
                                    },
                                },
                            ],
                        );
                    },
                },
            ],
        );
    }

    function handleSelect() {
        setSelectedPet(pet);
        router.back();
    }

    const photos = pet.photos ?? [];
    const photosForLightbox = photos.map((p) => ({ id: p.id, url: p.url, caption: p.caption }));

    return (
        <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
            <Stack.Screen options={{ headerShown: false }} />
            <AppHeader showBack title={pet.name} hideActions />

            <ScrollView
                style={styles.flex1}
                contentContainerStyle={{ paddingBottom: 32 + insets.bottom }}
                showsVerticalScrollIndicator={false}
            >
                {/* 프로필 헤더 */}
                <LinearGradient
                    colors={isMemorial
                        ? ["#FEF3C7", "#FDE68A"]
                        : [COLORS.memento[100], COLORS.memento[50]]}
                    style={styles.heroCard}
                >
                    {pet.profileImage ? (
                        <Image source={{ uri: pet.profileImage }} style={styles.heroAvatar} />
                    ) : (
                        <View style={[styles.heroAvatar, styles.heroAvatarFallback, { backgroundColor: accentColor + "30" }]}>
                            <Text style={{ fontSize: 56 }}>
                                {pet.type === "강아지" ? "🐶" : pet.type === "고양이" ? "🐱" : "🐾"}
                            </Text>
                        </View>
                    )}
                    <Text style={[styles.heroName, { color: COLORS.gray[900] }]}>{pet.name}</Text>
                    <View style={styles.heroMetaRow}>
                        <Text style={styles.heroMetaText}>{pet.type}</Text>
                        {pet.breed ? (
                            <>
                                <Text style={styles.heroMetaDot}>·</Text>
                                <Text style={styles.heroMetaText}>{pet.breed}</Text>
                            </>
                        ) : null}
                        {pet.gender ? (
                            <>
                                <Text style={styles.heroMetaDot}>·</Text>
                                <Text style={styles.heroMetaText}>{pet.gender}</Text>
                            </>
                        ) : null}
                    </View>
                    {isMemorial && (
                        <View style={styles.memorialBadge}>
                            <Ionicons name="rainy-outline" size={12} color="#92400E" />
                            <Text style={styles.memorialBadgeText}>무지개다리 건너간 친구</Text>
                        </View>
                    )}
                </LinearGradient>

                {/* 정보 그리드 */}
                <View style={[styles.infoCard, { backgroundColor: cardBg, borderColor }]}>
                    <InfoRow label="생일" value={formatDate(pet.birthday)} sub={age ?? undefined} textColor={textColor} labelColor={labelColor} />
                    {pet.weight && <InfoRow label="체중" value={pet.weight} textColor={textColor} labelColor={labelColor} />}
                    {pet.personality && <InfoRow label="성격" value={pet.personality} textColor={textColor} labelColor={labelColor} />}
                    {isMemorial && pet.memorialDate && (
                        <InfoRow label="이별일" value={formatDate(pet.memorialDate)} textColor={textColor} labelColor={labelColor} />
                    )}
                    {pet.adoptedDate && <InfoRow label="입양일" value={formatDate(pet.adoptedDate)} textColor={textColor} labelColor={labelColor} />}
                    {pet.howWeMet && <InfoRow label="만남" value={pet.howWeMet} textColor={textColor} labelColor={labelColor} />}
                    {pet.favoriteFood && <InfoRow label="좋아하는 음식" value={pet.favoriteFood} textColor={textColor} labelColor={labelColor} />}
                    {pet.favoriteActivity && <InfoRow label="좋아하는 활동" value={pet.favoriteActivity} textColor={textColor} labelColor={labelColor} />}
                    {pet.favoritePlace && <InfoRow label="좋아하는 장소" value={pet.favoritePlace} textColor={textColor} labelColor={labelColor} />}
                </View>

                {/* 액션 버튼 */}
                <View style={styles.actionRow}>
                    <TouchableOpacity onPress={handleSelect} style={[styles.actionBtn, { backgroundColor: accentColor }]} activeOpacity={0.85}>
                        <Ionicons name="checkmark-circle" size={16} color="#fff" />
                        <Text style={styles.actionBtnText}>이 친구로 활동하기</Text>
                    </TouchableOpacity>
                </View>

                {/* 사진첩 */}
                {photos.length > 0 && (
                    <View style={styles.photoSection}>
                        <Text style={[styles.sectionTitle, { color: labelColor }]}>사진 ({photos.length})</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}
                        >
                            {photos.slice(0, 20).map((p, i) => (
                                <TouchableOpacity
                                    key={p.id}
                                    onPress={() => setLightboxIdx(i)}
                                    activeOpacity={0.85}
                                >
                                    <Image source={{ uri: p.url }} style={styles.photoThumb} />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* 대표 / 추모 전환 / 삭제 */}
                <View style={[styles.dangerCard, { backgroundColor: cardBg, borderColor }]}>
                    {!pet.isPrimary && (
                        <>
                            <TouchableOpacity onPress={setPrimary} disabled={busy} style={styles.dangerRow} activeOpacity={0.7}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                                    <Ionicons name="star-outline" size={20} color={COLORS.memorial[500]} />
                                    <Text style={[styles.dangerText, { color: textColor }]}>
                                        대표 펫으로 지정
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={COLORS.gray[400]} />
                            </TouchableOpacity>
                            <View style={[styles.divider, { backgroundColor: borderColor }]} />
                        </>
                    )}
                    {pet.isPrimary && (
                        <>
                            <View style={styles.dangerRow}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                                    <Ionicons name="star" size={20} color={COLORS.memorial[500]} />
                                    <Text style={[styles.dangerText, { color: textColor }]}>
                                        대표 펫
                                    </Text>
                                </View>
                                <Text style={{ fontSize: 12, color: COLORS.gray[400] }}>홈 기본 표시</Text>
                            </View>
                            <View style={[styles.divider, { backgroundColor: borderColor }]} />
                        </>
                    )}
                    <TouchableOpacity onPress={toggleMemorial} disabled={busy} style={styles.dangerRow} activeOpacity={0.7}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                            <Ionicons
                                name={isMemorial ? "sunny-outline" : "rainy-outline"}
                                size={20}
                                color={isMemorial ? COLORS.memento[500] : "#B45309"}
                            />
                            <Text style={[styles.dangerText, { color: textColor }]}>
                                {isMemorial ? "일상 모드로 되돌리기" : "추모 모드로 전환"}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={COLORS.gray[400]} />
                    </TouchableOpacity>

                    <View style={[styles.divider, { backgroundColor: borderColor }]} />

                    <TouchableOpacity onPress={handleDelete} disabled={busy} style={styles.dangerRow} activeOpacity={0.7}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                            <Ionicons name="trash-outline" size={20} color="#EF4444" />
                            <Text style={[styles.dangerText, { color: "#EF4444" }]}>
                                반려동물 삭제
                            </Text>
                        </View>
                        {busy ? (
                            <ActivityIndicator size="small" color={COLORS.gray[400]} />
                        ) : (
                            <Ionicons name="chevron-forward" size={16} color={COLORS.gray[400]} />
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <PhotoLightbox
                visible={lightboxIdx !== null}
                photos={photosForLightbox}
                initialIndex={lightboxIdx ?? 0}
                onClose={() => setLightboxIdx(null)}
            />
        </SafeAreaView>
    );
}

function InfoRow({
    label, value, sub, textColor, labelColor,
}: { label: string; value: string; sub?: string; textColor: string; labelColor: string }) {
    if (!value) return null;
    return (
        <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: labelColor }]}>{label}</Text>
            <Text style={[styles.infoValue, { color: textColor }]}>
                {value}
                {sub ? <Text style={{ color: labelColor, fontWeight: "500" }}>  ({sub})</Text> : null}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 24 },
    errorText: { fontSize: 14, marginTop: 8, textAlign: "center" },
    backBtn: { marginTop: 16, paddingHorizontal: 16, paddingVertical: 8 },

    heroCard: {
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 24,
        padding: 24,
        alignItems: "center",
        gap: 12,
    },
    heroAvatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: "#fff" },
    heroAvatarFallback: { alignItems: "center", justifyContent: "center" },
    heroName: { fontSize: 24, fontWeight: "800" },
    heroMetaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    heroMetaText: { fontSize: 13, color: COLORS.gray[700], fontWeight: "600" },
    heroMetaDot: { color: COLORS.gray[400], fontSize: 12 },
    memorialBadge: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 12, paddingVertical: 4,
        backgroundColor: "rgba(255,255,255,0.7)",
        borderRadius: 9999,
        marginTop: 4,
    },
    memorialBadgeText: { fontSize: 11, fontWeight: "700", color: "#92400E" },

    infoCard: {
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 8,
        gap: 12,
    },
    infoLabel: { fontSize: 13, fontWeight: "600" },
    infoValue: { fontSize: 13, fontWeight: "600", flex: 1, textAlign: "right" },

    actionRow: {
        flexDirection: "row",
        gap: 10,
        marginHorizontal: 16,
        marginTop: 16,
    },
    actionBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 14,
        borderRadius: 12,
    },
    actionBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

    photoSection: { marginTop: 24 },
    sectionTitle: {
        fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5,
        marginBottom: 8, paddingHorizontal: 20,
    },
    photoThumb: { width: 100, height: 100, borderRadius: 12 },

    dangerCard: {
        marginHorizontal: 16,
        marginTop: 24,
        borderRadius: 16,
        borderWidth: 1,
        overflow: "hidden",
    },
    dangerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    dangerText: { fontSize: 14, fontWeight: "600" },
    divider: { height: 1 },
});
