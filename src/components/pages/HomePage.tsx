/**
 * 메멘토애니 홈페이지
 * - 좋아요 버튼 실제 토글
 * - 카드 클릭 시 인스타그램 스타일 모달
 */

"use client";

/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useMemo, useState, useCallback } from "react";
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
    PawPrint,
    Dog,
    Cat,
    type LucideIcon,
} from "lucide-react";

import { TabType } from "@/types";
import { bestPosts, memorialCards } from "@/data/posts";
import { usePetImages } from "@/hooks/usePetImages";
import { useSmoothAutoScroll } from "@/hooks/useSmoothAutoScroll";
import { getPublicMemorialPosts, MemorialPost } from "@/lib/memorialService";
import { EmotionalTrueFocus } from "@/components/ui/TrueFocus";
import { TileGallery } from "@/components/features/home";
import type { LightboxItem, CommunityPost, Comment } from "@/components/features/home";
import PostModal from "@/components/features/home/PostModal";
import Lightbox from "@/components/features/home/Lightbox";
import LevelBadge from "@/components/features/points/LevelBadge";
import { useAuth } from "@/contexts/AuthContext";



interface HomePageProps {
    setSelectedTab: (tab: TabType) => void;
}

type SmoothAutoScrollReturn = {
    communityScrollRef: React.RefObject<HTMLDivElement>;
    adoptionScrollRef: React.RefObject<HTMLDivElement>;
    petcareScrollRef: React.RefObject<HTMLDivElement>;
    memorialScrollRef: React.RefObject<HTMLDivElement>;
    startAutoScroll?: (start?: boolean) => void | (() => void);
};

// 안전한 이미지 소스 변환
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

// 유저 타입별 개인화 메시지
const PERSONALIZED_HERO = {
    planning: {
        title: "새 가족을 만날 준비",
        subtitle: "입양부터 케어까지, 따뜻한 시작을 위한 모든 것",
        ctaLabel: "입양 정보 보기",
        ctaTab: "adoption" as TabType,
    },
    current: {
        title: "특별한 매일을 함께",
        subtitle: "일상부터 기억까지, 시간이 쌓이고 의미가 바뀌는 기록 플랫폼",
        ctaLabel: "AI 상담 시작하기",
        ctaTab: "ai-chat" as TabType,
    },
    memorial: {
        title: "영원히 마음속에",
        subtitle: "함께한 시간은 사라지지 않아요. 소중한 기억을 간직하는 공간",
        ctaLabel: "추모 공간 가기",
        ctaTab: "community" as TabType,
    },
};

export default function HomePage({ setSelectedTab }: HomePageProps) {
    const { petImages, adoptionImages } = usePetImages();
    const scroll = useSmoothAutoScroll() as unknown as SmoothAutoScrollReturn;
    const { onboardingData } = useAuth();

    const [lightboxItem, setLightboxItem] = useState<LightboxItem | null>(null);

    // 공개 추모글 상태 (DB에서 가져온 실제 데이터)
    const [publicMemorialPosts, setPublicMemorialPosts] = useState<MemorialPost[]>([]);
    const [isLoadingMemorial, setIsLoadingMemorial] = useState(true);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 공개 추모글 가져오기
    const fetchPublicMemorialPosts = useCallback(async () => {
        setIsLoadingMemorial(true);
        try {
            const posts = await getPublicMemorialPosts(10);
            setPublicMemorialPosts(posts);
        } catch {
            // 실패 시 빈 배열 유지 (목업 데이터로 폴백됨)
        } finally {
            setIsLoadingMemorial(false);
        }
    }, []);

    useEffect(() => {
        fetchPublicMemorialPosts();
    }, [fetchPublicMemorialPosts]);

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

    // 추모 섹션에 표시할 데이터 (DB 데이터 우선, 없으면 목업 폴백)
    const displayMemorialData = useMemo(() => {
        if (publicMemorialPosts.length > 0) {
            return publicMemorialPosts.map((post) => ({
                id: post.id,
                name: post.petName,
                pet: post.petType,
                years: post.petYears || "",
                message: post.title,
                content: post.content,
                image: post.petImage,
                likesCount: post.likesCount,
                commentsCount: post.commentsCount,
                isFromDB: true,
            }));
        }
        // 목업 데이터로 폴백
        return memorialCards.map((m, idx) => ({
            id: `mock-${idx}`,
            name: m.name,
            pet: m.pet,
            years: m.years,
            message: m.message,
            content: "",
            image: (petImages as Record<string, unknown>)[m.name] as string | undefined,
            likesCount: (idx * 13 + 24) % 50 + 15,
            commentsCount: (idx * 7 + 5) % 20 + 3,
            isFromDB: false,
        }));
    }, [publicMemorialPosts, petImages]);

    return (
        <div
            className="min-h-screen relative overflow-hidden"
            style={{ contain: 'layout style', transform: 'translateZ(0)' }}
        >
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
                {/* HERO - 유저 타입별 개인화 */}
                {(() => {
                    const userType = onboardingData?.userType;
                    const hero = userType ? PERSONALIZED_HERO[userType] : PERSONALIZED_HERO.current;
                    return (
                        <section className="px-4 pt-8">
                            <div className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-lg border border-white/40 dark:border-gray-700/40 rounded-3xl p-8 md:p-12 shadow-2xl">
                                <div className="text-center space-y-4 md:space-y-6">
                                    <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold leading-tight">
                                        <EmotionalTrueFocus
                                            text={hero.title}
                                            variant={userType === "memorial" ? "warm" : "gentle"}
                                            delay={250}
                                        />
                                    </h1>
                                    <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-700 dark:text-gray-200 leading-relaxed px-2">
                                        <EmotionalTrueFocus
                                            text={hero.subtitle}
                                            variant="warm"
                                            delay={1100}
                                            duration={0.6}
                                            staggerDelay={0.02}
                                        />
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center pt-3 px-4 sm:px-0">
                                        <Button
                                            size="lg"
                                            onClick={() => setSelectedTab(hero.ctaTab)}
                                            className="w-full sm:w-auto bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] hover:from-[#0891B2] hover:to-sky-600 text-white border-0 rounded-xl px-8 py-3 min-h-[48px] shadow-lg hover:scale-105 active:scale-95 transition-all"
                                        >
                                            {hero.ctaLabel}
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
                    );
                })()}

                {/* 인기 커뮤니티 */}
                <section className="space-y-6 px-4">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-3 min-w-0">
                            <div className="w-10 h-10 flex-shrink-0 bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] rounded-xl flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-white" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100 leading-tight">
                                    지금 인기 있는 이야기
                                </h2>
                                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 hidden sm:block">
                                    커뮤니티에서 가장 사랑받는 글들
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            onClick={() => setSelectedTab("community")}
                            className="text-[#0891B2] dark:text-[#38BDF8] hover:bg-[#E0F7FF] dark:hover:bg-gray-700 rounded-xl flex-shrink-0 px-2 sm:px-4"
                        >
                            <span className="hidden sm:inline">더 많은 이야기</span>
                            <span className="sm:hidden">더보기</span>
                            <ArrowRight className="w-4 h-4 ml-1 sm:ml-2" />
                        </Button>
                    </div>

                    <div
                        ref={scroll.communityScrollRef}
                        className="flex gap-4 overflow-x-auto pb-4 px-4 -mx-4 scrollbar-hide carousel-touch"
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
                                    className="min-w-[260px] sm:min-w-72 flex-shrink-0 overflow-hidden rounded-2xl cursor-pointer group border-0 shadow-lg will-change-transform"
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
                                            className="absolute top-2 right-2 text-white hover:text-red-300 hover:bg-white/20 min-w-[44px] min-h-[44px] p-2"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleLike(post.id);
                                            }}
                                        >
                                            <Heart
                                                className={`w-6 h-6 transition-all ${
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
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1.5">
                                            <LevelBadge
                                                points={[500, 10000, 3000, 100000, 30000][idx % 5]}
                                                size="lg"
                                                showTooltip={false}
                                            />
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
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-3 min-w-0">
                            <div className="w-10 h-10 flex-shrink-0 bg-gradient-to-r from-[#38BDF8] to-[#05B2DC] rounded-xl flex items-center justify-center">
                                <Users className="w-5 h-5 text-white" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100 leading-tight">
                                    새 가족을 기다려요
                                </h2>
                                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 hidden sm:block">
                                    따뜻한 손길을 기다리는 친구들
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            onClick={() => setSelectedTab("adoption")}
                            className="text-[#0891B2] dark:text-[#38BDF8] hover:bg-[#E0F7FF] dark:hover:bg-gray-700 rounded-xl flex-shrink-0 px-2 sm:px-4"
                        >
                            <span className="hidden sm:inline">전체 보기</span>
                            <span className="sm:hidden">더보기</span>
                            <ArrowRight className="w-4 h-4 ml-1 sm:ml-2" />
                        </Button>
                    </div>

                    <div
                            ref={scroll.adoptionScrollRef}
                            className="flex gap-4 overflow-x-auto pb-4 px-4 -mx-4 scrollbar-hide carousel-touch"
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
                                        className="min-w-[260px] sm:min-w-72 flex-shrink-0 bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm will-change-transform"
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
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-3 min-w-0">
                            <div className="w-10 h-10 flex-shrink-0 bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] rounded-xl flex items-center justify-center">
                                <Stethoscope className="w-5 h-5 text-white" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100 leading-tight">
                                    케어 가이드
                                </h2>
                                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 hidden sm:block">
                                    건강하고 행복한 일상을 위한 맞춤 정보
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            onClick={() => setSelectedTab("magazine")}
                            className="text-[#0891B2] dark:text-[#38BDF8] hover:bg-[#E0F7FF] dark:hover:bg-gray-700 rounded-xl flex-shrink-0 px-2 sm:px-4"
                        >
                            <span className="hidden sm:inline">전체 가이드</span>
                            <span className="sm:hidden">더보기</span>
                            <ArrowRight className="w-4 h-4 ml-1 sm:ml-2" />
                        </Button>
                    </div>

                    <div
                        ref={scroll.petcareScrollRef}
                        className="flex gap-4 overflow-x-auto pb-4 px-4 -mx-4 scrollbar-hide carousel-touch"
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
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-3 min-w-0">
                            <div className="w-10 h-10 flex-shrink-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                                <Cloud className="w-5 h-5 text-white" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent leading-tight">
                                    마음속에 영원히
                                </h2>
                                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 hidden sm:block">
                                    영원히 마음속에 함께해요
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            onClick={() => setSelectedTab("community")}
                            className="text-amber-500 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl flex-shrink-0 px-2 sm:px-4"
                        >
                            <span className="hidden sm:inline">더 많은 이야기</span>
                            <span className="sm:hidden">더보기</span>
                            <ArrowRight className="w-4 h-4 ml-1 sm:ml-2" />
                        </Button>
                    </div>

                    <div
                        ref={scroll.memorialScrollRef}
                        className="flex gap-4 overflow-x-auto pb-4 px-4 -mx-4 scrollbar-hide carousel-touch"
                    >
                        {isLoadingMemorial ? (
                            // 로딩 스켈레톤
                            Array.from({ length: 3 }).map((_, i) => (
                                <Card
                                    key={`skeleton-${i}`}
                                    className="min-w-[260px] sm:min-w-72 flex-shrink-0 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border-amber-100 dark:border-amber-800/50 rounded-2xl overflow-hidden shadow-sm animate-pulse"
                                >
                                    <div className="w-full h-48 bg-amber-200 dark:bg-amber-800" />
                                    <CardContent className="p-4">
                                        <div className="h-5 bg-amber-200 dark:bg-amber-700 rounded w-2/3 mb-2" />
                                        <div className="h-4 bg-amber-100 dark:bg-amber-800 rounded w-1/3 mb-3" />
                                        <div className="h-4 bg-amber-100 dark:bg-amber-800 rounded w-full" />
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            displayMemorialData.map((m, i) => {
                                const src = safeStringSrc(m.image);
                                return (
                                    <Card
                                        key={m.id}
                                        className="min-w-[260px] sm:min-w-72 flex-shrink-0 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border-amber-100 dark:border-amber-800/50 rounded-2xl overflow-hidden shadow-sm will-change-transform"
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
                                                <div className="w-full h-48 bg-gradient-to-br from-amber-200 to-orange-200 dark:from-amber-800 dark:to-orange-800 flex items-center justify-center">
                                                    {(() => {
                                                        const PetIcon = getPetIcon(m.pet);
                                                        return <PetIcon className="w-16 h-16 text-amber-500/60" />;
                                                    })()}
                                                </div>
                                            )}
                                            {/* 오버레이 그라데이션 */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                                            {/* 이름 태그 */}
                                            <div className="absolute bottom-3 left-3 flex items-center gap-2">
                                                <Badge className="bg-white/90 text-amber-700 font-medium">
                                                    {m.pet}
                                                </Badge>
                                                {m.isFromDB && (
                                                    <Badge className="bg-amber-500/90 text-white text-xs">
                                                        공개
                                                    </Badge>
                                                )}
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
                                                        {m.likesCount}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <MessageCircle className="w-4 h-4" />
                                                        {m.commentsCount}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-amber-500">함께 기억해요</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
