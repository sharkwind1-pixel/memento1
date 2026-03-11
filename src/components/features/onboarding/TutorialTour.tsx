/**
 * TutorialTour.tsx
 * 스포트라이트 + 구름 말풍선 튜토리얼
 *
 * 데스크톱(xl+): 사이드바 항목을 위→아래로 순차 안내 (11스텝)
 * 모바일(<xl): 하단 네비 5개 순차 안내
 *
 * 스포트라이트: box-shadow 방식 (SVG 마스크보다 단순·확실)
 *
 * 완료 시 onClose → page.tsx에서 RecordPageTutorial로 이어짐
 *
 * v3: ready 게이트 제거. 즉시 렌더링 + requestAnimationFrame 측정.
 *     StrictMode 이중 실행에 완전 안전.
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { TutorialStep } from "@/types";
import { MEMENTO_COLORS } from "@/config/colors";

interface TutorialTourProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (tab: string) => void;
    userId?: string;
}

// ═══════════════════════════════════════════════════════════════
// 스텝 정의
// ═══════════════════════════════════════════════════════════════

const DESKTOP_STEPS: TutorialStep[] = [
    // 메인 네비게이션 먼저 (익숙한 요소부터 안내)
    { targetId: "home", title: "홈", description: "인기 게시글, 입양 정보, 반려 꿀팁까지 한눈에 볼 수 있어요" },
    { targetId: "record", title: "내 기록", description: "반려동물 등록, 사진 앨범, 미니홈피까지! 추억을 기록해요" },
    { targetId: "community", title: "커뮤니티", description: "자유, 추모, 입양, 지역, 분실 등 5개 게시판에서 소통해요" },
    { targetId: "ai-chat", title: "AI 펫톡", description: "우리 아이와 대화하고, 건강 일정도 관리할 수 있어요" },
    { targetId: "magazine", title: "펫 매거진", description: "수의사 칼럼, 돌봄 팁 등 유용한 정보를 확인해요" },
    // 사이드바 기능 (레벨/미니미/포인트/상점)
    { targetId: "sidebar-level", title: "내 등급", description: "활동하면 경험치가 쌓여 등급이 올라가요" },
    { targetId: "sidebar-minimi", title: "내 미니미", description: "나만의 캐릭터를 꾸미고 미니홈피에 배치해보세요" },
    { targetId: "sidebar-points", title: "내 포인트", description: "활동으로 모은 포인트를 확인할 수 있어요" },
    { targetId: "sidebar-shop", title: "포인트 상점", description: "포인트로 미니미 아이템을 구매할 수 있어요" },
    // 고객 지원
    { targetId: "sidebar-inquiry", title: "질문/신고", description: "궁금한 점이나 문제가 있으면 언제든 문의해주세요" },
    { targetId: "sidebar-suggestion", title: "건의사항", description: "서비스 개선 아이디어를 자유롭게 남겨주세요" },
];

const MOBILE_STEPS: TutorialStep[] = [
    { targetId: "home", title: "홈", description: "인기 게시글, 입양 정보, 반려 꿀팁까지 한눈에 볼 수 있어요" },
    { targetId: "record", title: "내 기록", description: "반려동물 등록, 사진 앨범, 미니홈피까지! 추억을 기록해요" },
    { targetId: "community", title: "커뮤니티", description: "자유, 추모, 입양, 지역, 분실 등 5개 게시판에서 소통해요" },
    { targetId: "ai-chat", title: "AI 펫톡", description: "우리 아이와 대화하고, 건강 일정도 관리할 수 있어요" },
    { targetId: "magazine", title: "펫 매거진", description: "수의사 칼럼, 돌봄 팁 등 유용한 정보를 확인해요" },
];

// ═══════════════════════════════════════════════════════════════
// localStorage / DB 관련
// ═══════════════════════════════════════════════════════════════

const TUTORIAL_STORAGE_KEY = "memento-ani-tutorial-complete";

export function hasCompletedTutorial(): boolean {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(TUTORIAL_STORAGE_KEY) === "true";
}

export async function checkTutorialFromDB(userId: string): Promise<boolean> {
    try {
        const { data } = await supabase
            .from("profiles")
            .select("tutorial_completed_at")
            .eq("id", userId)
            .single();
        if (data?.tutorial_completed_at) {
            localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

export function markTutorialComplete(): void {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
}

export async function saveTutorialCompleteToDb(userId: string): Promise<void> {
    try {
        await supabase
            .from("profiles")
            .update({ tutorial_completed_at: new Date().toISOString() })
            .eq("id", userId);
    } catch {
        // 실패해도 localStorage에는 저장됨
    }
}

// ═══════════════════════════════════════════════════════════════
// 타겟 요소 찾기
// ═══════════════════════════════════════════════════════════════

function findTarget(targetId: string): Element | null {
    const all = document.querySelectorAll(`[data-tutorial-id="${targetId}"]`);
    if (all.length === 0) return null;

    const visible: Element[] = [];
    all.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) visible.push(el);
    });

    if (visible.length === 0) return null;
    return visible[0];
}

// ═══════════════════════════════════════════════════════════════
// 메인 컴포넌트
// ═══════════════════════════════════════════════════════════════

export default function TutorialTour({
    isOpen,
    onClose,
    onNavigate,
    userId,
}: TutorialTourProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [mounted, setMounted] = useState(false);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const onNavigateRef = useRef(onNavigate);
    const onCloseRef = useRef(onClose);
    const userIdRef = useRef(userId);
    const pollRef = useRef<ReturnType<typeof setInterval>>();
    const isOpenRef = useRef(isOpen);
    const stepRef = useRef(0);

    // refs 동기화
    useEffect(() => { onNavigateRef.current = onNavigate; }, [onNavigate]);
    useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
    useEffect(() => { userIdRef.current = userId; }, [userId]);
    useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);

    const isMobile = typeof window !== "undefined" ? window.innerWidth < 1280 : false;
    const isDark = typeof window !== "undefined" ? document.documentElement.classList.contains("dark") : false;
    const steps = isMobile ? MOBILE_STEPS : DESKTOP_STEPS;

    // 다크모드 대응 색상
    const bubbleBg = isDark ? "#1f2937" : "white"; // gray-800
    const titleColor = isDark ? "#f3f4f6" : "#374151"; // gray-100 / gray-700
    const descColor = isDark ? "#9ca3af" : "#6b7280"; // gray-400 / gray-500
    const hintColor = isDark ? "rgba(56,189,248,0.8)" : "rgba(5,178,220,0.8)";
    const arrowBorderColor = isDark ? "#1f2937" : "white";

    // ─────────────────────────────────────────────────────────
    // 타겟 측정 (폴링 방식 - 단순하고 StrictMode 안전)
    // ─────────────────────────────────────────────────────────
    const measureStep = (stepIndex: number) => {
        // 기존 폴링 중단
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = undefined;
        }

        const mobile = typeof window !== "undefined" ? window.innerWidth < 1280 : false;
        const list = mobile ? MOBILE_STEPS : DESKTOP_STEPS;
        const step = list[stepIndex];
        if (!step) {
            setTargetRect(null);
            return;
        }

        // 즉시 한 번 시도
        const el = findTarget(step.targetId);
        if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.top < 0 || rect.bottom > window.innerHeight) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
                setTimeout(() => {
                    if (!isOpenRef.current) return;
                    setTargetRect(el.getBoundingClientRect());
                }, 400);
            } else {
                setTargetRect(rect);
            }
            return;
        }

        // 못 찾으면 300ms 간격으로 최대 3초(10회) 폴링
        let attempts = 0;
        pollRef.current = setInterval(() => {
            attempts++;
            const found = findTarget(step.targetId);
            if (!isOpenRef.current || attempts > 10) {
                if (pollRef.current) clearInterval(pollRef.current);
                pollRef.current = undefined;
                setTargetRect(null); // 못 찾아도 말풍선은 중앙에 표시됨
                return;
            }

            if (found) {
                if (pollRef.current) clearInterval(pollRef.current);
                pollRef.current = undefined;
                const rect = found.getBoundingClientRect();
                if (rect.top < 0 || rect.bottom > window.innerHeight) {
                    found.scrollIntoView({ behavior: "smooth", block: "center" });
                    setTimeout(() => {
                        if (!isOpenRef.current) return;
                        setTargetRect(found.getBoundingClientRect());
                    }, 400);
                } else {
                    setTargetRect(rect);
                }
            }
        }, 300);
    };

    // ─────────────────────────────────────────────────────────
    // 마운트
    // ─────────────────────────────────────────────────────────
    useEffect(() => {
        setMounted(true);
    }, []);

    // ─────────────────────────────────────────────────────────
    // isOpen 변경 시 초기화
    // ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) {
            // 닫힐 때 정리
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = undefined;
            }
            return;
        }

        // 열릴 때 초기화
        setCurrentStep(0);
        stepRef.current = 0;
        setTargetRect(null);
        // 사이드바가 열려 있으면 강제 닫기 (튜토리얼 오버레이를 가리는 문제 방지)
        window.dispatchEvent(new Event("closeSidebar"));
        onNavigateRef.current("home");
        // DOM 준비 대기 후 첫 측정 (500ms)
        const timer = setTimeout(() => {
            if (!isOpenRef.current) return;
            measureStep(0);
        }, 500);

        return () => {
            clearTimeout(timer);
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = undefined;
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // ─────────────────────────────────────────────────────────
    // 리사이즈 시 재측정
    // ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;

        const handleResize = () => {
            measureStep(stepRef.current);
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // ─────────────────────────────────────────────────────────
    // 정리
    // ─────────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, []);

    // ─────────────────────────────────────────────────────────
    // 렌더링 조건
    // ─────────────────────────────────────────────────────────
    if (!isOpen || !mounted) return null;

    const step = steps[currentStep];
    if (!step) return null;

    // ─────────────────────────────────────────────────────────
    // 핸들러
    // ─────────────────────────────────────────────────────────
    const handleComplete = () => {
        markTutorialComplete();
        if (userIdRef.current) saveTutorialCompleteToDb(userIdRef.current);
        onCloseRef.current();
    };

    const handleSkip = () => {
        markTutorialComplete();
        if (userIdRef.current) saveTutorialCompleteToDb(userIdRef.current);
        onNavigateRef.current("home");
        onCloseRef.current();
    };

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            const nextStep = currentStep + 1;
            setCurrentStep(nextStep);
            stepRef.current = nextStep;
            setTargetRect(null);
            // 다음 스텝 즉시 측정
            requestAnimationFrame(() => {
                measureStep(nextStep);
            });
        } else {
            // 마지막 스텝: 바로 완료
            handleComplete();
        }
    };

    // ─────────────────────────────────────────────────────────
    // 스포트라이트 좌표 (padding 8px)
    // ─────────────────────────────────────────────────────────
    const pad = 8;
    const spot = targetRect
        ? {
              x: targetRect.left - pad,
              y: targetRect.top - pad,
              w: targetRect.width + pad * 2,
              h: targetRect.height + pad * 2,
          }
        : null;

    // ─────────────────────────────────────────────────────────
    // 말풍선 위치 계산
    // ─────────────────────────────────────────────────────────
    const bubbleW = 260;
    const bubbleH = 200;

    let bubbleLeft: number;
    let bubbleTop: number;
    let arrowDir: "up" | "down" | "none" = "none";
    let arrowLeftPx = 0;

    if (!spot) {
        // 타겟 아직 측정 안 됨 → 말풍선 숨김 (딤 + 건너뛰기만 표시)
        bubbleLeft = -9999;
        bubbleTop = -9999;
    } else {
        const targetCX = spot.x + spot.w / 2;

        // 좌우 위치
        bubbleLeft = Math.round(targetCX - bubbleW / 2);
        if (bubbleLeft < 12) bubbleLeft = 12;
        if (bubbleLeft + bubbleW > window.innerWidth - 12) {
            bubbleLeft = window.innerWidth - bubbleW - 12;
        }

        // 상하: 타겟 아래에 배치 시도, 안 되면 위에
        const gap = 16;
        if (spot.y + spot.h + gap + bubbleH < window.innerHeight - 12) {
            bubbleTop = Math.round(spot.y + spot.h + gap);
            arrowDir = "up";
        } else {
            bubbleTop = Math.round(spot.y - bubbleH - gap);
            arrowDir = "down";
            if (bubbleTop < 12) {
                bubbleTop = Math.round(window.innerHeight / 2 - bubbleH / 2);
                arrowDir = "none";
            }
        }

        arrowLeftPx = Math.round(
            Math.max(24, Math.min(targetCX - bubbleLeft, bubbleW - 24)),
        );
    }

    // ─────────────────────────────────────────────────────────
    // 렌더
    // ─────────────────────────────────────────────────────────
    return createPortal(
        <>
            {/* 1) 배경 딤 — 스포트라이트가 없을 때도 어둡게 */}
            {!spot && (
                <div
                    onClick={handleNext}
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 9998,
                        background: "rgba(0,0,0,0.7)",
                        cursor: "pointer",
                    }}
                />
            )}

            {/* 2) 스포트라이트 구멍 — box-shadow로 주변을 어둡게 */}
            {spot && (
                <div
                    onClick={handleNext}
                    style={{
                        position: "fixed",
                        left: spot.x,
                        top: spot.y,
                        width: spot.w,
                        height: spot.h,
                        zIndex: 9999,
                        borderRadius: 16,
                        boxShadow: "0 0 0 9999px rgba(0,0,0,0.7)",
                        cursor: "pointer",
                        pointerEvents: "auto",
                    }}
                />
            )}

            {/* 3) 스포트라이트 빛 테두리 */}
            {spot && (
                <div
                    style={{
                        position: "fixed",
                        left: spot.x - 4,
                        top: spot.y - 4,
                        width: spot.w + 8,
                        height: spot.h + 8,
                        zIndex: 10000,
                        borderRadius: 20,
                        boxShadow: `
                            0 0 0 3px rgba(56,189,248,0.6),
                            0 0 20px 4px rgba(56,189,248,0.4),
                            0 0 40px 8px rgba(5,178,220,0.2)
                        `, /* memento-400, memento-500 */
                        pointerEvents: "none",
                    }}
                />
            )}

            {/* 스포트라이트가 있을 때 나머지 영역도 클릭 가능하게 (다음 스텝으로) */}
            {spot && (
                <div
                    onClick={handleNext}
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 9997,
                        cursor: "pointer",
                    }}
                />
            )}

            {/* 4) 구름 말풍선 */}
            <div
                style={{
                    position: "fixed",
                    left: bubbleLeft,
                    top: bubbleTop,
                    zIndex: 10001,
                    width: bubbleW,
                    pointerEvents: "none",
                    animation: "tutorialFadeInScale 0.3s ease-out",
                }}
            >
                {/* 위 화살표 */}
                {arrowDir === "up" && (
                    <div
                        style={{
                            position: "absolute",
                            top: -12,
                            left: arrowLeftPx - 12,
                            width: 0,
                            height: 0,
                            borderLeft: "12px solid transparent",
                            borderRight: "12px solid transparent",
                            borderBottom: `14px solid ${arrowBorderColor}`,
                            filter: "drop-shadow(0 -2px 2px rgba(0,0,0,0.1))",
                        }}
                    />
                )}

                <div style={{ position: "relative" }}>
                    {/* SVG 구름 배경 */}
                    <svg
                        viewBox="0 0 280 210"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{
                            position: "absolute",
                            top: -18,
                            left: -10,
                            width: 280,
                            height: 210,
                            pointerEvents: "none",
                            filter: isDark
                                ? "drop-shadow(0 12px 40px rgba(0,0,0,0.5))"
                                : "drop-shadow(0 12px 40px rgba(0,0,0,0.12))",
                        }}
                    >
                        <path
                            d="M50 170 C20 170, 0 150, 8 130 C-2 115, 5 95, 25 88 C15 70, 30 48, 55 48 C60 30, 80 15, 105 18 C120 5, 150 0, 172 12 C190 2, 215 8, 228 25 C250 18, 272 30, 270 52 C285 62, 285 85, 272 98 C282 115, 275 140, 255 150 C262 168, 250 180, 230 178 C220 192, 195 198, 175 190 C160 200, 135 202, 118 192 C100 202, 75 198, 60 185 C55 182, 52 176, 50 170 Z"
                            fill={bubbleBg}
                        />
                    </svg>

                    {/* 본체 (구름 위에 텍스트) */}
                    <div
                        style={{
                            position: "relative",
                            padding: "20px 20px 16px",
                            textAlign: "center",
                        }}
                    >
                        {/* 아이콘 + 제목 */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                                marginBottom: 8,
                            }}
                        >
                            <div
                                style={{
                                    padding: 6,
                                    background:
                                        "linear-gradient(135deg, #e0f2fe, #ede9fe)",
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <Sparkles
                                    style={{
                                        width: 16,
                                        height: 16,
                                        color: MEMENTO_COLORS[500],
                                    }}
                                />
                            </div>
                            <span
                                style={{
                                    fontWeight: 700,
                                    color: titleColor,
                                    fontSize: 16,
                                }}
                            >
                                {step.title}
                            </span>
                        </div>

                        {/* 설명 */}
                        <p
                            style={{
                                fontSize: 14,
                                color: descColor,
                                lineHeight: 1.6,
                                marginBottom: 12,
                            }}
                        >
                            {step.description}
                        </p>

                        {/* 진행 표시 */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 4,
                                marginBottom: 8,
                            }}
                        >
                            {steps.map((_, i) => (
                                <div
                                    key={i}
                                    style={{
                                        width:
                                            i === currentStep ? 12 : 6,
                                        height:
                                            i === currentStep ? 12 : 6,
                                        borderRadius: "50%",
                                        background:
                                            i === currentStep
                                                ? `linear-gradient(135deg, ${MEMENTO_COLORS[500]}, ${MEMENTO_COLORS[400]})`
                                                : i < currentStep
                                                  ? "rgba(5,178,220,0.4)"
                                                  : isDark ? "#4b5563" : "#e5e7eb",
                                        transition: "all 0.3s",
                                    }}
                                />
                            ))}
                        </div>

                        {/* 안내 텍스트 */}
                        <p
                            style={{
                                fontSize: 12,
                                color: hintColor,
                                fontWeight: 500,
                            }}
                        >
                            {currentStep < steps.length - 1
                                ? "탭하여 다음으로"
                                : "탭하여 시작하기"}
                        </p>
                    </div>

                    {/* 반짝이 장식 */}
                    <div
                        style={{
                            position: "absolute",
                            top: -8,
                            right: -4,
                            width: 12,
                            height: 12,
                            background: "#fde68a",
                            borderRadius: "50%",
                            animation: "tutorialPulse 2s infinite",
                        }}
                    />
                    <div
                        style={{
                            position: "absolute",
                            top: 12,
                            left: -8,
                            width: 8,
                            height: 8,
                            background: "#bae6fd",
                            borderRadius: "50%",
                            animation: "tutorialPulse 2s infinite 0.5s",
                        }}
                    />
                    <div
                        style={{
                            position: "absolute",
                            bottom: -4,
                            right: 16,
                            width: 8,
                            height: 8,
                            background: "#ddd6fe",
                            borderRadius: "50%",
                            animation: "tutorialPulse 2s infinite 0.3s",
                        }}
                    />
                </div>

                {/* 아래 화살표 */}
                {arrowDir === "down" && (
                    <div
                        style={{
                            position: "absolute",
                            bottom: -12,
                            left: arrowLeftPx - 12,
                            width: 0,
                            height: 0,
                            borderLeft: "12px solid transparent",
                            borderRight: "12px solid transparent",
                            borderTop: `14px solid ${arrowBorderColor}`,
                            filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.1))",
                        }}
                    />
                )}
            </div>

            {/* 5) 건너뛰기 버튼 */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    handleSkip();
                }}
                style={{
                    position: "fixed",
                    top: 16,
                    right: 16,
                    zIndex: 10002,
                    padding: "8px 16px",
                    background: "rgba(255,255,255,0.15)",
                    backdropFilter: "blur(8px)",
                    color: "white",
                    fontSize: 14,
                    borderRadius: 999,
                    border: "none",
                    cursor: "pointer",
                    transition: "background 0.2s",
                }}
                onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.background =
                        "rgba(255,255,255,0.3)";
                }}
                onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.background =
                        "rgba(255,255,255,0.15)";
                }}
            >
                건너뛰기
            </button>

            {/* 6) CSS 애니메이션 */}
            <style>{`
                @keyframes tutorialFadeInScale {
                    from {
                        opacity: 0;
                        transform: scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                @keyframes tutorialPulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </>,
        document.body,
    );
}
