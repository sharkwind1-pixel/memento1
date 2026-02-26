/**
 * CommunitySection.tsx
 * 홈페이지 인기 커뮤니티 카드 캐러셀 섹션
 */

"use client";

import React from "react";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Heart,
    MessageCircle,
    TrendingUp,
    ArrowRight,
    Zap,
    Crown,
    PawPrint,
} from "lucide-react";
import LevelBadge from "@/components/features/points/LevelBadge";
import type { CommunityPost } from "./types";
import { TabType } from "@/types";

interface CommunitySectionProps {
    communityPosts: CommunityPost[];
    likedPosts: Record<number, boolean>;
    animatingHearts: Record<number, boolean>;
    postComments: Record<number, { id: number; author: string; content: string; time: string; likes: number }[]>;
    onToggleLike: (postId: number) => void;
    onSelectPost: (post: CommunityPost) => void;
    scrollRef: React.RefObject<HTMLDivElement>;
    setSelectedTab: (tab: TabType) => void;
}

export default function CommunitySection({
    communityPosts,
    likedPosts,
    animatingHearts,
    postComments,
    onToggleLike,
    onSelectPost,
    scrollRef,
    setSelectedTab,
}: CommunitySectionProps) {
    const gradients = [
        "from-rose-500 to-orange-400",
        "from-violet-500 to-purple-400",
        "from-cyan-500 to-blue-400",
        "from-emerald-500 to-teal-400",
        "from-amber-500 to-yellow-400",
    ];

    return (
        <section className="space-y-6 px-4" data-tutorial-id="home-trending">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 flex-shrink-0 bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] rounded-xl flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100 leading-tight">
                            지금 인기 있는 이야기
                        </h2>
                        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 hidden sm:block">
                            커뮤니티에서 가장 사랑받는 글들
                        </p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    onClick={() => setSelectedTab("community")}
                    className="text-[#0891B2] dark:text-[#38BDF8] hover:bg-[#E0F7FF] dark:hover:bg-gray-700 rounded-xl flex-shrink-0 px-2 sm:px-4 min-h-[44px] active:scale-95 transition-transform"
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
                {communityPosts.map((post, idx) => {
                    const isLiked = likedPosts[post.id] || false;
                    const displayLikes = isLiked ? post.likes + 1 : post.likes;
                    const addedComments = postComments[post.id]?.length || 0;
                    const totalComments = post.comments + addedComments;

                    return (
                        <Card
                            key={post.id}
                            onClick={() => onSelectPost(post)}
                            className="w-[260px] max-w-[260px] sm:w-72 sm:max-w-72 flex-shrink-0 overflow-hidden rounded-2xl cursor-pointer group border-0 shadow-lg will-change-transform"
                        >
                            <div className={`h-24 bg-gradient-to-br ${gradients[idx % gradients.length]} relative overflow-hidden`}>
                                <div className="absolute inset-0 bg-black/10" />
                                <div className="absolute top-3 left-3">
                                    <Badge
                                        className={`
                                            bg-white/90 text-gray-800 font-semibold shadow-sm
                                            ${post.badge === "인기" ? "text-rose-600" : ""}
                                            ${post.badge === "꿀팁" ? "text-amber-600" : ""}
                                            ${post.badge === "후기" ? "text-violet-600" : ""}
                                        `}
                                    >
                                        {post.badge === "인기" && (
                                            <Crown className="w-3 h-3 mr-1 inline" />
                                        )}
                                        {post.badge === "꿀팁" && (
                                            <Zap className="w-3 h-3 mr-1 inline" />
                                        )}
                                        {post.badge}
                                    </Badge>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute top-2 right-2 text-white hover:text-red-300 hover:bg-white/20 min-w-[44px] min-h-[44px] p-2 active:scale-95 transition-transform"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleLike(post.id);
                                    }}
                                >
                                    <Heart
                                        className={`w-6 h-6 transition-all duration-300 ${
                                            isLiked
                                                ? "fill-red-400 text-red-400 scale-110"
                                                : ""
                                        } ${animatingHearts[post.id] ? "animate-heart-pop" : ""}`}
                                    />
                                </Button>
                                <div className="absolute bottom-2 right-3 opacity-30">
                                    <PawPrint className="w-12 h-12 text-white" />
                                </div>
                            </div>

                            <CardContent className="p-4 bg-white dark:bg-gray-800">
                                <h3 className="font-bold text-gray-800 dark:text-white text-base mb-1 line-clamp-2 group-hover:text-[#05B2DC] transition-colors">
                                    {post.title}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1.5 min-w-0">
                                    <LevelBadge
                                        points={[500, 10000, 3000, 100000, 30000][idx % 5]}
                                        size="lg"
                                        showTooltip={false}
                                    />
                                    <span className="truncate">{post.author}님의 이야기</span>
                                </p>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 text-sm text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <Heart
                                                className={`w-4 h-4 transition-colors duration-300 ${
                                                    isLiked
                                                        ? "fill-red-500 text-red-500"
                                                        : ""
                                                } ${animatingHearts[post.id] ? "animate-heart-pop" : ""}`}
                                            />
                                            {displayLikes}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <MessageCircle className="w-4 h-4" />
                                            {totalComments}
                                        </span>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#05B2DC] group-hover:translate-x-1 transition-all" />
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </section>
    );
}
