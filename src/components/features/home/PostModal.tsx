"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Heart,
    MessageCircle,
    X,
    Send,
    Bookmark,
    MoreHorizontal,
    Share2,
    Crown,
    Zap,
} from "lucide-react";
import { CommunityPost, Comment } from "./types";

interface PostModalProps {
    post: CommunityPost | null;
    isLiked: boolean;
    onToggleLike: () => void;
    onClose: () => void;
    comments: Comment[];
    onAddComment: (postId: number, content: string) => void;
}

export default function PostModal({
    post,
    isLiked,
    onToggleLike,
    onClose,
    comments,
    onAddComment,
}: PostModalProps) {
    const [comment, setComment] = useState("");
    const [isSaved, setIsSaved] = useState(false);
    const [showAllComments, setShowAllComments] = useState(false);

    useEffect(() => {
        if (!post) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = "";
        };
    }, [post, onClose]);

    // 모달 닫힐 때 상태 초기화
    useEffect(() => {
        if (!post) {
            setComment("");
            setShowAllComments(false);
        }
    }, [post]);

    if (!post) return null;

    const displayLikes = isLiked ? post.likes + 1 : post.likes;
    const totalComments = post.comments + comments.length;
    const displayComments = showAllComments ? comments : comments.slice(-3);

    const handleSubmitComment = () => {
        if (!comment.trim()) return;
        onAddComment(post.id, comment.trim());
        setComment("");
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmitComment();
        }
    };

    return (
        <div
            className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-4"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col" role="dialog" aria-modal="true" aria-labelledby="post-detail-title">
                {/* 헤더 */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm">
                                {post.author.charAt(0)}
                            </span>
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                                {post.author}
                            </p>
                            <p className="text-xs text-gray-500">{post.time}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full"
                            aria-label="더보기"
                        >
                            <MoreHorizontal className="w-5 h-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full"
                            onClick={onClose}
                            aria-label="닫기"
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                {/* 스크롤 가능한 컨텐츠 영역 */}
                <div className="flex-1 overflow-y-auto">
                    {/* 컨텐츠 */}
                    <div className="p-4 space-y-4">
                        {/* 배지 */}
                        <Badge
                            className={`
                                ${post.badge === "인기" ? "bg-[#BAE6FD] text-[#0369A1] dark:bg-blue-900/50 dark:text-blue-300" : ""}
                                ${post.badge === "꿀팁" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300" : ""}
                                ${post.badge === "후기" ? "bg-[#E0F7FF] text-[#0369A1] dark:bg-sky-900/50 dark:text-sky-300" : ""}
                                rounded-lg
                            `}
                        >
                            {post.badge === "인기" && (
                                <Crown className="w-3 h-3 mr-1" />
                            )}
                            {post.badge === "꿀팁" && (
                                <Zap className="w-3 h-3 mr-1" />
                            )}
                            {post.badge}
                        </Badge>

                        {/* 제목 & 내용 */}
                        <div>
                            <h2 id="post-detail-title" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                                {post.title}
                            </h2>
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                                {post.content}
                            </p>
                        </div>

                        {/* 이미지 플레이스홀더 */}
                        <div className="aspect-video bg-gradient-to-br from-[#BAE6FD] to-[#E0F7FF] dark:from-blue-900/30 dark:to-sky-900/30 rounded-xl flex items-center justify-center">
                            <div className="text-center text-gray-500 dark:text-gray-400">
                                <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">커뮤니티 게시글</p>
                            </div>
                        </div>
                    </div>

                    {/* 액션 버튼들 */}
                    <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={onToggleLike}
                                    className="transition-transform active:scale-125"
                                    aria-label="좋아요"
                                >
                                    <Heart
                                        className={`w-7 h-7 transition-colors ${
                                            isLiked
                                                ? "fill-red-500 text-red-500"
                                                : "text-gray-700 dark:text-gray-300"
                                        }`}
                                    />
                                </button>
                                <button aria-label="댓글">
                                    <MessageCircle className="w-7 h-7 text-gray-700 dark:text-gray-300" />
                                </button>
                                <button aria-label="공유">
                                    <Share2 className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                                </button>
                            </div>
                            <button onClick={() => setIsSaved(!isSaved)} aria-label="저장">
                                <Bookmark
                                    className={`w-7 h-7 transition-colors ${
                                        isSaved
                                            ? "fill-gray-900 dark:fill-gray-100 text-gray-900 dark:text-gray-100"
                                            : "text-gray-700 dark:text-gray-300"
                                    }`}
                                />
                            </button>
                        </div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                            좋아요 {displayLikes.toLocaleString()}개
                        </p>

                        {/* 댓글 영역 */}
                        <div className="space-y-2">
                            {comments.length > 3 && !showAllComments && (
                                <button
                                    className="text-gray-500 text-sm hover:text-gray-700 dark:hover:text-gray-300"
                                    onClick={() => setShowAllComments(true)}
                                >
                                    댓글 {totalComments}개 모두 보기
                                </button>
                            )}
                            {displayComments.map((c) => (
                                <div key={c.id} className="flex gap-2">
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                                        {c.author}
                                    </span>
                                    <span className="text-gray-700 dark:text-gray-300">
                                        {c.content}
                                    </span>
                                </div>
                            ))}
                            <p className="text-xs text-gray-500">{post.time}</p>
                        </div>
                    </div>
                </div>

                {/* 댓글 입력 (고정) */}
                <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0">
                    <div className="w-8 h-8 bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-xs">나</span>
                    </div>
                    <input
                        type="text"
                        placeholder="댓글 달기..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1 bg-transparent outline-none text-gray-700 dark:text-gray-300 placeholder:text-gray-400"
                    />
                    <button
                        onClick={handleSubmitComment}
                        className={`font-semibold transition-colors ${
                            comment.trim()
                                ? "text-[#05B2DC] hover:text-[#0891B2]"
                                : "text-[#BAE6FD] cursor-not-allowed"
                        }`}
                        disabled={!comment.trim()}
                    >
                        게시
                    </button>
                </div>
            </div>
        </div>
    );
}
