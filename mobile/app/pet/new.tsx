/**
 * 반려동물 등록 화면 (4단계 마법사) — 웹 PetFormStep1~4 매칭
 *
 * Step 1: 사진 + 이름 + 종류
 * Step 2: 성별/품종/생일/몸무게/상태(일상/추모)
 * Step 3: 우리 이야기 (만난 날, 어떻게 만났는지, 별명, 특별한 버릇)
 * Step 4: 좋아하는 것 (간식/놀이/장소) + 성격 + (추모 시) 기억하고 싶은 순간
 */

import { useState } from "react";
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    Image, Alert, ActivityIndicator, StyleSheet,
    KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { useDarkMode } from "@/contexts/ThemeContext";
import { PetType, PetGender } from "@/types";
import { COLORS } from "@/lib/theme";
import AppHeader from "@/components/common/AppHeader";

const PET_TYPES: PetType[] = ["강아지", "고양이", "기타"];
const PET_GENDERS: PetGender[] = ["남아", "여아"];

const HOW_WE_MET_OPTIONS = [
    { id: "펫샵", label: "펫샵에서" },
    { id: "분양", label: "분양 받았어요" },
    { id: "보호소", label: "보호소에서 입양" },
    { id: "지인", label: "지인에게서" },
    { id: "길에서", label: "길에서 만났어요" },
    { id: "기타", label: "기타" },
] as const;

type FormData = {
    name: string;
    type: PetType;
    breed: string;
    gender: PetGender;
    birthday: string;
    weight: string;
    status: "active" | "memorial";
    memorialDate: string;
    togetherPeriod: string;
    adoptedDate: string;
    howWeMet: string;
    nicknames: string;
    specialHabits: string;
    favoriteFood: string;
    favoriteActivity: string;
    favoritePlace: string;
    personality: string;
    memorableMemory: string;
};

const STEP_TITLES = [
    "어떤 친구인가요?",
    "기본 정보",
    "우리 이야기",
    "좋아하는 것",
];

export default function NewPetScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const { refreshPets } = usePet();
    const { isDarkMode } = useDarkMode();

    // 다크모드 컬러 토큰
    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.white;
    const cardBg = isDarkMode ? COLORS.gray[900] : COLORS.white;
    const inputBg = isDarkMode ? COLORS.gray[800] : COLORS.gray[50];
    const inputBorder = isDarkMode ? COLORS.gray[700] : COLORS.gray[200];
    const inputColor = isDarkMode ? COLORS.gray[100] : COLORS.gray[900];
    const titleColor = isDarkMode ? COLORS.white : COLORS.gray[800];
    const labelColor = isDarkMode ? COLORS.gray[300] : COLORS.gray[700];
    const placeholderColor = isDarkMode ? COLORS.gray[500] : COLORS.gray[400];
    const stepDotInactiveBg = isDarkMode ? COLORS.gray[800] : COLORS.gray[200];
    const ghostBg = isDarkMode ? COLORS.gray[800] : COLORS.white;
    const ghostBorder = isDarkMode ? COLORS.gray[700] : COLORS.gray[300];
    const ghostText = isDarkMode ? COLORS.gray[300] : COLORS.gray[700];

    const [step, setStep] = useState(1);
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [profileImageFile, setProfileImageFile] = useState<{ uri: string; type: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const [form, setForm] = useState<FormData>({
        name: "",
        type: "강아지",
        breed: "",
        gender: "남아",
        birthday: "",
        weight: "",
        status: "active",
        memorialDate: "",
        togetherPeriod: "",
        adoptedDate: "",
        howWeMet: "",
        nicknames: "",
        specialHabits: "",
        favoriteFood: "",
        favoriteActivity: "",
        favoritePlace: "",
        personality: "",
        memorableMemory: "",
    });

    function update<K extends keyof FormData>(key: K, value: FormData[K]) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    async function pickImage() {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("권한 필요", "갤러리 접근 권한이 필요합니다.");
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.85,
        });
        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            setProfileImage(asset.uri);
            const ext = asset.uri.split(".").pop() ?? "jpg";
            setProfileImageFile({ uri: asset.uri, type: `image/${ext === "jpg" ? "jpeg" : ext}` });
        }
    }

    async function uploadProfileImage(petId: string): Promise<string | null> {
        if (!profileImageFile || !user) return null;
        try {
            const ext = profileImageFile.type.split("/")[1] || "jpg";
            const path = `${user.id}/${petId}/profile.${ext}`;
            const response = await fetch(profileImageFile.uri);
            const arrayBuffer = await response.arrayBuffer();
            const { error } = await supabase.storage
                .from("pet-media")
                .upload(path, new Uint8Array(arrayBuffer), {
                    upsert: true,
                    contentType: profileImageFile.type,
                });
            if (error) return null;
            const { data } = supabase.storage.from("pet-media").getPublicUrl(path);
            return data.publicUrl;
        } catch {
            return null;
        }
    }

    function next() {
        if (step === 1 && !form.name.trim()) {
            Alert.alert("알림", "이름을 입력해주세요.");
            return;
        }
        if (step < 4) setStep(step + 1);
    }

    function prev() {
        if (step > 1) setStep(step - 1);
    }

    async function handleSave() {
        if (!form.name.trim()) {
            Alert.alert("알림", "이름을 입력해주세요.");
            return;
        }
        if (!user) return;

        setIsLoading(true);
        try {
            const { data: pet, error: petError } = await supabase
                .from("pets")
                .insert({
                    user_id: user.id,
                    name: form.name.trim(),
                    type: form.type,
                    breed: form.breed.trim() || null,
                    gender: form.gender,
                    birthday: form.birthday || null,
                    weight: form.weight || null,
                    personality: form.personality.trim() || null,
                    status: form.status,
                    memorial_date: form.status === "memorial" ? (form.memorialDate || null) : null,
                    together_period: form.status === "memorial" ? (form.togetherPeriod || null) : null,
                    adopted_date: form.adoptedDate || null,
                    how_we_met: form.howWeMet || null,
                    nicknames: form.nicknames.trim() || null,
                    special_habits: form.specialHabits.trim() || null,
                    favorite_food: form.favoriteFood.trim() || null,
                    favorite_activity: form.favoriteActivity.trim() || null,
                    favorite_place: form.favoritePlace.trim() || null,
                    memorable_memory: form.status === "memorial" ? (form.memorableMemory.trim() || null) : null,
                    is_primary: false,
                })
                .select()
                .single();

            if (petError || !pet) throw petError ?? new Error("펫 생성 실패");

            if (profileImageFile) {
                const imageUrl = await uploadProfileImage(pet.id);
                if (imageUrl) {
                    await supabase
                        .from("pets")
                        .update({ profile_image: imageUrl })
                        .eq("id", pet.id);
                }
            }

            await refreshPets();
            router.back();
        } catch (e: any) {
            Alert.alert("오류", e?.message || "반려동물 등록 중 오류가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <SafeAreaView style={[styles.flex1White, { backgroundColor: bgColor }]} edges={["top"]}>
            <Stack.Screen options={{ headerShown: false }} />
            <AppHeader showBack title="반려동물 등록" hideActions />

            {/* 단계 인디케이터 */}
            <View style={styles.stepWrap}>
                <View style={styles.stepRow}>
                    {[1, 2, 3, 4].map((s) => (
                        <View key={s} style={styles.stepItem}>
                            <View
                                style={[
                                    styles.stepDot,
                                    s < step && { backgroundColor: COLORS.memento[500] },
                                    s === step && { backgroundColor: COLORS.memento[500], transform: [{ scale: 1.2 }] },
                                    s > step && { backgroundColor: stepDotInactiveBg },
                                ]}
                            >
                                {s < step ? (
                                    <Ionicons name="checkmark" size={12} color="#fff" />
                                ) : (
                                    <Text style={[
                                        styles.stepNum,
                                        { color: s === step ? "#fff" : (isDarkMode ? COLORS.gray[400] : COLORS.gray[500]) },
                                    ]}>{s}</Text>
                                )}
                            </View>
                            {s < 4 && (
                                <View style={[
                                    styles.stepLine,
                                    s < step ? { backgroundColor: COLORS.memento[500] } : { backgroundColor: stepDotInactiveBg },
                                ]} />
                            )}
                        </View>
                    ))}
                </View>
                <Text style={[styles.stepTitle, { color: titleColor }]}>{STEP_TITLES[step - 1]}</Text>
            </View>

            <KeyboardAvoidingView
                style={styles.flex1}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <ScrollView
                    style={styles.flex1}
                    contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {step === 1 && (
                        <Step1Content
                            form={form}
                            update={update}
                            profileImage={profileImage}
                            pickImage={pickImage}
                            removeImage={() => { setProfileImage(null); setProfileImageFile(null); }}
                            isDark={isDarkMode}
                        />
                    )}
                    {step === 2 && <Step2Content form={form} update={update} isDark={isDarkMode} />}
                    {step === 3 && <Step3Content form={form} update={update} isDark={isDarkMode} />}
                    {step === 4 && <Step4Content form={form} update={update} isDark={isDarkMode} />}
                </ScrollView>

                {/* 하단 네비게이션 */}
                <View style={[
                    styles.bottomBar,
                    {
                        backgroundColor: cardBg,
                        borderTopColor: inputBorder,
                        paddingBottom: 12 + Math.max(insets.bottom, 0),
                    },
                ]}>
                    {step > 1 ? (
                        <TouchableOpacity
                            onPress={prev}
                            style={[styles.btnGhost, { backgroundColor: ghostBg, borderColor: ghostBorder }]}
                            activeOpacity={0.85}
                            disabled={isLoading}
                        >
                            <Ionicons name="chevron-back" size={16} color={ghostText} />
                            <Text style={[styles.btnGhostText, { color: ghostText }]}>이전</Text>
                        </TouchableOpacity>
                    ) : <View style={{ width: 100 }} />}

                    {step < 4 ? (
                        <TouchableOpacity
                            onPress={next}
                            activeOpacity={0.85}
                            style={styles.btnPrimaryWrap}
                        >
                            <LinearGradient
                                colors={[COLORS.memento[500], COLORS.memento[400]]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.btnPrimary}
                            >
                                <Text style={styles.btnPrimaryText}>다음</Text>
                                <Ionicons name="chevron-forward" size={16} color="#fff" />
                            </LinearGradient>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            onPress={handleSave}
                            disabled={isLoading}
                            activeOpacity={0.85}
                            style={styles.btnPrimaryWrap}
                        >
                            <LinearGradient
                                colors={[COLORS.memento[500], COLORS.memento[400]]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.btnPrimary}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons name="checkmark" size={16} color="#fff" />
                                        <Text style={styles.btnPrimaryText}>등록하기</Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    )}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

interface StepProps {
    form: FormData;
    update: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
    isDark: boolean;
}

// 모든 Step 공통 다크모드 인풋 스타일
function inputStyle(isDark: boolean) {
    return {
        backgroundColor: isDark ? COLORS.gray[800] : COLORS.gray[50],
        borderColor: isDark ? COLORS.gray[700] : COLORS.gray[200],
        color: isDark ? COLORS.gray[100] : COLORS.gray[900],
    } as const;
}
function inputPlaceholder(isDark: boolean) {
    return isDark ? COLORS.gray[500] : COLORS.gray[400];
}

function Step1Content({
    form, update, profileImage, pickImage, removeImage, isDark,
}: StepProps & {
    profileImage: string | null;
    pickImage: () => void;
    removeImage: () => void;
}) {
    return (
        <View>
            {/* 프로필 사진 */}
            <View style={{ alignItems: "center", marginBottom: 24 }}>
                <TouchableOpacity onPress={pickImage} activeOpacity={0.85}>
                    {profileImage ? (
                        <Image source={{ uri: profileImage }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, styles.avatarFallback]}>
                            <Ionicons name="camera-outline" size={36} color={COLORS.memento[500]} />
                            <Text style={{ fontSize: 12, color: COLORS.memento[600], marginTop: 6, fontWeight: "500" }}>
                                사진 등록
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
                {profileImage && (
                    <TouchableOpacity onPress={removeImage} style={styles.removeImageBtn}>
                        <Ionicons name="trash-outline" size={12} color="#EF4444" />
                        <Text style={{ fontSize: 12, color: "#EF4444" }}>삭제</Text>
                    </TouchableOpacity>
                )}
            </View>

            <FormField label="이름 *">
                <TextInput
                    style={[styles.input, inputStyle(isDark)]}
                    placeholder="반려동물 이름을 입력하세요"
                    placeholderTextColor={inputPlaceholder(isDark)}
                    value={form.name}
                    onChangeText={(v) => update("name", v)}
                    maxLength={20}
                />
            </FormField>

            <FormField label="종류">
                <View style={{ flexDirection: "row", gap: 8 }}>
                    {PET_TYPES.map((t) => (
                        <SelectChip
                            key={t}
                            label={t}
                            active={form.type === t}
                            onPress={() => update("type", t)}
                        />
                    ))}
                </View>
            </FormField>
        </View>
    );
}

function Step2Content({ form, update, isDark }: StepProps) {
    return (
        <View>
            <View style={styles.row}>
                <View style={styles.col}>
                    <FormField label="성별">
                        <View style={{ flexDirection: "row", gap: 8 }}>
                            {PET_GENDERS.map((g) => (
                                <SelectChip
                                    key={g}
                                    label={g}
                                    active={form.gender === g}
                                    onPress={() => update("gender", g)}
                                />
                            ))}
                        </View>
                    </FormField>
                </View>
                <View style={styles.col}>
                    <FormField label="품종">
                        <TextInput
                            style={[styles.input, inputStyle(isDark)]}
                            placeholder="예: 말티즈"
                            placeholderTextColor={inputPlaceholder(isDark)}
                            value={form.breed}
                            onChangeText={(v) => update("breed", v)}
                        />
                    </FormField>
                </View>
            </View>

            <View style={styles.row}>
                <View style={styles.col}>
                    <FormField label="생일">
                        <TextInput
                            style={[styles.input, inputStyle(isDark)]}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={inputPlaceholder(isDark)}
                            value={form.birthday}
                            onChangeText={(v) => update("birthday", v)}
                            keyboardType="numbers-and-punctuation"
                            maxLength={10}
                        />
                    </FormField>
                </View>
                <View style={styles.col}>
                    <FormField label="몸무게">
                        <TextInput
                            style={[styles.input, inputStyle(isDark)]}
                            placeholder="예: 3.2kg"
                            placeholderTextColor={inputPlaceholder(isDark)}
                            value={form.weight}
                            onChangeText={(v) => update("weight", v)}
                        />
                    </FormField>
                </View>
            </View>

            <FormField label="현재 상태">
                <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                        onPress={() => update("status", "active")}
                        style={[
                            styles.statusBtn,
                            form.status === "active"
                                ? { backgroundColor: "#10B981", borderColor: "#10B981" }
                                : { backgroundColor: COLORS.gray[50], borderColor: COLORS.gray[200] },
                        ]}
                        activeOpacity={0.85}
                    >
                        <Ionicons
                            name="heart"
                            size={16}
                            color={form.status === "active" ? "#fff" : COLORS.gray[500]}
                        />
                        <Text style={[
                            styles.statusBtnText,
                            { color: form.status === "active" ? "#fff" : COLORS.gray[600] },
                        ]}>함께하는 중</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => update("status", "memorial")}
                        style={[
                            styles.statusBtn,
                            form.status === "memorial"
                                ? { backgroundColor: COLORS.memorial[500], borderColor: COLORS.memorial[500] }
                                : { backgroundColor: COLORS.gray[50], borderColor: COLORS.gray[200] },
                        ]}
                        activeOpacity={0.85}
                    >
                        <Ionicons
                            name="star"
                            size={16}
                            color={form.status === "memorial" ? "#fff" : COLORS.gray[500]}
                        />
                        <Text style={[
                            styles.statusBtnText,
                            { color: form.status === "memorial" ? "#fff" : COLORS.gray[600] },
                        ]}>추억 속에</Text>
                    </TouchableOpacity>
                </View>
            </FormField>

            {form.status === "memorial" && (
                <View style={styles.memorialBox}>
                    <FormField label="무지개다리 건넌 날" labelColor={COLORS.memorial[700]}>
                        <TextInput
                            style={[styles.input, inputStyle(isDark)]}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={inputPlaceholder(isDark)}
                            value={form.memorialDate}
                            onChangeText={(v) => update("memorialDate", v)}
                            keyboardType="numbers-and-punctuation"
                            maxLength={10}
                        />
                    </FormField>
                    <FormField label="함께한 기간" labelColor={COLORS.memorial[700]}>
                        <TextInput
                            style={[styles.input, inputStyle(isDark)]}
                            placeholder="예: 15년, 2010년부터 2025년까지"
                            placeholderTextColor={inputPlaceholder(isDark)}
                            value={form.togetherPeriod}
                            onChangeText={(v) => update("togetherPeriod", v)}
                        />
                    </FormField>
                </View>
            )}
        </View>
    );
}

function Step3Content({ form, update, isDark }: StepProps) {
    return (
        <View>
            <View style={styles.storyBox}>
                <Text style={styles.storyHint}>
                    {form.name || "우리 아이"}와 처음 만난 이야기를 들려주세요
                </Text>
                <FormField label="처음 만난 날">
                    <TextInput
                        style={[styles.input, inputStyle(isDark)]}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={inputPlaceholder(isDark)}
                        value={form.adoptedDate}
                        onChangeText={(v) => update("adoptedDate", v)}
                        keyboardType="numbers-and-punctuation"
                        maxLength={10}
                    />
                </FormField>
                <FormField label="어떻게 만났어요?">
                    <View style={styles.howWeMetGrid}>
                        {HOW_WE_MET_OPTIONS.map((opt) => (
                            <TouchableOpacity
                                key={opt.id}
                                onPress={() => update("howWeMet", opt.id)}
                                style={[
                                    styles.howWeMetBtn,
                                    form.howWeMet === opt.id
                                        ? { backgroundColor: COLORS.memento[500], borderColor: COLORS.memento[500] }
                                        : { backgroundColor: COLORS.white, borderColor: COLORS.gray[200] },
                                ]}
                                activeOpacity={0.85}
                            >
                                <Text style={{
                                    fontSize: 13,
                                    fontWeight: "500",
                                    color: form.howWeMet === opt.id ? "#fff" : COLORS.gray[600],
                                }}>{opt.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </FormField>
            </View>

            <FormField label="부르는 별명들">
                <TextInput
                    style={[styles.input, inputStyle(isDark)]}
                    placeholder="예: 콩이, 콩콩이, 콩순이"
                    placeholderTextColor={inputPlaceholder(isDark)}
                    value={form.nicknames}
                    onChangeText={(v) => update("nicknames", v)}
                />
                <Text style={styles.fieldHint}>쉼표로 구분해서 여러 개 입력할 수 있어요</Text>
            </FormField>

            <FormField label="특별한 버릇이나 습관">
                <TextInput
                    style={[styles.input, styles.textArea, inputStyle(isDark)]}
                    placeholder="예: 배를 긁어주면 다리를 흔들어요, 산책 전에 빙글빙글 돌아요"
                    placeholderTextColor={inputPlaceholder(isDark)}
                    value={form.specialHabits}
                    onChangeText={(v) => update("specialHabits", v)}
                    multiline
                    textAlignVertical="top"
                />
            </FormField>
        </View>
    );
}

function Step4Content({ form, update, isDark }: StepProps) {
    return (
        <View>
            <FavCard
                icon="restaurant-outline"
                color="#F59E0B"
                label="좋아하는 간식"
                placeholder="예: 닭가슴살, 고구마, 치즈"
                value={form.favoriteFood}
                onChangeText={(v) => update("favoriteFood", v)}
            />
            <FavCard
                icon="sparkles-outline"
                color="#10B981"
                label="좋아하는 놀이/활동"
                placeholder="예: 공놀이, 터그놀이, 산책"
                value={form.favoriteActivity}
                onChangeText={(v) => update("favoriteActivity", v)}
            />
            <FavCard
                icon="home-outline"
                color={COLORS.memento[500]}
                label="좋아하는 장소"
                placeholder="예: 공원, 소파, 햇볕 드는 창가"
                value={form.favoritePlace}
                onChangeText={(v) => update("favoritePlace", v)}
            />

            <FormField label="성격/특징">
                <TextInput
                    style={[styles.input, styles.textArea, inputStyle(isDark)]}
                    placeholder="우리 아이만의 성격이나 특징을 자유롭게 적어주세요"
                    placeholderTextColor={inputPlaceholder(isDark)}
                    value={form.personality}
                    onChangeText={(v) => update("personality", v)}
                    multiline
                    textAlignVertical="top"
                />
            </FormField>

            {form.status === "memorial" && (
                <View style={styles.memorialBox}>
                    <FormField label="기억하고 싶은 순간" labelColor={COLORS.memorial[700]}>
                        <TextInput
                            style={[styles.input, styles.textArea, inputStyle(isDark)]}
                            placeholder="가장 기억에 남는 순간이나 함께한 추억을 적어주세요"
                            placeholderTextColor={inputPlaceholder(isDark)}
                            value={form.memorableMemory}
                            onChangeText={(v) => update("memorableMemory", v)}
                            multiline
                            textAlignVertical="top"
                        />
                    </FormField>
                </View>
            )}
        </View>
    );
}

function FormField({ label, children, labelColor }: {
    label: string;
    children: React.ReactNode;
    labelColor?: string;
}) {
    const { isDarkMode } = useDarkMode();
    const defaultLabelColor = isDarkMode ? COLORS.gray[300] : COLORS.gray[700];
    return (
        <View style={{ marginBottom: 16 }}>
            <Text style={[styles.label, { color: labelColor ?? defaultLabelColor }]}>{label}</Text>
            {children}
        </View>
    );
}

function SelectChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    const { isDarkMode } = useDarkMode();
    return (
        <TouchableOpacity
            onPress={onPress}
            style={[
                styles.chipBtn,
                active
                    ? { backgroundColor: COLORS.memento[500], borderColor: COLORS.memento[500] }
                    : {
                        borderColor: isDarkMode ? COLORS.gray[700] : COLORS.gray[200],
                        backgroundColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[50],
                    },
            ]}
            activeOpacity={0.85}
        >
            <Text style={{
                fontSize: 14,
                fontWeight: "500",
                color: active ? "#fff" : (isDarkMode ? COLORS.gray[300] : COLORS.gray[600]),
            }}>{label}</Text>
        </TouchableOpacity>
    );
}

function FavCard({ icon, color, label, placeholder, value, onChangeText }: {
    icon: React.ComponentProps<typeof Ionicons>["name"];
    color: string;
    label: string;
    placeholder: string;
    value: string;
    onChangeText: (v: string) => void;
}) {
    const { isDarkMode } = useDarkMode();
    const cardBg = isDarkMode ? COLORS.gray[900] : COLORS.memento[50];
    const cardBorder = isDarkMode ? COLORS.gray[800] : COLORS.memento[100];
    const labelColor = isDarkMode ? COLORS.gray[300] : COLORS.gray[700];
    const inputColor = isDarkMode ? COLORS.gray[100] : COLORS.gray[900];

    return (
        <View style={[styles.favCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={[styles.favIconBg, { backgroundColor: color + "15" }]}>
                <Ionicons name={icon} size={18} color={color} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.favLabel, { color: labelColor }]}>{label}</Text>
                <TextInput
                    style={[styles.favInput, { color: inputColor }]}
                    placeholder={placeholder}
                    placeholderTextColor={inputPlaceholder(isDarkMode)}
                    value={value}
                    onChangeText={onChangeText}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    flex1White: { flex: 1 },

    stepWrap: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.gray[100],
    },
    stepRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
    stepItem: { flexDirection: "row", alignItems: "center", flex: 1 },
    stepDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    stepNum: { fontSize: 11, fontWeight: "700" },
    stepLine: { flex: 1, height: 2, marginHorizontal: 4 },
    stepTitle: { fontSize: 15, fontWeight: "700" },

    avatar: { width: 132, height: 132, borderRadius: 24 },
    avatarFallback: {
        backgroundColor: COLORS.memento[50],
        borderWidth: 2,
        borderStyle: "dashed",
        borderColor: COLORS.memento[400],
        alignItems: "center",
        justifyContent: "center",
    },
    removeImageBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#FECACA",
    },

    label: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
    fieldHint: { fontSize: 11, marginTop: 4 },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
    },
    textArea: { minHeight: 88, paddingTop: 12 },

    row: { flexDirection: "row", gap: 12 },
    col: { flex: 1 },

    chipBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: "center",
        borderWidth: 1,
    },

    statusBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
    },
    statusBtnText: { fontSize: 14, fontWeight: "600" },

    memorialBox: {
        backgroundColor: "#FEF3C7",
        padding: 14,
        borderRadius: 14,
        marginBottom: 8,
    },

    storyBox: {
        backgroundColor: COLORS.memento[50],
        padding: 14,
        borderRadius: 14,
        marginBottom: 16,
    },
    storyHint: { fontSize: 13, color: COLORS.memento[700], marginBottom: 12, fontWeight: "500" },

    howWeMetGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    howWeMetBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 9999,
        borderWidth: 1,
    },

    favCard: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 12,
    },
    favIconBg: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 2,
    },
    favLabel: { fontSize: 13, fontWeight: "600", marginBottom: 4 },
    favInput: {
        fontSize: 14,
        paddingVertical: 4,
    },

    bottomBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 12,
        borderTopWidth: 1,
        gap: 12,
    },
    btnGhost: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        minWidth: 100,
        justifyContent: "center",
    },
    btnGhostText: { fontSize: 14, fontWeight: "600" },
    btnPrimaryWrap: {
        flex: 1,
        borderRadius: 12,
        elevation: 4,
        shadowColor: COLORS.memento[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    btnPrimary: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 14,
        borderRadius: 12,
    },
    btnPrimaryText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
