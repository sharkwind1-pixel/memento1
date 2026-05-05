/**
 * AdminMagazineTab — 매거진 관리 (웹 src/components/admin/tabs/AdminMagazineTab.tsx 부분 이식)
 *
 * 모바일 스코프 (풀 리치에디터/이미지에디터는 웹에서)
 * - magazine_articles 직접 fetch (최근 100개)
 * - 검색 + 상태 필터 (전체/발행/초안)
 * - 발행/초안 토글 (PATCH /api/magazine/:id)
 * - 삭제 (DELETE /api/magazine/:id)
 * - 신규/수정 모달: 기본 필드만 (제목/요약/본문 plain text/작성자/카테고리/배지/태그/썸네일 URL)
 *
 * 본문 리치 에디터/이미지 편집은 웹 관리자에서 처리.
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import {
    View, Text, TextInput, FlatList, TouchableOpacity, Image,
    ActivityIndicator, RefreshControl, StyleSheet, Alert,
    Modal, ScrollView, KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/theme";
import { API_BASE_URL } from "@/config/constants";
import { supabase } from "@/lib/supabase";
import { useDarkMode } from "@/contexts/ThemeContext";

type MagazineStatus = "published" | "draft";

interface MagazineArticle {
    id: string;
    category: string;
    title: string;
    summary: string;
    content: string | null;
    author: string;
    author_role: string | null;
    read_time: string | null;
    badge: string | null;
    tags: string[] | null;
    image_url: string | null;
    image_storage_path: string | null;
    status: MagazineStatus;
    views: number;
    likes: number;
    created_at: string;
    published_at: string | null;
}

const CATEGORIES: { value: string; label: string }[] = [
    { value: "health", label: "건강/의료" },
    { value: "food", label: "사료/영양" },
    { value: "behavior", label: "행동/훈련" },
    { value: "grooming", label: "미용/위생" },
    { value: "living", label: "생활/용품" },
    { value: "travel", label: "여행/외출" },
];

const BADGE_OPTIONS: { value: string; label: string }[] = [
    { value: "", label: "없음" },
    { value: "beginner", label: "초보" },
    { value: "companion", label: "일상" },
    { value: "senior", label: "시니어" },
];

interface ArticleForm {
    category: string;
    title: string;
    summary: string;
    content: string;
    author: string;
    authorRole: string;
    readTime: string;
    badge: string;
    tags: string;
    imageUrl: string;
    status: MagazineStatus;
}

const INITIAL_FORM: ArticleForm = {
    category: "health",
    title: "",
    summary: "",
    content: "",
    author: "",
    authorRole: "",
    readTime: "5분",
    badge: "",
    tags: "",
    imageUrl: "",
    status: "draft",
};

interface Props {
    accessToken: string;
}

export default function AdminMagazineTab({ accessToken }: Props) {
    const { isDarkMode } = useDarkMode();
    const [articles, setArticles] = useState<MagazineArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<MagazineStatus | "all">("all");

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<MagazineArticle | null>(null);
    const [form, setForm] = useState<ArticleForm>(INITIAL_FORM);
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from("magazine_articles")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(100);
            if (error) throw new Error(error.message);
            setArticles((data ?? []) as MagazineArticle[]);
        } catch (e) {
            Alert.alert("불러오기 실패", e instanceof Error ? e.message : "");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    async function handleRefresh() {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    }

    function openCreate() {
        setEditing(null);
        setForm(INITIAL_FORM);
        setModalOpen(true);
    }

    function openEdit(a: MagazineArticle) {
        setEditing(a);
        setForm({
            category: a.category,
            title: a.title,
            summary: a.summary,
            content: a.content ?? "",
            author: a.author,
            authorRole: a.author_role ?? "",
            readTime: a.read_time ?? "5분",
            badge: a.badge ?? "",
            tags: (a.tags ?? []).join(", "),
            imageUrl: a.image_url ?? "",
            status: a.status,
        });
        setModalOpen(true);
    }

    function closeModal() {
        setModalOpen(false);
        setEditing(null);
        setForm(INITIAL_FORM);
    }

    async function submitForm() {
        if (!form.title.trim() || !form.summary.trim() || !form.author.trim()) {
            Alert.alert("필수 항목", "제목/요약/작성자는 필수예요");
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                category: form.category,
                title: form.title.trim(),
                summary: form.summary.trim(),
                content: form.content.trim() || null,
                author: form.author.trim(),
                authorRole: form.authorRole.trim() || null,
                readTime: form.readTime.trim() || null,
                badge: form.badge || null,
                tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
                imageUrl: form.imageUrl.trim() || null,
                imageStoragePath: null,
                status: form.status,
            };
            const url = editing
                ? `${API_BASE_URL}/api/magazine/${editing.id}`
                : `${API_BASE_URL}/api/magazine`;
            const res = await fetch(url, {
                method: editing ? "PATCH" : "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                Alert.alert("저장 실패", data.error || `HTTP ${res.status}`);
                return;
            }
            Alert.alert("완료", editing ? "수정됐어요" : "생성됐어요");
            closeModal();
            load();
        } catch (e) {
            Alert.alert("오류", e instanceof Error ? e.message : "");
        } finally {
            setSubmitting(false);
        }
    }

    function toggleStatus(a: MagazineArticle) {
        const nextStatus: MagazineStatus = a.status === "published" ? "draft" : "published";
        const action = nextStatus === "published" ? "발행" : "초안 변경";
        Alert.alert(
            action,
            `"${a.title}"을(를) ${action}할까요?`,
            [
                { text: "취소", style: "cancel" },
                {
                    text: action,
                    onPress: async () => {
                        try {
                            const res = await fetch(`${API_BASE_URL}/api/magazine/${a.id}`, {
                                method: "PATCH",
                                headers: {
                                    Authorization: `Bearer ${accessToken}`,
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify({ status: nextStatus }),
                            });
                            if (!res.ok) {
                                let msg = `HTTP ${res.status}`;
                                try { msg = (await res.json()).error || msg; } catch {}
                                Alert.alert("실패", msg);
                                return;
                            }
                            setArticles((prev) => prev.map((x) => x.id === a.id ? { ...x, status: nextStatus } : x));
                        } catch (e) {
                            Alert.alert("오류", e instanceof Error ? e.message : "");
                        }
                    },
                },
            ],
        );
    }

    function deleteArticle(a: MagazineArticle) {
        Alert.alert(
            "기사 삭제",
            `"${a.title}" 삭제할까요?\n되돌릴 수 없어요.`,
            [
                { text: "취소", style: "cancel" },
                {
                    text: "삭제",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const res = await fetch(`${API_BASE_URL}/api/magazine/${a.id}`, {
                                method: "DELETE",
                                headers: { Authorization: `Bearer ${accessToken}` },
                            });
                            if (!res.ok) {
                                let msg = `HTTP ${res.status}`;
                                try { msg = (await res.json()).error || msg; } catch {}
                                Alert.alert("실패", msg);
                                return;
                            }
                            setArticles((prev) => prev.filter((x) => x.id !== a.id));
                        } catch (e) {
                            Alert.alert("오류", e instanceof Error ? e.message : "");
                        }
                    },
                },
            ],
        );
    }

    const filtered = useMemo(() => {
        const s = search.trim().toLowerCase();
        return articles.filter((a) => {
            if (filter !== "all" && a.status !== filter) return false;
            if (!s) return true;
            return (
                a.title.toLowerCase().includes(s) ||
                a.author.toLowerCase().includes(s) ||
                a.category.toLowerCase().includes(s)
            );
        });
    }, [articles, search, filter]);

    const counts = useMemo(() => ({
        all: articles.length,
        published: articles.filter((a) => a.status === "published").length,
        draft: articles.filter((a) => a.status === "draft").length,
    }), [articles]);

    const bgColor = isDarkMode ? COLORS.gray[950] : COLORS.gray[50];
    const cardBg = isDarkMode ? COLORS.gray[900] : COLORS.white;
    const textColor = isDarkMode ? COLORS.white : COLORS.gray[900];
    const labelColor = isDarkMode ? COLORS.gray[400] : COLORS.gray[500];
    const inputBg = isDarkMode ? COLORS.gray[800] : "#fff";
    const borderColor = isDarkMode ? COLORS.gray[700] : COLORS.gray[200];

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: bgColor }]}>
                <ActivityIndicator color={COLORS.memento[500]} />
            </View>
        );
    }

    return (
        <View style={[styles.flex1, { backgroundColor: bgColor }]}>
            {/* 검색 + 새기사 */}
            <View style={styles.topRow}>
                <View style={[styles.searchBox, { backgroundColor: inputBg, borderColor, flex: 1 }]}>
                    <Ionicons name="search-outline" size={16} color={labelColor} />
                    <TextInput
                        value={search}
                        onChangeText={setSearch}
                        placeholder="제목 / 작성자 검색"
                        placeholderTextColor={labelColor}
                        autoCapitalize="none"
                        style={[styles.searchInput, { color: textColor }]}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
                            <Ionicons name="close-circle" size={16} color={COLORS.gray[400]} />
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity onPress={openCreate} style={styles.newBtn}>
                    <Ionicons name="add" size={14} color="#fff" />
                    <Text style={styles.newBtnText}>새 기사</Text>
                </TouchableOpacity>
            </View>

            {/* 상태 필터 */}
            <View style={styles.filterRow}>
                {(["all", "published", "draft"] as const).map((s) => {
                    const active = filter === s;
                    const labels = { all: `전체 ${counts.all}`, published: `발행 ${counts.published}`, draft: `초안 ${counts.draft}` };
                    const colors = {
                        all: { bg: "#1F2937", fg: "#fff" },
                        published: { bg: "#10B981", fg: "#fff" },
                        draft: { bg: COLORS.gray[500], fg: "#fff" },
                    };
                    return (
                        <TouchableOpacity
                            key={s}
                            onPress={() => setFilter(s)}
                            style={[
                                styles.filterChip,
                                {
                                    backgroundColor: active ? colors[s].bg : (isDarkMode ? COLORS.gray[800] : COLORS.gray[200]),
                                    opacity: active ? 1 : 0.7,
                                },
                            ]}
                        >
                            <Text style={{
                                fontSize: 11, fontWeight: "700",
                                color: active ? colors[s].fg : labelColor,
                            }}>
                                {labels[s]}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <FlatList
                data={filtered}
                keyExtractor={(a) => a.id}
                contentContainerStyle={{ padding: 12, gap: 8 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.memento[500]} />}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="book-outline" size={36} color={COLORS.gray[300]} />
                        <Text style={{ color: labelColor, fontSize: 13, marginTop: 8 }}>매거진 기사가 없어요</Text>
                        <TouchableOpacity onPress={openCreate} style={{ marginTop: 8 }}>
                            <Text style={{ color: COLORS.memento[500], fontSize: 12, fontWeight: "700" }}>+ 첫 기사 작성</Text>
                        </TouchableOpacity>
                    </View>
                }
                renderItem={({ item }) => (
                    <ArticleCard
                        article={item}
                        onEdit={() => openEdit(item)}
                        onToggleStatus={() => toggleStatus(item)}
                        onDelete={() => deleteArticle(item)}
                        cardBg={cardBg}
                        textColor={textColor}
                        labelColor={labelColor}
                        borderColor={borderColor}
                    />
                )}
            />

            {/* 작성/수정 모달 */}
            <Modal
                visible={modalOpen}
                animationType="slide"
                transparent
                onRequestClose={closeModal}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                >
                    <TouchableOpacity style={styles.modalBackdrop} onPress={closeModal} activeOpacity={1} />
                    <View style={[styles.modalCard, { backgroundColor: cardBg }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
                            <Text style={[styles.modalTitle, { color: textColor }]}>
                                {editing ? "기사 수정" : "새 기사"}
                            </Text>
                            <TouchableOpacity onPress={closeModal} hitSlop={8}>
                                <Ionicons name="close" size={20} color={labelColor} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
                            {/* 카테고리 */}
                            <Text style={[styles.label, { color: labelColor }]}>카테고리</Text>
                            <View style={styles.pillRow}>
                                {CATEGORIES.map((c) => {
                                    const active = form.category === c.value;
                                    return (
                                        <TouchableOpacity
                                            key={c.value}
                                            onPress={() => setForm((p) => ({ ...p, category: c.value }))}
                                            style={[
                                                styles.pill,
                                                { backgroundColor: active ? COLORS.memento[500] : (isDarkMode ? COLORS.gray[800] : COLORS.gray[200]) },
                                            ]}
                                        >
                                            <Text style={{ fontSize: 11, fontWeight: "700", color: active ? "#fff" : labelColor }}>
                                                {c.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* 배지 */}
                            <Text style={[styles.label, { color: labelColor, marginTop: 6 }]}>배지</Text>
                            <View style={styles.pillRow}>
                                {BADGE_OPTIONS.map((b) => {
                                    const active = form.badge === b.value;
                                    return (
                                        <TouchableOpacity
                                            key={b.value || "none"}
                                            onPress={() => setForm((p) => ({ ...p, badge: b.value }))}
                                            style={[
                                                styles.pill,
                                                { backgroundColor: active ? "#8B5CF6" : (isDarkMode ? COLORS.gray[800] : COLORS.gray[200]) },
                                            ]}
                                        >
                                            <Text style={{ fontSize: 11, fontWeight: "700", color: active ? "#fff" : labelColor }}>
                                                {b.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* 제목 */}
                            <Text style={[styles.label, { color: labelColor, marginTop: 6 }]}>제목 *</Text>
                            <TextInput
                                value={form.title}
                                onChangeText={(v) => setForm((p) => ({ ...p, title: v }))}
                                placeholder="기사 제목"
                                placeholderTextColor={labelColor}
                                style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]}
                            />

                            {/* 요약 */}
                            <Text style={[styles.label, { color: labelColor }]}>요약 *</Text>
                            <TextInput
                                value={form.summary}
                                onChangeText={(v) => setForm((p) => ({ ...p, summary: v }))}
                                placeholder="목록에 표시될 요약 (1~2줄)"
                                placeholderTextColor={labelColor}
                                multiline
                                style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor, minHeight: 60, textAlignVertical: "top" }]}
                            />

                            {/* 본문 */}
                            <Text style={[styles.label, { color: labelColor }]}>본문 (선택)</Text>
                            <TextInput
                                value={form.content}
                                onChangeText={(v) => setForm((p) => ({ ...p, content: v }))}
                                placeholder="본문 (모바일은 plain text. 리치 콘텐츠는 웹에서 편집)"
                                placeholderTextColor={labelColor}
                                multiline
                                style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor, minHeight: 140, textAlignVertical: "top" }]}
                            />

                            {/* 작성자 */}
                            <Text style={[styles.label, { color: labelColor }]}>작성자 *</Text>
                            <TextInput
                                value={form.author}
                                onChangeText={(v) => setForm((p) => ({ ...p, author: v }))}
                                placeholder="예: 수의사 김태호"
                                placeholderTextColor={labelColor}
                                style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]}
                            />

                            <Text style={[styles.label, { color: labelColor }]}>작성자 역할</Text>
                            <TextInput
                                value={form.authorRole}
                                onChangeText={(v) => setForm((p) => ({ ...p, authorRole: v }))}
                                placeholder="예: 반려동물 전문 수의사"
                                placeholderTextColor={labelColor}
                                style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]}
                            />

                            {/* 읽기시간 + 태그 */}
                            <Text style={[styles.label, { color: labelColor }]}>읽기 시간</Text>
                            <TextInput
                                value={form.readTime}
                                onChangeText={(v) => setForm((p) => ({ ...p, readTime: v }))}
                                placeholder="예: 5분"
                                placeholderTextColor={labelColor}
                                style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]}
                            />

                            <Text style={[styles.label, { color: labelColor }]}>태그 (쉼표 구분)</Text>
                            <TextInput
                                value={form.tags}
                                onChangeText={(v) => setForm((p) => ({ ...p, tags: v }))}
                                placeholder="건강, 예방접종, 필수정보"
                                placeholderTextColor={labelColor}
                                style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]}
                            />

                            {/* 썸네일 URL */}
                            <Text style={[styles.label, { color: labelColor }]}>썸네일 이미지 URL</Text>
                            <TextInput
                                value={form.imageUrl}
                                onChangeText={(v) => setForm((p) => ({ ...p, imageUrl: v }))}
                                placeholder="https://... (모바일은 URL 직접 입력)"
                                placeholderTextColor={labelColor}
                                autoCapitalize="none"
                                style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]}
                            />
                            {form.imageUrl.length > 0 && (
                                <Image
                                    source={{ uri: form.imageUrl }}
                                    style={[styles.thumb, { borderColor }]}
                                />
                            )}

                            {/* 발행 토글 */}
                            <TouchableOpacity
                                onPress={() => setForm((p) => ({ ...p, status: p.status === "published" ? "draft" : "published" }))}
                                style={[styles.checkRow, { backgroundColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[100] }]}
                            >
                                <Ionicons
                                    name={form.status === "published" ? "checkbox" : "square-outline"}
                                    size={20}
                                    color={form.status === "published" ? COLORS.memento[500] : labelColor}
                                />
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.checkTitle, { color: textColor }]}>즉시 발행</Text>
                                    <Text style={[styles.checkSubtitle, { color: labelColor }]}>
                                        체크하면 저장 즉시 매거진에 공개돼요
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </ScrollView>

                        <View style={[styles.modalFooter, { borderTopColor: borderColor }]}>
                            <TouchableOpacity
                                onPress={closeModal}
                                disabled={submitting}
                                style={[styles.footerBtn, { backgroundColor: isDarkMode ? COLORS.gray[800] : COLORS.gray[200] }]}
                            >
                                <Text style={{ color: textColor, fontSize: 13, fontWeight: "700" }}>취소</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={submitForm}
                                disabled={submitting || !form.title.trim() || !form.summary.trim() || !form.author.trim()}
                                style={[styles.footerBtn, {
                                    backgroundColor: submitting || !form.title.trim() || !form.summary.trim() || !form.author.trim()
                                        ? COLORS.gray[300]
                                        : COLORS.memento[500],
                                }]}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>
                                        {editing ? "수정 완료" : "기사 저장"}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

function ArticleCard({
    article, onEdit, onToggleStatus, onDelete,
    cardBg, textColor, labelColor, borderColor,
}: {
    article: MagazineArticle;
    onEdit: () => void;
    onToggleStatus: () => void;
    onDelete: () => void;
    cardBg: string;
    textColor: string;
    labelColor: string;
    borderColor: string;
}) {
    const categoryLabel = CATEGORIES.find((c) => c.value === article.category)?.label ?? article.category;

    function formatDate(iso: string) {
        try {
            const d = new Date(iso);
            return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
        } catch { return iso; }
    }

    return (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.cardTopRow}>
                {article.image_url && (
                    <Image source={{ uri: article.image_url }} style={[styles.cardThumb, { borderColor }]} />
                )}
                <View style={{ flex: 1, gap: 2 }}>
                    <View style={styles.badgeRow}>
                        <View style={[styles.miniBadge, { backgroundColor: COLORS.gray[200] }]}>
                            <Text style={[styles.miniBadgeText, { color: COLORS.gray[700] }]}>{categoryLabel}</Text>
                        </View>
                        {article.status === "published" ? (
                            <View style={[styles.miniBadge, { backgroundColor: "#D1FAE5" }]}>
                                <Text style={[styles.miniBadgeText, { color: "#047857" }]}>발행</Text>
                            </View>
                        ) : (
                            <View style={[styles.miniBadge, { backgroundColor: COLORS.gray[300] }]}>
                                <Text style={[styles.miniBadgeText, { color: COLORS.gray[700] }]}>초안</Text>
                            </View>
                        )}
                    </View>
                    <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
                        {article.title}
                    </Text>
                    <Text style={[styles.summary, { color: labelColor }]} numberOfLines={1}>
                        {article.summary}
                    </Text>
                    <View style={styles.metaRow}>
                        <Text style={[styles.metaText, { color: labelColor }]} numberOfLines={1}>
                            {article.author}
                        </Text>
                        <View style={styles.metaIcon}>
                            <Ionicons name="eye-outline" size={10} color={labelColor} />
                            <Text style={[styles.metaText, { color: labelColor }]}>{article.views}</Text>
                        </View>
                        <View style={styles.metaIcon}>
                            <Ionicons name="heart-outline" size={10} color={labelColor} />
                            <Text style={[styles.metaText, { color: labelColor }]}>{article.likes}</Text>
                        </View>
                        <Text style={[styles.metaText, { color: labelColor, marginLeft: "auto" }]}>
                            {formatDate(article.created_at)}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.actionRow}>
                <TouchableOpacity onPress={onEdit} style={[styles.actionBtn, { backgroundColor: COLORS.gray[500] }]}>
                    <Ionicons name="create-outline" size={11} color="#fff" />
                    <Text style={styles.actionBtnText}>수정</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={onToggleStatus}
                    style={[styles.actionBtn, { backgroundColor: article.status === "published" ? COLORS.gray[500] : "#10B981" }]}
                >
                    <Ionicons name={article.status === "published" ? "eye-off-outline" : "send-outline"} size={11} color="#fff" />
                    <Text style={styles.actionBtnText}>
                        {article.status === "published" ? "비발행" : "발행"}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onDelete} style={[styles.actionBtn, { backgroundColor: "#EF4444" }]}>
                    <Ionicons name="trash-outline" size={11} color="#fff" />
                    <Text style={styles.actionBtnText}>삭제</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    flex1: { flex: 1 },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    topRow: { flexDirection: "row", gap: 6, paddingHorizontal: 12, paddingTop: 10 },
    searchBox: {
        flexDirection: "row", alignItems: "center", gap: 6,
        paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: 9999, borderWidth: 1,
    },
    searchInput: { flex: 1, fontSize: 13, paddingVertical: 0 },
    newBtn: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: 8, backgroundColor: COLORS.memento[500],
    },
    newBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
    filterRow: { flexDirection: "row", gap: 4, paddingHorizontal: 12, paddingTop: 8 },
    filterChip: {
        flex: 1, alignItems: "center", justifyContent: "center",
        paddingVertical: 6, borderRadius: 6,
    },
    empty: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },

    card: { padding: 12, borderRadius: 10, borderWidth: 1, gap: 8 },
    cardTopRow: { flexDirection: "row", gap: 8 },
    cardThumb: { width: 64, height: 64, borderRadius: 8, borderWidth: 1, backgroundColor: "#f3f4f6" },
    badgeRow: { flexDirection: "row", gap: 4, flexWrap: "wrap" },
    miniBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    miniBadgeText: { fontSize: 9, fontWeight: "700" },
    title: { fontSize: 13, fontWeight: "700" },
    summary: { fontSize: 11 },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" },
    metaIcon: { flexDirection: "row", alignItems: "center", gap: 2 },
    metaText: { fontSize: 10 },
    actionRow: {
        flexDirection: "row", gap: 6,
        paddingTop: 8, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.06)",
    },
    actionBtn: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6,
    },
    actionBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },

    modalOverlay: { flex: 1, justifyContent: "flex-end" },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
    modalCard: {
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        maxHeight: "92%",
    },
    modalHeader: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
    },
    modalTitle: { fontSize: 16, fontWeight: "700" },
    label: { fontSize: 11, fontWeight: "700" },
    input: {
        borderWidth: 1, borderRadius: 10,
        paddingHorizontal: 12, paddingVertical: 10,
        fontSize: 13,
    },
    pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9999 },
    thumb: {
        width: 100, height: 100, borderRadius: 8,
        borderWidth: 1, backgroundColor: "#f3f4f6", marginTop: 4,
    },
    checkRow: {
        flexDirection: "row", alignItems: "center", gap: 10,
        padding: 12, borderRadius: 10, marginTop: 4,
    },
    checkTitle: { fontSize: 13, fontWeight: "700" },
    checkSubtitle: { fontSize: 11, marginTop: 2 },
    modalFooter: {
        flexDirection: "row", gap: 8,
        paddingHorizontal: 16, paddingVertical: 12,
        borderTopWidth: 1,
    },
    footerBtn: {
        flex: 1, alignItems: "center", justifyContent: "center",
        paddingVertical: 12, borderRadius: 10,
    },
});
