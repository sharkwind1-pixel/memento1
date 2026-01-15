/**
 * 메멘토애니 홈페이지 - 파란하늘 테마 + TrueFocus + DomeGallery
 * - 외부(크롤링) 이미지: <img>로 렌더링 (next/image host 제한 회피)
 * - 로컬 이미지/StaticImport만 next/image 사용 가능
 * - startAutoScroll이 함수가 아닐 때 런타임 크래시 방지
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import Image, { type StaticImageData } from "next/image";
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
} from "lucide-react";

import { TabType } from "@/types";
import { bestPosts, memorialCards } from "@/data/posts";
import { usePetImages } from "@/hooks/usePetImages";
import { useSmoothAutoScroll } from "@/hooks/useSmoothAutoScroll";
import { EmotionalTrueFocus } from "@/components/ui/TrueFocus";
import { DomeGallery } from "@/components/ui/DomeGallery";

interface HomePageProps {
    setSelectedTab: (tab: TabType) => void;
}

/** null/undefined/빈문자열 정리 */
function normalizeSrc(src: unknown): string | null {
    if (typeof src !== "string") return null;
    const s = src.trim();
    return s.length ? s : null;
}

/** 외부 URL인지 체크 */
function isRemoteUrl(src: string): boolean {
    try {
        const u = new URL(src);
        return u.protocol === "http:" || u.protocol === "https:";
    } catch {
        return false;
    }
}

/**
 * 크롤링된 외부 이미지는 next/image가 host 미설정이면 런타임에서 터짐.
 * 그래서:
 * - src가 http/https면 <img>
 * - 그 외(로컬 경로 "/..." 또는 StaticImport)는 next/image
 */
function SmartImage(props: {
    src: string | StaticImageData | null | undefined;
    alt: string;
    className?: string;
    fill?: boolean;
    width?: number;
    height?: number;
}) {
    const { src, alt, className, fill, width, height } = props;

    // StaticImport면 next/image OK
    if (src && typeof src !== "string") {
        if (fill)
            return <Image src={src} alt={alt} fill className={className} />;
        return (
            <Image
                src={src}
                alt={alt}
                width={width ?? 100}
                height={height ?? 100}
                className={className}
            />
        );
    }

    const s = normalizeSrc(src);

    // src 없으면 아무것도 안 그림 (너가 "회색박스 필요없다" 했으니)
    if (!s) return null;

    // 외부 URL이면 <img>
    if (isRemoteUrl(s)) {
        if (fill) {
            return (
                <img
                    src={s}
                    alt={alt}
                    className={className}
                    style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                    }}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                />
            );
        }
        return (
            <img
                src={s}
                alt={alt}
                className={className}
                width={width}
                height={height}
                loading="lazy"
                referrerPolicy="no-referrer"
            />
        );
    }

    // 로컬 경로면 next/image
    if (fill) return <Image src={s} alt={alt} fill className={className} />;
    return (
        <Image
            src={s}
            alt={alt}
            width={width ?? 100}
            height={height ?? 100}
            className={className}
        />
    );
}

export default function HomePage({ setSelectedTab }: HomePageProps) {
    const { petImages, adoptionImages } = usePetImages();

    const {
        communityScrollRef,
        adoptionScrollRef,
        petcareScrollRef,
        memorialScrollRef,
        startAutoScroll,
    } = useSmoothAutoScroll();

    const [showDomeGallery, setShowDomeGallery] = useState(false);

    // ✅ startAutoScroll이 함수가 아닐 때 크래시 방지
    useEffect(() => {
        if (typeof startAutoScroll !== "function") return;
        const cleanup = startAutoScroll(true);
        return typeof cleanup === "function" ? cleanup : undefined;
    }, [startAutoScroll]);

    // DomeGallery 아이템 생성
    const memorialDomeItems = useMemo(
        () =>
            memorialCards.map((card) => ({
                id: card.name,
                image: normalizeSrc(petImages?.[card.name]) ?? "", // DomeGallery가 빈 문자열 처리 가능해야 함
                title: card.name,
                subtitle: card.pet,
                onClick: () => setSelectedTab("memorial"),
            })),
        [petImages, setSelectedTab]
    );

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* 배경 */}
            <div className="absolute inset-0 bg-gradient-to-br from-sky-100 via-blue-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-200/30 to-sky-200/30 dark:from-blue-800/20 dark:to-sky-800/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-gradient-to-r from-sky-200/30 to-blue-100/30 dark:from-sky-800/20 dark:to-blue-700/20 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            <div className="relative z-10 space-y-16 pb-8">
                {/* 히어로 */}
                <div className="relative">
                    <div className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-lg border border-white/40 dark:border-gray-700/40 rounded-3xl p-8 md:p-12 shadow-2xl">
                        <div className="text-center space-y-6">
                            <h1 className="text-4xl md:text-6xl font-bold">
                                <EmotionalTrueFocus
                                    text="반려동물과의 시간을 기록해도 괜찮은 장소"
                                    variant="gentle"
                                    delay={300}
                                    className="bg-gradient-to-r from-blue-600 via-sky-600 to-blue-800 dark:from-blue-400 dark:via-sky-400 dark:to-blue-300 bg-clip-text text-transparent"
                                />
                            </h1>

                            <p className="text-xl md:text-2xl font-bold text-gray-700 dark:text-gray-200">
                                <EmotionalTrueFocus
                                    text="일상부터 기억까지, 시간이 쌓이고 의미가 바뀌는 기록 플랫폼"
                                    variant="warm"
                                    delay={1200}
                                    duration={0.6}
                                    staggerDelay={0.02}
                                />
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
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
                                    className="bg-white/50 dark:bg-gray-700/50 border-blue-200 dark:border-blue-600 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-gray-600 rounded-xl px-8 py-3"
                                >
                                    서비스 둘러보기
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </Button>
                            </div>

                            {/* 통계 */}
                            <div className="grid grid-cols-3 gap-4 mt-8 max-w-md mx-auto">
                                <div className="bg-white/40 dark:bg-gray-700/40 backdrop-blur-sm rounded-2xl p-4 border border-white/50 dark:border-gray-600/50">
                                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                        591만
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-300">
                                        반려동물 가구
                                    </div>
                                </div>
                                <div className="bg-white/40 dark:bg-gray-700/40 backdrop-blur-sm rounded-2xl p-4 border border-white/50 dark:border-gray-600/50">
                                    <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">
                                        24/7
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-300">
                                        AI 상담
                                    </div>
                                </div>
                                <div className="bg-white/40 dark:bg-gray-700/40 backdrop-blur-sm rounded-2xl p-4 border border-white/50 dark:border-gray-600/50">
                                    <div className="text-2xl font-bold text-blue-500 dark:text-blue-300">
                                        무한
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-300">
                                        소중한 추억
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 인기 커뮤니티 */}
                <section className="space-y-6">
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
                        ref={communityScrollRef}
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
                                            className={`
                        ${
                            post.badge === "인기"
                                ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                                : ""
                        }
                        ${
                            post.badge === "꿀팁"
                                ? "bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300"
                                : ""
                        }
                        ${
                            post.badge === "후기"
                                ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                                : ""
                        }
                        rounded-lg px-3 py-1
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

                {/* 입양정보 */}
                <section className="space-y-6">
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
                                onClick={() => setShowDomeGallery((v) => !v)}
                                className="rounded-xl border-blue-200 dark:border-blue-600 text-blue-700 dark:text-blue-300"
                            >
                                {showDomeGallery ? "카드 보기" : "3D 갤러리"}
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

                    {showDomeGallery ? (
                        <div className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-lg rounded-3xl p-4 border border-white/40 dark:border-gray-700/40">
                            <DomeGallery
                                items={bestPosts.adoption.map((pet, index) => ({
                                    id: index,
                                    image:
                                        normalizeSrc(adoptionImages?.[index]) ??
                                        "",
                                    title: pet.title.split(" ")[0],
                                    subtitle: `${pet.location} · ${pet.age}`,
                                    onClick: () => setSelectedTab("adoption"),
                                }))}
                                radius={250}
                                itemSize={100}
                                autoRotate={true}
                                rotateSpeed={0.2}
                            />
                        </div>
                    ) : (
                        <div
                            ref={adoptionScrollRef}
                            className="flex space-x-6 overflow-x-auto pb-4 scrollbar-hide"
                            style={{ scrollBehavior: "smooth" }}
                        >
                            {bestPosts.adoption.map((pet, i) => {
                                const src = normalizeSrc(adoptionImages?.[i]);
                                return (
                                    <Card
                                        key={i}
                                        className="min-w-72 flex-shrink-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-white/50 dark:border-gray-700/50 hover:bg-white/80 dark:hover:bg-gray-700/60 transition-all duration-300 hover:scale-105 rounded-2xl overflow-hidden"
                                    >
                                        <CardHeader className="p-0">
                                            <div className="relative w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 overflow-hidden">
                                                {src ? (
                                                    <SmartImage
                                                        src={src}
                                                        alt={pet.title}
                                                        fill
                                                        className="object-cover hover:scale-110 transition-transform duration-500"
                                                    />
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

                {/* 펫케어 */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-sky-600 rounded-xl flex items-center justify-center">
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
                            onClick={() => setSelectedTab("petcare")}
                            className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-xl"
                        >
                            전체 가이드 <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>

                    <div
                        ref={petcareScrollRef}
                        className="flex space-x-6 overflow-x-auto pb-4 scrollbar-hide"
                        style={{ scrollBehavior: "smooth" }}
                    >
                        {bestPosts.petcare.map((guide, i) => (
                            <Card
                                key={i}
                                className="min-w-64 flex-shrink-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-white/50 dark:border-gray-700/50 hover:bg-white/80 dark:hover:bg-gray-700/60 transition-all duration-300 hover:scale-105 rounded-2xl"
                            >
                                <CardHeader>
                                    <div className="w-full h-40 bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-900 dark:to-sky-900 rounded-xl mb-3 flex items-center justify-center border border-blue-100 dark:border-blue-700">
                                        <Stethoscope className="w-16 h-16 text-blue-500 dark:text-blue-400 opacity-70" />
                                    </div>

                                    <div className="flex justify-between items-start">
                                        <Badge
                                            variant="outline"
                                            className="bg-blue-50 dark:bg-blue-900/50 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-lg"
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
                                        className="w-full border-blue-200 dark:border-blue-600 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-xl"
                                    >
                                        가이드 보기
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </section>

                {/* 추모 */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-sky-600 rounded-xl flex items-center justify-center">
                                <Cloud className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-sky-600 dark:from-blue-400 dark:to-sky-400 bg-clip-text text-transparent">
                                    하늘나라 친구들
                                </h2>
                                <p className="text-gray-600 dark:text-gray-300">
                                    영원히 마음속에 남을 특별한 친구들
                                </p>
                            </div>
                        </div>

                        <Button
                            variant="ghost"
                            onClick={() => setSelectedTab("memorial")}
                            className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-xl"
                        >
                            추모공간 방문{" "}
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50/80 to-sky-50/80 dark:from-blue-900/30 dark:to-sky-900/30 backdrop-blur-lg rounded-3xl p-4 border border-white/50 dark:border-blue-700/50">
                        <DomeGallery
                            items={memorialDomeItems}
                            radius={280}
                            itemSize={110}
                            autoRotate={true}
                            rotateSpeed={0.15}
                        />
                    </div>

                    <div
                        ref={memorialScrollRef}
                        className="flex space-x-6 overflow-x-auto pb-4 scrollbar-hide"
                        style={{ scrollBehavior: "smooth" }}
                    >
                        {memorialCards.map((memorial, i) => {
                            const src = normalizeSrc(
                                petImages?.[memorial.name]
                            );
                            return (
                                <Card
                                    key={i}
                                    className="min-w-72 flex-shrink-0 bg-gradient-to-br from-blue-50/80 to-sky-50/80 dark:from-blue-900/40 dark:to-sky-900/40 backdrop-blur-lg border-white/60 dark:border-blue-700/50 hover:from-blue-100/80 hover:to-sky-100/80 transition-all duration-500 hover:scale-105 rounded-3xl"
                                >
                                    <CardHeader className="text-center space-y-4 p-6">
                                        <div className="w-24 h-24 mx-auto rounded-full overflow-hidden bg-gradient-to-br from-blue-200 to-sky-200 dark:from-blue-700 dark:to-sky-700 p-1 shadow-lg">
                                            <div className="w-full h-full rounded-full overflow-hidden bg-white/50 dark:bg-gray-800/50 relative">
                                                {src ? (
                                                    <SmartImage
                                                        src={src}
                                                        alt={memorial.name}
                                                        width={96}
                                                        height={96}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : null}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <CardTitle className="text-lg font-bold bg-gradient-to-r from-blue-700 to-sky-700 dark:from-blue-300 dark:to-sky-300 bg-clip-text text-transparent">
                                                {memorial.name}
                                            </CardTitle>
                                            <CardDescription className="text-blue-600 dark:text-blue-400 font-medium">
                                                {memorial.pet} ·{" "}
                                                {memorial.years}
                                            </CardDescription>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="text-center px-6 pb-6">
                                        <p className="text-sm text-blue-700 dark:text-blue-300 italic bg-white/30 dark:bg-gray-800/30 rounded-xl p-3">
                                            &quot;{memorial.message}&quot;
                                        </p>
                                    </CardContent>

                                    <CardFooter className="px-6 pb-6">
                                        <Button
                                            variant="outline"
                                            className="w-full bg-white/50 dark:bg-gray-700/50 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 rounded-xl"
                                        >
                                            추억 들여다보기
                                        </Button>
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                </section>

                {/* CTA */}
                <section>
                    <div className="bg-gradient-to-r from-blue-100/50 to-sky-100/50 dark:from-blue-900/30 dark:to-sky-900/30 backdrop-blur-lg border border-white/50 dark:border-blue-700/50 rounded-3xl p-8 text-center shadow-2xl">
                        <div className="space-y-6">
                            <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-sky-700 dark:from-blue-300 dark:to-sky-300 bg-clip-text text-transparent">
                                소중한 친구와의 추억을 기록하세요
                            </h3>
                            <p className="text-blue-600 dark:text-blue-300 max-w-2xl mx-auto">
                                AI와 함께 특별한 대화를 나누고, 아름다운 추억을
                                정리하며 소중히 보관할 수 있어요
                            </p>
                            <Button
                                size="lg"
                                onClick={() => setSelectedTab("memorial")}
                                className="bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 text-white border-0 rounded-xl px-8 py-3 shadow-lg hover:scale-105 transition-all"
                            >
                                <Cloud className="w-5 h-5 mr-2" />
                                시작하기
                            </Button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
