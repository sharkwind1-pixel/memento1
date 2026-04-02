/**
 * PostDetailView - 커뮤니티 게시글 상세 보기
 * 게시글 본문, 좋아요, 댓글 목록, 댓글 작성
 */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
    ArrowLeft,
    Heart,
    ThumbsDown,
    MessageCircle,
    Eye,
    Clock,
    Send,
    MoreHorizontal,
    Flag,
    Trash2,
    Edit3,
    EyeOff,
    Ban,
    Pin,
    Globe,
    Megaphone,
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
import { authFetch } from "@/lib/auth-fetch";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { API } from "@/config/apiEndpoints";
import ReportModal from "@/components/modals/ReportModal";
import MinihompyVisitModal from "@/components/features/minihompy/MinihompyVisitModal";
import LevelBadge from "@/components/features/points/LevelBadge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { CommunitySubcategory } from "@/types";

interface PostComment {
    id: string;
    postId: string;
    userId: string;
    content: string;
    authorNickname: string;
    authorAvatar?: string;
    createdAt: string;
    // 좋아요/비추천
    likes?: number;
    dislikes?: number;
    userLiked?: boolean;
    userDisliked?: boolean;
    // 레거시 필드 호환
    author_name?: string;
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
    animal_type?: string;
    badge?: string;
    title: string;
    content: string;
    author_name: string;
    likes: number;
    views: number;
    comments: PostComment[] | number;
    image_urls?: string[];
    video_url?: string;
    is_hidden?: boolean;
    is_pinned?: boolean;
    notice_scope?: "board" | "global" | null;
    authorMinimiSlug?: string | null;
    authorPoints?: number;
    authorIsAdmin?: boolean;
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
        "공지": "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 border border-red-200 dark:border-red-700",
        "자랑": "bg-memento-200 text-memento-700",
        "일상": "bg-memento-100 text-sky-700",
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

// 게시판별 뱃지 옵션 (수정 모드용)
const getBadgeOptions = (subcategory: CommunitySubcategory): string[] => {
    switch (subcategory) {
        case "free":
            return ["일상", "질문", "수다", "꿀팁"];
        case "memorial":
            return ["위로", "추억", "정보", "고민"];
        case "adoption":
            return ["입양", "분양", "긴급"];
        case "local":
            return ["추천", "정보", "모임"];
        case "lost":
            return ["분실", "발견", "완료"];
        default:
            return ["일상", "질문", "꿀팁"];
    }
};

export default function PostDetailView({
    postId,
    subcategory,
    onBack,
    onPostDeleted,
}: PostDetailViewProps) {
    const { user, isAdminUser } = useAuth();
    const [post, setPost] = useState<PostData | null>(null);
    const [comments, setComments] = useState<PostComment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [isDisliked, setIsDisliked] = useState(false);
    const [dislikeCount, setDislikeCount] = useState(0);
    const [commentText, setCommentText] = useState("");
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [isLiking, setIsLiking] = useState(false);
    const [isDisliking, setIsDisliking] = useState(false);
    const likingRef = useRef(false);
    const dislikingRef = useRef(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isHidden, setIsHidden] = useState(false);
    const [isTogglingHidden, setIsTogglingHidden] = useState(false);
    const [reportTarget, setReportTarget] = useState<{
        id: string;
        type: "post" | "comment";
        title?: string;
    } | null>(null);
    const commentInputRef = useRef<HTMLTextAreaElement>(null);
    const [visitUserId, setVisitUserId] = useState<string | null>(null);

    // 게시글 수정 상태
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [editContent, setEditContent] = useState("");
    const [editBadge, setEditBadge] = useState("");
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    // 공지 상태 (관리자)
    const [isTogglingNotice, setIsTogglingNotice] = useState(false);

    // 커스텀 확인 다이얼로그 상태
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        confirmText?: string;
        destructive?: boolean;
        onConfirm: () => void;
    }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

    // 게시글 상세 로드
    const fetchPost = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(API.POST_DETAIL(postId));
            if (!response.ok) throw new Error("게시글 로드 실패");

            const data = await response.json();
            const postData = data.post;

            setPost(postData);
            setLikeCount(postData.likes ?? postData.likes_count ?? 0);
            setIsLiked(postData.userLiked ?? false);
            setDislikeCount(postData.dislikes ?? 0);
            setIsDisliked(postData.userDisliked ?? false);
            setIsHidden(postData.is_hidden ?? false);

            // 댓글 매핑
            const rawComments = Array.isArray(postData.comments) ? postData.comments : [];
            setComments(rawComments.map((c: PostComment) => ({
                id: c.id,
                postId: c.postId || c.post_id || postId,
                userId: c.userId || c.user_id || "",
                content: c.content,
                authorNickname: c.authorNickname || c.author_nickname || c.author_name || "익명",
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
        if (likingRef.current) return;

        // 자기 글 좋아요 방지
        if (post && user.id === post.user_id) {
            toast.info("자신의 글에는 좋아요를 누를 수 없습니다");
            return;
        }

        likingRef.current = true;
        setIsLiking(true);

        // 낙관적 UI: 즉시 반영
        const prevLiked = isLiked;
        const prevCount = likeCount;
        setIsLiked(!prevLiked);
        setLikeCount(prevLiked ? prevCount - 1 : prevCount + 1);

        try {
            const response = await authFetch(API.POST_LIKE(postId), {
                method: "POST",
            });
            if (!response.ok) throw new Error("좋아요 실패");

            const data = await response.json();
            setIsLiked(data.liked);
            setLikeCount(data.likes);
        } catch {
            // 롤백
            setIsLiked(prevLiked);
            setLikeCount(prevCount);
            toast.error("좋아요 처리에 실패했습니다");
        } finally {
            likingRef.current = false;
            setIsLiking(false);
        }
    };

    // 비추천 토글
    const handleDislike = async () => {
        if (!user) {
            window.dispatchEvent(new CustomEvent("openAuthModal"));
            return;
        }
        if (dislikingRef.current) return;

        if (post && user.id === post.user_id) {
            toast.info("자신의 글에는 비추천할 수 없습니다");
            return;
        }

        dislikingRef.current = true;
        setIsDisliking(true);

        // 낙관적 UI: 즉시 반영
        const prevDisliked = isDisliked;
        const prevDCount = dislikeCount;
        setIsDisliked(!prevDisliked);
        setDislikeCount(prevDisliked ? prevDCount - 1 : prevDCount + 1);

        try {
            const response = await authFetch(API.POST_DISLIKE(postId), {
                method: "POST",
            });
            if (!response.ok) throw new Error("비추천 실패");

            const data = await response.json();
            setIsDisliked(data.disliked);
            setDislikeCount(data.dislikes);
        } catch {
            // 롤백
            setIsDisliked(prevDisliked);
            setDislikeCount(prevDCount);
            toast.error("비추천 처리에 실패했습니다");
        } finally {
            dislikingRef.current = false;
            setIsDisliking(false);
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
            const response = await authFetch(API.POST_COMMENTS(postId), {
                method: "POST",
                body: JSON.stringify({ content: commentText.trim() }),
            });

            if (!response.ok) {
                const data = await response.json();
                const errMsg = data.detail ? `${data.error}: ${data.detail}` : (data.error || "댓글 작성 실패");
                throw new Error(errMsg);
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
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "댓글 작성에 실패했습니다. 다시 시도해주세요");
        } finally {
            setIsSubmittingComment(false);
        }
    };

    // 게시글 삭제
    const handleDelete = () => {
        setConfirmState({
            isOpen: true,
            title: "게시글 삭제",
            message: "정말 삭제하시겠습니까?",
            confirmText: "삭제",
            destructive: true,
            onConfirm: executeDelete,
        });
    };
    const executeDelete = async () => {
        setIsDeleting(true);
        try {
            const response = await authFetch(API.POST_DETAIL(postId), {
                method: "DELETE",
            });
            if (!response.ok) throw new Error("삭제 실패");
            onPostDeleted?.();
            onBack();
        } catch {
            toast.error("삭제에 실패했습니다");
        } finally {
            setIsDeleting(false);
        }
    };

    // 게시글 숨기기/공개 토글
    const handleToggleHidden = () => {
        const newHidden = !isHidden;
        const msg = newHidden
            ? "이 게시글을 숨기시겠어요? 다른 사람들에게 보이지 않게 됩니다."
            : "이 게시글을 다시 공개하시겠어요?";
        setConfirmState({
            isOpen: true,
            title: newHidden ? "게시글 숨기기" : "게시글 공개",
            message: msg,
            confirmText: newHidden ? "숨기기" : "공개",
            destructive: newHidden,
            onConfirm: () => executeToggleHidden(newHidden),
        });
    };
    const executeToggleHidden = async (newHidden: boolean) => {
        setIsTogglingHidden(true);
        try {
            const response = await authFetch(API.POST_DETAIL(postId), {
                method: "PATCH",
                body: JSON.stringify({ isHidden: newHidden }),
            });
            if (!response.ok) throw new Error("숨기기 변경 실패");

            setIsHidden(newHidden);
            if (newHidden) {
                // 숨기면 목록으로 돌아가기
                onPostDeleted?.();
                onBack();
            }
        } catch {
            toast.error("숨기기 변경에 실패했습니다");
        } finally {
            setIsTogglingHidden(false);
        }
    };

    // 유저 차단
    const handleBlockUser = async (targetUserId: string, targetName: string) => {
        if (!user) {
            window.dispatchEvent(new CustomEvent("openAuthModal"));
            return;
        }
        if (targetUserId === user.id) return;

        setConfirmState({
            isOpen: true,
            title: "유저 차단",
            message: `"${targetName}" 님을 차단하시겠습니까?\n\n차단하면 이 유저의 게시글과 댓글이 더 이상 보이지 않습니다.\n설정에서 차단을 해제할 수 있습니다.`,
            confirmText: "차단",
            destructive: true,
            onConfirm: () => executeBlockUser(targetUserId, targetName),
        });
    };
    const executeBlockUser = async (targetUserId: string, targetName: string) => {
        try {
            const response = await authFetch(API.BLOCKS, {
                method: "POST",
                body: JSON.stringify({ blockedUserId: targetUserId }),
            });

            if (response.status === 409) {
                toast.info("이미 차단한 유저입니다");
                return;
            }

            if (!response.ok) throw new Error("차단 실패");

            toast.success(`"${targetName}" 님을 차단했습니다`);
            // 차단 후 목록으로 돌아가기
            onPostDeleted?.();
            onBack();
        } catch {
            toast.error("차단에 실패했습니다. 다시 시도해주세요.");
        }
    };

    // 게시글 수정 시작
    const handleStartEdit = () => {
        if (!post) return;
        setEditTitle(post.title);
        setEditContent(post.content);
        setEditBadge(post.badge || "");
        setIsEditing(true);
    };

    // 게시글 수정 저장
    const handleSaveEdit = async () => {
        if (!editTitle.trim() || !editContent.trim()) {
            toast.error("제목과 내용을 입력해주세요");
            return;
        }

        setIsSavingEdit(true);
        try {
            const patchBody: Record<string, string> = {
                title: editTitle.trim(),
                content: editContent.trim(),
            };
            // 뱃지가 변경되었으면 함께 전송
            if (editBadge && editBadge !== post?.badge) {
                patchBody.badge = editBadge;
            }
            const response = await authFetch(API.POST_DETAIL(postId), {
                method: "PATCH",
                body: JSON.stringify(patchBody),
            });

            if (!response.ok) throw new Error("수정 실패");

            const data = await response.json();
            // PATCH 응답에는 authorPoints/authorIsAdmin이 없으므로 기존 값 보존
            setPost(prev => prev
                ? { ...data.post, authorPoints: prev.authorPoints, authorIsAdmin: prev.authorIsAdmin }
                : data.post
            );
            setIsEditing(false);
            toast.success("게시글이 수정되었습니다");
        } catch {
            toast.error("게시글 수정에 실패했습니다");
        } finally {
            setIsSavingEdit(false);
        }
    };

    // 공지 토글 (관리자 전용)
    const handleToggleNotice = async (scope: "board" | "global" | null) => {
        if (!isAdminUser || isTogglingNotice) return;

        const isPinning = scope !== null;
        const msg = isPinning
            ? `이 게시글을 ${scope === "global" ? "전체 공지" : "게시판 공지"}로 등록하시겠습니까?`
            : "공지를 해제하시겠습니까?";
        setConfirmState({
            isOpen: true,
            title: isPinning ? "공지 등록" : "공지 해제",
            message: msg,
            confirmText: isPinning ? "등록" : "해제",
            destructive: !isPinning,
            onConfirm: () => executeToggleNotice(scope),
        });
    };
    const executeToggleNotice = async (scope: "board" | "global" | null) => {
        const isPinning = scope !== null;
        setIsTogglingNotice(true);
        try {
            const response = await authFetch(API.POST_DETAIL(postId), {
                method: "PATCH",
                body: JSON.stringify({
                    isPinned: isPinning,
                    noticeScope: scope,
                }),
            });

            if (!response.ok) throw new Error("공지 설정 실패");

            const data = await response.json();
            // PATCH 응답에는 authorPoints/authorIsAdmin이 없으므로 기존 값 보존
            setPost(prev => prev
                ? { ...data.post, authorPoints: prev.authorPoints, authorIsAdmin: prev.authorIsAdmin }
                : data.post
            );
            toast.success(isPinning ? "공지로 등록되었습니다" : "공지가 해제되었습니다");
        } catch {
            toast.error("공지 설정에 실패했습니다");
        } finally {
            setIsTogglingNotice(false);
        }
    };

    // 댓글 삭제
    const handleDeleteComment = (commentId: string) => {
        if (!user || !post) return;
        setConfirmState({
            isOpen: true,
            title: "댓글 삭제",
            message: "이 댓글을 삭제하시겠습니까?",
            confirmText: "삭제",
            destructive: true,
            onConfirm: () => executeDeleteComment(commentId),
        });
    };
    const executeDeleteComment = async (commentId: string) => {
        try {
            const response = await authFetch(
                `${API.POST_COMMENTS(postId)}?commentId=${commentId}`,
                { method: "DELETE" }
            );

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "삭제 실패");
            }

            setComments(prev => prev.filter(c => c.id !== commentId));
            toast.success("댓글이 삭제되었습니다");
        } catch {
            toast.error("댓글 삭제에 실패했습니다");
        }
    };

    // 본인 글 여부 + 관리자 권한
    const isOwner = user && post && user.id === post.user_id;
    const canDelete = isOwner || isAdminUser;

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
                                className="rounded-lg text-gray-500 hover:text-amber-600"
                                onClick={handleToggleHidden}
                                disabled={isTogglingHidden}
                                title={isHidden ? "다시 공개" : "숨기기"}
                            >
                                <EyeOff className="w-4 h-4" />
                                <span className="text-xs ml-1">{isHidden ? "공개" : "숨기기"}</span>
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-lg text-gray-500 hover:text-sky-600"
                                onClick={handleStartEdit}
                                title="수정"
                            >
                                <Edit3 className="w-4 h-4" />
                            </Button>
                        </>
                    )}
                    {canDelete && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-lg text-gray-500 hover:text-red-600"
                            onClick={handleDelete}
                            disabled={isDeleting}
                            title={isAdminUser && !isOwner ? "관리자 삭제" : "삭제"}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" aria-label="게시글 더보기" className="rounded-lg">
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
                            {/* 차단하기 (본인 글이 아닐 때만) */}
                            {!isOwner && post.user_id && (
                                <DropdownMenuItem
                                    onClick={() => handleBlockUser(post.user_id, post.author_name)}
                                    className="text-orange-500 focus:text-orange-600"
                                >
                                    <Ban className="w-4 h-4 mr-2" />
                                    이 유저 차단
                                </DropdownMenuItem>
                            )}
                            {/* 관리자: 공지 설정 */}
                            {isAdminUser && !isTogglingNotice && (
                                <>
                                    {(!post.is_pinned || post.notice_scope !== "board") && (
                                        <DropdownMenuItem
                                            onClick={() => handleToggleNotice("board")}
                                            className="text-red-500 focus:text-red-600"
                                        >
                                            <Pin className="w-4 h-4 mr-2" />
                                            게시판 공지
                                        </DropdownMenuItem>
                                    )}
                                    {(!post.is_pinned || post.notice_scope !== "global") && (
                                        <DropdownMenuItem
                                            onClick={() => handleToggleNotice("global")}
                                            className="text-red-500 focus:text-red-600"
                                        >
                                            <Globe className="w-4 h-4 mr-2" />
                                            전체 공지
                                        </DropdownMenuItem>
                                    )}
                                    {post.is_pinned && (
                                        <DropdownMenuItem
                                            onClick={() => handleToggleNotice(null)}
                                            className="text-gray-500 focus:text-gray-600"
                                        >
                                            <Megaphone className="w-4 h-4 mr-2" />
                                            공지 해제
                                        </DropdownMenuItem>
                                    )}
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* 숨김 상태 안내 */}
            {isHidden && isOwner && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl px-4 py-3 flex items-center gap-2">
                    <EyeOff className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                        이 게시글은 숨김 상태입니다. 다른 사람들에게 보이지 않습니다.
                    </p>
                </div>
            )}

            {/* 공지 상태 안내 */}
            {post.is_pinned && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-xl px-4 py-3 flex items-center gap-2">
                    <Pin className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700 dark:text-red-300">
                        {post.notice_scope === "global" ? "전체 공지" : "게시판 공지"}
                    </p>
                </div>
            )}

            {/* 게시글 본문 */}
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/50 dark:border-gray-700/50 rounded-2xl overflow-hidden">
                {/* 헤더 */}
                <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                        {isEditing ? (
                            // 수정 모드: 뱃지 선택 버튼
                            <>
                                {getBadgeOptions(subcategory).map((opt) => (
                                    <button
                                        key={opt}
                                        onClick={() => setEditBadge(opt)}
                                        className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                                            editBadge === opt
                                                ? `${getBadgeStyle(opt)} ring-2 ring-offset-1 ring-sky-400`
                                                : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600"
                                        }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </>
                        ) : (
                            <>
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
                            </>
                        )}
                    </div>
                    {isEditing ? (
                        <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="text-xl font-bold mb-3 rounded-xl"
                            maxLength={200}
                            placeholder="제목을 입력하세요"
                        />
                    ) : (
                        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-3">
                            {post.title}
                        </h1>
                    )}
                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => post.user_id && setVisitUserId(post.user_id)}
                                className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300 hover:text-memento-600 dark:hover:text-memento-400 hover:underline transition-colors"
                            >
                                <LevelBadge
                                    points={post.authorPoints ?? 0}
                                    isAdmin={post.authorIsAdmin ?? false}
                                    size="md"
                                    showTooltip={false}
                                />
                                <span>{post.author_name}</span>
                            </button>
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
                    {isEditing ? (
                        <div className="space-y-3">
                            <Textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="min-h-[200px] rounded-xl resize-none"
                                maxLength={10000}
                                placeholder="내용을 입력하세요"
                            />
                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsEditing(false)}
                                    className="rounded-xl"
                                >
                                    취소
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleSaveEdit}
                                    disabled={isSavingEdit || !editTitle.trim() || !editContent.trim()}
                                    className="rounded-xl bg-sky-500 hover:bg-sky-600"
                                >
                                    {isSavingEdit ? <InlineLoading /> : "저장"}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                            {post.content}
                        </div>
                    )}

                    {/* 첨부 영상 */}
                    {post.video_url && (
                        <div className="mt-4 rounded-xl overflow-hidden border dark:border-gray-600">
                            <video
                                src={post.video_url}
                                controls
                                playsInline
                                className="w-full"
                            />
                        </div>
                    )}

                    {/* 첨부 이미지 */}
                    {post.image_urls && Array.isArray(post.image_urls) && post.image_urls.length > 0 && (
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            {post.image_urls.map((url: string, idx: number) => (
                                <div
                                    key={idx}
                                    className="relative rounded-xl overflow-hidden border dark:border-gray-600 cursor-pointer"
                                    onClick={() => window.open(url, "_blank")}
                                >
                                    <OptimizedImage
                                        src={url}
                                        alt={`첨부 이미지 ${idx + 1}`}
                                        fill
                                        className="w-full h-[300px]"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 좋아요 + 싫어요 + 댓글 + 신고 */}
                <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2">
                    <button
                        onClick={handleLike}
                        disabled={isLiking}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all text-sm ${
                            isLiked
                                ? "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-700"
                                : "bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200"
                        }`}
                    >
                        <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
                        <span className="font-medium">{likeCount}</span>
                    </button>
                    <button
                        onClick={handleDislike}
                        disabled={isDisliking}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all text-sm ${
                            isDisliked
                                ? "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-500"
                                : "bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 hover:text-gray-700 hover:border-gray-300"
                        }`}
                    >
                        <ThumbsDown className={`w-4 h-4 ${isDisliked ? "fill-current" : ""}`} />
                        <span className="font-medium">{dislikeCount}</span>
                    </button>
                    <button
                        onClick={() => commentInputRef.current?.focus()}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:bg-blue-50 hover:text-blue-500 hover:border-blue-200 transition-all text-sm"
                    >
                        <MessageCircle className="w-4 h-4" />
                        <span className="font-medium">{comments.length}</span>
                    </button>
                    {/* 신고 버튼 — 오른쪽 끝 */}
                    {!isOwner && (
                        <button
                            onClick={() => {
                                if (!user) {
                                    window.dispatchEvent(new CustomEvent("openAuthModal"));
                                    return;
                                }
                                setReportTarget({ id: postId, type: "post", title: post?.title || "" });
                            }}
                            className="ml-auto flex items-center gap-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-600 hover:bg-red-50 hover:text-red-500 hover:border-red-200 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-all text-xs"
                        >
                            <Flag className="w-3.5 h-3.5" />
                            <span>신고</span>
                        </button>
                    )}
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
                                                if (uid) setVisitUserId(uid);
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
                                                    onClick={() => handleDeleteComment(comment.id)}
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
                                            )}
                                            {/* 댓글 작성자 차단 (본인이 아닐 때만) */}
                                            {user && (comment.userId || comment.user_id) && (comment.userId || comment.user_id) !== user.id && (
                                                <DropdownMenuItem
                                                    onClick={() => handleBlockUser(
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
                                        onClick={async () => {
                                            if (!user) { window.dispatchEvent(new CustomEvent("openAuthModal")); return; }
                                            try {
                                                const res = await authFetch(API.COMMENT_LIKE(comment.id), { method: "POST" });
                                                if (!res.ok) return;
                                                const d = await res.json();
                                                setComments(prev => prev.map(c => c.id === comment.id ? { ...c, likes: d.likes, userLiked: d.liked } : c));
                                            } catch { /* 무시 */ }
                                        }}
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
                                        onClick={async () => {
                                            if (!user) { window.dispatchEvent(new CustomEvent("openAuthModal")); return; }
                                            try {
                                                const res = await authFetch(API.COMMENT_DISLIKE(comment.id), { method: "POST" });
                                                if (!res.ok) return;
                                                const d = await res.json();
                                                setComments(prev => prev.map(c => c.id === comment.id ? { ...c, dislikes: d.dislikes, userDisliked: d.disliked } : c));
                                            } catch { /* 무시 */ }
                                        }}
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
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="댓글을 입력하세요..."
                                aria-label="댓글 입력"
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

            {/* 미니홈피 방문 모달 */}
            {visitUserId && (
                <MinihompyVisitModal
                    isOpen={true}
                    onClose={() => setVisitUserId(null)}
                    userId={visitUserId}
                />
            )}

            {/* 커스텀 확인 다이얼로그 */}
            <ConfirmDialog
                isOpen={confirmState.isOpen}
                onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmState.onConfirm}
                title={confirmState.title}
                message={confirmState.message}
                confirmText={confirmState.confirmText}
                destructive={confirmState.destructive}
            />
        </div>
    );
}
