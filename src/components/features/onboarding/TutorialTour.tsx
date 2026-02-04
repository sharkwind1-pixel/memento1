/**
 * TutorialTour.tsx
 * 스포트라이트 + 몽글몽글 코치마크 튜토리얼
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Hand, Sparkles } from "lucide-react";

interface TutorialTourProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (tab: string) => void;
}

interface TutorialStep {
    targetId: string; // data-tutorial-id 값
    title: string;
    description: string;
    position: "top" | "bottom"; // 말풍선 위치
}

const TUTORIAL_STEPS: TutorialStep[] = [
    {
        targetId: "home",
        title: "홈",
        description: "메멘토애니의 시작점이에요",
        position: "top",
    },
    {
        targetId: "record",
        title: "우리의 기록",
        description: "반려동물 등록과 추억을 기록해요",
        position: "top",
    },
    {
        targetId: "community",
        title: "커뮤니티",
        description: "다른 반려인들과 소통해요",
        position: "top",
    },
    {
        targetId: "ai-chat",
        title: "AI 펫톡",
        description: "우리 아이와 대화해보세요",
        position: "top",
    },
    {
        targetId: "magazine",
        title: "펫 매거진",
        description: "유용한 반려 정보를 확인해요",
        position: "top",
    },
    {
        targetId: "more",
        title: "더보기",
        description: "입양, 지역정보, 분실동물 찾기",
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
    const [mounted, setMounted] = useState(false);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const wasOpenRef = useRef(false);

    // 타겟 요소 위치 계산
    const updateTargetRect = useCallback(() => {
        if (!isOpen) return;

        const step = TUTORIAL_STEPS[currentStep];
        const target = document.querySelector(`[data-tutorial-id="${step.targetId}"]`);

        if (target) {
            const rect = target.getBoundingClientRect();
            setTargetRect(rect);
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
            // 홈 탭으로 먼저 이동
            onNavigate("home");
        } else if (!isOpen && wasOpenRef.current) {
            document.body.style.overflow = "";
        }
        wasOpenRef.current = isOpen;
    }, [isOpen, onNavigate]);

    // 스텝 변경 또는 리사이즈 시 위치 업데이트
    useEffect(() => {
        if (!isOpen) return;

        // 약간의 딜레이 후 위치 계산 (탭 전환 애니메이션 대기)
        const timer = setTimeout(updateTargetRect, 100);

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

    // 타겟 요소 클릭 감지
    useEffect(() => {
        if (!isOpen) return;

        const step = TUTORIAL_STEPS[currentStep];
        const target = document.querySelector(`[data-tutorial-id="${step.targetId}"]`);

        const handleTargetClick = () => {
            // 다음 단계로
            if (currentStep < TUTORIAL_STEPS.length - 1) {
                setCurrentStep(currentStep + 1);
            } else {
                handleComplete();
            }
        };

        if (target) {
            target.addEventListener("click", handleTargetClick);
            return () => target.removeEventListener("click", handleTargetClick);
        }
    }, [isOpen, currentStep]);

    if (!isOpen || !mounted) return null;

    const step = TUTORIAL_STEPS[currentStep];
    const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

    const handleComplete = () => {
        markTutorialComplete();
        document.body.style.overflow = "";
        onNavigate("home");
        onClose();
    };

    const handleSkip = () => {
        markTutorialComplete();
        document.body.style.overflow = "";
        onNavigate("home");
        onClose();
    };

    // 오버레이 클릭 핸들러 - 타겟 영역 클릭 시 다음 단계, 아니면 건너뛰기
    const handleOverlayClick = (e: React.MouseEvent) => {
        if (!targetRect) {
            handleSkip();
            return;
        }

        const clickX = e.clientX;
        const clickY = e.clientY;

        // 타겟 영역 안에서 클릭했는지 확인
        const isInTarget =
            clickX >= targetRect.left - 12 &&
            clickX <= targetRect.right + 12 &&
            clickY >= targetRect.top - 12 &&
            clickY <= targetRect.bottom + 12;

        if (isInTarget) {
            // 다음 단계로
            if (currentStep < TUTORIAL_STEPS.length - 1) {
                setCurrentStep(currentStep + 1);
            } else {
                handleComplete();
            }
        } else {
            // 영역 밖 클릭 시 건너뛰기
            handleSkip();
        }
    };

    // 말풍선 위치 계산
    const getBubbleStyle = (): React.CSSProperties => {
        if (!targetRect) return { opacity: 0 };

        const bubbleWidth = 200;
        const bubbleHeight = 100;
        const padding = 16;

        let left = targetRect.left + targetRect.width / 2 - bubbleWidth / 2;
        let top = step.position === "top"
            ? targetRect.top - bubbleHeight - padding - 20
            : targetRect.bottom + padding + 20;

        // 화면 경계 체크
        if (left < 16) left = 16;
        if (left + bubbleWidth > window.innerWidth - 16) {
            left = window.innerWidth - bubbleWidth - 16;
        }

        return {
            position: "fixed",
            left: `${left}px`,
            top: `${top}px`,
            width: `${bubbleWidth}px`,
        };
    };

    // 화살표 위치 계산
    const getArrowStyle = (): React.CSSProperties => {
        if (!targetRect) return { opacity: 0 };

        return {
            position: "fixed",
            left: `${targetRect.left + targetRect.width / 2 - 12}px`,
            top: step.position === "top"
                ? `${targetRect.top - 32}px`
                : `${targetRect.bottom + 8}px`,
            transform: step.position === "top" ? "rotate(180deg)" : "rotate(0deg)",
        };
    };

    // 고유 ID 생성 (SSR 호환)
    const maskId = "tutorial-spotlight-mask";

    const content = (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
            {/* 스포트라이트 오버레이 (SVG mask로 구멍 뚫기) */}
            <svg
                className="absolute inset-0 w-full h-full pointer-events-auto"
                onClick={handleOverlayClick}
                style={{ pointerEvents: "auto" }}
            >
                <defs>
                    <mask id={maskId}>
                        {/* 전체 흰색 (보임) */}
                        <rect x="0" y="0" width="100%" height="100%" fill="white" />
                        {/* 타겟 영역 검정 (구멍) */}
                        {targetRect && (
                            <rect
                                x={targetRect.left - 12}
                                y={targetRect.top - 12}
                                width={targetRect.width + 24}
                                height={targetRect.height + 24}
                                rx="20"
                                ry="20"
                                fill="black"
                            />
                        )}
                    </mask>
                </defs>
                {/* 어두운 오버레이 (마스크 적용) */}
                <rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    fill="rgba(0, 0, 0, 0.85)"
                    mask={`url(#${maskId})`}
                    style={{ pointerEvents: "auto" }}
                />
                {/* 타겟 영역은 클릭이 통과하도록 투명 rect */}
                {targetRect && (
                    <rect
                        x={targetRect.left - 12}
                        y={targetRect.top - 12}
                        width={targetRect.width + 24}
                        height={targetRect.height + 24}
                        fill="transparent"
                        style={{ pointerEvents: "none" }}
                    />
                )}
            </svg>

            {/* 스포트라이트 테두리 (몽글몽글 효과) */}
            {targetRect && (
                <div
                    className="absolute pointer-events-none transition-all duration-300 ease-out"
                    style={{
                        left: targetRect.left - 16,
                        top: targetRect.top - 16,
                        width: targetRect.width + 32,
                        height: targetRect.height + 32,
                    }}
                >
                    {/* 빛나는 테두리 */}
                    <div
                        className="absolute inset-0 rounded-3xl"
                        style={{
                            boxShadow: "0 0 30px 8px rgba(56, 189, 248, 0.4), 0 0 60px 12px rgba(5, 178, 220, 0.2)",
                            border: "2px solid rgba(255,255,255,0.5)",
                        }}
                    />
                    {/* 몽글몽글 장식 - 파스텔 색상 */}
                    <div className="absolute -top-3 left-1/4 w-5 h-5 bg-sky-200/60 rounded-full blur-[2px] animate-pulse" />
                    <div className="absolute -top-2 right-1/3 w-4 h-4 bg-violet-200/50 rounded-full blur-[2px] animate-pulse" style={{ animationDelay: "0.3s" }} />
                    <div className="absolute top-1/4 -right-3 w-5 h-5 bg-sky-200/60 rounded-full blur-[2px] animate-pulse" style={{ animationDelay: "0.6s" }} />
                    <div className="absolute bottom-1/4 -left-3 w-4 h-4 bg-violet-200/50 rounded-full blur-[2px] animate-pulse" style={{ animationDelay: "0.9s" }} />
                    <div className="absolute -bottom-2 left-1/2 w-4 h-4 bg-amber-200/50 rounded-full blur-[2px] animate-pulse" style={{ animationDelay: "0.5s" }} />
                </div>
            )}

            {/* 몽글몽글 구름 말풍선 */}
            <div
                className="pointer-events-none animate-in fade-in zoom-in-95 duration-300"
                style={getBubbleStyle()}
            >
                {/* 메인 구름 */}
                <div className="relative">
                    {/* 구름 본체 - 여러 원으로 몽글몽글하게 */}
                    <div className="relative bg-white rounded-[28px] px-5 py-4 shadow-xl">
                        {/* 구름 장식 (좌우 볼록) */}
                        <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-6 h-10 bg-white rounded-full" />
                        <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-6 h-10 bg-white rounded-full" />
                        <div className="absolute left-4 -top-2 w-8 h-6 bg-white rounded-full" />
                        <div className="absolute right-4 -top-2 w-10 h-6 bg-white rounded-full" />
                        <div className="absolute left-1/2 -translate-x-1/2 -top-3 w-12 h-6 bg-white rounded-full" />

                        {/* 내용 */}
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-1">
                                <Sparkles className="w-4 h-4 text-[#05B2DC]" />
                                <span className="font-bold text-gray-800 text-sm">
                                    {step.title}
                                </span>
                                <span className="text-xs text-gray-400 ml-auto">
                                    {currentStep + 1}/{TUTORIAL_STEPS.length}
                                </span>
                            </div>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                {step.description}
                            </p>

                            {/* 안내 텍스트 */}
                            <p className="text-[10px] text-[#05B2DC] mt-2 flex items-center gap-1">
                                <Hand className="w-3 h-3" />
                                눌러서 이동해보세요!
                            </p>
                        </div>
                    </div>

                    {/* 구름 꼬리 (말풍선 화살표) */}
                    <div
                        className={`absolute left-1/2 -translate-x-1/2 flex flex-col items-center ${
                            step.position === "top" ? "-bottom-4" : "-top-4 rotate-180"
                        }`}
                    >
                        <div className="w-5 h-5 bg-white rounded-full" />
                        <div className="w-3 h-3 bg-white rounded-full -mt-2" />
                        <div className="w-2 h-2 bg-white rounded-full -mt-1" />
                    </div>
                </div>
            </div>

            {/* 탭 포인터 애니메이션 */}
            {targetRect && (
                <div
                    className="pointer-events-none"
                    style={{
                        position: "fixed",
                        left: targetRect.left + targetRect.width / 2,
                        top: targetRect.top + targetRect.height / 2 + 8,
                        zIndex: 10001,
                    }}
                >
                    <div
                        className="relative"
                        style={{
                            animation: "tapAnimation 1.5s ease-in-out infinite",
                        }}
                    >
                        {/* 탭 원형 효과 */}
                        <div
                            className="absolute -top-8 -left-8 w-16 h-16 rounded-full bg-white/30"
                            style={{
                                animation: "tapRipple 1.5s ease-out infinite",
                            }}
                        />
                        {/* 손가락 아이콘 */}
                        <svg
                            viewBox="0 0 24 24"
                            className="w-10 h-10 drop-shadow-lg"
                            fill="white"
                        >
                            <path d="M9.5 4c.28 0 .5.22.5.5v6c0 .28-.22.5-.5.5s-.5-.22-.5-.5v-6c0-.28.22-.5.5-.5zM12 3c.28 0 .5.22.5.5v7c0 .28-.22.5-.5.5s-.5-.22-.5-.5v-7c0-.28.22-.5.5-.5zM14.5 4c.28 0 .5.22.5.5v6c0 .28-.22.5-.5.5s-.5-.22-.5-.5v-6c0-.28.22-.5.5-.5zM17 5.5c0-.28.22-.5.5-.5s.5.22.5.5v5c0 .28-.22.5-.5.5s-.5-.22-.5-.5v-5zM6 11.5v-1c0-.83.67-1.5 1.5-1.5H8v3.5c0 2.49 2.01 4.5 4.5 4.5h3.25c.97 0 1.75.78 1.75 1.75V19c0 .55-.45 1-1 1H9c-2.76 0-5-2.24-5-5v-2c0-.83.67-1.5 1.5-1.5H6z"/>
                        </svg>
                    </div>
                </div>
            )}

            {/* 탭 애니메이션 스타일 */}
            <style>{`
                @keyframes tapAnimation {
                    0%, 100% { transform: translateY(0) scale(1); }
                    50% { transform: translateY(-8px) scale(0.95); }
                }
                @keyframes tapRipple {
                    0% { transform: scale(0.5); opacity: 0.8; }
                    100% { transform: scale(1.5); opacity: 0; }
                }
            `}</style>

            {/* 건너뛰기 버튼 */}
            <button
                onClick={handleSkip}
                className="fixed top-4 right-4 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-sm rounded-full transition-colors"
            >
                건너뛰기
            </button>

            {/* 진행률 표시 */}
            <div className="fixed top-4 left-4 flex items-center gap-2">
                {TUTORIAL_STEPS.map((_, index) => (
                    <div
                        key={index}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                            index === currentStep
                                ? "w-6 bg-white"
                                : index < currentStep
                                ? "w-3 bg-white/60"
                                : "w-3 bg-white/30"
                        }`}
                    />
                ))}
            </div>
        </div>
    );

    return createPortal(content, document.body);
}
