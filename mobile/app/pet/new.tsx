/**
 * 반려동물 등록 화면 (모달)
 */

import { useState } from "react";
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    Image, Alert, ActivityIndicator, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { PetType, PetGender, PetStatus } from "@/types";

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
        if (!profileImageFile) return null;
        try {
            const path = `${user!.id}/${petId}/profile.${profileImageFile.name.split(".").pop()}`;
            const base64 = await fetch(profileImageFile.uri)
                .then((r) => r.blob());

            const { error } = await supabase.storage
                .from("pet-media")
                .upload(path, base64, { upsert: true, contentType: profileImageFile.type });

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
            // 1. 펫 생성
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

            if (petError || !pet) {
                throw petError ?? new Error("펫 생성 실패");
            }

            // 2. 프로필 이미지 업로드
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
        } catch (e: unknown) {
            Alert.alert("오류", "반려동물 등록 중 오류가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <ScrollView
            className="flex-1 bg-white"
            contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
            keyboardShouldPersistTaps="handled"
        >
            {/* 프로필 사진 */}
            <View className="items-center mb-6">
                <TouchableOpacity onPress={pickImage} activeOpacity={0.85}>
                    {profileImage ? (
                        <Image source={{ uri: profileImage }} className="w-28 h-28 rounded-full" />
                    ) : (
                        <View className="w-28 h-28 rounded-full bg-memento-50 border-2 border-dashed border-memento-200 items-center justify-center">
                            <Ionicons name="camera-outline" size={32} color="#05B2DC" />
                        </View>
                    )}
                    <View className="absolute bottom-0 right-0 w-8 h-8 bg-memento-500 rounded-full items-center justify-center">
                        <Ionicons name="pencil" size={14} color="#fff" />
                    </View>
                </TouchableOpacity>
                <Text className="text-sm text-gray-400 mt-2">프로필 사진 선택</Text>
            </View>

            {/* 이름 */}
            <FormField label="이름 *">
                <TextInput
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 bg-gray-50"
                    placeholder="반려동물 이름"
                    placeholderTextColor="#9CA3AF"
                    value={name}
                    onChangeText={setName}
                    maxLength={20}
                />
            </FormField>

            {/* 종류 */}
            <FormField label="종류">
                <View className="flex-row gap-2">
                    {PET_TYPES.map((t) => (
                        <TouchableOpacity
                            key={t}
                            onPress={() => setType(t)}
                            className={`flex-1 py-3 rounded-xl items-center border ${
                                type === t ? "bg-memento-500 border-memento-500" : "border-gray-200 bg-gray-50"
                            }`}
                        >
                            <Text className={`text-sm font-medium ${type === t ? "text-white" : "text-gray-600"}`}>{t}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </FormField>

            {/* 품종 */}
            <FormField label="품종">
                <TextInput
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 bg-gray-50"
                    placeholder="예: 말티즈, 코리안숏헤어"
                    placeholderTextColor="#9CA3AF"
                    value={breed}
                    onChangeText={setBreed}
                />
            </FormField>

            {/* 성별 */}
            <FormField label="성별">
                <View className="flex-row gap-2">
                    {PET_GENDERS.map((g) => (
                        <TouchableOpacity
                            key={g}
                            onPress={() => setGender(g)}
                            className={`flex-1 py-3 rounded-xl items-center border ${
                                gender === g ? "bg-memento-500 border-memento-500" : "border-gray-200 bg-gray-50"
                            }`}
                        >
                            <Text className={`text-sm font-medium ${gender === g ? "text-white" : "text-gray-600"}`}>{g}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </FormField>

            {/* 생일 */}
            <FormField label="생일">
                <TextInput
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 bg-gray-50"
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#9CA3AF"
                    value={birthday}
                    onChangeText={setBirthday}
                    keyboardType="numbers-and-punctuation"
                    maxLength={10}
                />
            </FormField>

            {/* 체중 */}
            <FormField label="체중 (kg)">
                <TextInput
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 bg-gray-50"
                    placeholder="예: 3.5"
                    placeholderTextColor="#9CA3AF"
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="decimal-pad"
                />
            </FormField>

            {/* 성격 */}
            <FormField label="성격/특징">
                <TextInput
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 bg-gray-50"
                    placeholder="예: 활발하고 장난기 많음, 낯가림 심함"
                    placeholderTextColor="#9CA3AF"
                    value={personality}
                    onChangeText={setPersonality}
                    multiline
                    numberOfLines={3}
                    maxLength={200}
                    style={{ minHeight: 80, textAlignVertical: "top" }}
                />
            </FormField>

            {/* 저장 버튼 */}
            <TouchableOpacity
                onPress={handleSave}
                disabled={isLoading}
                className="w-full bg-memento-500 rounded-xl py-4 items-center mt-4"
                activeOpacity={0.85}
            >
                {isLoading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text className="text-white font-semibold text-base">등록하기</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-1.5">{label}</Text>
            {children}
        </View>
    );
}
