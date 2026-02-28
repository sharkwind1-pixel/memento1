/**
 * CommunityPage.tsx
 * 커뮤니티 - 5개 서브카테고리 (자유/추모/입양/지역/분실)
 * v2: 말머리 시스템 추가, 서브카테고리 통합
 */

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { usePets } from "@/contexts/PetContext";
import { useAuth } from "@/contexts/AuthContext";
import WritePostModal from "@/components/features/community/WritePostModal";
import PostDetailView from "@/components/features/community/PostDetailView";
import CommunityHeader from "@/components/features/community/CommunityHeader";
import CommunityPostList from "@/components/features/community/CommunityPostList";
import ShowcaseBanner from "@/components/features/community/ShowcaseBanner";
import ShowcaseGalleryView from "@/components/features/community/ShowcaseGalleryView";
import MinihompyVisitModal from "@/components/features/minihompy/MinihompyVisitModal";
import ReportModal from "@/components/modals/ReportModal";
import type { CommunitySubcategory, PostTag, CommunityPageProps } from "@/types";
import { API } from "@/config/apiEndpoints";
import type { Post } from "@/components/features/community/communityTypes";
import {
    SUBCATEGORIES,
    MOCK_POSTS,
    MOCK_SHOWCASE_POSTS,
    getCategoryColor,
} from "@/components/features/community/communityTypes";

function CommunityPage({ subcategory, onSubcategoryChange }: CommunityPageProps) {
    const { selectedPet } = usePets();
    const { user } = useAuth();

    // 서브카테고리 상태 (props 또는 내부 상태)
    const [internalSubcategory, setInternalSubcategory] = useState<CommunitySubcategory>(subcategory || "free");
    const currentSubcategory = subcategory || internalSubcategory;

    // 말머리 필터 (자유게시판용) — localStorage로 새로고침 시 복원
    const [selectedTag, setSelectedTag] = useState<PostTag | "all">(() => {
        if (typeof window !== "undefined") {
            return (localStorage.getItem("memento-community-tag") as PostTag | "all") || "all";
        }
        return "all";
    });

    // 뱃지(게시글 유형) 필터 — 홈에서 딥링크 시 sessionStorage, 그 외 localStorage
    const [selectedBadge, setSelectedBadge] = useState<string>(() => {
        if (typeof window !== "undefined") {
            const fromHome = sessionStorage.getItem("memento-community-badge");
            if (fromHome) {
                sessionStorage.removeItem("memento-community-badge");
                return fromHome;
            }
            return localStorage.getItem("memento-community-badge") || "all";
        }
        return "all";
    });
    // "함께 보기" 독립 갤러리 뷰 상태
    const [showcaseView, setShowcaseView] = useState<boolean>(() => {
        if (typeof window !== "undefined") {
            const fromHome = sessionStorage.getItem("memento-community-view");
            if (fromHome === "showcase") {
                sessionStorage.removeItem("memento-community-view");
                return true;
            }
        }
        return false;
    });

    const [searchInput, setSearchInput] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [sortBy, setSortBy] = useState<string>(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("memento-community-sort") || "latest";
        }
        return "latest";
    });

    // 실제 데이터 상태
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [showWriteModal, setShowWriteModal] = useState(false);
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
    const [visitUserId, setVisitUserId] = useState<string | null>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const POSTS_PER_PAGE = 15;

    // 신고 모달 상태
    const [reportTarget, setReportTarget] = useState<{
        id: string;
        type: "post" | "comment" | "user";
        title?: string;
    } | null>(null);

    // 필터 변경 시 localStorage에 저장
    useEffect(() => { localStorage.setItem("memento-community-tag", selectedTag); }, [selectedTag]);
    useEffect(() => { localStorage.setItem("memento-community-badge", selectedBadge); }, [selectedBadge]);
    useEffect(() => { localStorage.setItem("memento-community-sort", sortBy); }, [sortBy]);

    // 추모 모드 여부 확인
    const isMemorialMode = selectedPet?.status === "memorial";

    // 모드에 따라 서브카테고리 필터링 (일상 모드에서는 추모게시판 숨김)
    const visibleSubcategories = SUBCATEGORIES.filter(
        (sub) => !sub.memorialOnly || isMemorialMode
    );

    const currentSubcategoryInfo = visibleSubcategories.find((s) => s.id === currentSubcategory) || visibleSubcategories[0];
    const currentColor = getCategoryColor(currentSubcategoryInfo.color);

    // 서브카테고리 변경 핸들러
    const handleSubcategoryChange = (subId: CommunitySubcategory) => {
        if (onSubcategoryChange) {
            onSubcategoryChange(subId);
        } else {
            setInternalSubcategory(subId);
        }
        setSelectedTag("all");
        setSelectedBadge("all");
    };

    // 게시글 불러오기 (초기 로드 또는 추가 로드)
    const fetchPosts = useCallback(async (loadMore = false) => {
        if (loadMore) {
            setIsLoadingMore(true);
        } else {
            setIsLoading(true);
            setPosts([]);
            setHasMore(true);
        }

        const offset = loadMore ? posts.length : 0;

        try {
            const params = new URLSearchParams({
                board: currentSubcategory,
                sort: sortBy,
                limit: String(POSTS_PER_PAGE),
                offset: String(offset),
            });
            if (selectedTag !== "all") {
                params.append("tag", selectedTag);
            }
            if (currentSubcategory === "free" && selectedBadge !== "all") {
                params.append("badge", selectedBadge);
            }
            if (searchQuery) {
                params.append("search", searchQuery);
            }

            const response = await fetch(`${API.POSTS}?${params}`);
            if (!response.ok) {
                throw new Error("게시글을 불러오는데 실패했습니다");
            }
            const data = await response.json();

            if (data.posts) {
                const mapped = data.posts.map((p: Post & { boardType?: string; animalType?: string }) => ({
                    ...p,
                    subcategory: p.subcategory || p.boardType || currentSubcategory,
                    tag: p.tag || p.animalType,
                }));

                if (loadMore) {
                    setPosts(prev => [...prev, ...mapped]);
                } else {
                    setPosts(mapped);
                }

                const total = data.total ?? Infinity;
                setHasMore(offset + mapped.length < total);
            } else {
                throw new Error("API 응답 없음");
            }
        } catch {
            if (!loadMore) {
                toast.error("게시글을 불러오지 못했습니다. 샘플 데이터를 표시합니다.");
                const mockPosts = MOCK_POSTS[currentSubcategory] || [];
                let filteredPosts = mockPosts;

                if (currentSubcategory === "free" && selectedTag !== "all") {
                    filteredPosts = mockPosts.filter(p => p.tag === selectedTag);
                }

                setPosts(filteredPosts.map((p) => ({
                    id: String(p.id),
                    userId: "",
                    subcategory: currentSubcategory,
                    tag: p.tag,
                    badge: p.badge,
                    title: p.title,
                    content: p.content,
                    authorName: p.author,
                    likes: p.likes,
                    views: p.views,
                    comments: p.comments,
                    createdAt: new Date().toISOString(),
                })));
                setHasMore(false);
            }
        } finally {
            if (loadMore) {
                setIsLoadingMore(false);
            } else {
                setIsLoading(false);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentSubcategory, sortBy, selectedTag, selectedBadge, searchQuery]);

    // 검색어 debounce (300ms)
    useEffect(() => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
            setSearchQuery(searchInput.trim());
        }, 300);
        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        };
    }, [searchInput]);

    // 서브카테고리/정렬/필터 변경 시 다시 로드
    useEffect(() => {
        fetchPosts(false);
    }, [fetchPosts]);

    // IntersectionObserver - 무한 스크롤
    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
                    fetchPosts(true);
                }
            },
            { rootMargin: "200px" }
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [hasMore, isLoading, isLoadingMore, fetchPosts]);

    // 글쓰기 버튼 클릭
    const handleWriteClick = () => {
        if (!user) {
            window.dispatchEvent(new CustomEvent("openAuthModal"));
            return;
        }
        setShowWriteModal(true);
    };

    // 상세보기 모드
    if (selectedPostId) {
        return (
            <div
                className="min-h-screen relative overflow-hidden"
                style={{ contain: 'layout style', transform: 'translateZ(0)' }}
            >
                <div className="absolute inset-0 bg-gradient-to-br from-memento-50 via-memento-75 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-memento-300/30 to-sky-200/30 dark:from-blue-800/20 dark:to-sky-800/20 rounded-full blur-3xl animate-pulse" />
                </div>
                <div className="relative z-10 pb-8">
                    <PostDetailView
                        postId={selectedPostId}
                        subcategory={currentSubcategory}
                        onBack={() => setSelectedPostId(null)}
                        onPostDeleted={() => fetchPosts(false)}
                    />
                </div>
            </div>
        );
    }

    // "함께 보기" 갤러리 뷰 모드
    if (showcaseView) {
        return (
            <div
                className="min-h-screen relative overflow-hidden"
                style={{ contain: 'layout style', transform: 'translateZ(0)' }}
            >
                <ShowcaseGalleryView
                    onBack={() => setShowcaseView(false)}
                    onWriteClick={handleWriteClick}
                />

                {/* 글쓰기 모달 (갤러리 뷰에서도 접근 가능) */}
                <WritePostModal
                    isOpen={showWriteModal}
                    onClose={() => setShowWriteModal(false)}
                    boardType="free"
                    onSuccess={() => {
                        fetchPosts(false);
                        setShowcaseView(false);
                    }}
                />
            </div>
        );
    }

    // 배너용 미리보기 이미지
    const showcasePreviewImages = MOCK_SHOWCASE_POSTS.slice(0, 4).map(p => p.imageUrls?.[0] ?? "").filter(Boolean);

    return (
        <div
            className="min-h-screen relative overflow-hidden"
            style={{ contain: 'layout style', transform: 'translateZ(0)' }}
        >
            {/* 배경 */}
            <div className="absolute inset-0 bg-gradient-to-br from-memento-50 via-memento-75 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-memento-300/30 to-sky-200/30 dark:from-blue-800/20 dark:to-sky-800/20 rounded-full blur-3xl animate-pulse" />
            </div>

            <div className="relative z-10 space-y-6 pb-8">
                <CommunityHeader
                    currentSubcategory={currentSubcategory}
                    visibleSubcategories={visibleSubcategories}
                    selectedTag={selectedTag}
                    selectedBadge={selectedBadge}
                    searchInput={searchInput}
                    sortBy={sortBy}
                    currentColor={currentColor}
                    onSubcategoryChange={handleSubcategoryChange}
                    onTagChange={setSelectedTag}
                    onBadgeChange={setSelectedBadge}
                    onSearchInputChange={setSearchInput}
                    onSearchSubmit={() => {
                        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                        setSearchQuery(searchInput.trim());
                    }}
                    onSortChange={setSortBy}
                    onWriteClick={handleWriteClick}
                />

                {/* "함께 보기" 배너 - 모든 서브카테고리에서 항상 표시 */}
                <ShowcaseBanner
                    previewImages={showcasePreviewImages}
                    postCount={MOCK_SHOWCASE_POSTS.length}
                    onOpen={() => setShowcaseView(true)}
                />

                <CommunityPostList
                    posts={posts}
                    isLoading={isLoading}
                    isLoadingMore={isLoadingMore}
                    hasMore={hasMore}
                    currentSubcategory={currentSubcategory}
                    searchQuery={searchQuery}
                    currentColorBg={currentColor.bg}
                    userId={user?.id}
                    sentinelRef={sentinelRef}
                    onSelectPost={setSelectedPostId}
                    onVisitUser={setVisitUserId}
                    onReportPost={(post) => setReportTarget({ id: post.id, type: "post", title: post.title })}
                    onWriteClick={handleWriteClick}
                    onClearSearch={() => { setSearchInput(""); setSearchQuery(""); }}
                />
            </div>

            {/* 글쓰기 모달 */}
            <WritePostModal
                isOpen={showWriteModal}
                onClose={() => setShowWriteModal(false)}
                boardType={currentSubcategory}
                onSuccess={() => fetchPosts(false)}
            />

            {/* 신고 모달 */}
            {reportTarget && (
                <ReportModal
                    isOpen={true}
                    onClose={() => setReportTarget(null)}
                    targetType={reportTarget.type}
                    targetId={reportTarget.id}
                    targetTitle={reportTarget.title}
                />
            )}

            {/* 미니홈피 방문 모달 */}
            {visitUserId && (
                <MinihompyVisitModal
                    isOpen={true}
                    onClose={() => setVisitUserId(null)}
                    userId={visitUserId}
                />
            )}
        </div>
    );
}

export default React.memo(CommunityPage);
