/**
 * LostPage.tsx
 * 분실동물 찾기 페이지
 * 실종 / 발견 신고 및 검색
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
    Search,
    AlertTriangle,
    MapPin,
    Clock,
    Phone,
    PenSquare,
    Eye,
    Calendar,
    Dog,
    Cat,
    Gift,
    Heart,
    Share2,
    MessageCircle,
} from "lucide-react";

import { TabType } from "@/types";

interface LostPageProps {
    setSelectedTab?: (tab: TabType) => void;
}

// 시/도 데이터
const REGIONS = {
    전체: [],
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
        "부천시",
        "성남시",
        "수원시",
        "안산시",
        "안양시",
        "용인시",
        "의정부시",
        "파주시",
        "평택시",
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
    강원: ["강릉시", "동해시", "속초시", "원주시", "춘천시"],
    충북: ["청주시", "충주시", "제천시"],
    충남: ["천안시", "아산시", "서산시", "당진시"],
    전북: ["전주시", "군산시", "익산시"],
    전남: ["목포시", "여수시", "순천시"],
    경북: ["포항시", "경주시", "구미시", "안동시"],
    경남: ["창원시", "진주시", "김해시", "양산시"],
    제주: ["제주시", "서귀포시"],
};

// 목업 분실동물 데이터
const MOCK_LOST_PETS = [
    {
        id: 1,
        type: "lost" as const,
        title: "포메라니안 찾습니다 (사례금 100만원)",
        petType: "강아지",
        breed: "포메라니안",
        color: "크림색",
        gender: "수컷",
        age: "3살",
        location: "서울 강남구 역삼역 근처",
        date: "2025-01-18",
        description:
            "빨간 목줄 착용, 겁이 많아서 도망갈 수 있어요. 발견하시면 꼭 연락 부탁드려요.",
        author: "급해요ㅠㅠ",
        time: "1시간 전",
        views: 1523,
        reward: "100만원",
        image: "https://images.dog.ceo/breeds/pomeranian/n02112018_5765.jpg",
    },
    {
        id: 2,
        type: "lost" as const,
        title: "검은 고양이 실종",
        petType: "고양이",
        breed: "코리안숏헤어",
        color: "검정",
        gender: "암컷",
        age: "2살",
        location: "서울 마포구 연남동",
        date: "2025-01-19",
        description:
            "목에 파란 방울 달린 목걸이 착용. 사람을 좋아하지만 겁이 많아요.",
        author: "냥이찾아요",
        time: "3시간 전",
        views: 892,
        image: "https://cdn2.thecatapi.com/images/9j5.jpg",
    },
    {
        id: 3,
        type: "found" as const,
        title: "비글 발견했습니다 (송파구)",
        petType: "강아지",
        breed: "비글",
        color: "갈색/흰색",
        gender: "수컷",
        age: "추정 1~2살",
        location: "서울 송파구 올림픽공원 앞",
        date: "2025-01-20",
        description:
            "목줄 없이 혼자 돌아다니고 있었어요. 현재 임시보호 중입니다.",
        author: "착한사람",
        time: "30분 전",
        views: 234,
        image: "https://images.dog.ceo/breeds/beagle/n02088364_16194.jpg",
    },
    {
        id: 4,
        type: "lost" as const,
        title: "말티즈 실종 (치료 중인 아이입니다)",
        petType: "강아지",
        breed: "말티즈",
        color: "흰색",
        gender: "암컷",
        age: "8살",
        location: "경기 성남시 분당구",
        date: "2025-01-17",
        description:
            "심장병 치료 중이라 약을 먹어야 해요. 급하게 찾고 있습니다.",
        author: "제발요",
        time: "2일 전",
        views: 3456,
        reward: "50만원",
        image: "https://images.dog.ceo/breeds/maltese/n02085936_4245.jpg",
    },
    {
        id: 5,
        type: "found" as const,
        title: "치와와 발견 (용산구)",
        petType: "강아지",
        breed: "치와와",
        color: "갈색",
        gender: "암컷",
        age: "추정 5살 이상",
        location: "서울 용산구 이태원역 근처",
        date: "2025-01-20",
        description: "분홍색 옷 입고 있었어요. 보호소로 인계 예정입니다.",
        author: "이태원주민",
        time: "2시간 전",
        views: 156,
        image: "https://images.dog.ceo/breeds/chihuahua/n02085620_5927.jpg",
    },
];

export default function LostPage({ setSelectedTab }: LostPageProps) {
    const [selectedType, setSelectedType] = useState<string>("all");
    const [selectedRegion, setSelectedRegion] = useState<string>("전체");
    const [selectedDistrict, setSelectedDistrict] = useState<string>("");
    const [selectedPetType, setSelectedPetType] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState<string>("");

    const districts =
        selectedRegion && selectedRegion !== "전체"
            ? REGIONS[selectedRegion as keyof typeof REGIONS] || []
            : [];

    const filteredPets = MOCK_LOST_PETS.filter((pet) => {
        if (selectedType !== "all" && pet.type !== selectedType) return false;
        if (selectedPetType !== "all" && pet.petType !== selectedPetType)
            return false;
        if (
            searchQuery &&
            !pet.title.includes(searchQuery) &&
            !pet.description.includes(searchQuery) &&
            !pet.breed.includes(searchQuery)
        )
            return false;
        return true;
    });

    const lostCount = MOCK_LOST_PETS.filter((p) => p.type === "lost").length;
    const foundCount = MOCK_LOST_PETS.filter((p) => p.type === "found").length;

    return (
        <div className="min-h-screen relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-red-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-orange-200/30 to-red-200/30 dark:from-orange-800/20 dark:to-red-800/20 rounded-full blur-3xl animate-pulse" />
            </div>

            <div className="relative z-10 space-y-6 pb-8">
                {/* 헤더 */}
                <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-white/50 dark:border-gray-700/50 rounded-3xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                                <Search className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                                    분실동물 찾기
                                </h1>
                                <p className="text-gray-600 dark:text-gray-300">
                                    잃어버린 가족을 찾아요
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="rounded-xl border-orange-300 text-orange-600 hover:bg-orange-50"
                            >
                                <AlertTriangle className="w-4 h-4 mr-2" />
                                실종 신고
                            </Button>
                            <Button className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-xl">
                                <Eye className="w-4 h-4 mr-2" />
                                발견 신고
                            </Button>
                        </div>
                    </div>

                    {/* 통계 */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-orange-100/50 dark:bg-orange-900/20 rounded-2xl p-4 text-center">
                            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                                {lostCount}
                            </div>
                            <div className="text-sm text-orange-700 dark:text-orange-300">
                                실종 신고
                            </div>
                        </div>
                        <div className="bg-green-100/50 dark:bg-green-900/20 rounded-2xl p-4 text-center">
                            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                                {foundCount}
                            </div>
                            <div className="text-sm text-green-700 dark:text-green-300">
                                발견 신고
                            </div>
                        </div>
                    </div>

                    {/* 필터 */}
                    <div className="space-y-4">
                        {/* 실종/발견 타입 */}
                        <div className="flex gap-2">
                            <Button
                                variant={
                                    selectedType === "all"
                                        ? "default"
                                        : "outline"
                                }
                                size="sm"
                                onClick={() => setSelectedType("all")}
                                className={`rounded-xl ${selectedType === "all" ? "bg-gradient-to-r from-orange-500 to-red-500 border-0" : ""}`}
                            >
                                전체
                            </Button>
                            <Button
                                variant={
                                    selectedType === "lost"
                                        ? "default"
                                        : "outline"
                                }
                                size="sm"
                                onClick={() => setSelectedType("lost")}
                                className={`rounded-xl ${selectedType === "lost" ? "bg-orange-500 border-0" : "border-orange-300 text-orange-600"}`}
                            >
                                <AlertTriangle className="w-4 h-4 mr-1" />
                                실종
                            </Button>
                            <Button
                                variant={
                                    selectedType === "found"
                                        ? "default"
                                        : "outline"
                                }
                                size="sm"
                                onClick={() => setSelectedType("found")}
                                className={`rounded-xl ${selectedType === "found" ? "bg-green-500 border-0" : "border-green-300 text-green-600"}`}
                            >
                                <Eye className="w-4 h-4 mr-1" />
                                발견
                            </Button>
                        </div>

                        {/* 지역 & 동물 종류 */}
                        <div className="flex flex-wrap gap-3">
                            <Select
                                value={selectedRegion}
                                onValueChange={(v) => {
                                    setSelectedRegion(v);
                                    setSelectedDistrict("");
                                }}
                            >
                                <SelectTrigger className="w-32 rounded-xl bg-white/70 dark:bg-gray-700/70">
                                    <SelectValue placeholder="시/도" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.keys(REGIONS).map((region) => (
                                        <SelectItem key={region} value={region}>
                                            {region}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {districts.length > 0 && (
                                <Select
                                    value={selectedDistrict}
                                    onValueChange={setSelectedDistrict}
                                >
                                    <SelectTrigger className="w-32 rounded-xl bg-white/70 dark:bg-gray-700/70">
                                        <SelectValue placeholder="구/군" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {districts.map((district) => (
                                            <SelectItem
                                                key={district}
                                                value={district}
                                            >
                                                {district}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            <Select
                                value={selectedPetType}
                                onValueChange={setSelectedPetType}
                            >
                                <SelectTrigger className="w-32 rounded-xl bg-white/70 dark:bg-gray-700/70">
                                    <SelectValue placeholder="동물 종류" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">전체</SelectItem>
                                    <SelectItem value="강아지">
                                        강아지
                                    </SelectItem>
                                    <SelectItem value="고양이">
                                        고양이
                                    </SelectItem>
                                    <SelectItem value="기타">기타</SelectItem>
                                </SelectContent>
                            </Select>

                            <div className="flex-1 min-w-[200px] relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="품종, 특징 등 검색"
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                    className="pl-10 rounded-xl bg-white/70 dark:bg-gray-700/70"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 게시글 목록 */}
                <div className="grid gap-4 md:grid-cols-2">
                    {filteredPets.map((pet) => (
                        <Card
                            key={pet.id}
                            className={`bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-2 hover:shadow-lg transition-all duration-300 rounded-2xl cursor-pointer overflow-hidden ${
                                pet.type === "lost"
                                    ? "border-orange-200 dark:border-orange-700/50 hover:border-orange-300"
                                    : "border-green-200 dark:border-green-700/50 hover:border-green-300"
                            }`}
                        >
                            <div className="flex">
                                {/* 이미지 */}
                                <div className="w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0 bg-gray-100 dark:bg-gray-700 relative">
                                    {pet.image && (
                                        <img
                                            src={pet.image}
                                            alt={pet.title}
                                            className="w-full h-full object-cover"
                                        />
                                    )}
                                    <Badge
                                        className={`absolute top-2 left-2 ${
                                            pet.type === "lost"
                                                ? "bg-orange-500"
                                                : "bg-green-500"
                                        } text-white`}
                                    >
                                        {pet.type === "lost" ? "실종" : "발견"}
                                    </Badge>
                                    {pet.reward && (
                                        <Badge className="absolute bottom-2 left-2 bg-yellow-500 text-white">
                                            <Gift className="w-3 h-3 mr-1" />
                                            {pet.reward}
                                        </Badge>
                                    )}
                                </div>

                                {/* 정보 */}
                                <div className="flex-1 p-4">
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className="font-bold text-gray-800 dark:text-gray-100 line-clamp-1">
                                            {pet.title}
                                        </h3>
                                    </div>

                                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300 mb-3">
                                        <div className="flex items-center gap-2">
                                            {pet.petType === "강아지" ? (
                                                <Dog className="w-4 h-4" />
                                            ) : (
                                                <Cat className="w-4 h-4" />
                                            )}
                                            <span>
                                                {pet.breed} / {pet.color} /{" "}
                                                {pet.gender}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4" />
                                            <span className="line-clamp-1">
                                                {pet.location}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4" />
                                            <span>
                                                {pet.type === "lost"
                                                    ? "실종일"
                                                    : "발견일"}
                                                : {pet.date}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-gray-400">
                                        <div className="flex items-center gap-3">
                                            <span className="flex items-center gap-1">
                                                <Eye className="w-3 h-3" />
                                                {pet.views}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {pet.time}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 px-2 rounded-lg"
                                            >
                                                <Heart className="w-3 h-3" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 px-2 rounded-lg"
                                            >
                                                <Share2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>

                {filteredPets.length === 0 && (
                    <div className="text-center py-16">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="w-10 h-10 text-gray-400" />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400">
                            해당 조건의 게시글이 없습니다
                        </p>
                        <Button
                            variant="outline"
                            className="mt-4 rounded-xl"
                            onClick={() => {
                                setSelectedType("all");
                                setSelectedPetType("all");
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
