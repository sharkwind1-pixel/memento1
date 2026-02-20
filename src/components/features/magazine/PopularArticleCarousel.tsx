/**
 * PopularArticleCarousel
 * 인기 기사 모바일 스와이프 캐러셀
 *
 * - 모바일: 가로 스와이프로 카드 1개씩 넘김 + 도트 인디케이터
 * - 데스크톱(md+): 기존 3열 그리드 유지
 */
"use client";

import { useState, useRef, useCallback } from "react";
import { useDrag } from "@use-gesture/react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Heart } from "lucide-react";
import {
    getBadgeStyle,
    getBadgeLabel,
    type MagazineArticle,
} from "@/data/magazineArticles";

interface PopularArticleCarouselProps {
    articles: MagazineArticle[];
    onSelect: (article: MagazineArticle) => void;
}

export default function PopularArticleCarousel({
    articles,
    onSelect,
}: PopularArticleCarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [offsetX, setOffsetX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const goTo = useCallback(
        (index: number) => {
            setCurrentIndex(Math.max(0, Math.min(index, articles.length - 1)));
        },
        [articles.length]
    );

    const bind = useDrag(
        ({ down, movement: [mx], velocity: [vx], direction: [dx], last }) => {
            if (down) {
                setIsDragging(true);
                setOffsetX(mx);
                return;
            }

            if (last) {
                setIsDragging(false);
                setOffsetX(0);

                const swipedLeft = mx < -60 || (vx > 0.5 && dx < 0);
                const swipedRight = mx > 60 || (vx > 0.5 && dx > 0);

                if (swipedLeft && currentIndex < articles.length - 1) {
                    goTo(currentIndex + 1);
                } else if (swipedRight && currentIndex > 0) {
                    goTo(currentIndex - 1);
                }
            }
        },
        {
            axis: "x",
            filterTaps: true,
            threshold: 10,
        }
    );

    /** 데스크톱 그리드 (md 이상) */
    const desktopGrid = (
        <div className="hidden md:grid gap-4 md:grid-cols-3">
            {articles.map((article, index) => (
                <ArticleCard
                    key={article.id}
                    article={article}
                    rank={index + 1}
                    onSelect={onSelect}
                />
            ))}
        </div>
    );

    /** 모바일 캐러셀 (md 미만) */
    const mobileCarousel = (
        <div className="md:hidden">
            <div
                ref={containerRef}
                {...bind()}
                className="overflow-hidden touch-pan-y"
            >
                <div
                    className={isDragging ? "" : "transition-transform duration-300 ease-out"}
                    style={{
                        display: "flex",
                        transform: `translateX(calc(-${currentIndex * 100}% + ${isDragging ? offsetX : 0}px))`,
                    }}
                >
                    {articles.map((article, index) => (
                        <div
                            key={article.id}
                            className="w-full flex-shrink-0 px-1"
                        >
                            <ArticleCard
                                article={article}
                                rank={index + 1}
                                onSelect={onSelect}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* 도트 인디케이터 */}
            {articles.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-3">
                    {articles.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => goTo(index)}
                            aria-label={`${index + 1}번 기사로 이동`}
                            className={`rounded-full transition-all ${
                                index === currentIndex
                                    ? "w-6 h-2 bg-emerald-500"
                                    : "w-2 h-2 bg-gray-300 dark:bg-gray-600"
                            }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <>
            {desktopGrid}
            {mobileCarousel}
        </>
    );
}

/** 인기 기사 카드 (공유 컴포넌트) */
function ArticleCard({
    article,
    rank,
    onSelect,
}: {
    article: MagazineArticle;
    rank: number;
    onSelect: (article: MagazineArticle) => void;
}) {
    return (
        <Card
            onClick={() => onSelect(article)}
            className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-white/50 dark:border-gray-700/50 hover:shadow-lg transition-all duration-300 rounded-2xl cursor-pointer overflow-hidden"
        >
            <div className="relative h-40">
                <Image
                    src={article.image}
                    alt={article.title}
                    fill
                    className="object-cover"
                />
                <div className="absolute top-2 left-2 flex items-center gap-2">
                    <Badge
                        className={`${getBadgeStyle(article.badge)} rounded-lg`}
                    >
                        {getBadgeLabel(article.badge)}
                    </Badge>
                    <Badge className="bg-black/50 text-white rounded-lg">
                        #{rank}
                    </Badge>
                </div>
            </div>
            <CardContent className="p-4">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 line-clamp-2 mb-2">
                    {article.title}
                </h3>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {article.views.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {article.likes}
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}
