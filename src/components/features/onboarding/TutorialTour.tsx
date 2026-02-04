/**
 * TutorialTour.tsx
 * 스포트라이트 + 몽글몽글 코치마크 튜토리얼
 * 하단 네비게이션에 최적화된 버전
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Sparkles } from "lucide-react";

interface TutorialTourProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (tab: string) => void;
}

interface TutorialStep {
    targetId: string;
    title: string;
    description: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
    {
        targetId: "home",
        title: "홈",
        description: "메멘토애니의 시작점이에요",
    },
    {
        targetId: "record",
        title: "우리의 기록",
        description: "반려동물 등록과 추억을 기록해요",
    },
    {
        targetId: "community",
        title: "커뮤니티",
        description: "다른 반려인들과 소통해요",
    },
    {
        targetId: "ai-chat",
        title: "AI 펫톡",
        description: "우리 아이와 대화해보세요",
    },
    {
        targetId: "magazine",
        title: "펫 매거진",
        description: "유용한 반려 정보를 확인해요",
    },
    {
        targetId: "more",
        title: "더보기",
        description: "입양, 지역정보, 분실동물 찾기",
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
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const wasOpenRef = useRef(false);
    const onNavigateRef = useRef(onNavigate);

    // onNavigate ref 업데이트
    useEffect(() => {
        onNavigateRef.current = onNavigate;
    }, [onNavigate]);

    // 타겟 요소 위치 계산
    const updateTargetRect = useCallback(() => {
        if (!isOpen) return;

        const step = TUTORIAL_STEPS[currentStep];
        const target = document.querySelector(`[data-tutorial-id="${step.targetId}"]`);

        if (target) {
            const rect = target.getBoundingClientRect();
            setTargetRect(rect);
        } else {
            setTargetRect(null);
        }
    }, [isOpen, currentStep]);

    useEffect(() => {
        setMounted(true);
    }, []);

    // isOpen이 변경될 때
    useEffect(() => {
        if (isOpen && !wasOpenRef.current) {
            document.body.style.overflow = "hidden";
            setCurrentStep(0);
            onNavigateRef.current("home");
        } else if (!isOpen && wasOpenRef.current) {
            document.body.style.overflow = "";
        }
        wasOpenRef.current = isOpen;
    }, [isOpen]);

    // 스텝 변경 또는 리사이즈 시 위치 업데이트
    useEffect(() => {
        if (!isOpen) return;

        const timer = setTimeout(updateTargetRect, 150);

        window.addEventListener("resize", updateTargetRect);
        window.addEventListener("scroll", updateTargetRect);

        return () => {
            clearTimeout(timer);
            window.removeEventListener("resize", updateTargetRect);
            window.removeEventListener("scroll", updateTargetRect);
        };
    }, [isOpen, currentStep, updateTargetRect]);

    // 컴포넌트 언마운트 시
    useEffect(() => {
        return () => {
            document.body.style.overflow = "";
        };
    }, []);

    if (!isOpen || !mounted) return null;

    const step = TUTORIAL_STEPS[currentStep];

    const handleComplete = () => {
        markTutorialComplete();
        document.body.style.overflow = "";
        onNavigateRef.current("home");
        onClose();
    };

    const handleSkip = () => {
        markTutorialComplete();
        document.body.style.overflow = "";
        onNavigateRef.current("home");
        onClose();
    };

    const handleNext = () => {
        if (currentStep < TUTORIAL_STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    // 스포트라이트 영역 계산 (패딩 포함)
    const spotlightPadding = 8;
    const spotlightRect = targetRect ? {
        x: targetRect.left - spotlightPadding,
        y: targetRect.top - spotlightPadding,
        width: targetRect.width + spotlightPadding * 2,
        height: targetRect.height + spotlightPadding * 2,
    } : null;

    const maskId = "tutorial-spotlight-mask";

    const content = (
        <div className="fixed inset-0 z-[9999]">
            {/* SVG 스포트라이트 오버레이 */}
            <svg
                className="absolute inset-0 w-full h-full"
                style={{ pointerEvents: "auto" }}
                onClick={handleNext}
            >
                <defs>
                    <mask id={maskId}>
                        <rect x="0" y="0" width="100%" height="100%" fill="white" />
                        {spotlightRect && (
                            <rect
                                x={spotlightRect.x}
                                y={spotlightRect.y}
                                width={spotlightRect.width}
                                height={spotlightRect.height}
                                rx="16"
                                ry="16"
                                fill="black"
                            />
                        )}
                    </mask>
                </defs>
                <rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    fill="rgba(0, 0, 0, 0.8)"
                    mask={`url(#${maskId})`}
                />
            </svg>

            {/* 스포트라이트 테두리 빛 효과 */}
            {spotlightRect && (
                <div
                    className="absolute pointer-events-none"
                    style={{
                        left: spotlightRect.x - 4,
                        top: spotlightRect.y - 4,
                        width: spotlightRect.width + 8,
                        height: spotlightRect.height + 8,
                        borderRadius: 20,
                        boxShadow: `
                            0 0 0 3px rgba(56, 189, 248, 0.6),
                            0 0 20px 4px rgba(56, 189, 248, 0.4),
                            0 0 40px 8px rgba(5, 178, 220, 0.2)
                        `,
                    }}
                />
            )}

            {/* 몽글몽글 장식 */}
            {spotlightRect && (
                <>
                    <div
                        className="absolute w-4 h-4 bg-sky-300/70 rounded-full animate-pulse pointer-events-none"
                        style={{ left: spotlightRect.x - 8, top: spotlightRect.y - 8 }}
                    />
                    <div
                        className="absolute w-3 h-3 bg-violet-300/60 rounded-full animate-pulse pointer-events-none"
                        style={{ left: spotlightRect.x + spotlightRect.width + 4, top: spotlightRect.y, animationDelay: "0.3s" }}
                    />
                    <div
                        className="absolute w-3 h-3 bg-amber-200/60 rounded-full animate-pulse pointer-events-none"
                        style={{ left: spotlightRect.x + spotlightRect.width / 2, top: spotlightRect.y - 10, animationDelay: "0.6s" }}
                    />
                </>
            )}

            {/* 구름 말풍선 - 하이라이트 위에 표시 */}
            {targetRect && (
                <div
                    className="fixed pointer-events-none animate-in fade-in zoom-in-95 duration-300"
                    style={{
                        left: Math.max(16, Math.min(targetRect.left + targetRect.width / 2 - 130, window.innerWidth - 276)),
                        top: Math.max(80, targetRect.top - 180),
                    }}
                >
                    <div className="relative">
                        {/* 구름 본체 */}
                        <div className="relative bg-white rounded-3xl px-5 py-4 shadow-2xl w-[260px]">
                            {/* 구름 장식 */}
                            <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-6 h-10 bg-white rounded-full" />
                            <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-6 h-10 bg-white rounded-full" />
                            <div className="absolute left-4 -top-2 w-8 h-5 bg-white rounded-full" />
                            <div className="absolute right-4 -top-2 w-10 h-5 bg-white rounded-full" />
                            <div className="absolute left-1/2 -translate-x-1/2 -top-3 w-12 h-5 bg-white rounded-full" />

                        {/* 내용 */}
                        <div className="relative z-10 text-center">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <Sparkles className="w-5 h-5 text-[#05B2DC]" />
                                <span className="font-bold text-gray-800 text-base">
                                    {step.title}
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed mb-3">
                                {step.description}
                            </p>

                            {/* 진행 표시 */}
                            <div className="flex items-center justify-center gap-1.5 mb-3">
                                {TUTORIAL_STEPS.map((_, index) => (
                                    <div
                                        key={index}
                                        className={`h-1.5 rounded-full transition-all duration-300 ${
                                            index === currentStep
                                                ? "w-5 bg-[#05B2DC]"
                                                : index < currentStep
                                                    ? "w-2 bg-[#05B2DC]/50"
                                                    : "w-2 bg-gray-200"
                                        }`}
                                    />
                                ))}
                            </div>

                            {/* 안내 텍스트 */}
                            <p className="text-xs text-[#05B2DC] font-medium">
                                화면을 탭하면 다음으로
                            </p>
                        </div>
                    </div>

                    {/* 구름 꼬리 (아래로 향하는 화살표) */}
                    <div className="absolute left-1/2 -translate-x-1/2 -bottom-5 flex flex-col items-center">
                        <div className="w-5 h-5 bg-white rounded-full shadow-lg" />
                        <div className="w-3 h-3 bg-white rounded-full -mt-1.5 shadow-md" />
                        <div className="w-2 h-2 bg-white rounded-full -mt-1 shadow-sm" />
                    </div>
                </div>
            </div>
            )}

            {/* 탭 애니메이션 - 타겟 위에 표시 */}
            {targetRect && (
                <div
                    className="absolute pointer-events-none"
                    style={{
                        left: targetRect.left + targetRect.width / 2 - 20,
                        top: targetRect.top + targetRect.height / 2 - 20,
                    }}
                >
                    <div className="relative animate-bounce">
                        <div className="w-10 h-10 rounded-full border-2 border-white/80 bg-white/20 flex items-center justify-center">
                            <div className="w-3 h-3 rounded-full bg-white animate-ping" />
                        </div>
                    </div>
                </div>
            )}

            {/* 건너뛰기 버튼 */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    handleSkip();
                }}
                className="fixed top-4 right-4 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white text-sm rounded-full transition-colors z-[10000]"
            >
                건너뛰기
            </button>
        </div>
    );

    return createPortal(content, document.body);
}
