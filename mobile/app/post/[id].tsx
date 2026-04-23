/**
 * 게시글 상세 화면
 */

import { useState, useEffect } from "react";
import {
    View, Text, ScrollView, TouchableOpacity,
    Image, TextInput, Alert, ActivityIndicator,
    KeyboardAvoidingView, Platform, FlatList,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { API_BASE_URL } from "@/config/constants";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";

interface Comment {
    id: number;
    content: string;
    author: string;
    authorId: string;
    authorAvatar?: string;
    createdAt: string;
    likes: number;
    isLiked?: boolean;
}

interface PostDetail {
    id: number;
    title: string;
    content: string;
    author: string;
    authorId: string;
    authorAvatar?: string;
    authorPetImage?: string;
    likes: number;
    comments: number;
    views: number;
    isLiked?: boolean;
    images?: string[];
    tag?: string;
    subcategory?: string;
    createdAt: string;
}

export default function PostDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { session, user } = useAuth();
    const { isMemorialMode } = usePet();
    const [post, setPost] = useState<PostDetail | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [commentInput, setCommentInput] = useState("");
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [isLiking, setIsLiking] = useState(false);

    const accentColor = isMemorialMode ? "#F59E0B" : "#05B2DC";

    useEffect(() => {
        loadPost();
    }, [id]);

    async function loadPost() {
        try {
            const headers: Record<string, string> = {};
            if (session) headers["Authorization"] = `Bearer ${session.access_token}`;

            const [postRes, commentsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/posts/${id}`, { headers }),
                fetch(`${API_BASE_URL}/api/posts/${id}/comments`, { headers }),
            ]);

            if (postRes.ok) {
                const data = await postRes.json();
                setPost(data.post ?? data);
            }
            if (commentsRes.ok) {
                const data = await commentsRes.json();
                setComments(data.comments ?? data ?? []);
            }
        } catch {
            // ignore
        } finally {
            setIsLoading(false);
        }
    }

    async function handleLike() {
        if (!session || !post || isLiking) return;
        setIsLiking(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        const newLiked = !post.isLiked;
        setPost((p) => p ? { ...p, isLiked: newLiked, likes: p.likes + (newLiked ? 1 : -1) } : p);

        try {
            await fetch(`${API_BASE_URL}/api/posts/${id}/like`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`,
                },
            });
        } catch {
            // 롤백
            setPost((p) => p ? { ...p, isLiked: !newLiked, likes: p.likes + (newLiked ? -1 : 1) } : p);
        } finally {
            setIsLiking(false);
        }
    }

    async function submitComment() {
        if (!commentInput.trim() || !session || isSubmittingComment) return;
        setIsSubmittingComment(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/posts/${id}/comments`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ content: commentInput.trim() }),
            });
            if (res.ok) {
                const data = await res.json();
                setComments((prev) => [...prev, data.comment ?? data]);
                setCommentInput("");
                setPost((p) => p ? { ...p, comments: p.comments + 1 } : p);
            }
        } catch {
            Alert.alert("오류", "댓글 작성에 실패했습니다.");
        } finally {
            setIsSubmittingComment(false);
        }
    }

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator size="large" color="#05B2DC" />
            </View>
        );
    }

    if (!post) {
        return (
            <View className="flex-1 items-center justify-center bg-white px-6">
                <Text className="text-gray-400">게시글을 불러올 수 없습니다.</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            className={`flex-1 ${isMemorialMode ? "bg-gray-950" : "bg-white"}`}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                <View className="px-5 pt-4 pb-2">
                    {/* 말머리 */}
                    {post.tag && (
                        <View
                            className="self-start px-2.5 py-1 rounded-full mb-2"
                            style={{ backgroundColor: accentColor + "20" }}
                        >
                            <Text className="text-xs font-medium" style={{ color: accentColor }}>{post.tag}</Text>
                        </View>
                    )}

                    {/* 제목 */}
                    <Text className={`text-lg font-bold leading-7 mb-3 ${isMemorialMode ? "text-white" : "text-gray-900"}`}>
                        {post.title}
                    </Text>

                    {/* 작성자 정보 */}
                    <View className="flex-row items-center gap-2 mb-4">
                        {post.authorAvatar ? (
                            <Image source={{ uri: post.authorAvatar }} className="w-8 h-8 rounded-full" />
                        ) : (
                            <View className="w-8 h-8 rounded-full bg-gray-200 items-center justify-center">
                                <Ionicons name="person" size={16} color="#9CA3AF" />
                            </View>
                        )}
                        <View>
                            <Text className={`text-sm font-medium ${isMemorialMode ? "text-white" : "text-gray-800"}`}>
                                {post.author}
                            </Text>
                            <Text className="text-xs text-gray-400">{post.createdAt}</Text>
                        </View>
                    </View>

                    {/* 이미지 */}
                    {post.images && post.images.length > 0 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4" contentContainerStyle={{ gap: 8 }}>
                            {post.images.map((img, i) => (
                                <Image key={i} source={{ uri: img }} className="w-60 h-44 rounded-xl" resizeMode="cover" />
                            ))}
                        </ScrollView>
                    )}

                    {/* 본문 */}
                    <Text
                        className={`text-sm leading-6 mb-4 ${isMemorialMode ? "text-gray-300" : "text-gray-700"}`}
                        selectable
                    >
                        {post.content}
                    </Text>

                    {/* 반응 버튼 */}
                    <View className="flex-row gap-4 py-3 border-t border-b mb-4" style={{ borderColor: isMemorialMode ? "#1F2937" : "#F3F4F6" }}>
                        <TouchableOpacity onPress={handleLike} className="flex-row items-center gap-1.5" activeOpacity={0.7}>
                            <Ionicons
                                name={post.isLiked ? "heart" : "heart-outline"}
                                size={20}
                                color={post.isLiked ? "#EF4444" : "#9CA3AF"}
                            />
                            <Text className={`text-sm ${isMemorialMode ? "text-gray-400" : "text-gray-500"}`}>
                                {post.likes}
                            </Text>
                        </TouchableOpacity>
                        <View className="flex-row items-center gap-1.5">
                            <Ionicons name="chatbubble-outline" size={18} color="#9CA3AF" />
                            <Text className="text-sm text-gray-400">{post.comments}</Text>
                        </View>
                        <View className="flex-row items-center gap-1.5">
                            <Ionicons name="eye-outline" size={18} color="#9CA3AF" />
                            <Text className="text-sm text-gray-400">{post.views}</Text>
                        </View>
                    </View>

                    {/* 댓글 */}
                    <Text className={`text-sm font-semibold mb-3 ${isMemorialMode ? "text-gray-300" : "text-gray-700"}`}>
                        댓글 {comments.length}
                    </Text>
                    {comments.map((c) => (
                        <CommentItem key={c.id} comment={c} isMemorialMode={isMemorialMode} />
                    ))}
                    {comments.length === 0 && (
                        <Text className="text-sm text-gray-400 text-center py-4">
                            첫 댓글을 남겨보세요.
                        </Text>
                    )}
                </View>
            </ScrollView>

            {/* 댓글 입력 */}
            {session && (
                <View
                    className="flex-row items-end gap-2 px-4 py-3 border-t"
                    style={{ borderTopColor: isMemorialMode ? "#1F2937" : "#F3F4F6" }}
                >
                    <TextInput
                        className={`flex-1 rounded-2xl px-4 py-3 text-sm max-h-24 ${isMemorialMode ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-900"}`}
                        placeholder="댓글 입력..."
                        placeholderTextColor="#9CA3AF"
                        value={commentInput}
                        onChangeText={setCommentInput}
                        multiline
                    />
                    <TouchableOpacity
                        onPress={submitComment}
                        disabled={!commentInput.trim() || isSubmittingComment}
                        className="w-10 h-10 rounded-full items-center justify-center"
                        style={{ backgroundColor: commentInput.trim() ? accentColor : "#E5E7EB" }}
                    >
                        {isSubmittingComment ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Ionicons name="arrow-up" size={18} color={commentInput.trim() ? "#fff" : "#9CA3AF"} />
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </KeyboardAvoidingView>
    );
}

function CommentItem({ comment, isMemorialMode }: { comment: Comment; isMemorialMode: boolean }) {
    return (
        <View className="flex-row gap-2.5 mb-4">
            {comment.authorAvatar ? (
                <Image source={{ uri: comment.authorAvatar }} className="w-7 h-7 rounded-full flex-shrink-0" />
            ) : (
                <View className="w-7 h-7 rounded-full bg-gray-200 items-center justify-center flex-shrink-0">
                    <Ionicons name="person" size={13} color="#9CA3AF" />
                </View>
            )}
            <View className="flex-1">
                <View className="flex-row items-center gap-2 mb-0.5">
                    <Text className={`text-xs font-semibold ${isMemorialMode ? "text-white" : "text-gray-800"}`}>
                        {comment.author}
                    </Text>
                    <Text className="text-xs text-gray-400">{comment.createdAt}</Text>
                </View>
                <Text className={`text-sm leading-5 ${isMemorialMode ? "text-gray-300" : "text-gray-700"}`}>
                    {comment.content}
                </Text>
            </View>
        </View>
    );
}
