/**
 * ShowcaseGalleryView.tsx
 * "함께 보기" 전체화면 갤러리 뷰
 * 커뮤니티 페이지에서 PostDetailView와 동일한 패턴으로 동작
 * DB 게시글이 없으면 목업 데이터로 폴백
 * AI 생성 영상을 비디오 플레이어로 재생
 * 카드 클릭 시 PostDetailView로 이동하여 좋아요/댓글 상호작용 가능
 */

"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    ArrowLeft,
    Star,
    Heart,
    MessageCircle,
    PawPrint,
    Pen,
    Play,
    ArrowRight,
    MoreVertical,
    Trash2,
    EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { API } from "@/config/apiEndpoints";
import { MOCK_SHOWCASE_POSTS, formatTime } from "./communityTypes";
import PostDetailView from "./PostDetailView";
import { useAuth } from "@/contexts/AuthContext";
import { authFetch } from "@/lib/auth-fetch";
import type { ShowcasePost } from "@/components/features/home/types";

interface ShowcaseGalleryViewProps {
    onBack: () => void;
    onWriteClick: () => void;
}

export default function ShowcaseGalleryView({ onBack, onWriteClick }: ShowcaseGalleryViewProps) {
    const { user } = useAuth();
    const [posts, setPosts] = useState<ShowcasePost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

    const gradients = [
        "from-sky-400 to-blue-300",
        "from-pink-400 to-rose-300",
        "from-violet-400 to-purple-300",
        "from-emerald-400 to-teal-300",
        "from-amber-400 to-orange-300",
    ];

    const fetchPosts = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                board: "free",
                badge: "자랑",
                sort: "popular",
                limit: "20",
            });
            const res = await fetch(`${API.POSTS}?${params}`);
            if (res.ok) {
                const data = await res.json();
                if (data.posts?.length > 0) {
                    // 영상 있는 글 우선, 그 다음 이미지
                    const sorted = data.posts.sort((a: ShowcasePost, b: ShowcasePost) => {
                        const aHasVideo = a.videoUrl ? 2 : 0;
                        const bHasVideo = b.videoUrl ? 2 : 0;
                        const aHasImg = (a.imageUrls?.length ?? 0) > 0 ? 1 : 0;
                        const bHasImg = (b.imageUrls?.length ?? 0) > 0 ? 1 : 0;
                        return (bHasVideo + bHasImg) - (aHasVideo + aHasImg);
                    });
                    setPosts(sorted);
                } else {
                    setPosts(MOCK_SHOWCASE_POSTS);
                }
            } else {
                setPosts(MOCK_SHOWCASE_POSTS);
            }
        } catch {
            setPosts(MOCK_SHOWCASE_POSTS);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    // 카드에서 바로 삭제
    const handleDeletePost = async (postId: string) => {
        if (!confirm("정말 삭제하시겠습니까? 삭제하면 복구할 수 없습니다.")) return;
        try {
            const res = await authFetch(API.POST_DETAIL(postId), { method: "DELETE" });
            if (res.ok) {
                setPosts(prev => prev.filter(p => p.id !== postId));
            } else {
                alert("삭제에 실패했습니다");
            }
        } catch {
            alert("삭제에 실패했습니다");
        }
    };

    // 카드에서 바로 숨기기
    const handleHidePost = async (postId: string) => {
        if (!confirm("이 게시글을 숨기시겠어요? 다른 사람들에게 보이지 않게 됩니다.")) return;
        try {
            const res = await authFetch(API.POST_DETAIL(postId), {
                method: "PATCH",
                body: JSON.stringify({ isHidden: true }),
            });
            if (res.ok) {
                setPosts(prev => prev.filter(p => p.id !== postId));
            } else {
                alert("숨기기에 실패했습니다");
            }
        } catch {
            alert("숨기기에 실패했습니다");
        }
    };

    // 게시글 상세보기 모드
    if (selectedPostId) {
        return (
            <div
                className="min-h-screen relative overflow-hidden"
                style={{ contain: "layout style", transform: "translateZ(0)" }}
            >
                <PostDetailView
                    postId={selectedPostId}
                    subcategory="free"
                    onBack={() => setSelectedPostId(null)}
                    onPostDeleted={() => {
                        setSelectedPostId(null);
                        fetchPosts();
                    }}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* 배경 */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-orange-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-amber-300/20 to-orange-200/20 dark:from-amber-800/10 dark:to-orange-800/10 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 pb-8">
                {/* 헤더 */}
                <div className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-amber-100 dark:border-gray-700">
                    <div className="flex items-center gap-3 px-4 py-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onBack}
                            className="rounded-full hover:bg-amber-100 dark:hover:bg-gray-700 min-h-[44px] min-w-[44px]"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div className="flex items-center gap-2 flex-1">
                            <div className="w-8 h-8 bg-gradient-to-r from-amber-400 to-yellow-300 rounded-lg flex items-center justify-center">
                                <Star className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h1 className="font-bold text-gray-800 dark:text-white text-lg leading-tight">
                                    함께 보기
                                </h1>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    우리 아이들의 AI 영상 갤러리
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={onWriteClick}
                            className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl px-4 min-h-[44px] hover:from-amber-600 hover:to-orange-600 active:scale-95 transition-all"
                        >
                            <Pen className="w-4 h-4 mr-1.5" />
                            <span className="text-sm">글쓰기</span>
                        </Button>
                    </div>
                </div>

                {/* 갤러리 그리드 */}
                <div className="px-4 pt-4">
                    {isLoading ? (
                        <div className="grid grid-cols-2 gap-3">
                            {[...Array(6)].map((_, i) => (
                                <div
                                    key={i}
                                    className="aspect-[4/5] rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse"
                                />
                            ))}
                        </div>
                    ) : posts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
                                <PawPrint className="w-10 h-10 text-amber-400" />
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 font-medium mb-2">
                                아직 게시글이 없어요
                            </p>
                            <p className="text-gray-400 dark:text-gray-500 text-sm mb-4">
                                우리 아이의 AI 영상을 만들고 자랑해보세요
                            </p>
                            <Button
                                onClick={onWriteClick}
                                className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl"
                            >
                                첫 번째 글 작성하기
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            {posts.map((post, idx) => (
                                <ShowcaseCard
                                    key={post.id}
                                    post={post}
                                    gradientClass={gradients[idx % gradients.length]}
                                    currentUserId={user?.id}
                                    onSelect={() => {
                                        if (!post.id.startsWith("showcase-")) {
                                            setSelectedPostId(post.id);
                                        }
                                    }}
                                    onDelete={() => handleDeletePost(post.id)}
                                    onHide={() => handleHidePost(post.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/** 개별 카드 컴포넌트 (영상 호버 재생 지원 + 상세보기 이동) */
function ShowcaseCard({
    post,
    gradientClass,
    currentUserId,
    onSelect,
    onDelete,
    onHide,
}: {
    post: ShowcasePost;
    gradientClass: string;
    currentUserId?: string;
    onSelect: () => void;
    onDelete: () => void;
    onHide: () => void;
}) {
    const isOwner = currentUserId && post.userId === currentUserId;
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const hasImage = (post.imageUrls?.length ?? 0) > 0;
    const firstImage = hasImage ? post.imageUrls![0] : null;

    const handlePlay = () => {
        if (videoRef.current) {
            videoRef.current.play().catch(() => {});
            setIsPlaying(true);
        }
    };

    const handlePause = () => {
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
            setIsPlaying(false);
        }
    };

    return (
        <div
            className="group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer active:scale-[0.98]"
            onClick={onSelect}
            onMouseEnter={post.videoUrl ? handlePlay : undefined}
            onMouseLeave={post.videoUrl ? handlePause : undefined}
        >
            {/* 미디어 영역 */}
            <div className="aspect-[4/3] relative overflow-hidden">
                {post.videoUrl ? (
                    <>
                        <video
                            ref={videoRef}
                            src={post.videoUrl}
                            poster={firstImage || undefined}
                            muted
                            playsInline
                            loop
                            className="w-full h-full object-cover pointer-events-none"
                        />
                        {/* 재생 아이콘 (장식용 - 호버 시 자동재생, 클릭은 상세보기) */}
                        {!isPlaying && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                                <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                                    <Play className="w-6 h-6 text-amber-600 ml-0.5" />
                                </div>
                            </div>
                        )}
                        {/* AI 영상 뱃지 */}
                        <div className="absolute top-2 left-2 bg-amber-500/90 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            AI 영상
                        </div>
                    </>
                ) : firstImage ? (
                    <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={firstImage}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    </>
                ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${gradientClass} flex items-center justify-center`}>
                        <PawPrint className="w-12 h-12 text-white/30" />
                    </div>
                )}
            </div>

            {/* 본인 글 더보기 메뉴 (삭제/숨기기) */}
            {isOwner && (
                <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors"
                                aria-label="더보기"
                            >
                                <MoreVertical className="w-4 h-4 text-white" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[120px]">
                            <DropdownMenuItem onClick={onHide} className="text-amber-600">
                                <EyeOff className="w-4 h-4 mr-2" />
                                숨기기
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={onDelete} className="text-red-500">
                                <Trash2 className="w-4 h-4 mr-2" />
                                삭제
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )}

            {/* 텍스트 영역 */}
            <div className="p-3">
                <h3 className="font-bold text-sm text-gray-800 dark:text-white line-clamp-2 mb-1 group-hover:text-amber-600 transition-colors">
                    {post.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 truncate">
                    {post.authorName} · {formatTime(post.createdAt)}
                </p>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                        <span className="flex items-center gap-1">
                            <Heart className="w-3.5 h-3.5" />
                            {post.likes}
                        </span>
                        <span className="flex items-center gap-1">
                            <MessageCircle className="w-3.5 h-3.5" />
                            {post.comments}
                        </span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 group-hover:text-amber-400 transition-colors" />
                </div>
            </div>
        </div>
    );
}
