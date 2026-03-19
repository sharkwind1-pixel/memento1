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
            {/* 배경 - transition/animate-pulse 제거 (모바일 깜빡임 방지) */}
            <div className="absolute inset-0 bg-gradient-to-br from-memento-50 via-memento-75 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-memento-300/30 to-sky-200/30 dark:from-blue-800/20 dark:to-sky-800/20 rounded-full blur-2xl opacity-70" />
                <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-gradient-to-r from-sky-200/30 to-memento-200/30 dark:from-sky-800/20 dark:to-memento-700/20 rounded-full blur-2xl opacity-50" />
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

            <div className="relative z-10 space-y-16 pb-24">
                <HeroSection setSelectedTab={setSelectedTab} user={user} />

                {/* 커뮤니티 인기글 */}
                {!isLoadingCommunity && (
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
                )}

                {/* 쇼케이스 (AI 영상) */}
                <ShowcaseSection
                    showcasePosts={showcasePosts}
                    scrollRef={scroll.showcaseScrollRef}
                    setSelectedTab={setSelectedTab}
                />

                {/* 추모 섹션 */}
                <MemorialSection
                    isLoadingMemorial={isLoadingMemorial}
                    displayMemorialData={displayMemorialData}
                    onLightboxOpen={setLightboxItem}
                    scrollRef={scroll.memorialScrollRef}
                    setSelectedTab={setSelectedTab}
                />
            </div>
        </div>
    );
}

export default React.memo(HomePage);
