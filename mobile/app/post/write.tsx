/**
 * 게시글 작성 화면 (모달)
 */

import { useState } from "react";
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    Alert, ActivityIndicator, Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { API_BASE_URL } from "@/config/constants";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { CommunitySubcategory, PostTag } from "@/types";

const POST_TAGS: PostTag[] = ["정보", "일상", "질문", "강아지", "고양이", "햄스터", "토끼"];

export default function WritePostScreen() {
    const router = useRouter();
    const { subcategory } = useLocalSearchParams<{ subcategory?: CommunitySubcategory }>();
    const { session } = useAuth();
    const { isMemorialMode } = usePet();

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [selectedTag, setSelectedTag] = useState<PostTag | null>(null);
    const [images, setImages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const accentColor = isMemorialMode ? "#F59E0B" : "#05B2DC";

    async function pickImage() {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") { Alert.alert("권한 필요", "갤러리 접근 권한이 필요합니다."); return; }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 0.8,
            selectionLimit: 5,
        });
        if (!result.canceled) {
            setImages((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 5));
        }
    }

    async function handleSubmit() {
        if (!title.trim() || !content.trim()) {
            Alert.alert("알림", "제목과 내용을 입력해주세요.");
            return;
        }
        if (!session) return;

        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append("title", title.trim());
            formData.append("content", content.trim());
            formData.append("subcategory", subcategory ?? "free");
            if (selectedTag) formData.append("tag", selectedTag);

            images.forEach((uri, i) => {
                const ext = uri.split(".").pop() ?? "jpg";
                formData.append("images", {
                    uri,
                    name: `image_${i}.${ext}`,
                    type: `image/${ext}`,
                } as unknown as Blob);
            });

            const res = await fetch(`${API_BASE_URL}/api/posts`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${session.access_token}`,
                },
                body: formData,
            });

            if (!res.ok) throw new Error();
            router.back();
        } catch {
            Alert.alert("오류", "게시글 작성에 실패했습니다.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <View className={`flex-1 ${isMemorialMode ? "bg-gray-950" : "bg-white"}`}>
            <ScrollView className="flex-1 px-5" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {/* 말머리 */}
                {(subcategory === "free" || !subcategory) && (
                    <View className="mt-4 mb-3">
                        <Text className={`text-xs font-medium mb-2 ${isMemorialMode ? "text-gray-400" : "text-gray-500"}`}>말머리</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                            {POST_TAGS.map((tag) => (
                                <TouchableOpacity
                                    key={tag}
                                    onPress={() => setSelectedTag(selectedTag === tag ? null : tag)}
                                    className="px-3 py-1.5 rounded-full border"
                                    style={{
                                        backgroundColor: selectedTag === tag ? accentColor : "transparent",
                                        borderColor: selectedTag === tag ? accentColor : (isMemorialMode ? "#374151" : "#E5E7EB"),
                                    }}
                                >
                                    <Text
                                        className="text-xs font-medium"
                                        style={{ color: selectedTag === tag ? "#fff" : (isMemorialMode ? "#9CA3AF" : "#6B7280") }}
                                    >
                                        {tag}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* 제목 */}
                <TextInput
                    className={`text-lg font-semibold py-3 border-b ${isMemorialMode ? "text-white border-gray-800" : "text-gray-900 border-gray-100"}`}
                    placeholder="제목을 입력하세요"
                    placeholderTextColor="#9CA3AF"
                    value={title}
                    onChangeText={setTitle}
                    maxLength={100}
                />

                {/* 본문 */}
                <TextInput
                    className={`text-sm leading-6 py-4 min-h-48 ${isMemorialMode ? "text-gray-200" : "text-gray-700"}`}
                    placeholder="내용을 입력하세요..."
                    placeholderTextColor="#9CA3AF"
                    value={content}
                    onChangeText={setContent}
                    multiline
                    textAlignVertical="top"
                    maxLength={5000}
                />

                {/* 첨부 이미지 미리보기 */}
                {images.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4" contentContainerStyle={{ gap: 8 }}>
                        {images.map((uri, i) => (
                            <View key={i} className="relative">
                                <Image source={{ uri }} className="w-24 h-24 rounded-xl" />
                                <TouchableOpacity
                                    onPress={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                                    className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full items-center justify-center"
                                >
                                    <Ionicons name="close" size={12} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>
                )}
            </ScrollView>

            {/* 하단 툴바 */}
            <View
                className="flex-row items-center justify-between px-5 py-3 border-t"
                style={{ borderTopColor: isMemorialMode ? "#1F2937" : "#F3F4F6" }}
            >
                <TouchableOpacity onPress={pickImage} className="flex-row items-center gap-1.5" activeOpacity={0.7}>
                    <Ionicons name="image-outline" size={22} color="#9CA3AF" />
                    <Text className="text-sm text-gray-400">사진 ({images.length}/5)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={isLoading || !title.trim() || !content.trim()}
                    className="px-5 py-2.5 rounded-xl"
                    style={{ backgroundColor: title.trim() && content.trim() ? accentColor : "#E5E7EB" }}
                >
                    {isLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text
                            className="text-sm font-semibold"
                            style={{ color: title.trim() && content.trim() ? "#fff" : "#9CA3AF" }}
                        >
                            게시하기
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}
