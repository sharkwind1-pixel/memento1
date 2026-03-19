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
import { authFetch } from "@/lib/auth-fetch";
import WritePostModal from "@/components/features/community/WritePostModal";
import PostDetailView from "@/components/features/community/PostDetailView";
import CommunityHeader from "@/components/features/community/CommunityHeader";
import CommunityPostList from "@/components/features/community/CommunityPostList";
import ShowcaseBanner from "@/components/features/community/ShowcaseBanner";
import ShowcaseGalleryView from "@/components/features/community/ShowcaseGalleryView";
import HotPosts from "@/components/features/community/HotPosts";
import MinihompyVisitModal from "@/components/features/minihompy/MinihompyVisitModal";
import ReportModal from "@/components/modals/ReportModal";
import type { CommunitySubcategory, PostTag, CommunityPageProps } from "@/types";
import { API } from "@/config/apiEndpoints";
import type { Post } from "@/components/features/community/communityTypes";
import {
    SUBCATEGORIES,
    getCategoryColor,
} from "@/components/features/community/communityTypes";
import { safeGetItem, safeSetItem, safeSessionGetItem, safeSessionRemoveItem } from "@/lib/safe-storage";

function CommunityPage({ subcategory, onSubcategoryChange, isActive, resetKey }: CommunityPageProps) {
    const { selectedPet } = usePets();
    const { user } = useAuth();

    // 서브카테고리 상태 (props 또는 내부 상태)
    const [internalSubcategory, setInternalSubcategory] = useState<CommunitySubcategory>(subcategory || "free");
    const currentSubcategory = subcategory || internalSubcategory;

    // 말머리 필터 (자유게시판용) — localStorage로 새로고침 시 복원
    const VALID_TAGS: (PostTag | "all")[] = ["all", "정보", "강아지", "고양이", "일상", "질문", "새", "물고기", "토끼", "파충류"];
    const [selectedTag, setSelectedTag] = useState<PostTag | "all">(() => {
        if (typeof window !== "undefined") {
            const saved = safeGetItem("memento-community-tag");
            if (saved && VALID_TAGS.includes(saved as PostTag | "all")) {
                return saved as PostTag | "all";
            }
        }
        return "all";
    });

    // 뱃지(게시글 유형) 필터 — 홈에서 딥링크 시 sessionStorage, 그 외 localStorage
    const [selectedBadge, setSelectedBadge] = useState<string>(() => {
        if (typeof window !== "undefined") {
            const fromHome = safeSessionGetItem("memento-community-badge");
            if (fromHome) {
                safeSessionRemoveItem("memento-community-badge");
                return fromHome;
            }
            return safeGetItem("memento-community-badge") || "all";
        }
        return "all";
    });
    // "함께 보기" 독립 갤러리 뷰 상태
    const [showcaseView, setShowcaseView] = useState<boolean>(() => {
        if (typeof window !== "undefined") {
            const fromHome = safeSessionGetItem("memento-community-view");
            if (fromHome === "showcase") {
                safeSessionRemoveItem("memento-community-view");
                return true;
            }
        }
        return false;
    });

    // 지역 필터 (지역정보 게시판용) — localStorage로 새로고침 시 복원
    const [selectedRegion, setSelectedRegion] = useState<string>(() => {
        if (typeof window !== "undefined") {
            return safeGetItem("memento-community-region") || "all";
        }
        return "all";
    });

    const [searchInput, setSearchInput] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [sortBy, setSortBy] = useState<string>(() => {
        if (typeof window !== "undefined") {
            return safeGetItem("memento-community-sort") || "latest";
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
    const isNavigatingBackRef = useRef(false);

    // ============================================================
    // 외부 리셋 처리 (isActive / subcategory / resetKey 변경 감지)
    // ============================================================

    console.log("[DEBUG CommunityPage RENDER]", { selectedPostId, subcategory, resetKey, isActive });

    // 다른 탭으로 이동 시 리셋
    useEffect(() => {
        if (!isActive) {
            console.log("[DEBUG CommunityPage] isActive=false → clearing selectedPostId");
            setSelectedPostId(null);
            setShowcaseView(false);
        }
    }, [isActive]);

    // subcategory prop이 바뀌면 무조건 상세보기/갤러리 해제 + 필터 초기화
    // (사이드바/헤더에서 다른 게시판 클릭 시 → subcategory prop이 변경됨)
    const prevSubcategoryRef = useRef(subcategory);
    useEffect(() => {
        console.log("[DEBUG CommunityPage subcategory effect]", { prev: prevSubcategoryRef.current, current: subcategory, selectedPostId });
        if (prevSubcategoryRef.current !== subcategory) {
            console.log("[DEBUG CommunityPage] subcategory changed → clearing selectedPostId");
            prevSubcategoryRef.current = subcategory;
            setSelectedPostId(null);
            setShowcaseView(false);
            setSelectedTag("all");
            setSelectedBadge("all");
            setSelectedRegion("all");
        }
    }, [subcategory]);

    // resetKey 변경도 추가 안전장치 (같은 게시판 탭을 다시 클릭한 경우)
    useEffect(() => {
        console.log("[DEBUG CommunityPage resetKey effect]", { resetKey, selectedPostId });
        if (resetKey === undefined || resetKey === 0) return;
        console.log("[DEBUG CommunityPage] resetKey changed → clearing selectedPostId");
        setSelectedPostId(null);
        setShowcaseView(false);
        setSelectedTag("all");
        setSelectedBadge("all");
        setSelectedRegion("all");
    }, [resetKey]);
    const [visitUserId, setVisitUserId] = useState<string | null>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const POSTS_PER_PAGE = 15;

    // "함께 보기" 배너용 실데이터
    const [showcasePostCount, setShowcasePostCount] = useState(0);

    // 신고 모달 상태
    const [reportTarget, setReportTarget] = useState<{
        id: string;
        type: "post" | "comment" | "user";
        title?: string;
    } | null>(null);

    // "함께 보기" 배너용 게시글 수 조회
    useEffect(() => {
        const fetchShowcaseCount = async () => {
            try {
                const params = new URLSearchParams({ board: "free", badge: "자랑", limit: "1" });
                const res = await fetch(`${API.POSTS}?${params}`);
                if (res.ok) {
                    const data = await res.json();
                    setShowcasePostCount(data.total ?? data.posts?.length ?? 0);
                }
            } catch { /* 실패 시 0 유지 */ }
        };
        fetchShowcaseCount();
    }, []);

    // 게시글 선택 (히스토리 push + 스크롤 최상단)
    const handleSelectPost = useCallback((postId: string) => {
        setSelectedPostId(postId);
        window.history.pushState({ communityPost: postId }, "");
        window.scrollTo({ top: 0, behavior: "instant" });
    }, []);

    // 게시글 목록으로 돌아가기
    const handleBackToList = useCallback(() => {
        if (selectedPostId) {
            isNavigatingBackRef.current = true;
            window.history.back();
        }
    }, [selectedPostId]);

    // 브라우저 뒤로가기 처리
    useEffect(() => {
        const handlePopState = () => {
            if (isNavigatingBackRef.current) {
                // handleBackToList에서 호출한 history.back()
                isNavigatingBackRef.current = false;
                setSelectedPostId(null);
            } else if (selectedPostId) {
                // 브라우저 뒤로가기 버튼
                setSelectedPostId(null);
            }
        };
        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, [selectedPostId]);

    // 필터 변경 시 localStorage에 저장
    useEffect(() => { safeSetItem("memento-community-tag", selectedTag); }, [selectedTag]);
    useEffect(() => { safeSetItem("memento-community-badge", selectedBadge); }, [selectedBadge]);
    useEffect(() => { safeSetItem("memento-community-region", selectedRegion); }, [selectedRegion]);
    useEffect(() => { safeSetItem("memento-community-sort", sortBy); }, [sortBy]);

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
        console.log("[DEBUG CommunityPage handleSubcategoryChange]", { subId, selectedPostId, currentSubcategory });
        // 게시글 상세보기 중이면 목록으로 복귀
        if (selectedPostId) {
            setSelectedPostId(null);
        }
        if (showcaseView) {
            setShowcaseView(false);
        }
        if (onSubcategoryChange) {
            onSubcategoryChange(subId);
        } else {
            setInternalSubcategory(subId);
        }
        setSelectedTag("all");
        setSelectedBadge("all");
        setSelectedRegion("all");
    };

    // 현재 로드된 게시글 수를 ref로 추적 (의존성 배열에 넣지 않기 위함)
    const postsLengthRef = useRef(0);
    useEffect(() => { postsLengthRef.current = posts.length; }, [posts.length]);

    // 게시글 불러오기 (초기 로드 또는 추가 로드)
    const fetchPosts = useCallback(async (loadMore = false) => {
        if (loadMore) {
            setIsLoadingMore(true);
        } else {
            setIsLoading(true);
            setPosts([]);
            setHasMore(true);
        }

        const offset = loadMore ? postsLengthRef.current : 0;

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
            if ((currentSubcategory === "free" || currentSubcategory === "lost") && selectedBadge !== "all") {
                params.append("badge", selectedBadge);
            }
            if (currentSubcategory === "local" && selectedRegion !== "all") {
                params.append("region", selectedRegion);
            }
            // 자유게시판 전체보기 시 자랑 게시글 숨기기 (함께보기 갤러리에서만 표시)
            if (currentSubcategory === "free" && selectedBadge === "all") {
                params.append("exclude_badge", "자랑");
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
                toast.error("게시글을 불러오지 못했습니다.");
                setPosts([]);
                setHasMore(false);
            }
        } finally {
            if (loadMore) {
                setIsLoadingMore(false);
            } else {
                setIsLoading(false);
            }
        }
    }, [currentSubcategory, sortBy, selectedTag, selectedBadge, selectedRegion, searchQuery]);

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

    // 유저 차단 핸들러
    const handleBlockUser = async (targetUserId: string, targetName: string) => {
        if (!user) {
            window.dispatchEvent(new CustomEvent("openAuthModal"));
            return;
        }
        if (targetUserId === user.id) return;

        if (!confirm(`"${targetName}" 님을 차단하시겠습니까?\n\n차단하면 이 유저의 게시글과 댓글이 더 이상 보이지 않습니다.\n설정에서 차단을 해제할 수 있습니다.`)) return;

        try {
            const response = await authFetch(API.BLOCKS, {
                method: "POST",
                body: JSON.stringify({ blockedUserId: targetUserId }),
            });

            if (response.status === 409) {
                toast.info("이미 차단한 유저입니다");
                return;
            }

            if (!response.ok) throw new Error("차단 실패");

            toast.success(`"${targetName}" 님을 차단했습니다`);
            // 차단 후 게시글 목록 새로고침
            fetchPosts(false);
        } catch {
            toast.error("차단에 실패했습니다. 다시 시도해주세요.");
        }
    };

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
                        onBack={handleBackToList}
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
                    selectedRegion={selectedRegion}
                    searchInput={searchInput}
                    sortBy={sortBy}
                    currentColor={currentColor}
                    onSubcategoryChange={handleSubcategoryChange}
                    onTagChange={setSelectedTag}
                    onBadgeChange={setSelectedBadge}
                    onRegionChange={setSelectedRegion}
                    onSearchInputChange={setSearchInput}
                    onSearchSubmit={() => {
                        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                        setSearchQuery(searchInput.trim());
                    }}
                    onSortChange={setSortBy}
                    onWriteClick={handleWriteClick}
                />

                {/* "함께 보기" 배너 - 자유게시판에서만 표시 (추모 등 다른 게시판 톤앤매너 보호) */}
                {currentSubcategory === "free" && showcasePostCount > 0 && (
                    <ShowcaseBanner
                        previewImages={[]}
                        postCount={showcasePostCount}
                        onOpen={() => setShowcaseView(true)}
                    />
                )}

                {/* 인기글 (24시간 내 좋아요 많은 게시글) */}
                <HotPosts
                    boardType={currentSubcategory}
                    onSelectPost={handleSelectPost}
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
                    onSelectPost={handleSelectPost}
                    onVisitUser={setVisitUserId}
                    onReportPost={(post) => setReportTarget({ id: post.id, type: "post", title: post.title })}
                    onBlockUser={handleBlockUser}
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

export default CommunityPage;
