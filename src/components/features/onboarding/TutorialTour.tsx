/**
 * TutorialTour.tsx
 * 스포트라이트 + 몽글몽글 코치마크 튜토리얼
 * 데스크톱/모바일 반응형
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

// 데스크톱용 튜토리얼 (헤더에 모든 메뉴가 보임)
const DESKTOP_STEPS: TutorialStep[] = [
    { targetId: "home", title: "홈", description: "메멘토애니의 시작점이에요" },
    { targetId: "record", title: "우리의 기록", description: "반려동물 등록과 추억을 기록해요" },
    { targetId: "community", title: "커뮤니티", description: "다른 반려인들과 소통해요" },
    { targetId: "ai-chat", title: "AI 펫톡", description: "우리 아이와 대화해보세요" },
    { targetId: "magazine", title: "펫 매거진", description: "유용한 반려 정보를 확인해요" },
    { targetId: "adoption", title: "입양정보", description: "새로운 가족을 찾아보세요" },
    { targetId: "local", title: "지역정보", description: "주변 동물병원, 미용실 등을 찾아요" },
    { targetId: "lost", title: "분실동물", description: "잃어버린 아이를 찾아요" },
];

// 모바일용 튜토리얼 (하단 네비 5개 + 더보기)
const MOBILE_STEPS: TutorialStep[] = [
    { targetId: "home", title: "홈", description: "메멘토애니의 시작점이에요" },
    { targetId: "record", title: "우리의 기록", description: "반려동물 등록과 추억을 기록해요" },
    { targetId: "community", title: "커뮤니티", description: "다른 반려인들과 소통해요" },
    { targetId: "ai-chat", title: "AI 펫톡", description: "우리 아이와 대화해보세요" },
    { targetId: "magazine", title: "펫 매거진", description: "유용한 반려 정보를 확인해요" },
    { targetId: "more", title: "더보기", description: "입양, 지역정보, 분실동물 등 더 많은 메뉴" },
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
    const [isMobile, setIsMobile] = useState(false);
    const wasOpenRef = useRef(false);
    const onNavigateRef = useRef(onNavigate);

    useEffect(() => {
        onNavigateRef.current = onNavigate;
    }, [onNavigate]);

    // 모바일 여부 감지
    const checkMobile = useCallback(() => {
        setIsMobile(window.innerWidth < 1280); // xl breakpoint
    }, []);

    // 모바일/데스크톱에 따라 다른 스텝 사용
    const steps = isMobile ? MOBILE_STEPS : DESKTOP_STEPS;

    const updateTargetRect = useCallback(() => {
        if (!isOpen) return;

        const currentSteps = window.innerWidth < 1280 ? MOBILE_STEPS : DESKTOP_STEPS;
        const step = currentSteps[currentStep];
        if (!step) return;

        // 같은 ID를 가진 모든 요소 중 보이는 것만 찾기
        const targets = document.querySelectorAll(`[data-tutorial-id="${step.targetId}"]`);
        let visibleTarget: Element | null = null;

        targets.forEach((el) => {
            const htmlEl = el as HTMLElement;
            // offsetParent가 있고 크기가 있으면 보이는 요소
            if (htmlEl.offsetParent !== null && htmlEl.offsetWidth > 0) {
                visibleTarget = el;
            }
        });

        if (visibleTarget) {
            const rect = visibleTarget.getBoundingClientRect();
            setTargetRect(rect);
        } else {
            setTargetRect(null);
        }
    }, [isOpen, currentStep]);

    useEffect(() => {
        setMounted(true);
        checkMobile();
    }, [checkMobile]);

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

    useEffect(() => {
        if (!isOpen) return;

        const timer = setTimeout(updateTargetRect, 150);

        const handleResize = () => {
            checkMobile();
            updateTargetRect();
        };

        window.addEventListener("resize", handleResize);
        window.addEventListener("scroll", updateTargetRect);

        return () => {
            clearTimeout(timer);
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("scroll", updateTargetRect);
        };
    }, [isOpen, currentStep, updateTargetRect, checkMobile]);

    useEffect(() => {
        return () => {
            document.body.style.overflow = "";
        };
    }, []);

    if (!isOpen || !mounted) return null;

    const step = steps[currentStep];

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
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    const spotlightPadding = 8;
    const spotlightRect = targetRect ? {
        x: targetRect.left - spotlightPadding,
        y: targetRect.top - spotlightPadding,
        width: targetRect.width + spotlightPadding * 2,
        height: targetRect.height + spotlightPadding * 2,
    } : null;

    // 말풍선 위치 계산
    // 모바일: 네비가 하단 → 말풍선은 위에 (꼬리가 아래로)
    // 데스크톱: 네비가 상단 → 말풍선은 아래에 (꼬리가 위로)
    const getBubblePosition = () => {
        if (!targetRect) return { left: 0, top: 0 };

        const bubbleWidth = 240;
        let left = targetRect.left + targetRect.width / 2 - bubbleWidth / 2;

        // 화면 경계 체크
        if (left < 16) left = 16;
        if (left + bubbleWidth > window.innerWidth - 16) {
            left = window.innerWidth - bubbleWidth - 16;
        }

        if (isMobile) {
            // 모바일: 하단 네비 바로 위에 말풍선 (몽글몽글 꼬리가 버튼 가리킴)
            // 말풍선 높이 약 160px + 꼬리 55px
            return {
                left,
                top: targetRect.top - 220,
            };
        } else {
            // 데스크톱: 타겟 아래에 말풍선 (꼬리 높이 고려)
            return {
                left,
                top: targetRect.bottom + 50,
            };
        }
    };

    const bubblePos = getBubblePosition();
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

            {/* 몽글몽글 구름 말풍선 */}
            {targetRect && (
                <div
                    className="fixed pointer-events-none animate-in fade-in zoom-in-95 duration-300"
                    style={{
                        left: bubblePos.left,
                        top: bubblePos.top,
                    }}
                >
                    <div className="relative w-[240px]">
                        {/* 꼬리 - 위쪽 (데스크톱: 몽글몽글 구름 꼬리가 위로) */}
                        {!isMobile && (
                            <div className="absolute left-1/2 -translate-x-1/2 -top-14 flex flex-col items-center">
                                <div className="w-3 h-3 bg-white rounded-full" />
                                <div className="w-4 h-4 bg-white rounded-full -mt-1" />
                                <div className="w-5 h-5 bg-white rounded-full -mt-1 shadow-sm" />
                            </div>
                        )}

                        {/* 몽글몽글 구름 본체 */}
                        <div className="relative">
                            {/* 구름 레이어들 - 좌우 & 하단만 (상단은 꼬리 영역) */}
                            <div className="absolute inset-0 -z-10">
                                {/* 좌우 뭉게구름 */}
                                <div className="absolute -left-3 top-4 w-8 h-8 bg-white rounded-full" />
                                <div className="absolute -left-2 top-12 w-7 h-7 bg-white rounded-full" />
                                <div className="absolute -right-3 top-6 w-8 h-8 bg-white rounded-full" />
                                <div className="absolute -right-2 top-14 w-6 h-6 bg-white rounded-full" />

                                {/* 하단 뭉게구름 */}
                                <div className="absolute left-6 -bottom-3 w-7 h-7 bg-white rounded-full" />
                                <div className="absolute left-1/2 -translate-x-1/2 -bottom-4 w-9 h-9 bg-white rounded-full" />
                                <div className="absolute right-6 -bottom-3 w-7 h-7 bg-white rounded-full" />
                            </div>

                            {/* 메인 바디 */}
                            <div className="relative bg-white rounded-[36px] px-5 py-4 shadow-xl">
                                {/* 내용 */}
                                <div className="relative z-10 text-center">
                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        <div className="p-1.5 bg-gradient-to-br from-sky-100 to-violet-100 rounded-full">
                                            <Sparkles className="w-4 h-4 text-[#05B2DC]" />
                                        </div>
                                        <span className="font-bold text-gray-700 text-base">
                                            {step.title}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 leading-relaxed mb-3">
                                        {step.description}
                                    </p>

                                    {/* 진행 표시 - 더 귀엽게 */}
                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        {steps.map((_, index) => (
                                            <div
                                                key={index}
                                                className={`rounded-full transition-all duration-300 ${
                                                    index === currentStep
                                                        ? "w-4 h-4 bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] shadow-md"
                                                        : index < currentStep
                                                            ? "w-2.5 h-2.5 bg-[#05B2DC]/40"
                                                            : "w-2.5 h-2.5 bg-gray-200"
                                                }`}
                                            />
                                        ))}
                                    </div>

                                    <p className="text-xs text-[#05B2DC]/80 font-medium">
                                        탭하여 다음으로
                                    </p>
                                </div>
                            </div>

                            {/* 반짝이 장식 */}
                            <div className="absolute -top-2 -right-1 w-3 h-3 bg-amber-200 rounded-full animate-pulse" />
                            <div className="absolute top-3 -left-2 w-2 h-2 bg-sky-200 rounded-full animate-pulse" style={{ animationDelay: "0.5s" }} />
                            <div className="absolute -bottom-1 right-4 w-2 h-2 bg-violet-200 rounded-full animate-pulse" style={{ animationDelay: "0.3s" }} />
                        </div>

                        {/* 꼬리 - 아래쪽 (모바일: 몽글몽글 구름 꼬리) */}
                        {isMobile && (
                            <div className="absolute left-1/2 -translate-x-1/2 -bottom-10">
                                {/* 구름 뭉치처럼 */}
                                <div className="relative">
                                    <div className="absolute -left-3 top-0 w-5 h-5 bg-white rounded-full" />
                                    <div className="absolute left-1 top-0 w-6 h-6 bg-white rounded-full shadow-sm" />
                                    <div className="absolute -right-2 top-1 w-4 h-4 bg-white rounded-full" />
                                    <div className="absolute left-0 top-4 w-5 h-5 bg-white rounded-full shadow-sm" />
                                    <div className="absolute left-1 top-7 w-4 h-4 bg-white rounded-full" />
                                    <div className="absolute left-1.5 top-9 w-3 h-3 bg-white rounded-full" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 탭 애니메이션 */}
            {targetRect && (
                <div
                    className="absolute pointer-events-none"
                    style={{
                        left: targetRect.left + targetRect.width / 2 - 16,
                        top: targetRect.top + targetRect.height / 2 - 16,
                    }}
                >
                    <div className="relative animate-bounce">
                        <div className="w-8 h-8 rounded-full border-2 border-white/80 bg-white/30 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-white animate-ping" />
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
