/**
 * 매거진 배너 - 데스크톱 헤더용 자동 회전 배너
 * 펫매거진 글 제목이 4초 간격으로 세로 슬라이드 전환
 * DB에서 발행된 기사를 불러오고, 없으면 배너 숨김
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { BookOpen } from "lucide-react";
import { getBadgeStyle, getBadgeLabel, dbArticleToMagazineArticle, type MagazineArticle } from "@/data/magazineArticles";

interface MagazineBannerProps {
    onNavigateToMagazine: () => void;
}

export default function MagazineBanner({ onNavigateToMagazine }: MagazineBannerProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [articles, setArticles] = useState<MagazineArticle[]>([]);

    // DB에서 발행된 기사 불러오기
    useEffect(() => {
        async function fetchArticles() {
            try {
                const res = await fetch("/api/magazine?limit=10");
                if (!res.ok) return;
                const data = await res.json();
                if (data.articles && data.articles.length > 0) {
                    setArticles(data.articles.map(dbArticleToMagazineArticle));
                }
            } catch {
                // DB 조회 실패시 빈 상태 유지
            }
        }
        fetchArticles();
    }, []);

    const nextSlide = useCallback(() => {
        if (articles.length === 0) return;
        setCurrentIndex((prev) => (prev + 1) % articles.length);
    }, [articles.length]);

    useEffect(() => {
        if (isPaused || articles.length === 0) return;
        const interval = setInterval(nextSlide, 4000);
        return () => clearInterval(interval);
    }, [isPaused, nextSlide, articles.length]);

    // articles가 바뀌면 index 리셋
    useEffect(() => {
        setCurrentIndex(0);
    }, [articles]);

    // 기사가 없으면 배너 숨김
    if (articles.length === 0) {
        return null;
    }

    return (
        <div
            className="hidden xl:flex flex-1 items-center justify-center mx-8"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            <button
                onClick={onNavigateToMagazine}
                className="flex items-center gap-3 px-4 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors w-full max-w-xl group"
            >
                <BookOpen className="w-4 h-4 text-[#05B2DC] flex-shrink-0" />

                <div className="relative h-6 overflow-hidden flex-1 text-left">
                    <div
                        className="transition-transform duration-500 ease-in-out"
                        style={{ transform: `translateY(-${currentIndex * 24}px)` }}
                    >
                        {articles.map((article) => (
                            <div key={article.id} className="h-6 flex items-center gap-2">
                                {article.badge && (
                                    <span
                                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0 ${getBadgeStyle(article.badge)}`}
                                    >
                                        {getBadgeLabel(article.badge)}
                                    </span>
                                )}
                                <span className="text-sm text-gray-600 dark:text-gray-300 truncate group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
                                    {article.title}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex gap-1 flex-shrink-0">
                    {articles.map((_, i) => (
                        <div
                            key={i}
                            className={`w-1 h-1 rounded-full transition-colors duration-300 ${
                                i === currentIndex
                                    ? "bg-[#05B2DC]"
                                    : "bg-gray-300 dark:bg-gray-600"
                            }`}
                        />
                    ))}
                </div>
            </button>
        </div>
    );
}
