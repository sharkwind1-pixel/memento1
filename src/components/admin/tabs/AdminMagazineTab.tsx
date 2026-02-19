/**
 * ============================================================================
 * tabs/AdminMagazineTab.tsx
 * ============================================================================
 * 관리자 매거진 관리 탭
 *
 * 주요 기능:
 * - 매거진 기사 목록 조회 (검색, 상태 필터)
 * - 기사 작성 / 수정 (모달 폼)
 * - 기사 발행/초안 토글
 * - 기사 삭제
 * - 썸네일 이미지 업로드
 * ============================================================================
 */

"use client";

import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
    Search,
    RefreshCw,
    Plus,
    BookOpen,
    Eye,
    Heart,
    Calendar,
    Edit3,
    Trash2,
    ToggleLeft,
    ToggleRight,
    X,
    Upload,
    Image as ImageIcon,
    Loader2,
} from "lucide-react";
import { authFetch } from "@/lib/auth-fetch";
import { uploadMagazineImage } from "@/lib/storage";
import { getBadgeLabel } from "@/data/magazineArticles";
import RichTextEditor from "@/components/admin/RichTextEditor";
import type { MagazineArticleRow, MagazineStatus } from "../types";

// ============================================================================
// Props 타입 정의
// ============================================================================

interface AdminMagazineTabProps {
    /** 매거진 기사 목록 */
    articles: MagazineArticleRow[];
    /** 새로고침 함수 */
    onRefresh: () => void;
    /** 현재 사용자 ID */
    userId: string;
}

// ============================================================================
// 카테고리 설정
// ============================================================================

const CATEGORIES = [
    { value: "health", label: "건강/의료" },
    { value: "food", label: "사료/영양" },
    { value: "behavior", label: "행동/훈련" },
    { value: "grooming", label: "미용/위생" },
    { value: "living", label: "생활/용품" },
    { value: "travel", label: "여행/외출" },
] as const;

const BADGE_OPTIONS = [
    { value: "", label: "단계 선택" },
    { value: "beginner", label: "처음 키워요 (초보)" },
    { value: "companion", label: "함께 성장해요 (일상)" },
    { value: "senior", label: "오래오래 함께 (시니어)" },
] as const;

const STATUS_FILTERS: { value: MagazineStatus | "all"; label: string }[] = [
    { value: "all", label: "전체" },
    { value: "published", label: "발행" },
    { value: "draft", label: "초안" },
];

// ============================================================================
// 기사 폼 초기값
// ============================================================================

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
    imageStoragePath: string;
    status: MagazineStatus;
}

/** 에디터의 HTML이 실질적으로 비어있는지 확인 */
function isEditorEmpty(html: string): boolean {
    if (!html) return true;
    const stripped = html.replace(/<[^>]*>/g, "").trim();
    return stripped.length === 0;
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
    imageStoragePath: "",
    status: "draft",
};

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function AdminMagazineTab({
    articles,
    onRefresh,
    userId,
}: AdminMagazineTabProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<MagazineStatus | "all">("all");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingArticle, setEditingArticle] = useState<MagazineArticleRow | null>(null);
    const [form, setForm] = useState<ArticleForm>(INITIAL_FORM);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isTogglingStatus, setIsTogglingStatus] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null!);

    // ========================================================================
    // 모달 열기 (신규 작성)
    // ========================================================================
    const openCreateModal = () => {
        setEditingArticle(null);
        setForm(INITIAL_FORM);
        setIsModalOpen(true);
    };

    // ========================================================================
    // 모달 열기 (수정)
    // ========================================================================
    const openEditModal = (article: MagazineArticleRow) => {
        setEditingArticle(article);
        setForm({
            category: article.category,
            title: article.title,
            summary: article.summary,
            content: article.content || "",
            author: article.author,
            authorRole: article.author_role || "",
            readTime: article.read_time || "5분",
            badge: article.badge || "",
            tags: (article.tags || []).join(", "),
            imageUrl: article.image_url || "",
            imageStoragePath: article.image_storage_path || "",
            status: article.status,
        });
        setIsModalOpen(true);
    };

    // ========================================================================
    // 모달 닫기
    // ========================================================================
    const closeModal = () => {
        setIsModalOpen(false);
        setEditingArticle(null);
        setForm(INITIAL_FORM);
    };

    // ========================================================================
    // 이미지 업로드
    // ========================================================================
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const result = await uploadMagazineImage(file, userId);
            if (result.success && result.url) {
                setForm(prev => ({
                    ...prev,
                    imageUrl: result.url || "",
                    imageStoragePath: result.path || "",
                }));
                toast.success("이미지가 업로드되었습니다");
            } else {
                toast.error(result.error || "이미지 업로드 실패");
            }
        } catch {
            toast.error("이미지 업로드 중 오류가 발생했습니다");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    // ========================================================================
    // 기사 저장 (생성/수정)
    // ========================================================================
    const handleSubmit = async () => {
        if (!form.title.trim() || !form.summary.trim() || !form.author.trim()) {
            toast.error("제목, 요약, 작성자는 필수입니다");
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                category: form.category,
                title: form.title.trim(),
                summary: form.summary.trim(),
                content: isEditorEmpty(form.content) ? null : form.content,
                author: form.author.trim(),
                authorRole: form.authorRole.trim() || null,
                readTime: form.readTime.trim() || null,
                badge: form.badge || null,
                tags: form.tags
                    .split(",")
                    .map(t => t.trim())
                    .filter(Boolean),
                imageUrl: form.imageUrl || null,
                imageStoragePath: form.imageStoragePath || null,
                status: form.status,
            };

            let res: Response;

            if (editingArticle) {
                // 수정
                res = await authFetch(`/api/magazine/${editingArticle.id}`, {
                    method: "PATCH",
                    body: JSON.stringify(payload),
                });
            } else {
                // 생성
                res = await authFetch("/api/magazine", {
                    method: "POST",
                    body: JSON.stringify(payload),
                });
            }

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "저장 실패");
            }

            toast.success(editingArticle ? "기사가 수정되었습니다" : "기사가 생성되었습니다");
            closeModal();
            onRefresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "저장 중 오류가 발생했습니다");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ========================================================================
    // 발행/초안 토글
    // ========================================================================
    const toggleStatus = async (article: MagazineArticleRow) => {
        const newStatus: MagazineStatus = article.status === "published" ? "draft" : "published";

        setIsTogglingStatus(article.id);
        try {
            const res = await authFetch(`/api/magazine/${article.id}`, {
                method: "PATCH",
                body: JSON.stringify({ status: newStatus }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success(newStatus === "published" ? "기사가 발행되었습니다" : "초안으로 변경되었습니다");
            onRefresh();
        } catch {
            toast.error("상태 변경 실패");
        } finally {
            setIsTogglingStatus(null);
        }
    };

    // ========================================================================
    // 기사 삭제
    // ========================================================================
    const deleteArticle = async (article: MagazineArticleRow) => {
        if (!window.confirm(`"${article.title}" 기사를 삭제하시겠습니까?`)) return;

        setIsDeleting(article.id);
        try {
            const res = await authFetch(`/api/magazine/${article.id}`, {
                method: "DELETE",
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success("기사가 삭제되었습니다");
            onRefresh();
        } catch {
            toast.error("삭제 중 오류가 발생했습니다");
        } finally {
            setIsDeleting(null);
        }
    };

    // ========================================================================
    // 필터링
    // ========================================================================
    const filteredArticles = articles.filter((a) => {
        const matchesSearch =
            searchQuery === "" ||
            a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.category.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === "all" || a.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    // ========================================================================
    // 렌더링
    // ========================================================================
    return (
        <div className="space-y-4">
            {/* 상단: 검색 + 필터 + 새 기사 */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="제목, 작성자, 카테고리로 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <div className="flex gap-2">
                    {STATUS_FILTERS.map((filter) => (
                        <Button
                            key={filter.value}
                            size="sm"
                            variant={statusFilter === filter.value ? "default" : "outline"}
                            onClick={() => setStatusFilter(filter.value)}
                            className={statusFilter === filter.value ? "bg-sky-500 hover:bg-sky-600" : ""}
                        >
                            {filter.label}
                        </Button>
                    ))}
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={onRefresh}>
                        <RefreshCw className="w-4 h-4 mr-1" />
                        새로고침
                    </Button>
                    <Button
                        size="sm"
                        className="bg-sky-500 hover:bg-sky-600"
                        onClick={openCreateModal}
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        새 기사
                    </Button>
                </div>
            </div>

            {/* 통계 */}
            <div className="flex gap-4 text-sm text-gray-500">
                <span>전체: {articles.length}개</span>
                <span>발행: {articles.filter(a => a.status === "published").length}개</span>
                <span>초안: {articles.filter(a => a.status === "draft").length}개</span>
            </div>

            {/* 기사 목록 */}
            <Card>
                <CardContent className="pt-6">
                    {filteredArticles.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p>매거진 기사가 없습니다</p>
                            <Button
                                variant="outline"
                                className="mt-3"
                                onClick={openCreateModal}
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                첫 번째 기사 작성하기
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredArticles.map((article) => (
                                <ArticleCard
                                    key={article.id}
                                    article={article}
                                    onEdit={() => openEditModal(article)}
                                    onToggleStatus={() => toggleStatus(article)}
                                    onDelete={() => deleteArticle(article)}
                                    isTogglingStatus={isTogglingStatus === article.id}
                                    isDeleting={isDeleting === article.id}
                                />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 작성/수정 모달 */}
            {isModalOpen && (
                <ArticleFormModal
                    form={form}
                    setForm={setForm}
                    isEditing={!!editingArticle}
                    isSubmitting={isSubmitting}
                    isUploading={isUploading}
                    fileInputRef={fileInputRef}
                    onImageUpload={handleImageUpload}
                    onContentImageUpload={async (file) => {
                        const result = await uploadMagazineImage(file, userId);
                        if (result.success && result.url) return result.url;
                        toast.error(result.error || "본문 이미지 업로드 실패");
                        return null;
                    }}
                    onSubmit={handleSubmit}
                    onClose={closeModal}
                />
            )}
        </div>
    );
}

// ============================================================================
// 기사 카드 컴포넌트
// ============================================================================

interface ArticleCardProps {
    article: MagazineArticleRow;
    onEdit: () => void;
    onToggleStatus: () => void;
    onDelete: () => void;
    isTogglingStatus: boolean;
    isDeleting: boolean;
}

function ArticleCard({
    article,
    onEdit,
    onToggleStatus,
    onDelete,
    isTogglingStatus,
    isDeleting,
}: ArticleCardProps) {
    const categoryLabel = CATEGORIES.find(c => c.value === article.category)?.label || article.category;

    return (
        <div className="p-4 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors bg-white">
            <div className="flex gap-4">
                {/* 썸네일 */}
                {article.image_url && (
                    <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
                        <img
                            src={article.image_url}
                            alt={article.title}
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}

                {/* 내용 */}
                <div className="flex-1 min-w-0">
                    {/* 상단: 카테고리, 상태, 배지 */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant="secondary" className="text-xs">
                            {categoryLabel}
                        </Badge>
                        {article.status === "published" ? (
                            <Badge className="bg-green-100 text-green-700 text-xs">
                                발행
                            </Badge>
                        ) : (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-500 text-xs">
                                초안
                            </Badge>
                        )}
                        {article.badge && (
                            <Badge className="bg-sky-100 text-sky-700 text-xs">
                                {getBadgeLabel(article.badge)}
                            </Badge>
                        )}
                    </div>

                    {/* 제목 */}
                    <h4 className="font-medium text-gray-800 truncate">{article.title}</h4>

                    {/* 요약 */}
                    <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">{article.summary}</p>

                    {/* 메타 정보 */}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span>{article.author}</span>
                        <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {article.views}
                        </span>
                        <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3" />
                            {article.likes}
                        </span>
                        <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(article.created_at).toLocaleDateString("ko-KR")}
                        </span>
                    </div>
                </div>
            </div>

            {/* 액션 버튼 */}
            <div className="flex flex-wrap gap-2 pt-3 mt-3 border-t border-gray-100">
                <Button size="sm" variant="outline" onClick={onEdit}>
                    <Edit3 className="w-3 h-3 mr-1" />
                    수정
                </Button>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={onToggleStatus}
                    disabled={isTogglingStatus}
                >
                    {isTogglingStatus ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : article.status === "published" ? (
                        <ToggleRight className="w-3 h-3 mr-1 text-green-500" />
                    ) : (
                        <ToggleLeft className="w-3 h-3 mr-1 text-gray-400" />
                    )}
                    {article.status === "published" ? "비발행" : "발행"}
                </Button>
                <Button
                    size="sm"
                    variant="outline"
                    className="text-red-500 hover:text-red-600 hover:border-red-300"
                    onClick={onDelete}
                    disabled={isDeleting}
                >
                    {isDeleting ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                        <Trash2 className="w-3 h-3 mr-1" />
                    )}
                    삭제
                </Button>
            </div>
        </div>
    );
}

// ============================================================================
// 기사 작성/수정 모달
// ============================================================================

interface ArticleFormModalProps {
    form: ArticleForm;
    setForm: React.Dispatch<React.SetStateAction<ArticleForm>>;
    isEditing: boolean;
    isSubmitting: boolean;
    isUploading: boolean;
    fileInputRef: React.RefObject<HTMLInputElement>;
    onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onContentImageUpload: (file: File) => Promise<string | null>;
    onSubmit: () => void;
    onClose: () => void;
}

function ArticleFormModal({
    form,
    setForm,
    isEditing,
    isSubmitting,
    isUploading,
    fileInputRef,
    onImageUpload,
    onContentImageUpload,
    onSubmit,
    onClose,
}: ArticleFormModalProps) {
    const updateField = <K extends keyof ArticleForm>(field: K, value: ArticleForm[K]) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
                {/* 헤더 */}
                <div className="flex-shrink-0 flex items-center justify-between p-4 border-b bg-sky-50">
                    <h3 className="font-bold text-gray-800">
                        {isEditing ? "기사 수정" : "새 기사 작성"}
                    </h3>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                {/* 폼 영역 (스크롤) */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* 카테고리 + 배지 */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                카테고리 *
                            </label>
                            <select
                                value={form.category}
                                onChange={(e) => updateField("category", e.target.value)}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                            >
                                {CATEGORIES.map(c => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                배지
                            </label>
                            <select
                                value={form.badge}
                                onChange={(e) => updateField("badge", e.target.value)}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                            >
                                {BADGE_OPTIONS.map(b => (
                                    <option key={b.value} value={b.value}>{b.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* 제목 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            제목 *
                        </label>
                        <Input
                            value={form.title}
                            onChange={(e) => updateField("title", e.target.value)}
                            placeholder="기사 제목을 입력하세요"
                            maxLength={200}
                        />
                    </div>

                    {/* 요약 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            요약 *
                        </label>
                        <Textarea
                            value={form.summary}
                            onChange={(e) => updateField("summary", e.target.value)}
                            placeholder="기사 요약 (목록에 표시됨)"
                            rows={2}
                            maxLength={500}
                        />
                    </div>

                    {/* 본문 (리치 텍스트 에디터) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            본문 (선택)
                        </label>
                        <RichTextEditor
                            content={form.content}
                            onChange={(html) => updateField("content", html)}
                            onImageUpload={onContentImageUpload}
                        />
                    </div>

                    {/* 작성자 정보 */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                작성자 *
                            </label>
                            <Input
                                value={form.author}
                                onChange={(e) => updateField("author", e.target.value)}
                                placeholder="예: 수의사 김태호"
                                maxLength={100}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                작성자 역할
                            </label>
                            <Input
                                value={form.authorRole}
                                onChange={(e) => updateField("authorRole", e.target.value)}
                                placeholder="예: 반려동물 전문 수의사"
                                maxLength={100}
                            />
                        </div>
                    </div>

                    {/* 읽기 시간 + 태그 */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                읽기 시간
                            </label>
                            <Input
                                value={form.readTime}
                                onChange={(e) => updateField("readTime", e.target.value)}
                                placeholder="예: 5분"
                                maxLength={20}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                태그 (쉼표 구분)
                            </label>
                            <Input
                                value={form.tags}
                                onChange={(e) => updateField("tags", e.target.value)}
                                placeholder="예: 건강, 예방접종, 필수정보"
                            />
                        </div>
                    </div>

                    {/* 이미지 업로드 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            썸네일 이미지
                        </label>
                        <div className="flex items-center gap-3">
                            {form.imageUrl ? (
                                <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                    <img
                                        src={form.imageUrl}
                                        alt="썸네일"
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setForm(prev => ({
                                            ...prev,
                                            imageUrl: "",
                                            imageStoragePath: "",
                                        }))}
                                        className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center"
                                    >
                                        <X className="w-3 h-3 text-white" />
                                    </button>
                                </div>
                            ) : (
                                <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center flex-shrink-0">
                                    <ImageIcon className="w-8 h-8 text-gray-300" />
                                </div>
                            )}
                            <div className="flex flex-col gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                >
                                    {isUploading ? (
                                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                    ) : (
                                        <Upload className="w-4 h-4 mr-1" />
                                    )}
                                    {isUploading ? "업로드 중..." : "이미지 업로드"}
                                </Button>
                                <p className="text-xs text-gray-400">
                                    또는 URL을 직접 입력하세요
                                </p>
                                <Input
                                    value={form.imageUrl}
                                    onChange={(e) => updateField("imageUrl", e.target.value)}
                                    placeholder="https://..."
                                    className="text-xs"
                                />
                            </div>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={onImageUpload}
                        />
                    </div>

                    {/* 발행 상태 */}
                    <div className="p-3 bg-gray-50 rounded-lg">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.status === "published"}
                                onChange={(e) =>
                                    updateField("status", e.target.checked ? "published" : "draft")
                                }
                                className="w-4 h-4 text-sky-500 border-gray-300 rounded focus:ring-sky-500"
                            />
                            <div>
                                <span className="text-sm font-medium text-gray-700">
                                    즉시 발행
                                </span>
                                <p className="text-xs text-gray-500">
                                    체크하면 저장 즉시 매거진에 공개됩니다
                                </p>
                            </div>
                        </label>
                    </div>
                </div>

                {/* 푸터 */}
                <div className="flex-shrink-0 p-4 border-t flex justify-end gap-2 bg-white">
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                        취소
                    </Button>
                    <Button
                        className="bg-sky-500 hover:bg-sky-600"
                        onClick={onSubmit}
                        disabled={isSubmitting || !form.title.trim() || !form.summary.trim() || !form.author.trim()}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                저장 중...
                            </>
                        ) : (
                            isEditing ? "수정 완료" : "기사 저장"
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
