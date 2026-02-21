/**
 * LostPage.tsx
 * 분실동물 찾기 페이지
 * 실종 / 발견 신고 및 검색 (DB 연동)
 *
 * 기능:
 * - API 기반 게시글 목록 조회 (필터, 페이지네이션)
 * - 실종/발견 신고 작성 (이미지 업로드 포함)
 * - 게시글 상세 보기 모달
 * - 본인 글 수정/삭제, 해결 표시
 * - 다크모드 지원
 *
 * useLostPosts: 목록 조회, 필터, 검색, 페이지네이션
 * useLostPostActions: 상세 조회, 작성, 삭제, 해결 액션
 * LostPageHeader: 헤더 통계 + 필터 UI
 */

"use client";

import { Button } from "@/components/ui/button";
import {
    ChevronLeft,
    ChevronRight,
    PawPrint,
    Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { TabType } from "@/types";
import LostPetPostCard from "@/components/features/lost/LostPetPostCard";
import LostPetDetailModal from "@/components/features/lost/LostPetDetailModal";
import LostPetCreateModal from "@/components/features/lost/LostPetCreateModal";
import LostPageHeader from "@/components/features/lost/LostPageHeader";
import { useLostPosts } from "@/components/features/lost/useLostPosts";
import { useLostPostActions } from "@/components/features/lost/useLostPostActions";

interface LostPageProps {
    setSelectedTab?: (tab: TabType) => void;
}

export default function LostPage({ setSelectedTab }: LostPageProps) {
    const { user } = useAuth();

    // 목록 조회, 필터, 검색, 페이지네이션
    const {
        posts,
        loading,
        totalPages,
        totalCount,
        page,
        setPage,
        selectedType,
        setSelectedType,
        selectedRegion,
        setSelectedRegion,
        selectedDistrict,
        setSelectedDistrict,
        selectedPetType,
        setSelectedPetType,
        searchInput,
        setSearchInput,
        lostCount,
        foundCount,
        districts,
        handleSearch,
        fetchPosts,
        fetchStats,
        resetFilters,
    } = useLostPosts();

    // 상세 조회, 작성, 삭제, 해결 액션
    const {
        showCreateModal,
        setShowCreateModal,
        showDetailModal,
        setShowDetailModal,
        selectedPost,
        setSelectedPost,
        detailLoading,
        form,
        setForm,
        imagePreview,
        submitting,
        fileInputRef,
        formDistricts,
        openDetail,
        openCreateModal,
        handleImageSelect,
        handleSubmit,
        handleDelete,
        handleResolve,
        removeImage,
    } = useLostPostActions({ user, fetchPosts, fetchStats, setPage });

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* 배경 그라데이션 */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-red-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-orange-200/30 to-red-200/30 dark:from-orange-800/20 dark:to-red-800/20 rounded-full blur-3xl animate-pulse" />
            </div>

            <div className="relative z-10 space-y-6 pb-8">
                {/* 헤더: 통계 + 필터 */}
                <LostPageHeader
                    lostCount={lostCount}
                    foundCount={foundCount}
                    selectedType={selectedType}
                    setSelectedType={setSelectedType}
                    selectedRegion={selectedRegion}
                    setSelectedRegion={setSelectedRegion}
                    selectedDistrict={selectedDistrict}
                    setSelectedDistrict={setSelectedDistrict}
                    districts={districts}
                    selectedPetType={selectedPetType}
                    setSelectedPetType={setSelectedPetType}
                    searchInput={searchInput}
                    setSearchInput={setSearchInput}
                    onSearch={handleSearch}
                    onCreateLost={() => openCreateModal("lost")}
                    onCreateFound={() => openCreateModal("found")}
                />

                {/* 로딩 */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                        <span className="ml-3 text-gray-500 dark:text-gray-400">게시글을 불러오는 중...</span>
                    </div>
                ) : (
                    <>
                        {/* 결과 수 */}
                        {totalCount > 0 && (
                            <div className="text-sm text-gray-500 dark:text-gray-400 px-1">
                                총 {totalCount}건의 게시글
                            </div>
                        )}

                        {/* 게시글 목록 */}
                        <div className="grid gap-4 md:grid-cols-2">
                            {posts.map((post) => (
                                <LostPetPostCard key={post.id} post={post} onClick={() => openDetail(post)} />
                            ))}
                        </div>

                        {/* 빈 상태 */}
                        {posts.length === 0 && (
                            <div className="text-center py-16">
                                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <PawPrint className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                                </div>
                                <p className="text-gray-500 dark:text-gray-400">
                                    해당 조건의 게시글이 없습니다
                                </p>
                                <Button
                                    variant="outline"
                                    className="mt-4 rounded-xl dark:border-gray-600"
                                    onClick={resetFilters}
                                >
                                    필터 초기화
                                </Button>
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
                                    if (totalPages <= 5) {
                                        pageNum = i + 1;
                                    } else if (page <= 3) {
                                        pageNum = i + 1;
                                    } else if (page >= totalPages - 2) {
                                        pageNum = totalPages - 4 + i;
                                    } else {
                                        pageNum = page - 2 + i;
                                    }
                                    return (
                                        <Button
                                            key={pageNum}
                                            variant={pageNum === page ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setPage(pageNum)}
                                            className={`rounded-xl min-w-[36px] ${
                                                pageNum === page
                                                    ? "bg-gradient-to-r from-orange-500 to-red-500 border-0"
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
                <LostPetDetailModal
                    post={selectedPost}
                    loading={detailLoading}
                    isOwner={user?.id === selectedPost.userId}
                    onClose={() => {
                        setShowDetailModal(false);
                        setSelectedPost(null);
                    }}
                    onDelete={handleDelete}
                    onResolve={handleResolve}
                />
            )}

            {/* 작성 모달 */}
            {showCreateModal && (
                <LostPetCreateModal
                    form={form}
                    setForm={setForm}
                    imagePreview={imagePreview}
                    formDistricts={formDistricts}
                    submitting={submitting}
                    fileInputRef={fileInputRef}
                    onImageSelect={handleImageSelect}
                    onRemoveImage={removeImage}
                    onSubmit={handleSubmit}
                    onClose={() => setShowCreateModal(false)}
                />
            )}
        </div>
    );
}
