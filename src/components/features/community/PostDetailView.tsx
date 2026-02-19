/**
 * PostDetailView - 커뮤니티 게시글 상세 보기
 * 게시글 본문, 좋아요, 댓글 목록, 댓글 작성
 */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    ArrowLeft,
    Heart,
    MessageCircle,
    Eye,
    Clock,
    Send,
    MoreHorizontal,
    Flag,
    Trash2,
    Edit3,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { InlineLoading } from "@/components/ui/PawLoading";
import PawLoading from "@/components/ui/PawLoading";
import { useAuth } from "@/contexts/AuthContext";
import ReportModal from "@/components/modals/ReportModal";
import type { CommunitySubcategory } from "@/types";

interface PostComment {
    id: string;
    postId: string;
    userId: string;
    content: string;
    authorNickname: string;
    authorAvatar?: string;
    createdAt: string;
    // 레거시 필드 호환
    author_nickname?: string;
    author_avatar?: string;
    user_id?: string;
    post_id?: string;
    created_at?: string;
}

interface PostData {
    id: string;
    user_id: string;
    board_type?: string;
    category?: string;
    animal_type?: string;
    badge?: string;
    title: string;
    content: string;
    author_name: string;
    likes: number;
    likes_count?: number;
    views: number;
    comments: PostComment[] | number;
    comments_count?: number;
    created_at: string;
    updated_at?: string;
}

interface PostDetailViewProps {
    postId: string;
    subcategory: CommunitySubcategory;
    onBack: () => void;
    onPostDeleted?: () => void;
}

// 배지 색상
const getBadgeStyle = (badge: string) => {
    const styles: Record<string, string> = {
        "자랑": "bg-[#BAE6FD] text-[#0369A1]",
        "일상": "bg-[#E0F7FF] text-sky-700",
        "질문": "bg-amber-100 text-amber-700",
        "꿀팁": "bg-emerald-100 text-emerald-700",
        "위로": "bg-violet-100 text-violet-700",
        "추억": "bg-pink-100 text-pink-700",
        "입양": "bg-rose-100 text-rose-700",
        "긴급": "bg-red-100 text-red-700",
        "분양": "bg-pink-100 text-pink-700",
        "추천": "bg-emerald-100 text-emerald-700",
        "정보": "bg-teal-100 text-teal-700",
        "모임": "bg-cyan-100 text-cyan-700",
        "분실": "bg-red-100 text-red-700",
        "발견": "bg-emerald-100 text-emerald-700",
        "완료": "bg-gray-100 text-gray-700",
        "수다": "bg-purple-100 text-purple-700",
        "고민": "bg-amber-100 text-amber-700",
        "감사": "bg-pink-100 text-pink-700",
        "후기": "bg-teal-100 text-teal-700",
    };
    return styles[badge] || "bg-gray-100 text-gray-700";
};

export default function PostDetailView({
    postId,
    subcategory,
    onBack,
    onPostDeleted,
}: PostDetailViewProps) {
    const { user } = useAuth();
    const [post, setPost] = useState<PostData | null>(null);
    const [comments, setComments] = useState<PostComment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [commentText, setCommentText] = useState("");
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [isLiking, setIsLiking] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [reportTarget, setReportTarget] = useState<{
        id: string;
        type: "post" | "comment";
        title?: string;
    } | null>(null);
    const commentInputRef = useRef<HTMLTextAreaElement>(null);

    // 게시글 상세 로드
    const fetchPost = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/posts/${postId}`);
            if (!response.ok) throw new Error("게시글 로드 실패");

            const data = await response.json();
            const postData = data.post;

            setPost(postData);
            setLikeCount(postData.likes ?? postData.likes_count ?? 0);

            // 댓글 매핑
            const rawComments = Array.isArray(postData.comments) ? postData.comments : [];
            setComments(rawComments.map((c: PostComment) => ({
                id: c.id,
                postId: c.postId || c.post_id || postId,
                userId: c.userId || c.user_id || "",
                content: c.content,
                authorNickname: c.authorNickname || c.author_nickname || "익명",
                authorAvatar: c.authorAvatar || c.author_avatar,
                createdAt: c.createdAt || c.created_at || new Date().toISOString(),
            })));
        } catch {
            // 로드 실패 시 빈 상태 유지
        } finally {
            setIsLoading(false);
        }
    }, [postId]);

    useEffect(() => {
        fetchPost();
    }, [fetchPost]);

    // 시간 포맷
    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return "방금 전";
        if (minutes < 60) return `${minutes}분 전`;
        if (hours < 24) return `${hours}시간 전`;
        if (days < 7) return `${days}일 전`;
        return date.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
    };

    // 좋아요 토글
    const handleLike = async () => {
        if (!user) {
            window.dispatchEvent(new CustomEvent("openAuthModal"));
            return;
        }
        if (isLiking) return;

        setIsLiking(true);
        try {
            const response = await fetch(`/api/posts/${postId}/like`, {
                method: "POST",
            });
            if (!response.ok) throw new Error("좋아요 실패");

            const data = await response.json();
            setIsLiked(data.liked);
            setLikeCount(data.likes);
        } catch {
            // 실패 무시
        } finally {
            setIsLiking(false);
        }
    };

    // 댓글 작성
    const handleSubmitComment = async () => {
        if (!user) {
            window.dispatchEvent(new CustomEvent("openAuthModal"));
            return;
        }
        if (!commentText.trim() || isSubmittingComment) return;

        setIsSubmittingComment(true);
        try {
            const response = await fetch(`/api/posts/${postId}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: commentText.trim() }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "댓글 작성 실패");
            }

            const data = await response.json();
            const newComment = data.comment;

            setComments(prev => [...prev, {
                id: newComment.id,
                postId: newComment.postId || postId,
                userId: newComment.userId || user.id,
                content: newComment.content,
                authorNickname: newComment.authorNickname || newComment.author_nickname || "익명",
                authorAvatar: newComment.authorAvatar || newComment.author_avatar,
                createdAt: newComment.createdAt || newComment.created_at || new Date().toISOString(),
            }]);
            setCommentText("");
        } catch {
            // 실패 무시
        } finally {
            setIsSubmittingComment(false);
        }
    };

    // 게시글 삭제
    const handleDelete = async () => {
        if (!confirm("정말 삭제하시겠습니까?")) return;
        setIsDeleting(true);
        try {
            const response = await fetch(`/api/posts/${postId}`, {
                method: "DELETE",
            });
            if (!response.ok) throw new Error("삭제 실패");
            onPostDeleted?.();
            onBack();
        } catch {
            alert("삭제에 실패했습니다");
        } finally {
            setIsDeleting(false);
        }
    };

    // 본인 글 여부
    const isOwner = user && post && user.id === post.user_id;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <PawLoading size="lg" />
            </div>
        );
    }

    if (!post) {
        return (
            <div className="text-center py-20">
                <p className="text-gray-500 mb-4">게시글을 찾을 수 없습니다</p>
                <Button variant="outline" onClick={onBack}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    목록으로
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4 pb-8">
            {/* 상단 네비게이션 */}
            <div className="flex items-center justify-between">
                <Button
                    variant="ghost"
                    onClick={onBack}
                    className="rounded-xl text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-700/60"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    목록
                </Button>

                <div className="flex items-center gap-1">
                    {isOwner && (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-lg text-gray-500 hover:text-blue-600"
                                onClick={() => {/* TODO: 수정 모드 */}}
                            >
                                <Edit3 className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-lg text-gray-500 hover:text-red-600"
                                onClick={handleDelete}
                                disabled={isDeleting}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="rounded-lg">
                                <MoreHorizontal className="w-4 h-4 text-gray-400" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onClick={() => {
                                    if (!user) {
                                        window.dispatchEvent(new CustomEvent("openAuthModal"));
                                        return;
                                    }
                                    setReportTarget({
                                        id: postId,
                                        type: "post",
                                        title: post.title,
                                    });
                                }}
                                className="text-red-500 focus:text-red-600"
                            >
                                <Flag className="w-4 h-4 mr-2" />
                                신고하기
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* 게시글 본문 */}
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/50 dark:border-gray-700/50 rounded-2xl overflow-hidden">
                {/* 헤더 */}
                <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-3">
                        {post.badge && (
                            <Badge className={`${getBadgeStyle(post.badge)} rounded-lg`}>
                                {post.badge}
                            </Badge>
                        )}
                        {post.animal_type && (
                            <Badge variant="outline" className="rounded-lg text-xs">
                                {post.animal_type}
                            </Badge>
                        )}
                    </div>
                    <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-3">
                        {post.title}
                    </h1>
                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-3">
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                                {post.author_name}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {formatTime(post.created_at)}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                                <Eye className="w-3.5 h-3.5" />
                                {(post.views ?? 0).toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 본문 */}
                <div className="p-5">
                    <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                        {post.content}
                    </div>
                </div>

                {/* 좋아요 + 댓글 수 */}
                <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center gap-4">
                    <button
                        onClick={handleLike}
                        disabled={isLiking}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
                            isLiked
                                ? "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-700"
                                : "bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200"
                        }`}
                    >
                        <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
                        <span className="font-medium text-sm">{likeCount}</span>
                    </button>
                    <button
                        onClick={() => commentInputRef.current?.focus()}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:bg-blue-50 hover:text-blue-500 hover:border-blue-200 transition-all"
                    >
                        <MessageCircle className="w-4 h-4" />
                        <span className="font-medium text-sm">{comments.length}</span>
                    </button>
                </div>
            </div>

            {/* 댓글 섹션 */}
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
                                            <img
                                                src={comment.authorAvatar}
                                                alt=""
                                                className="w-7 h-7 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-7 h-7 rounded-full bg-gradient-to-r from-sky-400 to-blue-400 flex items-center justify-center text-white text-xs font-bold">
                                                {comment.authorNickname.charAt(0)}
                                            </div>
                                        )}
                                        <span className="font-medium text-sm text-gray-800 dark:text-gray-200">
                                            {comment.authorNickname}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {formatTime(comment.createdAt)}
                                        </span>
                                    </div>

                                    {/* 댓글 더보기 */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                                                <MoreHorizontal className="w-3.5 h-3.5 text-gray-400" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={() => {
                                                    if (!user) {
                                                        window.dispatchEvent(new CustomEvent("openAuthModal"));
                                                        return;
                                                    }
                                                    setReportTarget({
                                                        id: comment.id,
                                                        type: "comment",
                                                    });
                                                }}
                                                className="text-red-500"
                                            >
                                                <Flag className="w-4 h-4 mr-2" />
                                                신고
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 ml-9 leading-relaxed">
                                    {comment.content}
                                </p>
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
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="댓글을 입력하세요..."
                                rows={2}
                                maxLength={2000}
                                className="flex-1 rounded-xl bg-white dark:bg-gray-800 resize-none text-sm"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmitComment();
                                    }
                                }}
                            />
                            <Button
                                onClick={handleSubmitComment}
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

            {/* 신고 모달 */}
            {reportTarget && (
                <ReportModal
                    isOpen={true}
                    onClose={() => setReportTarget(null)}
                    targetType={reportTarget.type}
                    targetId={reportTarget.id}
                    targetTitle={reportTarget.title}
                />
            )}
        </div>
    );
}
