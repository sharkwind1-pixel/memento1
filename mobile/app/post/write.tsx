/**
 * 게시글 작성 화면 — 웹 src/components/features/community/WritePostModal.tsx 1:1 이식.
 *
 * 핵심 차이점 (이전 모바일 버전 → 진짜 동작):
 *  - multipart 폐기. 서버는 request.json()만 받음.
 *  - 이미지: ImagePicker → Supabase Storage 업로드(community/{userId}/...) → URL 누적
 *    → 마지막 JSON POST에 imageUrls 배열로 동봉
 *  - 서브카테고리별 badge (자유/추모/입양/지역/분실 5종 다 다름)
 *  - 자유게시판 말머리(animalType) — 종 평등 11종
 *  - 지역(region): local 게시판만 필수 (LOCAL_REGIONS 17개)
 *  - authorPetId: 본인 펫 선택 (서버가 본인 소유 검증, 위조 시 400)
 *  - isPublic: memorial 게시판만 (홈 공개 토글)
 *  - boardType 키: subcategory가 아니라 boardType (서버 핸들러 매칭)
 *  - authorName: profile.nickname || email split (서버 필수 필드)
 */

import { useState, useEffect, useMemo } from "react";
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    Alert, ActivityIndicator, Image, StyleSheet,
    KeyboardAvoidingView, Platform, FlatList,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { API_BASE_URL } from "@/config/constants";
import { useAuth } from "@/contexts/AuthContext";
import { usePet } from "@/contexts/PetContext";
import { useDarkMode } from "@/contexts/ThemeContext";
import { CommunitySubcategory } from "@/types";
import { COLORS } from "@/lib/theme";
import { uploadCommunityPostImage } from "@/lib/community-upload";
import AppHeader from "@/components/common/AppHeader";
import PhotoCropConfirmModal from "@/components/record/PhotoCropConfirmModal";

// ============================================================================
// 상수 (웹 WritePostModal과 동일)
// ============================================================================

const MAX_IMAGES = 5;

const BADGES_BY_SUBCATEGORY: Record<string, string[]> = {
    free: ["일상", "자랑", "질문", "수다", "꿀팁"],
    memorial: ["위로", "추억", "고민", "감사"],
    adoption: ["입양", "분양", "긴급"],
    local: ["추천", "정보", "모임", "후기"],
    lost: ["분실", "발견"],
};

// 자유게시판 말머리 (종 평등 11종)
const POST_TAGS = [
    "일상", "정보", "질문",
    "강아지", "고양이",
    "햄스터", "토끼", "작은포유류",
    "새", "파충류", "물고기",
];

const LOCAL_REGIONS = [
    "서울", "경기", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
    "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
];

const SUBCATEGORY_LABELS: Record<string, string> = {
    free: "자유게시판",
    memorial: "기억게시판",
    adoption: "입양정보",
    local: "지역정보",
    lost: "분실동물",
};

// ============================================================================
// 화면
// ============================================================================

export default function WritePostScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isDarkMode } = useDarkMode();
    const { subcategory, editId } = useLocalSearchParams<{
        subcategory?: CommunitySubcategory;
        editId?: string;
    }>();
    const { session, user, profile } = useAuth();
    const { pets, isMemorialMode } = usePet();

    const isEditMode = !!editId;

    // 편집 모드 — 서버에서 게시글 로드 후 boardType/badge/tag/region 등 채움
    const [editLoaded, setEditLoaded] = useState(!isEditMode);
    const [loadedBoardType, setLoadedBoardType] = useState<CommunitySubcategory | null>(null);

    const boardType: CommunitySubcategory =
        loadedBoardType ?? ((subcategory as CommunitySubcategory) || "free");
    const isFreeBoard = boardType === "free";
    const isLocalBoard = boardType === "local";
    const isMemorial = boardType === "memorial";

    const accentColor = isMemorialMode ? COLORS.memorial[500] : COLORS.memento[500];
    const badges = BADGES_BY_SUBCATEGORY[boardType] || BADGES_BY_SUBCATEGORY.free;

    // 폼 상태
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [badge, setBadge] = useState<string>("");
    const [tag, setTag] = useState<string>("");
    const [region, setRegion] = useState("");
    const [authorPetId, setAuthorPetId] = useState<string>("");
    const [isPublic, setIsPublic] = useState(false);

    // 이미지 (URI 또는 업로드된 URL)
    const [images, setImages] = useState<Array<{ uri: string; uploaded?: string; uploading?: boolean }>>([]);
    const [submitting, setSubmitting] = useState(false);

    // 이미지 에디터 (크롭/회전) 상태
    const [editingImage, setEditingImage] = useState<{ uri: string; index: number } | null>(null);

    const userNickname = useMemo(
        () => profile?.nickname || user?.email?.split("@")[0] || "익명",
        [profile?.nickname, user?.email],
    );

    // boardType 변경 시 상태 초기화 (편집 모드는 제외 — 서버 데이터 보존)
    useEffect(() => {
        if (isEditMode) return;
        setBadge("");
        setTag("");
        setRegion("");
        setAuthorPetId("");
        setIsPublic(false);
    }, [boardType, isEditMode]);

    // 편집 모드: 기존 게시글 로드 → 폼 채움
    useEffect(() => {
        if (!isEditMode || !editId || !session?.access_token) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/posts/${editId}`, {
                    headers: { Authorization: `Bearer ${session.access_token}` },
                });
                if (!res.ok) {
                    Alert.alert("불러오기 실패", "게시글을 불러오지 못했어요.", [
                        { text: "확인", onPress: () => router.back() },
                    ]);
                    return;
                }
                const data = await res.json();
                const post = data?.post ?? data;
                if (cancelled || !post) return;

                // 본인 글인지 클라이언트에서도 확인 (서버는 PATCH 시 다시 검증)
                const authorId = post.authorId ?? post.author_id ?? post.user_id;
                if (user && authorId && authorId !== user.id) {
                    Alert.alert("권한 없음", "본인 게시글만 수정할 수 있어요.", [
                        { text: "확인", onPress: () => router.back() },
                    ]);
                    return;
                }

                setLoadedBoardType(
                    (post.subcategory ?? post.boardType ?? "free") as CommunitySubcategory,
                );
                setTitle(typeof post.title === "string" ? post.title : "");
                setContent(typeof post.content === "string" ? post.content : "");
                setBadge(typeof post.badge === "string" ? post.badge : "");
                setTag(typeof post.tag === "string"
                    ? post.tag
                    : typeof post.animalType === "string"
                        ? post.animalType
                        : "");
                setRegion(typeof post.region === "string" ? post.region : "");
                if (typeof post.isPublic === "boolean") setIsPublic(post.isPublic);
                else if (typeof post.is_public === "boolean") setIsPublic(post.is_public);

                // 이미지: 이미 업로드된 URL이라 uploaded만 채움
                const imageUrls: string[] = Array.isArray(post.imageUrls)
                    ? post.imageUrls.filter((x: unknown) => typeof x === "string")
                    : Array.isArray(post.image_urls)
                        ? post.image_urls.filter((x: unknown) => typeof x === "string")
                        : Array.isArray(post.images)
                            ? post.images.filter((x: unknown) => typeof x === "string")
                            : [];
                setImages(imageUrls.map((url) => ({ uri: url, uploaded: url })));
                setEditLoaded(true);
            } catch {
                Alert.alert("불러오기 실패", "네트워크 오류가 발생했어요.", [
                    { text: "확인", onPress: () => router.back() },
                ]);
            }
        })();
        return () => { cancelled = true; };
    }, [isEditMode, editId, session?.access_token, user, router]);

    // ============================================
    // 이미지 선택 + 업로드
    // ============================================
    async function pickImages() {
        if (!user) {
            Alert.alert("로그인 필요", "로그인 후 이미지를 첨부할 수 있어요.");
            return;
        }
        const remaining = MAX_IMAGES - images.length;
        if (remaining <= 0) {
            Alert.alert("이미지 제한", `이미지는 최대 ${MAX_IMAGES}장까지 첨부할 수 있어요.`);
            return;
        }

        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("권한 필요", "갤러리 접근 권한이 필요합니다.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 0.85,
            selectionLimit: remaining,
        });
        if (result.canceled) return;

        // 선택된 자산 → 우선 URI 상태에 추가 (uploading: true)
        const startIdx = images.length;
        const newOnes = result.assets.map((a) => ({
            uri: a.uri,
            uploading: true,
        }));
        setImages((prev) => [...prev, ...newOnes]);

        // 순차 업로드 (병렬은 RN 메모리 부담 → 안정성 우선)
        for (let i = 0; i < result.assets.length; i++) {
            const asset = result.assets[i];
            const idx = startIdx + i;
            const upload = await uploadCommunityPostImage(asset.uri, user.id, {
                mimeType: asset.mimeType,
            });
            if (!upload.success || !upload.url) {
                Alert.alert("업로드 실패", upload.error || "이미지를 업로드하지 못했어요.");
                // 실패 항목 제거
                setImages((prev) => prev.filter((_, k) => k !== idx));
                continue;
            }
            setImages((prev) =>
                prev.map((img, k) =>
                    k === idx ? { ...img, uploaded: upload.url, uploading: false } : img,
                ),
            );
        }
    }

    function removeImage(idx: number) {
        setImages((prev) => prev.filter((_, k) => k !== idx));
    }

    function openImageEditor(idx: number) {
        const img = images[idx];
        if (!img) return;
        // 업로드된 원격 URL은 expo-image-manipulator가 fetch해서 처리 가능. 로컬 uri 우선.
        setEditingImage({ uri: img.uploaded ?? img.uri, index: idx });
    }

    async function handleEditedImage(finalUri: string) {
        const target = editingImage;
        setEditingImage(null);
        if (!target || !user) return;

        // 편집된 이미지를 다시 업로드 (uploading 상태로)
        setImages((prev) => prev.map((img, k) =>
            k === target.index ? { uri: finalUri, uploading: true } : img,
        ));
        const upload = await uploadCommunityPostImage(finalUri, user.id, {
            mimeType: "image/jpeg",
        });
        if (!upload.success || !upload.url) {
            Alert.alert("업로드 실패", upload.error || "편집된 이미지를 업로드하지 못했어요.");
            // 실패 시 해당 슬롯 제거
            setImages((prev) => prev.filter((_, k) => k !== target.index));
            return;
        }
        setImages((prev) => prev.map((img, k) =>
            k === target.index ? { uri: finalUri, uploaded: upload.url, uploading: false } : img,
        ));
    }

    // ============================================
    // 제출
    // ============================================
    async function handleSubmit() {
        if (!session || !user) {
            Alert.alert("로그인 필요", "로그인 후 게시글을 작성할 수 있어요.");
            return;
        }
        if (!title.trim() || !content.trim()) {
            Alert.alert("입력 필요", "제목과 내용을 입력해주세요.");
            return;
        }
        if (!badge) {
            Alert.alert("배지 선택 필요", `${SUBCATEGORY_LABELS[boardType]}의 배지를 선택해주세요.`);
            return;
        }
        if (isFreeBoard && !tag) {
            Alert.alert("말머리 선택 필요", "자유게시판은 말머리를 선택해야 해요.");
            return;
        }
        if (isLocalBoard && !region) {
            Alert.alert("지역 선택 필요", "지역정보 게시판은 지역을 선택해야 해요.");
            return;
        }
        // 업로드 중인 이미지 있으면 대기 안내
        const hasUploading = images.some((img) => img.uploading);
        if (hasUploading) {
            Alert.alert("업로드 진행 중", "이미지 업로드가 끝날 때까지 잠시만 기다려주세요.");
            return;
        }

        const imageUrls = images
            .map((img) => img.uploaded)
            .filter((url): url is string => !!url);

        setSubmitting(true);
        try {
            if (isEditMode && editId) {
                // PATCH — 서버 핸들러는 title/content/badge만 받음
                const body: Record<string, unknown> = {
                    title: title.trim(),
                    content: content.trim(),
                    badge,
                };
                const res = await fetch(`${API_BASE_URL}/api/posts/${editId}`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify(body),
                });
                if (!res.ok) {
                    let msg = `HTTP ${res.status}`;
                    try {
                        const err = await res.json();
                        msg = err.error || msg;
                    } catch {}
                    throw new Error(msg);
                }
                Alert.alert("수정 완료", "게시글이 수정되었어요.", [
                    { text: "확인", onPress: () => router.back() },
                ]);
                return;
            }

            const body: Record<string, unknown> = {
                boardType,
                badge,
                title: title.trim(),
                content: content.trim(),
                authorName: userNickname,
            };
            if (isFreeBoard && tag) body.animalType = tag;
            if (isLocalBoard && region) body.region = region;
            if (authorPetId) body.authorPetId = authorPetId;
            if (isMemorial) body.isPublic = isPublic;
            if (imageUrls.length > 0) body.imageUrls = imageUrls;

            const res = await fetch(`${API_BASE_URL}/api/posts`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                let msg = `HTTP ${res.status}`;
                try {
                    const err = await res.json();
                    msg = err.error || msg;
                } catch {}
                throw new Error(msg);
            }

            Alert.alert("등록 완료", "게시글이 등록되었어요.", [
                { text: "확인", onPress: () => router.back() },
            ]);
        } catch (e) {
            Alert.alert(isEditMode ? "수정 실패" : "등록 실패", e instanceof Error ? e.message : "");
        } finally {
            setSubmitting(false);
        }
    }

    // ============================================
    // UI
    // ============================================
    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.white;
    const borderColor = isDarkMode ? COLORS.gray[800] : COLORS.gray[100];
    const labelColor = isDarkMode ? COLORS.gray[400] : COLORS.gray[600];
    const textColor = isDarkMode ? COLORS.white : COLORS.gray[900];

    const canSubmit =
        !!title.trim() && !!content.trim() && !!badge &&
        (!isFreeBoard || !!tag) && (!isLocalBoard || !!region) &&
        !submitting;

    if (isEditMode && !editLoaded) {
        return (
            <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
                <Stack.Screen options={{ headerShown: false }} />
                <AppHeader showBack title="게시글 수정" hideActions />
                <View style={[styles.flex1, { alignItems: "center", justifyContent: "center" }]}>
                    <ActivityIndicator size="large" color={accentColor} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.flex1, { backgroundColor: bgColor }]} edges={["top"]}>
            <Stack.Screen options={{ headerShown: false }} />
            <AppHeader
                showBack
                title={isEditMode ? `${SUBCATEGORY_LABELS[boardType]} 수정` : `${SUBCATEGORY_LABELS[boardType]} 글쓰기`}
                hideActions
            />

            <KeyboardAvoidingView
                style={styles.flex1}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <ScrollView
                    style={styles.flex1}
                    contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* 작성자 */}
                    <FieldLabel color={labelColor}>작성자</FieldLabel>
                    <View style={[styles.readonlyBox, { backgroundColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[100] }]}>
                        <Text style={{ fontSize: 14, color: isDarkMode ? COLORS.gray[200] : COLORS.gray[700] }}>
                            {userNickname}
                        </Text>
                    </View>

                    {/* 배지 */}
                    <FieldLabel color={labelColor} required>배지</FieldLabel>
                    <ChipRow
                        items={badges}
                        selected={badge}
                        onSelect={setBadge}
                        accentColor={accentColor}
                        isDarkMode={isDarkMode}
                    />

                    {/* 자유게시판 말머리 */}
                    {isFreeBoard && (
                        <>
                            <FieldLabel color={labelColor} required>말머리</FieldLabel>
                            <ChipRow
                                items={POST_TAGS}
                                selected={tag}
                                onSelect={setTag}
                                accentColor={accentColor}
                                isDarkMode={isDarkMode}
                            />
                        </>
                    )}

                    {/* 지역 (local) */}
                    {isLocalBoard && (
                        <>
                            <FieldLabel color={labelColor} required>지역</FieldLabel>
                            <ChipRow
                                items={LOCAL_REGIONS}
                                selected={region}
                                onSelect={setRegion}
                                accentColor={accentColor}
                                isDarkMode={isDarkMode}
                            />
                        </>
                    )}

                    {/* 펫 연결 (선택) */}
                    {pets.length > 0 && (
                        <>
                            <FieldLabel color={labelColor}>반려동물 연결 (선택)</FieldLabel>
                            <FlatList
                                horizontal
                                data={[{ id: "", name: "선택 안 함" }, ...pets.map((p) => ({ id: p.id, name: p.name }))]}
                                keyExtractor={(item) => item.id || "none"}
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                                style={{ marginBottom: 16 }}
                                renderItem={({ item }) => {
                                    const selected = authorPetId === item.id;
                                    return (
                                        <TouchableOpacity
                                            onPress={() => setAuthorPetId(item.id)}
                                            style={[
                                                styles.chip,
                                                selected
                                                    ? { backgroundColor: accentColor, borderColor: accentColor }
                                                    : { borderColor: isDarkMode ? COLORS.gray[700] : COLORS.gray[200] },
                                            ]}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={{
                                                fontSize: 12, fontWeight: "600",
                                                color: selected ? "#fff" : (isDarkMode ? COLORS.gray[300] : COLORS.gray[700]),
                                            }}>
                                                {item.name}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                }}
                            />
                        </>
                    )}

                    {/* 추모 공개 토글 */}
                    {isMemorial && (
                        <>
                            <FieldLabel color={labelColor}>홈화면 공개</FieldLabel>
                            <TouchableOpacity
                                onPress={() => setIsPublic((v) => !v)}
                                style={[
                                    styles.toggleRow,
                                    {
                                        backgroundColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[50],
                                        borderColor: isDarkMode ? COLORS.gray[700] : COLORS.gray[200],
                                    },
                                ]}
                                activeOpacity={0.85}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 14, fontWeight: "600", color: textColor }}>
                                        {isPublic ? "홈화면에 공개" : "비공개"}
                                    </Text>
                                    <Text style={{ fontSize: 11, color: labelColor, marginTop: 2 }}>
                                        {isPublic
                                            ? "다른 사용자도 홈에서 볼 수 있어요"
                                            : "기억 게시판에만 노출돼요"}
                                    </Text>
                                </View>
                                <View style={[
                                    styles.toggleSwitch,
                                    { backgroundColor: isPublic ? accentColor : COLORS.gray[300] },
                                ]}>
                                    <View style={[
                                        styles.toggleKnob,
                                        { transform: [{ translateX: isPublic ? 18 : 2 }] },
                                    ]} />
                                </View>
                            </TouchableOpacity>
                        </>
                    )}

                    {/* 제목 */}
                    <FieldLabel color={labelColor} required>제목</FieldLabel>
                    <TextInput
                        style={[
                            styles.titleInput,
                            {
                                color: textColor,
                                borderColor: isDarkMode ? COLORS.gray[700] : COLORS.gray[200],
                            },
                        ]}
                        placeholder="제목을 입력해주세요"
                        placeholderTextColor={COLORS.gray[400]}
                        value={title}
                        onChangeText={setTitle}
                        maxLength={200}
                    />

                    {/* 내용 */}
                    <FieldLabel color={labelColor} required>내용</FieldLabel>
                    <TextInput
                        style={[
                            styles.contentInput,
                            {
                                color: textColor,
                                borderColor: isDarkMode ? COLORS.gray[700] : COLORS.gray[200],
                            },
                        ]}
                        placeholder="내용을 입력해주세요..."
                        placeholderTextColor={COLORS.gray[400]}
                        value={content}
                        onChangeText={setContent}
                        multiline
                        textAlignVertical="top"
                        maxLength={10000}
                    />

                    {/* 이미지 */}
                    <FieldLabel color={labelColor}>이미지 ({images.length}/{MAX_IMAGES})</FieldLabel>
                    {images.length > 0 && (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                            style={{ marginBottom: 12 }}
                        >
                            {images.map((img, i) => (
                                <View key={`${img.uri}-${i}`} style={{ position: "relative" }}>
                                    <Image source={{ uri: img.uploaded || img.uri }} style={styles.imgThumb} />
                                    {img.uploading && (
                                        <View style={styles.imgOverlay}>
                                            <ActivityIndicator size="small" color="#fff" />
                                        </View>
                                    )}
                                    {!img.uploading && (
                                        <TouchableOpacity
                                            onPress={() => openImageEditor(i)}
                                            style={styles.imgEdit}
                                            hitSlop={6}
                                        >
                                            <Ionicons name="brush" size={12} color="#fff" />
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity
                                        onPress={() => removeImage(i)}
                                        style={styles.imgRemove}
                                        hitSlop={6}
                                    >
                                        <Ionicons name="close" size={14} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                    )}

                    {images.length < MAX_IMAGES && (
                        <TouchableOpacity
                            onPress={pickImages}
                            style={[
                                styles.addImageBtn,
                                {
                                    borderColor: isDarkMode ? COLORS.gray[700] : COLORS.gray[200],
                                    backgroundColor: isDarkMode ? COLORS.gray[900] : COLORS.gray[50],
                                },
                            ]}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="image-outline" size={18} color={accentColor} />
                            <Text style={{ fontSize: 13, color: accentColor, fontWeight: "600" }}>
                                사진 추가
                            </Text>
                        </TouchableOpacity>
                    )}
                </ScrollView>

                {/* Submit bar */}
                <View style={[
                    styles.submitBar,
                    {
                        borderTopColor: borderColor,
                        backgroundColor: bgColor,
                        paddingBottom: 12 + Math.max(insets.bottom, 0),
                    },
                ]}>
                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={!canSubmit}
                        style={[
                            styles.submitBtn,
                            { backgroundColor: canSubmit ? accentColor : COLORS.gray[200] },
                        ]}
                        activeOpacity={0.85}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={{
                                fontSize: 15, fontWeight: "700",
                                color: canSubmit ? "#fff" : COLORS.gray[400],
                            }}>
                                {isEditMode ? "수정하기" : "게시하기"}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            <PhotoCropConfirmModal
                visible={editingImage !== null}
                initialUri={editingImage?.uri ?? null}
                accentColor={accentColor}
                onClose={() => setEditingImage(null)}
                onConfirm={handleEditedImage}
                onRetake={() => setEditingImage(null)}
            />
        </SafeAreaView>
    );
}

// ============================================================================
// 헬퍼 컴포넌트
// ============================================================================

function FieldLabel({
    children, color, required,
}: { children: React.ReactNode; color: string; required?: boolean }) {
    return (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6, marginTop: 12 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color }}>
                {children}
            </Text>
            {required && <Text style={{ color: "#EF4444", fontSize: 12 }}>*</Text>}
        </View>
    );
}

function ChipRow({
    items, selected, onSelect, accentColor, isDarkMode,
}: {
    items: string[];
    selected: string;
    onSelect: (v: string) => void;
    accentColor: string;
    isDarkMode: boolean;
}) {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
            style={{ marginBottom: 4 }}
        >
            {items.map((item) => {
                const isSel = selected === item;
                return (
                    <TouchableOpacity
                        key={item}
                        onPress={() => onSelect(isSel ? "" : item)}
                        style={[
                            styles.chip,
                            isSel
                                ? { backgroundColor: accentColor, borderColor: accentColor }
                                : { borderColor: isDarkMode ? COLORS.gray[700] : COLORS.gray[200] },
                        ]}
                        activeOpacity={0.85}
                    >
                        <Text style={{
                            fontSize: 12, fontWeight: "600",
                            color: isSel ? "#fff" : (isDarkMode ? COLORS.gray[300] : COLORS.gray[700]),
                        }}>
                            {item}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    readonlyBox: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        marginBottom: 4,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 9999,
        borderWidth: 1,
    },
    toggleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 4,
    },
    toggleSwitch: {
        width: 44, height: 24,
        borderRadius: 12,
        justifyContent: "center",
    },
    toggleKnob: {
        width: 20, height: 20,
        borderRadius: 10,
        backgroundColor: "#fff",
    },
    titleInput: {
        fontSize: 16,
        fontWeight: "600",
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderWidth: 1,
        borderRadius: 10,
    },
    contentInput: {
        fontSize: 14,
        lineHeight: 22,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderWidth: 1,
        borderRadius: 10,
        minHeight: 200,
    },
    imgThumb: {
        width: 96, height: 96, borderRadius: 12,
        backgroundColor: "#F3F4F6",
    },
    imgOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.4)",
        borderRadius: 12,
        alignItems: "center", justifyContent: "center",
    },
    imgRemove: {
        position: "absolute",
        top: 4, right: 4,
        width: 22, height: 22,
        backgroundColor: "rgba(0,0,0,0.6)",
        borderRadius: 11,
        alignItems: "center", justifyContent: "center",
    },
    imgEdit: {
        position: "absolute",
        bottom: 4, left: 4,
        width: 22, height: 22,
        backgroundColor: "rgba(0,0,0,0.6)",
        borderRadius: 11,
        alignItems: "center", justifyContent: "center",
    },
    addImageBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderStyle: "dashed",
    },
    submitBar: {
        paddingHorizontal: 16,
        paddingTop: 10,
        borderTopWidth: 1,
    },
    submitBtn: {
        height: 48,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
});
