/**
 * LocalPage.tsx
 * 지역 게시판 - 당근마켓 스타일
 * 분실/실종은 별도 페이지로 분리됨
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    MapPin,
    Search,
    Heart,
    MessageCircle,
    Clock,
    PenSquare,
    Stethoscope,
    Dog,
    Gift,
    ShoppingBag,
    Users,
    Coffee,
} from "lucide-react";

import { TabType } from "@/types";

interface LocalPageProps {
    setSelectedTab?: (tab: TabType) => void;
}

// 시/도 데이터
const REGIONS = {
    서울: [
        "강남구",
        "강동구",
        "강북구",
        "강서구",
        "관악구",
        "광진구",
        "구로구",
        "금천구",
        "노원구",
        "도봉구",
        "동대문구",
        "동작구",
        "마포구",
        "서대문구",
        "서초구",
        "성동구",
        "성북구",
        "송파구",
        "양천구",
        "영등포구",
        "용산구",
        "은평구",
        "종로구",
        "중구",
        "중랑구",
    ],
    경기: [
        "고양시",
        "과천시",
        "광명시",
        "광주시",
        "구리시",
        "군포시",
        "김포시",
        "남양주시",
        "동두천시",
        "부천시",
        "성남시",
        "수원시",
        "시흥시",
        "안산시",
        "안성시",
        "안양시",
        "양주시",
        "오산시",
        "용인시",
        "의왕시",
        "의정부시",
        "이천시",
        "파주시",
        "평택시",
        "포천시",
        "하남시",
        "화성시",
    ],
    부산: [
        "강서구",
        "금정구",
        "남구",
        "동구",
        "동래구",
        "부산진구",
        "북구",
        "사상구",
        "사하구",
        "서구",
        "수영구",
        "연제구",
        "영도구",
        "중구",
        "해운대구",
    ],
    대구: ["남구", "달서구", "동구", "북구", "서구", "수성구", "중구"],
    인천: [
        "계양구",
        "남동구",
        "동구",
        "미추홀구",
        "부평구",
        "서구",
        "연수구",
        "중구",
    ],
    광주: ["광산구", "남구", "동구", "북구", "서구"],
    대전: ["대덕구", "동구", "서구", "유성구", "중구"],
    울산: ["남구", "동구", "북구", "울주군", "중구"],
    세종: ["세종시"],
    강원: [
        "강릉시",
        "동해시",
        "삼척시",
        "속초시",
        "원주시",
        "춘천시",
        "태백시",
    ],
    충북: ["청주시", "충주시", "제천시"],
    충남: ["천안시", "아산시", "서산시", "논산시", "당진시"],
    전북: ["전주시", "군산시", "익산시", "정읍시", "남원시"],
    전남: ["목포시", "여수시", "순천시", "광양시"],
    경북: ["포항시", "경주시", "김천시", "안동시", "구미시"],
    경남: ["창원시", "진주시", "통영시", "김해시", "양산시"],
    제주: ["제주시", "서귀포시"],
};

// 카테고리 데이터 (분실/실종 제거됨)
const CATEGORIES = [
    { id: "all", label: "전체", icon: MapPin },
    { id: "hospital", label: "동물병원 추천", icon: Stethoscope },
    { id: "walk", label: "산책 메이트", icon: Dog },
    { id: "share", label: "무료 나눔", icon: Gift },
    { id: "trade", label: "중고거래", icon: ShoppingBag },
    { id: "meet", label: "모임/정모", icon: Users },
    { id: "place", label: "장소 추천", icon: Coffee },
];

// 목업 게시글 데이터
const MOCK_POSTS = [
    {
        id: 1,
        category: "hospital",
        title: "강남역 근처 좋은 동물병원 추천해주세요",
        content:
            "5살 말티즈 키우는데 건강검진 받으려고 해요. 친절하고 실력 좋은 병원 추천 부탁드려요!",
        author: "멍멍이맘",
        location: "서울 강남구",
        time: "10분 전",
        likes: 5,
        comments: 12,
        badge: "질문",
    },
    {
        id: 2,
        category: "walk",
        title: "주말 아침 한강 산책 같이 하실 분!",
        content:
            "토요일 아침 7시에 반포한강공원에서 산책해요. 소형견 친구들 환영합니다",
        author: "산책러버",
        location: "서울 서초구",
        time: "32분 전",
        likes: 8,
        comments: 6,
        badge: "모집중",
    },
    {
        id: 3,
        category: "share",
        title: "강아지 사료 나눔합니다 (로얄캐닌)",
        content:
            "우리 아이가 안 먹어서 나눔해요. 미개봉 3kg입니다. 직거래만 가능해요.",
        author: "나눔천사",
        location: "서울 송파구",
        time: "2시간 전",
        likes: 12,
        comments: 8,
        badge: "나눔",
    },
    {
        id: 4,
        category: "trade",
        title: "펫 캐리어 팝니다 (거의 새것)",
        content: "2번 사용한 펫 캐리어 판매해요. 소형견용, 택배 가능합니다.",
        author: "깔끔이",
        location: "경기 성남시",
        time: "3시간 전",
        likes: 3,
        comments: 5,
        badge: "판매",
    },
    {
        id: 5,
        category: "hospital",
        title: "24시 동물병원 다녀온 후기",
        content:
            "새벽에 갑자기 아파서 급하게 갔는데 정말 친절하고 좋았어요. 주소는 댓글로 알려드릴게요!",
        author: "고양이집사",
        location: "서울 마포구",
        time: "5시간 전",
        likes: 28,
        comments: 15,
        badge: "후기",
    },
    {
        id: 6,
        category: "place",
        title: "강아지 동반 가능한 카페 추천",
        content:
            "성수동에 강아지랑 같이 갈 수 있는 예쁜 카페 있을까요? 대형견도 가능한 곳이면 좋겠어요.",
        author: "카페탐방러",
        location: "서울 성동구",
        time: "6시간 전",
        likes: 15,
        comments: 22,
        badge: "질문",
    },
    {
        id: 7,
        category: "meet",
        title: "포메 보호자 정기 모임 멤버 모집",
        content:
            "매월 셋째주 토요일 여의도에서 포메라니안 보호자 모임해요. 관심 있으신 분 댓글 주세요!",
        author: "포메사랑",
        location: "서울 영등포구",
        time: "1일 전",
        likes: 34,
        comments: 19,
        badge: "모집중",
    },
];

// 배지 색상
const getBadgeStyle = (badge: string) => {
    switch (badge) {
        case "모집중":
            return "bg-green-500 text-white";
        case "나눔":
            return "bg-purple-500 text-white";
        case "판매":
            return "bg-orange-500 text-white";
        case "후기":
            return "bg-blue-500 text-white";
        case "질문":
            return "bg-sky-500 text-white";
        default:
            return "bg-gray-500 text-white";
    }
};

export default function LocalPage({ setSelectedTab }: LocalPageProps) {
    const [selectedRegion, setSelectedRegion] = useState<string>("");
    const [selectedDistrict, setSelectedDistrict] = useState<string>("");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState<string>("");

    const districts = selectedRegion
        ? REGIONS[selectedRegion as keyof typeof REGIONS] || []
        : [];

    const filteredPosts = MOCK_POSTS.filter((post) => {
        if (selectedCategory !== "all" && post.category !== selectedCategory) {
            return false;
        }
        if (
            searchQuery &&
            !post.title.includes(searchQuery) &&
            !post.content.includes(searchQuery)
        ) {
            return false;
        }
        return true;
    });

    return (
        <div className="min-h-screen relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-100 via-blue-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-200/30 to-sky-200/30 dark:from-blue-800/20 dark:to-sky-800/20 rounded-full blur-3xl animate-pulse" />
            </div>

            <div className="relative z-10 space-y-6 pb-8">
                {/* 헤더 */}
                <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-white/50 dark:border-gray-700/50 rounded-3xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-sky-500 rounded-xl flex items-center justify-center">
                                <MapPin className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                                    지역정보
                                </h1>
                                <p className="text-gray-600 dark:text-gray-300">
                                    우리 동네 반려동물 이야기
                                </p>
                            </div>
                        </div>
                        <Button className="bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 rounded-xl">
                            <PenSquare className="w-4 h-4 mr-2" />
                            글쓰기
                        </Button>
                    </div>

                    {/* 지역 선택 */}
                    <div className="flex flex-wrap gap-3 mb-4">
                        <Select
                            value={selectedRegion}
                            onValueChange={(v) => {
                                setSelectedRegion(v);
                                setSelectedDistrict("");
                            }}
                        >
                            <SelectTrigger className="w-40 rounded-xl bg-white/70 dark:bg-gray-700/70">
                                <SelectValue placeholder="시/도 선택" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.keys(REGIONS).map((region) => (
                                    <SelectItem key={region} value={region}>
                                        {region}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={selectedDistrict}
                            onValueChange={setSelectedDistrict}
                            disabled={!selectedRegion}
                        >
                            <SelectTrigger className="w-40 rounded-xl bg-white/70 dark:bg-gray-700/70">
                                <SelectValue placeholder="구/군 선택" />
                            </SelectTrigger>
                            <SelectContent>
                                {districts.map((district) => (
                                    <SelectItem key={district} value={district}>
                                        {district}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="flex-1 min-w-[200px] relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="검색어를 입력하세요"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 rounded-xl bg-white/70 dark:bg-gray-700/70"
                            />
                        </div>
                    </div>

                    {/* 카테고리 필터 */}
                    <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map((cat) => {
                            const Icon = cat.icon;
                            const isActive = selectedCategory === cat.id;
                            return (
                                <Button
                                    key={cat.id}
                                    variant={isActive ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`rounded-xl ${
                                        isActive
                                            ? "bg-gradient-to-r from-blue-500 to-sky-500 text-white border-0"
                                            : "bg-white/50 dark:bg-gray-700/50 border-blue-200 dark:border-blue-700"
                                    }`}
                                >
                                    <Icon className="w-4 h-4 mr-1" />
                                    {cat.label}
                                </Button>
                            );
                        })}
                    </div>
                </div>

                {/* 현재 위치 표시 */}
                {(selectedRegion || selectedDistrict) && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <MapPin className="w-4 h-4" />
                        <span className="font-medium">
                            {selectedRegion} {selectedDistrict}
                        </span>
                        <span className="text-sm text-gray-400">
                            ({filteredPosts.length}개의 글)
                        </span>
                    </div>
                )}

                {/* 게시글 목록 */}
                <div className="space-y-4">
                    {filteredPosts.map((post) => (
                        <Card
                            key={post.id}
                            className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-white/50 dark:border-gray-700/50 hover:bg-white/80 dark:hover:bg-gray-700/60 transition-all duration-300 rounded-2xl cursor-pointer"
                        >
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            className={`${getBadgeStyle(post.badge)} rounded-lg`}
                                        >
                                            {post.badge}
                                        </Badge>
                                        <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            {post.location}
                                        </span>
                                    </div>
                                    <span className="text-sm text-gray-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {post.time}
                                    </span>
                                </div>
                                <CardTitle className="text-lg text-gray-800 dark:text-gray-100 mt-2">
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

                {filteredPosts.length === 0 && (
                    <div className="text-center py-16">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <MapPin className="w-10 h-10 text-gray-400" />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400">
                            해당 조건의 게시글이 없습니다
                        </p>
                        <Button
                            variant="outline"
                            className="mt-4 rounded-xl"
                            onClick={() => {
                                setSelectedCategory("all");
                                setSearchQuery("");
                            }}
                        >
                            필터 초기화
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
