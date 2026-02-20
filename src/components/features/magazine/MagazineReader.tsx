/**
 * MagazineReader - 좌우 스와이프 풀페이지 매거진 리더
 * 전자책/잡지 앱처럼 좌우로 넘기면 전체 페이지가 전환됨
 *
 * 페이지 구성:
 * 1. 커버 (히어로 이미지 + 제목 + 배지)
 * 2. 요약 (메타정보 + 요약 박스)
 * 3~N. 본문 섹션 (hr/H2/자동 분할)
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

/** 페이지 타입 */
type PageType = "cover" | "summary" | "section" | "end";

interface PageData {
    type: PageType;
    html?: string;
    sectionTitle?: string;
}

// ──────────────────────────────────────────────
//  HTML 콘텐츠를 페이지 단위로 분할
//  우선순위: <hr> → <h2> → 자동 (블록 5개)
// ──────────────────────────────────────────────

/** 한 페이지에 표시할 최대 블록 요소 수 */
const MAX_BLOCKS_PER_PAGE = 5;

/** plain text를 HTML로 변환 (기존 콘텐츠 호환) */
function toHtml(content: string): string {
    if (/<[a-z][\s\S]*>/i.test(content)) return content;
    return content
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => `<p>${line}</p>`)
        .join("");
}

/** 섹션 결과 타입 */
interface ContentSection {
    title: string;
    html: string;
}

/**
 * HTML 콘텐츠를 페이지 단위로 분할
 *
 * 1단계: <hr> 태그로 명시적 페이지 분할
 * 2단계: 각 파트 내 <h2> 태그로 추가 분할
 * 3단계: 블록 요소가 MAX_BLOCKS_PER_PAGE 초과 시 자동 분할
 */
function splitContentIntoPages(html: string): ContentSection[] {
    // 1단계: <hr> 기준 분할 (관리자가 삽입한 페이지 구분선)
    const hrParts = html.split(/<hr\s*\/?>/i).filter((p) => p.trim());

    const sections: ContentSection[] = [];

    for (const hrPart of hrParts) {
        // 2단계: 각 <hr> 파트 내에서 <h2> 기준 분할
        const h2Parts = hrPart.split(/(?=<h2[\s>])/i);

        for (const h2Part of h2Parts) {
            const trimmed = h2Part.trim();
            if (!trimmed) continue;

            // H2 태그에서 제목 추출
            const h2Match = trimmed.match(/<h2[^>]*>(.*?)<\/h2>/i);
            const title = h2Match ? h2Match[1].replace(/<[^>]*>/g, "").trim() : "";

            // 3단계: 블록 요소 수 체크 후 자동 분할
            const autoSplit = splitByBlockCount(trimmed, title);
            sections.push(...autoSplit);
        }
    }

    return sections.length > 0 ? sections : [{ title: "", html }];
}

/**
 * 블록 요소가 MAX_BLOCKS_PER_PAGE 초과하면 자동 분할
 * 블록 요소: <p>, <ul>, <ol>, <h2>, <h3>, <blockquote>, <img>, <figure>
 */
function splitByBlockCount(html: string, sectionTitle: string): ContentSection[] {
    // 블록 요소 경계에서 분리 (태그 직전에서 split)
    const blockPattern = /(?=<(?:p|ul|ol|h2|h3|blockquote|img|figure)[\s>])/i;
    const blocks = html.split(blockPattern).filter((b) => b.trim());

    if (blocks.length <= MAX_BLOCKS_PER_PAGE) {
        return [{ title: sectionTitle, html }];
    }

    // MAX_BLOCKS_PER_PAGE 개씩 묶기
    const pages: ContentSection[] = [];
    for (let i = 0; i < blocks.length; i += MAX_BLOCKS_PER_PAGE) {
        const chunk = blocks.slice(i, i + MAX_BLOCKS_PER_PAGE).join("");
        pages.push({
            title: i === 0 ? sectionTitle : "",
            html: chunk,
        });
    }

    return pages;
}

/** 기사를 페이지 배열로 변환 */
function buildPages(article: MagazineArticle): PageData[] {
    const pages: PageData[] = [];

    // 1. 커버 페이지
    pages.push({ type: "cover" });

    // 2. 요약 페이지
    pages.push({ type: "summary" });

    // 3~N. 본문 섹션
    if (article.content) {
        const html = toHtml(article.content);
        const sections = splitContentIntoPages(html);
        for (const section of sections) {
            pages.push({
                type: "section",
                html: section.html,
                sectionTitle: section.title,
            });
        }
    }

    // N+1. 엔딩 페이지
    pages.push({ type: "end" });

    return pages;
}

// ──────────────────────────────────────────────
//  MagazineReader 메인 컴포넌트
// ──────────────────────────────────────────────

export default function MagazineReader({ article, onBack }: MagazineReaderProps) {
    const [currentPage, setCurrentPage] = useState(0);
    const [offsetX, setOffsetX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const pages = useMemo(() => buildPages(article), [article]);
    const totalPages = pages.length;

    // 페이지 이동
    const goToPage = useCallback(
        (page: number) => {
            const clamped = Math.max(0, Math.min(page, totalPages - 1));
            setCurrentPage(clamped);
        },
        [totalPages]
    );

    const goNext = useCallback(
        () => goToPage(currentPage + 1),
        [currentPage, goToPage]
    );
    const goPrev = useCallback(
        () => goToPage(currentPage - 1),
        [currentPage, goToPage]
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

    // 제스처 핸들링
    const bind = useDrag(
        ({ down, movement: [mx], velocity: [vx], direction: [dx], last }) => {
            if (down) {
                setIsDragging(true);
                // 첫/마지막 페이지에서 rubberband (이동량 감쇠)
                const atStart = currentPage === 0 && mx > 0;
                const atEnd = currentPage === totalPages - 1 && mx < 0;
                const damped = atStart || atEnd ? mx * 0.3 : mx;
                setOffsetX(damped);
            }

            if (last) {
                const THRESHOLD = 80;
                const VELOCITY_THRESHOLD = 0.5;

                // 스와이프 왼쪽 (다음 페이지)
                if (mx < -THRESHOLD || (vx > VELOCITY_THRESHOLD && dx < 0)) {
                    goNext();
                }
                // 스와이프 오른쪽 (이전 페이지)
                else if (mx > THRESHOLD || (vx > VELOCITY_THRESHOLD && dx > 0)) {
                    goPrev();
                }

                setOffsetX(0);
                // 약간의 딜레이 후 드래그 상태 해제 (전환 애니메이션 적용)
                requestAnimationFrame(() => setIsDragging(false));
            }
        },
        {
            axis: "x",
            filterTaps: true,
            threshold: 10,
        }
    );

    // 가상화: 현재 ± 1 페이지만 렌더
    const visibleRange = useMemo(() => {
        const start = Math.max(0, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);
        return { start, end };
    }, [currentPage, totalPages]);

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 z-50 bg-white dark:bg-gray-900 overflow-hidden select-none-touch tap-highlight-none"
            style={{ touchAction: "pan-y" }}
        >
            {/* 뒤로가기 버튼 */}
            <button
                onClick={onBack}
                className="fixed top-4 left-4 z-[60] bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-white dark:hover:bg-gray-700 transition-colors touch-target"
                aria-label="목록으로"
            >
                <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-200" />
            </button>

            {/* 페이지 컨테이너 */}
            <div
                {...bind()}
                className={`flex h-full ${isDragging ? "magazine-page-container dragging" : "magazine-page-container"}`}
                style={{
                    width: `${totalPages * 100}%`,
                    transform: `translateX(calc(-${(currentPage * 100) / totalPages}% + ${offsetX}px))`,
                }}
            >
                {pages.map((page, index) => {
                    const isVisible =
                        index >= visibleRange.start && index <= visibleRange.end;
                    return (
                        <div
                            key={index}
                            className="magazine-page h-full overflow-y-auto"
                            style={{ width: `${100 / totalPages}%` }}
                        >
                            {isVisible && (
                                <PageRenderer
                                    page={page}
                                    article={article}
                                    pageIndex={index}
                                    totalPages={totalPages}
                                    onBack={onBack}
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* 데스크톱 좌우 화살표 */}
            {currentPage > 0 && (
                <button
                    onClick={goPrev}
                    className="fixed left-2 top-1/2 -translate-y-1/2 z-[60] bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-full p-2 shadow-md hover:bg-white dark:hover:bg-gray-700 transition-colors hidden sm:block"
                    aria-label="이전 페이지"
                >
                    <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
            )}
            {currentPage < totalPages - 1 && (
                <button
                    onClick={goNext}
                    className="fixed right-2 top-1/2 -translate-y-1/2 z-[60] bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-full p-2 shadow-md hover:bg-white dark:hover:bg-gray-700 transition-colors hidden sm:block"
                    aria-label="다음 페이지"
                >
                    <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
            )}

            {/* 페이지 인디케이터 */}
            <PageIndicator
                current={currentPage}
                total={totalPages}
                onPageClick={goToPage}
            />
        </div>
    );
}

// ──────────────────────────────────────────────
//  페이지 렌더러 (타입별 분기)
// ──────────────────────────────────────────────

function PageRenderer({
    page,
    article,
    pageIndex,
    totalPages,
    onBack,
}: {
    page: PageData;
    article: MagazineArticle;
    pageIndex: number;
    totalPages: number;
    onBack: () => void;
}) {
    switch (page.type) {
        case "cover":
            return <CoverPage article={article} />;
        case "summary":
            return <SummaryPage article={article} />;
        case "section":
            return (
                <ContentPage
                    html={page.html || ""}
                    sectionTitle={page.sectionTitle}
                    pageIndex={pageIndex}
                    totalPages={totalPages}
                />
            );
        case "end":
            return <EndPage article={article} onBack={onBack} />;
        default:
            return null;
    }
}

// ──────────────────────────────────────────────
//  커버 페이지
// ──────────────────────────────────────────────

function CoverPage({ article }: { article: MagazineArticle }) {
    return (
        <div className="relative h-full flex flex-col justify-end">
            {/* 배경 이미지 */}
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

            {/* 오버레이 콘텐츠 */}
            <div className="relative z-10 p-6 pb-20 sm:p-8 sm:pb-24">
                {/* 배지 */}
                {article.badge && (
                    <Badge
                        className={`${getBadgeStyle(article.badge)} rounded-lg text-sm px-3 py-1 mb-4`}
                    >
                        {getBadgeLabel(article.badge)}
                    </Badge>
                )}

                {/* 제목 */}
                <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
                    {article.title}
                </h1>

                {/* 저자 + 날짜 */}
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

                {/* 스와이프 힌트 */}
                <div className="mt-8 flex items-center justify-center gap-2 text-white/60 text-xs animate-pulse">
                    <ChevronLeft className="w-4 h-4" />
                    <span>스와이프하여 읽기</span>
                    <ChevronRight className="w-4 h-4" />
                </div>
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────
//  요약 페이지
// ──────────────────────────────────────────────

function SummaryPage({ article }: { article: MagazineArticle }) {
    return (
        <div className="h-full flex flex-col justify-center px-6 py-16 sm:px-8">
            {/* 배지 */}
            {article.badge && (
                <Badge
                    className={`${getBadgeStyle(article.badge)} rounded-lg text-xs px-2.5 py-0.5 w-fit mb-4`}
                >
                    {getBadgeLabel(article.badge)}
                </Badge>
            )}

            {/* 제목 */}
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100 leading-tight mb-6">
                {article.title}
            </h2>

            {/* 메타정보 */}
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

            {/* 요약 박스 */}
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-5 mb-6">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {article.summary}
                </p>
            </div>

            {/* 다음 페이지 안내 */}
            <div className="flex items-center justify-center gap-2 text-gray-400 dark:text-gray-500 text-xs mt-4">
                <span>본문 보기</span>
                <ChevronRight className="w-4 h-4" />
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────
//  본문 콘텐츠 페이지
// ──────────────────────────────────────────────

function ContentPage({
    html,
    sectionTitle,
    pageIndex,
    totalPages,
}: {
    html: string;
    sectionTitle?: string;
    pageIndex: number;
    totalPages: number;
}) {
    return (
        <div className="h-full px-6 py-16 sm:px-8 overflow-y-auto">
            {/* 상단 페이지 번호 */}
            <div className="text-xs text-gray-400 dark:text-gray-500 mb-6 text-right">
                {pageIndex} / {totalPages - 1}
            </div>

            {/* HTML 본문 */}
            <div
                className="prose prose-gray dark:prose-invert max-w-none
                    prose-headings:text-gray-800 dark:prose-headings:text-gray-100
                    prose-h2:text-xl prose-h2:font-bold prose-h2:mt-2 prose-h2:mb-4
                    prose-h3:text-lg prose-h3:font-semibold prose-h3:mt-6 prose-h3:mb-3
                    prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed
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
//  엔딩 페이지
// ──────────────────────────────────────────────

function EndPage({
    article,
    onBack,
}: {
    article: MagazineArticle;
    onBack: () => void;
}) {
    return (
        <div className="h-full flex flex-col items-center justify-center px-6 py-16 sm:px-8">
            {/* 아이콘 */}
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-800/30 rounded-full flex items-center justify-center mb-6">
                <BookOpen className="w-8 h-8 text-emerald-500" />
            </div>

            <p className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
                읽기 완료
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 text-center">
                {article.title}
            </p>

            {/* 태그 */}
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

            {/* 목록 복귀 */}
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
//  페이지 인디케이터
// ──────────────────────────────────────────────

function PageIndicator({
    current,
    total,
    onPageClick,
}: {
    current: number;
    total: number;
    onPageClick: (page: number) => void;
}) {
    // 5페이지 이하: 도트, 초과: 카운터
    if (total <= 5) {
        return (
            <div className="fixed bottom-6 left-0 right-0 z-[60] flex justify-center gap-2">
                {Array.from({ length: total }, (_, i) => (
                    <button
                        key={i}
                        onClick={() => onPageClick(i)}
                        className={`h-2 rounded-full transition-all duration-200 touch-target flex items-center justify-center ${
                            i === current
                                ? "w-6 bg-emerald-500"
                                : "w-2 bg-gray-300 dark:bg-gray-600"
                        }`}
                        aria-label={`${i + 1}페이지`}
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
