/**
 * 게시글 상세 화면
 */

import { useState, useEffect } from "react";
import {
    View, Text, ScrollView, TouchableOpacity,
    Image, TextInput, Alert, ActivityIndicator,
    KeyboardAvoidingView, Platform, StyleSheet,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { API_BASE_URL } from "@/config/constants";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { COLORS } from "@/lib/theme";

interface Comment {
    id: string;
    content: string;
    author: string;
    authorId: string;
    authorAvatar?: string;
    createdAt: string;
    likes: number;
    isLiked?: boolean;
}

interface PostDetail {
    id: string;
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

/**
 * API 응답을 안전하게 정규화 (snake_case ↔ camelCase, null/object 보호)
 * 웹 API가 author_name, created_at 같은 snake_case 또는 nested object로 응답하는 경우 대응.
 * 핵심: Text의 child로 들어가는 모든 필드는 string이어야 함 (객체면 React 에러).
 */
function asString(v: unknown, fallback = ""): string {
    if (typeof v === "string") return v;
    if (typeof v === "number") return String(v);
    return fallback;
}
function asNumber(v: unknown, fallback = 0): number {
    return typeof v === "number" ? v : fallback;
}

function normalizeComment(raw: any): Comment {
    return {
        id: raw?.id != null ? String(raw.id) : "",
        content: asString(raw?.content),
        author: asString(raw?.author ?? raw?.author_name ?? raw?.nickname, "익명"),
        authorId: asString(raw?.authorId ?? raw?.author_id ?? raw?.user_id),
        authorAvatar: typeof raw?.authorAvatar === "string"
            ? raw.authorAvatar
            : typeof raw?.author_avatar === "string"
                ? raw.author_avatar
                : undefined,
        createdAt: asString(raw?.createdAt ?? raw?.created_at),
        likes: asNumber(raw?.likes),
        isLiked: typeof raw?.isLiked === "boolean" ? raw.isLiked : undefined,
    };
}

function normalizePost(raw: any): PostDetail | null {
    if (!raw || typeof raw !== "object") return null;
    return {
        id: raw.id != null ? String(raw.id) : "",
        title: asString(raw.title),
        content: asString(raw.content),
        author: asString(raw.author ?? raw.author_name ?? raw.nickname, "익명"),
        authorId: asString(raw.authorId ?? raw.author_id ?? raw.user_id),
        authorAvatar: typeof raw.authorAvatar === "string"
            ? raw.authorAvatar
            : typeof raw.author_avatar === "string"
                ? raw.author_avatar
                : undefined,
        authorPetImage: typeof raw.authorPetImage === "string"
            ? raw.authorPetImage
            : typeof raw.author_pet_image === "string"
                ? raw.author_pet_image
                : undefined,
        likes: asNumber(raw.likes),
        comments: asNumber(raw.comments ?? raw.comments_count),
        views: asNumber(raw.views),
        isLiked: typeof raw.isLiked === "boolean" ? raw.isLiked : undefined,
        images: Array.isArray(raw.images) ? raw.images.filter((x: unknown) => typeof x === "string") : undefined,
        tag: typeof raw.tag === "string" ? raw.tag : undefined,
        subcategory: typeof raw.subcategory === "string" ? raw.subcategory : undefined,
        createdAt: asString(raw.createdAt ?? raw.created_at),
    };
}

export default function PostDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { session } = useAuth();
    const { isMemorialMode } = usePet();
    const [post, setPost] = useState<PostDetail | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [commentInput, setCommentInput] = useState("");
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [isLiking, setIsLiking] = useState(false);

    const accentColor = isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500];

    useEffect(() => { loadPost(); }, [id]);

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
                setPost(normalizePost(data?.post ?? data));
            }
            if (commentsRes.ok) {
                const data = await commentsRes.json();
                const list = Array.isArray(data?.comments)
                    ? data.comments
                    : Array.isArray(data)
                        ? data
                        : [];
                setComments(list.map(normalizeComment));
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
                setComments((prev) => [...prev, normalizeComment(data?.comment ?? data)]);
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
            <View style={styles.loading}>
                <ActivityIndicator size="large" color={COLORS.memento[500]} />
            </View>
        );
    }

    if (!post) {
        return (
            <View style={styles.loading}>
                <Text style={{ color: COLORS.gray[400] }}>게시글을 불러올 수 없습니다.</Text>
            </View>
        );
    }

    const bgColor = isMemorialMode ? COLORS.gray[950] : COLORS.white;
    const borderColor = isMemorialMode ? COLORS.gray[800] : COLORS.gray[100];

    return (
        <KeyboardAvoidingView
            style={[styles.flex1, { backgroundColor: bgColor }]}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <ScrollView style={styles.flex1} showsVerticalScrollIndicator={false}>
                <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
                    {post.tag && (
                        <View style={[styles.tagBadge, { backgroundColor: accentColor + "20" }]}>
                            <Text style={{ fontSize: 12, fontWeight: "500", color: accentColor }}>{post.tag}</Text>
                        </View>
                    )}

                    <Text style={{
                        fontSize: 18,
                        fontWeight: "bold",
                        lineHeight: 28,
                        marginBottom: 12,
                        color: isMemorialMode ? COLORS.white : COLORS.gray[900],
                    }}>
                        {post.title}
                    </Text>

                    <View style={styles.authorRow}>
                        {post.authorAvatar ? (
                            <Image source={{ uri: post.authorAvatar }} style={styles.authorAvatar} />
                        ) : (
                            <View style={[styles.authorAvatar, styles.authorAvatarFallback]}>
                                <Ionicons name="person" size={16} color={COLORS.gray[400]} />
                            </View>
                        )}
                        <View>
                            <Text style={{
                                fontSize: 14,
                                fontWeight: "500",
                                color: isMemorialMode ? COLORS.white : COLORS.gray[800],
                            }}>
                                {post.author}
                            </Text>
                            <Text style={{ fontSize: 12, color: COLORS.gray[400] }}>{post.createdAt}</Text>
                        </View>
                    </View>

                    {post.images && post.images.length > 0 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
                            {post.images.map((img, i) => (
                                <Image key={i} source={{ uri: img }} style={styles.postImg} resizeMode="cover" />
                            ))}
                        </ScrollView>
                    )}

                    <Text
                        style={{
                            fontSize: 14,
                            lineHeight: 24,
                            marginBottom: 16,
                            color: isMemorialMode ? COLORS.gray[300] : COLORS.gray[700],
                        }}
                        selectable
                    >
                        {post.content}
                    </Text>

                    <View style={[styles.reactionRow, { borderColor }]}>
                        <TouchableOpacity onPress={handleLike} style={styles.reactionBtn} activeOpacity={0.7}>
                            <Ionicons
                                name={post.isLiked ? "heart" : "heart-outline"}
                                size={20}
                                color={post.isLiked ? "#EF4444" : COLORS.gray[400]}
                            />
                            <Text style={{ fontSize: 14, color: isMemorialMode ? COLORS.gray[400] : COLORS.gray[500] }}>
                                {post.likes}
                            </Text>
                        </TouchableOpacity>
                        <View style={styles.reactionBtn}>
                            <Ionicons name="chatbubble-outline" size={18} color={COLORS.gray[400]} />
                            <Text style={{ fontSize: 14, color: COLORS.gray[400] }}>{post.comments}</Text>
                        </View>
                        <View style={styles.reactionBtn}>
                            <Ionicons name="eye-outline" size={18} color={COLORS.gray[400]} />
                            <Text style={{ fontSize: 14, color: COLORS.gray[400] }}>{post.views}</Text>
                        </View>
                    </View>

                    <Text style={{
                        fontSize: 14,
                        fontWeight: "600",
                        marginBottom: 12,
                        color: isMemorialMode ? COLORS.gray[300] : COLORS.gray[700],
                    }}>
                        댓글 {comments.length}
                    </Text>
                    {comments.map((c) => (
                        <CommentItem key={c.id} comment={c} isMemorialMode={isMemorialMode} />
                    ))}
                    {comments.length === 0 && (
                        <Text style={{ fontSize: 14, color: COLORS.gray[400], textAlign: "center", paddingVertical: 16 }}>
                            첫 댓글을 남겨보세요.
                        </Text>
                    )}
                </View>
            </ScrollView>

            {session && (
                <View style={[styles.inputRow, { borderTopColor: borderColor }]}>
                    <TextInput
                        style={[
                            styles.commentInput,
                            {
                                backgroundColor: isMemorialMode ? COLORS.gray[800] : COLORS.gray[100],
                                color: isMemorialMode ? COLORS.white : COLORS.gray[900],
                            },
                        ]}
                        placeholder="댓글 입력..."
                        placeholderTextColor={COLORS.gray[400]}
                        value={commentInput}
                        onChangeText={setCommentInput}
                        multiline
                    />
                    <TouchableOpacity
                        onPress={submitComment}
                        disabled={!commentInput.trim() || isSubmittingComment}
                        style={[
                            styles.sendBtn,
                            { backgroundColor: commentInput.trim() ? accentColor : COLORS.gray[200] },
                        ]}
                    >
                        {isSubmittingComment ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Ionicons name="arrow-up" size={18} color={commentInput.trim() ? "#fff" : COLORS.gray[400]} />
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </KeyboardAvoidingView>
    );
}

function CommentItem({ comment, isMemorialMode }: { comment: Comment; isMemorialMode: boolean }) {
    return (
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
            {comment.authorAvatar ? (
                <Image source={{ uri: comment.authorAvatar }} style={styles.commentAvatar} />
            ) : (
                <View style={[styles.commentAvatar, styles.commentAvatarFallback]}>
                    <Ionicons name="person" size={13} color={COLORS.gray[400]} />
                </View>
            )}
            <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <Text style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: isMemorialMode ? COLORS.white : COLORS.gray[800],
                    }}>
                        {comment.author}
                    </Text>
                    <Text style={{ fontSize: 12, color: COLORS.gray[400] }}>{comment.createdAt}</Text>
                </View>
                <Text style={{
                    fontSize: 14,
                    lineHeight: 20,
                    color: isMemorialMode ? COLORS.gray[300] : COLORS.gray[700],
                }}>
                    {comment.content}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.white, paddingHorizontal: 24 },
    tagBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999, marginBottom: 8 },
    authorRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
    authorAvatar: { width: 32, height: 32, borderRadius: 16 },
    authorAvatarFallback: { backgroundColor: COLORS.gray[200], alignItems: "center", justifyContent: "center" },
    postImg: { width: 240, height: 176, borderRadius: 12 },
    reactionRow: {
        flexDirection: "row",
        gap: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        marginBottom: 16,
    },
    reactionBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
    inputRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
    },
    commentInput: {
        flex: 1,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        maxHeight: 96,
    },
    sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    commentAvatar: { width: 28, height: 28, borderRadius: 14 },
    commentAvatarFallback: { backgroundColor: COLORS.gray[200], alignItems: "center", justifyContent: "center" },
});
