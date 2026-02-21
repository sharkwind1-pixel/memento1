/**
 * 부드러운 자동 스크롤 훅 (requestAnimationFrame 버전)
 * - 60fps 동기화로 끊김 없는 매끄러운 애니메이션
 * - 마우스 호버 시 멈춤
 * - 마우스 드래그로 수동 스크롤 가능
 */

"use client";

import { useRef, useEffect, useCallback } from "react";

export function useSmoothAutoScroll() {
    const communityScrollRef = useRef<HTMLDivElement>(null);
    const adoptionScrollRef = useRef<HTMLDivElement>(null);
    const petcareScrollRef = useRef<HTMLDivElement>(null);
    const memorialScrollRef = useRef<HTMLDivElement>(null);
    const animationIdsRef = useRef<number[]>([]);
    const pausedRef = useRef<boolean[]>([false, false, false, false]);
    const scrollPosRef = useRef<number[]>([0, 0, 0, 0]);

    useEffect(() => {
        const SPEED = 0.5;
        const refs = [communityScrollRef, adoptionScrollRef, petcareScrollRef, memorialScrollRef];

        // 드래그 상태
        const isDragging = [false, false, false, false];
        const startX = [0, 0, 0, 0];
        const scrollStart = [0, 0, 0, 0];

        // 터치 이벤트 상태
        const touchStartX = [0, 0, 0, 0];
        const touchScrollStart = [0, 0, 0, 0];
        const lastTouchX = [0, 0, 0, 0];
        const lastTouchTime = [0, 0, 0, 0];
        const velocity = [0, 0, 0, 0];

        // 바인딩된 핸들러 참조 저장 (removeEventListener에서 동일 참조 사용)
        const boundHandlers: Array<{
            mouseenter: () => void;
            mouseleave: () => void;
            mousedown: (e: MouseEvent) => void;
            mousemove: (e: MouseEvent) => void;
            mouseup: () => void;
            touchstart: (e: TouchEvent) => void;
            touchmove: (e: TouchEvent) => void;
            touchend: () => void;
        }> = refs.map((_, index) => ({
            mouseenter: () => {
                pausedRef.current[index] = true;
            },
            mouseleave: () => {
                if (!isDragging[index]) {
                    pausedRef.current[index] = false;
                    const container = refs[index].current;
                    if (container) {
                        scrollPosRef.current[index] = container.scrollLeft;
                    }
                }
            },
            mousedown: (e: MouseEvent) => {
                const container = refs[index].current;
                if (!container) return;
                isDragging[index] = true;
                startX[index] = e.pageX - container.offsetLeft;
                scrollStart[index] = container.scrollLeft;
                container.style.cursor = "grabbing";
                container.style.userSelect = "none";
            },
            mousemove: (e: MouseEvent) => {
                if (!isDragging[index]) return;
                const container = refs[index].current;
                if (!container) return;
                e.preventDefault();
                const x = e.pageX - container.offsetLeft;
                const walk = (x - startX[index]) * 1.5;
                container.scrollLeft = scrollStart[index] - walk;
                scrollPosRef.current[index] = container.scrollLeft;
            },
            mouseup: () => {
                const container = refs[index].current;
                if (!container) return;
                isDragging[index] = false;
                container.style.cursor = "grab";
                container.style.userSelect = "";
            },
            touchstart: (e: TouchEvent) => {
                pausedRef.current[index] = true;
                const container = refs[index].current;
                if (!container) return;
                const touch = e.touches[0];
                touchStartX[index] = touch.pageX;
                touchScrollStart[index] = container.scrollLeft;
                lastTouchX[index] = touch.pageX;
                lastTouchTime[index] = Date.now();
                velocity[index] = 0;
            },
            touchmove: (e: TouchEvent) => {
                const container = refs[index].current;
                if (!container) return;
                const touch = e.touches[0];
                const currentX = touch.pageX;
                const currentTime = Date.now();
                const dt = currentTime - lastTouchTime[index];
                if (dt > 0) {
                    velocity[index] = (lastTouchX[index] - currentX) / dt;
                }
                lastTouchX[index] = currentX;
                lastTouchTime[index] = currentTime;
                const walk = (touchStartX[index] - currentX) * 1.2;
                container.scrollLeft = touchScrollStart[index] + walk;
                scrollPosRef.current[index] = container.scrollLeft;
            },
            touchend: () => {
                const container = refs[index].current;
                if (!container) return;
                const v = velocity[index];
                if (Math.abs(v) > 0.3) {
                    const momentum = v * 150;
                    const targetScroll = container.scrollLeft + momentum;
                    container.scrollTo({ left: targetScroll, behavior: "smooth" });
                    setTimeout(() => {
                        scrollPosRef.current[index] = container.scrollLeft;
                        pausedRef.current[index] = false;
                    }, 300);
                } else {
                    scrollPosRef.current[index] = container.scrollLeft;
                    pausedRef.current[index] = false;
                }
            },
        }));

        // DOM 렌더링 대기 후 시작
        const startTimer = setTimeout(() => {
            refs.forEach((ref, index) => {
                const container = ref.current;
                if (!container) return;

                // 기본 커서 스타일
                container.style.cursor = "grab";

                // 저장된 핸들러 참조로 이벤트 리스너 등록
                const h = boundHandlers[index];
                container.addEventListener("mouseenter", h.mouseenter);
                container.addEventListener("mouseleave", h.mouseleave);
                container.addEventListener("mousedown", h.mousedown);
                container.addEventListener("mousemove", h.mousemove);
                container.addEventListener("mouseup", h.mouseup);
                container.addEventListener("touchstart", h.touchstart, { passive: true });
                container.addEventListener("touchmove", h.touchmove, { passive: true });
                container.addEventListener("touchend", h.touchend, { passive: true });

                // 애니메이션 루프
                let lastTime = 0;
                scrollPosRef.current[index] = 0;

                const animate = (currentTime: number) => {
                    const cont = ref.current;
                    if (!cont) {
                        animationIdsRef.current[index] = requestAnimationFrame(animate);
                        return;
                    }

                    const rawDelta = lastTime ? currentTime - lastTime : 16.67;
                    lastTime = currentTime;
                    const deltaTime = Math.min(rawDelta, 33.34); // cap at 2 frames to prevent jumps

                    const maxScroll = cont.scrollWidth - cont.clientWidth;

                    // 일시정지 상태가 아닐 때만 자동 스크롤
                    if (maxScroll > 0 && !pausedRef.current[index]) {
                        scrollPosRef.current[index] += SPEED * (deltaTime / 16.67);
                        cont.scrollLeft = scrollPosRef.current[index];

                        // 끝에 도달하면 처음으로
                        if (scrollPosRef.current[index] >= maxScroll) {
                            scrollPosRef.current[index] = 0;
                        }
                    }

                    animationIdsRef.current[index] = requestAnimationFrame(animate);
                };

                animationIdsRef.current[index] = requestAnimationFrame(animate);
            });
        }, 500);

        return () => {
            clearTimeout(startTimer);

            // 애니메이션 정리
            animationIdsRef.current.forEach((id) => {
                if (id) cancelAnimationFrame(id);
            });
            animationIdsRef.current = [];

            // 동일한 핸들러 참조로 이벤트 리스너 정리 (누수 방지)
            refs.forEach((ref, index) => {
                const container = ref.current;
                if (!container) return;

                const h = boundHandlers[index];
                container.removeEventListener("mouseenter", h.mouseenter);
                container.removeEventListener("mouseleave", h.mouseleave);
                container.removeEventListener("mousedown", h.mousedown);
                container.removeEventListener("mousemove", h.mousemove);
                container.removeEventListener("mouseup", h.mouseup);
                container.removeEventListener("touchstart", h.touchstart);
                container.removeEventListener("touchmove", h.touchmove);
                container.removeEventListener("touchend", h.touchend);
            });
        };
    }, []);

    const startAutoScroll = useCallback(() => {
        return () => {};
    }, []);

    return {
        communityScrollRef,
        adoptionScrollRef,
        petcareScrollRef,
        memorialScrollRef,
        startSmoothAutoScroll: startAutoScroll,
        startAutoScroll,
    };
}

export { useSmoothAutoScroll as useAutoScroll };
