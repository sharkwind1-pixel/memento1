/**
 * 메멘토애니 홈페이지
 * - 통계 카드(591만/24/7/무한) 제거됨
 * - open api 이미지(외부 URL)는 <img>로 렌더링
 * - "하늘나라 친구들" → "함께하는 순간들"
 * - 추모 관련 표현 순화
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
    ArrowRight,
    Zap,
    Crown,
    Camera,
    X,
    BookOpen,
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

type SmoothAutoScrollReturn = {
    communityScrollRef: React.RefObject<HTMLDivElement>;
    adoptionScrollRef: React.RefObject<HTMLDivElement>;
    petcareScrollRef: React.RefObject<HTMLDivElement>;
    memorialScrollRef: React.RefObject<HTMLDivElement>;
    startAutoScroll?: (start?: boolean) => void | (() => void);
};

const safeStringSrc = (v: unknown): string | null =>
    typeof v === "string" && v.trim().length ? v.trim() : null;

/* ---------------- Lightbox ---------------- */
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
            role="dialog"
            aria-modal="true"
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
                        aria-label="닫기"
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

/* ================= HomePage ================= */
export default function HomePage({ setSelectedTab }: HomePageProps) {
    const { petImages, adoptionImages } = usePetImages();
    const scroll = useSmoothAutoScroll() as unknown as SmoothAutoScrollReturn;

    const [lightboxItem, setLightboxItem] = useState<LightboxItem | null>(null);
    const [showAdoptionTile, setShowAdoptionTile] = useState(true);

    useEffect(() => {
        const cleanup = scroll.startAutoScroll?.(true);
        return typeof cleanup === "function" ? cleanup : undefined;
    }, [scroll]);

    // 입양 타일 아이템
    const adoptionTileItems = useMemo<LightboxItem[]>(() => {
        const imgs = Array.isArray(adoptionImages) ? adoptionImages : [];
        return bestPosts.adoption
            .map((pet, index) => {
                const src = safeStringSrc(imgs[index]);
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

    // 함께하는 순간들 타일 아이템 (구 추모)
    const momentsTileItems = useMemo<LightboxItem[]>(() => {
        const dict = (petImages ?? {}) as Record<string, unknown>;
        return memorialCards
            .map((m) => {
                const src = safeStringSrc(dict[m.name]);
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
            <div className="absolute inset-0 bg-gradient-to-br from-sky-100 via-blue-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-200/30 to-sky-200/30 dark:from-blue-800/20 dark:to-sky-800/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-violet-200/30 to-purple-200/30 dark:from-violet-800/20 dark:to-purple-800/20 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            <Lightbox
                item={lightboxItem}
                onClose={() => setLightboxItem(null)}
            />

            <div className="relative z-10 space-y-16 pb-8">
                {/* 히어로 */}
                <section className="pt-8">
                    <div className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-lg border border-white/40 dark:border-gray-700/40 rounded-3xl p-8 md:p-12 shadow-2xl mx-4">
                        <div className="text-center space-y-6">
                            <h1 className="text-4xl md:text-3xl font-bold">
                                <EmotionalTrueFocus
                                    text="반려동물과의 시간을 기록해도 괜찮은 장소"
                                    variant="gentle"
                                    delay={250}
                                    className="bg-gradient-to-r from-blue-600 via-sky-600 to-blue-800 dark:from-blue-400 dark:via-sky-400 dark:to-blue-300 bg-clip-text text-transparent"
                                />
                            </h1>

                            <p className="text-xl md:text-xl font-bold text-gray-700 dark:text-gray-200">
                                <EmotionalTrueFocus
                                    text="일상부터 기억까지, 시간이 쌓이고 의미가 바뀌는 기록 플랫폼"
                                    variant="warm"
                                    delay={1100}
                                    duration={0.6}
                                    staggerDelay={0.02}
                                />
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-3">
                                <Button
                                    size="lg"
                                    onClick={() => setSelectedTab("ai-chat")}
                                    className="bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 text-white border-0 rounded-xl px-8 py-3 shadow-lg hover:scale-105 transition-all"
                                >
                                    AI 상담 시작하기
                                </Button>
                                <Button
                                    size="lg"
                                    variant="outline"
                                    onClick={() => setSelectedTab("community")}
                                    className="bg-white/50 dark:bg-gray-700/50 border-blue-200 dark:border-blue-600 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-gray-600 rounded-xl px-8 py-3"
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
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-sky-500 rounded-xl flex items-center justify-center">
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
                            className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-xl"
                        >
                            더 많은 이야기{" "}
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>

                    <div
                        ref={scroll.communityScrollRef}
                        className="flex space-x-6 overflow-x-auto pb-4 scrollbar-hide"
                        style={{ scrollBehavior: "smooth" }}
                    >
                        {bestPosts.community.map((post, i) => (
                            <Card
                                key={i}
                                className="min-w-80 flex-shrink-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-white/50 dark:border-gray-700/50 hover:bg-white/80 dark:hover:bg-gray-700/60 transition-all duration-300 hover:scale-105 rounded-2xl"
                            >
                                <CardHeader className="space-y-3">
                                    <div className="flex justify-between items-start">
                                        <Badge
                                            variant="secondary"
                                            className={[
                                                post.badge === "인기"
                                                    ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                                                    : "",
                                                post.badge === "꿀팁"
                                                    ? "bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300"
                                                    : "",
                                                post.badge === "후기"
                                                    ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                                                    : "",
                                                "rounded-lg px-3 py-1",
                                            ].join(" ")}
                                        >
                                            {post.badge === "인기" && (
                                                <Crown className="w-3 h-3 mr-1 inline" />
                                            )}
                                            {post.badge === "꿀팁" && (
                                                <Zap className="w-3 h-3 mr-1 inline" />
                                            )}
                                            {post.badge}
                                        </Badge>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-gray-400 hover:text-blue-500"
                                        >
                                            <Heart className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <CardTitle className="text-lg text-gray-800 dark:text-gray-100">
                                        {post.title}
                                    </CardTitle>
                                    <CardDescription className="text-gray-600 dark:text-gray-300">
                                        {post.author}님의 이야기
                                    </CardDescription>
                                </CardHeader>
                                <CardFooter className="flex justify-between items-center pt-0">
                                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                                        <span className="flex items-center gap-1">
                                            <Heart className="w-4 h-4" />
                                            {post.likes}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <MessageCircle className="w-4 h-4" />
                                            {post.comments}
                                        </span>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="rounded-lg border-blue-200 dark:border-blue-600 text-blue-700 dark:text-blue-300"
                                    >
                                        읽어보기
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </section>

                {/* 입양정보 (타일) */}
                <section className="space-y-6 px-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-sky-500 to-blue-500 rounded-xl flex items-center justify-center">
                                <Users className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                                    새로운 가족을 기다리고 있어요
                                </h2>
                                <p className="text-gray-600 dark:text-gray-300">
                                    사랑이 필요한 친구들
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowAdoptionTile((v) => !v)}
                                className="rounded-xl border-blue-200 dark:border-blue-600 text-blue-700 dark:text-blue-300"
                            >
                                {showAdoptionTile ? "카드 보기" : "타일 보기"}
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => setSelectedTab("adoption")}
                                className="text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-gray-700 rounded-xl"
                            >
                                더 많은 친구들{" "}
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </div>

                    {showAdoptionTile ? (
                        <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-lg rounded-3xl p-4 border border-white/50 dark:border-gray-700/50">
                            {adoptionTileItems.length ? (
                                <TileGallery
                                    items={adoptionTileItems}
                                    onItemClick={(it) => setLightboxItem(it)}
                                />
                            ) : (
                                <div className="text-center text-gray-600 dark:text-gray-300 py-10">
                                    이미지 불러오는 중…
                                </div>
                            )}
                        </div>
                    ) : (
                        <div
                            ref={scroll.adoptionScrollRef}
                            className="flex space-x-6 overflow-x-auto pb-4 scrollbar-hide"
                            style={{ scrollBehavior: "smooth" }}
                        >
                            {bestPosts.adoption.map((pet, i) => {
                                const imgs = Array.isArray(adoptionImages)
                                    ? adoptionImages
                                    : [];
                                const src = safeStringSrc(imgs[i]);
                                return (
                                    <Card
                                        key={i}
                                        className="min-w-72 flex-shrink-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-white/50 dark:border-gray-700/50 hover:bg-white/80 dark:hover:bg-gray-700/60 transition-all duration-300 hover:scale-105 rounded-2xl overflow-hidden"
                                    >
                                        <CardHeader className="p-0">
                                            <div className="relative w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 overflow-hidden">
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
                                                        className="w-full h-full"
                                                    >
                                                        <img
                                                            src={src}
                                                            alt={pet.title}
                                                            className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                                                            loading="lazy"
                                                            referrerPolicy="no-referrer"
                                                        />
                                                    </button>
                                                ) : null}
                                                <div className="absolute top-3 left-3">
                                                    <Badge
                                                        variant={
                                                            pet.badge === "긴급"
                                                                ? "destructive"
                                                                : "default"
                                                        }
                                                        className={
                                                            pet.badge === "긴급"
                                                                ? "bg-red-500 text-white"
                                                                : "bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-200"
                                                        }
                                                    >
                                                        {pet.badge}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div className="p-6">
                                                <CardTitle className="text-lg text-gray-800 dark:text-gray-100 mb-2">
                                                    {pet.title}
                                                </CardTitle>
                                                <CardDescription className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                                    <MapPin className="w-4 h-4" />
                                                    {pet.location} · {pet.age}
                                                </CardDescription>
                                            </div>
                                        </CardHeader>
                                        <CardFooter className="px-6 pb-6 pt-0">
                                            <Button className="w-full bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 rounded-xl">
                                                자세히 알아보기
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* 펫매거진 */}
                <section className="space-y-6 px-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                                <BookOpen className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                                    펫매거진
                                </h2>
                                <p className="text-gray-600 dark:text-gray-300">
                                    건강하고 행복한 일상을 위한 정보
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            onClick={() => setSelectedTab("magazine")}
                            className="text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-gray-700 rounded-xl"
                        >
                            전체 보기 <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>

                    <div
                        ref={scroll.petcareScrollRef}
                        className="flex space-x-6 overflow-x-auto pb-4 scrollbar-hide"
                        style={{ scrollBehavior: "smooth" }}
                    >
                        {bestPosts.petcare.map((guide, i) => (
                            <Card
                                key={i}
                                className="min-w-64 flex-shrink-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-white/50 dark:border-gray-700/50 hover:bg-white/80 dark:hover:bg-gray-700/60 transition-all duration-300 hover:scale-105 rounded-2xl"
                            >
                                <CardHeader>
                                    <div className="w-full h-40 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900 dark:to-teal-900 rounded-xl mb-3 flex items-center justify-center border border-emerald-100 dark:border-emerald-700">
                                        <BookOpen className="w-16 h-16 text-emerald-500 dark:text-emerald-400 opacity-70" />
                                    </div>
                                    <div className="flex justify-between items-start">
                                        <Badge
                                            variant="outline"
                                            className="bg-emerald-50 dark:bg-emerald-900/50 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 rounded-lg"
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
                                        className="w-full border-emerald-200 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/50 rounded-xl"
                                    >
                                        읽어보기
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </section>

                {/* 함께하는 순간들 (구 추모 섹션) */}
                <section className="space-y-6 px-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl flex items-center justify-center">
                                <Camera className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 dark:from-violet-400 dark:to-purple-400 bg-clip-text text-transparent">
                                    함께하는 순간들
                                </h2>
                                <p className="text-gray-600 dark:text-gray-300">
                                    다른 친구들의 소중한 일상
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            onClick={() => setSelectedTab("record")}
                            className="text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-gray-700 rounded-xl"
                        >
                            앨범 보러가기{" "}
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>

                    <div className="bg-gradient-to-br from-violet-50/80 to-purple-50/80 dark:from-violet-900/30 dark:to-purple-900/30 backdrop-blur-lg rounded-3xl p-4 border border-white/50 dark:border-violet-700/50">
                        {momentsTileItems.length ? (
                            <TileGallery
                                items={momentsTileItems}
                                onItemClick={(it) => setLightboxItem(it)}
                            />
                        ) : (
                            <div className="text-center text-gray-600 dark:text-gray-300 py-10">
                                이미지 불러오는 중…
                            </div>
                        )}
                    </div>

                    <div
                        ref={scroll.memorialScrollRef}
                        className="flex space-x-6 overflow-x-auto pb-4 scrollbar-hide"
                        style={{ scrollBehavior: "smooth" }}
                    >
                        {memorialCards.map((m, i) => {
                            const src = safeStringSrc(
                                (petImages as Record<string, unknown>)[m.name],
                            );
                            return (
                                <Card
                                    key={i}
                                    className="min-w-72 flex-shrink-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-white/50 dark:border-gray-700/50 rounded-2xl overflow-hidden"
                                >
                                    <CardHeader className="p-0">
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
                                                    className="w-full h-56 object-cover"
                                                    loading="lazy"
                                                    referrerPolicy="no-referrer"
                                                />
                                            </button>
                                        ) : (
                                            <div className="w-full h-56 bg-gray-200 dark:bg-gray-700" />
                                        )}
                                    </CardHeader>

                                    <CardFooter className="p-6 flex-col items-start gap-2">
                                        <div className="font-semibold">
                                            {m.name}
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-300">
                                            {m.pet} · {m.years}
                                        </div>
                                        <Button
                                            variant="outline"
                                            className="w-full rounded-xl border-violet-200 dark:border-violet-600 text-violet-700 dark:text-violet-300"
                                            onClick={() =>
                                                setSelectedTab("record")
                                            }
                                        >
                                            기록 보러가기
                                        </Button>
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                </section>
            </div>
        </div>
    );
}
