/**
 * LocalPage.tsx
 * 지역 게시판 - 당근마켓 스타일 (DB 연동)
 *
 * 기능:
 * - API 기반 게시글 목록 조회 (카테고리, 지역, 검색, 페이지네이션)
 * - 게시글 작성 (이미지 업로드 포함)
 * - 게시글 상세 보기 모달
 * - 본인 글 삭제, 마감 표시
 * - 다크모드 지원
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    MapPin,
    Search,
    Heart,
    MessageCircle,
    Clock,
    PenSquare,
    X,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Eye,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { uploadLocalPostImage } from "@/lib/storage";
import { TabType } from "@/types";
import { API } from "@/config/apiEndpoints";
import type { LocalPost, PostFormData } from "@/components/features/local/localTypes";
import { REGIONS, CATEGORIES, INITIAL_FORM, getBadgeStyle, getCategoryLabel, timeAgo } from "@/components/features/local/localTypes";
import LocalDetailModal from "@/components/features/local/LocalDetailModal";
import LocalCreateModal from "@/components/features/local/LocalCreateModal";

interface LocalPageProps {
    setSelectedTab?: (tab: TabType) => void;
}

export default function LocalPage({ setSelectedTab }: LocalPageProps) {
    const { user } = useAuth();

    // 목록 상태
    const [posts, setPosts] = useState<LocalPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalPages, setTotalPages] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);

    // 필터 상태
    const [selectedRegion, setSelectedRegion] = useState<string>("");
    const [selectedDistrict, setSelectedDistrict] = useState<string>("");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [searchInput, setSearchInput] = useState<string>("");

    // 검색 debounce (300ms)
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // 모달 상태
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedPost, setSelectedPost] = useState<LocalPost | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    // 작성 폼 상태
    const [form, setForm] = useState<PostFormData>(INITIAL_FORM);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const districts = selectedRegion ? REGIONS[selectedRegion] || [] : [];
    const formDistricts = form.region ? REGIONS[form.region] || [] : [];

    // ==========================================
    // API 호출
    // ==========================================

    const fetchPosts = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set("page", page.toString());
            params.set("size", "20");
            if (selectedCategory !== "all") params.set("category", selectedCategory);
            if (selectedRegion) params.set("region", selectedRegion);
            if (selectedDistrict) params.set("district", selectedDistrict);
            if (searchQuery) params.set("search", searchQuery);

            const res = await fetch(`${API.LOCAL_POSTS}?${params.toString()}`);
            if (!res.ok) throw new Error("게시글 목록 조회 실패");

            const data = await res.json();
            setPosts(data.posts || []);
            setTotalPages(data.totalPages || 0);
            setTotalCount(data.total || 0);
        } catch {
            toast.error("게시글을 불러오지 못했습니다.");
            setPosts([]);
        } finally {
            setLoading(false);
        }
    }, [page, selectedCategory, selectedRegion, selectedDistrict, searchQuery]);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    // 필터 변경 시 페이지 리셋
    useEffect(() => {
        setPage(1);
    }, [selectedCategory, selectedRegion, selectedDistrict]);

    const handleSearch = () => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        setSearchQuery(searchInput.trim());
        setPage(1);
    };

    // 검색어 debounce: 타이핑 후 300ms 후 자동 검색
    useEffect(() => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
            const trimmed = searchInput.trim();
            // handleSearch에서 이미 설정된 같은 값이면 skip (이중 실행 방지)
            setSearchQuery((prev) => {
                if (prev === trimmed) return prev;
                setPage(1);
                return trimmed;
            });
        }, 300);
        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        };
    }, [searchInput]);

    // ==========================================
    // 게시글 상세 조회
    // ==========================================

    const openDetail = async (post: LocalPost) => {
        setSelectedPost(post);
        setShowDetailModal(true);
        setDetailLoading(true);
        try {
            const res = await fetch(API.LOCAL_POST_DETAIL(post.id));
            if (res.ok) {
                const data = await res.json();
                setSelectedPost(data.post);
            }
        } catch {
            // 상세 조회 실패 시 목록 데이터로 대체 표시 + 사용자 알림
            toast.error("상세 정보를 불러오지 못했습니다. 기본 정보로 표시합니다.");
        } finally {
            setDetailLoading(false);
        }
    };

    // ==========================================
    // 게시글 작성
    // ==========================================

    const openCreateModal = () => {
        if (!user) {
            toast.error("로그인이 필요합니다.");
            return;
        }
        setForm({ ...INITIAL_FORM, region: selectedRegion, district: selectedDistrict });
        setImageFile(null);
        setImagePreview(null);
        setShowCreateModal(true);
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            toast.error("이미지는 10MB 이하만 가능합니다.");
            return;
        }
        setImageFile(file);
        const reader = new FileReader();
        reader.onload = (ev) => setImagePreview(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    const handleSubmit = async () => {
        if (!user) { toast.error("로그인이 필요합니다."); return; }
        if (!form.title.trim()) { toast.error("제목을 입력해주세요."); return; }
        if (!form.category) { toast.error("카테고리를 선택해주세요."); return; }

        setSubmitting(true);
        try {
            let imageUrl: string | null = null;
            let imageStoragePath: string | null = null;

            if (imageFile) {
                const uploadResult = await uploadLocalPostImage(imageFile, user.id);
                if (uploadResult.success && uploadResult.url) {
                    imageUrl = uploadResult.url;
                    imageStoragePath = uploadResult.path || null;
                } else {
                    toast.error(uploadResult.error || "이미지 업로드 실패");
                }
            }

            const res = await fetch(API.LOCAL_POSTS, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    category: form.category,
                    title: form.title.trim(),
                    content: form.content.trim(),
                    region: form.region,
                    district: form.district,
                    badge: form.badge,
                    imageUrl,
                    imageStoragePath,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "게시글 작성 실패");
            }

            toast.success("게시글이 등록되었습니다.");
            setShowCreateModal(false);
            setPage(1);
            fetchPosts();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "게시글 작성에 실패했습니다.");
        } finally {
            setSubmitting(false);
        }
    };

    // ==========================================
    // 게시글 삭제 & 마감
    // ==========================================

    const handleDelete = async (postId: string) => {
        if (!confirm("정말 삭제하시겠습니까?")) return;
        try {
            const res = await fetch(API.LOCAL_POST_DETAIL(postId), { method: "DELETE" });
            if (!res.ok) throw new Error("삭제 실패");
            toast.success("게시글이 삭제되었습니다.");
            setShowDetailModal(false);
            setSelectedPost(null);
            fetchPosts();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "삭제에 실패했습니다.");
        }
    };

    const handleClose = async (postId: string) => {
        if (!confirm("마감 처리하시겠습니까?")) return;
        try {
            const res = await fetch(API.LOCAL_POST_DETAIL(postId), {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "closed" }),
            });
            if (!res.ok) throw new Error("마감 처리 실패");
            toast.success("마감 처리되었습니다.");
            setShowDetailModal(false);
            setSelectedPost(null);
            fetchPosts();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "마감 처리에 실패했습니다.");
        }
    };

    // ==========================================
    // 렌더링
    // ==========================================

    return (
        <div className="min-h-screen relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-100 via-blue-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-200/30 to-sky-200/30 dark:from-blue-800/20 dark:to-sky-800/20 rounded-full blur-3xl animate-pulse" />
            </div>

            <div className="relative z-10 space-y-6 pb-8">
                {/* 헤더 */}
                <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-white/50 dark:border-gray-700/50 rounded-3xl p-6">
                    <div className="flex items-center justify-between gap-3 mb-6">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-sky-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
                                    지역정보
                                </h1>
                                <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                                    우리 동네 반려동물 이야기
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={openCreateModal}
                            className="bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 rounded-xl flex-shrink-0 px-3 sm:px-4"
                        >
                            <PenSquare className="w-4 h-4 sm:mr-2" />
                            <span className="hidden sm:inline">글쓰기</span>
                        </Button>
                    </div>

                    {/* 지역 선택 */}
                    <div className="space-y-3 mb-4">
                        <div className="flex gap-2">
                            <Select
                                value={selectedRegion}
                                onValueChange={(v) => {
                                    setSelectedRegion(v);
                                    setSelectedDistrict("");
                                }}
                            >
                                <SelectTrigger className="flex-1 rounded-xl bg-white/70 dark:bg-gray-700/70 dark:border-gray-600">
                                    <SelectValue placeholder="시/도" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.keys(REGIONS).map((region) => (
                                        <SelectItem key={region} value={region}>
                                            {region}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={selectedDistrict}
                                onValueChange={setSelectedDistrict}
                                disabled={!selectedRegion}
                            >
                                <SelectTrigger className="flex-1 rounded-xl bg-white/70 dark:bg-gray-700/70 dark:border-gray-600">
                                    <SelectValue placeholder="구/군" />
                                </SelectTrigger>
                                <SelectContent>
                                    {districts.map((district) => (
                                        <SelectItem key={district} value={district}>
                                            {district}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {selectedRegion && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setSelectedRegion("");
                                        setSelectedDistrict("");
                                    }}
                                    aria-label="지역 선택 초기화"
                                    className="rounded-xl dark:border-gray-600 px-3"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            )}
                        </div>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="검색어를 입력하세요"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                className="pl-10 rounded-xl bg-white/70 dark:bg-gray-700/70 dark:border-gray-600"
                            />
                        </div>
                    </div>

                    {/* 카테고리 필터 */}
                    <div className="grid grid-cols-4 sm:flex sm:flex-wrap gap-1.5 sm:gap-2">
                        {CATEGORIES.map((cat) => {
                            const Icon = cat.icon;
                            const isActive = selectedCategory === cat.id;
                            return (
                                <Button
                                    key={cat.id}
                                    variant={isActive ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`rounded-xl flex-col sm:flex-row h-auto py-2 sm:py-1.5 px-1 sm:px-3 ${
                                        isActive
                                            ? "bg-gradient-to-r from-blue-500 to-sky-500 text-white border-0"
                                            : "bg-white/50 dark:bg-gray-700/50 border-blue-200 dark:border-blue-700 dark:text-gray-300"
                                    }`}
                                >
                                    <Icon className="w-4 h-4 sm:mr-1" />
                                    <span className="text-[10px] sm:text-sm mt-0.5 sm:mt-0">{cat.label}</span>
                                </Button>
                            );
                        })}
                    </div>
                </div>

                {/* 현재 위치 & 결과 수 */}
                {(selectedRegion || totalCount > 0) && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 px-1">
                        {selectedRegion && (
                            <>
                                <MapPin className="w-4 h-4" />
                                <span className="font-medium">
                                    {selectedRegion} {selectedDistrict}
                                </span>
                            </>
                        )}
                        {totalCount > 0 && (
                            <span className="text-sm text-gray-400 dark:text-gray-500">
                                ({totalCount}개의 글)
                            </span>
                        )}
                    </div>
                )}

                {/* 로딩 */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <span className="ml-3 text-gray-500 dark:text-gray-400">게시글을 불러오는 중...</span>
                    </div>
                ) : (
                    <>
                        {/* 게시글 목록 */}
                        <div className="space-y-4">
                            {posts.map((post) => (
                                <Card
                                    key={post.id}
                                    onClick={() => openDetail(post)}
                                    className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-white/50 dark:border-gray-700/50 hover:bg-white/80 dark:hover:bg-gray-700/60 transition-all duration-300 rounded-2xl cursor-pointer"
                                >
                                    <CardHeader className="pb-2">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Badge className={`${getBadgeStyle(post.badge)} rounded-lg`}>
                                                    {post.badge}
                                                </Badge>
                                                {post.region && (
                                                    <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {post.region} {post.district}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-sm text-gray-400 dark:text-gray-500 flex items-center gap-1 flex-shrink-0">
                                                <Clock className="w-3 h-3" />
                                                {timeAgo(post.createdAt)}
                                            </span>
                                        </div>
                                        <CardTitle className="text-lg text-gray-800 dark:text-gray-100 mt-2">
                                            {post.title}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pb-2">
                                        {post.content && (
                                            <p className="text-gray-600 dark:text-gray-300 line-clamp-2">
                                                {post.content}
                                            </p>
                                        )}
                                        {post.imageUrl && (
                                            <div className="mt-2 rounded-xl overflow-hidden h-40 bg-gray-100 dark:bg-gray-700">
                                                <img src={post.imageUrl} alt="" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                    </CardContent>
                                    <CardFooter className="flex items-center justify-between pt-2">
                                        <span className="text-xs text-gray-400 dark:text-gray-500">
                                            {getCategoryLabel(post.category)}
                                        </span>
                                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <Eye className="w-3 h-3" />
                                                {post.views}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Heart className="w-4 h-4" />
                                                {post.likesCount}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <MessageCircle className="w-4 h-4" />
                                                {post.commentsCount}
                                            </span>
                                        </div>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>

                        {/* 빈 상태 */}
                        {posts.length === 0 && (
                            <div className="text-center py-16">
                                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <MapPin className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                                </div>
                                <p className="text-gray-500 dark:text-gray-400">
                                    해당 조건의 게시글이 없습니다
                                </p>
                                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                                    첫 번째 글을 작성해보세요!
                                </p>
                                <div className="flex gap-2 justify-center mt-4">
                                    <Button
                                        variant="outline"
                                        className="rounded-xl dark:border-gray-600"
                                        onClick={() => {
                                            setSelectedCategory("all");
                                            setSelectedRegion("");
                                            setSelectedDistrict("");
                                            setSearchQuery("");
                                            setSearchInput("");
                                            setPage(1);
                                        }}
                                    >
                                        필터 초기화
                                    </Button>
                                    <Button
                                        onClick={openCreateModal}
                                        className="rounded-xl bg-gradient-to-r from-blue-500 to-sky-500"
                                    >
                                        <PenSquare className="w-4 h-4 mr-1" />
                                        글쓰기
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* 페이지네이션 */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 pt-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page <= 1}
                                    aria-label="이전 페이지"
                                    className="rounded-xl dark:border-gray-600"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum: number;
                                    if (totalPages <= 5) { pageNum = i + 1; }
                                    else if (page <= 3) { pageNum = i + 1; }
                                    else if (page >= totalPages - 2) { pageNum = totalPages - 4 + i; }
                                    else { pageNum = page - 2 + i; }
                                    return (
                                        <Button
                                            key={pageNum}
                                            variant={pageNum === page ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setPage(pageNum)}
                                            className={`rounded-xl min-w-[36px] ${
                                                pageNum === page
                                                    ? "bg-gradient-to-r from-blue-500 to-sky-500 border-0"
                                                    : "dark:border-gray-600"
                                            }`}
                                        >
                                            {pageNum}
                                        </Button>
                                    );
                                })}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages}
                                    aria-label="다음 페이지"
                                    className="rounded-xl dark:border-gray-600"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* 상세 모달 */}
            {showDetailModal && selectedPost && (
                <LocalDetailModal
                    post={selectedPost}
                    loading={detailLoading}
                    isOwner={user?.id === selectedPost.userId}
                    onClose={() => { setShowDetailModal(false); setSelectedPost(null); }}
                    onDelete={handleDelete}
                    onClosePost={handleClose}
                />
            )}

            {/* 작성 모달 */}
            {showCreateModal && (
                <LocalCreateModal
                    form={form}
                    setForm={setForm}
                    imagePreview={imagePreview}
                    formDistricts={formDistricts}
                    submitting={submitting}
                    fileInputRef={fileInputRef as React.RefObject<HTMLInputElement>}
                    onImageSelect={handleImageSelect}
                    onRemoveImage={() => { setImageFile(null); setImagePreview(null); }}
                    onSubmit={handleSubmit}
                    onClose={() => setShowCreateModal(false)}
                />
            )}
        </div>
    );
}
