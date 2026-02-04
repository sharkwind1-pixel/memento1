/**
 * TutorialTour.tsx
 * 신규 사용자를 위한 앱 튜토리얼 투어
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Home,
    MessageCircle,
    BookOpen,
    Heart,
    MapPin,
    Search,
    PawPrint,
    ArrowRight,
    X,
    Sparkles,
} from "lucide-react";

interface TutorialTourProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (tab: string) => void;
}

const TUTORIAL_STEPS = [
    {
        id: "welcome",
        title: "메멘토애니에 오신 걸 환영해요!",
        description: "반려동물과의 소중한 추억을 기록하고,\n다양한 정보를 얻을 수 있는 공간이에요.",
        icon: Sparkles,
        color: "from-violet-500 to-purple-500",
        bgColor: "bg-violet-50",
    },
    {
        id: "home",
        title: "홈",
        description: "메멘토애니의 시작점이에요.\n주요 기능들을 한눈에 볼 수 있어요.",
        icon: Home,
        color: "from-sky-500 to-blue-500",
        bgColor: "bg-sky-50",
        tab: "home",
    },
    {
        id: "ai-chat",
        title: "AI 펫톡",
        description: "등록한 반려동물과 대화할 수 있어요.\n추억 속 아이와 다시 이야기 나눠보세요.",
        icon: MessageCircle,
        color: "from-emerald-500 to-teal-500",
        bgColor: "bg-emerald-50",
        tab: "ai-chat",
    },
    {
        id: "record",
        title: "우리의 기록",
        description: "반려동물을 등록하고 추억을 기록해요.\n사진, 건강 정보, 리마인더를 관리할 수 있어요.",
        icon: PawPrint,
        color: "from-amber-500 to-orange-500",
        bgColor: "bg-amber-50",
        tab: "record",
    },
    {
        id: "community",
        title: "커뮤니티",
        description: "다른 반려인들과 소통하고\n정보를 나눌 수 있어요.",
        icon: Heart,
        color: "from-pink-500 to-rose-500",
        bgColor: "bg-pink-50",
        tab: "community",
    },
    {
        id: "magazine",
        title: "펫 매거진",
        description: "반려동물 관련 유용한 정보와\n트렌드를 확인할 수 있어요.",
        icon: BookOpen,
        color: "from-indigo-500 to-blue-500",
        bgColor: "bg-indigo-50",
        tab: "magazine",
    },
    {
        id: "adoption",
        title: "입양 정보",
        description: "유기동물 입양 정보를 확인하고\n새로운 가족을 찾아줄 수 있어요.",
        icon: Heart,
        color: "from-rose-500 to-pink-500",
        bgColor: "bg-rose-50",
        tab: "adoption",
    },
    {
        id: "local",
        title: "내 주변",
        description: "주변의 동물병원, 미용실, 카페 등\n반려동물 관련 장소를 찾을 수 있어요.",
        icon: MapPin,
        color: "from-cyan-500 to-sky-500",
        bgColor: "bg-cyan-50",
        tab: "local",
    },
    {
        id: "lost",
        title: "분실동물 찾기",
        description: "잃어버린 반려동물을 찾거나\n발견한 동물을 신고할 수 있어요.",
        icon: Search,
        color: "from-red-500 to-orange-500",
        bgColor: "bg-red-50",
        tab: "lost",
    },
    {
        id: "complete",
        title: "준비 완료!",
        description: "이제 메멘토애니를 자유롭게 둘러보세요.\n소중한 추억을 함께 기록해요.",
        icon: Sparkles,
        color: "from-violet-500 to-purple-500",
        bgColor: "bg-violet-50",
    },
];

const TUTORIAL_STORAGE_KEY = "memento-ani-tutorial-complete";

export function hasCompletedTutorial(): boolean {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(TUTORIAL_STORAGE_KEY) === "true";
}

export function markTutorialComplete(): void {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
}

export default function TutorialTour({
    isOpen,
    onClose,
    onNavigate,
}: TutorialTourProps) {
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
            setCurrentStep(0);
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const step = TUTORIAL_STEPS[currentStep];
    const Icon = step.icon;
    const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
    const isFirstStep = currentStep === 0;

    const handleNext = () => {
        if (isLastStep) {
            handleComplete();
        } else {
            // 해당 탭으로 이동 (있는 경우)
            const nextStep = TUTORIAL_STEPS[currentStep + 1];
            if (nextStep.tab) {
                onNavigate(nextStep.tab);
            }
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            const prevStep = TUTORIAL_STEPS[currentStep - 1];
            if (prevStep.tab) {
                onNavigate(prevStep.tab);
            }
            setCurrentStep(currentStep - 1);
        }
    };

    const handleComplete = () => {
        markTutorialComplete();
        onNavigate("home");
        onClose();
    };

    const handleSkip = () => {
        markTutorialComplete();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
            {/* 배경 오버레이 */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={handleSkip}
            />

            {/* 튜토리얼 카드 */}
            <div className="relative w-full max-w-md mx-4 mb-20 sm:mb-0 bg-white rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
                {/* 닫기 버튼 */}
                <button
                    onClick={handleSkip}
                    className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/80 hover:bg-white transition-colors shadow-sm"
                >
                    <X className="w-5 h-5 text-gray-500" />
                </button>

                {/* 진행 표시 */}
                <div className="flex gap-1 px-6 pt-6">
                    {TUTORIAL_STEPS.map((_, index) => (
                        <div
                            key={index}
                            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                                index <= currentStep
                                    ? "bg-gradient-to-r from-violet-500 to-purple-500"
                                    : "bg-gray-200"
                            }`}
                        />
                    ))}
                </div>

                {/* 콘텐츠 */}
                <div className="p-6 pt-8">
                    {/* 아이콘 */}
                    <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mx-auto mb-6 shadow-lg`}>
                        <Icon className="w-10 h-10 text-white" />
                    </div>

                    {/* 텍스트 */}
                    <h2 className="text-xl font-bold text-gray-800 text-center mb-3">
                        {step.title}
                    </h2>
                    <p className="text-gray-600 text-center whitespace-pre-line leading-relaxed mb-8">
                        {step.description}
                    </p>

                    {/* 버튼 영역 */}
                    <div className="flex gap-3">
                        {!isFirstStep && (
                            <Button
                                variant="outline"
                                onClick={handlePrev}
                                className="flex-1 rounded-xl"
                            >
                                이전
                            </Button>
                        )}
                        <Button
                            onClick={handleNext}
                            className={`flex-1 rounded-xl bg-gradient-to-r ${step.color} text-white`}
                        >
                            {isLastStep ? (
                                <>
                                    <Sparkles className="w-4 h-4 mr-1" />
                                    시작하기
                                </>
                            ) : (
                                <>
                                    다음
                                    <ArrowRight className="w-4 h-4 ml-1" />
                                </>
                            )}
                        </Button>
                    </div>

                    {/* 건너뛰기 */}
                    {!isLastStep && (
                        <button
                            onClick={handleSkip}
                            className="w-full mt-4 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                        >
                            건너뛰기
                        </button>
                    )}
                </div>

                {/* 스텝 표시 */}
                <div className="px-6 pb-6 text-center">
                    <span className="text-xs text-gray-400">
                        {currentStep + 1} / {TUTORIAL_STEPS.length}
                    </span>
                </div>
            </div>
        </div>
    );
}
