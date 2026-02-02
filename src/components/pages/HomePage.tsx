/**
 * 메멘토애니 홈페이지
 * - 좋아요 버튼 실제 토글
 * - 카드 클릭 시 인스타그램 스타일 모달
 */

"use client";

/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useMemo, useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Heart,
    MessageCircle,
    TrendingUp,
    Users,
    MapPin,
    Stethoscope,
    ArrowRight,
    Zap,
    Crown,
    Cloud,
    X,
    Send,
    Bookmark,
    MoreHorizontal,
    Share2,
    PawPrint,
    Dog,
    Cat,
    Star,
    type LucideIcon,
} from "lucide-react";

import { TabType } from "@/types";
import { bestPosts, memorialCards } from "@/data/posts";
import { usePetImages } from "@/hooks/usePetImages";
import { useSmoothAutoScroll } from "@/hooks/useSmoothAutoScroll";
import { EmotionalTrueFocus } from "@/components/ui/TrueFocus";

interface HomePageProps {
    setSelectedTab: (tab: TabType) => void;
}

type LightboxItem = {
    title: string;
    subtitle?: string;
    meta?: string;
    src: string;
};

// 커뮤니티 포스트 타입
type CommunityPost = {
    id: number;
    title: string;
    content: string;
    author: string;
    badge: string;
    likes: number;
    comments: number;
    time: string;
    avatar?: string;
};

type SmoothAutoScrollReturn = {
    communityScrollRef: React.RefObject<HTMLDivElement>;
    adoptionScrollRef: React.RefObject<HTMLDivElement>;
    petcareScrollRef: React.RefObject<HTMLDivElement>;
    memorialScrollRef: React.RefObject<HTMLDivElement>;
    startAutoScroll?: (start?: boolean) => void | (() => void);
};

const safeStringSrc = (val: unknown): string | null => {
    if (typeof val === "string" && val.trim().length) return val;
    return null;
};

// 펫 타입에 따른 아이콘 반환
const getPetIcon = (petType: string): LucideIcon => {
    const lower = petType.toLowerCase();
    if (lower.includes("고양이") || lower.includes("냥") || lower.includes("cat")) return Cat;
    if (lower.includes("강아지") || lower.includes("개") || lower.includes("dog") ||
        lower.includes("리트리버") || lower.includes("말티즈") || lower.includes("푸들") ||
        lower.includes("테리어") || lower.includes("진돗개")) return Dog;
    return PawPrint; // 기본값
};

// 댓글 타입
type Comment = {
    id: number;
    author: string;
    content: string;
    time: string;
    likes: number;
};

/* ---------------- 인스타그램 스타일 포스트 모달 ---------------- */
function PostModal({
    post,
    isLiked,
    onToggleLike,
    onClose,
    comments,
    onAddComment,
}: {
    post: CommunityPost | null;
    isLiked: boolean;
    onToggleLike: () => void;
    onClose: () => void;
    comments: Comment[];
    onAddComment: (postId: number, content: string) => void;
}) {
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
            className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
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
                        >
                            <MoreHorizontal className="w-5 h-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full"
                            onClick={onClose}
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
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
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
                                >
                                    <Heart
                                        className={`w-7 h-7 transition-colors ${
                                            isLiked
                                                ? "fill-red-500 text-red-500"
                                                : "text-gray-700 dark:text-gray-300 hover:text-gray-500"
                                        }`}
                                    />
                                </button>
                                <button>
                                    <MessageCircle className="w-7 h-7 text-gray-700 dark:text-gray-300 hover:text-gray-500" />
                                </button>
                                <button>
                                    <Share2 className="w-7 h-7 text-gray-700 dark:text-gray-300 hover:text-gray-500" />
                                </button>
                            </div>
                            <button onClick={() => setIsSaved(!isSaved)}>
                                <Bookmark
                                    className={`w-7 h-7 transition-colors ${
                                        isSaved
                                            ? "fill-gray-900 dark:fill-gray-100 text-gray-900 dark:text-gray-100"
                                            : "text-gray-700 dark:text-gray-300 hover:text-gray-500"
                                    }`}
                                />
                            </button>
                        </div>

                        {/* 좋아요 수 */}
                        <p className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                            좋아요 {displayLikes.toLocaleString()}개
                        </p>

                        {/* 댓글 섹션 */}
                        <div className="space-y-3">
                            {/* 댓글 더보기 */}
                            {comments.length > 3 && !showAllComments && (
                                <button
                                    onClick={() => setShowAllComments(true)}
                                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                >
                                    댓글 {totalComments}개 모두 보기
                                </button>
                            )}

                            {/* 기존 댓글 표시 (목업) */}
                            {post.comments > 0 && comments.length === 0 && (
                                <button className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                                    댓글 {post.comments}개 모두 보기
                                </button>
                            )}

                            {/* 새로 추가된 댓글들 */}
                            {displayComments.map((c) => (
                                <div key={c.id} className="flex gap-3 group">
                                    <div className="w-8 h-8 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-white text-xs font-bold">
                                            {c.author.charAt(0)}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline gap-2">
                                            <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                                                {c.author}
                                            </span>
                                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                                {c.content}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-xs text-gray-500">
                                                {c.time}
                                            </span>
                                            <button className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-semibold">
                                                좋아요 {c.likes}개
                                            </button>
                                            <button className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-semibold">
                                                답글 달기
                                            </button>
                                        </div>
                                    </div>
                                    <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Heart className="w-4 h-4 text-gray-400 hover:text-red-500" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 댓글 입력 - 하단 고정 */}
                <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-200 dark:border-gray-800 flex-shrink-0 bg-white dark:bg-gray-900">
                    <div className="w-8 h-8 bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">나</span>
                    </div>
                    <input
                        type="text"
                        placeholder="댓글 달기..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 outline-none text-sm"
                    />
                    <button
                        onClick={handleSubmitComment}
                        className={`font-semibold text-sm transition-colors ${
                            comment.trim()
                                ? "text-[#05B2DC] hover:text-[#0891B2]"
                                : "text-blue-300 dark:text-[#0369A1] cursor-not-allowed"
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

/* ---------------- Lightbox (이미지용) ---------------- */
function Lightbox({
    item,
    onClose,
}: {
    item: LightboxItem | null;
    onClose: () => void;
}) {
    useEffect(() => {
        if (!item) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [item, onClose]);

    if (!item) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/70 dark:border-gray-800">
                    <div className="min-w-0">
                        <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {item.title}
                        </div>
                        {(item.subtitle || item.meta) && (
                            <div className="text-sm text-gray-600 dark:text-gray-300 truncate">
                                {[item.subtitle, item.meta]
                                    .filter(Boolean)
                                    .join(" · ")}
                            </div>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl"
                        onClick={onClose}
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>
                <div className="relative w-full bg-black">
                    <img
                        src={item.src}
                        alt={item.title}
                        className="w-full max-h-[70vh] object-contain"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                    />
                </div>
            </div>
        </div>
    );
}

/* ---------------- Tile Gallery ---------------- */
function TileGallery({
    items,
    onItemClick,
}: {
    items: LightboxItem[];
    onItemClick: (item: LightboxItem) => void;
}) {
    return (
        <div className="grid gap-4 sm:gap-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((it, idx) => (
                <button
                    key={`${it.title}-${idx}`}
                    onClick={() => onItemClick(it)}
                    className="group text-left"
                    type="button"
                >
                    <div className="rounded-2xl overflow-hidden bg-white/60 dark:bg-gray-800/60 border border-white/50 dark:border-gray-700/60 shadow-sm hover:shadow-lg transition-all">
                        <div className="relative aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 overflow-hidden">
                            <img
                                src={it.src}
                                alt={it.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                            />
                        </div>
                        <div className="p-3">
                            <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                                {it.title}
                            </div>
                            {(it.subtitle || it.meta) && (
                                <div className="text-sm text-gray-600 dark:text-gray-300 truncate">
                                    {[it.subtitle, it.meta]
                                        .filter(Boolean)
                                        .join(" · ")}
                                </div>
                            )}
                        </div>
                    </div>
                </button>
            ))}
        </div>
    );
}

/* ---------------- 메인 홈페이지 ---------------- */
export default function HomePage({ setSelectedTab }: HomePageProps) {
    const { petImages, adoptionImages } = usePetImages();
    const scroll = useSmoothAutoScroll() as unknown as SmoothAutoScrollReturn;

    const [showAdoptionTile, setShowAdoptionTile] = useState(true);
    const [lightboxItem, setLightboxItem] = useState<LightboxItem | null>(null);

    // 좋아요 상태 관리 (postId -> liked)
    const [likedPosts, setLikedPosts] = useState<Record<number, boolean>>({});

    // 댓글 상태 관리 (postId -> comments[])
    const [postComments, setPostComments] = useState<Record<number, Comment[]>>(
        {},
    );

    // 선택된 포스트 (모달용)
    const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(
        null,
    );

    // 커뮤니티 포스트 데이터 (id, content 추가)
    const communityPosts: CommunityPost[] = useMemo(() => {
        return bestPosts.community.map((post, idx) => ({
            id: idx + 1,
            title: post.title,
            content:
                post.badge === "인기"
                    ? "정말 많은 분들이 공감해주신 이야기예요. 반려동물과 함께하는 일상의 소소한 행복들을 나누고 싶었어요. 여러분도 비슷한 경험 있으시죠? 댓글로 여러분의 이야기도 들려주세요!"
                    : post.badge === "꿀팁"
                      ? "오랜 경험을 통해 알게 된 꿀팁을 공유합니다. 처음에는 저도 많이 헤맸는데, 이 방법을 알고 나서 정말 편해졌어요. 도움이 되셨으면 좋겠습니다!"
                      : "직접 경험해보고 작성하는 솔직한 후기입니다. 장단점을 모두 적었으니 참고해주세요. 궁금한 점 있으시면 댓글 남겨주세요!",
            author: post.author,
            badge: post.badge,
            likes: post.likes,
            comments: post.comments,
            time: "방금 전",
        }));
    }, []);

    const toggleLike = (postId: number) => {
        setLikedPosts((prev) => ({
            ...prev,
            [postId]: !prev[postId],
        }));
    };

    const addComment = (postId: number, content: string) => {
        const newComment: Comment = {
            id: Date.now(),
            author: "나",
            content,
            time: "방금 전",
            likes: 0,
        };
        setPostComments((prev) => ({
            ...prev,
            [postId]: [...(prev[postId] || []), newComment],
        }));
    };

    useEffect(() => {
        const cleanup = scroll.startAutoScroll?.(true);
        return typeof cleanup === "function" ? cleanup : undefined;
    }, [scroll]);

    const adoptionTileItems = useMemo<LightboxItem[]>(() => {
        return bestPosts.adoption
            .map((pet, index) => {
                const src = safeStringSrc(
                    (adoptionImages as unknown[] | undefined)?.[index],
                );
                if (!src) return null;
                return {
                    title: pet.title,
                    subtitle: `${pet.location} · ${pet.age}`,
                    meta: pet.badge,
                    src,
                };
            })
            .filter(Boolean) as LightboxItem[];
    }, [adoptionImages]);

    const memorialTileItems = useMemo<LightboxItem[]>(() => {
        return memorialCards
            .map((m) => {
                const src = safeStringSrc(
                    (petImages as Record<string, unknown>)[m.name],
                );
                if (!src) return null;
                return {
                    title: m.name,
                    subtitle: `${m.pet} · ${m.years}`,
                    meta: m.message,
                    src,
                };
            })
            .filter(Boolean) as LightboxItem[];
    }, [petImages]);

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* 배경 */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#F0F9FF] via-[#FAFCFF] to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-[#7DD3FC]/30 to-sky-200/30 dark:from-blue-800/20 dark:to-sky-800/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-gradient-to-r from-sky-200/30 to-[#BAE6FD]/30 dark:from-sky-800/20 dark:to-[#0369A1]/20 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            {/* 이미지 Lightbox */}
            <Lightbox
                item={lightboxItem}
                onClose={() => setLightboxItem(null)}
            />

            {/* 포스트 모달 */}
            <PostModal
                post={selectedPost}
                isLiked={
                    selectedPost ? likedPosts[selectedPost.id] || false : false
                }
                onToggleLike={() => selectedPost && toggleLike(selectedPost.id)}
                onClose={() => setSelectedPost(null)}
                comments={
                    selectedPost ? postComments[selectedPost.id] || [] : []
                }
                onAddComment={addComment}
            />

            <div className="relative z-10 space-y-16 pb-10">
                {/* HERO */}
                <section className="px-4 pt-8">
                    <div className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-lg border border-white/40 dark:border-gray-700/40 rounded-3xl p-8 md:p-12 shadow-2xl">
                        <div className="text-center space-y-6">
                            <h1 className="text-4xl md:text-6xl font-bold">
                                <EmotionalTrueFocus
                                    text="반려동물과의 시간을 기록해도 괜찮은 장소"
                                    variant="gentle"
                                    delay={250}
                                />
                            </h1>
                            <p className="text-xl md:text-2xl font-bold text-gray-700 dark:text-gray-200">
                                <EmotionalTrueFocus
                                    text="일상부터 기억까지, 시간이 쌓이고 의미가 바뀌는 기록 플랫폼"
                                    variant="warm"
                                    delay={1100}
                                    duration={0.6}
                                    staggerDelay={0.02}
                                />
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center pt-3 px-4 sm:px-0">
                                <Button
                                    size="lg"
                                    onClick={() => setSelectedTab("ai-chat")}
                                    className="w-full sm:w-auto bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] hover:from-[#0891B2] hover:to-sky-600 text-white border-0 rounded-xl px-8 py-3 min-h-[48px] shadow-lg hover:scale-105 active:scale-95 transition-all"
                                >
                                    AI 상담 시작하기
                                </Button>
                                <Button
                                    size="lg"
                                    variant="outline"
                                    onClick={() => setSelectedTab("community")}
                                    className="w-full sm:w-auto bg-white/50 dark:bg-gray-700/50 border-[#7DD3FC] dark:border-[#0891B2] text-[#0369A1] dark:text-blue-300 hover:bg-[#E0F7FF] dark:hover:bg-gray-600 rounded-xl px-8 py-3 min-h-[48px] active:scale-95 transition-all"
                                >
                                    서비스 둘러보기
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 인기 커뮤니티 */}
                <section className="space-y-6 px-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] rounded-xl flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                                    지금 인기 있는 이야기
                                </h2>
                                <p className="text-gray-600 dark:text-gray-300">
                                    커뮤니티에서 가장 사랑받는 글들
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            onClick={() => setSelectedTab("community")}
                            className="text-[#0891B2] dark:text-[#38BDF8] hover:bg-[#E0F7FF] dark:hover:bg-gray-700 rounded-xl"
                        >
                            더 많은 이야기{" "}
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>

                    <div
                        ref={scroll.communityScrollRef}
                        className="flex gap-4 overflow-x-auto pb-4 px-4 -mx-4 scrollbar-hide"
                    >
                        {communityPosts.map((post, idx) => {
                            const isLiked = likedPosts[post.id] || false;
                            const displayLikes = isLiked
                                ? post.likes + 1
                                : post.likes;
                            const addedComments =
                                postComments[post.id]?.length || 0;
                            const totalComments = post.comments + addedComments;

                            // 그라데이션 색상 배열
                            const gradients = [
                                "from-rose-500 to-orange-400",
                                "from-violet-500 to-purple-400",
                                "from-cyan-500 to-blue-400",
                                "from-emerald-500 to-teal-400",
                                "from-amber-500 to-yellow-400",
                            ];

                            return (
                                <Card
                                    key={post.id}
                                    onClick={() => setSelectedPost(post)}
                                    className="min-w-[280px] sm:min-w-72 flex-shrink-0 overflow-hidden rounded-2xl cursor-pointer group border-0 shadow-lg will-change-transform"
                                >
                                    {/* 상단 그라데이션 배너 */}
                                    <div className={`h-24 bg-gradient-to-br ${gradients[idx % gradients.length]} relative overflow-hidden`}>
                                        <div className="absolute inset-0 bg-black/10" />
                                        <div className="absolute top-3 left-3">
                                            <Badge
                                                className={`
                                                    bg-white/90 text-gray-800 font-semibold shadow-sm
                                                    ${post.badge === "인기" ? "text-rose-600" : ""}
                                                    ${post.badge === "꿀팁" ? "text-amber-600" : ""}
                                                    ${post.badge === "후기" ? "text-violet-600" : ""}
                                                `}
                                            >
                                                {post.badge === "인기" && (
                                                    <Crown className="w-3 h-3 mr-1 inline" />
                                                )}
                                                {post.badge === "꿀팁" && (
                                                    <Zap className="w-3 h-3 mr-1 inline" />
                                                )}
                                                {post.badge}
                                            </Badge>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="absolute top-2 right-2 text-white hover:text-red-300 hover:bg-white/20"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleLike(post.id);
                                            }}
                                        >
                                            <Heart
                                                className={`w-5 h-5 transition-all ${
                                                    isLiked
                                                        ? "fill-red-400 text-red-400 scale-110"
                                                        : ""
                                                }`}
                                            />
                                        </Button>
                                        {/* 데코 아이콘 */}
                                        <div className="absolute bottom-2 right-3 opacity-30">
                                            <PawPrint className="w-12 h-12 text-white" />
                                        </div>
                                    </div>

                                    <CardContent className="p-4 bg-white dark:bg-gray-800">
                                        <h3 className="font-bold text-gray-800 dark:text-white text-base mb-1 line-clamp-2 group-hover:text-[#05B2DC] transition-colors">
                                            {post.title}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                                            {post.author}님의 이야기
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Heart
                                                        className={`w-4 h-4 ${
                                                            isLiked
                                                                ? "fill-red-500 text-red-500"
                                                                : ""
                                                        }`}
                                                    />
                                                    {displayLikes}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <MessageCircle className="w-4 h-4" />
                                                    {totalComments}
                                                </span>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#05B2DC] group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </section>

                {/* 입양정보 */}
                <section className="space-y-6 px-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-[#38BDF8] to-[#05B2DC] rounded-xl flex items-center justify-center">
                                <Users className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                                    새로운 가족을 기다리고 있어요
                                </h2>
                                <p className="text-gray-600 dark:text-gray-300">
                                    따뜻한 손길을 기다리는 친구들
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            onClick={() => setSelectedTab("adoption")}
                            className="text-[#0891B2] dark:text-[#38BDF8] hover:bg-[#E0F7FF] dark:hover:bg-gray-700 rounded-xl"
                        >
                            전체 보기{" "}
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>

                    <div
                            ref={scroll.adoptionScrollRef}
                            className="flex gap-4 overflow-x-auto pb-4 px-4 -mx-4 scrollbar-hide"
                        >
                            {bestPosts.adoption.map((pet, i) => {
                                const src = safeStringSrc(
                                    (adoptionImages as unknown[] | undefined)?.[
                                        i
                                    ],
                                );
                                return (
                                    <Card
                                        key={i}
                                        className="min-w-[280px] sm:min-w-72 flex-shrink-0 bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm will-change-transform"
                                    >
                                        <CardHeader className="p-0">
                                            {src ? (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setLightboxItem({
                                                            title: pet.title,
                                                            subtitle: `${pet.location} · ${pet.age}`,
                                                            meta: pet.badge,
                                                            src,
                                                        })
                                                    }
                                                    className="w-full"
                                                >
                                                    <img
                                                        src={src}
                                                        alt={pet.title}
                                                        className="w-full h-48 object-cover"
                                                        loading="lazy"
                                                        referrerPolicy="no-referrer"
                                                    />
                                                </button>
                                            ) : (
                                                <div className="w-full h-48 bg-gradient-to-br from-[#E0F7FF] to-[#BAE6FD] dark:from-sky-900 dark:to-blue-900 flex items-center justify-center">
                                                    <Users className="w-16 h-16 text-sky-400 opacity-50" />
                                                </div>
                                            )}
                                        </CardHeader>
                                        <CardFooter className="flex-col items-start gap-2 p-4">
                                            <div className="flex justify-between items-start w-full">
                                                <Badge
                                                    variant="outline"
                                                    className="bg-[#E0F7FF] dark:bg-sky-900/50 border-sky-200 dark:border-[#0369A1] text-[#0369A1] dark:text-sky-300 rounded-lg"
                                                >
                                                    {pet.badge}
                                                </Badge>
                                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {pet.location}
                                                </span>
                                            </div>
                                            <CardTitle className="text-base text-gray-800 dark:text-gray-100">
                                                {pet.title}
                                            </CardTitle>
                                            <CardDescription className="text-gray-600 dark:text-gray-300">
                                                {pet.age}
                                            </CardDescription>
                                            <Button
                                                variant="outline"
                                                className="w-full mt-2 border-sky-200 dark:border-sky-600 text-[#0369A1] dark:text-sky-300 hover:bg-[#E0F7FF] dark:hover:bg-sky-900/50 rounded-xl min-h-[44px] active:scale-95 transition-transform"
                                            >
                                                만나러 가기
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                );
                            })}
                        </div>
                </section>

                {/* 케어 가이드 */}
                <section className="space-y-6 px-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] rounded-xl flex items-center justify-center">
                                <Stethoscope className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                                    전문가의 케어 가이드
                                </h2>
                                <p className="text-gray-600 dark:text-gray-300">
                                    건강하고 행복한 일상을 위한 맞춤 정보
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            onClick={() => setSelectedTab("magazine")}
                            className="text-[#0891B2] dark:text-[#38BDF8] hover:bg-[#E0F7FF] dark:hover:bg-gray-700 rounded-xl"
                        >
                            전체 가이드 <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>

                    <div
                        ref={scroll.petcareScrollRef}
                        className="flex gap-4 overflow-x-auto pb-4 px-4 -mx-4 scrollbar-hide"
                    >
                        {bestPosts.petcare.map((guide, i) => (
                            <Card
                                key={i}
                                className="min-w-[260px] sm:min-w-64 flex-shrink-0 bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm will-change-transform"
                            >
                                <CardHeader>
                                    <div className="w-full h-40 bg-gradient-to-br from-[#E0F7FF] to-[#E0F7FF] dark:from-blue-900 dark:to-sky-900 rounded-xl mb-3 flex items-center justify-center border border-[#BAE6FD] dark:border-[#0369A1]">
                                        <Stethoscope className="w-16 h-16 text-[#05B2DC] dark:text-[#38BDF8] opacity-70" />
                                    </div>
                                    <div className="flex justify-between items-start">
                                        <Badge
                                            variant="outline"
                                            className="bg-[#E0F7FF] dark:bg-blue-900/50 border-[#7DD3FC] dark:border-[#0369A1] text-[#0369A1] dark:text-blue-300 rounded-lg"
                                        >
                                            {guide.badge}
                                        </Badge>
                                        <Badge
                                            variant="secondary"
                                            className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg"
                                        >
                                            {guide.difficulty}
                                        </Badge>
                                    </div>
                                    <CardTitle className="text-sm leading-snug text-gray-800 dark:text-gray-100">
                                        {guide.title}
                                    </CardTitle>
                                    <CardDescription className="text-gray-600 dark:text-gray-300">
                                        {guide.category}
                                    </CardDescription>
                                </CardHeader>
                                <CardFooter>
                                    <Button
                                        variant="outline"
                                        className="w-full border-[#7DD3FC] dark:border-[#0891B2] text-[#0369A1] dark:text-blue-300 hover:bg-[#E0F7FF] dark:hover:bg-blue-900/50 rounded-xl min-h-[44px] active:scale-95 transition-transform"
                                    >
                                        가이드 보기
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </section>

                {/* 추모 */}
                <section className="space-y-6 px-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl flex items-center justify-center">
                                <Cloud className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-500 to-purple-500 dark:from-violet-400 dark:to-purple-400 bg-clip-text text-transparent">
                                    기억 속을 함께 걷는 친구들
                                </h2>
                                <p className="text-gray-600 dark:text-gray-300">
                                    영원히 마음속에 함께해요
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            onClick={() => setSelectedTab("community")}
                            className="text-violet-500 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-xl"
                        >
                            더 많은 이야기{" "}
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>

                    <div
                        ref={scroll.memorialScrollRef}
                        className="flex gap-4 overflow-x-auto pb-4 px-4 -mx-4 scrollbar-hide"
                    >
                        {memorialCards.map((m, i) => {
                            const src = safeStringSrc(
                                (petImages as Record<string, unknown>)[m.name],
                            );
                            return (
                                <Card
                                    key={i}
                                    className="min-w-[280px] sm:min-w-72 flex-shrink-0 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/30 border-violet-100 dark:border-violet-800/50 rounded-2xl overflow-hidden shadow-sm will-change-transform"
                                >
                                    <CardHeader className="p-0 relative">
                                        {src ? (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setLightboxItem({
                                                        title: m.name,
                                                        subtitle: `${m.pet} · ${m.years}`,
                                                        meta: m.message,
                                                        src,
                                                    })
                                                }
                                                className="w-full"
                                            >
                                                <img
                                                    src={src}
                                                    alt={m.name}
                                                    className="w-full h-48 object-cover"
                                                    loading="lazy"
                                                    referrerPolicy="no-referrer"
                                                />
                                            </button>
                                        ) : (
                                            <div className="w-full h-48 bg-gradient-to-br from-violet-200 to-purple-200 dark:from-violet-800 dark:to-purple-800 flex items-center justify-center">
                                                {(() => {
                                                    const PetIcon = getPetIcon(m.pet);
                                                    return <PetIcon className="w-16 h-16 text-violet-500/60" />;
                                                })()}
                                            </div>
                                        )}
                                        {/* 오버레이 그라데이션 */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                                        {/* 이름 태그 */}
                                        <div className="absolute bottom-3 left-3 flex items-center gap-2">
                                            <Badge className="bg-white/90 text-violet-700 font-medium">
                                                {m.pet}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <h4 className="font-bold text-gray-800 dark:text-white">
                                                    {m.name}
                                                </h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {m.years}
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">
                                            &ldquo;{m.message}&rdquo;
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Heart className="w-4 h-4 text-pink-400" />
                                                    {(i * 13 + 24) % 50 + 15}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <MessageCircle className="w-4 h-4" />
                                                    {(i * 7 + 5) % 20 + 3}
                                                </span>
                                            </div>
                                            <span className="text-xs text-violet-500">함께 기억해요</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </section>
            </div>
        </div>
    );
}
