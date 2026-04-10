/**
 * RecordPageTutorial.tsx
 * 우리의 기록 페이지 전용 스포트라이트 튜토리얼
 * - 키우고 있다: 반려동물 등록 → 사진/영상 → 타임라인
 * - 이별했다: 추모 등록 → 추억 사진 → AI 펫톡 안내
 *
 * 스크롤 제어: 스텝 전환 시 타겟으로 스크롤 후 잠금
 * 모달은 항상 viewport 중앙 또는 타겟 근처에 표시
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Sparkles, Heart, Camera, MessageCircle, BookOpen, Home } from "lucide-react";
import type { OnboardingUserType, TutorialStep } from "@/types";
import { safeSetItem } from "@/lib/safe-storage";

interface RecordPageTutorialProps {
    isOpen: boolean;
    userType: OnboardingUserType;
    onClose: () => void;
    onGoToAIChat: () => void;
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
    {
        targetId: "minihompy-tab",
        title: "미니홈피를 꾸며보세요",
        description: "나만의 공간에 미니미를 배치하고, 방명록도 받을 수 있어요",
        icon: Home,
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
        targetId: "minihompy-tab",
        title: "추억이 담긴 공간을 만들어요",
        description: "미니홈피에서 아이와의 추억을 간직하고, 방명록으로 위로를 나눠요",
        icon: Home,
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
    const [isScrolling, setIsScrolling] = useState(false);
    const hasInitialized = useRef(false);
    const savedOverflow = useRef("");

    const allSteps = userType === "memorial" ? MEMORIAL_STEPS : CURRENT_STEPS;

    // DOM에 타겟이 존재하는 스텝만 필터 (펫 0마리면 photo-album-section/timeline-section 등 안 보임)
    // ai-chat-guide는 특수 케이스로 항상 포함
    const [steps, setSteps] = useState<TutorialStep[]>(allSteps);

    // 클라이언트 마운트 확인
    useEffect(() => {
        setMounted(true);
    }, []);

    // 스크롤 잠금/해제
    const lockScroll = useCallback(() => {
        if (document.body.style.overflow !== "hidden") {
            savedOverflow.current = document.body.style.overflow;
            document.body.style.overflow = "hidden";
        }
    }, []);

    const unlockScroll = useCallback(() => {
        document.body.style.overflow = savedOverflow.current || "";
    }, []);

    // 타겟 요소 위치 찾기 + 자동 스크롤 후 잠금
    const findAndScrollToTarget = useCallback(() => {
        const step = steps[currentStep];
        if (!step) return;

        // AI 펫톡 가이드 스텝은 화면 중앙에 표시 (타겟 불필요)
        if (step.targetId === "ai-chat-guide" ) {
            setTargetRect(null);
            lockScroll();
            return;
        }

        const target = document.querySelector(`[data-tutorial-id="${step.targetId}"]`);
        if (!target) {
            // 타겟을 못 찾으면 중앙 모달로 표시
            setTargetRect(null);
            lockScroll();
            return;
        }

        const rect = target.getBoundingClientRect();
        const isOutOfView = rect.top < 80 || rect.bottom > window.innerHeight - 80;

        if (isOutOfView) {
            // 스크롤 필요: 잠금 해제 → 스크롤 → 위치 재계산 → 다시 잠금
            setIsScrolling(true);
            unlockScroll();

            target.scrollIntoView({ behavior: "smooth", block: "center" });

            setTimeout(() => {
                const newRect = target.getBoundingClientRect();
                setTargetRect(newRect);
                lockScroll();
                setIsScrolling(false);
            }, 500);
        } else {
            setTargetRect(rect);
            lockScroll();
        }
    }, [currentStep, steps, lockScroll, unlockScroll]);

    // 열릴 때 초기화: 스텝 필터링 + 사이드바 닫기 (isOpen/userType 변경 시만 실행)
    useEffect(() => {
        if (!isOpen) return;

        // 사이드바가 열려 있으면 강제 닫기
        window.dispatchEvent(new Event("closeSidebar"));

        // DOM에 실제로 존재하는 타겟만 포함하도록 스텝 필터링
        // (펫 0마리 → photo-album-section, timeline-section 등 DOM에 없음)
        const filtered = allSteps.filter((s) => {
            if (s.targetId === "ai-chat-guide") return true; // 특수 케이스: 타겟 없이 중앙 모달
            return !!document.querySelector(`[data-tutorial-id="${s.targetId}"]`);
        });
        setSteps(filtered.length > 0 ? filtered : allSteps);
        setCurrentStep(0);
        hasInitialized.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, userType]);

    // 스텝 전환 시 타겟 찾기 + 스크롤 잠금
    useEffect(() => {
        if (!isOpen) return;

        // 딜레이 후 타겟 찾기 (DOM 렌더링 대기)
        const timer = setTimeout(findAndScrollToTarget, 300);

        // 리사이즈 시에만 위치 재계산 (스크롤 리스너 제거)
        const handleResize = () => {
            const step = steps[currentStep];
            if (!step || step.targetId === "ai-chat-guide" ) return;
            const target = document.querySelector(`[data-tutorial-id="${step.targetId}"]`);
            if (target) {
                setTargetRect(target.getBoundingClientRect());
            }
        };

        window.addEventListener("resize", handleResize);

        return () => {
            clearTimeout(timer);
            window.removeEventListener("resize", handleResize);
        };
    }, [isOpen, currentStep, findAndScrollToTarget, steps]);

    // 닫힐 때 정리
    useEffect(() => {
        if (!isOpen) {
            hasInitialized.current = false;
            unlockScroll();
        }
        // 언마운트 시 반드시 스크롤 복구
        return () => {
            document.body.style.overflow = savedOverflow.current || "";
        };
    }, [isOpen, unlockScroll]);

    // 튜토리얼 완료 처리 — localStorage에 저장하여 새로고침 후 반복 방지
    const completeRecordTutorial = useCallback(() => {
        safeSetItem("memento-ani-record-tutorial-complete", "true");
        onClose();
    }, [onClose]);

    // 다음 스텝
    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            completeRecordTutorial();
        }
    };

    // 건너뛰기 — 스킵해도 완료 처리 (재진입 방지)
    const handleSkip = () => {
        completeRecordTutorial();
    };

    // AI 펫톡으로 이동
    const handleGoToAIChat = () => {
        completeRecordTutorial();
        onGoToAIChat();
    };

    if (!mounted || !isOpen) return null;

    const step = steps[currentStep];
    const Icon = step.icon ?? Sparkles;
    const isLastStep = currentStep === steps.length - 1;
    const isAIChatGuide = step.targetId === "ai-chat-guide" ;
    const showAsCenter = !targetRect || isAIChatGuide;

    // 스크롤 중이면 렌더링 지연
    if (isScrolling) {
        return createPortal(
            <div className="fixed inset-0 z-[10000]">
                <div className="absolute inset-0 bg-black/60 transition-opacity duration-300" />
            </div>,
            document.body
        );
    }

    // 말풍선 위치 계산
    const getBubbleStyle = (): {
        top: string;
        left: string;
        transform?: string;
        arrowDirection?: string;
        arrowLeft?: number;
    } => {
        if (showAsCenter) {
            return {
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
            };
        }

        const padding = 16;
        const bubbleWidth = 320;
        const bubbleHeight = 220;
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        // 기본: 타겟 아래에 표시
        let top = targetRect!.bottom + padding;
        let left = targetRect!.left + targetRect!.width / 2 - bubbleWidth / 2;
        let arrowDirection = "up";

        // 화면 아래 넘어가면 위에 표시
        if (top + bubbleHeight > screenHeight - padding) {
            top = targetRect!.top - bubbleHeight - padding;
            arrowDirection = "down";
        }

        // 위에도 공간 없으면 중앙
        if (top < padding) {
            return {
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
            };
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
            arrowLeft: targetRect!.left + targetRect!.width / 2 - left,
        };
    };

    const bubbleStyle = getBubbleStyle();
    const arrowDirection = bubbleStyle.arrowDirection || "up";
    const arrowLeft = bubbleStyle.arrowLeft || 160;
    const isCenterMode = !!bubbleStyle.transform;

    return createPortal(
        <div className="fixed inset-0 z-[10000]">
            {/* 오버레이 */}
            <div
                className="absolute inset-0 bg-black/60 transition-opacity duration-300"
                onClick={handleSkip}
            />

            {/* 스포트라이트 (타겟이 있고 중앙 모드가 아닐 때) */}
            {targetRect && !isCenterMode && (
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
                className="absolute bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 w-80 transition-all duration-300 animate-in fade-in-0 zoom-in-95"
                style={{
                    top: bubbleStyle.top,
                    left: bubbleStyle.left,
                    transform: bubbleStyle.transform,
                }}
            >
                {/* 화살표 (스포트라이트 모드일 때만) */}
                {targetRect && !isCenterMode && (
                    <div
                        className="absolute w-4 h-4 bg-white dark:bg-gray-800 transform rotate-45"
                        style={{
                            ...(arrowDirection === "up"
                                ? { top: -8 }
                                : { bottom: -8 }),
                            left: Math.max(20, Math.min(arrowLeft - 8, 280)),
                        }}
                    />
                )}

                {/* 아이콘 */}
                <div className="w-14 h-14 bg-gradient-to-br from-memento-400 to-violet-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Icon className="w-7 h-7 text-white" />
                </div>

                {/* 제목 */}
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 text-center mb-2">
                    {step.title}
                </h3>

                {/* 설명 */}
                <p className="text-gray-600 dark:text-gray-400 text-center text-sm leading-relaxed mb-5">
                    {step.description}
                </p>

                {/* 진행 표시 */}
                <div className="flex justify-center gap-1.5 mb-5">
                    {steps.map((_, idx) => (
                        <div
                            key={idx}
                            className={`w-2 h-2 rounded-full transition-all ${
                                idx === currentStep
                                    ? "w-6 bg-memento-500"
                                    : idx < currentStep
                                        ? "bg-memento-300"
                                        : "bg-gray-200 dark:bg-gray-600"
                            }`}
                        />
                    ))}
                </div>

                {/* 버튼 */}
                <div className="flex gap-3">
                    <button
                        onClick={handleSkip}
                        className="flex-1 py-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm font-medium transition-colors"
                    >
                        건너뛰기
                    </button>

                    {isLastStep && userType === "memorial" ? (
                        <button
                            onClick={handleGoToAIChat}
                            className="flex-1 py-3 bg-gradient-to-r from-memento-500 to-violet-500 text-white rounded-xl font-medium text-sm hover:shadow-lg transition-all"
                        >
                            AI 펫톡 가기
                        </button>
                    ) : (
                        <button
                            onClick={handleNext}
                            className="flex-1 py-3 bg-gradient-to-r from-memento-500 to-violet-500 text-white rounded-xl font-medium text-sm hover:shadow-lg transition-all"
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
