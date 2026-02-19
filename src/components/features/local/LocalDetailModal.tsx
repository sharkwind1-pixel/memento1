/**
 * LocalDetailModal.tsx
 * 지역 게시판 게시글 상세 모달
 * LocalPage에서 분리 - 상세 보기 렌더링 담당
 */

"use client";

/* eslint-disable @next/next/no-img-element */

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    MapPin,
    Heart,
    MessageCircle,
    Clock,
    X,
    Loader2,
    Eye,
    CheckCircle2,
    Trash2,
} from "lucide-react";
import type { LocalPost } from "./localTypes";
import { getBadgeStyle, getCategoryLabel, timeAgo } from "./localTypes";

interface LocalDetailModalProps {
    post: LocalPost;
    loading: boolean;
    isOwner: boolean;
    onClose: () => void;
    onDelete: (id: string) => void;
    onClosePost: (id: string) => void;
}

export default function LocalDetailModal({
    post,
    loading,
    isOwner,
    onClose,
    onDelete,
    onClosePost,
}: LocalDetailModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div
                className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
                role="dialog"
                aria-modal="true"
                aria-labelledby="local-detail-title"
            >
                {/* 닫기 */}
                <button
                    onClick={onClose}
                    aria-label="닫기"
                    className="absolute top-4 right-4 z-10 w-8 h-8 bg-black/20 hover:bg-black/40 dark:bg-white/20 dark:hover:bg-white/40 rounded-full flex items-center justify-center text-white dark:text-gray-200 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* 이미지 */}
                {post.imageUrl && (
                    <div className="w-full aspect-video bg-gray-100 dark:bg-gray-700 rounded-t-3xl overflow-hidden">
                        <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" />
                    </div>
                )}

                <div className="p-6 space-y-4">
                    {loading && (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                        </div>
                    )}

                    {/* 헤더 */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`${getBadgeStyle(post.badge)} rounded-lg`}>
                            {post.badge}
                        </Badge>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                            {getCategoryLabel(post.category)}
                        </span>
                        {post.region && (
                            <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {post.region} {post.district}
                            </span>
                        )}
                    </div>

                    {/* 제목 */}
                    <h2
                        id="local-detail-title"
                        className="text-xl font-bold text-gray-800 dark:text-gray-100"
                    >
                        {post.title}
                    </h2>

                    {/* 내용 */}
                    {post.content && (
                        <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                            {post.content}
                        </p>
                    )}

                    {/* 메타 */}
                    <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 pt-2 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                조회 {post.views}
                            </span>
                            <span className="flex items-center gap-1">
                                <Heart className="w-3 h-3" />
                                {post.likesCount}
                            </span>
                            <span className="flex items-center gap-1">
                                <MessageCircle className="w-3 h-3" />
                                {post.commentsCount}
                            </span>
                        </div>
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {timeAgo(post.createdAt)}
                        </span>
                    </div>

                    {/* 본인 액션 */}
                    {isOwner && post.status === "active" && (
                        <div className="flex gap-2 pt-2">
                            <Button
                                variant="outline"
                                className="flex-1 rounded-xl text-blue-600 border-blue-300 dark:border-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                                onClick={() => onClosePost(post.id)}
                            >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                마감
                            </Button>
                            <Button
                                variant="outline"
                                className="rounded-xl text-red-600 border-red-300 dark:border-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                                onClick={() => onDelete(post.id)}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
