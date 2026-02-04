/**
 * TutorialTour.tsx
 * 코치마크 스타일 튜토리얼 - 실제 UI 요소에 스포트라이트
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import {
    ArrowRight,
    ArrowLeft,
    X,
    Sparkles,
} from "lucide-react";

interface TutorialTourProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (tab: string) => void;
}

interface TutorialStep {
    id: string;
    targetId: string; // data-tutorial-id 값
    title: string;
    description: string;
    position: "top" | "bottom";
}

const TUTORIAL_STEPS: TutorialStep[] = [
    {
        id: "home",
        targetId: "home",
        title: "홈",
        description: "메멘토애니의 시작점이에요.\n주요 기능을 한눈에 볼 수 있어요.",
        position: "top",
    },
    {
        id: "record",
        targetId: "record",
        title: "우리의 기록",
        description: "반려동물을 등록하고\n소중한 추억을 기록해요.",
        position: "top",
    },
    {
        id: "community",
        targetId: "community",
        title: "커뮤니티",
        description: "다른 반려인들과 소통하고\n정보를 나눌 수 있어요.",
        position: "top",
    },
    {
        id: "ai-chat",
        targetId: "ai-chat",
        title: "AI 펫톡",
        description: "등록한 반려동물과 대화해요.\n추억 속 아이와 다시 만나보세요.",
        position: "top",
    },
    {
        id: "magazine",
        targetId: "magazine",
        title: "펫 매거진",
        description: "반려동물 관련 유용한 정보와\n트렌드를 확인해요.",
        position: "top",
    },
    {
        id: "more",
        targetId: "more",
        title: "더보기",
        description: "입양정보, 지역정보, 분실동물 찾기 등\n더 많은 기능이 있어요.",
        position: "top",
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
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const [mounted, setMounted] = useState(false);

    // 클라이언트에서만 렌더링
    useEffect(() => {
        setMounted(true);
    }, []);

    // 타겟 요소 위치 계산
    const updateTargetPosition = useCallback(() => {
        if (!isOpen) return;

        const step = TUTORIAL_STEPS[currentStep];
        // 하단 네비게이션(모바일)에서 먼저 찾고, 없으면 데스크톱 네비에서 찾기
        let targetElement = document.querySelector(`[data-tutorial-id="${step.targetId}"]`);

        // 요소가 없거나 화면에 안 보이면 (데스크톱에서 하단 네비가 hidden)
        if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            // 요소가 화면에 보이는지 확인
            if (rect.width > 0 && rect.height > 0) {
                setTargetRect(rect);
                return;
            }
        }

        // 타겟을 못 찾으면 null (fallback UI 표시)
        setTargetRect(null);
    }, [isOpen, currentStep]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
            setCurrentStep(0);
            updateTargetPosition();
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen, updateTargetPosition]);

    // 윈도우 리사이즈 대응
    useEffect(() => {
        if (!isOpen) return;

        const handleResize = () => updateTargetPosition();
        window.addEventListener("resize", handleResize);

        // 초기 위치 설정
        const timer = setTimeout(updateTargetPosition, 100);

        return () => {
            window.removeEventListener("resize", handleResize);
            clearTimeout(timer);
        };
    }, [isOpen, currentStep, updateTargetPosition]);

    if (!isOpen || !mounted) return null;

    const step = TUTORIAL_STEPS[currentStep];
    const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
    const isFirstStep = currentStep === 0;

    const handleNext = () => {
        if (isLastStep) {
            handleComplete();
        } else {
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
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

    // 스포트라이트 마스크 계산
    const padding = 8;
    const borderRadius = 16;

    // 데스크톱 fallback: 타겟을 못 찾으면 중앙 모달로 표시
    const isMobile = targetRect !== null;

    const tooltipContent = (
        <div className="fixed inset-0 z-[9999]">
            {/* 어두운 오버레이 */}
            {isMobile ? (
                // 모바일: 스포트라이트 with 구멍
                <svg className="absolute inset-0 w-full h-full">
                    <defs>
                        <mask id="spotlight-mask">
                            <rect x="0" y="0" width="100%" height="100%" fill="white" />
                            <rect
                                x={targetRect.left - padding}
                                y={targetRect.top - padding}
                                width={targetRect.width + padding * 2}
                                height={targetRect.height + padding * 2}
                                rx={borderRadius}
                                ry={borderRadius}
                                fill="black"
                            />
                        </mask>
                    </defs>
                    <rect
                        x="0"
                        y="0"
                        width="100%"
                        height="100%"
                        fill="rgba(0, 0, 0, 0.75)"
                        mask="url(#spotlight-mask)"
                    />
                </svg>
            ) : (
                // 데스크톱: 단순 오버레이
                <div className="absolute inset-0 bg-black/75" onClick={handleSkip} />
            )}

            {/* 스포트라이트 테두리 (모바일만) */}
            {isMobile && (
                <div
                    className="absolute border-2 border-white/50 rounded-2xl pointer-events-none animate-pulse"
                    style={{
                        left: targetRect.left - padding,
                        top: targetRect.top - padding,
                        width: targetRect.width + padding * 2,
                        height: targetRect.height + padding * 2,
                        boxShadow: "0 0 0 4px rgba(5, 178, 220, 0.3), 0 0 20px rgba(5, 178, 220, 0.5)",
                    }}
                />
            )}

            {/* 설명 툴팁 */}
            {isMobile ? (
                <div
                    className="absolute w-[280px] animate-in fade-in slide-in-from-bottom-2 duration-300"
                    style={{
                        left: Math.max(16, Math.min(
                            targetRect.left + targetRect.width / 2 - 140,
                            window.innerWidth - 296
                        )),
                        bottom: step.position === "top"
                            ? window.innerHeight - targetRect.top + 16
                            : undefined,
                        top: step.position === "bottom"
                            ? targetRect.bottom + 16
                            : undefined,
                    }}
                >
                    {/* 화살표 */}
                    <div
                        className="absolute w-4 h-4 bg-white rotate-45"
                        style={{
                            left: Math.max(20, Math.min(
                                targetRect.left + targetRect.width / 2 - (Math.max(16, Math.min(
                                    targetRect.left + targetRect.width / 2 - 140,
                                    window.innerWidth - 296
                                ))),
                                240
                            )),
                            ...(step.position === "top"
                                ? { bottom: -8 }
                                : { top: -8 }
                            ),
                        }}
                    />

                    {/* 카드 */}
                    <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden">
                        {/* 진행 바 */}
                        <div className="flex gap-1 px-4 pt-4">
                            {TUTORIAL_STEPS.map((_, index) => (
                                <div
                                    key={index}
                                    className={`h-1 flex-1 rounded-full transition-all ${
                                        index <= currentStep
                                            ? "bg-gradient-to-r from-[#05B2DC] to-[#38BDF8]"
                                            : "bg-gray-200"
                                    }`}
                                />
                            ))}
                        </div>

                        {/* 내용 */}
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-[#05B2DC]" />
                                    {step.title}
                                </h3>
                                <span className="text-xs text-gray-400">
                                    {currentStep + 1}/{TUTORIAL_STEPS.length}
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed mb-4">
                                {step.description}
                            </p>

                            {/* 버튼 */}
                            <div className="flex gap-2">
                                {!isFirstStep && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handlePrev}
                                        className="flex-1 rounded-xl"
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-1" />
                                        이전
                                    </Button>
                                )}
                                <Button
                                    size="sm"
                                    onClick={handleNext}
                                    className="flex-1 rounded-xl bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] text-white"
                                >
                                    {isLastStep ? (
                                        <>
                                            <Sparkles className="w-4 h-4 mr-1" />
                                            완료
                                        </>
                                    ) : (
                                        <>
                                            다음
                                            <ArrowRight className="w-4 h-4 ml-1" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* 건너뛰기 */}
                        <div className="px-4 pb-4 pt-0">
                            <button
                                onClick={handleSkip}
                                className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors py-1"
                            >
                                건너뛰기
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                // 데스크톱: 중앙 모달
                <div className="absolute inset-0 flex items-center justify-center p-4">
                    <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                        {/* 진행 바 */}
                        <div className="flex gap-1 px-4 pt-4">
                            {TUTORIAL_STEPS.map((_, index) => (
                                <div
                                    key={index}
                                    className={`h-1 flex-1 rounded-full transition-all ${
                                        index <= currentStep
                                            ? "bg-gradient-to-r from-[#05B2DC] to-[#38BDF8]"
                                            : "bg-gray-200"
                                    }`}
                                />
                            ))}
                        </div>

                        {/* 내용 */}
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-[#05B2DC]" />
                                    {step.title}
                                </h3>
                                <span className="text-sm text-gray-400">
                                    {currentStep + 1}/{TUTORIAL_STEPS.length}
                                </span>
                            </div>
                            <p className="text-gray-600 whitespace-pre-line leading-relaxed mb-6">
                                {step.description}
                            </p>
                            <p className="text-xs text-gray-400 mb-4">
                                모바일에서 하단 메뉴를 직접 확인해보세요
                            </p>

                            {/* 버튼 */}
                            <div className="flex gap-3">
                                {!isFirstStep && (
                                    <Button
                                        variant="outline"
                                        onClick={handlePrev}
                                        className="flex-1 rounded-xl"
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-1" />
                                        이전
                                    </Button>
                                )}
                                <Button
                                    onClick={handleNext}
                                    className="flex-1 rounded-xl bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] text-white"
                                >
                                    {isLastStep ? (
                                        <>
                                            <Sparkles className="w-4 h-4 mr-1" />
                                            완료
                                        </>
                                    ) : (
                                        <>
                                            다음
                                            <ArrowRight className="w-4 h-4 ml-1" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* 건너뛰기 */}
                        <div className="px-6 pb-6 pt-0">
                            <button
                                onClick={handleSkip}
                                className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors py-2"
                            >
                                건너뛰기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 닫기 버튼 */}
            <button
                onClick={handleSkip}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
                <X className="w-5 h-5 text-white" />
            </button>
        </div>
    );

    // Portal로 body에 직접 렌더링
    return createPortal(tooltipContent, document.body);
}
