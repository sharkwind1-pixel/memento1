/**
 * 부드러운 자동 스크롤 훅 (requestAnimationFrame 버전)
 * 60fps 동기화로 끊김 없는 매끄러운 애니메이션
 */

"use client";

import { useRef, useEffect, useCallback } from "react";

export function useSmoothAutoScroll() {
    const communityScrollRef = useRef<HTMLDivElement>(null);
    const adoptionScrollRef = useRef<HTMLDivElement>(null);
    const petcareScrollRef = useRef<HTMLDivElement>(null);
    const memorialScrollRef = useRef<HTMLDivElement>(null);
    const animationIdsRef = useRef<number[]>([]);

    // 마운트 시 자동 시작
    useEffect(() => {
        const SPEED = 0.5;
        const refs = [communityScrollRef, adoptionScrollRef, petcareScrollRef, memorialScrollRef];

        console.log("[AutoScroll] 훅 마운트됨");

        // DOM 렌더링 대기
        const startTimer = setTimeout(() => {
            console.log("[AutoScroll] 애니메이션 시작");
            refs.forEach((ref, index) => {
                let lastTime = 0;

                const animate = (currentTime: number) => {
                    const container = ref.current;
                    if (!container) {
                        animationIdsRef.current[index] = requestAnimationFrame(animate);
                        return;
                    }

                    const deltaTime = lastTime ? currentTime - lastTime : 16.67;
                    lastTime = currentTime;

                    const maxScroll = container.scrollWidth - container.clientWidth;

                    if (maxScroll > 0) {
                        const scrollAmount = SPEED * (deltaTime / 16.67);
                        container.scrollLeft += scrollAmount;

                        if (container.scrollLeft >= maxScroll) {
                            container.scrollLeft = 0;
                        }
                    }

                    animationIdsRef.current[index] = requestAnimationFrame(animate);
                };

                animationIdsRef.current[index] = requestAnimationFrame(animate);
            });
        }, 500);

        return () => {
            clearTimeout(startTimer);
            animationIdsRef.current.forEach((id) => {
                if (id) cancelAnimationFrame(id);
            });
            animationIdsRef.current = [];
        };
    }, []);

    // 기존 API 호환 (더 이상 필요 없지만 유지)
    const startAutoScroll = useCallback(() => {
        // 이미 자동 시작되므로 아무것도 안 함
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
