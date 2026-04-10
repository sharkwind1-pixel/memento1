/**
 * ============================================================================
 * tabs/AdminPostsTab.tsx
 * ============================================================================
 * 관리자 게시물 관리 탭
 *
 * 주요 기능:
 * - 게시물 목록 조회 및 검색
 * - 게시물 상세보기 (확장 패널)
 * - 게시물 숨기기/숨김해제
 * - 게시물 삭제
 * ============================================================================
 */

"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
    Search,
    RefreshCw,
    FileText,
    Eye,
    EyeOff,
    Trash2,
    ChevronDown,
    ChevronUp,
    Heart,
    MessageCircle,
    Image as ImageIcon,
} from "lucide-react";
import { PostRow } from "../types";
import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

// ============================================================================
// 카테고리 라벨
// ============================================================================

const CATEGORY_LABELS: Record<string, string> = {
    general: "자유게시판",
    tips: "꿀팁",
    qna: "질문",
    share: "자랑하기",
    healing: "치유게시판",
};

// ============================================================================
// Props
// ============================================================================

interface AdminPostsTabProps {
    posts: PostRow[];
    onRefresh: () => void;
    onUpdatePosts: React.Dispatch<React.SetStateAction<PostRow[]>>;
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function AdminPostsTab({
    posts,
    onRefresh,
    onUpdatePosts,
}: AdminPostsTabProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        confirmText: string;
        onConfirm: () => void;
    }>({ isOpen: false, title: "", message: "", confirmText: "", onConfirm: () => {} });

    // ========================================================================
    // 숨기기/숨김해제
    // ========================================================================
    const toggleHide = async (post: PostRow) => {
        const newHidden = !post.is_hidden;
        const action = newHidden ? "숨김" : "숨김해제";

        try {
            const res = await authFetch(API.ADMIN_POSTS, {
                method: "PATCH",
                body: JSON.stringify({ postId: post.id, isHidden: newHidden }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `${action} 실패`);
            }

            onUpdatePosts(prev =>
                prev.map(p => p.id === post.id ? { ...p, is_hidden: newHidden } : p)
            );
            toast.success(`게시물이 ${action} 처리되었습니다.`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : `${action}에 실패했습니다.`);
        }
    };

    // ========================================================================
    // 삭제
    // ========================================================================
    const deletePost = (post: PostRow) => {
        setConfirmState({
            isOpen: true,
            title: "게시물 삭제",
            message: `"${post.title}" 게시물을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
            confirmText: "삭제",
            onConfirm: async () => {
                try {
                    const res = await authFetch(API.ADMIN_POSTS, {
                        method: "DELETE",
                        body: JSON.stringify({ postId: post.id }),
                    });

                    if (!res.ok) {
                        const errData = await res.json().catch(() => ({}));
                        throw new Error(errData.error || "삭제 실패");
                    }

                    onUpdatePosts(prev => prev.filter(p => p.id !== post.id));
                    setExpandedPostId(null);
                    toast.success("게시물이 삭제되었습니다.");
                } catch (err) {
                    toast.error(err instanceof Error ? err.message : "삭제에 실패했습니다.");
                }
            },
        });
    };

    // ========================================================================
    // 필터링
    // ========================================================================
    const filteredPosts = posts.filter(p =>
        searchQuery === "" ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.author_email || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    // ========================================================================
    // 렌더링
    // ========================================================================
    return (
        <div className="space-y-4">
            {/* 검색 & 새로고침 */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="제목 또는 작성자로 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Button variant="outline" onClick={onRefresh}>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    새로고침
                </Button>
            </div>

            {/* 통계 */}
            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                <span>전체: {posts.length}개</span>
                <span>숨김: {posts.filter(p => p.is_hidden).length}개</span>
                {searchQuery && <span>검색 결과: {filteredPosts.length}개</span>}
            </div>

            {/* 게시물 목록 */}
            <Card>
                <CardContent className="pt-6">
                    {filteredPosts.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                            <p>{searchQuery ? "검색 결과가 없습니다" : "게시물이 없습니다"}</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredPosts.map((post) => {
                                const isExpanded = expandedPostId === post.id;
                                return (
                                    <div key={post.id}>
                                        {/* 게시물 카드 */}
                                        <button
                                            type="button"
                                            onClick={() => setExpandedPostId(isExpanded ? null : post.id)}
                                            className={`w-full text-left p-3 rounded-lg border transition-colors ${
                                                post.is_hidden
                                                    ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50"
                                                    : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
                                            } ${isExpanded ? "ring-2 ring-memento-300 dark:ring-memento-600" : "hover:bg-gray-100 dark:hover:bg-gray-600"}`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        {post.category && CATEGORY_LABELS[post.category] && (
                                                            <Badge variant="secondary" className="text-[9px] px-1 py-0">
                                                                {CATEGORY_LABELS[post.category]}
                                                            </Badge>
                                                        )}
                                                        {post.is_hidden && (
                                                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-[9px] px-1 py-0">
                                                                숨김
                                                            </Badge>
                                                        )}
                                                        <h4 className="font-medium text-sm text-gray-800 dark:text-gray-100 truncate">
                                                            {post.title}
                                                        </h4>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                                                        <span>{post.author_email}</span>
                                                        <span>{new Date(post.created_at).toLocaleDateString("ko-KR")}</span>
                                                        {(post.views ?? 0) > 0 && (
                                                            <span className="flex items-center gap-0.5">
                                                                <Eye className="w-3 h-3" />{post.views}
                                                            </span>
                                                        )}
                                                        {(post.likes_count ?? 0) > 0 && (
                                                            <span className="flex items-center gap-0.5">
                                                                <Heart className="w-3 h-3" />{post.likes_count}
                                                            </span>
                                                        )}
                                                        {(post.comments_count ?? 0) > 0 && (
                                                            <span className="flex items-center gap-0.5">
                                                                <MessageCircle className="w-3 h-3" />{post.comments_count}
                                                            </span>
                                                        )}
                                                        {post.image_urls && post.image_urls.length > 0 && (
                                                            <span className="flex items-center gap-0.5">
                                                                <ImageIcon className="w-3 h-3" />{post.image_urls.length}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {isExpanded ? (
                                                    <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                                                ) : (
                                                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                                                )}
                                            </div>
                                        </button>

                                        {/* 확장 상세 패널 */}
                                        {isExpanded && (
                                            <div className="mx-2 mb-2 p-3 bg-white dark:bg-gray-800 border border-t-0 border-gray-200 dark:border-gray-600 rounded-b-lg">
                                                {/* 본문 */}
                                                <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                                                    {post.content || "(내용 없음)"}
                                                </div>

                                                {/* 이미지 */}
                                                {post.image_urls && post.image_urls.length > 0 && (
                                                    <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                                                        {post.image_urls.map((url, idx) => (
                                                            <img
                                                                key={idx}
                                                                src={url}
                                                                alt={`이미지 ${idx + 1}`}
                                                                className="h-20 w-20 object-cover rounded-lg flex-shrink-0 border border-gray-200 dark:border-gray-600"
                                                            />
                                                        ))}
                                                    </div>
                                                )}

                                                {/* 액션 버튼 */}
                                                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => toggleHide(post)}
                                                        className="text-xs"
                                                    >
                                                        {post.is_hidden ? (
                                                            <><Eye className="w-3.5 h-3.5 mr-1" />숨김해제</>
                                                        ) : (
                                                            <><EyeOff className="w-3.5 h-3.5 mr-1" />숨기기</>
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => deletePost(post)}
                                                        className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5 mr-1" />삭제
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            <ConfirmDialog
                isOpen={confirmState.isOpen}
                onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmState.onConfirm}
                title={confirmState.title}
                message={confirmState.message}
                confirmText={confirmState.confirmText}
                destructive
            />
        </div>
    );
}
