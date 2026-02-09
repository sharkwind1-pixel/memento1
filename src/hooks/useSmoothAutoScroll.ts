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

        // 이벤트 핸들러들
        const handleMouseEnter = (index: number) => () => {
            pausedRef.current[index] = true;
        };

        const handleMouseLeave = (index: number) => () => {
            if (!isDragging[index]) {
                pausedRef.current[index] = false;
                // 현재 스크롤 위치 동기화
                const container = refs[index].current;
                if (container) {
                    scrollPosRef.current[index] = container.scrollLeft;
                }
            }
        };

        const handleMouseDown = (index: number) => (e: MouseEvent) => {
            const container = refs[index].current;
            if (!container) return;

            isDragging[index] = true;
            startX[index] = e.pageX - container.offsetLeft;
            scrollStart[index] = container.scrollLeft;
            container.style.cursor = "grabbing";
            container.style.userSelect = "none";
        };

        const handleMouseMove = (index: number) => (e: MouseEvent) => {
            if (!isDragging[index]) return;
            const container = refs[index].current;
            if (!container) return;

            e.preventDefault();
            const x = e.pageX - container.offsetLeft;
            const walk = (x - startX[index]) * 1.5; // 드래그 감도
            container.scrollLeft = scrollStart[index] - walk;
            scrollPosRef.current[index] = container.scrollLeft;
        };

        const handleMouseUp = (index: number) => () => {
            const container = refs[index].current;
            if (!container) return;

            isDragging[index] = false;
            container.style.cursor = "grab";
            container.style.userSelect = "";
        };

        // 터치 이벤트 (모바일)
        const handleTouchStart = (index: number) => () => {
            pausedRef.current[index] = true;
        };

        const handleTouchEnd = (index: number) => () => {
            pausedRef.current[index] = false;
            const container = refs[index].current;
            if (container) {
                scrollPosRef.current[index] = container.scrollLeft;
            }
        };

        // DOM 렌더링 대기 후 시작
        const startTimer = setTimeout(() => {
            refs.forEach((ref, index) => {
                const container = ref.current;
                if (!container) return;

                // 기본 커서 스타일
                container.style.cursor = "grab";

                // 이벤트 리스너 등록
                container.addEventListener("mouseenter", handleMouseEnter(index));
                container.addEventListener("mouseleave", handleMouseLeave(index));
                container.addEventListener("mousedown", handleMouseDown(index));
                container.addEventListener("mousemove", handleMouseMove(index));
                container.addEventListener("mouseup", handleMouseUp(index));
                container.addEventListener("touchstart", handleTouchStart(index));
                container.addEventListener("touchend", handleTouchEnd(index));

                // 애니메이션 루프
                let lastTime = 0;
                scrollPosRef.current[index] = 0;

                const animate = (currentTime: number) => {
                    const cont = ref.current;
                    if (!cont) {
                        animationIdsRef.current[index] = requestAnimationFrame(animate);
                        return;
                    }

                    const deltaTime = lastTime ? currentTime - lastTime : 16.67;
                    lastTime = currentTime;

                    const maxScroll = cont.scrollWidth - cont.clientWidth;

                    // 일시정지 상태가 아닐 때만 자동 스크롤
                    if (maxScroll > 0 && !pausedRef.current[index]) {
                        scrollPosRef.current[index] += SPEED * (deltaTime / 16.67);
                        cont.scrollLeft = Math.round(scrollPosRef.current[index]);

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

            // 이벤트 리스너 정리
            refs.forEach((ref, index) => {
                const container = ref.current;
                if (!container) return;

                container.removeEventListener("mouseenter", handleMouseEnter(index));
                container.removeEventListener("mouseleave", handleMouseLeave(index));
                container.removeEventListener("mousedown", handleMouseDown(index));
                container.removeEventListener("mousemove", handleMouseMove(index));
                container.removeEventListener("mouseup", handleMouseUp(index));
                container.removeEventListener("touchstart", handleTouchStart(index));
                container.removeEventListener("touchend", handleTouchEnd(index));
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
