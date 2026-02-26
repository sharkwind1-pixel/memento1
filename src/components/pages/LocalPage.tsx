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

import React, { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { authFetch } from "@/lib/auth-fetch";
import { uploadLocalPostImage } from "@/lib/storage";
import { TabType } from "@/types";
import { API } from "@/config/apiEndpoints";
import type { LocalPost, PostFormData } from "@/components/features/local/localTypes";
import { REGIONS, INITIAL_FORM } from "@/components/features/local/localTypes";
import LocalDetailModal from "@/components/features/local/LocalDetailModal";
import LocalCreateModal from "@/components/features/local/LocalCreateModal";
import LocalHeader from "@/components/features/local/LocalHeader";
import LocalPostList from "@/components/features/local/LocalPostList";

interface LocalPageProps {
    setSelectedTab?: (tab: TabType) => void;
}

function LocalPage({ setSelectedTab }: LocalPageProps) {
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

            const res = await authFetch(API.LOCAL_POSTS, {
                method: "POST",
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
            const res = await authFetch(API.LOCAL_POST_DETAIL(postId), { method: "DELETE" });
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
            const res = await authFetch(API.LOCAL_POST_DETAIL(postId), {
                method: "PATCH",
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
                <LocalHeader
                    selectedRegion={selectedRegion}
                    selectedDistrict={selectedDistrict}
                    selectedCategory={selectedCategory}
                    searchInput={searchInput}
                    onRegionChange={setSelectedRegion}
                    onDistrictChange={setSelectedDistrict}
                    onCategoryChange={setSelectedCategory}
                    onSearchInputChange={setSearchInput}
                    onSearchSubmit={handleSearch}
                    onClearRegion={() => { setSelectedRegion(""); setSelectedDistrict(""); }}
                    onWriteClick={openCreateModal}
                />

                <LocalPostList
                    posts={posts}
                    loading={loading}
                    totalPages={totalPages}
                    totalCount={totalCount}
                    page={page}
                    selectedRegion={selectedRegion}
                    selectedDistrict={selectedDistrict}
                    onPageChange={setPage}
                    onSelectPost={openDetail}
                    onWriteClick={openCreateModal}
                    onClearFilters={() => {
                        setSelectedCategory("all");
                        setSelectedRegion("");
                        setSelectedDistrict("");
                        setSearchQuery("");
                        setSearchInput("");
                        setPage(1);
                    }}
                />
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

export default React.memo(LocalPage);
