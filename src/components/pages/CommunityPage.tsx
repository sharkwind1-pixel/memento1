/**
 * CommunityPage.tsx
 * 커뮤니티 - 5개 서브카테고리 (자유/추모/입양/지역/분실)
 * v2: 말머리 시스템 추가, 서브카테고리 통합
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Card,
    CardContent,
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
    Coffee,
    Eye,
    Cloud,
    MapPin,
    AlertTriangle,
    MoreHorizontal,
    Flag,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ReportModal from "@/components/modals/ReportModal";
import PawLoading from "@/components/ui/PawLoading";
import { toast } from "sonner";
import { usePets } from "@/contexts/PetContext";
import { ImageIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import WritePostModal from "@/components/features/community/WritePostModal";
import PostDetailView from "@/components/features/community/PostDetailView";
import type { CommunitySubcategory, PostTag, CommunityPageProps } from "@/types";

interface Post {
    id: string;
    userId: string;
    subcategory: CommunitySubcategory;
    tag?: PostTag;
    badge: string;
    title: string;
    content: string;
    authorName: string;
    likes: number;
    views: number;
    comments: number;
    imageUrls?: string[];
    createdAt: string;
    isPublic?: boolean;
}

// 서브카테고리 정의 (5개)
const SUBCATEGORIES: {
    id: CommunitySubcategory;
    label: string;
    icon: React.ElementType;
    color: string;
    description: string;
    memorialOnly?: boolean;
}[] = [
    {
        id: "free",
        label: "자유게시판",
        icon: Coffee,
        color: "blue",
        description: "일상, 정보, 질문 등 자유로운 이야기",
    },
    {
        id: "memorial",
        label: "추모게시판",
        icon: Cloud,
        color: "violet",
        description: "슬픔을 나누고 위로받는 공간",
        memorialOnly: true,
    },
    {
        id: "adoption",
        label: "입양정보",
        icon: Heart,
        color: "rose",
        description: "새 가족을 기다리는 친구들",
    },
    {
        id: "local",
        label: "지역정보",
        icon: MapPin,
        color: "emerald",
        description: "우리 동네 반려동물 정보",
    },
    {
        id: "lost",
        label: "분실동물",
        icon: AlertTriangle,
        color: "amber",
        description: "분실/발견 동물 찾기",
    },
];

// 자유게시판 말머리(태그) 옵션
const POST_TAGS: { id: PostTag; label: string; color: string }[] = [
    { id: "일상", label: "일상", color: "sky" },
    { id: "정보", label: "정보", color: "emerald" },
    { id: "질문", label: "질문", color: "amber" },
    { id: "강아지", label: "강아지", color: "orange" },
    { id: "고양이", label: "고양이", color: "pink" },
    { id: "새", label: "새", color: "cyan" },
    { id: "물고기", label: "물고기", color: "blue" },
    { id: "토끼", label: "토끼", color: "rose" },
    { id: "파충류", label: "파충류", color: "green" },
];

// 목업 게시글 데이터 (서브카테고리별)
const MOCK_POSTS: Record<CommunitySubcategory, {
    id: number;
    title: string;
    content: string;
    author: string;
    time: string;
    likes: number;
    comments: number;
    views: number;
    badge: string;
    tag?: PostTag;
}[]> = {
    free: [
        {
            id: 1,
            title: "우리 뭉치 첫 산책 성공!",
            content: "드디어 밖을 무서워하던 뭉치가 산책에 성공했어요! 사진 보세요",
            author: "뭉치맘",
            time: "30분 전",
            likes: 342,
            comments: 56,
            views: 1567,
            badge: "자랑",
            tag: "강아지",
        },
        {
            id: 2,
            title: "고양이 집사 4년차인데 아직도 모르겠는 것들",
            content: "왜 새벽 4시에 운동회를 하는 걸까요... 여러분 고양이도 그런가요?",
            author: "냥집사",
            time: "1시간 전",
            likes: 567,
            comments: 234,
            views: 3456,
            badge: "일상",
            tag: "고양이",
        },
        {
            id: 3,
            title: "강아지 슬개골 탈구 수술 후기 (비용 포함)",
            content: "수술 고민하시는 분들 참고하세요. 병원 선택부터 회복까지 상세히 적어봤어요.",
            author: "정보왕",
            time: "6시간 전",
            likes: 789,
            comments: 156,
            views: 5678,
            badge: "꿀팁",
            tag: "정보",
        },
        {
            id: 4,
            title: "강아지 이름 추천해주세요!",
            content: "곧 새 가족이 올 예정인데 이름을 못 정하겠어요. 갈색 푸들이에요!",
            author: "예비보호자",
            time: "4시간 전",
            likes: 123,
            comments: 189,
            views: 2345,
            badge: "질문",
            tag: "질문",
        },
        {
            id: 5,
            title: "앵무새가 말을 배웠어요!",
            content: "'안녕'이랑 '밥줘' 할 줄 알아요 ㅋㅋㅋ 영상 첨부!",
            author: "앵무집사",
            time: "2시간 전",
            likes: 890,
            comments: 156,
            views: 4567,
            badge: "자랑",
            tag: "새",
        },
    ],
    memorial: [
        {
            id: 9,
            title: "우리 콩이가 떠난 지 한 달이 되었어요",
            content: "아직도 콩이 밥그릇 보면 눈물이 나요. 15년을 함께했는데...",
            author: "콩이엄마",
            time: "2시간 전",
            likes: 156,
            comments: 89,
            views: 1234,
            badge: "위로",
        },
        {
            id: 10,
            title: "무지개다리를 건넌 초코에게",
            content: "초코야, 아프지 말고 편히 쉬어. 다음 생에 꼭 다시 만나자. 사랑해.",
            author: "초코아빠",
            time: "5시간 전",
            likes: 234,
            comments: 67,
            views: 2156,
            badge: "추억",
        },
        {
            id: 11,
            title: "반려동물 장례 경험 공유드려요",
            content: "처음이라 많이 당황했는데, 혹시 도움이 될까 해서 제 경험 공유드립니다.",
            author: "나눔이",
            time: "1일 전",
            likes: 89,
            comments: 45,
            views: 987,
            badge: "정보",
        },
    ],
    adoption: [
        {
            id: 20,
            title: "말티즈 믹스 2살, 새 가족 찾아요",
            content: "순둥이 성격, 예방접종 완료, 중성화 완료입니다.",
            author: "임보맘",
            time: "1시간 전",
            likes: 45,
            comments: 12,
            views: 567,
            badge: "입양",
        },
        {
            id: 21,
            title: "길냥이 구조했어요 (새끼 3마리)",
            content: "생후 2개월 추정, 건강 검진 완료. 좋은 가족 찾습니다.",
            author: "캣맘",
            time: "3시간 전",
            likes: 123,
            comments: 34,
            views: 890,
            badge: "긴급",
        },
        {
            id: 22,
            title: "토끼 분양합니다 (무료)",
            content: "이사 가게 되어 안타깝지만 새 가족 찾아요. 물품 함께 드려요.",
            author: "토끼아빠",
            time: "5시간 전",
            likes: 67,
            comments: 23,
            views: 678,
            badge: "분양",
        },
    ],
    local: [
        {
            id: 30,
            title: "[강남] 좋은 동물병원 추천드려요",
            content: "친절하고 실력 좋은 병원 찾았어요! 주차도 편해요.",
            author: "강남집사",
            time: "2시간 전",
            likes: 234,
            comments: 45,
            views: 1234,
            badge: "추천",
        },
        {
            id: 31,
            title: "[분당] 반려동물 동반 카페 신규 오픈",
            content: "대형견도 OK, 넓은 공간에 간식도 맛있어요!",
            author: "카페러버",
            time: "4시간 전",
            likes: 178,
            comments: 34,
            views: 890,
            badge: "정보",
        },
        {
            id: 32,
            title: "[서초] 산책 메이트 구해요",
            content: "저녁 7시쯤 양재천에서 같이 산책하실 분~",
            author: "산책러",
            time: "6시간 전",
            likes: 56,
            comments: 23,
            views: 456,
            badge: "모임",
        },
    ],
    lost: [
        {
            id: 40,
            title: "[긴급] 강남역 근처 말티즈 분실",
            content: "하얀 말티즈, 빨간 목줄. 보신 분 연락 부탁드려요!",
            author: "급한맘",
            time: "30분 전",
            likes: 89,
            comments: 45,
            views: 567,
            badge: "분실",
        },
        {
            id: 41,
            title: "[발견] 잠실 롯데월드 근처 고양이",
            content: "회색 줄무늬 고양이, 목줄 없음. 보호 중이에요.",
            author: "발견자",
            time: "1시간 전",
            likes: 123,
            comments: 34,
            views: 678,
            badge: "발견",
        },
        {
            id: 42,
            title: "[분실] 홍대입구역 비글 찾습니다",
            content: "갈색/흰색 비글, 이름 '콩이', 사례금 있습니다.",
            author: "찾아요",
            time: "3시간 전",
            likes: 156,
            comments: 56,
            views: 890,
            badge: "분실",
        },
    ],
};

// 배지 색상 (서브카테고리별)
const getBadgeStyle = (badge: string, subcategory: CommunitySubcategory) => {
    if (subcategory === "memorial") {
        switch (badge) {
            case "위로":
                return "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300";
            case "추억":
                return "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300";
            case "정보":
                return "bg-[#BAE6FD] text-[#0369A1] dark:bg-blue-900/50 dark:text-blue-300";
            case "고민":
                return "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300";
            default:
                return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
        }
    }
    if (subcategory === "free") {
        switch (badge) {
            case "자랑":
                return "bg-[#BAE6FD] text-[#0369A1] dark:bg-blue-900/50 dark:text-blue-300";
            case "일상":
                return "bg-[#E0F7FF] text-sky-700 dark:bg-sky-900/50 dark:text-sky-300";
            case "질문":
                return "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300";
            case "꿀팁":
                return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300";
            default:
                return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
        }
    }
    if (subcategory === "adoption") {
        switch (badge) {
            case "입양":
                return "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300";
            case "긴급":
                return "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300";
            case "분양":
                return "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300";
            default:
                return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
        }
    }
    if (subcategory === "local") {
        switch (badge) {
            case "추천":
                return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300";
            case "정보":
                return "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300";
            case "모임":
                return "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300";
            default:
                return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
        }
    }
    if (subcategory === "lost") {
        switch (badge) {
            case "분실":
                return "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300";
            case "발견":
                return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300";
            case "완료":
                return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
            default:
                return "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300";
        }
    }
    return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
};

// 말머리 태그 색상
const getTagColor = (color: string) => {
    const colors: Record<string, string> = {
        sky: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 border-sky-200 dark:border-sky-700",
        emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700",
        amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border-amber-200 dark:border-amber-700",
        orange: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 border-orange-200 dark:border-orange-700",
        pink: "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300 border-pink-200 dark:border-pink-700",
        cyan: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300 border-cyan-200 dark:border-cyan-700",
        blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-blue-200 dark:border-blue-700",
        rose: "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 border-rose-200 dark:border-rose-700",
        green: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 border-green-200 dark:border-green-700",
    };
    return colors[color] || colors.sky;
};

// 카테고리 색상
const getCategoryColor = (color: string) => {
    switch (color) {
        case "violet":
            return {
                bg: "from-violet-500 to-purple-500",
                text: "text-violet-600 dark:text-violet-400",
                border: "border-violet-200 dark:border-violet-700",
                light: "bg-violet-50 dark:bg-violet-900/30",
            };
        case "blue":
            return {
                bg: "from-[#05B2DC] to-[#38BDF8]",
                text: "text-[#0891B2] dark:text-[#38BDF8]",
                border: "border-[#7DD3FC] dark:border-[#0369A1]",
                light: "bg-[#E0F7FF] dark:bg-blue-900/30",
            };
        case "emerald":
            return {
                bg: "from-emerald-500 to-teal-500",
                text: "text-emerald-600 dark:text-emerald-400",
                border: "border-emerald-200 dark:border-emerald-700",
                light: "bg-emerald-50 dark:bg-emerald-900/30",
            };
        case "amber":
            return {
                bg: "from-amber-500 to-orange-500",
                text: "text-amber-600 dark:text-amber-400",
                border: "border-amber-200 dark:border-amber-700",
                light: "bg-amber-50 dark:bg-amber-900/30",
            };
        case "rose":
            return {
                bg: "from-rose-500 to-pink-500",
                text: "text-rose-600 dark:text-rose-400",
                border: "border-rose-200 dark:border-rose-700",
                light: "bg-rose-50 dark:bg-rose-900/30",
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

export default function CommunityPage({ subcategory, onSubcategoryChange }: CommunityPageProps) {
    const { selectedPet } = usePets();
    const { user } = useAuth();

    // 서브카테고리 상태 (props 또는 내부 상태)
    const [internalSubcategory, setInternalSubcategory] = useState<CommunitySubcategory>(subcategory || "free");
    const currentSubcategory = subcategory || internalSubcategory;

    // 말머리 필터 (자유게시판용)
    const [selectedTag, setSelectedTag] = useState<PostTag | "all">("all");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [sortBy, setSortBy] = useState<string>("latest");

    // 실제 데이터 상태
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showWriteModal, setShowWriteModal] = useState(false);
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

    // 신고 모달 상태
    const [reportTarget, setReportTarget] = useState<{
        id: string;
        type: "post" | "comment" | "user";
        title?: string;
    } | null>(null);

    // 추모 모드 여부 확인
    const isMemorialMode = selectedPet?.status === "memorial";

    // 모드에 따라 서브카테고리 필터링 (일상 모드에서는 추모게시판 숨김)
    const visibleSubcategories = SUBCATEGORIES.filter(
        (sub) => !sub.memorialOnly || isMemorialMode
    );

    const currentSubcategoryInfo = visibleSubcategories.find((s) => s.id === currentSubcategory) || visibleSubcategories[0];
    const currentColor = getCategoryColor(currentSubcategoryInfo.color);

    // 서브카테고리 변경 핸들러
    const handleSubcategoryChange = (subId: CommunitySubcategory) => {
        if (onSubcategoryChange) {
            onSubcategoryChange(subId);
        } else {
            setInternalSubcategory(subId);
        }
        setSelectedTag("all"); // 말머리 필터 초기화
    };

    // 게시글 불러오기
    const fetchPosts = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                board: currentSubcategory,
                sort: sortBy,
            });
            if (selectedTag !== "all") {
                params.append("tag", selectedTag);
            }
            if (searchQuery) {
                params.append("search", searchQuery);
            }

            const response = await fetch(`/api/posts?${params}`);
            if (!response.ok) {
                throw new Error("게시글을 불러오는데 실패했습니다");
            }
            const data = await response.json();

            if (data.posts && data.posts.length > 0) {
                setPosts(data.posts.map((p: Post & { boardType?: string; animalType?: string }) => ({
                    ...p,
                    subcategory: p.subcategory || p.boardType || currentSubcategory,
                    tag: p.tag || p.animalType,
                })));
            } else if (data.posts) {
                setPosts([]);
            } else {
                throw new Error("API 응답 없음");
            }
        } catch {
            // 에러 시 목업 데이터로 폴백 + 사용자 알림
            toast.error("게시글을 불러오지 못했습니다. 샘플 데이터를 표시합니다.");
            const mockPosts = MOCK_POSTS[currentSubcategory] || [];
            let filteredPosts = mockPosts;

            // 자유게시판 말머리 필터링
            if (currentSubcategory === "free" && selectedTag !== "all") {
                filteredPosts = mockPosts.filter(p => p.tag === selectedTag);
            }

            setPosts(filteredPosts.map((p) => ({
                id: String(p.id),
                userId: "",
                subcategory: currentSubcategory,
                tag: p.tag,
                badge: p.badge,
                title: p.title,
                content: p.content,
                authorName: p.author,
                likes: p.likes,
                views: p.views,
                comments: p.comments,
                createdAt: new Date().toISOString(),
            })));
        } finally {
            setIsLoading(false);
        }
    }, [currentSubcategory, sortBy, selectedTag, searchQuery]);

    // 서브카테고리/정렬/필터 변경 시 다시 로드
    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    // 시간 포맷
    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return "방금 전";
        if (minutes < 60) return `${minutes}분 전`;
        if (hours < 24) return `${hours}시간 전`;
        if (days < 7) return `${days}일 전`;
        return date.toLocaleDateString("ko-KR");
    };

    // 글쓰기 버튼 클릭
    const handleWriteClick = () => {
        if (!user) {
            window.dispatchEvent(new CustomEvent("openAuthModal"));
            return;
        }
        setShowWriteModal(true);
    };

    // 상세보기 모드
    if (selectedPostId) {
        return (
            <div
                className="min-h-screen relative overflow-hidden"
                style={{ contain: 'layout style', transform: 'translateZ(0)' }}
            >
                <div className="absolute inset-0 bg-gradient-to-br from-[#F0F9FF] via-[#FAFCFF] to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-[#7DD3FC]/30 to-sky-200/30 dark:from-blue-800/20 dark:to-sky-800/20 rounded-full blur-3xl animate-pulse" />
                </div>
                <div className="relative z-10 pb-8">
                    <PostDetailView
                        postId={selectedPostId}
                        subcategory={currentSubcategory}
                        onBack={() => setSelectedPostId(null)}
                        onPostDeleted={fetchPosts}
                    />
                </div>
            </div>
        );
    }

    return (
        <div
            className="min-h-screen relative overflow-hidden"
            style={{ contain: 'layout style', transform: 'translateZ(0)' }}
        >
            {/* 배경 */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#F0F9FF] via-[#FAFCFF] to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-[#7DD3FC]/30 to-sky-200/30 dark:from-blue-800/20 dark:to-sky-800/20 rounded-full blur-3xl animate-pulse" />
            </div>

            <div className="relative z-10 space-y-6 pb-8">
                {/* 헤더 */}
                <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-white/50 dark:border-gray-700/50 rounded-3xl p-6">
                    <div className="flex items-center justify-between gap-3 mb-6">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] rounded-xl flex items-center justify-center flex-shrink-0">
                                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
                                    커뮤니티
                                </h1>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    함께 나누는 이야기
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={handleWriteClick}
                            className={`bg-gradient-to-r ${currentColor.bg} hover:opacity-90 rounded-xl flex-shrink-0 px-3 sm:px-4`}
                        >
                            <PenSquare className="w-4 h-4 sm:mr-2" />
                            <span className="hidden sm:inline">글쓰기</span>
                        </Button>
                    </div>

                    {/* 서브카테고리 탭 - 모바일 최적화 (5개) */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 mb-4">
                        {visibleSubcategories.map((sub) => {
                            const Icon = sub.icon;
                            const isActive = currentSubcategory === sub.id;
                            const color = getCategoryColor(sub.color);
                            return (
                                <button
                                    key={sub.id}
                                    onClick={() => handleSubcategoryChange(sub.id)}
                                    className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border-2 transition-all ${
                                        isActive
                                            ? `bg-gradient-to-r ${color.bg} text-white border-transparent shadow-lg`
                                            : `bg-white/50 dark:bg-gray-700/50 ${color.border} hover:shadow-md`
                                    }`}
                                >
                                    <div className="flex items-center justify-center sm:justify-start gap-1.5">
                                        <Icon
                                            className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-white" : color.text}`}
                                        />
                                        <span
                                            className={`font-bold text-xs sm:text-sm whitespace-nowrap ${isActive ? "text-white" : "text-gray-800 dark:text-gray-100"}`}
                                        >
                                            {sub.label}
                                        </span>
                                    </div>
                                    <p
                                        className={`text-xs mt-1 hidden sm:block truncate ${isActive ? "text-white/80" : "text-gray-500 dark:text-gray-400"}`}
                                    >
                                        {sub.description}
                                    </p>
                                </button>
                            );
                        })}
                    </div>

                    {/* 말머리 필터 - 자유게시판일 때만 표시 */}
                    {currentSubcategory === "free" && (
                        <div className="flex flex-wrap gap-2 mb-4 p-3 bg-blue-50/50 dark:bg-blue-900/20 rounded-xl border border-blue-200/50 dark:border-blue-700/30">
                            <button
                                onClick={() => setSelectedTag("all")}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                                    selectedTag === "all"
                                        ? "bg-[#05B2DC] text-white shadow-md"
                                        : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-800/30 border border-blue-200 dark:border-blue-700/50"
                                }`}
                            >
                                전체
                            </button>
                            {POST_TAGS.map((tag) => {
                                const isActive = selectedTag === tag.id;
                                return (
                                    <button
                                        key={tag.id}
                                        onClick={() => setSelectedTag(tag.id)}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                                            isActive
                                                ? getTagColor(tag.color).replace("border-", "border-transparent bg-").split(" ").slice(0, 2).join(" ") + " text-white shadow-md"
                                                : getTagColor(tag.color)
                                        }`}
                                    >
                                        {tag.label}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* 검색 & 정렬 - 모바일 최적화 */}
                    <div className="space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="검색어를 입력하세요"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                maxLength={100}
                                className="pl-10 rounded-xl bg-white/70 dark:bg-gray-700/70"
                            />
                        </div>
                        <div className="flex justify-center sm:justify-end">
                            <div className="inline-flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                                {[
                                    { id: "latest", label: "최신", icon: Clock },
                                    { id: "popular", label: "인기", icon: TrendingUp },
                                    { id: "comments", label: "댓글", icon: MessageCircle },
                                ].map((sort) => {
                                    const Icon = sort.icon;
                                    return (
                                        <Button
                                            key={sort.id}
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setSortBy(sort.id)}
                                            className={`rounded-lg px-2 sm:px-3 ${sortBy === sort.id ? "bg-white dark:bg-gray-700 shadow-sm" : ""}`}
                                        >
                                            <Icon className="w-4 h-4 sm:mr-1" />
                                            <span className="hidden sm:inline">{sort.label}</span>
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 게시글 목록 */}
                <div className="space-y-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <PawLoading size="lg" />
                        </div>
                    ) : (
                        posts.map((post) => (
                            <Card
                                key={post.id}
                                onClick={() => setSelectedPostId(post.id)}
                                className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-white/50 dark:border-gray-700/50 hover:bg-white/80 dark:hover:bg-gray-700/60 transition-all duration-300 rounded-2xl cursor-pointer"
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                className={`${getBadgeStyle(post.badge, currentSubcategory)} rounded-lg`}
                                            >
                                                {post.badge}
                                            </Badge>
                                            {/* 자유게시판 말머리 표시 */}
                                            {currentSubcategory === "free" && post.tag && (
                                                <Badge variant="outline" className="rounded-lg text-xs">
                                                    {post.tag}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-400 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatTime(post.createdAt)}
                                            </span>
                                            {/* 더보기 메뉴 (신고) */}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button
                                                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                                                        onClick={(e) => e.stopPropagation()}
                                                        aria-label="더보기"
                                                    >
                                                        <MoreHorizontal className="w-4 h-4 text-gray-400" />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (!user) {
                                                                window.dispatchEvent(new CustomEvent("openAuthModal"));
                                                                return;
                                                            }
                                                            setReportTarget({
                                                                id: post.id,
                                                                type: "post",
                                                                title: post.title,
                                                            });
                                                        }}
                                                        className="text-red-500 focus:text-red-600"
                                                    >
                                                        <Flag className="w-4 h-4 mr-2" />
                                                        신고하기
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                    <CardTitle className="text-lg text-gray-800 dark:text-gray-100 mt-2 line-clamp-1">
                                        {post.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pb-2">
                                    <p className="text-gray-600 dark:text-gray-300 line-clamp-2">
                                        {post.content}
                                    </p>
                                    {post.imageUrls && post.imageUrls.length > 0 && (
                                        <div className="flex items-center gap-1 mt-2 text-xs text-sky-500">
                                            <ImageIcon className="w-3.5 h-3.5" />
                                            <span>이미지 {post.imageUrls.length}장</span>
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="flex items-center justify-between pt-2">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        {post.authorName}
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
                        ))
                    )}
                </div>

                {/* 게시글 없을 때 */}
                {!isLoading && posts.length === 0 && (
                    <div className="text-center py-16">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="w-10 h-10 text-gray-400" />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400">
                            {searchQuery ? "검색 결과가 없습니다" : "아직 게시글이 없습니다"}
                        </p>
                        {searchQuery ? (
                            <Button
                                variant="outline"
                                className="mt-4 rounded-xl"
                                onClick={() => setSearchQuery("")}
                            >
                                전체 보기
                            </Button>
                        ) : (
                            <Button
                                onClick={handleWriteClick}
                                className={`mt-4 bg-gradient-to-r ${currentColor.bg} rounded-xl`}
                            >
                                <PenSquare className="w-4 h-4 mr-2" />
                                첫 글 작성하기
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* 글쓰기 모달 */}
            <WritePostModal
                isOpen={showWriteModal}
                onClose={() => setShowWriteModal(false)}
                boardType={currentSubcategory}
                onSuccess={fetchPosts}
            />

            {/* 신고 모달 */}
            {reportTarget && (
                <ReportModal
                    isOpen={true}
                    onClose={() => setReportTarget(null)}
                    targetType={reportTarget.type}
                    targetId={reportTarget.id}
                    targetTitle={reportTarget.title}
                />
            )}
        </div>
    );
}
