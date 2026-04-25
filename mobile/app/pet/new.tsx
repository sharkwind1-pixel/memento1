/**
 * 반려동물 등록 화면 (모달)
 */

import { useState } from "react";
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    Image, Alert, ActivityIndicator, StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { PetType, PetGender } from "@/types";
import { COLORS } from "@/lib/theme";

const PET_TYPES: PetType[] = ["강아지", "고양이", "기타"];
const PET_GENDERS: PetGender[] = ["남아", "여아"];

export default function NewPetScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { refreshPets } = usePet();

    const [name, setName] = useState("");
    const [type, setType] = useState<PetType>("강아지");
    const [breed, setBreed] = useState("");
    const [gender, setGender] = useState<PetGender>("남아");
    const [birthday, setBirthday] = useState("");
    const [weight, setWeight] = useState("");
    const [personality, setPersonality] = useState("");
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [profileImageFile, setProfileImageFile] = useState<{ uri: string; name: string; type: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);

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
            quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            setProfileImage(asset.uri);
            const ext = asset.uri.split(".").pop() ?? "jpg";
            setProfileImageFile({
                uri: asset.uri,
                name: `profile.${ext}`,
                type: `image/${ext}`,
            });
        }
    }

    async function uploadProfileImage(petId: string): Promise<string | null> {
        if (!profileImageFile || !user) return null;
        try {
            const ext = profileImageFile.name.split(".").pop();
            const path = `${user.id}/${petId}/profile.${ext}`;
            const blob = await fetch(profileImageFile.uri).then((r) => r.blob());

            const { error } = await supabase.storage
                .from("pet-media")
                .upload(path, blob, { upsert: true, contentType: profileImageFile.type });

            if (error) return null;

            const { data } = supabase.storage.from("pet-media").getPublicUrl(path);
            return data.publicUrl;
        } catch {
            return null;
        }
    }

    async function handleSave() {
        if (!name.trim()) {
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
                    name: name.trim(),
                    pet_type: type,
                    breed: breed.trim() || null,
                    gender,
                    birthday: birthday || null,
                    weight: weight || null,
                    personality: personality.trim() || null,
                    status: "active",
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
        } catch {
            Alert.alert("오류", "반려동물 등록 중 오류가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <ScrollView
            style={styles.flex1White}
            contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
            keyboardShouldPersistTaps="handled"
        >
            <View style={{ alignItems: "center", marginBottom: 24 }}>
                <TouchableOpacity onPress={pickImage} activeOpacity={0.85}>
                    {profileImage ? (
                        <Image source={{ uri: profileImage }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, styles.avatarFallback]}>
                            <Ionicons name="camera-outline" size={32} color={COLORS.memento[500]} />
                        </View>
                    )}
                    <View style={styles.avatarEdit}>
                        <Ionicons name="pencil" size={14} color="#fff" />
                    </View>
                </TouchableOpacity>
                <Text style={{ fontSize: 14, color: COLORS.gray[400], marginTop: 8 }}>프로필 사진 선택</Text>
            </View>

            <FormField label="이름 *">
                <TextInput
                    style={styles.input}
                    placeholder="반려동물 이름"
                    placeholderTextColor={COLORS.gray[400]}
                    value={name}
                    onChangeText={setName}
                    maxLength={20}
                />
            </FormField>

            <FormField label="종류">
                <View style={{ flexDirection: "row", gap: 8 }}>
                    {PET_TYPES.map((t) => (
                        <TouchableOpacity
                            key={t}
                            onPress={() => setType(t)}
                            style={[
                                styles.chipBtn,
                                type === t
                                    ? { backgroundColor: COLORS.memento[500], borderColor: COLORS.memento[500] }
                                    : { borderColor: COLORS.gray[200], backgroundColor: COLORS.gray[50] },
                            ]}
                        >
                            <Text style={{
                                fontSize: 14,
                                fontWeight: "500",
                                color: type === t ? "#fff" : COLORS.gray[600],
                            }}>
                                {t}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </FormField>

            <FormField label="품종">
                <TextInput
                    style={styles.input}
                    placeholder="예: 말티즈, 코리안숏헤어"
                    placeholderTextColor={COLORS.gray[400]}
                    value={breed}
                    onChangeText={setBreed}
                />
            </FormField>

            <FormField label="성별">
                <View style={{ flexDirection: "row", gap: 8 }}>
                    {PET_GENDERS.map((g) => (
                        <TouchableOpacity
                            key={g}
                            onPress={() => setGender(g)}
                            style={[
                                styles.chipBtn,
                                gender === g
                                    ? { backgroundColor: COLORS.memento[500], borderColor: COLORS.memento[500] }
                                    : { borderColor: COLORS.gray[200], backgroundColor: COLORS.gray[50] },
                            ]}
                        >
                            <Text style={{
                                fontSize: 14,
                                fontWeight: "500",
                                color: gender === g ? "#fff" : COLORS.gray[600],
                            }}>
                                {g}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </FormField>

            <FormField label="생일">
                <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={COLORS.gray[400]}
                    value={birthday}
                    onChangeText={setBirthday}
                    keyboardType="numbers-and-punctuation"
                    maxLength={10}
                />
            </FormField>

            <FormField label="체중 (kg)">
                <TextInput
                    style={styles.input}
                    placeholder="예: 3.5"
                    placeholderTextColor={COLORS.gray[400]}
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="decimal-pad"
                />
            </FormField>

            <FormField label="성격/특징">
                <TextInput
                    style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]}
                    placeholder="예: 활발하고 장난기 많음, 낯가림 심함"
                    placeholderTextColor={COLORS.gray[400]}
                    value={personality}
                    onChangeText={setPersonality}
                    multiline
                    numberOfLines={3}
                    maxLength={200}
                />
            </FormField>

            <TouchableOpacity
                onPress={handleSave}
                disabled={isLoading}
                style={styles.primaryButton}
                activeOpacity={0.85}
            >
                {isLoading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.primaryButtonText}>등록하기</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: "500", color: COLORS.gray[700], marginBottom: 6 }}>{label}</Text>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    flex1White: { flex: 1, backgroundColor: COLORS.white },
    avatar: { width: 112, height: 112, borderRadius: 56 },
    avatarFallback: {
        backgroundColor: COLORS.memento[50],
        borderWidth: 2,
        borderStyle: "dashed",
        borderColor: COLORS.memento[200],
        alignItems: "center",
        justifyContent: "center",
    },
    avatarEdit: {
        position: "absolute",
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        backgroundColor: COLORS.memento[500],
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    input: {
        width: "100%",
        borderWidth: 1,
        borderColor: COLORS.gray[200],
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        color: COLORS.gray[900],
        backgroundColor: COLORS.gray[50],
    },
    chipBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: "center",
        borderWidth: 1,
    },
    primaryButton: {
        width: "100%",
        backgroundColor: COLORS.memento[500],
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: "center",
        marginTop: 16,
    },
    primaryButtonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
