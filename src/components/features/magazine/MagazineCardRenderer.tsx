/**
 * MagazineCardRenderer - 카드 타입별 렌더링 컴포넌트
 * CoverCard, SummaryCard, TextCard, ImageCard, QuoteCard, EndCard
 */
"use client";

import { useState, useEffect, useRef } from "react";
import DOMPurify from "dompurify";
import Image from "next/image";
import {
    ArrowLeft,
    User,
    Clock,
    Eye,
    Heart,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    BookOpen,
    Quote,
    Share2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    getBadgeStyle,
    getBadgeLabel,
    type MagazineArticle,
} from "@/data/magazineArticles";
import type { CardData } from "./magazineCardUtils";

// ──────────────────────────────────────────────
//  카드 렌더러 (타입별 분기)
// ──────────────────────────────────────────────

export function CardRenderer({
    card,
    article,
    cardIndex,
    totalCards,
    onBack,
    isLiked,
    displayLikes,
    displayViews,
    onLike,
    likeAnimating,
    goNext,
}: {
    card: CardData;
    article: MagazineArticle;
    cardIndex: number;
    totalCards: number;
    onBack: () => void;
    isLiked: boolean;
    displayLikes: number;
    displayViews: number;
    onLike: () => void;
    likeAnimating: boolean;
    goNext: () => void;
}) {
    // [B] 짝수/홀수 카드 배경색 교차
    const bgClass = cardIndex % 2 === 0
        ? "bg-white dark:bg-gray-900"
        : "bg-slate-50 dark:bg-gray-900/95";

    switch (card.type) {
        case "cover":
            return <CoverCard article={article} />;
        case "summary":
            return (
                <SummaryCard
                    article={article}
                    displayViews={displayViews}
                    displayLikes={displayLikes}
                    isLiked={isLiked}
                    onLike={onLike}
                    likeAnimating={likeAnimating}
                />
            );
        case "text":
            return (
                <TextCard
                    html={card.html || ""}
                    cardIndex={cardIndex}
                    totalCards={totalCards}
                    bgClass={bgClass}
                    goNext={goNext}
                />
            );
        case "image":
            return (
                <ImageCard
                    src={card.imageSrc || ""}
                    caption={card.caption}
                    cardIndex={cardIndex}
                    totalCards={totalCards}
                    bgClass={bgClass}
                />
            );
        case "quote":
            return (
                <QuoteCard
                    text={card.quoteText || ""}
                    cardIndex={cardIndex}
                    totalCards={totalCards}
                />
            );
        case "end":
            return (
                <EndCard
                    article={article}
                    onBack={onBack}
                    isLiked={isLiked}
                    displayLikes={displayLikes}
                    displayViews={displayViews}
                    onLike={onLike}
                    likeAnimating={likeAnimating}
                />
            );
        default:
            return null;
    }
}

// ──────────────────────────────────────────────
//  커버 카드
// ──────────────────────────────────────────────

function CoverCard({ article }: { article: MagazineArticle }) {
    return (
        <div className="h-full flex flex-col">
            {/* 이미지 영역: 모바일 45% / 데스크톱 50% — 텍스트 잘림 방지 */}
            <div className="relative w-full" style={{ height: "45%" }}>
                <Image
                    src={article.image}
                    alt={article.title}
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            </div>

            {/* 텍스트 영역: 하단 55% */}
            <div className="flex-1 flex flex-col justify-center px-6 py-6 sm:px-8 bg-white dark:bg-gray-900">
                {article.badge && (
                    <Badge
                        className={`${getBadgeStyle(article.badge)} rounded-lg text-sm px-3 py-1 mb-3 w-fit`}
                    >
                        {getBadgeLabel(article.badge)}
                    </Badge>
                )}

                <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-800 dark:text-gray-100 leading-tight mb-4">
                    {article.title}
                </h1>

                <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-800 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
                        </div>
                        <span className="font-medium text-gray-700 dark:text-gray-200">{article.author}</span>
                    </div>
                    <span className="text-gray-300 dark:text-gray-600">|</span>
                    <span>{article.date}</span>
                    <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {article.readTime}
                    </span>
                </div>

                <div className="mt-6 flex items-center justify-center gap-2 text-gray-400 dark:text-gray-500 text-xs animate-pulse">
                    <ChevronLeft className="w-4 h-4" />
                    <span className="sm:hidden">스와이프하여 읽기</span>
                    <span className="hidden sm:inline">화살표 버튼으로 읽기</span>
                    <ChevronRight className="w-4 h-4" />
                </div>
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────
//  요약 카드
// ──────────────────────────────────────────────

function SummaryCard({
    article,
    displayViews,
    displayLikes,
    isLiked,
    onLike,
    likeAnimating,
}: {
    article: MagazineArticle;
    displayViews: number;
    displayLikes: number;
    isLiked: boolean;
    onLike: () => void;
    likeAnimating: boolean;
}) {
    return (
        <div className="h-full flex flex-col justify-center px-6 py-16 sm:px-8 bg-slate-50 dark:bg-gray-900/95">
            {article.badge && (
                <Badge
                    className={`${getBadgeStyle(article.badge)} rounded-lg text-xs px-2.5 py-0.5 w-fit mb-4`}
                >
                    {getBadgeLabel(article.badge)}
                </Badge>
            )}

            <h2 className="text-2xl sm:text-3xl font-display font-bold text-gray-800 dark:text-gray-100 leading-tight mb-6">
                {article.title}
            </h2>

            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-800 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
                    </div>
                    <div>
                        <span className="font-medium text-gray-700 dark:text-gray-200">
                            {article.author}
                        </span>
                        {article.authorRole && (
                            <span className="block text-xs text-gray-400">
                                {article.authorRole}
                            </span>
                        )}
                    </div>
                </div>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <span>{article.date}</span>
                <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {article.readTime} 읽기
                </span>
                <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    {displayViews.toLocaleString()}
                </span>
                <button
                    onClick={onLike}
                    className="flex items-center gap-1 hover:text-red-500 transition-colors"
                >
                    <Heart
                        className={`w-3.5 h-3.5 transition-all duration-200 ${
                            isLiked ? "text-red-500 fill-red-500" : ""
                        } ${likeAnimating ? "scale-125" : "scale-100"}`}
                    />
                    {displayLikes}
                </button>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-5 mb-6">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {article.summary}
                </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-gray-400 dark:text-gray-500 text-xs mt-4">
                <span>본문 보기</span>
                <ChevronRight className="w-4 h-4" />
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────
//  텍스트 카드 (세로 스크롤 충돌 해결 포함)
// ──────────────────────────────────────────────

function TextCard({
    html,
    cardIndex,
    totalCards,
    bgClass,
    goNext,
}: {
    html: string;
    cardIndex: number;
    totalCards: number;
    bgClass: string;
    goNext: () => void;
}) {
    const contentRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [showNextButton, setShowNextButton] = useState(false);
    const [isAtBottom, setIsAtBottom] = useState(false);

    // [C] 세로 스크롤 충돌 해결: 카드 내용이 화면 높이를 초과하는지 감지
    useEffect(() => {
        const checkOverflow = () => {
            const container = scrollContainerRef.current;
            const content = contentRef.current;
            if (!container || !content) return;

            const isOverflowing = content.scrollHeight > container.clientHeight;
            setShowNextButton(isOverflowing);
        };

        checkOverflow();
        window.addEventListener("resize", checkOverflow);
        return () => window.removeEventListener("resize", checkOverflow);
    }, [html]);

    // 스크롤 하단 도달 감지
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const threshold = 40;
            const atBottom =
                container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
            setIsAtBottom(atBottom);
        };

        container.addEventListener("scroll", handleScroll, { passive: true });
        return () => container.removeEventListener("scroll", handleScroll);
    }, []);

    const isLastContent = cardIndex >= totalCards - 1;

    return (
        <div
            ref={scrollContainerRef}
            className={`h-full overflow-y-auto ${bgClass}`}
        >
            <div ref={contentRef} className="px-6 py-16 sm:px-10">
                {/* 카드 번호 */}
                <div className="text-xs text-gray-400 dark:text-gray-500 mb-4 text-right">
                    {cardIndex} / {totalCards - 1}
                </div>

                {/* [D] HTML 본문: strong 태그에 형광펜 효과 추가 */}
                <div
                    className="prose prose-lg prose-gray dark:prose-invert max-w-none
                        prose-headings:text-gray-800 dark:prose-headings:text-gray-100
                        prose-h2:text-2xl prose-h2:font-bold prose-h2:mt-0 prose-h2:mb-5
                        prose-h3:text-xl prose-h3:font-semibold prose-h3:mt-4 prose-h3:mb-3
                        prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed prose-p:text-base sm:prose-p:text-lg
                        prose-ul:text-gray-700 dark:prose-ul:text-gray-300
                        prose-ol:text-gray-700 dark:prose-ol:text-gray-300
                        prose-li:my-1
                        prose-strong:text-gray-800 dark:prose-strong:text-gray-100
                        prose-blockquote:border-emerald-300 prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400
                        prose-img:rounded-xl prose-img:my-4 prose-img:mx-auto prose-img:max-h-[400px] prose-img:object-contain
                        magazine-highlight-strong"
                    dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(html, {
                            ADD_TAGS: ["img"],
                            ADD_ATTR: ["src", "alt", "width", "height", "loading"],
                        })
                    }}
                />

                {/* [C] 긴 카드에서만 하단 "다음" 버튼 표시 */}
                {showNextButton && !isLastContent && (
                    <div className="mt-8 pb-4">
                        <button
                            onClick={goNext}
                            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                                isAtBottom
                                    ? "bg-memento-500 text-white shadow-md hover:bg-memento-600"
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
                            }`}
                        >
                            {isAtBottom ? (
                                <>
                                    다음 카드
                                    <ChevronRight className="w-4 h-4" />
                                </>
                            ) : (
                                <>
                                    <ChevronDown className="w-4 h-4" />
                                    아래로 스크롤
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────
//  이미지 카드
// ──────────────────────────────────────────────

function ImageCard({
    src,
    caption,
    cardIndex,
    totalCards,
    bgClass,
}: {
    src: string;
    caption?: string;
    cardIndex: number;
    totalCards: number;
    bgClass: string;
}) {
    return (
        <div className={`h-full flex flex-col ${bgClass}`}>
            {/* 카드 번호 */}
            <div className="text-xs text-gray-400 dark:text-gray-500 text-right px-6 pt-14">
                {cardIndex} / {totalCards - 1}
            </div>

            {/* 이미지 영역 */}
            <div className="flex-1 relative mx-4 my-4 rounded-2xl overflow-hidden">
                <Image
                    src={src}
                    alt={caption || "기사 이미지"}
                    fill
                    className="object-contain"
                />
            </div>

            {/* 캡션 */}
            {caption && (
                <div className="px-6 pb-20 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                        {caption}
                    </p>
                </div>
            )}
        </div>
    );
}

// ──────────────────────────────────────────────
//  인용 카드
// ──────────────────────────────────────────────

function QuoteCard({
    text,
    cardIndex,
    totalCards,
}: {
    text: string;
    cardIndex: number;
    totalCards: number;
}) {
    return (
        <div className="h-full flex flex-col justify-center px-6 py-16 sm:px-10 bg-memorial-50 dark:bg-memorial-900/15">
            {/* 카드 번호 */}
            <div className="text-xs text-memorial-500/60 mb-6 text-right">
                {cardIndex} / {totalCards - 1}
            </div>

            {/* 인용 아이콘 */}
            <div className="mb-6">
                <Quote className="w-10 h-10 text-memorial-400 dark:text-memorial-500" />
            </div>

            {/* 인용문 */}
            <p className="text-xl sm:text-2xl font-medium text-gray-800 dark:text-gray-100 leading-relaxed italic">
                {text}
            </p>
        </div>
    );
}

// ──────────────────────────────────────────────
//  엔딩 카드
// ──────────────────────────────────────────────

function EndCard({
    article,
    onBack,
    isLiked,
    displayLikes,
    displayViews,
    onLike,
    likeAnimating,
}: {
    article: MagazineArticle;
    onBack: () => void;
    isLiked: boolean;
    displayLikes: number;
    displayViews: number;
    onLike: () => void;
    likeAnimating: boolean;
}) {
    return (
        <div className="h-full flex flex-col items-center justify-center px-6 py-16 sm:px-8">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-800/30 rounded-full flex items-center justify-center mb-6">
                <BookOpen className="w-8 h-8 text-emerald-500" />
            </div>

            <p className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
                읽기 완료
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 text-center">
                {article.title}
            </p>

            {/* 조회수 / 좋아요 (클릭 가능) */}
            <div className="flex items-center gap-6 mb-6 text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5 text-sm">
                    <Eye className="w-4 h-4" />
                    {displayViews.toLocaleString()}
                </span>
                <button
                    onClick={onLike}
                    className="flex items-center gap-1.5 text-sm hover:text-red-500 transition-colors"
                >
                    <Heart
                        className={`w-4 h-4 transition-all duration-200 ${
                            isLiked ? "text-red-500 fill-red-500" : ""
                        } ${likeAnimating ? "scale-125" : "scale-100"}`}
                    />
                    {displayLikes}
                </button>
            </div>

            {article.tags.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mb-8">
                    {article.tags.map((tag) => (
                        <span
                            key={tag}
                            className="text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-full"
                        >
                            #{tag}
                        </span>
                    ))}
                </div>
            )}

            <div className="flex gap-3">
                <Button
                    onClick={onBack}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-6"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    목록으로
                </Button>
                <Button
                    variant="outline"
                    className="rounded-xl px-6 border-gray-300 dark:border-gray-600"
                    onClick={() => {
                        if (navigator.share) {
                            navigator.share({ title: article.title, text: article.summary });
                        } else {
                            navigator.clipboard.writeText(article.title);
                        }
                    }}
                >
                    <Share2 className="w-4 h-4 mr-2" />
                    공유
                </Button>
            </div>
        </div>
    );
}
