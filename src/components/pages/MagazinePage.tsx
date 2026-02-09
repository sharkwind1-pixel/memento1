/**
 * MagazinePage.tsx
 * 펫매거진 - 반려동물 관련 콘텐츠/정보 매거진
 */

"use client";

import { useState } from "react";
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

// 목업 매거진 데이터
const MOCK_ARTICLES = [
    {
        id: 1,
        category: "health",
        title: "강아지 예방접종, 언제 어떤 것을 맞춰야 할까?",
        summary:
            "강아지를 키우기 시작했다면 가장 먼저 챙겨야 할 것이 예방접종입니다. 시기별로 필요한 접종과 주의사항을 알아보세요.",
        author: "수의사 김태호",
        authorRole: "반려동물 전문 수의사",
        date: "2025.01.20",
        readTime: "5분",
        views: 2340,
        likes: 156,
        badge: "필독",
        image: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400",
        tags: ["예방접종", "강아지건강", "필수정보"],
    },
    {
        id: 2,
        category: "food",
        title: "수제간식 vs 시판간식, 어떤 게 더 좋을까?",
        summary:
            "반려동물 간식 선택이 고민되시나요? 각각의 장단점과 선택 기준을 자세히 알려드립니다.",
        author: "펫영양사 이수진",
        authorRole: "반려동물 영양 컨설턴트",
        date: "2025.01.19",
        readTime: "7분",
        views: 1892,
        likes: 98,
        badge: "인기",
        image: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400",
        tags: ["간식", "영양", "수제간식"],
    },
    {
        id: 3,
        category: "behavior",
        title: "분리불안, 이렇게 극복하세요",
        summary:
            "출근할 때마다 짖고 우는 강아지, 혼자 있으면 물건을 망가뜨리는 고양이. 분리불안 해결 방법을 알아봅니다.",
        author: "훈련사 박지훈",
        authorRole: "반려동물 행동교정 전문가",
        date: "2025.01.18",
        readTime: "10분",
        views: 3567,
        likes: 234,
        badge: "추천",
        image: "https://images.unsplash.com/photo-1544568100-847a948585b9?w=400",
        tags: ["분리불안", "행동교정", "훈련"],
    },
    {
        id: 4,
        category: "grooming",
        title: "집에서 하는 발톱 깎기, 이것만 알면 OK",
        summary:
            "발톱 깎기가 두려우신가요? 안전하고 스트레스 없이 집에서 발톱을 관리하는 방법을 알려드립니다.",
        author: "미용사 최예린",
        authorRole: "펫 그루밍 전문가",
        date: "2025.01.17",
        readTime: "4분",
        views: 1234,
        likes: 87,
        badge: "팁",
        image: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=400",
        tags: ["발톱관리", "그루밍", "홈케어"],
    },
    {
        id: 5,
        category: "living",
        title: "겨울철 반려동물 난방, 이렇게 해주세요",
        summary:
            "추운 겨울, 반려동물도 따뜻하게! 적정 온도와 난방 시 주의사항을 체크해보세요.",
        author: "에디터 정민아",
        authorRole: "펫매거진 에디터",
        date: "2025.01.16",
        readTime: "6분",
        views: 2089,
        likes: 143,
        badge: "시즌",
        image: "https://images.unsplash.com/photo-1415369629372-26f2fe60c467?w=400",
        tags: ["겨울", "난방", "계절케어"],
    },
    {
        id: 6,
        category: "travel",
        title: "강아지와 첫 여행, 준비물 체크리스트",
        summary:
            "반려동물과 함께하는 첫 여행! 꼭 챙겨야 할 준비물과 주의사항을 정리했습니다.",
        author: "에디터 김하늘",
        authorRole: "펫매거진 에디터",
        date: "2025.01.15",
        readTime: "8분",
        views: 1567,
        likes: 112,
        badge: "가이드",
        image: "https://images.unsplash.com/photo-1601758124510-52d02ddb7cbd?w=400",
        tags: ["여행", "준비물", "체크리스트"],
    },
    {
        id: 7,
        category: "health",
        title: "노견/노묘 케어 가이드",
        summary:
            "나이 든 반려동물을 위한 특별한 케어. 노화에 따른 변화와 관리 방법을 알아보세요.",
        author: "수의사 이정민",
        authorRole: "노령동물 전문 수의사",
        date: "2025.01.14",
        readTime: "12분",
        views: 4521,
        likes: 312,
        badge: "심화",
        image: "https://images.unsplash.com/photo-1558788353-f76d92427f16?w=400",
        tags: ["노견", "노묘", "시니어케어"],
    },
];

// 배지 색상
const getBadgeStyle = (badge: string) => {
    switch (badge) {
        case "필독":
            return "bg-red-500 text-white";
        case "인기":
            return "bg-orange-500 text-white";
        case "추천":
            return "bg-blue-500 text-white";
        case "팁":
            return "bg-green-500 text-white";
        case "시즌":
            return "bg-purple-500 text-white";
        case "가이드":
            return "bg-sky-500 text-white";
        case "심화":
            return "bg-indigo-500 text-white";
        default:
            return "bg-gray-500 text-white";
    }
};

export default function MagazinePage({ setSelectedTab }: MagazinePageProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState<string>("");

    const filteredArticles = MOCK_ARTICLES.filter((article) => {
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
    const popularArticles = [...MOCK_ARTICLES]
        .sort((a, b) => b.views - a.views)
        .slice(0, 3);

    return (
        <div className="min-h-screen relative overflow-hidden">
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
