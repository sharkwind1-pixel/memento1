/**
 * TutorialTour.tsx
 * 실제 화면을 보여주면서 안내하는 튜토리얼
 */

"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import {
    ArrowRight,
    ArrowLeft,
    X,
    Sparkles,
    Home,
    Camera,
    Users,
    MessageCircle,
    BookOpen,
    Menu,
} from "lucide-react";

interface TutorialTourProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (tab: string) => void;
}

interface TutorialStep {
    id: string;
    tab: string | null; // 이동할 탭 (null이면 이동 안 함)
    title: string;
    description: string;
    icon: React.ElementType;
    features?: string[]; // 주요 기능 목록
}

const TUTORIAL_STEPS: TutorialStep[] = [
    {
        id: "welcome",
        tab: "home",
        title: "메멘토애니에 오신 걸 환영해요!",
        description: "반려동물과의 소중한 추억을 기록하고, 다양한 정보를 얻을 수 있는 공간이에요.",
        icon: Sparkles,
    },
    {
        id: "home",
        tab: "home",
        title: "홈",
        description: "메멘토애니의 시작점이에요. 주요 기능들을 한눈에 볼 수 있어요.",
        icon: Home,
        features: [
            "내 반려동물 프로필 확인",
            "최근 추억 타임라인",
            "빠른 메뉴 접근",
        ],
    },
    {
        id: "record",
        tab: "record",
        title: "우리의 기록",
        description: "반려동물을 등록하고 소중한 추억을 기록하는 공간이에요.",
        icon: Camera,
        features: [
            "반려동물 프로필 등록/관리",
            "사진과 추억 타임라인",
            "건강 기록 & 리마인더",
        ],
    },
    {
        id: "community",
        tab: "community",
        title: "커뮤니티",
        description: "다른 반려인들과 소통하고 정보를 나눌 수 있어요.",
        icon: Users,
        features: [
            "자유롭게 글 작성 & 댓글",
            "반려동물 사진 공유",
            "질문 & 정보 교류",
        ],
    },
    {
        id: "ai-chat",
        tab: "ai-chat",
        title: "AI 펫톡",
        description: "등록한 반려동물과 대화할 수 있어요. 추억 속 아이와 다시 이야기 나눠보세요.",
        icon: MessageCircle,
        features: [
            "AI가 반려동물 성격을 학습",
            "추억을 기반으로 대화",
            "일상/추모 모드 지원",
        ],
    },
    {
        id: "magazine",
        tab: "magazine",
        title: "펫 매거진",
        description: "반려동물 관련 유용한 정보와 트렌드를 확인할 수 있어요.",
        icon: BookOpen,
        features: [
            "건강 & 영양 정보",
            "훈련 & 케어 팁",
            "반려동물 트렌드",
        ],
    },
    {
        id: "more",
        tab: null,
        title: "더 많은 기능",
        description: "하단의 '더보기' 메뉴에서 더 많은 기능을 이용할 수 있어요.",
        icon: Menu,
        features: [
            "입양정보 - 유기동물 입양",
            "지역정보 - 주변 동물병원, 카페",
            "분실동물 - 잃어버린 아이 찾기",
        ],
    },
    {
        id: "complete",
        tab: "home",
        title: "준비 완료!",
        description: "이제 메멘토애니를 자유롭게 둘러보세요. 소중한 추억을 함께 기록해요.",
        icon: Sparkles,
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
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
            setCurrentStep(0);
            // 첫 스텝의 탭으로 이동
            const firstTab = TUTORIAL_STEPS[0].tab;
            if (firstTab) {
                onNavigate(firstTab);
            }
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen, onNavigate]);

    if (!isOpen || !mounted) return null;

    const step = TUTORIAL_STEPS[currentStep];
    const Icon = step.icon;
    const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
    const isFirstStep = currentStep === 0;

    const handleNext = () => {
        if (isLastStep) {
            handleComplete();
        } else {
            const nextStep = TUTORIAL_STEPS[currentStep + 1];
            // 다음 스텝의 탭으로 이동
            if (nextStep.tab) {
                onNavigate(nextStep.tab);
            }
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            const prevStep = TUTORIAL_STEPS[currentStep - 1];
            // 이전 스텝의 탭으로 이동
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
        onNavigate("home");
        onClose();
    };

    const content = (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
            {/* 상단 그라데이션 오버레이 */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-auto" />

            {/* 하단 카드 */}
            <div className="absolute bottom-0 left-0 right-0 pointer-events-auto">
                {/* 하단 그라데이션 */}
                <div className="h-20 bg-gradient-to-t from-black/80 to-transparent" />

                {/* 카드 */}
                <div className="bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
                    {/* 핸들 */}
                    <div className="flex justify-center pt-3">
                        <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
                    </div>

                    {/* 진행 바 */}
                    <div className="flex gap-1 px-6 pt-4">
                        {TUTORIAL_STEPS.map((_, index) => (
                            <div
                                key={index}
                                className={`h-1 flex-1 rounded-full transition-all ${
                                    index <= currentStep
                                        ? "bg-gradient-to-r from-[#05B2DC] to-[#38BDF8]"
                                        : "bg-gray-200 dark:bg-gray-700"
                                }`}
                            />
                        ))}
                    </div>

                    {/* 내용 */}
                    <div className="p-6">
                        <div className="flex items-start gap-4 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#05B2DC] to-[#38BDF8] flex items-center justify-center flex-shrink-0">
                                <Icon className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                                        {step.title}
                                    </h3>
                                    <span className="text-xs text-gray-400">
                                        {currentStep + 1}/{TUTORIAL_STEPS.length}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                    {step.description}
                                </p>
                            </div>
                        </div>

                        {/* 주요 기능 목록 */}
                        {step.features && step.features.length > 0 && (
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4">
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">주요 기능</p>
                                <ul className="space-y-1.5">
                                    {step.features.map((feature, index) => (
                                        <li key={index} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                            <div className="w-1.5 h-1.5 rounded-full bg-[#05B2DC]" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* 버튼 */}
                        <div className="flex gap-3">
                            {!isFirstStep && (
                                <Button
                                    variant="outline"
                                    onClick={handlePrev}
                                    className="flex-1 rounded-xl h-12"
                                >
                                    <ArrowLeft className="w-4 h-4 mr-1" />
                                    이전
                                </Button>
                            )}
                            <Button
                                onClick={handleNext}
                                className="flex-1 rounded-xl h-12 bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] text-white"
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
                        <button
                            onClick={handleSkip}
                            className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors py-2"
                        >
                            건너뛰기
                        </button>
                    </div>

                    {/* Safe area for mobile */}
                    <div className="h-safe" />
                </div>
            </div>

            {/* 닫기 버튼 */}
            <button
                onClick={handleSkip}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors pointer-events-auto"
            >
                <X className="w-5 h-5 text-white" />
            </button>
        </div>
    );

    return createPortal(content, document.body);
}
