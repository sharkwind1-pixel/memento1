/**
 * 부드러운 자동 스크롤 훅 (requestAnimationFrame 버전)
 * 60fps 동기화로 끊김 없는 매끄러운 애니메이션
 */

"use client";

import { useRef, useEffect, useState, useCallback } from "react";

export function useSmoothAutoScroll() {
    const communityScrollRef = useRef<HTMLDivElement>(null);
    const adoptionScrollRef = useRef<HTMLDivElement>(null);
    const petcareScrollRef = useRef<HTMLDivElement>(null);
    const memorialScrollRef = useRef<HTMLDivElement>(null);
    const [isRunning, setIsRunning] = useState(false);
    const animationIdsRef = useRef<number[]>([]);

    // 자동 스크롤 애니메이션 - 모든 섹션 동일한 속도
    useEffect(() => {
        if (!isRunning) return;

        const SPEED = 0.5; // 모든 섹션 동일한 속도
        const refs = [communityScrollRef, adoptionScrollRef, petcareScrollRef, memorialScrollRef];

        // 각 섹션별 독립적인 애니메이션
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

            // 모든 섹션 동시에 시작
            animationIdsRef.current[index] = requestAnimationFrame(animate);
        });

        return () => {
            animationIdsRef.current.forEach((id) => {
                if (id) cancelAnimationFrame(id);
            });
            animationIdsRef.current = [];
        };
    }, [isRunning]);

    // 외부에서 호출 (기존 API 호환)
    const startAutoScroll = useCallback((enabled: boolean = true) => {
        // DOM 렌더링 대기 후 시작
        setTimeout(() => setIsRunning(enabled), 500);
        return () => setIsRunning(false);
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
