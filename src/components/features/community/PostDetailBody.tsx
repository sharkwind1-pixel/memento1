/**
 * PostDetailBody - 게시글 본문 카드
 * 뱃지, 제목, 작성자, 본문 텍스트, 이미지/영상, 액션바(좋아요/비추천/댓글/공유/신고)
 */
"use client";

// no React imports needed beyond what JSX provides
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Heart,
    ThumbsDown,
    MessageCircle,
    Eye,
    Clock,
    Flag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { InlineLoading } from "@/components/ui/PawLoading";
import { OptimizedImage } from "@/components/ui/optimized-image";
import KakaoShareButton from "@/components/common/KakaoShareButton";
import LevelBadge from "@/components/features/points/LevelBadge";
import type { PostData } from "./postDetailTypes";
import { getBadgeStyle, getBadgeOptions, formatTime } from "./postDetailTypes";
import type { CommunitySubcategory } from "@/types";

interface PostDetailBodyProps {
    post: PostData;
    subcategory: CommunitySubcategory;
    postId: string;
    user: { id: string } | null;
    isOwner: boolean | null | undefined;
    isEditing: boolean;
    editTitle: string;
    editContent: string;
    editBadge: string;
    isSavingEdit: boolean;
    isLiked: boolean;
    likeCount: number;
    isLiking: boolean;
    isDisliked: boolean;
    dislikeCount: number;
    isDisliking: boolean;
    commentsCount: number;
    onFocusCommentInput: () => void;
    onSetEditBadge: (badge: string) => void;
    onSetEditTitle: (title: string) => void;
    onSetEditContent: (content: string) => void;
    onCancelEdit: () => void;
    onSaveEdit: () => void;
    onLike: () => void;
    onDislike: () => void;
    onVisitUser: (userId: string) => void;
    onReport: () => void;
}

export default function PostDetailBody({
    post,
    subcategory,
    postId,
    user,
    isOwner,
    isEditing,
    editTitle,
    editContent,
    editBadge,
    isSavingEdit,
    isLiked,
    likeCount,
    isLiking,
    isDisliked,
    dislikeCount,
    isDisliking,
    commentsCount,
    onFocusCommentInput,
    onSetEditBadge,
    onSetEditTitle,
    onSetEditContent,
    onCancelEdit,
    onSaveEdit,
    onLike,
    onDislike,
    onVisitUser,
    onReport,
}: PostDetailBodyProps) {
    return (
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
                                    onClick={() => onSetEditBadge(opt)}
                                    className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                                        editBadge === opt
                                            ? `${getBadgeStyle(opt)} ring-2 ring-offset-1 ring-memento-400`
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
                        onChange={(e) => onSetEditTitle(e.target.value)}
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
                            onClick={() => post.user_id && onVisitUser(post.user_id)}
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
                        {/* 연결된 반려동물 — 동명 펫 구분 + 종 평등 노출 */}
                        {post.author_pet && (
                            <span
                                className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
                                title={`${post.author_pet.name} · ${post.author_pet.type}${post.author_pet.breed ? ` · ${post.author_pet.breed}` : ""}`}
                            >
                                <span>·</span>
                                <span className="truncate max-w-[160px]">
                                    {post.author_pet.name}
                                    {post.author_pet.breed ? ` · ${post.author_pet.breed}` : ` · ${post.author_pet.type}`}
                                </span>
                            </span>
                        )}
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
                            onChange={(e) => onSetEditContent(e.target.value)}
                            className="min-h-[200px] rounded-xl resize-none"
                            maxLength={10000}
                            placeholder="내용을 입력하세요"
                        />
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onCancelEdit}
                                className="rounded-xl"
                            >
                                취소
                            </Button>
                            <Button
                                size="sm"
                                onClick={onSaveEdit}
                                disabled={isSavingEdit || !editTitle.trim() || !editContent.trim()}
                                className="rounded-xl bg-memento-500 hover:bg-memento-600"
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
                    <div className="mt-4 rounded-xl overflow-hidden border dark:border-gray-600 max-w-sm mx-auto">
                        <video
                            src={post.video_url}
                            controls
                            autoPlay
                            muted
                            loop
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
                    onClick={onLike}
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
                    onClick={onDislike}
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
                    onClick={onFocusCommentInput}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:bg-memento-200 hover:text-memento-500 hover:border-memento-200 transition-all text-sm"
                >
                    <MessageCircle className="w-4 h-4" />
                    <span className="font-medium">{commentsCount}</span>
                </button>
                {/* 공유 버튼 */}
                <KakaoShareButton
                    shareParams={{
                        title: post?.title || "메멘토애니",
                        description: post?.content?.slice(0, 100) || "",
                        imageUrl: post?.image_urls?.[0],
                        pageUrl: `/`,
                    }}
                />
                {/* 신고 버튼 -- 오른쪽 끝 */}
                {!isOwner && (
                    <button
                        onClick={() => {
                            if (!user) {
                                window.dispatchEvent(new CustomEvent("openAuthModal"));
                                return;
                            }
                            onReport();
                        }}
                        className="ml-auto flex items-center gap-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-600 hover:bg-red-50 hover:text-red-500 hover:border-red-200 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-all text-xs"
                    >
                        <Flag className="w-3.5 h-3.5" />
                        <span>신고</span>
                    </button>
                )}
            </div>
        </div>
    );
}
