/**
 * CommunityPage.tsx
 * 커뮤니티 - 치유/자유/정보 게시판
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
    Users,
    Heart,
    MessageCircle,
    Clock,
    PenSquare,
    Search,
    TrendingUp,
    Zap,
    Crown,
    Sparkles,
    Coffee,
    Lightbulb,
    Eye,
} from "lucide-react";

// 게시판 카테고리
const BOARD_CATEGORIES = [
    {
        id: "healing",
        label: "치유 게시판",
        icon: Heart,
        color: "violet",
        description: "슬픔을 나누고 위로받는 공간",
    },
    {
        id: "free",
        label: "자유게시판",
        icon: Coffee,
        color: "blue",
        description: "일상과 자랑, 자유로운 이야기",
    },
    {
        id: "info",
        label: "정보 게시판",
        icon: Lightbulb,
        color: "emerald",
        description: "유용한 정보와 꿀팁 공유",
    },
];

// 목업 게시글 데이터
const MOCK_POSTS = {
    healing: [
        {
            id: 1,
            title: "우리 콩이가 떠난 지 한 달이 되었어요",
            content:
                "아직도 콩이 밥그릇 보면 눈물이 나요. 15년을 함께했는데... 여러분은 어떻게 극복하셨나요?",
            author: "콩이엄마",
            time: "2시간 전",
            likes: 156,
            comments: 89,
            views: 1234,
            badge: "위로",
        },
        {
            id: 2,
            title: "무지개다리를 건넌 초코에게",
            content:
                "초코야, 아프지 말고 편히 쉬어. 다음 생에 꼭 다시 만나자. 사랑해.",
            author: "초코아빠",
            time: "5시간 전",
            likes: 234,
            comments: 67,
            views: 2156,
            badge: "추억",
        },
        {
            id: 3,
            title: "반려동물 장례 경험 공유드려요",
            content:
                "처음이라 많이 당황했는데, 혹시 도움이 될까 해서 제 경험 공유드립니다.",
            author: "나눔이",
            time: "1일 전",
            likes: 89,
            comments: 45,
            views: 987,
            badge: "정보",
        },
        {
            id: 4,
            title: "치료 포기 결정이 너무 힘들어요",
            content:
                "의사 선생님이 고통만 길어질 거라고... 어떻게 해야 할지 모르겠어요.",
            author: "힘든보호자",
            time: "3시간 전",
            likes: 78,
            comments: 123,
            views: 876,
            badge: "고민",
        },
    ],
    free: [
        {
            id: 5,
            title: "우리 뭉치 첫 산책 성공!",
            content:
                "드디어 밖을 무서워하던 뭉치가 산책에 성공했어요! 사진 보세요 ㅠㅠ",
            author: "뭉치맘",
            time: "30분 전",
            likes: 342,
            comments: 56,
            views: 1567,
            badge: "자랑",
        },
        {
            id: 6,
            title: "고양이 집사 4년차인데 아직도 모르겠는 것들",
            content:
                "왜 새벽 4시에 운동회를 하는 걸까요... 여러분 고양이도 그런가요?",
            author: "냥집사",
            time: "1시간 전",
            likes: 567,
            comments: 234,
            views: 3456,
            badge: "일상",
        },
        {
            id: 7,
            title: "강아지 이름 추천해주세요!",
            content:
                "곧 새 가족이 올 예정인데 이름을 못 정하겠어요. 갈색 푸들이에요!",
            author: "예비보호자",
            time: "4시간 전",
            likes: 123,
            comments: 189,
            views: 2345,
            badge: "질문",
        },
        {
            id: 8,
            title: "오늘 미용 다녀왔어요",
            content: "숲속요정 스타일로 해달라고 했는데 어떤가요? ㅋㅋㅋ",
            author: "미용덕후",
            time: "2시간 전",
            likes: 456,
            comments: 78,
            views: 1890,
            badge: "자랑",
        },
    ],
    info: [
        {
            id: 9,
            title: "강아지 슬개골 탈구 수술 후기 (비용 포함)",
            content:
                "수술 고민하시는 분들 참고하세요. 병원 선택부터 회복까지 상세히 적어봤어요.",
            author: "정보왕",
            time: "6시간 전",
            likes: 789,
            comments: 156,
            views: 5678,
            badge: "꿀팁",
        },
        {
            id: 10,
            title: "사료 브랜드별 성분 비교표 만들어봤어요",
            content: "인기 사료 20개 성분 비교해봤습니다. 첨부파일 참고하세요!",
            author: "분석맨",
            time: "1일 전",
            likes: 1234,
            comments: 234,
            views: 8901,
            badge: "자료",
        },
        {
            id: 11,
            title: "반려동물 보험 가입 전 체크리스트",
            content:
                "보험 가입하려는데 뭘 봐야할지 모르겠다는 분들 참고하세요.",
            author: "보험전문가",
            time: "2일 전",
            likes: 567,
            comments: 89,
            views: 4567,
            badge: "정보",
        },
        {
            id: 12,
            title: "서울 강남/서초 좋은 동물병원 리스트",
            content:
                "제가 다녀본 병원들 솔직 후기입니다. 진료비도 참고로 적어봤어요.",
            author: "강남집사",
            time: "3일 전",
            likes: 890,
            comments: 345,
            views: 7890,
            badge: "추천",
        },
    ],
};

// 배지 색상
const getBadgeStyle = (badge: string, boardType: string) => {
    // 치유 게시판
    if (boardType === "healing") {
        switch (badge) {
            case "위로":
                return "bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300";
            case "추억":
                return "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300";
            case "정보":
                return "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300";
            case "고민":
                return "bg-pink-100 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300";
            default:
                return "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300";
        }
    }
    // 자유게시판
    if (boardType === "free") {
        switch (badge) {
            case "자랑":
                return "bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300";
            case "일상":
                return "bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300";
            case "질문":
                return "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300";
            default:
                return "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300";
        }
    }
    // 정보 게시판
    switch (badge) {
        case "꿀팁":
            return "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300";
        case "자료":
            return "bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300";
        case "정보":
            return "bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300";
        case "추천":
            return "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300";
        default:
            return "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300";
    }
};

// 카테고리 색상
const getCategoryColor = (colorName: string) => {
    switch (colorName) {
        case "violet":
            return {
                bg: "from-violet-500 to-purple-500",
                text: "text-violet-600 dark:text-violet-400",
                border: "border-violet-200 dark:border-violet-700",
                light: "bg-violet-50 dark:bg-violet-900/30",
            };
        case "blue":
            return {
                bg: "from-blue-500 to-sky-500",
                text: "text-blue-600 dark:text-blue-400",
                border: "border-blue-200 dark:border-blue-700",
                light: "bg-blue-50 dark:bg-blue-900/30",
            };
        case "emerald":
            return {
                bg: "from-emerald-500 to-teal-500",
                text: "text-emerald-600 dark:text-emerald-400",
                border: "border-emerald-200 dark:border-emerald-700",
                light: "bg-emerald-50 dark:bg-emerald-900/30",
            };
        default:
            return {
                bg: "from-gray-500 to-gray-600",
                text: "text-gray-600 dark:text-gray-400",
                border: "border-gray-200 dark:border-gray-700",
                light: "bg-gray-50 dark:bg-gray-900/30",
            };
    }
};

export default function CommunityPage() {
    const [selectedBoard, setSelectedBoard] = useState<string>("healing");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [sortBy, setSortBy] = useState<string>("latest");

    const currentBoard = BOARD_CATEGORIES.find((b) => b.id === selectedBoard)!;
    const currentColor = getCategoryColor(currentBoard.color);
    const posts = MOCK_POSTS[selectedBoard as keyof typeof MOCK_POSTS] || [];

    const filteredPosts = posts.filter(
        (post) =>
            searchQuery === "" ||
            post.title.includes(searchQuery) ||
            post.content.includes(searchQuery),
    );

    const sortedPosts = [...filteredPosts].sort((a, b) => {
        if (sortBy === "popular") return b.likes - a.likes;
        if (sortBy === "comments") return b.comments - a.comments;
        return 0; // latest (기본)
    });

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* 배경 */}
            <div className="absolute inset-0 bg-gradient-to-br from-sky-100 via-blue-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-200/30 to-sky-200/30 dark:from-blue-800/20 dark:to-sky-800/20 rounded-full blur-3xl animate-pulse" />
            </div>

            <div className="relative z-10 space-y-6 pb-8">
                {/* 헤더 */}
                <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-white/50 dark:border-gray-700/50 rounded-3xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-sky-500 rounded-xl flex items-center justify-center">
                                <Users className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                                    커뮤니티
                                </h1>
                                <p className="text-gray-600 dark:text-gray-300">
                                    함께 나누는 이야기
                                </p>
                            </div>
                        </div>
                        <Button
                            className={`bg-gradient-to-r ${currentColor.bg} hover:opacity-90 rounded-xl`}
                        >
                            <PenSquare className="w-4 h-4 mr-2" />
                            글쓰기
                        </Button>
                    </div>

                    {/* 게시판 탭 */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        {BOARD_CATEGORIES.map((board) => {
                            const Icon = board.icon;
                            const isActive = selectedBoard === board.id;
                            const color = getCategoryColor(board.color);
                            return (
                                <button
                                    key={board.id}
                                    onClick={() => setSelectedBoard(board.id)}
                                    className={`p-4 rounded-2xl border-2 transition-all ${
                                        isActive
                                            ? `bg-gradient-to-r ${color.bg} text-white border-transparent shadow-lg`
                                            : `bg-white/50 dark:bg-gray-700/50 ${color.border} hover:shadow-md`
                                    }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <Icon
                                            className={`w-5 h-5 ${isActive ? "text-white" : color.text}`}
                                        />
                                        <span
                                            className={`font-bold ${isActive ? "text-white" : "text-gray-800 dark:text-gray-100"}`}
                                        >
                                            {board.label}
                                        </span>
                                    </div>
                                    <p
                                        className={`text-xs ${isActive ? "text-white/80" : "text-gray-500 dark:text-gray-400"}`}
                                    >
                                        {board.description}
                                    </p>
                                </button>
                            );
                        })}
                    </div>

                    {/* 검색 & 정렬 */}
                    <div className="flex gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="검색어를 입력하세요"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 rounded-xl bg-white/70 dark:bg-gray-700/70"
                            />
                        </div>
                        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                            {[
                                { id: "latest", label: "최신", icon: Clock },
                                {
                                    id: "popular",
                                    label: "인기",
                                    icon: TrendingUp,
                                },
                                {
                                    id: "comments",
                                    label: "댓글",
                                    icon: MessageCircle,
                                },
                            ].map((sort) => {
                                const Icon = sort.icon;
                                return (
                                    <Button
                                        key={sort.id}
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSortBy(sort.id)}
                                        className={`rounded-lg ${sortBy === sort.id ? "bg-white dark:bg-gray-700 shadow-sm" : ""}`}
                                    >
                                        <Icon className="w-4 h-4 mr-1" />
                                        {sort.label}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* 게시글 목록 */}
                <div className="space-y-4">
                    {sortedPosts.map((post) => (
                        <Card
                            key={post.id}
                            className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-white/50 dark:border-gray-700/50 hover:bg-white/80 dark:hover:bg-gray-700/60 transition-all duration-300 rounded-2xl cursor-pointer"
                        >
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            className={`${getBadgeStyle(post.badge, selectedBoard)} rounded-lg`}
                                        >
                                            {post.badge}
                                        </Badge>
                                    </div>
                                    <span className="text-sm text-gray-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {post.time}
                                    </span>
                                </div>
                                <CardTitle className="text-lg text-gray-800 dark:text-gray-100 mt-2 line-clamp-1">
                                    {post.title}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pb-2">
                                <p className="text-gray-600 dark:text-gray-300 line-clamp-2">
                                    {post.content}
                                </p>
                            </CardContent>
                            <CardFooter className="flex items-center justify-between pt-2">
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {post.author}
                                </span>
                                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                    <span className="flex items-center gap-1">
                                        <Eye className="w-4 h-4" />
                                        {post.views.toLocaleString()}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Heart className="w-4 h-4" />
                                        {post.likes}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <MessageCircle className="w-4 h-4" />
                                        {post.comments}
                                    </span>
                                </div>
                            </CardFooter>
                        </Card>
                    ))}
                </div>

                {/* 게시글 없을 때 */}
                {sortedPosts.length === 0 && (
                    <div className="text-center py-16">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="w-10 h-10 text-gray-400" />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400">
                            검색 결과가 없습니다
                        </p>
                        <Button
                            variant="outline"
                            className="mt-4 rounded-xl"
                            onClick={() => setSearchQuery("")}
                        >
                            전체 보기
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
