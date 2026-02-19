/**
 * MagazinePage.tsx
 * 펫매거진 - 반려동물 관련 콘텐츠/정보 매거진
 */

"use client";

import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import {
    BookOpen,
    Search,
    Heart,
    Eye,
    Clock,
    Bookmark,
    Share2,
    Stethoscope,
    Utensils,
    Scissors,
    Brain,
    Home,
    Plane,
    TrendingUp,
} from "lucide-react";

import Image from "next/image";
import { TabType } from "@/types";
import { MOCK_ARTICLES, getBadgeStyle, dbArticleToMagazineArticle, type MagazineArticle } from "@/data/magazineArticles";

interface MagazinePageProps {
    setSelectedTab?: (tab: TabType) => void;
}

// 카테고리 데이터
const CATEGORIES = [
    { id: "all", label: "전체", icon: BookOpen },
    { id: "health", label: "건강/의료", icon: Stethoscope },
    { id: "food", label: "사료/영양", icon: Utensils },
    { id: "grooming", label: "미용/위생", icon: Scissors },
    { id: "behavior", label: "행동/훈련", icon: Brain },
    { id: "living", label: "생활/용품", icon: Home },
    { id: "travel", label: "여행/외출", icon: Plane },
];

export default function MagazinePage({ setSelectedTab }: MagazinePageProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [articles, setArticles] = useState<MagazineArticle[]>(MOCK_ARTICLES);

    // DB에서 기사 불러오기 (발행된 기사만)
    useEffect(() => {
        async function fetchArticles() {
            try {
                const res = await fetch("/api/magazine?limit=50");
                if (!res.ok) return;
                const data = await res.json();
                if (data.articles && data.articles.length > 0) {
                    setArticles(data.articles.map(dbArticleToMagazineArticle));
                }
            } catch {
                // DB 조회 실패시 목업 유지
            }
        }
        fetchArticles();
    }, []);

    const filteredArticles = articles.filter((article) => {
        if (selectedCategory !== "all" && article.category !== selectedCategory)
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
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-teal-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-emerald-200/30 to-teal-200/30 dark:from-emerald-800/20 dark:to-teal-800/20 rounded-full blur-3xl animate-pulse" />
            </div>

            <div className="relative z-10 space-y-6 pb-8">
                {/* 헤더 */}
                <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-white/50 dark:border-gray-700/50 rounded-3xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                                <BookOpen className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
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

                    {/* 카테고리 - 1줄(전체) + 3열 2줄 */}
                    <div className="space-y-2">
                        {/* 전체 버튼 - 1줄 */}
                        <Button
                            variant={selectedCategory === "all" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedCategory("all")}
                            className={`w-full rounded-xl ${
                                selectedCategory === "all"
                                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0"
                                    : "bg-white/50 dark:bg-gray-700/50 border-emerald-200 dark:border-emerald-700"
                            }`}
                        >
                            <BookOpen className="w-4 h-4 mr-1" />
                            전체
                        </Button>
                        {/* 나머지 카테고리 - 3열 2줄 */}
                        <div className="grid grid-cols-3 gap-2">
                            {CATEGORIES.slice(1).map((cat) => {
                                const Icon = cat.icon;
                                const isActive = selectedCategory === cat.id;
                                return (
                                    <Button
                                        key={cat.id}
                                        variant={isActive ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setSelectedCategory(cat.id)}
                                        className={`rounded-xl flex-col h-auto py-2 px-1 text-xs ${
                                            isActive
                                                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0"
                                                : "bg-white/50 dark:bg-gray-700/50 border-emerald-200 dark:border-emerald-700"
                                        }`}
                                    >
                                        <Icon className="w-4 h-4 mb-0.5" />
                                        {cat.label}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* 인기 아티클 */}
                {selectedCategory === "all" && !searchQuery && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-emerald-500" />
                            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                                인기 콘텐츠
                            </h2>
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                            {popularArticles.map((article, index) => (
                                <Card
                                    key={article.id}
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
                                                {article.badge}
                                            </Badge>
                                            <Badge className="bg-black/50 text-white rounded-lg">
                                                #{index + 1}
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
                            ))}
                        </div>
                    </div>
                )}

                {/* 아티클 목록 */}
                <div className="space-y-4">
                    {(selectedCategory !== "all" || searchQuery) && (
                        <div className="text-sm text-gray-500">
                            {filteredArticles.length}개의 콘텐츠
                        </div>
                    )}

                    {filteredArticles.map((article) => (
                        <Card
                            key={article.id}
                            className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-white/50 dark:border-gray-700/50 hover:shadow-lg transition-all duration-300 rounded-2xl cursor-pointer overflow-hidden"
                        >
                            <div className="flex flex-col sm:flex-row">
                                <div className="sm:w-48 h-40 sm:h-auto flex-shrink-0 relative">
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
                                            {article.badge}
                                        </Badge>
                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 rounded-lg"
                                            >
                                                <Bookmark className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 rounded-lg"
                                            >
                                                <Share2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 mb-2 line-clamp-1">
                                        {article.title}
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">
                                        {article.summary}
                                    </p>

                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {article.tags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="text-xs text-emerald-600 dark:text-emerald-400"
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
                                                {article.views.toLocaleString()}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Heart className="w-3 h-3" />
                                                {article.likes}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>

                {filteredArticles.length === 0 && (
                    <div className="text-center py-16">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <BookOpen className="w-10 h-10 text-gray-400" />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400">
                            해당 조건의 콘텐츠가 없습니다
                        </p>
                        <Button
                            variant="outline"
                            className="mt-4 rounded-xl"
                            onClick={() => {
                                setSelectedCategory("all");
                                setSearchQuery("");
                            }}
                        >
                            전체 보기
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
