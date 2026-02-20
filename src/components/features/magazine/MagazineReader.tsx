/**
 * MagazineReader - 인스타그램 카드뉴스 스타일 매거진 리더
 * 좌우 스와이프로 카드를 넘기며 읽는 풀스크린 리더
 *
 * 카드 구성:
 * 1. 커버 (히어로 이미지 + 제목 + 배지)
 * 2. 요약 (메타정보 + 요약 박스)
 * 3~N. 본문 카드 (텍스트 / 이미지 / 인용문)
 * N+1. 엔딩 (태그 + 목록 복귀)
 */
"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useDrag } from "@use-gesture/react";
import Image from "next/image";
import {
    ArrowLeft,
    User,
    Clock,
    Eye,
    Heart,
    ChevronLeft,
    ChevronRight,
    BookOpen,
    Quote,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    getBadgeStyle,
    getBadgeLabel,
    type MagazineArticle,
} from "@/data/magazineArticles";

interface MagazineReaderProps {
    article: MagazineArticle;
    onBack: () => void;
}

// ──────────────────────────────────────────────
//  카드 타입 & 데이터
// ──────────────────────────────────────────────

type CardType = "cover" | "summary" | "text" | "image" | "quote" | "end";

interface CardData {
    type: CardType;
    /** 텍스트 카드: HTML 본문 */
    html?: string;
    /** 이미지 카드: 이미지 URL */
    imageSrc?: string;
    /** 이미지 카드: 캡션 */
    caption?: string;
    /** 인용 카드: 인용문 텍스트 */
    quoteText?: string;
}

/** 텍스트 카드 1장에 들어갈 최대 블록 수 */
const MAX_BLOCKS_PER_CARD = 3;

// ──────────────────────────────────────────────
//  HTML 콘텐츠를 카드 단위로 분할
// ──────────────────────────────────────────────

/** plain text를 HTML로 변환 (기존 콘텐츠 호환) */
function toHtml(content: string): string {
    if (/<[a-z][\s\S]*>/i.test(content)) return content;
    return content
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => `<p>${line}</p>`)
        .join("");
}

/**
 * HTML 콘텐츠를 카드 단위로 분할
 *
 * 분할 규칙:
 * 1. <hr> → 명시적 카드 경계
 * 2. <h2> → 새 카드 시작
 * 3. <img> → 독립 이미지 카드 (다음 <p>가 짧으면 캡션으로 병합)
 * 4. <blockquote> → 독립 인용 카드
 * 5. 연속 블록 → MAX_BLOCKS_PER_CARD개씩 텍스트 카드
 */
function splitContentIntoCards(html: string, respectBoundaries = false): CardData[] {
    // 1단계: <hr> 기준 분할
    const hrParts = html.split(/<hr\s*\/?>/i).filter((p) => p.trim());
    const cards: CardData[] = [];

    for (const hrPart of hrParts) {
        // 블록 요소 단위로 분리
        const blockPattern = /(?=<(?:p|ul|ol|h2|h3|blockquote|img|figure)[\s>])/i;
        const blocks = hrPart.split(blockPattern).filter((b) => b.trim());

        let textBuffer: string[] = [];

        const flushTextBuffer = () => {
            if (textBuffer.length === 0) return;
            cards.push({ type: "text", html: textBuffer.join("") });
            textBuffer = [];
        };

        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i].trim();

            // <img> → 이미지 카드
            const imgMatch = block.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
            if (imgMatch) {
                flushTextBuffer();
                // 다음 블록이 짧은 <p>면 캡션으로 사용
                let caption: string | undefined;
                const nextBlock = blocks[i + 1]?.trim();
                if (nextBlock) {
                    const pMatch = nextBlock.match(/^<p[^>]*>([\s\S]*?)<\/p>$/i);
                    const pText = pMatch ? pMatch[1].replace(/<[^>]*>/g, "").trim() : "";
                    if (pMatch && pText.length < 80) {
                        caption = pText;
                        i++; // 캡션으로 소비
                    }
                }
                cards.push({ type: "image", imageSrc: imgMatch[1], caption });
                continue;
            }

            // <blockquote> → 인용 카드
            if (/^<blockquote/i.test(block)) {
                flushTextBuffer();
                const quoteText = block
                    .replace(/<\/?blockquote[^>]*>/gi, "")
                    .replace(/<\/?p[^>]*>/gi, "")
                    .replace(/<[^>]*>/g, "")
                    .trim();
                cards.push({ type: "quote", quoteText });
                continue;
            }

            // <h2> → 새 카드 시작
            if (/^<h2/i.test(block)) {
                flushTextBuffer();
                textBuffer.push(block);
                continue;
            }

            // 일반 블록 → 텍스트 버퍼에 추가
            textBuffer.push(block);

            // MAX_BLOCKS_PER_CARD 도달 시 flush (작성자가 경계를 지정한 경우 건너뜀)
            if (!respectBoundaries && textBuffer.length >= MAX_BLOCKS_PER_CARD) {
                flushTextBuffer();
            }
        }

        flushTextBuffer();
    }

    return cards;
}

/** 기사를 카드 배열로 변환 */
function buildCards(article: MagazineArticle): CardData[] {
    const cards: CardData[] = [];

    // 1. 커버 카드
    cards.push({ type: "cover" });

    // 2. 요약 카드
    cards.push({ type: "summary" });

    // 3~N. 본문 카드
    if (article.content) {
        const html = toHtml(article.content);
        // <hr>가 있으면 작성자가 카드 경계를 직접 지정한 것이므로 자동 분할 비활성화
        const hasExplicitDelimiters = /<hr\s*\/?>/i.test(html);
        const contentCards = splitContentIntoCards(html, hasExplicitDelimiters);
        cards.push(...contentCards);
    }

    // N+1. 엔딩 카드
    cards.push({ type: "end" });

    return cards;
}

// ──────────────────────────────────────────────
//  MagazineReader 메인 컴포넌트
// ──────────────────────────────────────────────

export default function MagazineReader({ article, onBack }: MagazineReaderProps) {
    const [currentCard, setCurrentCard] = useState(0);
    const [offsetX, setOffsetX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const cards = useMemo(() => buildCards(article), [article]);
    const totalCards = cards.length;

    // 터치 디바이스 감지 (모바일에서만 스와이프 활성화)
    useEffect(() => {
        const checkTouch = () => {
            setIsTouchDevice(
                "ontouchstart" in window || navigator.maxTouchPoints > 0
            );
        };
        checkTouch();
    }, []);

    // 카드 이동
    const goToCard = useCallback(
        (idx: number) => {
            setCurrentCard(Math.max(0, Math.min(idx, totalCards - 1)));
        },
        [totalCards]
    );

    const goNext = useCallback(
        () => goToCard(currentCard + 1),
        [currentCard, goToCard]
    );
    const goPrev = useCallback(
        () => goToCard(currentCard - 1),
        [currentCard, goToCard]
    );

    // 키보드 네비게이션
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight") goNext();
            else if (e.key === "ArrowLeft") goPrev();
            else if (e.key === "Escape") onBack();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [goNext, goPrev, onBack]);

    // 제스처 핸들링 (터치 디바이스에서만 스와이프 동작)
    const bind = useDrag(
        ({ down, movement: [mx], velocity: [vx], direction: [dx], last }) => {
            // 데스크톱(마우스)에서는 스와이프 무시
            if (!isTouchDevice) return;

            if (down) {
                setIsDragging(true);
                const atStart = currentCard === 0 && mx > 0;
                const atEnd = currentCard === totalCards - 1 && mx < 0;
                setOffsetX(atStart || atEnd ? mx * 0.3 : mx);
            }

            if (last) {
                const THRESHOLD = 50;
                const VELOCITY_THRESHOLD = 0.3;

                if (mx < -THRESHOLD || (vx > VELOCITY_THRESHOLD && dx < 0)) {
                    goNext();
                } else if (mx > THRESHOLD || (vx > VELOCITY_THRESHOLD && dx > 0)) {
                    goPrev();
                }

                setOffsetX(0);
                requestAnimationFrame(() => setIsDragging(false));
            }
        },
        {
            axis: "x",
            filterTaps: true,
            threshold: 5,
        }
    );

    // 가상화: 현재 +/- 1 카드만 렌더
    const visibleRange = useMemo(() => ({
        start: Math.max(0, currentCard - 1),
        end: Math.min(totalCards - 1, currentCard + 1),
    }), [currentCard, totalCards]);

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 z-50 bg-white dark:bg-gray-900 overflow-hidden"
        >
            {/* 뒤로가기 */}
            <button
                onClick={onBack}
                className="fixed top-4 left-4 z-[60] bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-white dark:hover:bg-gray-700 transition-colors"
                aria-label="목록으로"
            >
                <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-200" />
            </button>

            {/* 카드 컨테이너 */}
            <div
                {...bind()}
                className={`flex h-full ${isDragging ? "magazine-page-container dragging" : "magazine-page-container"}`}
                style={{
                    width: `${totalCards * 100}%`,
                    transform: `translateX(calc(-${(currentCard * 100) / totalCards}% + ${offsetX}px))`,
                    touchAction: "pan-y pinch-zoom",
                }}
            >
                {cards.map((card, index) => {
                    const isVisible = index >= visibleRange.start && index <= visibleRange.end;
                    return (
                        <div
                            key={index}
                            className="h-full overflow-y-auto"
                            style={{ width: `${100 / totalCards}%` }}
                        >
                            {isVisible && (
                                <div className="h-full flex items-center justify-center">
                                    <div className="w-full max-w-2xl mx-auto h-full">
                                        <CardRenderer
                                            card={card}
                                            article={article}
                                            cardIndex={index}
                                            totalCards={totalCards}
                                            onBack={onBack}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* 데스크톱 좌우 화살표 (모바일에서는 숨김) */}
            {currentCard > 0 && (
                <button
                    onClick={goPrev}
                    className="fixed left-3 top-1/2 -translate-y-1/2 z-[60] bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full p-3 shadow-lg hover:bg-white dark:hover:bg-gray-700 hover:scale-110 transition-all hidden sm:flex items-center justify-center"
                    aria-label="이전 카드"
                >
                    <ChevronLeft className="w-6 h-6 text-gray-700 dark:text-gray-200" />
                </button>
            )}
            {currentCard < totalCards - 1 && (
                <button
                    onClick={goNext}
                    className="fixed right-3 top-1/2 -translate-y-1/2 z-[60] bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full p-3 shadow-lg hover:bg-white dark:hover:bg-gray-700 hover:scale-110 transition-all hidden sm:flex items-center justify-center"
                    aria-label="다음 카드"
                >
                    <ChevronRight className="w-6 h-6 text-gray-700 dark:text-gray-200" />
                </button>
            )}

            {/* 카드 인디케이터 */}
            <CardIndicator
                current={currentCard}
                total={totalCards}
                onCardClick={goToCard}
            />
        </div>
    );
}

// ──────────────────────────────────────────────
//  카드 렌더러 (타입별 분기)
// ──────────────────────────────────────────────

function CardRenderer({
    card,
    article,
    cardIndex,
    totalCards,
    onBack,
}: {
    card: CardData;
    article: MagazineArticle;
    cardIndex: number;
    totalCards: number;
    onBack: () => void;
}) {
    switch (card.type) {
        case "cover":
            return <CoverCard article={article} />;
        case "summary":
            return <SummaryCard article={article} />;
        case "text":
            return (
                <TextCard
                    html={card.html || ""}
                    cardIndex={cardIndex}
                    totalCards={totalCards}
                />
            );
        case "image":
            return (
                <ImageCard
                    src={card.imageSrc || ""}
                    caption={card.caption}
                    cardIndex={cardIndex}
                    totalCards={totalCards}
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
            return <EndCard article={article} onBack={onBack} />;
        default:
            return null;
    }
}

// ──────────────────────────────────────────────
//  커버 카드
// ──────────────────────────────────────────────

function CoverCard({ article }: { article: MagazineArticle }) {
    return (
        <div className="relative h-full flex flex-col justify-end">
            <div className="absolute inset-0">
                <Image
                    src={article.image}
                    alt={article.title}
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
            </div>

            <div className="relative z-10 p-6 pb-20 sm:p-8 sm:pb-24">
                {article.badge && (
                    <Badge
                        className={`${getBadgeStyle(article.badge)} rounded-lg text-sm px-3 py-1 mb-4`}
                    >
                        {getBadgeLabel(article.badge)}
                    </Badge>
                )}

                <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
                    {article.title}
                </h1>

                <div className="flex items-center gap-3 text-white/80 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-medium">{article.author}</span>
                    </div>
                    <span className="text-white/50">|</span>
                    <span>{article.date}</span>
                    <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {article.readTime}
                    </span>
                </div>

                <div className="mt-8 flex items-center justify-center gap-2 text-white/60 text-xs animate-pulse">
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

function SummaryCard({ article }: { article: MagazineArticle }) {
    return (
        <div className="h-full flex flex-col justify-center px-6 py-16 sm:px-8">
            {article.badge && (
                <Badge
                    className={`${getBadgeStyle(article.badge)} rounded-lg text-xs px-2.5 py-0.5 w-fit mb-4`}
                >
                    {getBadgeLabel(article.badge)}
                </Badge>
            )}

            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100 leading-tight mb-6">
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
                    {article.views.toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5" />
                    {article.likes}
                </span>
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
//  텍스트 카드
// ──────────────────────────────────────────────

function TextCard({
    html,
    cardIndex,
    totalCards,
}: {
    html: string;
    cardIndex: number;
    totalCards: number;
}) {
    return (
        <div className="h-full flex flex-col justify-center px-6 py-16 sm:px-10">
            {/* 카드 번호 */}
            <div className="text-xs text-gray-400 dark:text-gray-500 mb-4 text-right">
                {cardIndex} / {totalCards - 1}
            </div>

            {/* HTML 본문 */}
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
                    prose-blockquote:border-emerald-300 prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400"
                dangerouslySetInnerHTML={{ __html: html }}
            />
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
}: {
    src: string;
    caption?: string;
    cardIndex: number;
    totalCards: number;
}) {
    return (
        <div className="h-full flex flex-col">
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
        <div className="h-full flex flex-col justify-center px-6 py-16 sm:px-10 bg-amber-50 dark:bg-amber-900/10">
            {/* 카드 번호 */}
            <div className="text-xs text-amber-500/60 mb-6 text-right">
                {cardIndex} / {totalCards - 1}
            </div>

            {/* 인용 아이콘 */}
            <div className="mb-6">
                <Quote className="w-10 h-10 text-amber-400 dark:text-amber-500" />
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
}: {
    article: MagazineArticle;
    onBack: () => void;
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

            <Button
                onClick={onBack}
                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-6"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                목록으로 돌아가기
            </Button>
        </div>
    );
}

// ──────────────────────────────────────────────
//  카드 인디케이터
// ──────────────────────────────────────────────

function CardIndicator({
    current,
    total,
    onCardClick,
}: {
    current: number;
    total: number;
    onCardClick: (idx: number) => void;
}) {
    if (total <= 8) {
        return (
            <div className="fixed bottom-6 left-0 right-0 z-[60] flex justify-center gap-1.5">
                {Array.from({ length: total }, (_, i) => (
                    <button
                        key={i}
                        onClick={() => onCardClick(i)}
                        className={`h-1.5 rounded-full transition-all duration-200 ${
                            i === current
                                ? "w-5 bg-emerald-500"
                                : "w-1.5 bg-gray-300 dark:bg-gray-600"
                        }`}
                        aria-label={`${i + 1}번 카드`}
                    />
                ))}
            </div>
        );
    }

    return (
        <div className="fixed bottom-6 right-4 z-[60] bg-black/50 dark:bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-white text-sm">
            {current + 1} / {total}
        </div>
    );
}
