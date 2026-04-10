/**
 * HotPosts.tsx
 * 인기글 섹션 - 24시간 내 좋아요가 많은 게시글을 공지 아래에 표시
 * 클릭 시 게시글 상세로 이동
 */

"use client";

import { useState, useEffect } from "react";
import { Flame, Heart, MessageCircle } from "lucide-react";
import type { CommunitySubcategory } from "@/types";
import type { Post } from "./communityTypes";
import { API } from "@/config/apiEndpoints";
import LevelBadge from "@/components/features/points/LevelBadge";

interface HotPostsProps {
    boardType: CommunitySubcategory;
    onSelectPost: (postId: string) => void;
}

export default function HotPosts({ boardType, onSelectPost }: HotPostsProps) {
    const [hotPosts, setHotPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchHotPosts = async () => {
            setIsLoading(true);
            try {
                const params = new URLSearchParams({
                    board: boardType,
                    hot: "true",
                    limit: "5",
                });
                const res = await fetch(`${API.POSTS}?${params}`);
                if (!res.ok) return;

                const data = await res.json();
                const posts = (data.posts || []).map((p: Post & { boardType?: string; animalType?: string }) => ({
                    ...p,
                    subcategory: p.subcategory || p.boardType || boardType,
                    tag: p.tag || p.animalType,
                }));
                setHotPosts(posts);
            } catch {
                // 조회 실패 시 미표시
            } finally {
                setIsLoading(false);
            }
        };

        fetchHotPosts();
    }, [boardType]);

    if (isLoading || hotPosts.length === 0) return null;

    return (
        <div className="px-4 sm:px-6 max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-orange-50/80 to-memorial-50/80 dark:from-orange-900/10 dark:to-memorial-900/10 border border-orange-200/50 dark:border-orange-700/30 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-bold text-orange-700 dark:text-orange-300">
                        인기글
                    </span>
                    <span className="text-xs text-orange-400 dark:text-orange-500">
                        24시간
                    </span>
                </div>
                <div className="space-y-2">
                    {hotPosts.map((post, index) => (
                        <button
                            key={post.id}
                            onClick={() => onSelectPost(post.id)}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/60 dark:hover:bg-gray-800/40 transition-colors text-left"
                        >
                            <span className="text-sm font-bold text-orange-500 w-5 text-center flex-shrink-0">
                                {index + 1}
                            </span>
                            <span className="text-sm text-gray-800 dark:text-gray-200 flex-1 truncate">
                                {post.title}
                            </span>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                <LevelBadge
                                    points={post.authorPoints ?? 0}
                                    isAdmin={post.authorIsAdmin ?? false}
                                    size="sm"
                                    showTooltip={false}
                                />
                                <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[60px]">
                                    {post.authorName}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-400 flex-shrink-0">
                                <span className="flex items-center gap-0.5">
                                    <Heart className="w-3 h-3" />
                                    {post.likes}
                                </span>
                                <span className="flex items-center gap-0.5">
                                    <MessageCircle className="w-3 h-3" />
                                    {post.comments}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
