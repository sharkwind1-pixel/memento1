/**
 * RecordPage.tsx
 * 우리의 기록 - 반려동물과의 일상을 기록하는 마이페이지/앨범
 * 나중에 추모 모드로 전환 가능
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
    Camera,
    Plus,
    Heart,
    Calendar,
    MapPin,
    Image,
    Film,
    Pencil,
    Settings,
    Grid3X3,
    List,
    Star,
    Clock,
    MoreHorizontal,
    Cake,
    Weight,
    Syringe,
    Scissors,
} from "lucide-react";

import { TabType } from "@/types";

interface RecordPageProps {
    setSelectedTab?: (tab: TabType) => void;
}

// 목업 반려동물 프로필
const MY_PET = {
    name: "초코",
    type: "강아지",
    breed: "말티즈",
    birthday: "2021-03-15",
    age: "3살 10개월",
    gender: "남아",
    weight: "3.2kg",
    image: "https://images.dog.ceo/breeds/maltese/n02085936_4245.jpg",
    together: "1,392일째 함께",
    recordCount: 234,
    photoCount: 512,
};

// 목업 기록 데이터
const MOCK_RECORDS = [
    {
        id: 1,
        type: "photo",
        title: "오늘 산책 나갔다 온 초코",
        content: "날씨가 좋아서 한강까지 걸었어요. 완전 신나했음!",
        date: "2025.01.20",
        time: "15:32",
        location: "한강공원",
        likes: 12,
        images: ["https://images.dog.ceo/breeds/maltese/n02085936_4245.jpg"],
        tags: ["산책", "한강", "좋은날씨"],
    },
    {
        id: 2,
        type: "milestone",
        title: "예방접종 완료!",
        content: "종합백신 접종 완료. 다음 접종은 3개월 후.",
        date: "2025.01.18",
        time: "11:00",
        location: "우리동네 동물병원",
        likes: 8,
        images: [],
        tags: ["예방접종", "건강"],
        milestone: "health",
    },
    {
        id: 3,
        type: "photo",
        title: "간식 먹는 중",
        content: "새로 산 간식이 맛있나봐. 눈이 초롱초롱",
        date: "2025.01.17",
        time: "19:45",
        likes: 23,
        images: ["https://images.dog.ceo/breeds/maltese/n02085936_7310.jpg"],
        tags: ["간식", "먹방"],
    },
    {
        id: 4,
        type: "milestone",
        title: "미용 다녀왔어요",
        content: "여름 스타일로 짧게 잘랐어요. 시원해 보여!",
        date: "2025.01.15",
        time: "14:20",
        location: "펫미용실",
        likes: 15,
        images: ["https://images.dog.ceo/breeds/maltese/n02085936_10659.jpg"],
        tags: ["미용", "여름스타일"],
        milestone: "grooming",
    },
    {
        id: 5,
        type: "photo",
        title: "새 장난감 선물받았어",
        content: "삐삐 소리나는 장난감에 완전 빠짐",
        date: "2025.01.12",
        time: "20:15",
        likes: 18,
        images: ["https://images.dog.ceo/breeds/maltese/n02085936_11410.jpg"],
        tags: ["장난감", "선물"],
    },
    {
        id: 6,
        type: "note",
        title: "오늘 초코가 처음으로...",
        content: "손! 하니까 진짜 손을 줬어요. 너무 기특해서 간식 폭탄 투하함",
        date: "2025.01.10",
        time: "18:30",
        likes: 34,
        images: [],
        tags: ["훈련", "손", "기특해"],
    },
];

// 마일스톤 아이콘
const getMilestoneIcon = (type: string) => {
    switch (type) {
        case "health":
            return <Syringe className="w-4 h-4" />;
        case "grooming":
            return <Scissors className="w-4 h-4" />;
        case "birthday":
            return <Cake className="w-4 h-4" />;
        case "weight":
            return <Weight className="w-4 h-4" />;
        default:
            return <Star className="w-4 h-4" />;
    }
};

export default function RecordPage({ setSelectedTab }: RecordPageProps) {
    const [viewMode, setViewMode] = useState<"grid" | "list">("list");
    const [selectedFilter, setSelectedFilter] = useState<string>("all");

    const filteredRecords = MOCK_RECORDS.filter((record) => {
        if (selectedFilter === "all") return true;
        if (selectedFilter === "photo") return record.type === "photo";
        if (selectedFilter === "milestone") return record.type === "milestone";
        if (selectedFilter === "note") return record.type === "note";
        return true;
    });

    return (
        <div className="min-h-screen relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-purple-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-violet-200/30 to-purple-200/30 dark:from-violet-800/20 dark:to-purple-800/20 rounded-full blur-3xl animate-pulse" />
            </div>

            <div className="relative z-10 space-y-6 pb-8">
                {/* 프로필 카드 */}
                <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-white/50 dark:border-gray-700/50 rounded-3xl p-6">
                    <div className="flex items-start gap-6">
                        {/* 프로필 이미지 */}
                        <div className="relative">
                            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-white dark:border-gray-700 shadow-xl">
                                <img
                                    src={MY_PET.image}
                                    alt={MY_PET.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <button className="absolute bottom-0 right-0 w-8 h-8 bg-violet-500 rounded-full flex items-center justify-center text-white shadow-lg">
                                <Camera className="w-4 h-4" />
                            </button>
                        </div>

                        {/* 프로필 정보 */}
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                                    {MY_PET.name}
                                </h1>
                                <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
                                    {MY_PET.type}
                                </Badge>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="ml-auto rounded-lg"
                                >
                                    <Settings className="w-4 h-4" />
                                </Button>
                            </div>

                            <p className="text-gray-600 dark:text-gray-300 mb-3">
                                {MY_PET.breed} · {MY_PET.gender} · {MY_PET.age}
                            </p>

                            <div className="flex flex-wrap gap-4 text-sm">
                                <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                                    <Calendar className="w-4 h-4" />
                                    <span>{MY_PET.birthday}</span>
                                </div>
                                <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                                    <Weight className="w-4 h-4" />
                                    <span>{MY_PET.weight}</span>
                                </div>
                                <div className="flex items-center gap-1 text-violet-600 dark:text-violet-400 font-medium">
                                    <Heart className="w-4 h-4 fill-current" />
                                    <span>{MY_PET.together}</span>
                                </div>
                            </div>

                            {/* 통계 */}
                            <div className="flex gap-6 mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                                <div className="text-center">
                                    <div className="text-xl font-bold text-gray-800 dark:text-gray-100">
                                        {MY_PET.recordCount}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        기록
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-xl font-bold text-gray-800 dark:text-gray-100">
                                        {MY_PET.photoCount}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        사진
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 새 기록 추가 버튼 */}
                <div className="grid grid-cols-3 gap-3">
                    <Button className="h-auto py-4 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 rounded-2xl flex flex-col items-center gap-2">
                        <Camera className="w-6 h-6" />
                        <span className="text-sm">사진 기록</span>
                    </Button>
                    <Button
                        variant="outline"
                        className="h-auto py-4 rounded-2xl flex flex-col items-center gap-2 border-violet-200 dark:border-violet-700"
                    >
                        <Pencil className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                        <span className="text-sm">메모 남기기</span>
                    </Button>
                    <Button
                        variant="outline"
                        className="h-auto py-4 rounded-2xl flex flex-col items-center gap-2 border-violet-200 dark:border-violet-700"
                    >
                        <Star className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                        <span className="text-sm">특별한 날</span>
                    </Button>
                </div>

                {/* 필터 & 뷰 모드 */}
                <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                        {[
                            { id: "all", label: "전체" },
                            { id: "photo", label: "사진" },
                            { id: "milestone", label: "마일스톤" },
                            { id: "note", label: "메모" },
                        ].map((filter) => (
                            <Button
                                key={filter.id}
                                variant={
                                    selectedFilter === filter.id
                                        ? "default"
                                        : "outline"
                                }
                                size="sm"
                                onClick={() => setSelectedFilter(filter.id)}
                                className={`rounded-xl ${
                                    selectedFilter === filter.id
                                        ? "bg-gradient-to-r from-violet-500 to-purple-500 border-0"
                                        : "border-violet-200 dark:border-violet-700"
                                }`}
                            >
                                {filter.label}
                            </Button>
                        ))}
                    </div>

                    <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewMode("list")}
                            className={`rounded-lg ${viewMode === "list" ? "bg-white dark:bg-gray-700 shadow-sm" : ""}`}
                        >
                            <List className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewMode("grid")}
                            className={`rounded-lg ${viewMode === "grid" ? "bg-white dark:bg-gray-700 shadow-sm" : ""}`}
                        >
                            <Grid3X3 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* 기록 목록 */}
                {viewMode === "list" ? (
                    <div className="space-y-4">
                        {filteredRecords.map((record) => (
                            <Card
                                key={record.id}
                                className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-white/50 dark:border-gray-700/50 hover:shadow-lg transition-all duration-300 rounded-2xl cursor-pointer overflow-hidden"
                            >
                                <CardContent className="p-4">
                                    <div className="flex gap-4">
                                        {/* 이미지 */}
                                        {record.images &&
                                            record.images.length > 0 && (
                                                <div className="w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700">
                                                    <img
                                                        src={record.images[0]}
                                                        alt={record.title}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            )}

                                        {/* 내용 */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between mb-1">
                                                <div className="flex items-center gap-2">
                                                    {record.type ===
                                                        "milestone" &&
                                                        record.milestone && (
                                                            <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center text-violet-600 dark:text-violet-400">
                                                                {getMilestoneIcon(
                                                                    record.milestone,
                                                                )}
                                                            </div>
                                                        )}
                                                    <h3 className="font-bold text-gray-800 dark:text-gray-100 line-clamp-1">
                                                        {record.title}
                                                    </h3>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 rounded-lg -mr-2"
                                                >
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                            </div>

                                            <p className="text-gray-600 dark:text-gray-300 text-sm mb-2 line-clamp-2">
                                                {record.content}
                                            </p>

                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {record.tags.map((tag) => (
                                                    <span
                                                        key={tag}
                                                        className="text-xs text-violet-600 dark:text-violet-400"
                                                    >
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>

                                            <div className="flex items-center gap-4 text-xs text-gray-400">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {record.date}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {record.time}
                                                </span>
                                                {record.location && (
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {record.location}
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1 ml-auto text-violet-500">
                                                    <Heart className="w-3 h-3" />
                                                    {record.likes}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-2">
                        {filteredRecords
                            .filter((r) => r.images && r.images.length > 0)
                            .map((record) => (
                                <div
                                    key={record.id}
                                    className="aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 cursor-pointer hover:opacity-90 transition-opacity relative"
                                >
                                    <img
                                        src={record.images![0]}
                                        alt={record.title}
                                        className="w-full h-full object-cover"
                                    />
                                    {record.type === "milestone" && (
                                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center text-white">
                                            <Star className="w-3 h-3" />
                                        </div>
                                    )}
                                </div>
                            ))}
                    </div>
                )}

                {filteredRecords.length === 0 && (
                    <div className="text-center py-16">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Camera className="w-10 h-10 text-gray-400" />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400">
                            아직 기록이 없어요
                        </p>
                        <Button className="mt-4 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500">
                            <Plus className="w-4 h-4 mr-2" />첫 기록 남기기
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
