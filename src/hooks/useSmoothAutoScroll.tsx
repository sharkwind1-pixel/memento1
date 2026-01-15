/**
 * 부드러운 자동 스크롤 훅 (성능 최적화 버전)
 * 기존의 버벅거리는 문제를 해결한 매끄러운 애니메이션
 */

"use client";

import { useRef, useCallback } from "react";

export function useSmoothAutoScroll() {
    const communityScrollRef = useRef<HTMLDivElement>(null);
    const adoptionScrollRef = useRef<HTMLDivElement>(null);
    const petcareScrollRef = useRef<HTMLDivElement>(null);
    const memorialScrollRef = useRef<HTMLDivElement>(null);

    const startSmoothAutoScroll = useCallback((enabled: boolean = true) => {
        if (!enabled) return () => {};

        const intervals: NodeJS.Timeout[] = [];
        const refs = [
            communityScrollRef,
            adoptionScrollRef,
            petcareScrollRef,
            memorialScrollRef,
        ];

        refs.forEach((ref, index) => {
            const interval = setInterval(
                () => {
                    if (!ref.current) return;

                    const container = ref.current;
                    const scrollWidth = container.scrollWidth;
                    const clientWidth = container.clientWidth;
                    const maxScroll = scrollWidth - clientWidth;

                    if (maxScroll <= 0) return;

                    // 현재 스크롤 위치
                    let currentScroll = container.scrollLeft;

                    // 부드러운 스크롤 증가 (픽셀 단위로 세밀하게)
                    const scrollStep = 1; // 1px씩 부드럽게
                    currentScroll += scrollStep;

                    // 끝에 도달하면 부드럽게 처음으로 리셋
                    if (currentScroll >= maxScroll) {
                        // 부드럽게 처음으로 돌아가기
                        container.scrollTo({
                            left: 0,
                            behavior: "smooth",
                        });
                    } else {
                        // 자연스러운 스크롤
                        container.scrollLeft = currentScroll;
                    }
                },
                // 각 섹션마다 다른 속도로 (더 자연스러운 느낌)
                30 + index * 10
            ); // 30ms, 40ms, 50ms, 60ms
        });

        intervals.push(...intervals);

        // cleanup 함수
        return () => {
            intervals.forEach((interval) => clearInterval(interval));
        };
    }, []);

    return {
        communityScrollRef,
        adoptionScrollRef,
        petcareScrollRef,
        memorialScrollRef,
        startSmoothAutoScroll,
    };
}
