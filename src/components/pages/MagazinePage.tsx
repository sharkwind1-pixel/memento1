/**
 * MagazinePage.tsx
 * 펫매거진 - 반려동물 관련 콘텐츠/정보 매거진
 */

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useMemorialMode } from "@/contexts/PetContext";
import {
    Card,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    BookOpen,
    Search,
    Heart,
    Eye,
    Clock,
    Stethoscope,
    Utensils,
    Scissors,
    Brain,
    Home,
    Plane,
    TrendingUp,
    Sparkles,
    HeartHandshake,
    Shield,
    Loader2,
} from "lucide-react";

import Image from "next/image";
import { TabType } from "@/types";
import { getBadgeStyle, getBadgeLabel, dbArticleToMagazineArticle, type MagazineArticle } from "@/data/magazineArticles";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { API } from "@/config/apiEndpoints";
import MagazineReader from "@/components/features/magazine/MagazineReader";
import PopularArticleCarousel from "@/components/features/magazine/PopularArticleCarousel";
import { safeGetItem, safeSetItem } from "@/lib/safe-storage";

interface MagazinePageProps {
    setSelectedTab?: (tab: TabType) => void;
    isActive?: boolean;
}

/** 한 번에 불러올 기사 수 */
const PAGE_SIZE = 20;

// 단계별 필터 (상단)
const STAGES = [
    { id: "all", label: "전체", icon: BookOpen, color: "from-emerald-500 to-teal-500", iconColor: "text-emerald-500", description: "모든 콘텐츠" },
    { id: "beginner", label: "처음 키워요", icon: Sparkles, color: "from-sky-400 to-blue-500", iconColor: "text-sky-500", description: "초보 보호자 가이드" },
    { id: "companion", label: "함께 성장해요", icon: HeartHandshake, color: "from-emerald-400 to-green-500", iconColor: "text-emerald-500", description: "일상 케어 정보" },
    { id: "senior", label: "오래오래 함께", icon: Shield, color: "from-amber-400 to-orange-500", iconColor: "text-amber-500", description: "시니어 케어" },
];

// 주제별 필터 (하단)
const TOPICS = [
    { id: "all", label: "전체", icon: BookOpen },
    { id: "health", label: "건강/의료", icon: Stethoscope },
    { id: "food", label: "사료/영양", icon: Utensils },
    { id: "grooming", label: "미용/위생", icon: Scissors },
    { id: "behavior", label: "행동/훈련", icon: Brain },
    { id: "living", label: "생활/용품", icon: Home },
    { id: "travel", label: "여행/외출", icon: Plane },
];

function MagazinePage({ setSelectedTab, isActive }: MagazinePageProps) {
    const { isMemorialMode } = useMemorialMode();
    const [selectedStage, setSelectedStage] = useState<string>(() => {
        if (typeof window !== "undefined") {
            return safeGetItem("memento-magazine-stage") || "all";
        }
        return "all";
    });
    const [selectedTopic, setSelectedTopic] = useState<string>(() => {
        if (typeof window !== "undefined") {
            return safeGetItem("memento-magazine-topic") || "all";
        }
        return "all";
    });
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [articles, setArticles] = useState<MagazineArticle[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedArticle, setSelectedArticle] = useState<MagazineArticle | null>(null);

    // 페이지네이션 상태
    const [totalCount, setTotalCount] = useState(0);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const hasMore = articles.length < totalCount;
    const loadMoreRef = useRef<HTMLDivElement>(null);

    // 다른 탭으로 이동하면 기사 상세 닫기 (목록으로 복원)
    useEffect(() => {
        if (!isActive && selectedArticle) {
            setSelectedArticle(null);
        }
    }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

    // 필터 변경 시 localStorage에 저장
    useEffect(() => { safeSetItem("memento-magazine-stage", selectedStage); }, [selectedStage]);
    useEffect(() => { safeSetItem("memento-magazine-topic", selectedTopic); }, [selectedTopic]);

    // 서버사이드 필터 파라미터 빌드
    const buildFilterParams = useCallback(() => {
        const params = new URLSearchParams();
        params.set("limit", String(PAGE_SIZE));
        if (selectedStage !== "all") params.set("badge", selectedStage);
        if (selectedTopic !== "all") params.set("category", selectedTopic);
        if (searchQuery) params.set("search", searchQuery);
        return params;
    }, [selectedStage, selectedTopic, searchQuery]);

    // DB에서 기사 불러오기 (발행된 기사만, 서버사이드 필터링)
    useEffect(() => {
        async function fetchArticles() {
            setIsLoading(true);
            try {
                const params = buildFilterParams();
                params.set("offset", "0");
                const res = await fetch(`${API.MAGAZINE}?${params}`);
                if (!res.ok) {
                    throw new Error("매거진 불러오기 실패");
                }
                const data = await res.json();
                if (data.articles) {
                    setArticles(data.articles.map(dbArticleToMagazineArticle));
                }
                if (data.total != null) {
                    setTotalCount(data.total);
                }
            } catch {
                toast.error("매거진 기사를 불러오지 못했습니다");
            } finally {
                setIsLoading(false);
            }
        }
        fetchArticles();
    }, [selectedStage, selectedTopic, searchQuery, buildFilterParams]);

    // 더 불러오기
    const loadMore = useCallback(async () => {
        if (isLoadingMore || !hasMore) return;
        setIsLoadingMore(true);
        try {
            const params = buildFilterParams();
            params.set("offset", String(articles.length));
            const res = await fetch(`${API.MAGAZINE}?${params}`);
            if (!res.ok) throw new Error("매거진 불러오기 실패");
            const data = await res.json();
            if (data.articles && data.articles.length > 0) {
                const newArticles = data.articles.map(dbArticleToMagazineArticle);
                setArticles((prev) => [...prev, ...newArticles]);
            }
            if (data.total != null) {
                setTotalCount(data.total);
            }
        } catch {
            toast.error("추가 기사를 불러오지 못했습니다");
        } finally {
            setIsLoadingMore(false);
        }
    }, [articles.length, hasMore, isLoadingMore, buildFilterParams]);

    // IntersectionObserver로 무한 스크롤
    useEffect(() => {
        const el = loadMoreRef.current;
        if (!el || !hasMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    loadMore();
                }
            },
            { rootMargin: "200px" }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [hasMore, loadMore]);

    const filteredArticles = articles.filter((article) => {
        // 단계별 필터 (badge 필드 기반)
        if (selectedStage !== "all" && article.badge !== selectedStage)
            return false;
        // 주제별 필터 (category 필드 기반)
        if (selectedTopic !== "all" && article.category !== selectedTopic)
            return false;
        if (
            searchQuery &&
            !article.title.includes(searchQuery) &&
            !article.summary.includes(searchQuery)
        )
            return false;
        return true;
    });

    // 인기 아티클 (상위 3개)
    const popularArticles = [...articles]
        .sort((a, b) => b.views - a.views)
        .slice(0, 3);

    return (
        <div
            className="min-h-screen relative overflow-hidden"
            style={{ contain: 'layout style', transform: 'translateZ(0)' }}
        >
            <div className={`absolute inset-0 bg-gradient-to-br ${isMemorialMode ? "from-amber-50 via-amber-50/50 to-white" : "from-emerald-50 via-teal-50 to-white"} dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300`}>
                <div className={`absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r ${isMemorialMode ? "from-amber-200/30 to-orange-200/30" : "from-emerald-200/30 to-teal-200/30"} dark:from-emerald-800/20 dark:to-teal-800/20 rounded-full blur-3xl animate-pulse`} />
            </div>

            <div className="relative z-10 space-y-6 pb-8">
                {/* 기사 상세보기 (스와이프 리더) */}
                {selectedArticle ? (
                    <MagazineReader
                        article={selectedArticle}
                        onBack={() => setSelectedArticle(null)}
                    />
                ) : (
                <>
                {/* 헤더 */}
                <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-white/50 dark:border-gray-700/50 rounded-3xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                            <div className={`w-12 h-12 bg-gradient-to-r ${isMemorialMode ? "from-amber-500 to-orange-500" : "from-emerald-500 to-teal-500"} rounded-xl flex items-center justify-center`}>
                                <BookOpen className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-display font-bold text-gray-800 dark:text-gray-100">
                                    펫매거진
                                </h1>
                                <p className="text-gray-600 dark:text-gray-300">
                                    반려동물과 함께하는 건강한 일상
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 검색 */}
                    <div className="relative mb-4">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                            placeholder="궁금한 내용을 검색해보세요"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-12 h-12 rounded-xl bg-white/70 dark:bg-gray-700/70 text-lg"
                        />
                    </div>

                    {/* 단계별 필터 */}
                    <div className="space-y-3">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            어떤 단계인가요?
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {STAGES.map((stage) => {
                                const Icon = stage.icon;
                                const isActive = selectedStage === stage.id;
                                return (
                                    <button
                                        key={stage.id}
                                        onClick={() => setSelectedStage(stage.id)}
                                        className={`p-3 rounded-xl border-2 transition-all text-left ${
                                            isActive
                                                ? `bg-gradient-to-r ${stage.color} text-white border-transparent shadow-lg`
                                                : "bg-white/50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:shadow-md"
                                        }`}
                                    >
                                        <Icon className={`w-5 h-5 mb-1 ${isActive ? "text-white" : stage.iconColor}`} />
                                        <span className={`block text-sm font-bold ${isActive ? "text-white" : "text-gray-800 dark:text-gray-100"}`}>
                                            {stage.label}
                                        </span>
                                        <span className={`block text-xs mt-0.5 ${isActive ? "text-white/80" : "text-gray-400 dark:text-gray-500"}`}>
                                            {stage.description}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 주제별 필터 */}
                    <div className="space-y-2 mt-4">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            주제
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {TOPICS.map((topic) => {
                                const Icon = topic.icon;
                                const isActive = selectedTopic === topic.id;
                                return (
                                    <button
                                        key={topic.id}
                                        onClick={() => setSelectedTopic(topic.id)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                                            isActive
                                                ? "bg-emerald-500 text-white shadow-md"
                                                : "bg-white/70 dark:bg-gray-700/70 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                        }`}
                                    >
                                        <Icon className="w-3.5 h-3.5" />
                                        {topic.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* 로딩 상태 */}
                {isLoading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="rounded-2xl overflow-hidden bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/50 dark:border-gray-700/50">
                                <Skeleton className="h-40 w-full" />
                                <div className="p-4 space-y-2">
                                    <Skeleton className="h-4 w-16" />
                                    <Skeleton className="h-5 w-3/4" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-2/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 인기 아티클 */}
                {!isLoading && selectedStage === "all" && selectedTopic === "all" && !searchQuery && popularArticles.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-emerald-500" />
                            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                                인기 콘텐츠
                            </h2>
                        </div>
                        <PopularArticleCarousel
                            articles={popularArticles}
                            onSelect={setSelectedArticle}
                        />
                    </div>
                )}

                {/* 아티클 목록 */}
                {!isLoading && (
                    <div className="space-y-4" data-tutorial-id="magazine-articles">
                        {(selectedStage !== "all" || selectedTopic !== "all" || searchQuery) && (
                            <div className="text-sm text-gray-500">
                                {filteredArticles.length}개의 콘텐츠
                            </div>
                        )}

                        {filteredArticles.map((article) => (
                            <Card
                                key={article.id}
                                onClick={() => setSelectedArticle(article)}
                                className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-white/50 dark:border-gray-700/50 hover:shadow-lg transition-all duration-300 rounded-2xl cursor-pointer overflow-hidden"
                            >
                                <div className="flex flex-col sm:flex-row">
                                    <div className="sm:w-48 h-40 sm:h-40 flex-shrink-0 relative">
                                        <Image
                                            src={article.image}
                                            alt={article.title}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                    <div className="flex-1 p-5">
                                        <div className="flex items-start justify-between mb-2">
                                            <Badge
                                                className={`${getBadgeStyle(article.badge)} rounded-lg`}
                                            >
                                                {getBadgeLabel(article.badge)}
                                            </Badge>
                                        </div>

                                        <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 mb-2 line-clamp-1">
                                            {article.title}
                                        </h3>
                                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">
                                            {article.summary}
                                        </p>

                                        <div className="flex flex-wrap gap-1.5 mb-3">
                                            {article.tags.map((tag) => (
                                                <span
                                                    key={tag}
                                                    className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full"
                                                >
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>

                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">
                                                    {article.author}
                                                </span>
                                                <span>·</span>
                                                <span>{article.date}</span>
                                                <span>·</span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {article.readTime} 읽기
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="flex items-center gap-1">
                                                    <Eye className="w-3 h-3" />
                                                    {(article.views ?? 0).toLocaleString()}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Heart className="w-3 h-3" />
                                                    {article.likes ?? 0}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}

                        {/* 무한 스크롤 트리거 / 더 보기 버튼 */}
                        {hasMore && (
                            <div ref={loadMoreRef} className="flex justify-center py-4">
                                {isLoadingMore ? (
                                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span className="text-sm">불러오는 중...</span>
                                    </div>
                                ) : (
                                    <Button
                                        variant="outline"
                                        className="rounded-xl px-6"
                                        onClick={loadMore}
                                    >
                                        더 보기 ({articles.length} / {totalCount})
                                    </Button>
                                )}
                            </div>
                        )}

                        {filteredArticles.length === 0 && (
                            <div className="text-center py-16">
                                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <BookOpen className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                                </div>
                                <p className="text-gray-500 dark:text-gray-400">
                                    {searchQuery || selectedStage !== "all" || selectedTopic !== "all"
                                        ? "해당 조건의 콘텐츠가 없습니다"
                                        : "아직 등록된 매거진 기사가 없습니다"}
                                </p>
                                {(searchQuery || selectedStage !== "all" || selectedTopic !== "all") && (
                                    <Button
                                        variant="outline"
                                        className="mt-4 rounded-xl"
                                        onClick={() => {
                                            setSelectedStage("all");
                                            setSelectedTopic("all");
                                            setSearchQuery("");
                                        }}
                                    >
                                        전체 보기
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                )}
                </>
                )}
            </div>
        </div>
    );
}

export default React.memo(MagazinePage);
