/**
 * 추모공간 페이지 - 하늘나라 친구들과의 소중한 추억
 * "기억으로 남기기"의 완성된 형태
 * 3D Dome Gallery + 파란하늘 테마
 */

"use client";

import { useState, useEffect } from "react";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Cloud,
    Heart,
    Calendar,
    MessageCircle,
    Star,
    Camera,
    Clock,
    User,
    Quote,
    Sparkles,
} from "lucide-react";
import { EmotionalTrueFocus } from "../ui/TrueFocus";
// import { MemorialDomeGallery } from "../ui/DomeGallery";
import { usePetImages } from "@/hooks/usePetImages";

// 추모 기록 타입
interface MemorialMemory {
    id: string;
    title: string;
    content: string;
    imageUrl: string;
    date: string;
    emotion: "happy" | "peaceful" | "grateful" | "loving";
    viewCount: number;
    petName: string;
    memoryType: "photo" | "story" | "moment";
}

// 하늘나라 친구 타입
interface SkyFriend {
    id: string;
    name: string;
    species: string;
    breed: string;
    livedYears: string;
    passedDate: string;
    profileImage: string;
    totalMemories: number;
    lastMemory: string;
    status: "memorial"; // Life → Memorial 전환된 상태
    ownerMessage: string;
}

// 임시 데모 데이터
const mockSkyFriends: SkyFriend[] = [
    {
        id: "1",
        name: "하늘이",
        species: "강아지",
        breed: "골든리트리버",
        livedYears: "12년",
        passedDate: "2024-01-15",
        profileImage: "/api/placeholder/300/300",
        totalMemories: 156,
        lastMemory: "마지막 산책",
        status: "memorial",
        ownerMessage: "항상 내 곁에 있어줘서 고마웠어, 하늘이야",
    },
    {
        id: "2",
        name: "별이",
        species: "고양이",
        breed: "러시안 블루",
        livedYears: "15년",
        passedDate: "2023-12-20",
        profileImage: "/api/placeholder/300/300",
        totalMemories: 203,
        lastMemory: "따뜻한 무릎",
        status: "memorial",
        ownerMessage:
            "우아하고 신비로운 별이, 지금도 어딘가에서 나를 지켜보고 있겠지",
    },
];

const mockMemories: MemorialMemory[] = [
    {
        id: "1",
        title: "첫 만남의 기억",
        content:
            "작고 떨고 있던 하늘이를 처음 집에 데려온 그날. 무서워하면서도 꼬리를 살짝 흔들던 모습이 지금도 선명해요.",
        imageUrl: "/api/placeholder/300/300",
        date: "2012-03-15",
        emotion: "loving",
        viewCount: 24,
        petName: "하늘이",
        memoryType: "moment",
    },
    {
        id: "2",
        title: "함께한 여름 바다",
        content:
            "처음 바다를 본 하늘이의 반응. 파도 소리에 놀라면서도 모래 위를 신나게 뛰어다니던 모습.",
        imageUrl: "/api/placeholder/300/300",
        date: "2015-07-22",
        emotion: "happy",
        viewCount: 31,
        petName: "하늘이",
        memoryType: "photo",
    },
    {
        id: "3",
        title: "별이의 새벽 인사",
        content:
            "매일 새벽 5시면 어김없이 내 얼굴을 핥으며 깨우던 별이. 그때는 귀찮았는데 지금은 그리워요.",
        imageUrl: "/api/placeholder/300/300",
        date: "2020-08-10",
        emotion: "grateful",
        viewCount: 18,
        petName: "별이",
        memoryType: "story",
    },
    {
        id: "4",
        title: "마지막 따뜻한 햇살",
        content:
            "창가에서 햇살을 받으며 평온하게 잠들어 있던 하늘이. 그 따뜻한 표정이 마음에 남아있어요.",
        imageUrl: "/api/placeholder/300/300",
        date: "2024-01-10",
        emotion: "peaceful",
        viewCount: 45,
        petName: "하늘이",
        memoryType: "moment",
    },
    {
        id: "5",
        title: "별이의 특별한 자리",
        content:
            "언제나 내 책상 모니터 앞에 자리 잡고 앉아 나를 지켜보던 별이의 모습.",
        imageUrl: "/api/placeholder/300/300",
        date: "2021-11-30",
        emotion: "loving",
        viewCount: 22,
        petName: "별이",
        memoryType: "photo",
    },
    {
        id: "6",
        title: "함께한 마지막 크리스마스",
        content:
            "산타 모자를 쓰고 함께 찍었던 마지막 크리스마스 사진. 그때도 여전히 밝게 웃었던 하늘이.",
        imageUrl: "/api/placeholder/300/300",
        date: "2023-12-25",
        emotion: "grateful",
        viewCount: 67,
        petName: "하늘이",
        memoryType: "photo",
    },
];

export default function MemorialPage() {
    const { petImages } = usePetImages();
    const [selectedFriend, setSelectedFriend] = useState<SkyFriend | null>(
        mockSkyFriends[0]
    );
    const [selectedMemories, setSelectedMemories] =
        useState<MemorialMemory[]>(mockMemories);
    const [activeTab, setActiveTab] = useState("dome");

    // 선택된 친구의 추억 필터링
    useEffect(() => {
        if (selectedFriend) {
            const friendMemories = mockMemories.filter(
                (memory) => memory.petName === selectedFriend.name
            );
            setSelectedMemories(friendMemories);
        }
    }, [selectedFriend]);

    // 감정별 색상
    const getEmotionColor = (emotion: string) => {
        switch (emotion) {
            case "happy":
                return "text-yellow-600 dark:text-yellow-400";
            case "peaceful":
                return "text-blue-600 dark:text-blue-400";
            case "grateful":
                return "text-green-600 dark:text-green-400";
            case "loving":
                return "text-red-500 dark:text-red-400";
            default:
                return "text-gray-600 dark:text-gray-400";
        }
    };

    // 추억 타입 아이콘
    const getMemoryTypeIcon = (type: string) => {
        switch (type) {
            case "photo":
                return <Camera className="w-4 h-4" />;
            case "story":
                return <Quote className="w-4 h-4" />;
            case "moment":
                return <Star className="w-4 h-4" />;
            default:
                return <Heart className="w-4 h-4" />;
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* 하늘 배경 (더 몽환적으로) */}
            <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-blue-50 via-white to-sky-100 dark:from-gray-900 dark:via-blue-900/20 dark:to-gray-800 transition-colors duration-300">
                {/* 구름 같은 애니메이션 효과들 */}
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-white/30 to-sky-100/30 dark:from-blue-800/10 dark:to-sky-800/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-gradient-to-r from-blue-100/30 to-white/30 dark:from-sky-800/10 dark:to-blue-700/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
                <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-gradient-to-r from-sky-100/30 to-blue-50/30 dark:from-blue-700/10 dark:to-sky-700/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
                {/* 페이지 헤더 */}
                <div className="text-center mb-12">
                    <div className="flex items-center justify-center mb-4">
                        <Cloud className="w-8 h-8 text-blue-500 dark:text-blue-400 mr-3" />
                        <h1 className="text-5xl md:text-6xl font-bold">
                            <EmotionalTrueFocus
                                text="하늘나라 친구들"
                                variant="memorial"
                                className="bg-gradient-to-r from-blue-600 via-sky-500 to-blue-700 dark:from-blue-400 dark:via-sky-300 dark:to-blue-500 bg-clip-text text-transparent"
                                delay={300}
                            />
                        </h1>
                    </div>

                    <div className="mt-6">
                        <EmotionalTrueFocus
                            text="파란하늘에 간직된 소중한 추억들과 다시 만나는 특별한 공간"
                            variant="gentle"
                            className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed"
                            delay={1200}
                        />
                    </div>
                </div>

                {/* 하늘나라 친구들 선택 */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4 text-center">
                        함께할 친구를 선택하세요
                    </h2>
                    <div className="flex justify-center gap-4 flex-wrap">
                        {mockSkyFriends.map((friend, index) => (
                            <Button
                                key={friend.id}
                                variant={
                                    selectedFriend?.id === friend.id
                                        ? "default"
                                        : "outline"
                                }
                                className={`${
                                    selectedFriend?.id === friend.id
                                        ? "bg-gradient-to-r from-blue-500 to-sky-500 text-white"
                                        : "bg-white/70 dark:bg-gray-700/70 border-blue-200 dark:border-blue-600"
                                } p-4 h-auto flex-col`}
                                onClick={() => setSelectedFriend(friend)}
                            >
                                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-400 to-sky-400 flex items-center justify-center mb-2">
                                    <Cloud className="w-6 h-6 text-white" />
                                </div>
                                <div className="text-center">
                                    <div className="font-bold">
                                        {friend.name}
                                    </div>
                                    <div className="text-xs opacity-75">
                                        {friend.breed}
                                    </div>
                                    <div className="text-xs">
                                        {friend.totalMemories}개의 추억
                                    </div>
                                </div>
                            </Button>
                        ))}
                    </div>
                </div>

                {selectedFriend && (
                    <>
                        {/* 친구 소개 카드 */}
                        <div className="mb-8">
                            <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border-white/50 dark:border-gray-700/50 shadow-xl">
                                <CardHeader className="text-center">
                                    <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-r from-blue-400 to-sky-400 flex items-center justify-center mb-4">
                                        <Cloud className="w-12 h-12 text-white" />
                                    </div>
                                    <CardTitle className="text-3xl text-gray-800 dark:text-gray-100">
                                        {selectedFriend.name}
                                    </CardTitle>
                                    <div className="flex justify-center gap-4 text-sm text-gray-600 dark:text-gray-300 mt-2">
                                        <span>
                                            {selectedFriend.species} •{" "}
                                            {selectedFriend.breed}
                                        </span>
                                        <span>
                                            함께한 시간:{" "}
                                            {selectedFriend.livedYears}
                                        </span>
                                    </div>
                                    <div className="mt-4 p-4 bg-blue-50/50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                                        <Quote className="w-5 h-5 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                                        <p className="text-gray-700 dark:text-gray-200 italic">
                                            {selectedFriend.ownerMessage}
                                        </p>
                                    </div>
                                </CardHeader>
                            </Card>
                        </div>

                        {/* 추억 보기 탭 */}
                        <Tabs
                            value={activeTab}
                            onValueChange={setActiveTab}
                            className="w-full"
                        >
                            <TabsList className="grid w-full grid-cols-2 mb-8 bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg">
                                <TabsTrigger
                                    value="dome"
                                    className="flex items-center gap-2"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    3D 추억 돔
                                </TabsTrigger>
                                <TabsTrigger
                                    value="timeline"
                                    className="flex items-center gap-2"
                                >
                                    <Clock className="w-4 h-4" />
                                    추억 타임라인
                                </TabsTrigger>
                            </TabsList>

                            {/* 3D Dome Gallery */}
                            <TabsContent value="dome" className="space-y-6">
                                <div className="text-center mb-6">
                                    <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                                        <EmotionalTrueFocus
                                            text="하늘을 감싼 소중한 추억들"
                                            variant="memorial"
                                            delay={300}
                                        />
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-300">
                                        {selectedFriend.name}와 함께한{" "}
                                        {selectedMemories.length}개의 특별한
                                        순간들
                                    </p>
                                </div>

                                {/* Memorial Dome Gallery */}
                                {selectedMemories.length > 0 && (
                                    <MemorialDomeGallery
                                        memories={selectedMemories.map(
                                            (memory, index) => ({
                                                ...memory,
                                                imageUrl:
                                                    petImages[
                                                        index % petImages.length
                                                    ] ||
                                                    "/api/placeholder/300/300",
                                            })
                                        )}
                                        onMemoryClick={(memory) => {
                                            console.log(
                                                "Memory clicked:",
                                                memory
                                            );
                                            // 추억 상세보기 모달
                                        }}
                                    />
                                )}
                            </TabsContent>

                            {/* 타임라인 뷰 */}
                            <TabsContent value="timeline" className="space-y-6">
                                <div className="text-center mb-6">
                                    <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                                        시간의 흐름에 따른 추억
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-300">
                                        {selectedFriend.name}와의 소중했던 모든
                                        순간들
                                    </p>
                                </div>

                                {/* 추억 타임라인 */}
                                <div className="space-y-6">
                                    {selectedMemories
                                        .sort(
                                            (a, b) =>
                                                new Date(b.date).getTime() -
                                                new Date(a.date).getTime()
                                        )
                                        .map((memory, index) => (
                                            <Card
                                                key={memory.id}
                                                className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border-white/50 dark:border-gray-700/50 shadow-xl"
                                            >
                                                <CardContent className="p-6">
                                                    <div className="flex gap-4">
                                                        <div className="flex-shrink-0">
                                                            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-blue-100 to-sky-100 dark:from-blue-900/30 dark:to-sky-900/30 overflow-hidden">
                                                                <img
                                                                    src={
                                                                        petImages[
                                                                            index %
                                                                                petImages.length
                                                                        ]
                                                                    }
                                                                    alt={
                                                                        memory.title
                                                                    }
                                                                    className="w-full h-full object-cover"
                                                                    onError={(
                                                                        e
                                                                    ) => {
                                                                        e.currentTarget.style.display =
                                                                            "none";
                                                                        const parent =
                                                                            e
                                                                                .currentTarget
                                                                                .parentElement;
                                                                        if (
                                                                            parent &&
                                                                            !parent.querySelector(
                                                                                ".fallback-icon"
                                                                            )
                                                                        ) {
                                                                            const fallback =
                                                                                document.createElement(
                                                                                    "div"
                                                                                );
                                                                            fallback.className =
                                                                                "fallback-icon w-full h-full flex items-center justify-center";
                                                                            fallback.innerHTML = `<div class="text-2xl text-blue-400">${getMemoryTypeIcon(
                                                                                memory.memoryType
                                                                            )}</div>`;
                                                                            parent.appendChild(
                                                                                fallback
                                                                            );
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-start justify-between mb-3">
                                                                <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                                                                    {
                                                                        memory.title
                                                                    }
                                                                </h4>
                                                                <div className="flex items-center gap-2">
                                                                    <Badge
                                                                        className={`${getEmotionColor(
                                                                            memory.emotion
                                                                        )} bg-white/50 border-current`}
                                                                    >
                                                                        {getMemoryTypeIcon(
                                                                            memory.memoryType
                                                                        )}
                                                                        <span className="ml-1">
                                                                            {
                                                                                memory.emotion
                                                                            }
                                                                        </span>
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
                                                                {memory.content}
                                                            </p>
                                                            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="flex items-center gap-1">
                                                                        <Calendar className="w-4 h-4" />
                                                                        {
                                                                            memory.date
                                                                        }
                                                                    </div>
                                                                    <div className="flex items-center gap-1">
                                                                        <Heart className="w-4 h-4" />
                                                                        {
                                                                            memory.viewCount
                                                                        }{" "}
                                                                        조회
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </>
                )}

                {/* 새로운 추억 추가 섹션 */}
                <div className="mt-16 text-center">
                    <Card className="bg-gradient-to-r from-blue-50/50 to-sky-50/50 dark:from-blue-900/20 dark:to-sky-900/20 backdrop-blur-lg border border-blue-100 dark:border-blue-800 p-8">
                        <CardContent className="space-y-6">
                            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto">
                                <Camera className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                                새로운 추억 기록하기
                            </h3>
                            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                                {selectedFriend?.name}와 함께했던 소중한
                                순간들을 기록해보세요. 사진, 이야기, 특별한
                                순간들이 모두 하늘에 간직됩니다.
                            </p>
                            <Button
                                size="lg"
                                className="bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 text-white"
                            >
                                <Camera className="w-5 h-5 mr-2" />
                                추억 추가하기
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
