/**
 * PostDetailComments - 댓글 섹션
 * 댓글 목록, 댓글 좋아요/비추천, 댓글 입력
 */
"use client";

import { Ref } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Heart,
    ThumbsDown,
    MessageCircle,
    Send,
    MoreHorizontal,
    Flag,
    Trash2,
    Ban,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InlineLoading } from "@/components/ui/PawLoading";
import { OptimizedImage } from "@/components/ui/optimized-image";
import type { PostComment } from "./postDetailTypes";
import { formatTime } from "./postDetailTypes";

interface PostDetailCommentsProps {
    comments: PostComment[];
    user: { id: string } | null;
    commentText: string;
    isSubmittingComment: boolean;
    commentInputRef: Ref<HTMLTextAreaElement>;
    onSetCommentText: (text: string) => void;
    onSubmitComment: () => void;
    onDeleteComment: (commentId: string) => void;
    onReportComment: (commentId: string) => void;
    onBlockUser: (targetUserId: string, targetName: string) => void;
    onVisitUser: (userId: string) => void;
    onCommentLike: (commentId: string) => void;
    onCommentDislike: (commentId: string) => void;
}

export default function PostDetailComments({
    comments,
    user,
    commentText,
    isSubmittingComment,
    commentInputRef,
    onSetCommentText,
    onSubmitComment,
    onDeleteComment,
    onReportComment,
    onBlockUser,
    onVisitUser,
    onCommentLike,
    onCommentDislike,
}: PostDetailCommentsProps) {
    return (
        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/50 dark:border-gray-700/50 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    댓글 {comments.length > 0 && `(${comments.length})`}
                </h3>
            </div>

            {/* 댓글 목록 */}
            {comments.length > 0 ? (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {comments.map((comment) => (
                        <div key={comment.id} className="p-4">
                            <div className="flex items-start justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    {comment.authorAvatar ? (
                                        <OptimizedImage
                                            src={comment.authorAvatar}
                                            alt=""
                                            width={28}
                                            height={28}
                                            className="w-7 h-7 rounded-full"
                                        />
                                    ) : (
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-r from-sky-400 to-blue-400 flex items-center justify-center text-white text-xs font-bold">
                                            {comment.authorNickname.charAt(0)}
                                        </div>
                                    )}
                                    <button
                                        onClick={() => {
                                            const uid = comment.userId || comment.user_id;
                                            if (uid) onVisitUser(uid);
                                        }}
                                        className="font-medium text-sm text-gray-800 dark:text-gray-200 hover:text-memento-600 dark:hover:text-memento-400 hover:underline transition-colors truncate max-w-[150px]"
                                    >
                                        {comment.authorNickname}
                                    </button>
                                    <span className="text-xs text-gray-400">
                                        {formatTime(comment.createdAt)}
                                    </span>
                                </div>

                                {/* 댓글 더보기 */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                                            aria-label="댓글 더보기"
                                        >
                                            <MoreHorizontal className="w-3.5 h-3.5 text-gray-400" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        {/* 본인 댓글이면 삭제 */}
                                        {user && (comment.userId || comment.user_id) === user.id && (
                                            <DropdownMenuItem
                                                onClick={() => onDeleteComment(comment.id)}
                                                className="text-red-500"
                                            >
                                                <Trash2 className="w-4 h-4 mr-2" />
                                                삭제
                                            </DropdownMenuItem>
                                        )}
                                        {/* 타인 댓글이면 신고/차단 */}
                                        {(!user || (comment.userId || comment.user_id) !== user?.id) && (
                                            <DropdownMenuItem
                                                onClick={() => {
                                                    if (!user) {
                                                        window.dispatchEvent(new CustomEvent("openAuthModal"));
                                                        return;
                                                    }
                                                    onReportComment(comment.id);
                                                }}
                                                className="text-red-500"
                                            >
                                                <Flag className="w-4 h-4 mr-2" />
                                                신고
                                            </DropdownMenuItem>
                                        )}
                                        {/* 댓글 작성자 차단 (본인이 아닐 때만) */}
                                        {user && (comment.userId || comment.user_id) && (comment.userId || comment.user_id) !== user.id && (
                                            <DropdownMenuItem
                                                onClick={() => onBlockUser(
                                                    comment.userId || comment.user_id || "",
                                                    comment.authorNickname
                                                )}
                                                className="text-orange-500"
                                            >
                                                <Ban className="w-4 h-4 mr-2" />
                                                차단
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 ml-9 leading-relaxed">
                                {comment.content}
                            </p>
                            {/* 댓글 좋아요/비추천 */}
                            <div className="ml-9 mt-1.5 flex items-center gap-3">
                                <button
                                    onClick={() => onCommentLike(comment.id)}
                                    className={`flex items-center gap-1 text-xs transition-colors ${
                                        comment.userLiked
                                            ? "text-rose-500"
                                            : "text-gray-400 hover:text-rose-500"
                                    }`}
                                >
                                    <Heart className={`w-3.5 h-3.5 ${comment.userLiked ? "fill-current" : ""}`} />
                                    {(comment.likes || 0) > 0 && <span>{comment.likes}</span>}
                                </button>
                                <button
                                    onClick={() => onCommentDislike(comment.id)}
                                    className={`flex items-center gap-1 text-xs transition-colors ${
                                        comment.userDisliked
                                            ? "text-gray-600 dark:text-gray-300"
                                            : "text-gray-400 hover:text-gray-600"
                                    }`}
                                >
                                    <ThumbsDown className={`w-3.5 h-3.5 ${comment.userDisliked ? "fill-current" : ""}`} />
                                    {(comment.dislikes || 0) > 0 && <span>{comment.dislikes}</span>}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="p-8 text-center text-gray-400 text-sm">
                    아직 댓글이 없습니다. 첫 댓글을 남겨보세요!
                </div>
            )}

            {/* 댓글 입력 */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
                {user ? (
                    <div className="flex gap-2">
                        <Textarea
                            ref={commentInputRef}
                            value={commentText}
                            onChange={(e) => onSetCommentText(e.target.value)}
                            placeholder="댓글을 입력하세요..."
                            aria-label="댓글 입력"
                            rows={2}
                            maxLength={2000}
                            className="flex-1 rounded-xl bg-white dark:bg-gray-800 resize-none text-sm"
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    onSubmitComment();
                                }
                            }}
                        />
                        <Button
                            onClick={onSubmitComment}
                            disabled={!commentText.trim() || isSubmittingComment}
                            className="rounded-xl bg-gradient-to-r from-sky-500 to-blue-500 self-end px-4"
                        >
                            {isSubmittingComment ? (
                                <InlineLoading />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                        </Button>
                    </div>
                ) : (
                    <button
                        onClick={() => window.dispatchEvent(new CustomEvent("openAuthModal"))}
                        className="w-full py-3 text-center text-sm text-gray-500 hover:text-sky-500 transition-colors"
                    >
                        로그인하고 댓글을 남겨보세요
                    </button>
                )}
            </div>
        </div>
    );
}
