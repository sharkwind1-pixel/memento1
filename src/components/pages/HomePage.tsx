/**
 * 메멘토애니 홈페이지 (B안 기반 리디자인 v2)
 * - 히어로: 그라데이션 배경 + 일러스트 + CTA
 * - 인기 이야기(좌) + 함께 보기(우) 2컬럼
 * - 펫매거진 + 추모 2컬럼 (균형)
 */

"use client";

import React, { useEffect, useRef, useState } from "react";

import { TabType, CommunitySubcategory } from "@/types";
import { useSmoothAutoScroll } from "@/hooks/useSmoothAutoScroll";
import {
    useHomePage,
    HeroSection,
    CommunitySection,
    ShowcaseSection,
    MemorialSection,
} from "@/components/features/home";
import AnnouncementBanner from "@/components/features/home/AnnouncementBanner";
import Lightbox from "@/components/features/home/Lightbox";
import MemorialDetailModal from "@/components/features/home/MemorialDetailModal";
import SimpleHomeLauncher from "@/components/features/home/SimpleHomeLauncher";
import { useAuth } from "@/contexts/AuthContext";
import { useMemorialMode } from "@/contexts/PetContext";
import { Newspaper } from "lucide-react";
import { OptimizedImage } from "@/components/ui/optimized-image";

interface HomePageProps {
    setSelectedTab: (tab: TabType, sub?: CommunitySubcategory) => void;
    isActive?: boolean;
    onOpenCommunityPost?: (postId: string) => void;
}

function HomePage({ setSelectedTab, isActive, onOpenCommunityPost }: HomePageProps) {
    const { isSimpleMode, user } = useAuth();
    const { isMemorialMode } = useMemorialMode();
    const scroll = useSmoothAutoScroll();

    const {
        lightboxItem,
        setLightboxItem,
        likedPosts,
        animatingHearts,
        postComments,
        toggleLike,
        communityPosts,
        isLoadingCommunity,
        showcasePosts,
        isLoadingShowcase,
        isLoadingMemorial,
        displayMemorialData,
        condoledPets,
        toggleCondolence,
        magazineArticles,
        isLoadingMagazine,
        refetchAll,
    } = useHomePage();

    // 추모 디테일 모달
    const [selectedMemorialPet, setSelectedMemorialPet] = useState<typeof displayMemorialData[0] | null>(null);

    useEffect(() => {
        if (isSimpleMode) return;
        const cleanup = scroll.startAutoScroll?.(true);
        return typeof cleanup === "function" ? cleanup : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSimpleMode]);

    // 홈 탭 재진입 시 데이터 갱신 (커뮤니티에서 좋아요/댓글 후 홈으로 돌아올 때)
    const wasActiveRef = useRef(isActive);
    useEffect(() => {
        if (isActive && !wasActiveRef.current) {
            refetchAll();
        }
        wasActiveRef.current = isActive;
    }, [isActive, refetchAll]);

    useEffect(() => {
        if (!isActive) {
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
            {/* 배경 - 일상: 하늘색 / 추모: amber */}
            <div className={`absolute inset-0 bg-gradient-to-b ${
                isMemorialMode
                    ? "from-memorial-50/80 via-memorial-50/30 to-orange-50/20 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"
                    : "from-memento-200/80 via-memento-200/40 to-rose-50/20 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"
            }`}>
                <div className={`absolute -top-20 left-1/4 w-[500px] h-[500px] bg-gradient-to-br ${
                    isMemorialMode
                        ? "from-memorial-200/30 to-orange-100/30 dark:from-memorial-800/15 dark:to-orange-800/15"
                        : "from-memento-300/30 to-memento-200/30 dark:from-memento-800/15 dark:to-memento-800/15"
                } rounded-full blur-3xl`} />
                <div className={`absolute top-1/3 -right-20 w-[400px] h-[400px] bg-gradient-to-br ${
                    isMemorialMode
                        ? "from-yellow-100/25 to-memorial-50/25 dark:from-yellow-900/10 dark:to-memorial-900/10"
                        : "from-rose-100/25 to-pink-50/25 dark:from-rose-900/10 dark:to-pink-900/10"
                } rounded-full blur-3xl`} />
                <div className={`absolute bottom-1/4 left-1/3 w-[350px] h-[350px] bg-gradient-to-br ${
                    isMemorialMode
                        ? "from-memorial-100/25 to-yellow-100/25 dark:from-memorial-800/10 dark:to-yellow-800/10"
                        : "from-memento-200/25 to-memento-100/25 dark:from-memento-800/10 dark:to-memento-700/10"
                } rounded-full blur-3xl`} />
            </div>

            {/* Lightbox */}
            <Lightbox item={lightboxItem} onClose={() => setLightboxItem(null)} />

            {/* 추모 펫 디테일 모달 */}
            {selectedMemorialPet && (
                <MemorialDetailModal
                    pet={selectedMemorialPet}
                    isCondoled={condoledPets[selectedMemorialPet.id] || false}
                    onToggleCondolence={toggleCondolence}
                    onClose={() => setSelectedMemorialPet(null)}
                />
            )}

            <div className="relative z-10 space-y-10 sm:space-y-14 pb-28">
                {/* 히어로 */}
                <HeroSection setSelectedTab={setSelectedTab} user={user} isMemorial={isMemorialMode} />

                {/* 공지 */}
                <AnnouncementBanner setSelectedTab={setSelectedTab} />

                {/* 인기 이야기(좌) + 함께 보기(우) 2컬럼 */}
                {(isLoadingCommunity || isLoadingShowcase) ? (
                    <section className="px-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                            {[1, 2].map(i => (
                                <div key={i} className="space-y-4">
                                    <div className="w-32 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                    <div className="space-y-3">
                                        {[1, 2].map(j => (
                                            <div key={j} className="h-32 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : (
                    <section className="px-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
                            {/* 좌: 인기 이야기 (커뮤니티) */}
                            <div>
                                <CommunitySection
                                    communityPosts={communityPosts}
                                    likedPosts={likedPosts}
                                    animatingHearts={animatingHearts}
                                    postComments={postComments}
                                    onToggleLike={toggleLike}
                                    onSelectPost={(post) => {
                                        if (post.dbId && onOpenCommunityPost) {
                                            onOpenCommunityPost(post.dbId);
                                        }
                                    }}
                                    scrollRef={scroll.communityScrollRef}
                                    setSelectedTab={setSelectedTab}
                                    isMemorial={isMemorialMode}
                                />
                            </div>
                            {/* 우: 함께 보기 (쇼케이스) */}
                            <div>
                                <ShowcaseSection
                                    showcasePosts={showcasePosts}
                                    scrollRef={scroll.showcaseScrollRef}
                                    setSelectedTab={setSelectedTab}
                                    onOpenPost={(postId) => onOpenCommunityPost?.(postId)}
                                />
                            </div>
                        </div>
                    </section>
                )}

                {/* 구분선 */}
                <div className={`mx-auto w-20 h-px bg-gradient-to-r from-transparent ${isMemorialMode ? "via-memorial-300/30" : "via-memento-300/30"} to-transparent`} />

                {/* 펫매거진(좌) + 추모(우) 2컬럼 */}
                <section className="px-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10 items-start md:items-stretch">
                        {/* 좌: 펫매거진 미리보기 */}
                        <div className="space-y-6 flex flex-col">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className={`w-10 h-10 flex-shrink-0 bg-gradient-to-br ${isMemorialMode ? "from-memorial-500 to-orange-400 shadow-memorial-500/20" : "from-emerald-500 to-teal-400 shadow-emerald-500/20"} rounded-2xl flex items-center justify-center shadow-sm`}>
                                        <Newspaper className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-base sm:text-xl font-display font-bold text-gray-800 dark:text-gray-100">펫매거진</h2>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">반려동물 케어 팁</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedTab("magazine")}
                                    className={`text-sm font-medium flex items-center gap-1 ${isMemorialMode ? "text-memorial-500 hover:text-memorial-600" : "text-memento-500 hover:text-memento-600"}`}
                                >
                                    더 많은 이야기 &rarr;
                                </button>
                            </div>
                            {isLoadingMagazine ? (
                                <div className="space-y-3 flex-1">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-20 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
                                    ))}
                                </div>
                            ) : magazineArticles.length === 0 ? (
                                <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center flex-1 flex items-center justify-center">아직 매거진이 없습니다</p>
                            ) : (
                                <div className="space-y-3 flex-1 flex flex-col">
                                    {magazineArticles.map((article) => (
                                        <button
                                            key={article.id}
                                            onClick={() => setSelectedTab("magazine")}
                                            className="w-full flex items-center gap-4 p-3 rounded-2xl bg-white/60 dark:bg-gray-800/40 hover:bg-white dark:hover:bg-gray-800/60 transition-all group"
                                        >
                                            {article.coverUrl ? (
                                                <OptimizedImage
                                                    src={article.coverUrl}
                                                    alt=""
                                                    width={64}
                                                    height={64}
                                                    className="w-16 h-16 rounded-xl flex-shrink-0"
                                                />
                                            ) : (
                                                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${isMemorialMode ? "from-memorial-100 to-orange-100 dark:from-gray-700 dark:to-gray-600" : "from-emerald-100 to-teal-100 dark:from-gray-700 dark:to-gray-600"} flex items-center justify-center flex-shrink-0`}>
                                                    <Newspaper className={`w-6 h-6 ${isMemorialMode ? "text-memorial-400" : "text-emerald-400"}`} />
                                                </div>
                                            )}
                                            <div className="flex-1 text-left min-w-0">
                                                <p className={`text-sm font-semibold text-gray-800 dark:text-gray-100 line-clamp-2 transition-colors ${isMemorialMode ? "group-hover:text-memorial-600" : "group-hover:text-memento-600"}`}>
                                                    {article.title}
                                                </p>
                                                {article.category && (
                                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{article.category}</p>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 우: 추모 섹션 */}
                        <div className="flex flex-col">
                            <MemorialSection
                                isLoadingMemorial={isLoadingMemorial}
                                displayMemorialData={displayMemorialData}
                                onLightboxOpen={setLightboxItem}
                                scrollRef={scroll.memorialScrollRef}
                                condoledPets={condoledPets}
                                onToggleCondolence={toggleCondolence}
                                onCardClick={setSelectedMemorialPet}
                            />
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

export default React.memo(HomePage);
