/**
 * LocalPostList.tsx
 * 지역정보 게시글 목록 - 카드, 로딩, 빈 상태, 페이지네이션
 *
 * LocalPage에서 추출한 UI 컴포넌트
 */

"use client";

/* eslint-disable @next/next/no-img-element */

import React from "react";
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
    MapPin,
    Heart,
    MessageCircle,
    Clock,
    PenSquare,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Eye,
} from "lucide-react";
import type { LocalPost } from "./localTypes";
import { getBadgeStyle, getCategoryLabel, timeAgo } from "./localTypes";

interface LocalPostListProps {
    posts: LocalPost[];
    loading: boolean;
    totalPages: number;
    totalCount: number;
    page: number;
    selectedRegion: string;
    selectedDistrict: string;
    onPageChange: (page: number) => void;
    onSelectPost: (post: LocalPost) => void;
    onWriteClick: () => void;
    onClearFilters: () => void;
}

export default function LocalPostList({
    posts,
    loading,
    totalPages,
    totalCount,
    page,
    selectedRegion,
    selectedDistrict,
    onPageChange,
    onSelectPost,
    onWriteClick,
    onClearFilters,
}: LocalPostListProps) {
    return (
        <>
            {/* 현재 위치 & 결과 수 */}
            {(selectedRegion || totalCount > 0) && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 px-1">
                    {selectedRegion && (
                        <>
                            <MapPin className="w-4 h-4" />
                            <span className="font-medium">
                                {selectedRegion} {selectedDistrict}
                            </span>
                        </>
                    )}
                    {totalCount > 0 && (
                        <span className="text-sm text-gray-400 dark:text-gray-500">
                            ({totalCount}개의 글)
                        </span>
                    )}
                </div>
            )}

            {/* 로딩 */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <span className="ml-3 text-gray-500 dark:text-gray-400">게시글을 불러오는 중...</span>
                </div>
            ) : (
                <>
                    {/* 게시글 목록 */}
                    <div className="space-y-4">
                        {posts.map((post) => (
                            <Card
                                key={post.id}
                                onClick={() => onSelectPost(post)}
                                className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-white/50 dark:border-gray-700/50 hover:bg-white/80 dark:hover:bg-gray-700/60 transition-all duration-300 rounded-2xl cursor-pointer"
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge className={`${getBadgeStyle(post.badge)} rounded-lg`}>
                                                {post.badge}
                                            </Badge>
                                            {post.region && (
                                                <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 min-w-0">
                                                    <MapPin className="w-3 h-3 flex-shrink-0" />
                                                    <span className="truncate">{post.region} {post.district}</span>
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-sm text-gray-400 dark:text-gray-500 flex items-center gap-1 flex-shrink-0">
                                            <Clock className="w-3 h-3" />
                                            {timeAgo(post.createdAt)}
                                        </span>
                                    </div>
                                    <CardTitle className="text-lg text-gray-800 dark:text-gray-100 mt-2">
                                        {post.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pb-2">
                                    {post.content && (
                                        <p className="text-gray-600 dark:text-gray-300 line-clamp-2">
                                            {post.content}
                                        </p>
                                    )}
                                    {post.imageUrl && (
                                        <div className="mt-2 rounded-xl overflow-hidden h-40 bg-gray-100 dark:bg-gray-700">
                                            <img src={post.imageUrl} alt="" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="flex items-center justify-between pt-2">
                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                        {getCategoryLabel(post.category)}
                                    </span>
                                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                        <span className="flex items-center gap-1">
                                            <Eye className="w-3 h-3" />
                                            {post.views}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Heart className="w-4 h-4" />
                                            {post.likesCount}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <MessageCircle className="w-4 h-4" />
                                            {post.commentsCount}
                                        </span>
                                    </div>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>

                    {/* 빈 상태 */}
                    {posts.length === 0 && (
                        <div className="text-center py-16">
                            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <MapPin className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                            </div>
                            <p className="text-gray-500 dark:text-gray-400">
                                해당 조건의 게시글이 없습니다
                            </p>
                            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                                첫 번째 글을 작성해보세요!
                            </p>
                            <div className="flex gap-2 justify-center mt-4">
                                <Button
                                    variant="outline"
                                    className="rounded-xl dark:border-gray-600"
                                    onClick={onClearFilters}
                                >
                                    필터 초기화
                                </Button>
                                <Button
                                    onClick={onWriteClick}
                                    className="rounded-xl bg-gradient-to-r from-blue-500 to-sky-500"
                                >
                                    <PenSquare className="w-4 h-4 mr-1" />
                                    글쓰기
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* 페이지네이션 */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onPageChange(Math.max(1, page - 1))}
                                disabled={page <= 1}
                                aria-label="이전 페이지"
                                className="rounded-xl dark:border-gray-600"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum: number;
                                if (totalPages <= 5) { pageNum = i + 1; }
                                else if (page <= 3) { pageNum = i + 1; }
                                else if (page >= totalPages - 2) { pageNum = totalPages - 4 + i; }
                                else { pageNum = page - 2 + i; }
                                return (
                                    <Button
                                        key={pageNum}
                                        variant={pageNum === page ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => onPageChange(pageNum)}
                                        className={`rounded-xl min-w-[36px] ${
                                            pageNum === page
                                                ? "bg-gradient-to-r from-blue-500 to-sky-500 border-0"
                                                : "dark:border-gray-600"
                                        }`}
                                    >
                                        {pageNum}
                                    </Button>
                                );
                            })}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                                disabled={page >= totalPages}
                                aria-label="다음 페이지"
                                className="rounded-xl dark:border-gray-600"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    )}
                </>
            )}
        </>
    );
}
