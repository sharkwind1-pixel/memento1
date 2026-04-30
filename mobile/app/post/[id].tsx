/**
 * 게시글 상세 화면
 */

import { useState, useEffect } from "react";
import {
    View, Text, ScrollView, TouchableOpacity,
    Image, TextInput, Alert, ActivityIndicator,
    KeyboardAvoidingView, Platform, Share, StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { API_BASE_URL } from "@/config/constants";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { useDarkMode } from "@/contexts/ThemeContext";
import { COLORS } from "@/lib/theme";
import AppHeader from "@/components/common/AppHeader";

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
    const { isDarkMode } = useDarkMode();
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { session, user } = useAuth();
    const { isMemorialMode } = usePet();
    const insets = useSafeAreaInsets();
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

    async function handleShare() {
        if (!post) return;
        const url = `https://mementoani.com/?postId=${post.id}`;
        try {
            await Share.share({
                title: post.title,
                message: `${post.title}\n\n${url}`,
                url,
            });
        } catch {
            // 사용자 취소
        }
    }

    function handleMore() {
        if (!post) return;
        const isAuthor = user && post.authorId && user.id === post.authorId;
        const options = isAuthor
            ? [
                { text: "취소", style: "cancel" as const },
                {
                    text: "삭제",
                    style: "destructive" as const,
                    onPress: confirmDelete,
                },
            ]
            : [
                { text: "취소", style: "cancel" as const },
                { text: "신고", style: "destructive" as const, onPress: showReportPicker },
            ];
        Alert.alert(
            isAuthor ? "이 게시글" : "게시글",
            isAuthor ? "어떻게 할까요?" : "신고하시겠어요?",
            options,
        );
    }

    function showReportPicker() {
        const reasons: Array<{ id: "spam" | "abuse" | "inappropriate" | "harassment" | "misinformation" | "other"; label: string }> = [
            { id: "spam", label: "스팸/광고" },
            { id: "abuse", label: "욕설/비방" },
            { id: "inappropriate", label: "부적절한 내용" },
            { id: "harassment", label: "괴롭힘" },
            { id: "misinformation", label: "허위 정보" },
            { id: "other", label: "기타" },
        ];
        Alert.alert(
            "신고 사유",
            "사유를 선택해주세요",
            [
                ...reasons.map((r) => ({ text: r.label, onPress: () => submitReport(r.id) })),
                { text: "취소", style: "cancel" as const },
            ],
        );
    }

    async function submitReport(reason: string) {
        if (!session || !post) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/reports`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    targetType: "post",
                    targetId: post.id,
                    reason,
                }),
            });
            if (res.ok) {
                Alert.alert("신고 접수", "검토 후 조치할게요. 감사합니다.");
            } else {
                const data = await res.json().catch(() => ({}));
                Alert.alert("실패", data?.error || "신고 접수에 실패했어요");
            }
        } catch {
            Alert.alert("오류", "네트워크 오류가 발생했어요");
        }
    }

    function confirmDelete() {
        Alert.alert("게시글 삭제", "정말 삭제할까요? 되돌릴 수 없어요.", [
            { text: "취소", style: "cancel" },
            { text: "삭제", style: "destructive", onPress: doDelete },
        ]);
    }

    async function doDelete() {
        if (!session || !post) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/posts/${post.id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${session.access_token}` },
            });
            if (res.ok) {
                router.back();
            } else {
                Alert.alert("실패", "게시글 삭제에 실패했어요");
            }
        } catch {
            Alert.alert("오류", "네트워크 오류가 발생했어요");
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

    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.white;
    const borderColor = isDarkMode ? COLORS.gray[800] : COLORS.gray[100];

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
                <Stack.Screen options={{ headerShown: false }} />
                <AppHeader showBack title="게시글" hideActions />
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color={COLORS.memento[500]} />
                </View>
            </SafeAreaView>
        );
    }

    if (!post) {
        return (
            <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
                <Stack.Screen options={{ headerShown: false }} />
                <AppHeader showBack title="게시글" hideActions />
                <View style={styles.loading}>
                    <Text style={{ color: COLORS.gray[400] }}>게시글을 불러올 수 없습니다.</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
            <Stack.Screen options={{ headerShown: false }} />
            <AppHeader showBack title="게시글" hideActions />
            <KeyboardAvoidingView
                style={styles.flex1}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
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
                        color: isDarkMode ? COLORS.white : COLORS.gray[900],
                    }}>
                        {post.title}
                    </Text>

                    <TouchableOpacity
                        style={styles.authorRow}
                        activeOpacity={post.authorId ? 0.7 : 1}
                        disabled={!post.authorId}
                        onPress={() => {
                            if (post.authorId) router.push(`/minihompy/${post.authorId}`);
                        }}
                    >
                        {post.authorAvatar ? (
                            <Image source={{ uri: post.authorAvatar }} style={styles.authorAvatar} />
                        ) : (
                            <View style={[styles.authorAvatar, styles.authorAvatarFallback]}>
                                <Ionicons name="person" size={16} color={COLORS.gray[400]} />
                            </View>
                        )}
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                <Text style={{
                                    fontSize: 14,
                                    fontWeight: "500",
                                    color: isDarkMode ? COLORS.white : COLORS.gray[800],
                                }}>
                                    {post.author}
                                </Text>
                                {post.authorId && (
                                    <Ionicons name="chevron-forward" size={12} color={COLORS.gray[400]} />
                                )}
                            </View>
                            <Text style={{ fontSize: 12, color: COLORS.gray[400] }}>{post.createdAt}</Text>
                        </View>
                    </TouchableOpacity>

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
                            color: isDarkMode ? COLORS.gray[300] : COLORS.gray[700],
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
                            <Text style={{ fontSize: 14, color: isDarkMode ? COLORS.gray[400] : COLORS.gray[500] }}>
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
                        <View style={{ flex: 1 }} />
                        <TouchableOpacity onPress={handleShare} style={styles.reactionIconBtn} activeOpacity={0.7} hitSlop={8}>
                            <Ionicons name="share-outline" size={18} color={COLORS.gray[500]} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleMore} style={styles.reactionIconBtn} activeOpacity={0.7} hitSlop={8}>
                            <Ionicons name="ellipsis-horizontal" size={18} color={COLORS.gray[500]} />
                        </TouchableOpacity>
                    </View>

                    <Text style={{
                        fontSize: 14,
                        fontWeight: "600",
                        marginBottom: 12,
                        color: isDarkMode ? COLORS.gray[300] : COLORS.gray[700],
                    }}>
                        댓글 {comments.length}
                    </Text>
                    {comments.map((c) => (
                        <CommentItem
                            key={c.id}
                            comment={c}
                            isMemorialMode={isMemorialMode}
                            currentUserId={user?.id ?? null}
                            accessToken={session?.access_token ?? null}
                            postId={String(id)}
                            onAuthorPress={(authorId) => router.push(`/minihompy/${authorId}`)}
                            onDeleted={(commentId) => {
                                setComments((prev) => prev.filter((x) => x.id !== commentId));
                                setPost((p) => p ? { ...p, comments: Math.max(0, p.comments - 1) } : p);
                            }}
                        />
                    ))}
                    {comments.length === 0 && (
                        <Text style={{ fontSize: 14, color: COLORS.gray[400], textAlign: "center", paddingVertical: 16 }}>
                            첫 댓글을 남겨보세요.
                        </Text>
                    )}
                </View>
            </ScrollView>

            {session && (
                <View style={[
                    styles.inputRow,
                    {
                        borderTopColor: borderColor,
                        paddingBottom: 12 + Math.max(insets.bottom, 0),
                    },
                ]}>
                    <TextInput
                        style={[
                            styles.commentInput,
                            {
                                backgroundColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[100],
                                color: isDarkMode ? COLORS.white : COLORS.gray[900],
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
        </SafeAreaView>
    );
}

function formatCommentTime(iso: string): string {
    if (!iso) return "";
    try {
        const t = new Date(iso).getTime();
        if (isNaN(t)) return iso;
        const diff = Math.floor((Date.now() - t) / 1000);
        if (diff < 60) return "방금";
        if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
        if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`;
        const d = new Date(t);
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
    } catch { return iso; }
}

function CommentItem({
    comment, isMemorialMode, currentUserId, accessToken, postId, onAuthorPress, onDeleted,
}: {
    comment: Comment;
    isMemorialMode: boolean;
    currentUserId: string | null;
    accessToken: string | null;
    postId: string;
    onAuthorPress: (authorId: string) => void;
    onDeleted: (commentId: string) => void;
}) {
    const { isDarkMode } = useDarkMode();
    const isMine = !!currentUserId && currentUserId === comment.authorId;
    const hasAuthorLink = !!comment.authorId;

    function handleLongPress() {
        if (!isMine || !accessToken) return;
        Alert.alert(
            "댓글 삭제",
            "이 댓글을 삭제할까요?",
            [
                { text: "취소", style: "cancel" },
                {
                    text: "삭제",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const res = await fetch(
                                `${API_BASE_URL}/api/posts/${postId}/comments?commentId=${encodeURIComponent(comment.id)}`,
                                {
                                    method: "DELETE",
                                    headers: { Authorization: `Bearer ${accessToken}` },
                                },
                            );
                            if (!res.ok) {
                                let msg = `HTTP ${res.status}`;
                                try { msg = (await res.json()).error || msg; } catch {}
                                Alert.alert("삭제 실패", msg);
                                return;
                            }
                            onDeleted(comment.id);
                        } catch (e) {
                            Alert.alert("오류", e instanceof Error ? e.message : "");
                        }
                    },
                },
            ],
        );
    }

    return (
        <TouchableOpacity
            activeOpacity={isMine ? 0.7 : 1}
            onLongPress={isMine ? handleLongPress : undefined}
            style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}
        >
            <TouchableOpacity
                onPress={() => hasAuthorLink && onAuthorPress(comment.authorId)}
                disabled={!hasAuthorLink}
                activeOpacity={hasAuthorLink ? 0.7 : 1}
            >
                {comment.authorAvatar ? (
                    <Image source={{ uri: comment.authorAvatar }} style={styles.commentAvatar} />
                ) : (
                    <View style={[styles.commentAvatar, styles.commentAvatarFallback]}>
                        <Ionicons name="person" size={13} color={COLORS.gray[400]} />
                    </View>
                )}
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <TouchableOpacity
                        onPress={() => hasAuthorLink && onAuthorPress(comment.authorId)}
                        disabled={!hasAuthorLink}
                        activeOpacity={hasAuthorLink ? 0.7 : 1}
                    >
                        <Text style={{
                            fontSize: 12,
                            fontWeight: "600",
                            color: isDarkMode ? COLORS.white : COLORS.gray[800],
                        }}>
                            {comment.author}
                        </Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 12, color: COLORS.gray[400] }}>
                        {formatCommentTime(comment.createdAt)}
                    </Text>
                    {isMine && (
                        <View style={styles.myCommentBadge}>
                            <Text style={styles.myCommentBadgeText}>내 댓글</Text>
                        </View>
                    )}
                </View>
                <Text style={{
                    fontSize: 14,
                    lineHeight: 20,
                    color: isDarkMode ? COLORS.gray[300] : COLORS.gray[700],
                }}>
                    {comment.content}
                </Text>
                {isMine && (
                    <Text style={{ fontSize: 10, color: COLORS.gray[400], marginTop: 4 }}>
                        길게 눌러서 삭제
                    </Text>
                )}
            </View>
        </TouchableOpacity>
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
    reactionIconBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
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
    myCommentBadge: {
        paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
        backgroundColor: COLORS.memento[100],
    },
    myCommentBadgeText: { fontSize: 9, fontWeight: "700", color: COLORS.memento[700] },
});
