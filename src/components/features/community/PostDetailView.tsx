/**
 * PostDetailView - 커뮤니티 게시글 상세 보기
 * 게시글 본문, 좋아요, 댓글 목록, 댓글 작성
 */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import PawLoading from "@/components/ui/PawLoading";
import { useAuth } from "@/contexts/AuthContext";
import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";
import ReportModal from "@/components/modals/ReportModal";
import MinihompyVisitModal from "@/components/features/minihompy/MinihompyVisitModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { CommunitySubcategory } from "@/types";
import type { PostData, PostComment } from "./postDetailTypes";
import PostDetailHeader from "./PostDetailHeader";
import PostDetailBody from "./PostDetailBody";
import PostDetailComments from "./PostDetailComments";

interface PostDetailViewProps {
    postId: string;
    subcategory: CommunitySubcategory;
    onBack: () => void;
    onPostDeleted?: () => void;
}

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
    const [loadError, setLoadError] = useState<string | null>(null);
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
            setLoadError("게시글을 불러올 수 없습니다.");
        } finally {
            setIsLoading(false);
        }
    }, [postId]);

    useEffect(() => {
        fetchPost();
    }, [fetchPost]);

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

    // 댓글 좋아요 (inline async -> named function)
    const handleCommentLike = async (commentId: string) => {
        if (!user) { window.dispatchEvent(new CustomEvent("openAuthModal")); return; }
        try {
            const res = await authFetch(API.COMMENT_LIKE(commentId), { method: "POST" });
            if (!res.ok) return;
            const d = await res.json();
            setComments(prev => prev.map(c => c.id === commentId ? { ...c, likes: d.likes, userLiked: d.liked } : c));
        } catch { /* 무시 */ }
    };

    // 댓글 비추천 (inline async -> named function)
    const handleCommentDislike = async (commentId: string) => {
        if (!user) { window.dispatchEvent(new CustomEvent("openAuthModal")); return; }
        try {
            const res = await authFetch(API.COMMENT_DISLIKE(commentId), { method: "POST" });
            if (!res.ok) return;
            const d = await res.json();
            setComments(prev => prev.map(c => c.id === commentId ? { ...c, dislikes: d.dislikes, userDisliked: d.disliked } : c));
        } catch { /* 무시 */ }
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

    if (loadError) {
        return (
            <div className="text-center py-20">
                <p className="text-gray-500 mb-2">{loadError}</p>
                <p className="text-gray-400 text-sm mb-4">네트워크 상태를 확인하고 다시 시도해주세요.</p>
                <div className="flex gap-2 justify-center">
                    <Button variant="outline" onClick={() => { setLoadError(null); fetchPost(); }}>
                        다시 시도
                    </Button>
                    <Button variant="outline" onClick={onBack}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        목록으로
                    </Button>
                </div>
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
            <PostDetailHeader
                post={post}
                isOwner={isOwner}
                canDelete={canDelete}
                isAdminUser={isAdminUser}
                isHidden={isHidden}
                isTogglingHidden={isTogglingHidden}
                isDeleting={isDeleting}
                isTogglingNotice={isTogglingNotice}
                user={user}
                onBack={onBack}
                onToggleHidden={handleToggleHidden}
                onStartEdit={handleStartEdit}
                onDelete={handleDelete}
                onReport={() => setReportTarget({ id: postId, type: "post", title: post.title })}
                onBlockUser={handleBlockUser}
                onToggleNotice={handleToggleNotice}
            />

            <PostDetailBody
                post={post}
                subcategory={subcategory}
                postId={postId}
                user={user}
                isOwner={isOwner}
                isEditing={isEditing}
                editTitle={editTitle}
                editContent={editContent}
                editBadge={editBadge}
                isSavingEdit={isSavingEdit}
                isLiked={isLiked}
                likeCount={likeCount}
                isLiking={isLiking}
                isDisliked={isDisliked}
                dislikeCount={dislikeCount}
                isDisliking={isDisliking}
                commentsCount={comments.length}
                onFocusCommentInput={() => commentInputRef.current?.focus()}
                onSetEditBadge={setEditBadge}
                onSetEditTitle={setEditTitle}
                onSetEditContent={setEditContent}
                onCancelEdit={() => setIsEditing(false)}
                onSaveEdit={handleSaveEdit}
                onLike={handleLike}
                onDislike={handleDislike}
                onVisitUser={(uid) => setVisitUserId(uid)}
                onReport={() => setReportTarget({ id: postId, type: "post", title: post?.title || "" })}
            />

            <PostDetailComments
                comments={comments}
                user={user}
                commentText={commentText}
                isSubmittingComment={isSubmittingComment}
                commentInputRef={commentInputRef}
                onSetCommentText={setCommentText}
                onSubmitComment={handleSubmitComment}
                onDeleteComment={handleDeleteComment}
                onReportComment={(commentId) => setReportTarget({ id: commentId, type: "comment" })}
                onBlockUser={handleBlockUser}
                onVisitUser={(uid) => setVisitUserId(uid)}
                onCommentLike={handleCommentLike}
                onCommentDislike={handleCommentDislike}
            />

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
