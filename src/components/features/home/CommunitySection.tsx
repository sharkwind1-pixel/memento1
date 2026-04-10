/**
 * CommunitySection.tsx
 * 홈페이지 인기 커뮤니티 리스트 섹션 (펫매거진과 동일한 세로 리스트 레이아웃)
 */

"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
    Heart,
    MessageCircle,
    TrendingUp,
    ArrowRight,
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
    isMemorial?: boolean;
}

export default function CommunitySection({
    communityPosts,
    likedPosts,
    animatingHearts,
    onToggleLike,
    onSelectPost,
    setSelectedTab,
    isMemorial = false,
}: CommunitySectionProps) {
    const gradients = isMemorial ? [
        "from-memorial-500 to-orange-300",
        "from-memorial-400 to-yellow-300",
        "from-orange-400 to-memorial-300",
        "from-yellow-500 to-memorial-300",
        "from-memorial-600 to-orange-400",
    ] : [
        "from-memento-500 to-memento-300",
        "from-rose-500 to-pink-300",
        "from-violet-500 to-purple-300",
        "from-emerald-500 to-teal-300",
        "from-memorial-500 to-orange-300",
    ];

    return (
        <section className="space-y-6" data-tutorial-id="home-trending">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-3 min-w-0">
                    <div className={`w-10 h-10 flex-shrink-0 bg-gradient-to-br ${isMemorial ? "from-memorial-500 to-orange-400 shadow-memorial-500/20" : "from-memento-500 to-memento-400 shadow-memento-500/20"} rounded-2xl flex items-center justify-center shadow-sm`}>
                        <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-base sm:text-xl font-display font-bold text-gray-800 dark:text-gray-100">
                            인기 있는 이야기
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
                            커뮤니티에서 가장 사랑받는 글들
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setSelectedTab("community")}
                    className={`text-sm font-medium flex items-center gap-1 ${isMemorial ? "text-memorial-500 hover:text-memorial-600" : "text-memento-500 hover:text-memento-600"}`}
                >
                    더 많은 이야기 &rarr;
                </button>
            </div>

            {communityPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <PawPrint className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        아직 이야기가 없어요
                    </p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                        커뮤니티에서 첫 번째 이야기를 작성해보세요
                    </p>
                </div>
            ) : (
                <div className="space-y-3 flex-1 flex flex-col">
                    {communityPosts.map((post, idx) => {
                        const isLiked = likedPosts[post.id] || false;
                        const displayLikes = post.likes;
                        const addedComments = ([] as unknown[]).length || 0;
                        const totalComments = post.comments + addedComments;

                        return (
                            <button
                                key={`${post.id}-${idx}`}
                                onClick={() => onSelectPost(post)}
                                className="w-full flex items-center gap-4 p-3 rounded-2xl bg-white/60 dark:bg-gray-800/40 hover:bg-white dark:hover:bg-gray-800/60 transition-all group"
                            >
                                {/* 좌측: 그라데이션 썸네일 */}
                                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${gradients[idx % gradients.length]} flex items-center justify-center flex-shrink-0 relative overflow-hidden`}>
                                    <PawPrint className="w-6 h-6 text-white/70" />
                                    {post.badge && (
                                        <span className="absolute bottom-0.5 right-0.5 text-[9px] font-bold text-white bg-black/30 rounded px-1">
                                            {post.badge}
                                        </span>
                                    )}
                                </div>

                                {/* 우측: 제목 + 작성자 + 좋아요/댓글 */}
                                <div className="flex-1 text-left min-w-0">
                                    <p className={`text-sm font-semibold text-gray-800 dark:text-gray-100 line-clamp-2 transition-colors ${isMemorial ? "group-hover:text-memorial-600" : "group-hover:text-memento-600"}`}>
                                        {post.title}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                                            <LevelBadge
                                                points={post.authorPoints ?? 0}
                                                isAdmin={post.authorIsAdmin ?? false}
                                                size="sm"
                                                showTooltip={false}
                                            />
                                            <span className="truncate max-w-[80px]">{post.author}</span>
                                        </span>
                                        <span className="flex items-center gap-0.5 text-xs text-gray-400">
                                            <Heart
                                                className={`w-3 h-3 ${isLiked ? "fill-red-500 text-red-500" : ""} ${animatingHearts[post.id] ? "animate-heart-pop" : ""}`}
                                            />
                                            {displayLikes}
                                        </span>
                                        <span className="flex items-center gap-0.5 text-xs text-gray-400">
                                            <MessageCircle className="w-3 h-3" />
                                            {totalComments}
                                        </span>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
