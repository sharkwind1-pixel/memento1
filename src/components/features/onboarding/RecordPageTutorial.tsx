/**
 * RecordPageTutorial.tsx
 * 우리의 기록 페이지 전용 스포트라이트 튜토리얼
 * - 키우고 있다: 반려동물 등록 → 사진/영상 → 타임라인
 * - 이별했다: 추모 등록 → 추억 사진 → AI 펫톡 안내
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Sparkles, Heart, Camera, MessageCircle, BookOpen } from "lucide-react";

type UserType = "current" | "memorial";

interface RecordPageTutorialProps {
    isOpen: boolean;
    userType: UserType;
    onClose: () => void;
    onGoToAIChat: () => void;
}

interface TutorialStep {
    targetId: string;
    title: string;
    description: string;
    icon: React.ElementType;
}

// 키우고 있는 유저용 스텝
const CURRENT_STEPS: TutorialStep[] = [
    {
        targetId: "add-pet-button",
        title: "반려동물을 등록해주세요",
        description: "이름, 종류, 생일 등 기본 정보를 입력하면 맞춤 서비스를 받을 수 있어요",
        icon: Heart,
    },
    {
        targetId: "photo-album-section",
        title: "소중한 순간을 기록해요",
        description: "사진과 영상을 올려두면 시간이 지나도 선명하게 남아요",
        icon: Camera,
    },
    {
        targetId: "timeline-section",
        title: "매일의 기록을 남겨요",
        description: "일기처럼 기록하면 나중에 소중한 추억이 돼요",
        icon: BookOpen,
    },
];

// 이별한 유저용 스텝
const MEMORIAL_STEPS: TutorialStep[] = [
    {
        targetId: "add-pet-button",
        title: "소중한 아이를 등록해주세요",
        description: "이름과 함께한 시간을 기록하면 언제든 다시 만날 수 있어요",
        icon: Heart,
    },
    {
        targetId: "photo-album-section",
        title: "추억을 남겨주세요",
        description: "사진과 영상을 올려두면 언제든 아이를 만날 수 있어요",
        icon: Camera,
    },
    {
        targetId: "ai-chat-guide",
        title: "AI 펫톡에서 대화해보세요",
        description: "아이의 정보를 바탕으로 마치 대화하는 것처럼 이야기를 나눌 수 있어요",
        icon: MessageCircle,
    },
];

export default function RecordPageTutorial({
    isOpen,
    userType,
    onClose,
    onGoToAIChat,
}: RecordPageTutorialProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [mounted, setMounted] = useState(false);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const hasInitialized = useRef(false);

    const steps = userType === "memorial" ? MEMORIAL_STEPS : CURRENT_STEPS;

    // 클라이언트 마운트 확인
    useEffect(() => {
        setMounted(true);
    }, []);

    // 타겟 요소 위치 찾기
    const findTarget = useCallback(() => {
        const step = steps[currentStep];
        if (!step) return;

        // AI 펫톡 가이드는 특별 처리 (화면 중앙에 표시)
        if (step.targetId === "ai-chat-guide") {
            setTargetRect(null);
            return;
        }

        const target = document.querySelector(`[data-tutorial-id="${step.targetId}"]`);
        if (target) {
            const rect = target.getBoundingClientRect();
            setTargetRect(rect);
        } else {
            setTargetRect(null);
        }
    }, [currentStep, steps]);

    // 위치 업데이트
    useEffect(() => {
        if (!isOpen) return;

        // 초기화
        if (!hasInitialized.current) {
            setCurrentStep(0);
            hasInitialized.current = true;
        }

        // 딜레이 후 타겟 찾기 (DOM 렌더링 대기)
        const timer = setTimeout(findTarget, 300);

        // 리사이즈/스크롤 대응
        window.addEventListener("resize", findTarget);
        window.addEventListener("scroll", findTarget, true);

        return () => {
            clearTimeout(timer);
            window.removeEventListener("resize", findTarget);
            window.removeEventListener("scroll", findTarget, true);
        };
    }, [isOpen, currentStep, findTarget]);

    // 닫힐 때 초기화
    useEffect(() => {
        if (!isOpen) {
            hasInitialized.current = false;
        }
    }, [isOpen]);

    // 다음 스텝
    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            // 마지막 스텝 - memorial은 AI 펫톡으로 이동 옵션
            onClose();
        }
    };

    // 건너뛰기
    const handleSkip = () => {
        onClose();
    };

    // AI 펫톡으로 이동
    const handleGoToAIChat = () => {
        onClose();
        onGoToAIChat();
    };

    if (!mounted || !isOpen) return null;

    const step = steps[currentStep];
    const Icon = step.icon;
    const isLastStep = currentStep === steps.length - 1;
    const isAIChatGuide = step.targetId === "ai-chat-guide";

    // 말풍선 위치 계산
    const getBubbleStyle = () => {
        if (!targetRect || isAIChatGuide) {
            // 중앙에 표시
            return {
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
            };
        }

        const padding = 16;
        const bubbleWidth = 320;
        const bubbleHeight = 180;
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        // 기본: 타겟 아래에 표시
        let top = targetRect.bottom + padding;
        let left = targetRect.left + targetRect.width / 2 - bubbleWidth / 2;
        let arrowDirection = "up";

        // 화면 아래 넘어가면 위에 표시
        if (top + bubbleHeight > screenHeight - padding) {
            top = targetRect.top - bubbleHeight - padding;
            arrowDirection = "down";
        }

        // 좌우 경계 체크
        if (left < padding) left = padding;
        if (left + bubbleWidth > screenWidth - padding) {
            left = screenWidth - bubbleWidth - padding;
        }

        return {
            top: `${top}px`,
            left: `${left}px`,
            arrowDirection,
            arrowLeft: targetRect.left + targetRect.width / 2 - left,
        };
    };

    const bubbleStyle = getBubbleStyle();
    const arrowDirection = (bubbleStyle as any).arrowDirection || "up";
    const arrowLeft = (bubbleStyle as any).arrowLeft || 160;

    return createPortal(
        <div className="fixed inset-0 z-[10000]">
            {/* 오버레이 */}
            <div
                className="absolute inset-0 bg-black/60 transition-opacity duration-300"
                onClick={handleSkip}
            />

            {/* 스포트라이트 (타겟이 있을 때만) */}
            {targetRect && !isAIChatGuide && (
                <div
                    className="absolute bg-transparent rounded-2xl ring-4 ring-white/50 transition-all duration-300"
                    style={{
                        top: targetRect.top - 8,
                        left: targetRect.left - 8,
                        width: targetRect.width + 16,
                        height: targetRect.height + 16,
                        boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6)",
                    }}
                />
            )}

            {/* 말풍선 */}
            <div
                className="absolute bg-white rounded-3xl shadow-2xl p-6 w-80 transition-all duration-300 animate-in fade-in-0 zoom-in-95"
                style={{
                    top: bubbleStyle.top,
                    left: bubbleStyle.left,
                    transform: isAIChatGuide ? "translate(-50%, -50%)" : undefined,
                }}
            >
                {/* 화살표 (중앙 모달이 아닐 때만) */}
                {targetRect && !isAIChatGuide && (
                    <div
                        className="absolute w-4 h-4 bg-white transform rotate-45"
                        style={{
                            ...(arrowDirection === "up"
                                ? { top: -8 }
                                : { bottom: -8 }),
                            left: Math.max(20, Math.min(arrowLeft - 8, 280)),
                        }}
                    />
                )}

                {/* 아이콘 */}
                <div className="w-14 h-14 bg-gradient-to-br from-sky-400 to-violet-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Icon className="w-7 h-7 text-white" />
                </div>

                {/* 제목 */}
                <h3 className="text-lg font-bold text-gray-800 text-center mb-2">
                    {step.title}
                </h3>

                {/* 설명 */}
                <p className="text-gray-600 text-center text-sm leading-relaxed mb-5">
                    {step.description}
                </p>

                {/* 진행 표시 */}
                <div className="flex justify-center gap-1.5 mb-5">
                    {steps.map((_, idx) => (
                        <div
                            key={idx}
                            className={`w-2 h-2 rounded-full transition-all ${
                                idx === currentStep
                                    ? "w-6 bg-sky-500"
                                    : idx < currentStep
                                        ? "bg-sky-300"
                                        : "bg-gray-200"
                            }`}
                        />
                    ))}
                </div>

                {/* 버튼 */}
                <div className="flex gap-3">
                    <button
                        onClick={handleSkip}
                        className="flex-1 py-3 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
                    >
                        건너뛰기
                    </button>

                    {isLastStep && userType === "memorial" ? (
                        <button
                            onClick={handleGoToAIChat}
                            className="flex-1 py-3 bg-gradient-to-r from-sky-500 to-violet-500 text-white rounded-xl font-medium text-sm hover:shadow-lg transition-all"
                        >
                            AI 펫톡 가기
                        </button>
                    ) : (
                        <button
                            onClick={handleNext}
                            className="flex-1 py-3 bg-gradient-to-r from-sky-500 to-violet-500 text-white rounded-xl font-medium text-sm hover:shadow-lg transition-all"
                        >
                            {isLastStep ? "시작하기" : "다음"}
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
