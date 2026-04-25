/**
 * 게시글 작성 화면 (모달)
 */

import { useState } from "react";
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    Alert, ActivityIndicator, Image, StyleSheet,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { API_BASE_URL } from "@/config/constants";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { CommunitySubcategory, PostTag } from "@/types";
import { COLORS } from "@/lib/theme";

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

    const accentColor = isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500];

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

    const bgColor = isMemorialMode ? COLORS.gray[950] : COLORS.white;
    const borderColor = isMemorialMode ? COLORS.gray[800] : COLORS.gray[100];

    return (
        <View style={[styles.flex1, { backgroundColor: bgColor }]}>
            <ScrollView style={[styles.flex1, { paddingHorizontal: 20 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {(subcategory === "free" || !subcategory) && (
                    <View style={{ marginTop: 16, marginBottom: 12 }}>
                        <Text style={{
                            fontSize: 12,
                            fontWeight: "500",
                            marginBottom: 8,
                            color: isMemorialMode ? COLORS.gray[400] : COLORS.gray[500],
                        }}>
                            말머리
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                            {POST_TAGS.map((tag) => (
                                <TouchableOpacity
                                    key={tag}
                                    onPress={() => setSelectedTag(selectedTag === tag ? null : tag)}
                                    style={[
                                        styles.tagPill,
                                        {
                                            backgroundColor: selectedTag === tag ? accentColor : "transparent",
                                            borderColor: selectedTag === tag ? accentColor : (isMemorialMode ? COLORS.gray[700] : COLORS.gray[200]),
                                        },
                                    ]}
                                >
                                    <Text style={{
                                        fontSize: 12,
                                        fontWeight: "500",
                                        color: selectedTag === tag ? "#fff" : (isMemorialMode ? COLORS.gray[400] : COLORS.gray[500]),
                                    }}>
                                        {tag}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                <TextInput
                    style={[
                        styles.titleInput,
                        {
                            color: isMemorialMode ? COLORS.white : COLORS.gray[900],
                            borderBottomColor: isMemorialMode ? COLORS.gray[800] : COLORS.gray[100],
                        },
                    ]}
                    placeholder="제목을 입력하세요"
                    placeholderTextColor={COLORS.gray[400]}
                    value={title}
                    onChangeText={setTitle}
                    maxLength={100}
                />

                <TextInput
                    style={[
                        styles.contentInput,
                        { color: isMemorialMode ? COLORS.gray[200] : COLORS.gray[700] },
                    ]}
                    placeholder="내용을 입력하세요..."
                    placeholderTextColor={COLORS.gray[400]}
                    value={content}
                    onChangeText={setContent}
                    multiline
                    textAlignVertical="top"
                    maxLength={5000}
                />

                {images.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
                        {images.map((uri, i) => (
                            <View key={i} style={{ position: "relative" }}>
                                <Image source={{ uri }} style={styles.imgThumb} />
                                <TouchableOpacity
                                    onPress={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                                    style={styles.imgRemove}
                                >
                                    <Ionicons name="close" size={12} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>
                )}
            </ScrollView>

            <View style={[styles.toolbar, { borderTopColor: borderColor }]}>
                <TouchableOpacity onPress={pickImage} style={styles.toolbarBtn} activeOpacity={0.7}>
                    <Ionicons name="image-outline" size={22} color={COLORS.gray[400]} />
                    <Text style={{ fontSize: 14, color: COLORS.gray[400] }}>사진 ({images.length}/5)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={isLoading || !title.trim() || !content.trim()}
                    style={[
                        styles.submitBtn,
                        { backgroundColor: title.trim() && content.trim() ? accentColor : COLORS.gray[200] },
                    ]}
                >
                    {isLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: title.trim() && content.trim() ? "#fff" : COLORS.gray[400],
                        }}>
                            게시하기
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    tagPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999, borderWidth: 1 },
    titleInput: {
        fontSize: 18,
        fontWeight: "600",
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    contentInput: {
        fontSize: 14,
        lineHeight: 24,
        paddingVertical: 16,
        minHeight: 192,
    },
    imgThumb: { width: 96, height: 96, borderRadius: 12 },
    imgRemove: {
        position: "absolute",
        top: 4,
        right: 4,
        width: 20,
        height: 20,
        backgroundColor: "rgba(0,0,0,0.5)",
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    toolbar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderTopWidth: 1,
    },
    toolbarBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
    submitBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
});
