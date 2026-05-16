/**
 * OnboardingModal — 모바일 (웹 src/components/features/onboarding/OnboardingModal.tsx 이식)
 *
 * 신규 로그인 시 첫 진입에서 노출.
 *  - 회원 유형 선택 (planning/current/memorial)
 *  - 반려동물 종류 (dog/cat/other)
 *  - 유형별 추가 질문
 *
 * DB 저장은 웹과 동일한 profiles.user_type / onboarding_data / onboarding_completed_at.
 * AsyncStorage로 캐시 (웹 localStorage 대응).
 */

import { useState, useEffect } from "react";
import {
    Modal, View, Text, TextInput, TouchableOpacity, ScrollView,
    StyleSheet, ActivityIndicator, Pressable,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS } from "@/lib/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useDarkMode } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";

const ONBOARDING_KEY = "memento-ani-onboarding-complete";

export type UserType = "planning" | "current" | "memorial";
type PetType = "dog" | "cat" | "other";

interface OnboardingData {
    userType: UserType | null;
    petType: PetType | null;
    adoptionTiming?: "undecided" | "1month" | "3months" | "6months" | null;
    previousExperience?: "first" | "experienced" | null;
    adoptionRoute?: "breeder" | "friend" | "shelter" | "undecided" | null;
    petName?: string;
    togetherPeriod?: "under1" | "1to5" | "5to10" | "over10" | null;
    passedPeriod?: "under1month" | "1to6months" | "6to12months" | "over1year" | null;
}

export async function hasCompletedOnboardingAsync(): Promise<boolean> {
    try {
        const v = await AsyncStorage.getItem(ONBOARDING_KEY);
        return v === "true";
    } catch {
        return false;
    }
}

export async function checkOnboardingFromDB(userId: string): Promise<boolean> {
    try {
        const { data } = await supabase
            .from("profiles")
            .select("onboarding_completed_at")
            .eq("id", userId)
            .single();
        if (data?.onboarding_completed_at) {
            await AsyncStorage.setItem(ONBOARDING_KEY, "true");
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

interface Props {
    visible: boolean;
    onClose: () => void;
    onComplete: (userType: UserType) => void;
}

export default function OnboardingModal({ visible, onClose, onComplete }: Props) {
    const insets = useSafeAreaInsets();
    const { user, refreshProfile } = useAuth();
    const { isDarkMode } = useDarkMode();

    const [step, setStep] = useState(0);
    const [data, setData] = useState<OnboardingData>({
        userType: null,
        petType: null,
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (visible) {
            setStep(0);
            setData({ userType: null, petType: null });
        }
    }, [visible]);

    async function saveAndComplete() {
        if (!user) return;
        setSaving(true);
        try {
            await supabase
                .from("profiles")
                .update({
                    user_type: data.userType,
                    onboarding_data: data,
                    onboarding_completed_at: new Date().toISOString(),
                })
                .eq("id", user.id);
            await AsyncStorage.setItem(ONBOARDING_KEY, "true");
            await refreshProfile();
            onClose();
            if (data.userType) onComplete(data.userType);
        } catch (e) {
            console.error("[Onboarding] save failed:", e);
            onClose();
        } finally {
            setSaving(false);
        }
    }

    async function handleSkip() {
        if (user) {
            await supabase
                .from("profiles")
                .update({
                    onboarding_completed_at: new Date().toISOString(),
                    user_type: data.userType ?? "current",
                })
                .eq("id", user.id);
        }
        await AsyncStorage.setItem(ONBOARDING_KEY, "true");
        onClose();
    }

    function getNextStep(): number {
        if (step === 0) return 1;
        if (step === 1) return 2;
        if (data.userType === "planning") {
            if (step === 2) return 3;
            if (step === 3) return 4;
            if (step === 4) return 5;
            if (step === 5) return 100;
        }
        if (data.userType === "current") {
            if (step === 2) return 100;
        }
        if (data.userType === "memorial") {
            if (step === 2) return 6;
            if (step === 6) return 7;
            if (step === 7) return 8;
            if (step === 8) return 100;
        }
        return 100;
    }

    function getPrevStep(): number {
        if (step === 1) return 0;
        if (step === 2) return 1;
        if (step === 3) return 2;
        if (step === 4) return 3;
        if (step === 5) return 4;
        if (step === 6) return 2;
        if (step === 7) return 6;
        if (step === 8) return 7;
        return 0;
    }

    function canProceed(): boolean {
        if (step === 0) return true;
        if (step === 1) return data.userType !== null;
        if (step === 2) return data.petType !== null;
        if (step === 3) return !!data.adoptionTiming;
        if (step === 4) return !!data.previousExperience;
        if (step === 5) return !!data.adoptionRoute;
        if (step === 6) return !!(data.petName && data.petName.trim().length > 0);
        if (step === 7) return !!data.togetherPeriod;
        if (step === 8) return !!data.passedPeriod;
        return false;
    }

    function handleNext() {
        const next = getNextStep();
        if (next === 100) {
            saveAndComplete();
        } else {
            setStep(next);
        }
    }

    function handleBack() {
        setStep(getPrevStep());
    }

    function getProgress(): number {
        const stepsByType: Record<string, number[]> = {
            planning: [0, 1, 2, 3, 4, 5],
            current: [0, 1, 2],
            memorial: [0, 1, 2, 6, 7, 8],
        };
        const steps = data.userType ? stepsByType[data.userType] : [0, 1, 2];
        const idx = steps.indexOf(step);
        return ((Math.max(idx, 0) + 1) / steps.length) * 100;
    }

    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.white;
    const textColor = isDarkMode ? COLORS.white : COLORS.gray[900];
    const borderColor = isDarkMode ? COLORS.gray[700] : COLORS.gray[200];
    const subColor = COLORS.gray[500];

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            statusBarTranslucent
            onRequestClose={handleSkip}
        >
            <View style={styles.overlay}>
                <Pressable style={StyleSheet.absoluteFill} onPress={handleSkip} />
                <SafeAreaView edges={["top"]} style={[styles.sheet, { backgroundColor: bgColor }]}>
                    {/* 헤더 */}
                    <View style={[styles.header, { borderBottomColor: borderColor }]}>
                        <View style={styles.headerLeft}>
                            <Ionicons name="paw" size={20} color={COLORS.memento[500]} />
                            <Text style={[styles.headerTitle, { color: textColor }]}>메멘토애니</Text>
                        </View>
                        <TouchableOpacity onPress={handleSkip} hitSlop={12} style={styles.closeBtn}>
                            <Ionicons name="close" size={22} color={subColor} />
                        </TouchableOpacity>
                    </View>

                    {/* 진행 바 */}
                    <View style={[styles.progressTrack, { backgroundColor: borderColor }]}>
                        <View style={[styles.progressFill, { width: `${getProgress()}%` }]} />
                    </View>

                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 32 }}
                    >
                        {/* Step 0: 환영 */}
                        {step === 0 && (
                            <View style={styles.center}>
                                <View style={[styles.heroCircle, { backgroundColor: COLORS.memento[500] }]}>
                                    <Ionicons name="paw" size={40} color="#fff" />
                                </View>
                                <Text style={[styles.h2, { color: textColor }]}>환영해요!</Text>
                                <Text style={[styles.body, { color: subColor }]}>
                                    메멘토애니는 반려동물과의 모든 하루를 함께 담는 곳이에요.{"\n"}
                                    오늘의 평범한 순간부터 먼 훗날의 약속까지, 평생의 이야기를 함께해요.{"\n\n"}
                                    몇 가지만 알려주시면 딱 맞게 준비해드릴게요.
                                </Text>
                            </View>
                        )}

                        {/* Step 1: 회원 유형 */}
                        {step === 1 && (
                            <View>
                                <Text style={[styles.h2, { color: textColor }]}>어떤 상황이신가요?</Text>
                                <Text style={[styles.bodyLeft, { color: subColor }]}>맞춤 서비스를 위해 알려주세요</Text>

                                {[
                                    { value: "planning" as UserType, label: "반려동물을 맞이할 예정이에요", sub: "입양/분양을 준비 중이에요", color: COLORS.memento[500], icon: "heart-outline" as const },
                                    { value: "current" as UserType, label: "반려동물과 함께 살고 있어요", sub: "현재 반려동물이 있어요", color: "#10B981", icon: "paw-outline" as const },
                                    { value: "memorial" as UserType, label: "소중한 아이를 떠나보냈어요", sub: "추억을 간직하고 싶어요", color: COLORS.memorial[500], icon: "sparkles-outline" as const },
                                ].map((opt) => {
                                    const selected = data.userType === opt.value;
                                    return (
                                        <TouchableOpacity
                                            key={opt.value}
                                            onPress={() => setData({ ...data, userType: opt.value })}
                                            style={[
                                                styles.optionCard,
                                                { borderColor: selected ? opt.color : borderColor },
                                                selected && { backgroundColor: opt.color + "15" },
                                            ]}
                                            activeOpacity={0.85}
                                        >
                                            <View style={[styles.optionIcon, { backgroundColor: selected ? opt.color : COLORS.gray[100] }]}>
                                                <Ionicons name={opt.icon} size={20} color={selected ? "#fff" : COLORS.gray[400]} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.optionLabel, { color: textColor }]}>{opt.label}</Text>
                                                <Text style={[styles.optionSub, { color: subColor }]}>{opt.sub}</Text>
                                            </View>
                                            {selected && <Ionicons name="checkmark-circle" size={20} color={opt.color} />}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}

                        {/* Step 2: 종류 */}
                        {step === 2 && (
                            <View>
                                <Text style={[styles.h2, { color: textColor }]}>
                                    {data.userType === "planning" && "어떤 아이를 생각하고 있나요?"}
                                    {data.userType === "current" && "어떤 아이와 함께하고 있나요?"}
                                    {data.userType === "memorial" && "어떤 아이였나요?"}
                                </Text>
                                <Text style={[styles.bodyLeft, { color: subColor }]}>반려동물 종류를 선택해주세요</Text>
                                <View style={styles.gridRow}>
                                    {[
                                        { value: "dog" as PetType, label: "강아지", emoji: "🐶", color: COLORS.memento[500] },
                                        { value: "cat" as PetType, label: "고양이", emoji: "🐱", color: "#8B5CF6" },
                                        { value: "other" as PetType, label: "기타", emoji: "🐾", color: COLORS.memorial[500] },
                                    ].map((opt) => {
                                        const selected = data.petType === opt.value;
                                        return (
                                            <TouchableOpacity
                                                key={opt.value}
                                                onPress={() => setData({ ...data, petType: opt.value })}
                                                style={[
                                                    styles.gridCard,
                                                    { borderColor: selected ? opt.color : borderColor },
                                                    selected && { backgroundColor: opt.color + "15" },
                                                ]}
                                                activeOpacity={0.85}
                                            >
                                                <Text style={{ fontSize: 32 }}>{opt.emoji}</Text>
                                                <Text style={[styles.gridLabel, { color: selected ? opt.color : textColor }]}>
                                                    {opt.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {/* Step 3: 입양 시기 */}
                        {step === 3 && data.userType === "planning" && (
                            <SimpleListChoice
                                title="언제쯤 맞이할 예정인가요?"
                                subtitle="예상 시기를 알려주세요"
                                options={[
                                    { value: "undecided", label: "아직 정하지 못했어요" },
                                    { value: "1month", label: "1개월 내" },
                                    { value: "3months", label: "3개월 내" },
                                    { value: "6months", label: "6개월 내" },
                                ]}
                                selected={data.adoptionTiming ?? null}
                                onSelect={(v) => setData({ ...data, adoptionTiming: v as OnboardingData["adoptionTiming"] })}
                                color={COLORS.memento[500]}
                                textColor={textColor}
                                borderColor={borderColor}
                                subColor={subColor}
                            />
                        )}

                        {/* Step 4: 경험 */}
                        {step === 4 && data.userType === "planning" && (
                            <View>
                                <Text style={[styles.h2, { color: textColor }]}>반려동물 경험이 있으신가요?</Text>
                                <Text style={[styles.bodyLeft, { color: subColor }]}>이전 경험을 알려주세요</Text>
                                <View style={styles.gridRow}>
                                    {[
                                        { value: "first" as const, label: "처음이에요", emoji: "✨", color: COLORS.memento[500] },
                                        { value: "experienced" as const, label: "키워본 적 있어요", emoji: "❤️", color: "#10B981" },
                                    ].map((opt) => {
                                        const selected = data.previousExperience === opt.value;
                                        return (
                                            <TouchableOpacity
                                                key={opt.value}
                                                onPress={() => setData({ ...data, previousExperience: opt.value })}
                                                style={[
                                                    styles.gridCardWide,
                                                    { borderColor: selected ? opt.color : borderColor },
                                                    selected && { backgroundColor: opt.color + "15" },
                                                ]}
                                                activeOpacity={0.85}
                                            >
                                                <Text style={{ fontSize: 32 }}>{opt.emoji}</Text>
                                                <Text style={[styles.gridLabel, { color: selected ? opt.color : textColor }]}>
                                                    {opt.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {/* Step 5: 입양 경로 */}
                        {step === 5 && data.userType === "planning" && (
                            <SimpleListChoice
                                title="어떻게 맞이할 예정인가요?"
                                subtitle="입양 경로를 선택해주세요"
                                options={[
                                    { value: "breeder", label: "브리더/펫샵" },
                                    { value: "friend", label: "지인 분양" },
                                    { value: "shelter", label: "유기동물 보호소" },
                                    { value: "undecided", label: "아직 정하지 못했어요" },
                                ]}
                                selected={data.adoptionRoute ?? null}
                                onSelect={(v) => setData({ ...data, adoptionRoute: v as OnboardingData["adoptionRoute"] })}
                                color={COLORS.memento[500]}
                                textColor={textColor}
                                borderColor={borderColor}
                                subColor={subColor}
                            />
                        )}

                        {/* Step 6: 이름 */}
                        {step === 6 && data.userType === "memorial" && (
                            <View>
                                <Text style={[styles.h2, { color: textColor }]}>아이의 이름을 알려주세요</Text>
                                <Text style={[styles.bodyLeft, { color: subColor }]}>소중한 아이의 이름이 뭐였나요?</Text>
                                <TextInput
                                    value={data.petName ?? ""}
                                    onChangeText={(t) => setData({ ...data, petName: t })}
                                    placeholder="이름을 입력해주세요"
                                    placeholderTextColor={COLORS.gray[400]}
                                    style={[styles.nameInput, { borderColor, color: textColor }]}
                                    autoFocus
                                />
                            </View>
                        )}

                        {/* Step 7: 함께한 기간 */}
                        {step === 7 && data.userType === "memorial" && (
                            <View>
                                <Text style={[styles.h2, { color: textColor }]}>
                                    {data.petName}와(과) 얼마나 함께했나요?
                                </Text>
                                <Text style={[styles.bodyLeft, { color: subColor }]}>함께한 시간을 알려주세요</Text>
                                <View style={styles.grid2x2}>
                                    {[
                                        { value: "under1" as const, label: "1년 미만" },
                                        { value: "1to5" as const, label: "1-5년" },
                                        { value: "5to10" as const, label: "5-10년" },
                                        { value: "over10" as const, label: "10년 이상" },
                                    ].map((opt) => {
                                        const selected = data.togetherPeriod === opt.value;
                                        return (
                                            <TouchableOpacity
                                                key={opt.value}
                                                onPress={() => setData({ ...data, togetherPeriod: opt.value })}
                                                style={[
                                                    styles.grid2x2Card,
                                                    { borderColor: selected ? COLORS.memorial[500] : borderColor },
                                                    selected && { backgroundColor: COLORS.memorial[500] + "15" },
                                                ]}
                                                activeOpacity={0.85}
                                            >
                                                <Text style={[styles.gridLabel, { color: selected ? COLORS.memorial[600] : textColor }]}>
                                                    {opt.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {/* Step 8: 떠난 기간 */}
                        {step === 8 && data.userType === "memorial" && (
                            <View>
                                <Text style={[styles.h2, { color: textColor }]}>
                                    {data.petName}가(이) 무지개다리를 건넌 지 얼마나 됐나요?
                                </Text>
                                <Text style={[styles.bodyLeft, { color: subColor }]}>편하게 알려주세요</Text>
                                <View style={styles.grid2x2}>
                                    {[
                                        { value: "under1month" as const, label: "1개월 미만" },
                                        { value: "1to6months" as const, label: "1-6개월" },
                                        { value: "6to12months" as const, label: "6개월-1년" },
                                        { value: "over1year" as const, label: "1년 이상" },
                                    ].map((opt) => {
                                        const selected = data.passedPeriod === opt.value;
                                        return (
                                            <TouchableOpacity
                                                key={opt.value}
                                                onPress={() => setData({ ...data, passedPeriod: opt.value })}
                                                style={[
                                                    styles.grid2x2Card,
                                                    { borderColor: selected ? COLORS.memorial[500] : borderColor },
                                                    selected && { backgroundColor: COLORS.memorial[500] + "15" },
                                                ]}
                                                activeOpacity={0.85}
                                            >
                                                <Text style={[styles.gridLabel, { color: selected ? COLORS.memorial[600] : textColor }]}>
                                                    {opt.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}
                    </ScrollView>

                    {/* 버튼 */}
                    <View style={[styles.footer, { borderTopColor: borderColor, paddingBottom: insets.bottom + 12 }]}>
                        <View style={styles.footerRow}>
                            {step > 0 && (
                                <TouchableOpacity
                                    onPress={handleBack}
                                    style={[styles.btn, styles.btnGhost, { borderColor }]}
                                    activeOpacity={0.85}
                                >
                                    <Ionicons name="chevron-back" size={16} color={subColor} />
                                    <Text style={[styles.btnGhostText, { color: subColor }]}>이전</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                onPress={handleNext}
                                disabled={!canProceed() || saving}
                                style={[
                                    styles.btn,
                                    styles.btnPrimary,
                                    { backgroundColor: data.userType === "memorial" ? COLORS.memorial[500] : COLORS.memento[500] },
                                    (!canProceed() || saving) && { opacity: 0.4 },
                                ]}
                                activeOpacity={0.9}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : getNextStep() === 100 ? (
                                    <>
                                        <Ionicons name="sparkles" size={16} color="#fff" />
                                        <Text style={styles.btnPrimaryText}>시작하기</Text>
                                    </>
                                ) : (
                                    <>
                                        <Text style={styles.btnPrimaryText}>다음</Text>
                                        <Ionicons name="chevron-forward" size={16} color="#fff" />
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                        {step === 0 && (
                            <TouchableOpacity onPress={handleSkip} hitSlop={6}>
                                <Text style={[styles.skipText, { color: subColor }]}>나중에 하기</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </SafeAreaView>
            </View>
        </Modal>
    );
}

// 단순 라디오 리스트 (재사용)
function SimpleListChoice({
    title, subtitle, options, selected, onSelect, color, textColor, borderColor, subColor,
}: {
    title: string;
    subtitle: string;
    options: Array<{ value: string; label: string }>;
    selected: string | null;
    onSelect: (value: string) => void;
    color: string;
    textColor: string;
    borderColor: string;
    subColor: string;
}) {
    return (
        <View>
            <Text style={[styles.h2, { color: textColor }]}>{title}</Text>
            <Text style={[styles.bodyLeft, { color: subColor }]}>{subtitle}</Text>
            {options.map((opt) => {
                const isSel = selected === opt.value;
                return (
                    <TouchableOpacity
                        key={opt.value}
                        onPress={() => onSelect(opt.value)}
                        style={[
                            styles.listChoice,
                            { borderColor: isSel ? color : borderColor },
                            isSel && { backgroundColor: color + "15" },
                        ]}
                        activeOpacity={0.85}
                    >
                        <Text style={[styles.gridLabel, { color: isSel ? color : textColor }]}>
                            {opt.label}
                        </Text>
                        {isSel && <Ionicons name="checkmark-circle" size={20} color={color} style={{ marginLeft: "auto" }} />}
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    sheet: {
        height: "92%",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: "hidden",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
    headerTitle: { fontSize: 16, fontWeight: "700" },
    closeBtn: { padding: 4 },
    progressTrack: { height: 3, width: "100%" },
    progressFill: { height: "100%", backgroundColor: COLORS.memento[500] },
    center: { alignItems: "center", paddingVertical: 12 },
    heroCircle: {
        width: 80, height: 80, borderRadius: 40,
        alignItems: "center", justifyContent: "center",
        marginBottom: 18,
    },
    h2: { fontSize: 20, fontWeight: "800", textAlign: "center", marginBottom: 8 },
    body: { fontSize: 14, lineHeight: 22, textAlign: "center", marginBottom: 16 },
    bodyLeft: { fontSize: 13, textAlign: "center", marginBottom: 18, lineHeight: 18 },
    optionCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 14,
        borderRadius: 14,
        borderWidth: 2,
        marginBottom: 10,
    },
    optionIcon: {
        width: 40, height: 40, borderRadius: 12,
        alignItems: "center", justifyContent: "center",
    },
    optionLabel: { fontSize: 14, fontWeight: "700" },
    optionSub: { fontSize: 11, marginTop: 2 },
    gridRow: { flexDirection: "row", gap: 10 },
    gridCard: {
        flex: 1,
        padding: 16,
        borderRadius: 14,
        borderWidth: 2,
        alignItems: "center",
        gap: 8,
    },
    gridCardWide: {
        flex: 1,
        padding: 22,
        borderRadius: 14,
        borderWidth: 2,
        alignItems: "center",
        gap: 12,
    },
    gridLabel: { fontSize: 13, fontWeight: "700" },
    grid2x2: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    grid2x2Card: {
        width: "47%",
        flexGrow: 1,
        padding: 16,
        borderRadius: 14,
        borderWidth: 2,
        alignItems: "center",
    },
    listChoice: {
        flexDirection: "row",
        alignItems: "center",
        padding: 14,
        borderRadius: 12,
        borderWidth: 2,
        marginBottom: 10,
    },
    nameInput: {
        borderWidth: 2,
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        textAlign: "center",
    },
    footer: {
        borderTopWidth: 1,
        paddingTop: 12,
        paddingHorizontal: 20,
        gap: 10,
    },
    footerRow: { flexDirection: "row", gap: 10 },
    btn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 6,
    },
    btnGhost: {
        borderWidth: 1,
    },
    btnGhostText: { fontSize: 14, fontWeight: "600" },
    btnPrimary: {},
    btnPrimaryText: { color: "#fff", fontSize: 14, fontWeight: "700" },
    skipText: { textAlign: "center", fontSize: 12, paddingVertical: 4 },
});
