/**
 * OnboardingModal.tsx
 * 신규 사용자를 위한 온보딩 가이드
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    PawPrint,
    MessageCircle,
    Camera,
    Heart,
    ArrowRight,
    Sparkles,
    X,
} from "lucide-react";

interface OnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGoToRecord: () => void;
}

const ONBOARDING_STORAGE_KEY = "memento-ani-onboarding-complete";

// 온보딩 완료 여부 확인
export function hasCompletedOnboarding(): boolean {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
}

// 온보딩 완료 표시
export function markOnboardingComplete(): void {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
}

const steps = [
    {
        icon: PawPrint,
        title: "환영해요!",
        description: "메멘토애니에 오신 걸 환영해요.\n반려동물과의 소중한 시간을 함께 기록해봐요.",
        color: "from-violet-500 to-sky-500",
        bgColor: "bg-gradient-to-br from-violet-50 to-sky-50",
    },
    {
        icon: Camera,
        title: "반려동물 등록하기",
        description: "먼저 반려동물을 등록해주세요.\n이름, 종류, 사진을 추가하면 준비 완료!",
        color: "from-sky-500 to-cyan-500",
        bgColor: "bg-gradient-to-br from-sky-50 to-cyan-50",
    },
    {
        icon: MessageCircle,
        title: "AI 펫톡으로 대화하기",
        description: "등록이 끝나면 AI 펫톡에서\n반려동물의 시점으로 대화할 수 있어요.",
        color: "from-cyan-500 to-emerald-500",
        bgColor: "bg-gradient-to-br from-cyan-50 to-emerald-50",
    },
    {
        icon: Heart,
        title: "추억을 기록해요",
        description: "사진, 타임라인, 특별한 날들을 기록하면\nAI가 더 풍성한 대화를 만들어줘요.",
        color: "from-emerald-500 to-amber-500",
        bgColor: "bg-gradient-to-br from-emerald-50 to-amber-50",
    },
];

export default function OnboardingModal({
    isOpen,
    onClose,
    onGoToRecord,
}: OnboardingModalProps) {
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const step = steps[currentStep];
    const isLastStep = currentStep === steps.length - 1;
    const Icon = step.icon;

    const handleNext = () => {
        if (isLastStep) {
            markOnboardingComplete();
            onClose();
            onGoToRecord();
        } else {
            setCurrentStep((prev) => prev + 1);
        }
    };

    const handleSkip = () => {
        markOnboardingComplete();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl">
                {/* 헤더 */}
                <div className="flex justify-end p-4">
                    <button
                        onClick={handleSkip}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* 콘텐츠 */}
                <div className={`px-8 pb-8 ${step.bgColor} transition-colors duration-500`}>
                    {/* 아이콘 */}
                    <div className="flex justify-center mb-6">
                        <div className={`w-20 h-20 bg-gradient-to-br ${step.color} rounded-full flex items-center justify-center shadow-lg`}>
                            <Icon className="w-10 h-10 text-white" />
                        </div>
                    </div>

                    {/* 텍스트 */}
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 mb-3">
                            {step.title}
                        </h2>
                        <p className="text-gray-600 whitespace-pre-line leading-relaxed">
                            {step.description}
                        </p>
                    </div>

                    {/* 진행 표시 */}
                    <div className="flex justify-center gap-2 mb-6">
                        {steps.map((_, index) => (
                            <div
                                key={index}
                                className={`h-2 rounded-full transition-all duration-300 ${
                                    index === currentStep
                                        ? `w-8 bg-gradient-to-r ${step.color}`
                                        : index < currentStep
                                        ? "w-2 bg-gray-400"
                                        : "w-2 bg-gray-300"
                                }`}
                            />
                        ))}
                    </div>

                    {/* 버튼 */}
                    <div className="flex gap-3">
                        {currentStep > 0 && (
                            <Button
                                variant="outline"
                                onClick={() => setCurrentStep((prev) => prev - 1)}
                                className="flex-1 rounded-xl"
                            >
                                이전
                            </Button>
                        )}
                        <Button
                            onClick={handleNext}
                            className={`flex-1 bg-gradient-to-r ${step.color} hover:opacity-90 text-white rounded-xl`}
                        >
                            {isLastStep ? (
                                <>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    시작하기
                                </>
                            ) : (
                                <>
                                    다음
                                    <ArrowRight className="w-4 h-4 ml-2" />
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
            </div>
        </div>
    );
}
