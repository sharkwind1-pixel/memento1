/**
 * CommunityPage.tsx
 * 커뮤니티 - 자유/정보/동물전용/치유(추모모드) 게시판
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
    Lightbulb,
    Eye,
    PawPrint,
    Dog,
    Cat,
    Bird,
    Fish,
    Rabbit,
    Turtle,
    Loader2,
} from "lucide-react";
import { usePets } from "@/contexts/PetContext";
import { useAuth } from "@/contexts/AuthContext";
import WritePostModal from "@/components/features/community/WritePostModal";

interface Post {
    id: string;
    userId: string;
    boardType: string;
    animalType?: string;
    badge: string;
    title: string;
    content: string;
    authorName: string;
    likes: number;
    views: number;
    comments: number;
    createdAt: string;
}

// 게시판 카테고리 - 순서: 자유 > 정보 > 동물별 > 치유(추모모드)
const BOARD_CATEGORIES = [
    {
        id: "free",
        label: "자유게시판",
        icon: Coffee,
        color: "blue",
        description: "일상과 자랑, 자유로운 이야기",
        memorialOnly: false,
    },
    {
        id: "info",
        label: "정보 게시판",
        icon: Lightbulb,
        color: "emerald",
        description: "유용한 정보와 꿀팁 공유",
        memorialOnly: false,
    },
    {
        id: "pets",
        label: "동물별 게시판",
        icon: PawPrint,
        color: "amber",
        description: "종류별 반려동물 이야기",
        memorialOnly: false,
    },
    {
        id: "healing",
        label: "치유 게시판",
        icon: Heart,
        color: "violet",
        description: "슬픔을 나누고 위로받는 공간",
        memorialOnly: true, // 추모 모드에서만 표시
    },
];

// 동물 종류 카테고리
const ANIMAL_TYPES = [
    { id: "all", label: "전체", icon: PawPrint, color: "gray" },
    { id: "dog", label: "강아지", icon: Dog, color: "amber" },
    { id: "cat", label: "고양이", icon: Cat, color: "orange" },
    { id: "bird", label: "새", icon: Bird, color: "sky" },
    { id: "fish", label: "물고기", icon: Fish, color: "blue" },
    { id: "rabbit", label: "토끼/햄스터", icon: Rabbit, color: "pink" },
    { id: "reptile", label: "파충류", icon: Turtle, color: "green" },
];

// 목업 게시글 데이터
const MOCK_POSTS = {
    free: [
        {
            id: 1,
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
            id: 2,
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
            id: 3,
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
            id: 4,
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
            id: 5,
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
            id: 6,
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
            id: 7,
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
            id: 8,
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
    pets: [
        {
            id: 13,
            title: "우리 뽀삐 오늘 간식 먹방",
            content: "얼마나 맛있게 먹는지 보세요!! 너무 귀엽지 않나요? ㅠㅠ",
            author: "뽀삐맘",
            time: "10분 전",
            likes: 234,
            comments: 45,
            views: 1234,
            badge: "먹방",
            animalType: "dog",
        },
        {
            id: 14,
            title: "고양이 숨바꼭질 천재",
            content: "박스만 보면 들어가는 우리 냥이... 찾는데 30분 걸림 ㅋㅋㅋ",
            author: "숨바꼭질",
            time: "1시간 전",
            likes: 567,
            comments: 89,
            views: 2345,
            badge: "일상",
            animalType: "cat",
        },
        {
            id: 15,
            title: "앵무새가 말을 배웠어요!",
            content: "'안녕'이랑 '밥줘' 할 줄 알아요 ㅋㅋㅋ 영상 첨부!",
            author: "앵무집사",
            time: "2시간 전",
            likes: 890,
            comments: 156,
            views: 4567,
            badge: "자랑",
            animalType: "bird",
        },
        {
            id: 16,
            title: "햄스터 쳇바퀴 풀가동 중",
            content: "새벽 3시에 운동회 시작... 소리가 ㅋㅋㅋ",
            author: "햄찌맘",
            time: "3시간 전",
            likes: 345,
            comments: 67,
            views: 1890,
            badge: "일상",
            animalType: "rabbit",
        },
        {
            id: 17,
            title: "레오파드 게코 첫 탈피 성공!",
            content: "건강하게 잘 벗었어요! 파충류 키우시는 분들 탈피 팁 공유해요",
            author: "파충류러버",
            time: "4시간 전",
            likes: 123,
            comments: 34,
            views: 890,
            badge: "정보",
            animalType: "reptile",
        },
        {
            id: 18,
            title: "베타 물고기 색깔이 더 예뻐졌어요",
            content: "수질 관리 열심히 했더니 색이 진해졌어요! 사진 보세요",
            author: "아쿠아리스트",
            time: "5시간 전",
            likes: 234,
            comments: 45,
            views: 1234,
            badge: "자랑",
            animalType: "fish",
        },
        {
            id: 19,
            title: "토끼 발톱 깎는 법 아시는 분?",
            content: "너무 무서워해서 못 깎겠어요 ㅠㅠ 팁 좀 주세요",
            author: "토끼초보",
            time: "6시간 전",
            likes: 89,
            comments: 78,
            views: 2345,
            badge: "질문",
            animalType: "rabbit",
        },
        {
            id: 20,
            title: "말티즈 미용 다녀왔어요",
            content: "곰돌이컷 했는데 너무 귀여워요 ㅠㅠ 인생컷!",
            author: "미용덕후",
            time: "7시간 전",
            likes: 567,
            comments: 89,
            views: 3456,
            badge: "자랑",
            animalType: "dog",
        },
        {
            id: 21,
            title: "코리도라스 군무 영상",
            content: "먹이 줄 때 군무 추는 거 너무 귀여워요 ㅋㅋㅋ",
            author: "열대어집사",
            time: "8시간 전",
            likes: 345,
            comments: 56,
            views: 1567,
            badge: "귀여움",
            animalType: "fish",
        },
        {
            id: 22,
            title: "스코티시폴드 빵 자세 포착",
            content: "완벽한 빵 자세... 세상 편안해 보여요",
            author: "냥스타그램",
            time: "9시간 전",
            likes: 789,
            comments: 123,
            views: 4567,
            badge: "귀여움",
            animalType: "cat",
        },
    ],
    healing: [
        {
            id: 9,
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
            id: 10,
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
            id: 11,
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
            id: 12,
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
};

// 배지 색상
const getBadgeStyle = (badge: string, boardType: string) => {
    if (boardType === "healing") {
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
    if (boardType === "free") {
        switch (badge) {
            case "자랑":
                return "bg-[#BAE6FD] text-[#0369A1] dark:bg-blue-900/50 dark:text-blue-300";
            case "일상":
                return "bg-[#E0F7FF] text-sky-700 dark:bg-sky-900/50 dark:text-sky-300";
            case "질문":
                return "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300";
            default:
                return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
        }
    }
    if (boardType === "info") {
        switch (badge) {
            case "꿀팁":
                return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300";
            case "자료":
                return "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300";
            case "정보":
                return "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300";
            case "추천":
                return "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300";
            default:
                return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
        }
    }
    if (boardType === "pets") {
        switch (badge) {
            case "먹방":
                return "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300";
            case "일상":
                return "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300";
            case "케미":
                return "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300";
            case "귀여움":
                return "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300";
            case "자랑":
                return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300";
            case "정보":
                return "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300";
            case "질문":
                return "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300";
            default:
                return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
        }
    }
    return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
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
    const { selectedPet } = usePets();
    const { user } = useAuth();
    const [selectedBoard, setSelectedBoard] = useState<string>("free");
    const [selectedAnimalType, setSelectedAnimalType] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [sortBy, setSortBy] = useState<string>("latest");

    // 실제 데이터 상태
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showWriteModal, setShowWriteModal] = useState(false);

    // 추모 모드 여부 확인
    const isMemorialMode = selectedPet?.status === "memorial";

    // 모드에 따라 게시판 필터링 (일상 모드에서는 치유 게시판 숨김)
    const visibleBoards = BOARD_CATEGORIES.filter(
        (board) => !board.memorialOnly || isMemorialMode
    );

    const currentBoard = visibleBoards.find((b) => b.id === selectedBoard) || visibleBoards[0];
    const currentColor = getCategoryColor(currentBoard.color);

    // 게시글 불러오기
    const fetchPosts = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                board: selectedBoard,
                sort: sortBy,
            });
            if (selectedAnimalType !== "all") {
                params.append("animal", selectedAnimalType);
            }
            if (searchQuery) {
                params.append("search", searchQuery);
            }

            const response = await fetch(`/api/posts?${params}`);
            const data = await response.json();

            if (data.posts) {
                setPosts(data.posts);
            }
        } catch (error) {
            console.error("게시글 로드 실패:", error);
            // 에러 시 목업 데이터로 폴백
            const mockPosts = MOCK_POSTS[selectedBoard as keyof typeof MOCK_POSTS] || [];
            setPosts(mockPosts.map((p, i) => ({
                id: String(p.id),
                userId: "",
                boardType: selectedBoard,
                animalType: (p as { animalType?: string }).animalType,
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
    }, [selectedBoard, sortBy, selectedAnimalType, searchQuery]);

    // 게시판/정렬/필터 변경 시 다시 로드
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

    // 게시판 변경 시 동물 종류 필터 초기화
    const handleBoardChange = (boardId: string) => {
        setSelectedBoard(boardId);
        setSelectedAnimalType("all");
    };

    // 글쓰기 버튼 클릭
    const handleWriteClick = () => {
        if (!user) {
            window.dispatchEvent(new CustomEvent("openAuthModal"));
            return;
        }
        setShowWriteModal(true);
    };

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* 배경 */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#F0F9FF] via-[#FAFCFF] to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-[#7DD3FC]/30 to-sky-200/30 dark:from-blue-800/20 dark:to-sky-800/20 rounded-full blur-3xl animate-pulse" />
            </div>

            <div className="relative z-10 space-y-6 pb-8">
                {/* 헤더 */}
                <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-white/50 dark:border-gray-700/50 rounded-3xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] rounded-xl flex items-center justify-center">
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
                            onClick={handleWriteClick}
                            className={`bg-gradient-to-r ${currentColor.bg} hover:opacity-90 rounded-xl`}
                        >
                            <PenSquare className="w-4 h-4 mr-2" />
                            글쓰기
                        </Button>
                    </div>

                    {/* 게시판 탭 - 모드에 따라 동적으로 표시 */}
                    <div className={`grid gap-3 mb-4 ${
                        visibleBoards.length === 4 ? "grid-cols-4" : "grid-cols-3"
                    }`}>
                        {visibleBoards.map((board) => {
                            const Icon = board.icon;
                            const isActive = selectedBoard === board.id;
                            const color = getCategoryColor(board.color);
                            return (
                                <button
                                    key={board.id}
                                    onClick={() => handleBoardChange(board.id)}
                                    className={`p-3 rounded-2xl border-2 transition-all ${
                                        isActive
                                            ? `bg-gradient-to-r ${color.bg} text-white border-transparent shadow-lg`
                                            : `bg-white/50 dark:bg-gray-700/50 ${color.border} hover:shadow-md`
                                    }`}
                                >
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Icon
                                            className={`w-4 h-4 ${isActive ? "text-white" : color.text}`}
                                        />
                                        <span
                                            className={`font-bold text-sm ${isActive ? "text-white" : "text-gray-800 dark:text-gray-100"}`}
                                        >
                                            {board.label}
                                        </span>
                                    </div>
                                    <p
                                        className={`text-xs line-clamp-1 ${isActive ? "text-white/80" : "text-gray-500 dark:text-gray-400"}`}
                                    >
                                        {board.description}
                                    </p>
                                </button>
                            );
                        })}
                    </div>

                    {/* 동물 종류 필터 - 동물별 게시판일 때만 표시 */}
                    {selectedBoard === "pets" && (
                        <div className="flex flex-wrap gap-2 mb-4 p-3 bg-amber-50/50 dark:bg-amber-900/20 rounded-xl border border-amber-200/50 dark:border-amber-700/30">
                            {ANIMAL_TYPES.map((animal) => {
                                const Icon = animal.icon;
                                const isActive = selectedAnimalType === animal.id;
                                return (
                                    <button
                                        key={animal.id}
                                        onClick={() => setSelectedAnimalType(animal.id)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                                            isActive
                                                ? "bg-amber-500 text-white shadow-md"
                                                : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-amber-100 dark:hover:bg-amber-800/30 border border-amber-200 dark:border-amber-700/50"
                                        }`}
                                    >
                                        <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-amber-500"}`} />
                                        {animal.label}
                                    </button>
                                );
                            })}
                        </div>
                    )}

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
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
                        </div>
                    ) : (
                        posts.map((post) => (
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
                                            {formatTime(post.createdAt)}
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
                boardType={selectedBoard}
                onSuccess={fetchPosts}
            />
        </div>
    );
}
