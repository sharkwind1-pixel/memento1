/**
 * RecordPage.tsx
 * 우리의 기록 - 마이페이지
 * 대시보드 / 내 반려동물 / 설정 탭
 */

"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
    Settings,
    Grid3X3,
    List,
    Star,
    Clock,
    MoreHorizontal,
    Pencil,
    Trash2,
    Crown,
    LogIn,
    LayoutDashboard,
    PawPrint,
    Bell,
    User,
    Mail,
    Shield,
    CreditCard,
    MessageCircle,
    FileText,
    ThumbsUp,
    ChevronRight,
    Lock,
    Image,
    Sparkles,
} from "lucide-react";

import { TabType } from "@/types";

interface RecordPageProps {
    setSelectedTab?: (tab: TabType) => void;
}

// 탭 타입
type RecordTab = "dashboard" | "pets" | "settings";

// 목업 반려동물 데이터
const MOCK_PETS = [
    {
        id: "1",
        name: "초코",
        type: "강아지",
        breed: "말티즈",
        birthday: "2021-03-15",
        age: "3살 10개월",
        gender: "남아",
        weight: "3.2kg",
        image: "https://images.dog.ceo/breeds/maltese/n02085936_4245.jpg",
        isPrimary: true,
        status: "active" as const,
        recordCount: 234,
        photoCount: 512,
    },
];

// 목업 활동 데이터
const MOCK_ACTIVITIES = [
    {
        type: "post",
        title: "초코 산책 후기 올렸어요",
        time: "2시간 전",
        icon: FileText,
    },
    {
        type: "comment",
        title: "댓글을 남겼습니다",
        time: "5시간 전",
        icon: MessageCircle,
    },
    {
        type: "like",
        title: "게시글에 좋아요를 눌렀습니다",
        time: "1일 전",
        icon: ThumbsUp,
    },
    {
        type: "photo",
        title: "사진 3장을 업로드했습니다",
        time: "2일 전",
        icon: Image,
    },
];

// 목업 기록 데이터
const MOCK_RECORDS = [
    {
        id: 1,
        type: "photo",
        title: "오늘 산책 나갔다 온 초코",
        date: "2025.01.20",
        image: "https://images.dog.ceo/breeds/maltese/n02085936_4245.jpg",
    },
    {
        id: 2,
        type: "milestone",
        title: "예방접종 완료!",
        date: "2025.01.18",
        image: null,
    },
    {
        id: 3,
        type: "photo",
        title: "간식 먹는 중",
        date: "2025.01.17",
        image: "https://images.dog.ceo/breeds/maltese/n02085936_7310.jpg",
    },
];

export default function RecordPage({ setSelectedTab }: RecordPageProps) {
    const { user, loading, signOut } = useAuth();
    const [activeTab, setActiveTab] = useState<RecordTab>("dashboard");
    const [showSubscribeModal, setShowSubscribeModal] = useState(false);

    // 로그인 안 한 경우
    if (!loading && !user) {
        return (
            <div className="min-h-screen relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-purple-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />

                <div className="relative z-10 flex flex-col items-center justify-center min-h-[60vh] px-4">
                    <div className="w-24 h-24 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full flex items-center justify-center mb-6">
                        <Lock className="w-12 h-12 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                        로그인이 필요해요
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
                        반려동물과의 소중한 순간을 기록하려면
                        <br />
                        먼저 로그인해주세요
                    </p>
                    <Button
                        className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 rounded-xl px-8"
                        onClick={() => {
                            // Layout의 AuthModal 열기 위해 이벤트 발생
                            window.dispatchEvent(
                                new CustomEvent("openAuthModal"),
                            );
                        }}
                    >
                        <LogIn className="w-4 h-4 mr-2" />
                        로그인하기
                    </Button>
                </div>
            </div>
        );
    }

    // 로딩 중
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // 사용자 정보
    const displayName =
        user?.user_metadata?.nickname || user?.email?.split("@")[0] || "사용자";
    const userEmail = user?.email || "";
    const joinDate = user?.created_at
        ? new Date(user.created_at).toLocaleDateString("ko-KR")
        : "";
    const isSubscribed = false; // TODO: 실제 구독 상태 확인

    // 탭 렌더링
    const renderTabContent = () => {
        switch (activeTab) {
            case "dashboard":
                return (
                    <DashboardTab
                        displayName={displayName}
                        userEmail={userEmail}
                        joinDate={joinDate}
                        isSubscribed={isSubscribed}
                        onSubscribe={() => setShowSubscribeModal(true)}
                    />
                );
            case "pets":
                return (
                    <PetsTab
                        pets={MOCK_PETS}
                        isSubscribed={isSubscribed}
                        onSubscribe={() => setShowSubscribeModal(true)}
                    />
                );
            case "settings":
                return (
                    <SettingsTab
                        displayName={displayName}
                        userEmail={userEmail}
                        isSubscribed={isSubscribed}
                        onSignOut={signOut}
                        onSubscribe={() => setShowSubscribeModal(true)}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* 배경 */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-purple-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-violet-200/30 to-purple-200/30 dark:from-violet-800/20 dark:to-purple-800/20 rounded-full blur-3xl animate-pulse" />
            </div>

            {/* 구독 모달 */}
            {showSubscribeModal && (
                <SubscribeModal onClose={() => setShowSubscribeModal(false)} />
            )}

            <div className="relative z-10 space-y-6 pb-8">
                {/* 헤더 */}
                <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-white/50 dark:border-gray-700/50 rounded-3xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl flex items-center justify-center">
                                <Camera className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                                    우리의 기록
                                </h1>
                                <p className="text-gray-600 dark:text-gray-300">
                                    {displayName}님의 공간
                                </p>
                            </div>
                        </div>
                        {isSubscribed ? (
                            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                                <Crown className="w-3 h-3 mr-1" />
                                프리미엄
                            </Badge>
                        ) : (
                            <Button
                                variant="outline"
                                className="border-violet-300 text-violet-600 hover:bg-violet-50 rounded-xl"
                                onClick={() => setShowSubscribeModal(true)}
                            >
                                <Sparkles className="w-4 h-4 mr-2" />
                                프리미엄 구독
                            </Button>
                        )}
                    </div>

                    {/* 탭 네비게이션 */}
                    <div className="flex gap-2">
                        {[
                            {
                                id: "dashboard" as RecordTab,
                                label: "대시보드",
                                icon: LayoutDashboard,
                            },
                            {
                                id: "pets" as RecordTab,
                                label: "내 반려동물",
                                icon: PawPrint,
                            },
                            {
                                id: "settings" as RecordTab,
                                label: "설정",
                                icon: Settings,
                            },
                        ].map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <Button
                                    key={tab.id}
                                    variant={isActive ? "default" : "outline"}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`rounded-xl ${
                                        isActive
                                            ? "bg-gradient-to-r from-violet-500 to-purple-500 border-0"
                                            : "border-violet-200 dark:border-violet-700"
                                    }`}
                                >
                                    <Icon className="w-4 h-4 mr-2" />
                                    {tab.label}
                                </Button>
                            );
                        })}
                    </div>
                </div>

                {/* 탭 컨텐츠 */}
                {renderTabContent()}
            </div>
        </div>
    );
}

/* ==================== 대시보드 탭 ==================== */
function DashboardTab({
    displayName,
    userEmail,
    joinDate,
    isSubscribed,
    onSubscribe,
}: {
    displayName: string;
    userEmail: string;
    joinDate: string;
    isSubscribed: boolean;
    onSubscribe: () => void;
}) {
    return (
        <div className="space-y-6">
            {/* 프로필 카드 */}
            <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-white/50 dark:border-gray-700/50 rounded-2xl">
                <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full flex items-center justify-center">
                            <User className="w-10 h-10 text-white" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                                    {displayName}
                                </h2>
                                {isSubscribed && (
                                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs">
                                        <Crown className="w-3 h-3 mr-1" />
                                        프리미엄
                                    </Badge>
                                )}
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                {userEmail}
                            </p>
                            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                                가입일: {joinDate}
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl"
                        >
                            <Pencil className="w-4 h-4 mr-1" />
                            수정
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* 통계 카드 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    {
                        label: "등록된 반려동물",
                        value: "1",
                        icon: PawPrint,
                        color: "violet",
                    },
                    {
                        label: "기록한 순간",
                        value: "234",
                        icon: Camera,
                        color: "blue",
                    },
                    {
                        label: "작성한 글",
                        value: "12",
                        icon: FileText,
                        color: "emerald",
                    },
                    {
                        label: "받은 좋아요",
                        value: "89",
                        icon: Heart,
                        color: "rose",
                    },
                ].map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <Card
                            key={stat.label}
                            className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-white/50 dark:border-gray-700/50 rounded-2xl"
                        >
                            <CardContent className="p-4 text-center">
                                <Icon
                                    className={`w-8 h-8 mx-auto mb-2 text-${stat.color}-500`}
                                />
                                <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                                    {stat.value}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {stat.label}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* 구독 배너 (무료 유저만) */}
            {!isSubscribed && (
                <Card className="bg-gradient-to-r from-violet-500 to-purple-500 border-0 rounded-2xl overflow-hidden">
                    <CardContent className="p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Crown className="w-6 h-6" />
                                    <h3 className="text-lg font-bold">
                                        프리미엄으로 업그레이드
                                    </h3>
                                </div>
                                <p className="text-white/80 text-sm">
                                    반려동물 무제한 등록 · AI 펫톡 무제한 ·
                                    프리미엄 테마
                                </p>
                            </div>
                            <Button
                                className="bg-white text-violet-600 hover:bg-gray-100 rounded-xl"
                                onClick={onSubscribe}
                            >
                                월 7,900원
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 최근 활동 */}
            <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-white/50 dark:border-gray-700/50 rounded-2xl">
                <CardHeader>
                    <CardTitle className="text-lg">최근 활동</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {MOCK_ACTIVITIES.map((activity, i) => {
                        const Icon = activity.icon;
                        return (
                            <div
                                key={i}
                                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
                                <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/50 rounded-full flex items-center justify-center">
                                    <Icon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-gray-800 dark:text-gray-100">
                                        {activity.title}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        {activity.time}
                                    </p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                            </div>
                        );
                    })}
                </CardContent>
            </Card>
        </div>
    );
}

/* ==================== 내 반려동물 탭 ==================== */
function PetsTab({
    pets,
    isSubscribed,
    onSubscribe,
}: {
    pets: typeof MOCK_PETS;
    isSubscribed: boolean;
    onSubscribe: () => void;
}) {
    const [selectedPet, setSelectedPet] = useState<string | null>(
        pets[0]?.id || null,
    );
    const [viewMode, setViewMode] = useState<"grid" | "list">("list");

    const currentPet = pets.find((p) => p.id === selectedPet);
    const canAddPet = isSubscribed || pets.length < 1;

    return (
        <div className="space-y-6">
            {/* 반려동물 선택 */}
            <div className="flex gap-3 overflow-x-auto pb-2">
                {pets.map((pet) => (
                    <button
                        key={pet.id}
                        onClick={() => setSelectedPet(pet.id)}
                        className={`flex-shrink-0 flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${
                            selectedPet === pet.id
                                ? "bg-violet-100 dark:bg-violet-900/50 border-violet-500"
                                : "bg-white/60 dark:bg-gray-800/60 border-transparent hover:border-violet-200"
                        }`}
                    >
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200">
                            {pet.image && (
                                <img
                                    src={pet.image}
                                    alt={pet.name}
                                    className="w-full h-full object-cover"
                                />
                            )}
                        </div>
                        <div className="text-left">
                            <div className="flex items-center gap-1">
                                <span className="font-bold text-gray-800 dark:text-gray-100">
                                    {pet.name}
                                </span>
                                {pet.isPrimary && (
                                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                )}
                            </div>
                            <span className="text-xs text-gray-500">
                                {pet.breed}
                            </span>
                        </div>
                    </button>
                ))}

                {/* 추가 버튼 */}
                <button
                    onClick={() => {
                        if (!canAddPet) {
                            onSubscribe();
                        } else {
                            // TODO: 반려동물 추가 모달
                            alert("반려동물 추가 기능 준비 중");
                        }
                    }}
                    className="flex-shrink-0 flex items-center gap-2 p-3 rounded-2xl border-2 border-dashed border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-all"
                >
                    <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
                        <Plus className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                        <span className="font-medium">추가하기</span>
                        {!canAddPet && (
                            <div className="flex items-center gap-1 text-xs text-amber-600">
                                <Crown className="w-3 h-3" />
                                프리미엄
                            </div>
                        )}
                    </div>
                </button>
            </div>

            {/* 선택된 반려동물 정보 */}
            {currentPet && (
                <>
                    {/* 프로필 카드 */}
                    <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-white/50 dark:border-gray-700/50 rounded-2xl overflow-hidden">
                        <div className="flex">
                            <div className="w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0">
                                {currentPet.image && (
                                    <img
                                        src={currentPet.image}
                                        alt={currentPet.name}
                                        className="w-full h-full object-cover"
                                    />
                                )}
                            </div>
                            <div className="flex-1 p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                                            {currentPet.name}
                                        </h2>
                                        <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
                                            {currentPet.type}
                                        </Badge>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="rounded-lg"
                                    >
                                        <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                </div>
                                <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                                    {currentPet.breed} · {currentPet.gender} ·{" "}
                                    {currentPet.age}
                                </p>
                                <div className="flex gap-4 text-sm">
                                    <div className="flex items-center gap-1 text-gray-500">
                                        <Calendar className="w-4 h-4" />
                                        <span>{currentPet.birthday}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-violet-600">
                                        <Heart className="w-4 h-4 fill-current" />
                                        <span>함께한 지 1,392일</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex border-t border-gray-200/50 dark:border-gray-700/50">
                            <div className="flex-1 py-3 text-center border-r border-gray-200/50 dark:border-gray-700/50">
                                <div className="text-xl font-bold text-gray-800 dark:text-gray-100">
                                    {currentPet.recordCount}
                                </div>
                                <div className="text-xs text-gray-500">
                                    기록
                                </div>
                            </div>
                            <div className="flex-1 py-3 text-center">
                                <div className="text-xl font-bold text-gray-800 dark:text-gray-100">
                                    {currentPet.photoCount}
                                </div>
                                <div className="text-xs text-gray-500">
                                    사진
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* 새 기록 버튼 */}
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

                    {/* 뷰 모드 & 기록 */}
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-gray-800 dark:text-gray-100">
                            기록
                        </h3>
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
                        <div className="space-y-3">
                            {MOCK_RECORDS.map((record) => (
                                <Card
                                    key={record.id}
                                    className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-white/50 dark:border-gray-700/50 rounded-2xl cursor-pointer hover:shadow-md transition-all"
                                >
                                    <CardContent className="p-4 flex gap-4">
                                        {record.image && (
                                            <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100">
                                                <img
                                                    src={record.image}
                                                    alt={record.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-800 dark:text-gray-100">
                                                {record.title}
                                            </h4>
                                            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                                <Calendar className="w-3 h-3" />
                                                {record.date}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-2">
                            {MOCK_RECORDS.filter((r) => r.image).map(
                                (record) => (
                                    <div
                                        key={record.id}
                                        className="aspect-square rounded-xl overflow-hidden bg-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
                                    >
                                        <img
                                            src={record.image!}
                                            alt={record.title}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ),
                            )}
                        </div>
                    )}
                </>
            )}

            {pets.length === 0 && (
                <div className="text-center py-16">
                    <div className="w-20 h-20 bg-violet-100 dark:bg-violet-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <PawPrint className="w-10 h-10 text-violet-500" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
                        아직 등록된 반려동물이 없어요
                    </h3>
                    <p className="text-gray-500 mb-4">
                        첫 번째 반려동물을 등록해보세요
                    </p>
                    <Button className="bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl">
                        <Plus className="w-4 h-4 mr-2" />
                        반려동물 등록하기
                    </Button>
                </div>
            )}
        </div>
    );
}

/* ==================== 설정 탭 ==================== */
function SettingsTab({
    displayName,
    userEmail,
    isSubscribed,
    onSignOut,
    onSubscribe,
}: {
    displayName: string;
    userEmail: string;
    isSubscribed: boolean;
    onSignOut: () => void;
    onSubscribe: () => void;
}) {
    return (
        <div className="space-y-6">
            {/* 계정 설정 */}
            <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-white/50 dark:border-gray-700/50 rounded-2xl">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <User className="w-5 h-5" />
                        계정 설정
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/50 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-violet-600" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-800 dark:text-gray-100">
                                    닉네임
                                </p>
                                <p className="text-sm text-gray-500">
                                    {displayName}
                                </p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
                                <Mail className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-800 dark:text-gray-100">
                                    이메일
                                </p>
                                <p className="text-sm text-gray-500">
                                    {userEmail}
                                </p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center">
                                <Shield className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-800 dark:text-gray-100">
                                    비밀번호 변경
                                </p>
                                <p className="text-sm text-gray-500">
                                    보안을 위해 주기적으로 변경해주세요
                                </p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                </CardContent>
            </Card>

            {/* 구독 설정 */}
            <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-white/50 dark:border-gray-700/50 rounded-2xl">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        구독 관리
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/30">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                {isSubscribed ? (
                                    <>
                                        <Crown className="w-5 h-5 text-amber-500" />
                                        <span className="font-bold text-gray-800 dark:text-gray-100">
                                            프리미엄 플랜
                                        </span>
                                    </>
                                ) : (
                                    <span className="font-bold text-gray-800 dark:text-gray-100">
                                        무료 플랜
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-gray-500">
                                {isSubscribed
                                    ? "모든 프리미엄 기능을 이용 중입니다"
                                    : "반려동물 1마리 · AI 펫톡 하루 15회"}
                            </p>
                        </div>
                        {!isSubscribed && (
                            <Button
                                className="bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl"
                                onClick={onSubscribe}
                            >
                                업그레이드
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* 알림 설정 */}
            <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-white/50 dark:border-gray-700/50 rounded-2xl">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Bell className="w-5 h-5" />
                        알림 설정
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {[
                        { label: "커뮤니티 알림", desc: "댓글, 좋아요 알림" },
                        { label: "AI 펫톡 알림", desc: "새로운 메시지 알림" },
                        {
                            label: "이벤트 알림",
                            desc: "프로모션 및 이벤트 정보",
                        },
                    ].map((item, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between p-3 rounded-xl"
                        >
                            <div>
                                <p className="font-medium text-gray-800 dark:text-gray-100">
                                    {item.label}
                                </p>
                                <p className="text-sm text-gray-500">
                                    {item.desc}
                                </p>
                            </div>
                            <div className="w-12 h-7 bg-violet-500 rounded-full relative cursor-pointer">
                                <div className="absolute right-1 top-1 w-5 h-5 bg-white rounded-full shadow" />
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* 로그아웃 */}
            <Button
                variant="outline"
                className="w-full h-12 rounded-xl border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                onClick={onSignOut}
            >
                로그아웃
            </Button>
        </div>
    );
}

/* ==================== 구독 모달 ==================== */
function SubscribeModal({ onClose }: { onClose: () => void }) {
    return (
        <div
            className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden">
                {/* 헤더 */}
                <div className="bg-gradient-to-r from-violet-500 to-purple-500 p-6 text-white text-center">
                    <Crown className="w-12 h-12 mx-auto mb-3" />
                    <h2 className="text-2xl font-bold">프리미엄 구독</h2>
                    <p className="text-white/80 mt-1">
                        더 많은 기능을 만나보세요
                    </p>
                </div>

                {/* 혜택 */}
                <div className="p-6 space-y-4">
                    {[
                        { icon: PawPrint, text: "반려동물 무제한 등록" },
                        { icon: MessageCircle, text: "AI 펫톡 무제한 이용" },
                        { icon: Sparkles, text: "프리미엄 테마 & 스티커" },
                        { icon: Image, text: "고화질 사진 저장" },
                    ].map((item, i) => {
                        const Icon = item.icon;
                        return (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/50 rounded-full flex items-center justify-center">
                                    <Icon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                                </div>
                                <span className="text-gray-800 dark:text-gray-100">
                                    {item.text}
                                </span>
                            </div>
                        );
                    })}

                    {/* 가격 */}
                    <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-4xl font-bold text-gray-800 dark:text-gray-100">
                            월 7,900원
                        </div>
                        <p className="text-gray-500 text-sm mt-1">
                            언제든 해지 가능
                        </p>
                    </div>

                    {/* 버튼 */}
                    <Button className="w-full h-12 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 rounded-xl">
                        구독 시작하기
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full"
                        onClick={onClose}
                    >
                        나중에 할게요
                    </Button>
                </div>
            </div>
        </div>
    );
}
