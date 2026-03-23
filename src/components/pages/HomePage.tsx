/**
 * 메멘토애니 홈페이지
 * - 좋아요 버튼 실제 토글
 * - 카드 클릭 시 인스타그램 스타일 모달
 * - 간편모드: 큰 카드 런처로 대체
 * - 모든 섹션 데이터는 DB에서 가져옴 (목업 없음)
 */

"use client";

import React, { useEffect } from "react";

import { TabType, CommunitySubcategory, SmoothAutoScrollReturn } from "@/types";
import { useSmoothAutoScroll } from "@/hooks/useSmoothAutoScroll";
import {
    useHomePage,
    HeroSection,
    CommunitySection,
    ShowcaseSection,
    MemorialSection,
} from "@/components/features/home";
import AnnouncementBanner from "@/components/features/home/AnnouncementBanner";
import PostModal from "@/components/features/home/PostModal";
import Lightbox from "@/components/features/home/Lightbox";
import SimpleHomeLauncher from "@/components/features/home/SimpleHomeLauncher";
import { useAuth } from "@/contexts/AuthContext";

interface HomePageProps {
    setSelectedTab: (tab: TabType, sub?: CommunitySubcategory) => void;
    isActive?: boolean;
}

function HomePage({ setSelectedTab, isActive }: HomePageProps) {
    const { isSimpleMode, user } = useAuth();
    const scroll = useSmoothAutoScroll() as unknown as SmoothAutoScrollReturn;

    const {
        lightboxItem,
        setLightboxItem,
        selectedPost,
        setSelectedPost,
        likedPosts,
        animatingHearts,
        postComments,
        toggleLike,
        addComment,
        communityPosts,
        isLoadingCommunity,
        showcasePosts,
        isLoadingShowcase,
        isLoadingMemorial,
        displayMemorialData,
    } = useHomePage();

    useEffect(() => {
        if (isSimpleMode) return; // 간편모드에서는 자동스크롤 불필요
        const cleanup = scroll.startAutoScroll?.(true);
        return typeof cleanup === "function" ? cleanup : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSimpleMode]);

    // 다른 탭으로 이동하면 모달/오버레이 닫기
    useEffect(() => {
        if (!isActive) {
            if (selectedPost) setSelectedPost(null);
            if (lightboxItem) setLightboxItem(null);
        }
    }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

    // 간편모드: 큰 카드 런처 화면
    if (isSimpleMode) {
        return (
            <SimpleHomeLauncher
                setSelectedTab={setSelectedTab}
                onSubcategoryChange={(sub) => setSelectedTab("community", sub)}
            />
        );
    }

    return (
        <div
            className="min-h-screen relative overflow-hidden"
            style={{ contain: 'layout style', transform: 'translateZ(0)' }}
        >
            {/* 배경 - sky→white→rose 따뜻한 그라데이션 + 3개 blob */}
            <div className="absolute inset-0 bg-gradient-to-b from-sky-50 via-white to-rose-50/20 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
                <div className="absolute -top-20 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-memento-200/25 to-sky-100/25 dark:from-blue-800/15 dark:to-sky-800/15 rounded-full blur-3xl" />
                <div className="absolute top-1/3 -right-20 w-[400px] h-[400px] bg-gradient-to-br from-rose-100/20 to-pink-50/20 dark:from-rose-900/10 dark:to-pink-900/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 left-1/3 w-[350px] h-[350px] bg-gradient-to-br from-sky-100/20 to-memento-100/20 dark:from-sky-800/10 dark:to-memento-700/10 rounded-full blur-3xl" />
            </div>

            {/* 이미지 Lightbox */}
            <Lightbox
                item={lightboxItem}
                onClose={() => setLightboxItem(null)}
            />

            {/* 포스트 모달 */}
            <PostModal
                post={selectedPost}
                isLiked={
                    selectedPost ? likedPosts[selectedPost.id] || false : false
                }
                onToggleLike={() => selectedPost && toggleLike(selectedPost.id)}
                onClose={() => setSelectedPost(null)}
                comments={
                    selectedPost ? postComments[selectedPost.id] || [] : []
                }
                onAddComment={addComment}
            />

            <div className="relative z-10 space-y-20 sm:space-y-24 pb-28">
                <HeroSection setSelectedTab={setSelectedTab} user={user} />

                {/* 전체 공지 배너 */}
                <AnnouncementBanner setSelectedTab={setSelectedTab} />

                {/* 커뮤니티 인기글 + 쇼케이스 (AI 영상) */}
                {/* 두 섹션의 로딩이 모두 끝나면 한번에 표시하여 레이아웃 밀림 방지 */}
                {(isLoadingCommunity || isLoadingShowcase) ? (
                    <div className="space-y-16">
                        {/* 인기 있는 이야기 스켈레톤 */}
                        <section className="space-y-6 px-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
                                <div className="space-y-2">
                                    <div className="w-32 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                    <div className="w-48 h-3.5 bg-gray-100 dark:bg-gray-800 rounded animate-pulse hidden sm:block" />
                                </div>
                            </div>
                            <div className="flex gap-4 overflow-hidden pb-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="w-[260px] sm:w-72 flex-shrink-0 rounded-2xl overflow-hidden shadow-lg">
                                        <div className="h-24 bg-gray-200 dark:bg-gray-700 animate-pulse" />
                                        <div className="p-4 bg-white dark:bg-gray-800 space-y-3">
                                            <div className="w-3/4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                            <div className="w-1/2 h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                                            <div className="flex gap-3">
                                                <div className="w-10 h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                                                <div className="w-10 h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                        {/* 함께 보기 스켈레톤 */}
                        <section className="space-y-6 px-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
                                <div className="space-y-2">
                                    <div className="w-24 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                </div>
                            </div>
                            <div className="flex gap-4 overflow-hidden pb-4">
                                {[1, 2].map((i) => (
                                    <div key={i} className="w-[260px] sm:w-72 flex-shrink-0 rounded-2xl overflow-hidden shadow-lg">
                                        <div className="h-40 bg-gray-200 dark:bg-gray-700 animate-pulse" />
                                        <div className="p-4 bg-white dark:bg-gray-800 space-y-3">
                                            <div className="w-3/4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                            <div className="w-1/2 h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                ) : (
                    <>
                        <CommunitySection
                            communityPosts={communityPosts}
                            likedPosts={likedPosts}
                            animatingHearts={animatingHearts}
                            postComments={postComments}
                            onToggleLike={toggleLike}
                            onSelectPost={setSelectedPost}
                            scrollRef={scroll.communityScrollRef}
                            setSelectedTab={setSelectedTab}
                        />

                        {/* 섹션 구분선 */}
                        <div className="mx-auto w-16 h-px bg-gradient-to-r from-transparent via-memento-300/40 to-transparent" />

                        <ShowcaseSection
                            showcasePosts={showcasePosts}
                            scrollRef={scroll.showcaseScrollRef}
                            setSelectedTab={setSelectedTab}
                        />
                    </>
                )}

                {/* 섹션 구분선 */}
                <div className="mx-auto w-16 h-px bg-gradient-to-r from-transparent via-amber-300/40 to-transparent" />

                {/* 추모 섹션 */}
                <MemorialSection
                    isLoadingMemorial={isLoadingMemorial}
                    displayMemorialData={displayMemorialData}
                    onLightboxOpen={setLightboxItem}
                    scrollRef={scroll.memorialScrollRef}
                />
            </div>
        </div>
    );
}

export default React.memo(HomePage);
