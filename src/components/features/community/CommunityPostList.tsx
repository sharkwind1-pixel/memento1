/**
 * CommunityPostList.tsx
 * 커뮤니티 게시글 목록 - 카드, 스켈레톤, 무한스크롤, 빈 상태
 *
 * CommunityPage에서 추출한 UI 컴포넌트
 */

"use client";

import React from "react";
import {
    Card,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Heart,
    MessageCircle,
    Clock,
    PenSquare,
    Search,
    Eye,
    MoreHorizontal,
    Flag,
    Ban,
    Pin,
    Globe,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CommunitySubcategory } from "@/types";
import type { Post } from "./communityTypes";
import { getBadgeStyle, formatTime } from "./communityTypes";
import LevelBadge from "@/components/features/points/LevelBadge";

interface CommunityPostListProps {
    posts: Post[];
    isLoading: boolean;
    isLoadingMore: boolean;
    hasMore: boolean;
    currentSubcategory: CommunitySubcategory;
    searchQuery: string;
    currentColorBg: string;
    userId?: string;
    sentinelRef: React.RefObject<HTMLDivElement>;
    onSelectPost: (postId: string) => void;
    onVisitUser: (userId: string) => void;
    onReportPost: (post: Post) => void;
    onBlockUser?: (userId: string, authorName: string) => void;
    onWriteClick: () => void;
    onClearSearch: () => void;
}

export default function CommunityPostList({
    posts,
    isLoading,
    isLoadingMore,
    hasMore,
    currentSubcategory,
    searchQuery,
    currentColorBg,
    userId,
    sentinelRef,
    onSelectPost,
    onVisitUser,
    onReportPost,
    onBlockUser,
    onWriteClick,
    onClearSearch,
}: CommunityPostListProps) {
    // 스켈레톤 카드
    const SkeletonCard = ({ keyId }: { keyId: string }) => (
        <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-white/50 dark:border-gray-700/50 rounded-xl animate-pulse">
            <div className="px-3.5 pt-3 pb-1.5">
                <div className="flex items-center gap-2">
                    <div className="h-5 w-12 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                    <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded ml-auto" />
                </div>
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mt-2" />
            </div>
            <div className="px-3.5 pb-3 pt-1 flex items-center justify-between">
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="flex items-center gap-3">
                    <div className="h-4 w-8 bg-gray-100 dark:bg-gray-700/70 rounded" />
                    <div className="h-4 w-8 bg-gray-100 dark:bg-gray-700/70 rounded" />
                    <div className="h-4 w-8 bg-gray-100 dark:bg-gray-700/70 rounded" />
                </div>
            </div>
        </Card>
    );

    return (
        <>
            <div className="space-y-2.5">
                {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <SkeletonCard key={`skeleton-${i}`} keyId={`skeleton-${i}`} />
                    ))
                ) : (
                    posts.map((post) => (
                        <Card
                            key={post.id}
                            onClick={() => onSelectPost(post.id)}
                            className={`backdrop-blur-sm transition-all duration-300 rounded-xl cursor-pointer active:scale-[0.98] ${
                                post.isPinned
                                    ? "bg-red-50/80 dark:bg-red-900/20 border-red-200/70 dark:border-red-700/50 hover:bg-red-50 dark:hover:bg-red-900/30"
                                    : "bg-white/60 dark:bg-gray-800/60 border-white/50 dark:border-gray-700/50 hover:bg-white/80 dark:hover:bg-gray-700/60"
                            }`}
                        >
                            {/* 상단: 뱃지 + 시간 + 더보기 */}
                            <div className="px-3.5 pt-3 pb-0">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                        {post.isPinned && (
                                            <Pin className="w-3 h-3 text-red-500 flex-shrink-0" />
                                        )}
                                        <Badge
                                            className={`${getBadgeStyle(post.badge, currentSubcategory)} rounded-md text-[11px] px-1.5 py-0`}
                                        >
                                            {post.badge}
                                        </Badge>
                                        {post.noticeScope === "global" && (
                                            <Badge className="bg-red-500 text-white rounded-md text-[11px] px-1.5 py-0 flex items-center gap-0.5">
                                                <Globe className="w-2.5 h-2.5" />
                                                전체
                                            </Badge>
                                        )}
                                        {currentSubcategory === "free" && post.tag && (
                                            <Badge variant="outline" className="rounded-md text-[11px] px-1.5 py-0">
                                                {post.tag}
                                            </Badge>
                                        )}
                                        {currentSubcategory === "local" && post.region && (
                                            <Badge variant="outline" className="rounded-md text-[11px] px-1.5 py-0 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300">
                                                {post.region}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <span className="text-xs text-gray-400 flex items-center gap-0.5">
                                            <Clock className="w-3 h-3" />
                                            {formatTime(post.createdAt)}
                                        </span>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button
                                                    className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                                                    onClick={(e) => e.stopPropagation()}
                                                    aria-label="더보기"
                                                >
                                                    <MoreHorizontal className="w-4 h-4 text-gray-400" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (!userId) {
                                                            window.dispatchEvent(new CustomEvent("openAuthModal"));
                                                            return;
                                                        }
                                                        onReportPost(post);
                                                    }}
                                                    className="text-red-500 focus:text-red-600"
                                                >
                                                    <Flag className="w-4 h-4 mr-2" />
                                                    신고하기
                                                </DropdownMenuItem>
                                                {userId && post.userId && post.userId !== userId && onBlockUser && (
                                                    <DropdownMenuItem
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onBlockUser(post.userId, post.authorName);
                                                        }}
                                                        className="text-orange-500 focus:text-orange-600"
                                                    >
                                                        <Ban className="w-4 h-4 mr-2" />
                                                        이 유저 차단
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                                {/* 제목 */}
                                <p className="text-[15px] font-semibold text-gray-800 dark:text-gray-100 mt-1.5 line-clamp-1 leading-snug">
                                    {post.title}
                                </p>
                            </div>
                            {/* 하단: 작성자 + 통계 */}
                            <div className="px-3.5 pb-3 pt-1.5 flex items-center justify-between">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (post.userId) onVisitUser(post.userId);
                                    }}
                                    className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-memento-600 dark:hover:text-memento-400 transition-colors"
                                >
                                    <LevelBadge
                                        points={post.authorPoints ?? 0}
                                        isAdmin={post.authorIsAdmin ?? false}
                                        size="sm"
                                        showTooltip={false}
                                    />
                                    <span className="truncate max-w-[100px]">{post.authorName}</span>
                                </button>
                                <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                                    <span className="flex items-center gap-0.5">
                                        <Eye className="w-3.5 h-3.5" />
                                        {(post.views ?? 0).toLocaleString()}
                                    </span>
                                    <span className="flex items-center gap-0.5">
                                        <Heart className="w-3.5 h-3.5" />
                                        {post.likes ?? 0}
                                    </span>
                                    <span className="flex items-center gap-0.5">
                                        <MessageCircle className="w-3.5 h-3.5" />
                                        {post.comments ?? 0}
                                    </span>
                                </div>
                            </div>
                        </Card>
                    ))
                )}

                {/* 추가 로딩 스켈레톤 */}
                {isLoadingMore && (
                    Array.from({ length: 3 }).map((_, i) => (
                        <SkeletonCard key={`loading-more-${i}`} keyId={`loading-more-${i}`} />
                    ))
                )}

                {/* 무한 스크롤 감지용 sentinel */}
                <div ref={sentinelRef} className="h-1" />

                {/* 더 이상 게시글 없음 */}
                {!isLoading && !hasMore && posts.length > 0 && (
                    <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-4">
                        모든 게시글을 불러왔습니다
                    </p>
                )}
            </div>

            {/* 게시글 없을 때 */}
            {!isLoading && posts.length === 0 && (
                <div className="text-center py-16">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-10 h-10 text-gray-400" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">
                        {searchQuery ? "검색 결과가 없습니다" : "아직 게시글이 없습니다"}
                    </p>
                    {searchQuery ? (
                        <Button
                            variant="outline"
                            className="mt-4 rounded-xl"
                            onClick={onClearSearch}
                        >
                            전체 보기
                        </Button>
                    ) : (
                        <Button
                            onClick={onWriteClick}
                            className={`mt-4 bg-gradient-to-r ${currentColorBg} rounded-xl`}
                        >
                            <PenSquare className="w-4 h-4 mr-2" />
                            첫 글 작성하기
                        </Button>
                    )}
                </div>
            )}
        </>
    );
}
