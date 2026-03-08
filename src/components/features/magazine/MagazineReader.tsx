/**
 * MagazineReader - 인스타그램 카드뉴스 스타일 매거진 리더
 * 좌우 스와이프로 카드를 넘기며 읽는 풀스크린 리더
 *
 * 카드 구성:
 * 1. 커버 (히어로 이미지 + 제목 + 배지)
 * 2. 요약 (메타정보 + 요약 박스)
 * 3~N. 본문 카드 (텍스트 / 이미지 / 인용문)
 * N+1. 엔딩 (태그 + 목록 복귀)
 *
 * 기능:
 * - 좋아요 토글 (localStorage 기반 중복 방지)
 * - 조회수 증가 (sessionStorage 기반 중복 방지)
 * - 상단 프로그레스 바
 * - 짝수/홀수 카드 배경색 교차
 * - 세로 스크롤 충돌 해결 (긴 카드: "다음" 버튼)
 * - strong 태그 형광펜 효과
 * - 다음 카드 살짝 보이기 힌트
 */
"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
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
import { API } from "@/config/apiEndpoints";

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

            // <h2> → 새 카드 시작 (명시적 경계 모드에서는 <hr>만 카드 경계이므로 flush 안 함)
            if (/^<h2/i.test(block)) {
                if (!respectBoundaries) {
                    flushTextBuffer();
                }
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
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const sliderRef = useRef<HTMLDivElement>(null);

    // 좋아요 상태 (localStorage 기반 중복 방지)
    const likeKey = `magazine_likes_${article.id}`;
    const [isLiked, setIsLiked] = useState(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem(likeKey) === "1";
        }
        return false;
    });
    const [displayLikes, setDisplayLikes] = useState(article.likes);
    const [likeAnimating, setLikeAnimating] = useState(false);

    // 조회수 상태 (sessionStorage 기반 중복 방지)
    const [displayViews, setDisplayViews] = useState(article.views);

    // 조회수 증가 (마운트 시 1회)
    useEffect(() => {
        const viewKey = `magazine_viewed_${article.id}`;
        if (typeof window !== "undefined" && !sessionStorage.getItem(viewKey)) {
            sessionStorage.setItem(viewKey, "1");
            fetch(API.MAGAZINE, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ articleId: article.id, action: "view" }),
            })
                .then((res) => res.json())
                .then((data) => {
                    if (data.views != null) {
                        setDisplayViews(data.views);
                    }
                })
                .catch(() => {
                    // 조회수 증가 실패 시 무시
                });
        }
    }, [article.id]);

    // 좋아요 토글 핸들러
    const handleLike = useCallback(async () => {
        const willLike = !isLiked;
        setIsLiked(willLike);
        setDisplayLikes((prev) => prev + (willLike ? 1 : -1));
        setLikeAnimating(true);
        setTimeout(() => setLikeAnimating(false), 300);

        if (willLike) {
            localStorage.setItem(likeKey, "1");
        } else {
            localStorage.removeItem(likeKey);
        }

        try {
            const res = await fetch(API.MAGAZINE, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    articleId: article.id,
                    action: willLike ? "like" : "unlike",
                }),
            });
            const data = await res.json();
            if (data.likes != null) {
                setDisplayLikes(data.likes);
            }
        } catch {
            // 실패 시 롤백
            setIsLiked(!willLike);
            setDisplayLikes((prev) => prev + (willLike ? -1 : 1));
            if (!willLike) {
                localStorage.setItem(likeKey, "1");
            } else {
                localStorage.removeItem(likeKey);
            }
        }
    }, [isLiked, article.id, likeKey]);

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

    // 카드 이동 (전환 시 스크롤 맨 위로 리셋)
    const goToCard = useCallback(
        (idx: number) => {
            const clamped = Math.max(0, Math.min(idx, totalCards - 1));
            setCurrentCard(clamped);
            requestAnimationFrame(() => {
                const container = containerRef.current;
                if (!container) return;
                container.querySelectorAll<HTMLElement>(".h-full.overflow-y-auto")
                    .forEach((el) => { el.scrollTop = 0; });
            });
        },
        [totalCards]
    );

    // 최초 마운트 시 페이지 스크롤 맨 위로
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const goNext = useCallback(
        () => goToCard(currentCard + 1),
        [currentCard, goToCard]
    );
    const goPrev = useCallback(
        () => goToCard(currentCard - 1),
        [currentCard, goToCard]
    );

    // 키보드 네비게이션 (스페이스/엔터로도 다음 카드)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
                e.preventDefault();
                goNext();
            } else if (e.key === "ArrowLeft") {
                goPrev();
            } else if (e.key === "Escape") {
                onBack();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [goNext, goPrev, onBack]);

    // 네이티브 터치 스와이프 (DOM 직접 조작 → 리렌더 없이 60fps)
    const touchRef = useRef<{
        startX: number;
        startY: number;
        startTime: number;
        lastX: number;
        direction: "none" | "horizontal" | "vertical";
    } | null>(null);
    const currentCardRef = useRef(currentCard);
    const totalCardsRef = useRef(totalCards);
    const goNextRef = useRef(goNext);
    const goPrevRef = useRef(goPrev);
    currentCardRef.current = currentCard;
    totalCardsRef.current = totalCards;
    goNextRef.current = goNext;
    goPrevRef.current = goPrev;

    /** slider DOM의 transform을 직접 업데이트 (React 리렌더 없음) */
    const applyOffset = useCallback((offset: number) => {
        const slider = sliderRef.current;
        if (!slider) return;
        const card = currentCardRef.current;
        const total = totalCardsRef.current;
        slider.style.transform = `translateX(calc(-${(card * 100) / total}% + ${offset}px))`;
    }, []);

    useEffect(() => {
        const el = containerRef.current;
        if (!el || !isTouchDevice) return;

        const onTouchStart = (e: TouchEvent) => {
            const touch = e.touches[0];
            touchRef.current = {
                startX: touch.clientX,
                startY: touch.clientY,
                startTime: Date.now(),
                lastX: touch.clientX,
                direction: "none",
            };
            // transition 즉시 비활성화 (DOM 직접 조작)
            sliderRef.current?.classList.add("dragging");
        };

        const onTouchMove = (e: TouchEvent) => {
            if (!touchRef.current) return;
            const touch = e.touches[0];
            const dx = touch.clientX - touchRef.current.startX;
            const dy = touch.clientY - touchRef.current.startY;

            // 첫 움직임에서 수평/수직 방향 결정
            if (touchRef.current.direction === "none") {
                if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                    touchRef.current.direction = Math.abs(dx) >= Math.abs(dy) ? "horizontal" : "vertical";
                }
                if (touchRef.current.direction !== "horizontal") return;
            }

            if (touchRef.current.direction === "vertical") return;

            e.preventDefault();
            touchRef.current.lastX = touch.clientX;

            const card = currentCardRef.current;
            const total = totalCardsRef.current;
            const atStart = card === 0 && dx > 0;
            const atEnd = card === total - 1 && dx < 0;
            const offset = atStart || atEnd ? dx * 0.3 : dx;

            // DOM 직접 조작 (React 리렌더 없음 → 60fps)
            applyOffset(offset);
        };

        const onTouchEnd = () => {
            const slider = sliderRef.current;

            if (!touchRef.current || touchRef.current.direction !== "horizontal") {
                touchRef.current = null;
                slider?.classList.remove("dragging");
                applyOffset(0);
                return;
            }

            const dx = touchRef.current.lastX - touchRef.current.startX;
            const elapsed = Date.now() - touchRef.current.startTime;
            const velocity = Math.abs(dx) / Math.max(elapsed, 1);

            const THRESHOLD = 30;
            const VELOCITY_THRESHOLD = 0.2;

            // transition 다시 활성화 (카드 전환 애니메이션)
            slider?.classList.remove("dragging");

            if (dx < -THRESHOLD || (velocity > VELOCITY_THRESHOLD && dx < 0)) {
                goNextRef.current();
            } else if (dx > THRESHOLD || (velocity > VELOCITY_THRESHOLD && dx > 0)) {
                goPrevRef.current();
            } else {
                // 스냅백
                applyOffset(0);
            }

            touchRef.current = null;
        };

        el.addEventListener("touchstart", onTouchStart, { passive: true });
        el.addEventListener("touchmove", onTouchMove, { passive: false });
        el.addEventListener("touchend", onTouchEnd, { passive: true });

        return () => {
            el.removeEventListener("touchstart", onTouchStart);
            el.removeEventListener("touchmove", onTouchMove);
            el.removeEventListener("touchend", onTouchEnd);
        };
    }, [isTouchDevice, applyOffset]);

    // 가상화: 현재 +/- 2 카드만 렌더 (다음 카드 힌트를 위해 +2)
    const visibleRange = useMemo(() => ({
        start: Math.max(0, currentCard - 1),
        end: Math.min(totalCards - 1, currentCard + 2),
    }), [currentCard, totalCards]);

    // 프로그레스 바 비율
    const progressPercent = totalCards > 1 ? ((currentCard) / (totalCards - 1)) * 100 : 0;

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 z-50 bg-white dark:bg-gray-900 overflow-hidden"
        >
            {/* [A] 상단 프로그레스 바 - sticky, 카드 번호 표시 */}
            <div className="fixed top-0 left-0 right-0 z-[70]">
                <div className="h-1 bg-gray-200 dark:bg-gray-700">
                    <div
                        className="h-full bg-sky-400 transition-all duration-300 ease-out"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
                <div className="flex justify-center">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm px-2 py-0.5 rounded-b-md">
                        {currentCard + 1} / {totalCards}
                    </span>
                </div>
            </div>

            {/* 뒤로가기 */}
            <button
                onClick={onBack}
                className="fixed top-4 left-4 z-[60] bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-white dark:hover:bg-gray-700 transition-colors"
                aria-label="목록으로"
            >
                <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-200" />
            </button>

            {/* 좋아요 버튼 (우측 상단 고정) */}
            <button
                onClick={handleLike}
                className="fixed top-4 right-4 z-[60] bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-white dark:hover:bg-gray-700 transition-colors flex items-center gap-1.5"
                aria-label="좋아요"
            >
                <Heart
                    className={`w-5 h-5 transition-all duration-200 ${
                        isLiked
                            ? "text-red-500 fill-red-500"
                            : "text-gray-500 dark:text-gray-400"
                    } ${likeAnimating ? "scale-125" : "scale-100"}`}
                />
                <span className={`text-sm font-medium ${isLiked ? "text-red-500" : "text-gray-500 dark:text-gray-400"}`}>
                    {displayLikes}
                </span>
            </button>

            {/* 카드 컨테이너 - [E] 카드 너비 97%로 다음 카드 힌트 */}
            <div
                ref={sliderRef}
                className="flex h-full magazine-page-container"
                style={{
                    width: `${totalCards * 100}%`,
                    transform: `translateX(-${(currentCard * 100) / totalCards}%)`,
                }}
            >
                {cards.map((card, index) => {
                    const isVisible = index >= visibleRange.start && index <= visibleRange.end;
                    const isLastCard = index === totalCards - 1;
                    return (
                        <div
                            key={index}
                            className="h-full overflow-y-auto"
                            style={{ width: `${100 / totalCards}%` }}
                        >
                            {isVisible && (
                                <div className="h-full flex items-center justify-center">
                                    {/* [E] 다음 카드 힌트: 카드 너비 97%, 마지막 카드는 100% */}
                                    <div
                                        className="mx-auto h-full"
                                        style={{ width: isLastCard ? "100%" : "97%", maxWidth: "42rem" }}
                                    >
                                        <CardRenderer
                                            card={card}
                                            article={article}
                                            cardIndex={index}
                                            totalCards={totalCards}
                                            onBack={onBack}
                                            isLiked={isLiked}
                                            displayLikes={displayLikes}
                                            displayViews={displayViews}
                                            onLike={handleLike}
                                            likeAnimating={likeAnimating}
                                            goNext={goNext}
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
                                    ? "bg-sky-500 text-white shadow-md hover:bg-sky-600"
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
        <div className="h-full flex flex-col justify-center px-6 py-16 sm:px-10 bg-amber-50 dark:bg-amber-900/15">
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
