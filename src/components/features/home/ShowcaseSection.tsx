/**
 * ShowcaseSection.tsx
 * 홈페이지 "함께 보기" 캐러셀 섹션
 * DB에서 badge="자랑"인 인기 게시글을 이미지 중심 카드로 표시
 */

"use client";

import React from "react";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Heart,
    MessageCircle,
    Star,
    ArrowRight,
    PawPrint,
    ImageIcon,
    Play,
} from "lucide-react";
import type { ShowcasePost } from "./types";
import { TabType } from "@/types";
import { safeSessionSetItem } from "@/lib/safe-storage";

interface ShowcaseSectionProps {
    showcasePosts: ShowcasePost[];
    scrollRef: React.RefObject<HTMLDivElement>;
    setSelectedTab: (tab: TabType) => void;
}

export default function ShowcaseSection({
    showcasePosts,
    scrollRef,
    setSelectedTab,
}: ShowcaseSectionProps) {
    const gradients = [
        "from-memento-400 to-memento-300",
        "from-pink-400 to-rose-300",
        "from-violet-400 to-purple-300",
        "from-emerald-400 to-teal-300",
        "from-amber-400 to-orange-300",
    ];

    const handleMoreClick = () => {
        safeSessionSetItem("memento-community-view", "showcase");
        setSelectedTab("community");
    };

    /** 상대 시간 포맷 */
    const formatTime = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "방금 전";
        if (mins < 60) return `${mins}분 전`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}시간 전`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}일 전`;
        return new Date(dateStr).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
    };

    return (
        <section className="space-y-6 px-4">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 flex-shrink-0 bg-gradient-to-br from-amber-400 to-yellow-300 rounded-2xl flex items-center justify-center shadow-sm shadow-amber-400/20">
                        <Star className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-lg sm:text-xl md:text-2xl font-display font-bold text-gray-800 dark:text-gray-100 leading-tight">
                            함께 보기
                        </h2>
                        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 hidden sm:block">
                            AI로 만든 우리 아이 영상
                        </p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    onClick={handleMoreClick}
                    className="text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-gray-700 rounded-xl flex-shrink-0 px-2 sm:px-4 min-h-[44px] active:scale-95 transition-transform"
                >
                    <span className="hidden sm:inline">더 많은 이야기</span>
                    <span className="sm:hidden">더보기</span>
                    <ArrowRight className="w-4 h-4 ml-1 sm:ml-2" />
                </Button>
            </div>

            <div
                ref={scrollRef}
                className="flex gap-4 overflow-x-auto pb-4 px-4 -mx-4 scrollbar-hide carousel-touch"
            >
                {showcasePosts.length === 0 ? (
                    <div className="w-full flex flex-col items-center justify-center py-12 text-center">
                        <Play className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                            아직 영상이 없어요
                        </p>
                        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                            AI 영상을 만들어 자랑해보세요
                        </p>
                    </div>
                ) : (() => {
                    const MIN_CARDS = 6;
                    let displayPosts = showcasePosts;
                    if (showcasePosts.length > 0 && showcasePosts.length < MIN_CARDS) {
                        const repeats = Math.ceil(MIN_CARDS / showcasePosts.length);
                        displayPosts = Array.from({ length: repeats }, () => showcasePosts).flat();
                    }
                    return displayPosts;
                })().map((post, idx) => {
                    const hasImage = (post.imageUrls?.length ?? 0) > 0;
                    const firstImage = hasImage ? post.imageUrls![0] : null;

                    return (
                        <Card
                            key={`${post.id}-${idx}`}
                            onClick={handleMoreClick}
                            className="w-[260px] max-w-[260px] sm:w-72 sm:max-w-72 flex-shrink-0 overflow-hidden rounded-2xl cursor-pointer group border-0 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 will-change-transform"
                        >
                            {/* 영상 / 이미지 / 그라데이션 헤더 */}
                            <div className="h-40 relative overflow-hidden">
                                {post.videoUrl ? (
                                    <>
                                        <video
                                            src={post.videoUrl}
                                            poster={firstImage || undefined}
                                            muted
                                            playsInline
                                            loop
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                                        {/* 재생 아이콘 오버레이 */}
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center shadow-lg">
                                                <Play className="w-5 h-5 text-amber-600 ml-0.5" />
                                            </div>
                                        </div>
                                        {/* AI 영상 뱃지 */}
                                        <div className="absolute top-3 right-3 bg-amber-500/90 text-white text-xs font-bold px-2 py-1 rounded-full">
                                            AI 영상
                                        </div>
                                    </>
                                ) : firstImage ? (
                                    <>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={firstImage}
                                            alt={post.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            loading="lazy"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                                        {(post.imageUrls?.length ?? 0) > 1 && (
                                            <div className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                                <ImageIcon className="w-3 h-3" />
                                                {post.imageUrls!.length}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className={`w-full h-full bg-gradient-to-br ${gradients[idx % gradients.length]} flex items-center justify-center`}>
                                        <PawPrint className="w-16 h-16 text-white/30" />
                                    </div>
                                )}
                                <div className="absolute bottom-3 left-3">
                                    <span className="bg-amber-400/90 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                                        함께 보기
                                    </span>
                                </div>
                            </div>

                            <CardContent className="p-4 bg-white dark:bg-gray-800">
                                <h3 className="font-bold text-gray-800 dark:text-white text-base mb-1.5 line-clamp-2 group-hover:text-amber-600 transition-colors">
                                    {post.title}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 truncate">
                                    {post.authorName}님 · {formatTime(post.createdAt)}
                                </p>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 text-sm text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <Heart className="w-4 h-4" />
                                            {post.likes}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <MessageCircle className="w-4 h-4" />
                                            {post.comments}
                                        </span>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </section>
    );
}
