/**
 * 게시글 상세 화면
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
    View, Text, ScrollView, TouchableOpacity,
    Image, TextInput, Alert, ActivityIndicator,
    KeyboardAvoidingView, Platform, Share, StyleSheet,
    ActionSheetIOS, Linking, Modal,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Video, ResizeMode } from "expo-av";
import { API_BASE_URL } from "@/config/constants";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { useDarkMode } from "@/contexts/ThemeContext";
import { COLORS } from "@/lib/theme";
import AppHeader from "@/components/common/AppHeader";
import { supabase } from "@/lib/supabase";
import { getLevelIcon } from "@/lib/levels";

interface Comment {
    id: string;
    content: string;
    author: string;
    authorId: string;
    authorAvatar?: string;
    authorPoints?: number;
    authorIsAdmin?: boolean;
    createdAt: string;
    likes: number;
    dislikes: number;
    isLiked?: boolean;
    isDisliked?: boolean;
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
    dislikes: number;
    comments: number;
    views: number;
    isLiked?: boolean;
    isDisliked?: boolean;
    images?: string[];
    /** AI 영상 게시글 (자랑 배지) — 비디오 URL */
    videoUrl?: string;
    /** AI 영상 썸네일 (선택) */
    thumbnailUrl?: string;
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
        author: asString(raw?.authorName ?? raw?.authorNickname ?? raw?.author ?? raw?.author_name ?? raw?.nickname, "익명"),
        authorId: asString(raw?.authorId ?? raw?.author_id ?? raw?.userId ?? raw?.user_id),
        authorAvatar: typeof raw?.authorAvatar === "string"
            ? raw.authorAvatar
            : typeof raw?.author_avatar === "string"
                ? raw.author_avatar
                : undefined,
        authorPoints: asNumber(raw?.authorPoints ?? raw?.author_points),
        authorIsAdmin: Boolean(raw?.authorIsAdmin ?? raw?.author_is_admin),
        createdAt: asString(raw?.createdAt ?? raw?.created_at),
        likes: asNumber(raw?.likes),
        dislikes: asNumber(raw?.dislikes ?? raw?.dislike_count),
        isLiked: typeof raw?.isLiked === "boolean"
            ? raw.isLiked
            : typeof raw?.userLiked === "boolean"
                ? raw.userLiked
                : undefined,
        isDisliked: typeof raw?.isDisliked === "boolean"
            ? raw.isDisliked
            : typeof raw?.userDisliked === "boolean"
                ? raw.userDisliked
                : undefined,
    };
}

function normalizePost(raw: any): PostDetail | null {
    if (!raw || typeof raw !== "object") return null;
    return {
        id: raw.id != null ? String(raw.id) : "",
        title: asString(raw.title),
        content: asString(raw.content),
        author: asString(raw.authorName ?? raw.author ?? raw.author_name ?? raw.nickname, "익명"),
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
        dislikes: asNumber(raw.dislikes ?? raw.dislike_count),
        comments: asNumber(raw.comments ?? raw.comments_count),
        views: asNumber(raw.views),
        isLiked: typeof raw.userLiked === "boolean"
            ? raw.userLiked
            : typeof raw.isLiked === "boolean"
                ? raw.isLiked
                : typeof raw.user_liked === "boolean"
                    ? raw.user_liked
                    : undefined,
        isDisliked: typeof raw.userDisliked === "boolean"
            ? raw.userDisliked
            : typeof raw.isDisliked === "boolean"
                ? raw.isDisliked
                : typeof raw.user_disliked === "boolean"
                    ? raw.user_disliked
                    : undefined,
        images: Array.isArray(raw.imageUrls)
            ? raw.imageUrls.filter((x: unknown) => typeof x === "string")
            : Array.isArray(raw.image_urls)
                ? raw.image_urls.filter((x: unknown) => typeof x === "string")
                : Array.isArray(raw.images)
                    ? raw.images.filter((x: unknown) => typeof x === "string")
                    : undefined,
        videoUrl: typeof raw.videoUrl === "string"
            ? raw.videoUrl
            : (typeof raw.video_url === "string" ? raw.video_url : undefined),
        thumbnailUrl: typeof raw.thumbnailUrl === "string"
            ? raw.thumbnailUrl
            : (typeof raw.thumbnail_url === "string" ? raw.thumbnail_url : undefined),
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
    // 첨부 이미지 확대 보기 (새 화면/브라우저 대신 모달, 탭하면 닫힘)
    const [lightboxImg, setLightboxImg] = useState<string | null>(null);
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [isLiking, setIsLiking] = useState(false);
    const [isDisliking, setIsDisliking] = useState(false);

    const accentColor = isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500];

    useEffect(() => { loadPost(); }, [id]);

    // 수정 화면에서 돌아왔을 때 게시글 다시 로드
    const isFirstFocusRef = useRef(true);
    useFocusEffect(
        useCallback(() => {
            if (isFirstFocusRef.current) {
                isFirstFocusRef.current = false;
                return;
            }
            loadPost({ skipView: true });
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [id]),
    );

    // 실시간 동기화 — 다른 사용자가 댓글 달거나 좋아요/비추천 누르면 즉시 반영
    useEffect(() => {
        if (!id) return;
        const channel = supabase
            .channel(`post:${id}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "community_posts", filter: `id=eq.${id}` },
                () => { loadPost({ skipView: true }); },
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "post_comments", filter: `post_id=eq.${id}` },
                () => { loadPost({ skipView: true }); },
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // skipView=true면 조회수 증가 생략 (realtime/포커스 재로드 시). community_posts realtime 구독 +
    // GET의 views write가 만드는 reload churn(→좋아요 낙관적 상태 덮어쓰기=좋아요 실패)을 끊는다.
    // 댓글은 게시글 상세 GET이 enriched 배열(likes/dislikes/userLiked/userDisliked 포함)로 반환하므로
    // 그걸 그대로 사용한다. (예전엔 GET 없는 /comments 엔드포인트를 호출해 앱에서 댓글이 안 보였음)
    async function loadPost(opts?: { skipView?: boolean }) {
        try {
            const headers: Record<string, string> = {};
            if (session) headers["Authorization"] = `Bearer ${session.access_token}`;

            const viewQ = opts?.skipView ? "?skipView=1" : "";
            const postRes = await fetch(`${API_BASE_URL}/api/posts/${id}${viewQ}`, { headers });

            if (postRes.ok) {
                const data = await postRes.json();
                const raw = data?.post ?? data;
                const list = Array.isArray(raw?.comments) ? raw.comments : [];
                const normalized = normalizePost(raw);
                // GET이 post.comments를 댓글 배열로 덮어쓰므로 개수는 배열 길이로 보정
                if (normalized) normalized.comments = list.length;
                setPost(normalized);
                setComments(list.map(normalizeComment));
            }
        } catch {
            // ignore
        } finally {
            setIsLoading(false);
        }
    }

    // 맥락 가입후크 (웹 openAuthModal detail.message 패리티) — 게스트가 상호작용 시도 시 가치문구 + 로그인 경로
    function promptLogin(message: string) {
        Alert.alert("로그인 필요", message, [
            { text: "취소", style: "cancel" },
            { text: "로그인", onPress: () => router.push("/(auth)/login") },
        ]);
    }

    async function handleLike() {
        if (isLiking || !post) return;
        if (!session) { promptLogin("이 글에 마음을 표현하려면 로그인이 필요해요. 무료로 시작할 수 있어요."); return; }
        setIsLiking(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        const newLiked = !post.isLiked;
        // 좋아요 시 비추천 자동 해제
        const wasDisliked = post.isDisliked;
        setPost((p) => p ? {
            ...p,
            isLiked: newLiked,
            likes: p.likes + (newLiked ? 1 : -1),
            isDisliked: newLiked && wasDisliked ? false : p.isDisliked,
            dislikes: newLiked && wasDisliked ? Math.max(0, p.dislikes - 1) : p.dislikes,
        } : p);

        try {
            const res = await fetch(`${API_BASE_URL}/api/posts/${id}/like`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`,
                },
            });
            if (!res.ok) {
                // 롤백
                setPost((p) => p ? {
                    ...p,
                    isLiked: !newLiked,
                    likes: p.likes + (newLiked ? -1 : 1),
                    isDisliked: wasDisliked,
                    dislikes: wasDisliked ? p.dislikes + (newLiked ? 1 : 0) : p.dislikes,
                } : p);
            } else {
                // 서버가 양쪽(좋아요+비추천) 최신 상태/카운트를 반환 → 권위적으로 보정 (낙관적 추정 교정)
                const data = await res.json().catch(() => null);
                if (data && typeof data === "object") {
                    setPost((p) => p ? {
                        ...p,
                        isLiked: typeof data.liked === "boolean" ? data.liked : p.isLiked,
                        likes: typeof data.likes === "number" ? data.likes : p.likes,
                        isDisliked: typeof data.disliked === "boolean" ? data.disliked : p.isDisliked,
                        dislikes: typeof data.dislikes === "number" ? data.dislikes : p.dislikes,
                    } : p);
                }
            }
        } catch {
            setPost((p) => p ? {
                ...p,
                isLiked: !newLiked,
                likes: p.likes + (newLiked ? -1 : 1),
                isDisliked: wasDisliked,
                dislikes: wasDisliked ? p.dislikes + (newLiked ? 1 : 0) : p.dislikes,
            } : p);
        } finally {
            setIsLiking(false);
        }
    }

    async function handleDislike() {
        if (isDisliking || !post) return;
        if (!session) { promptLogin("이 글에 의견을 남기려면 로그인이 필요해요. 무료로 시작할 수 있어요."); return; }
        setIsDisliking(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        const newDisliked = !post.isDisliked;
        const wasLiked = post.isLiked;
        // 비추천 시 좋아요 자동 해제
        setPost((p) => p ? {
            ...p,
            isDisliked: newDisliked,
            dislikes: p.dislikes + (newDisliked ? 1 : -1),
            isLiked: newDisliked && wasLiked ? false : p.isLiked,
            likes: newDisliked && wasLiked ? Math.max(0, p.likes - 1) : p.likes,
        } : p);

        try {
            const res = await fetch(`${API_BASE_URL}/api/posts/${id}/dislike`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
            });
            if (!res.ok) {
                setPost((p) => p ? {
                    ...p,
                    isDisliked: !newDisliked,
                    dislikes: p.dislikes + (newDisliked ? -1 : 1),
                    isLiked: wasLiked,
                    likes: wasLiked ? p.likes + (newDisliked ? 1 : 0) : p.likes,
                } : p);
            } else {
                // 서버가 양쪽 최신 상태/카운트를 반환 → 권위적으로 보정
                const data = await res.json().catch(() => null);
                if (data && typeof data === "object") {
                    setPost((p) => p ? {
                        ...p,
                        isDisliked: typeof data.disliked === "boolean" ? data.disliked : p.isDisliked,
                        dislikes: typeof data.dislikes === "number" ? data.dislikes : p.dislikes,
                        isLiked: typeof data.liked === "boolean" ? data.liked : p.isLiked,
                        likes: typeof data.likes === "number" ? data.likes : p.likes,
                    } : p);
                }
            }
        } catch {
            setPost((p) => p ? {
                ...p,
                isDisliked: !newDisliked,
                dislikes: p.dislikes + (newDisliked ? -1 : 1),
                isLiked: wasLiked,
                likes: wasLiked ? p.likes + (newDisliked ? 1 : 0) : p.likes,
            } : p);
        } finally {
            setIsDisliking(false);
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

    function handleEdit() {
        if (!post) return;
        // write 화면이 editId를 받아 PATCH 모드로 동작
        router.push(`/post/write?editId=${post.id}`);
    }

    function handleMore() {
        if (!post) return;
        const isAuthor = user && post.authorId && user.id === post.authorId;

        // iOS는 ActionSheetIOS, Android는 Alert로 fallback
        if (Platform.OS === "ios") {
            const options = isAuthor
                ? ["수정", "삭제", "취소"]
                : ["신고", "공유", "이 사용자 차단", "취소"];
            const destructiveButtonIndex = isAuthor ? 1 : 0;
            const cancelButtonIndex = options.length - 1;
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options,
                    destructiveButtonIndex,
                    cancelButtonIndex,
                    title: isAuthor ? "이 게시글" : "게시글",
                },
                (buttonIndex) => {
                    if (buttonIndex === cancelButtonIndex) return;
                    if (isAuthor && buttonIndex === 0) handleEdit();
                    else if (isAuthor && buttonIndex === 1) confirmDelete();
                    else if (!isAuthor && buttonIndex === 0) showReportPicker();
                    else if (!isAuthor && buttonIndex === 1) handleShare();
                    else if (!isAuthor && buttonIndex === 2) confirmBlock();
                },
            );
        } else {
            const options = isAuthor
                ? [
                    { text: "취소", style: "cancel" as const },
                    { text: "수정", onPress: handleEdit },
                    {
                        text: "삭제",
                        style: "destructive" as const,
                        onPress: confirmDelete,
                    },
                ]
                : [
                    { text: "취소", style: "cancel" as const },
                    { text: "공유", onPress: handleShare },
                    { text: "신고", style: "destructive" as const, onPress: showReportPicker },
                    { text: "이 사용자 차단", style: "destructive" as const, onPress: confirmBlock },
                ];
            Alert.alert(
                isAuthor ? "이 게시글" : "게시글",
                isAuthor ? "어떻게 할까요?" : "어떻게 할까요?",
                options,
            );
        }
    }

    function confirmBlock() {
        if (!post) return;
        Alert.alert(
            `${post.author}님 차단`,
            "이 사용자의 게시글이 더 이상 보이지 않아요. 설정 > 차단한 사용자에서 해제할 수 있어요.",
            [
                { text: "취소", style: "cancel" },
                {
                    text: "차단",
                    style: "destructive",
                    onPress: doBlock,
                },
            ],
        );
    }

    async function doBlock() {
        if (!session || !post) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/blocks`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ blockedUserId: post.authorId, reason: "" }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data?.error || "차단에 실패했어요");
            }
            Alert.alert("차단 완료", `${post.author}님을 차단했어요.`, [
                { text: "확인", onPress: () => router.back() },
            ]);
        } catch (e) {
            Alert.alert("실패", e instanceof Error ? e.message : "다시 시도해주세요.");
        }
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

        if (Platform.OS === "ios") {
            const options = [...reasons.map((r) => r.label), "취소"];
            const cancelButtonIndex = options.length - 1;
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options,
                    cancelButtonIndex,
                    title: "신고 사유",
                    message: "사유를 선택해주세요",
                },
                (buttonIndex) => {
                    if (buttonIndex === cancelButtonIndex || buttonIndex === undefined) return;
                    submitReport(reasons[buttonIndex].id);
                },
            );
        } else {
            Alert.alert(
                "신고 사유",
                "사유를 선택해주세요",
                [
                    ...reasons.map((r) => ({ text: r.label, onPress: () => submitReport(r.id) })),
                    { text: "취소", style: "cancel" as const },
                ],
            );
        }
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
        if (!commentInput.trim() || isSubmittingComment) return;
        if (!session) { promptLogin("댓글을 남기려면 로그인이 필요해요. 무료로 시작할 수 있어요."); return; }
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
                            <Text style={{ fontSize: 12, color: COLORS.gray[400] }}>{formatCommentTime(post.createdAt)}</Text>
                        </View>
                    </TouchableOpacity>

                    {/* AI 영상 (자랑 배지 게시글) — 풀너비 비디오 플레이어 */}
                    {post.videoUrl && (
                        <View style={styles.videoWrap}>
                            <Video
                                source={{ uri: post.videoUrl }}
                                style={styles.videoPlayer}
                                useNativeControls
                                resizeMode={ResizeMode.CONTAIN}
                                shouldPlay={false}
                                isLooping={false}
                                {...(post.thumbnailUrl ? { posterSource: { uri: post.thumbnailUrl }, usePoster: true, posterStyle: styles.videoPlayer } : {})}
                            />
                        </View>
                    )}

                    {/* 첨부 이미지 — 세로 1열 배치 (여러 장이면 위아래로 쌓임, 웹과 패리티) */}
                    {post.images && post.images.length > 0 && (
                        <View style={{ marginBottom: 16, gap: 8 }}>
                            {post.images.map((img, i) => (
                                <TouchableOpacity key={i} activeOpacity={0.9} onPress={() => setLightboxImg(img)}>
                                    <Image source={{ uri: img }} style={styles.postImg} resizeMode="cover" />
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* 첨부 이미지 확대 보기 — 이미지/배경 탭 또는 안드 백버튼으로 닫힘 (웹 ImageLightbox 패리티) */}
                    <Modal visible={lightboxImg !== null} transparent animationType="fade" onRequestClose={() => setLightboxImg(null)}>
                        <TouchableOpacity
                            activeOpacity={1}
                            onPress={() => setLightboxImg(null)}
                            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center" }}
                        >
                            {lightboxImg ? (
                                <Image source={{ uri: lightboxImg }} style={{ width: "100%", height: "85%" }} resizeMode="contain" />
                            ) : null}
                            <View style={{ position: "absolute", top: 44, right: 20 }}>
                                <Ionicons name="close" size={28} color="#fff" />
                            </View>
                        </TouchableOpacity>
                    </Modal>

                    <Text
                        style={{
                            fontSize: 14,
                            lineHeight: 24,
                            marginBottom: 16,
                            color: isDarkMode ? COLORS.gray[300] : COLORS.gray[700],
                        }}
                        selectable
                    >
                        {/* 본문 내 URL을 탭 가능한 링크로 (뉴스 출처 링크 등) — 웹 PostDetailBody와 패리티 */}
                        {(post.content || "").split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                            /^https?:\/\//.test(part) ? (
                                <Text
                                    key={i}
                                    style={{ color: COLORS.memento[600], textDecorationLine: "underline" }}
                                    onPress={() => Linking.openURL(part).catch(() => {})}
                                >
                                    {part}
                                </Text>
                            ) : (
                                part
                            )
                        )}
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
                        <TouchableOpacity onPress={handleDislike} style={styles.reactionBtn} activeOpacity={0.7}>
                            <Ionicons
                                name={post.isDisliked ? "thumbs-down" : "thumbs-down-outline"}
                                size={18}
                                color={post.isDisliked ? "#6B7280" : COLORS.gray[400]}
                            />
                            <Text style={{ fontSize: 14, color: isDarkMode ? COLORS.gray[400] : COLORS.gray[500] }}>
                                {post.dislikes}
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
                            onReactionUpdate={(commentId, patch) => {
                                setComments((prev) => prev.map((x) =>
                                    x.id === commentId ? { ...x, ...patch } : x,
                                ));
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
    comment, isMemorialMode, currentUserId, accessToken, postId, onAuthorPress, onDeleted, onReactionUpdate,
}: {
    comment: Comment;
    isMemorialMode: boolean;
    currentUserId: string | null;
    accessToken: string | null;
    postId: string;
    onAuthorPress: (authorId: string) => void;
    onDeleted: (commentId: string) => void;
    onReactionUpdate: (commentId: string, patch: Partial<Comment>) => void;
}) {
    void isMemorialMode; void postId;
    const { isDarkMode } = useDarkMode();
    const isMine = !!currentUserId && currentUserId === comment.authorId;
    const hasAuthorLink = !!comment.authorId;
    const [reacting, setReacting] = useState(false);
    const router = useRouter();
    // 맥락 가입후크 (웹 패리티) — 게스트가 댓글 반응 시도 시 가치문구 + 로그인 경로
    function promptLogin(message: string) {
        Alert.alert("로그인 필요", message, [
            { text: "취소", style: "cancel" },
            { text: "로그인", onPress: () => router.push("/(auth)/login") },
        ]);
    }

    async function handleLikeComment() {
        if (reacting) return;
        if (!accessToken) { promptLogin("댓글에 공감하려면 로그인이 필요해요. 무료로 시작할 수 있어요."); return; }
        setReacting(true);
        const newLiked = !comment.isLiked;
        const wasDisliked = comment.isDisliked;
        onReactionUpdate(comment.id, {
            isLiked: newLiked,
            likes: comment.likes + (newLiked ? 1 : -1),
            isDisliked: newLiked && wasDisliked ? false : comment.isDisliked,
            dislikes: newLiked && wasDisliked ? Math.max(0, comment.dislikes - 1) : comment.dislikes,
        });
        try {
            const res = await fetch(`${API_BASE_URL}/api/comments/${comment.id}/like`, {
                method: "POST",
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (!res.ok) {
                onReactionUpdate(comment.id, {
                    isLiked: !newLiked,
                    likes: comment.likes,
                    isDisliked: wasDisliked,
                    dislikes: comment.dislikes,
                });
            } else {
                // 서버가 양쪽 최신 상태/카운트를 반환 → 권위적으로 보정
                const data = await res.json().catch(() => null);
                if (data && typeof data === "object") {
                    onReactionUpdate(comment.id, {
                        ...(typeof data.liked === "boolean" ? { isLiked: data.liked } : {}),
                        ...(typeof data.likes === "number" ? { likes: data.likes } : {}),
                        ...(typeof data.disliked === "boolean" ? { isDisliked: data.disliked } : {}),
                        ...(typeof data.dislikes === "number" ? { dislikes: data.dislikes } : {}),
                    });
                }
            }
        } catch {
            onReactionUpdate(comment.id, {
                isLiked: !newLiked,
                likes: comment.likes,
                isDisliked: wasDisliked,
                dislikes: comment.dislikes,
            });
        } finally {
            setReacting(false);
        }
    }

    async function handleDislikeComment() {
        if (reacting) return;
        if (!accessToken) { promptLogin("댓글에 의견을 남기려면 로그인이 필요해요. 무료로 시작할 수 있어요."); return; }
        setReacting(true);
        const newDisliked = !comment.isDisliked;
        const wasLiked = comment.isLiked;
        onReactionUpdate(comment.id, {
            isDisliked: newDisliked,
            dislikes: comment.dislikes + (newDisliked ? 1 : -1),
            isLiked: newDisliked && wasLiked ? false : comment.isLiked,
            likes: newDisliked && wasLiked ? Math.max(0, comment.likes - 1) : comment.likes,
        });
        try {
            const res = await fetch(`${API_BASE_URL}/api/comments/${comment.id}/dislike`, {
                method: "POST",
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (!res.ok) {
                onReactionUpdate(comment.id, {
                    isDisliked: !newDisliked,
                    dislikes: comment.dislikes,
                    isLiked: wasLiked,
                    likes: comment.likes,
                });
            } else {
                // 서버가 양쪽 최신 상태/카운트를 반환 → 권위적으로 보정
                const data = await res.json().catch(() => null);
                if (data && typeof data === "object") {
                    onReactionUpdate(comment.id, {
                        ...(typeof data.disliked === "boolean" ? { isDisliked: data.disliked } : {}),
                        ...(typeof data.dislikes === "number" ? { dislikes: data.dislikes } : {}),
                        ...(typeof data.liked === "boolean" ? { isLiked: data.liked } : {}),
                        ...(typeof data.likes === "number" ? { likes: data.likes } : {}),
                    });
                }
            }
        } catch {
            onReactionUpdate(comment.id, {
                isDisliked: !newDisliked,
                dislikes: comment.dislikes,
                isLiked: wasLiked,
                likes: comment.likes,
            });
        } finally {
            setReacting(false);
        }
    }

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
                        <Image
                            source={getLevelIcon(comment.authorPoints ?? 0, "dog", comment.authorIsAdmin ?? false)}
                            style={styles.commentAvatarLevelIcon}
                            resizeMode="contain"
                        />
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
                <View style={styles.commentReactionRow}>
                    <TouchableOpacity
                        onPress={handleLikeComment}
                        disabled={!accessToken || reacting}
                        hitSlop={6}
                        style={styles.commentReactionBtn}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={comment.isLiked ? "heart" : "heart-outline"}
                            size={13}
                            color={comment.isLiked ? "#EF4444" : COLORS.gray[400]}
                        />
                        <Text style={[styles.commentReactionText, comment.isLiked && { color: "#EF4444" }]}>
                            {comment.likes}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={handleDislikeComment}
                        disabled={!accessToken || reacting}
                        hitSlop={6}
                        style={styles.commentReactionBtn}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={comment.isDisliked ? "thumbs-down" : "thumbs-down-outline"}
                            size={12}
                            color={comment.isDisliked ? "#6B7280" : COLORS.gray[400]}
                        />
                        <Text style={[styles.commentReactionText, comment.isDisliked && { color: "#6B7280" }]}>
                            {comment.dislikes}
                        </Text>
                    </TouchableOpacity>
                    {isMine && (
                        <Text style={{ fontSize: 10, color: COLORS.gray[400] }}>
                            길게 눌러서 삭제
                        </Text>
                    )}
                </View>
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
    postImg: { width: "100%", height: 260, borderRadius: 12 },
    videoWrap: {
        marginBottom: 16,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "#000",
    },
    videoPlayer: {
        width: "100%",
        aspectRatio: 16 / 9,
    },
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
    commentAvatarFallback: { backgroundColor: COLORS.gray[200], alignItems: "center", justifyContent: "center", overflow: "hidden" },
    commentAvatarLevelIcon: { width: 26, height: 26 },
    commentReactionRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginTop: 6,
    },
    commentReactionBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
    },
    commentReactionText: {
        fontSize: 11,
        color: COLORS.gray[500],
        fontWeight: "500",
    },
    myCommentBadge: {
        paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
        backgroundColor: COLORS.memento[100],
    },
    myCommentBadgeText: { fontSize: 9, fontWeight: "700", color: COLORS.memento[700] },
});
