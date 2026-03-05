/**
 * CommunityPostList.tsx
 * 커뮤니티 게시글 목록 - 카드, 스켈레톤, 무한스크롤, 빈 상태
 *
 * CommunityPage에서 추출한 UI 컴포넌트
 */

"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
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
    ImageIcon,
    Ban,
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
import { CHARACTER_CATALOG } from "@/data/minimiPixels";

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
    // slug → imageUrl 매핑 (미니미 아바타용)
    const minimiMap = useMemo(() => {
        const map: Record<string, string> = {};
        for (const c of CHARACTER_CATALOG) {
            map[c.slug] = c.imageUrl;
        }
        return map;
    }, []);

    // 스켈레톤 카드
    const SkeletonCard = ({ keyId }: { keyId: string }) => (
        <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-white/50 dark:border-gray-700/50 rounded-2xl animate-pulse">
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-5 w-12 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                    </div>
                    <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mt-2" />
            </CardHeader>
            <CardContent className="pb-2">
                <div className="h-4 bg-gray-100 dark:bg-gray-700/70 rounded w-full mb-1.5" />
                <div className="h-4 bg-gray-100 dark:bg-gray-700/70 rounded w-2/3" />
            </CardContent>
            <CardFooter className="flex items-center justify-between pt-2">
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="flex items-center gap-4">
                    <div className="h-4 w-10 bg-gray-100 dark:bg-gray-700/70 rounded" />
                    <div className="h-4 w-10 bg-gray-100 dark:bg-gray-700/70 rounded" />
                    <div className="h-4 w-10 bg-gray-100 dark:bg-gray-700/70 rounded" />
                </div>
            </CardFooter>
        </Card>
    );

    return (
        <>
            <div className="space-y-4">
                {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <SkeletonCard key={`skeleton-${i}`} keyId={`skeleton-${i}`} />
                    ))
                ) : (
                    posts.map((post) => (
                        <Card
                            key={post.id}
                            onClick={() => onSelectPost(post.id)}
                            className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-white/50 dark:border-gray-700/50 hover:bg-white/80 dark:hover:bg-gray-700/60 transition-all duration-300 rounded-2xl cursor-pointer"
                        >
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            className={`${getBadgeStyle(post.badge, currentSubcategory)} rounded-lg`}
                                        >
                                            {post.badge}
                                        </Badge>
                                        {currentSubcategory === "free" && post.tag && (
                                            <Badge variant="outline" className="rounded-lg text-xs">
                                                {post.tag}
                                            </Badge>
                                        )}
                                        {currentSubcategory === "local" && post.region && (
                                            <Badge variant="outline" className="rounded-lg text-xs border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300">
                                                {post.region}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-400 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatTime(post.createdAt)}
                                        </span>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button
                                                    className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors active:scale-95 transition-transform"
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
                                                {/* 차단하기 (본인 글이 아닐 때만) */}
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
                                <CardTitle className="text-lg text-gray-800 dark:text-gray-100 mt-2 line-clamp-1">
                                    {post.title}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pb-2">
                                <p className="text-gray-600 dark:text-gray-300 line-clamp-2">
                                    {post.content}
                                </p>
                                {post.imageUrls && post.imageUrls.length > 0 && (
                                    <div className="flex items-center gap-1 mt-2 text-xs text-sky-500">
                                        <ImageIcon className="w-3.5 h-3.5" />
                                        <span>이미지 {post.imageUrls.length}장</span>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="flex items-center justify-between pt-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (post.userId) onVisitUser(post.userId);
                                    }}
                                    className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-memento-600 dark:hover:text-memento-400 hover:underline transition-colors"
                                >
                                    {post.authorMinimiSlug && minimiMap[post.authorMinimiSlug] && (
                                        <Image
                                            src={minimiMap[post.authorMinimiSlug]}
                                            alt=""
                                            width={40}
                                            height={40}
                                            className="object-contain flex-shrink-0"
                                            style={{ imageRendering: "pixelated" }}
                                        />
                                    )}
                                    <span className="truncate max-w-[120px]">{post.authorName}</span>
                                </button>
                                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                    <span className="flex items-center gap-1">
                                        <Eye className="w-4 h-4" />
                                        {post.views.toLocaleString()}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Heart className="w-4 h-4" />
                                        {post.likes}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <MessageCircle className="w-4 h-4" />
                                        {post.comments}
                                    </span>
                                </div>
                            </CardFooter>
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
