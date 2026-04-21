/**
 * MagazineReader - 인스타그램 카드뉴스 스타일 매거진 리더
 * 좌우 스와이프로 카드를 넘기며 읽는 풀스크린 리더
 *
 * 카드 구성:
 * 1. 커버 (히어로 이미지 + 제목 + 배지)
 * 2. 요약 (메타정보 + 요약 박스)
 * 3~N. 본문 카드 (텍스트 / 이미지 / 인용문)
 * N+1. 엔딩 (태그 + 목록 복귀)
 *
 * 기능:
 * - 좋아요 토글 (localStorage 기반 중복 방지)
 * - 조회수 증가 (sessionStorage 기반 중복 방지)
 * - 상단 프로그레스 바
 * - 짝수/홀수 카드 배경색 교차
 * - 세로 스크롤 충돌 해결 (긴 카드: "다음" 버튼)
 * - strong 태그 형광펜 효과
 * - 다음 카드 살짝 보이기 힌트
 */
"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
    ArrowLeft,
    Heart,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import type { MagazineArticle } from "@/data/magazineArticles";
import { API } from "@/config/apiEndpoints";
import { authFetch } from "@/lib/auth-fetch";
import { safeSessionGetItem, safeSessionSetItem } from "@/lib/safe-storage";
import { buildCards } from "./magazineCardUtils";
import { CardRenderer } from "./MagazineCardRenderer";
import { CardIndicator } from "./CardIndicator";

interface MagazineReaderProps {
    article: MagazineArticle;
    onBack: () => void;
    onLikeChange?: (articleId: string | number, liked: boolean, likes: number) => void;
}

// ──────────────────────────────────────────────
//  MagazineReader 메인 컴포넌트
// ──────────────────────────────────────────────

export default function MagazineReader({ article, onBack, onLikeChange }: MagazineReaderProps) {
    const [currentCard, setCurrentCard] = useState(0);
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const sliderRef = useRef<HTMLDivElement>(null);

    // 좋아요 상태 — 서버 liked 필드 기반 (localStorage 의존 제거)
    // article.liked는 GET 응답에서 현재 유저의 좋아요 여부를 서버가 알려줌
    const [isLiked, setIsLiked] = useState(!!(article as MagazineArticle & { liked?: boolean }).liked);
    const [displayLikes, setDisplayLikes] = useState(article.likes);
    const [likeAnimating, setLikeAnimating] = useState(false);
    const likingRef = useRef(false); // 이중 클릭 방지

    // 조회수 상태 (sessionStorage 기반 중복 방지)
    const [displayViews, setDisplayViews] = useState(article.views);

    // 조회수 증가 (마운트 시 1회)
    useEffect(() => {
        const viewKey = `magazine_viewed_${article.id}`;
        if (typeof window !== "undefined" && !safeSessionGetItem(viewKey)) {
            safeSessionSetItem(viewKey, "1");
            authFetch(API.MAGAZINE, {
                method: "PATCH",
                body: JSON.stringify({ articleId: article.id, action: "view" }),
            })
                .then((res) => res.json())
                .then((data) => {
                    if (data.views != null) {
                        setDisplayViews(data.views);
                    }
                })
                .catch(() => {
                    // 조회수 증가 실패 시 무시
                });
        }
    }, [article.id]);

    // 좋아요 토글 핸들러 — 서버 기반 + 낙관적 UI + 이중 클릭 방지
    const handleLike = useCallback(async () => {
        if (likingRef.current) return; // 이중 클릭 방지
        likingRef.current = true;

        const willLike = !isLiked;
        // 낙관적 UI 업데이트
        setIsLiked(willLike);
        setDisplayLikes((prev) => Math.max(0, prev + (willLike ? 1 : -1)));
        setLikeAnimating(true);
        setTimeout(() => setLikeAnimating(false), 300);

        try {
            const res = await authFetch(API.MAGAZINE, {
                method: "PATCH",
                body: JSON.stringify({
                    articleId: article.id,
                    action: willLike ? "like" : "unlike",
                }),
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                console.error("[Magazine Like] API error:", res.status, errData);
                // 401이면 로그인 모달
                if (res.status === 401) {
                    window.dispatchEvent(new CustomEvent("openAuthModal"));
                }
                throw new Error(errData.error || `HTTP ${res.status}`);
            }
            const data = await res.json();
            if (data.likes != null) {
                setDisplayLikes(data.likes);
            }
            if (typeof data.liked === "boolean") {
                setIsLiked(data.liked);
            }
            // 부모(목록)에도 즉시 반영 → 뒤로가기 시 업데이트된 수 표시
            onLikeChange?.(article.id, data.liked ?? willLike, data.likes ?? (willLike ? 1 : 0));
        } catch {
            // 실패 시 롤백
            setIsLiked(!willLike);
            setDisplayLikes((prev) => Math.max(0, prev + (willLike ? -1 : 1)));
        } finally {
            likingRef.current = false;
        }
    }, [isLiked, article.id]);

    const cards = useMemo(() => buildCards(article), [article]);
    const totalCards = cards.length;

    // 브라우저 뒤로가기 시 매거진 목록으로 돌아가기 (홈으로 안 가게)
    // 진입 시 history.pushState → popstate로 onBack 호출
    useEffect(() => {
        history.pushState({ magazineReader: true }, "");
        const handlePopState = (e: PopStateEvent) => {
            // 우리가 push한 state가 pop되면 = 뒤로가기 = 매거진 목록으로
            onBack();
        };
        window.addEventListener("popstate", handlePopState);
        return () => {
            window.removeEventListener("popstate", handlePopState);
        };
    }, [onBack]);

    // 터치 디바이스 감지 (모바일에서만 스와이프 활성화)
    useEffect(() => {
        const checkTouch = () => {
            setIsTouchDevice(
                "ontouchstart" in window || navigator.maxTouchPoints > 0
            );
        };
        checkTouch();
    }, []);

    // 카드 이동 (전환 시 스크롤 맨 위로 리셋)
    const goToCard = useCallback(
        (idx: number) => {
            const clamped = Math.max(0, Math.min(idx, totalCards - 1));
            setCurrentCard(clamped);
            requestAnimationFrame(() => {
                const container = containerRef.current;
                if (!container) return;
                container.querySelectorAll<HTMLElement>(".h-full.overflow-y-auto")
                    .forEach((el) => { el.scrollTop = 0; });
            });
        },
        [totalCards]
    );

    // 최초 마운트 시 페이지 스크롤 맨 위로
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const goNext = useCallback(
        () => goToCard(currentCard + 1),
        [currentCard, goToCard]
    );
    const goPrev = useCallback(
        () => goToCard(currentCard - 1),
        [currentCard, goToCard]
    );

    // 키보드 네비게이션 (스페이스/엔터로도 다음 카드)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
                e.preventDefault();
                goNext();
            } else if (e.key === "ArrowLeft") {
                goPrev();
            } else if (e.key === "Escape") {
                onBack();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [goNext, goPrev, onBack]);

    // 네이티브 터치 스와이프 (DOM 직접 조작 → 리렌더 없이 60fps)
    const touchRef = useRef<{
        startX: number;
        startY: number;
        startTime: number;
        lastX: number;
        direction: "none" | "horizontal" | "vertical";
    } | null>(null);
    const currentCardRef = useRef(currentCard);
    const totalCardsRef = useRef(totalCards);
    const goNextRef = useRef(goNext);
    const goPrevRef = useRef(goPrev);
    currentCardRef.current = currentCard;
    totalCardsRef.current = totalCards;
    goNextRef.current = goNext;
    goPrevRef.current = goPrev;

    /** slider DOM의 transform을 직접 업데이트 (React 리렌더 없음) */
    const applyOffset = useCallback((offset: number) => {
        const slider = sliderRef.current;
        if (!slider) return;
        const card = currentCardRef.current;
        const total = totalCardsRef.current;
        slider.style.transform = `translateX(calc(-${(card * 100) / total}% + ${offset}px))`;
    }, []);

    useEffect(() => {
        const el = containerRef.current;
        if (!el || !isTouchDevice) return;

        const onTouchStart = (e: TouchEvent) => {
            const touch = e.touches[0];
            touchRef.current = {
                startX: touch.clientX,
                startY: touch.clientY,
                startTime: Date.now(),
                lastX: touch.clientX,
                direction: "none",
            };
            // transition 즉시 비활성화 (DOM 직접 조작)
            sliderRef.current?.classList.add("dragging");
        };

        const onTouchMove = (e: TouchEvent) => {
            if (!touchRef.current) return;
            const touch = e.touches[0];
            const dx = touch.clientX - touchRef.current.startX;
            const dy = touch.clientY - touchRef.current.startY;

            // 첫 움직임에서 수평/수직 방향 결정
            if (touchRef.current.direction === "none") {
                if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                    touchRef.current.direction = Math.abs(dx) >= Math.abs(dy) ? "horizontal" : "vertical";
                }
                if (touchRef.current.direction !== "horizontal") return;
            }

            if (touchRef.current.direction === "vertical") return;

            e.preventDefault();
            touchRef.current.lastX = touch.clientX;

            const card = currentCardRef.current;
            const total = totalCardsRef.current;
            const atStart = card === 0 && dx > 0;
            const atEnd = card === total - 1 && dx < 0;
            const offset = atStart || atEnd ? dx * 0.3 : dx;

            // DOM 직접 조작 (React 리렌더 없음 → 60fps)
            applyOffset(offset);
        };

        const onTouchEnd = () => {
            const slider = sliderRef.current;

            if (!touchRef.current || touchRef.current.direction !== "horizontal") {
                touchRef.current = null;
                slider?.classList.remove("dragging");
                applyOffset(0);
                return;
            }

            const dx = touchRef.current.lastX - touchRef.current.startX;
            const elapsed = Date.now() - touchRef.current.startTime;
            const velocity = Math.abs(dx) / Math.max(elapsed, 1);

            const THRESHOLD = 30;
            const VELOCITY_THRESHOLD = 0.2;

            // transition 다시 활성화 (카드 전환 애니메이션)
            slider?.classList.remove("dragging");

            if (dx < -THRESHOLD || (velocity > VELOCITY_THRESHOLD && dx < 0)) {
                goNextRef.current();
            } else if (dx > THRESHOLD || (velocity > VELOCITY_THRESHOLD && dx > 0)) {
                goPrevRef.current();
            } else {
                // 스냅백
                applyOffset(0);
            }

            touchRef.current = null;
        };

        el.addEventListener("touchstart", onTouchStart, { passive: true });
        el.addEventListener("touchmove", onTouchMove, { passive: false });
        el.addEventListener("touchend", onTouchEnd, { passive: true });

        return () => {
            el.removeEventListener("touchstart", onTouchStart);
            el.removeEventListener("touchmove", onTouchMove);
            el.removeEventListener("touchend", onTouchEnd);
        };
    }, [isTouchDevice, applyOffset]);

    // 가상화: 현재 +/- 2 카드만 렌더 (다음 카드 힌트를 위해 +2)
    const visibleRange = useMemo(() => ({
        start: Math.max(0, currentCard - 1),
        end: Math.min(totalCards - 1, currentCard + 2),
    }), [currentCard, totalCards]);

    // 프로그레스 바 비율
    const progressPercent = totalCards > 1 ? ((currentCard) / (totalCards - 1)) * 100 : 0;

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 z-50 bg-white dark:bg-gray-900 overflow-hidden"
        >
            {/* [A] 상단 프로그레스 바 - sticky, 카드 번호 표시 */}
            <div className="fixed top-0 left-0 right-0 z-[70]">
                <div className="h-1 bg-gray-200 dark:bg-gray-700">
                    <div
                        className="h-full bg-memento-400 transition-all duration-300 ease-out"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
                <div className="flex justify-center">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm px-2 py-0.5 rounded-b-md">
                        {currentCard + 1} / {totalCards}
                    </span>
                </div>
            </div>

            {/* 뒤로가기 */}
            <button
                onClick={onBack}
                className="fixed top-4 left-4 z-[60] bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-white dark:hover:bg-gray-700 transition-colors"
                aria-label="목록으로"
            >
                <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-200" />
            </button>

            {/* 좋아요 버튼 (우측 상단 고정) */}
            <button
                onClick={handleLike}
                className="fixed top-4 right-4 z-[60] bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-white dark:hover:bg-gray-700 transition-colors flex items-center gap-1.5"
                aria-label="좋아요"
            >
                <Heart
                    className={`w-5 h-5 transition-all duration-200 ${
                        isLiked
                            ? "text-red-500 fill-red-500"
                            : "text-gray-500 dark:text-gray-400"
                    } ${likeAnimating ? "scale-125" : "scale-100"}`}
                />
                <span className={`text-sm font-medium ${isLiked ? "text-red-500" : "text-gray-500 dark:text-gray-400"}`}>
                    {displayLikes}
                </span>
            </button>

            {/* 카드 컨테이너 - [E] 카드 너비 97%로 다음 카드 힌트 */}
            <div
                ref={sliderRef}
                className="flex h-full magazine-page-container"
                style={{
                    width: `${totalCards * 100}%`,
                    transform: `translateX(-${(currentCard * 100) / totalCards}%)`,
                }}
            >
                {cards.map((card, index) => {
                    const isVisible = index >= visibleRange.start && index <= visibleRange.end;
                    const isLastCard = index === totalCards - 1;
                    return (
                        <div
                            key={index}
                            className="h-full overflow-y-auto"
                            style={{ width: `${100 / totalCards}%` }}
                        >
                            {isVisible && (
                                <div className="h-full flex items-center justify-center">
                                    {/* [E] 다음 카드 힌트: 카드 너비 97%, 마지막 카드는 100% */}
                                    <div
                                        className="mx-auto h-full"
                                        style={{ width: isLastCard ? "100%" : "97%", maxWidth: "42rem" }}
                                    >
                                        <CardRenderer
                                            card={card}
                                            article={article}
                                            cardIndex={index}
                                            totalCards={totalCards}
                                            onBack={onBack}
                                            isLiked={isLiked}
                                            displayLikes={displayLikes}
                                            displayViews={displayViews}
                                            onLike={handleLike}
                                            likeAnimating={likeAnimating}
                                            goNext={goNext}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* 데스크톱 좌우 화살표 (모바일에서는 숨김) */}
            {currentCard > 0 && (
                <button
                    onClick={goPrev}
                    className="fixed left-3 top-1/2 -translate-y-1/2 z-[60] bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full p-3 shadow-lg hover:bg-white dark:hover:bg-gray-700 hover:scale-110 transition-all hidden sm:flex items-center justify-center"
                    aria-label="이전 카드"
                >
                    <ChevronLeft className="w-6 h-6 text-gray-700 dark:text-gray-200" />
                </button>
            )}
            {currentCard < totalCards - 1 && (
                <button
                    onClick={goNext}
                    className="fixed right-3 top-1/2 -translate-y-1/2 z-[60] bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full p-3 shadow-lg hover:bg-white dark:hover:bg-gray-700 hover:scale-110 transition-all hidden sm:flex items-center justify-center"
                    aria-label="다음 카드"
                >
                    <ChevronRight className="w-6 h-6 text-gray-700 dark:text-gray-200" />
                </button>
            )}

            {/* 카드 인디케이터 */}
            <CardIndicator
                current={currentCard}
                total={totalCards}
                onCardClick={goToCard}
            />
        </div>
    );
}
