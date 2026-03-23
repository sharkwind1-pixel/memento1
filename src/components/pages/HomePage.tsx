/**
 * 메멘토애니 홈페이지 (B안 기반 리디자인)
 * - 히어로: 그라데이션 배경 + 일러스트 + CTA
 * - Quick Actions: 4카드 바로가기
 * - Gallery + Stories 2컬럼 (데스크톱) / 세로 스택 (모바일)
 * - 추모 섹션
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
import QuickActions from "@/components/features/home/QuickActions";
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
        condoledPets,
        toggleCondolence,
    } = useHomePage();

    useEffect(() => {
        if (isSimpleMode) return;
        const cleanup = scroll.startAutoScroll?.(true);
        return typeof cleanup === "function" ? cleanup : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSimpleMode]);

    useEffect(() => {
        if (!isActive) {
            if (selectedPost) setSelectedPost(null);
            if (lightboxItem) setLightboxItem(null);
        }
    }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

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
            {/* 배경 */}
            <div className="absolute inset-0 bg-gradient-to-b from-sky-50 via-white to-rose-50/20 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
                <div className="absolute -top-20 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-memento-200/25 to-sky-100/25 dark:from-blue-800/15 dark:to-sky-800/15 rounded-full blur-3xl" />
                <div className="absolute top-1/3 -right-20 w-[400px] h-[400px] bg-gradient-to-br from-rose-100/20 to-pink-50/20 dark:from-rose-900/10 dark:to-pink-900/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 left-1/3 w-[350px] h-[350px] bg-gradient-to-br from-sky-100/20 to-memento-100/20 dark:from-sky-800/10 dark:to-memento-700/10 rounded-full blur-3xl" />
            </div>

            {/* Lightbox + 모달 */}
            <Lightbox item={lightboxItem} onClose={() => setLightboxItem(null)} />
            <PostModal
                post={selectedPost}
                isLiked={selectedPost ? likedPosts[selectedPost.id] || false : false}
                onToggleLike={() => selectedPost && toggleLike(selectedPost.id)}
                onClose={() => setSelectedPost(null)}
                comments={selectedPost ? postComments[selectedPost.id] || [] : []}
                onAddComment={addComment}
            />

            <div className="relative z-10 space-y-10 sm:space-y-14 pb-28">
                {/* 히어로 */}
                <HeroSection setSelectedTab={setSelectedTab} user={user} />

                {/* Quick Actions */}
                <QuickActions setSelectedTab={setSelectedTab} />

                {/* 공지 */}
                <AnnouncementBanner setSelectedTab={setSelectedTab} />

                {/* Gallery + Stories 2컬럼 (데스크톱) */}
                {(isLoadingCommunity || isLoadingShowcase) ? (
                    <section className="px-4">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 lg:gap-8">
                            <div className="md:col-span-3 space-y-4">
                                <div className="w-32 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                <div className="grid grid-cols-2 gap-3">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="aspect-square rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
                                    ))}
                                </div>
                            </div>
                            <div className="md:col-span-2 space-y-4">
                                <div className="w-28 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse">
                                        <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                                        <div className="flex-1 space-y-2">
                                            <div className="w-3/4 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                                            <div className="w-1/2 h-3 bg-gray-200 dark:bg-gray-700 rounded" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                ) : (
                    <section className="px-4">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 lg:gap-10">
                            {/* 좌: 갤러리 (쇼케이스) */}
                            <div className="md:col-span-3">
                                <ShowcaseSection
                                    showcasePosts={showcasePosts}
                                    scrollRef={scroll.showcaseScrollRef}
                                    setSelectedTab={setSelectedTab}
                                />
                            </div>
                            {/* 우: 인기 이야기 (커뮤니티) */}
                            <div className="md:col-span-2">
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
                            </div>
                        </div>
                    </section>
                )}

                {/* 구분선 */}
                <div className="mx-auto w-20 h-px bg-gradient-to-r from-transparent via-amber-300/30 to-transparent" />

                {/* 추모 섹션 */}
                <MemorialSection
                    isLoadingMemorial={isLoadingMemorial}
                    displayMemorialData={displayMemorialData}
                    onLightboxOpen={setLightboxItem}
                    scrollRef={scroll.memorialScrollRef}
                    condoledPets={condoledPets}
                    onToggleCondolence={toggleCondolence}
                />
            </div>
        </div>
    );
}

export default React.memo(HomePage);
