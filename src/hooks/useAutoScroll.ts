/**
 * 자동 스크롤 기능 커스텀 훅
 * 카드들이 자동으로 좌우 스크롤되는 기능을 관리합니다
 */

import { useRef } from "react";

export function useAutoScroll() {
    // 각 섹션별 스크롤 컨테이너 ref들
    const communityScrollRef = useRef<HTMLDivElement>(null);
    const adoptionScrollRef = useRef<HTMLDivElement>(null);
    const petcareScrollRef = useRef<HTMLDivElement>(null);
    const memorialScrollRef = useRef<HTMLDivElement>(null);

    /**
     * 개별 컨테이너에 자동 스크롤을 적용하는 함수
     * @param ref 스크롤할 HTML 요소의 ref
     * @returns cleanup 함수를 반환 (interval 정리용)
     */
    const autoScroll = (ref: React.RefObject<HTMLDivElement>) => {
        if (!ref.current) return;

        const container = ref.current;
        const scrollWidth = container.scrollWidth; // 전체 스크롤 가능한 너비
        const clientWidth = container.clientWidth; // 보이는 영역의 너비

        // 스크롤이 필요하지 않으면 (내용이 화면에 다 들어오면) 종료
        if (scrollWidth <= clientWidth) return;

        let scrollPosition = 0; // 현재 스크롤 위치
        const scrollStep = 1; // 한 번에 이동할 픽셀 수 (부드러운 스크롤)
        const delay = 30; // 스크롤 간격 (30ms = 초당 약 33프레임)

        /**
         * 실제 스크롤을 수행하는 함수
         */
        const scroll = () => {
            if (!ref.current) return;

            scrollPosition += scrollStep;
            ref.current.scrollLeft = scrollPosition;

            // 끝에 도달하면 처음으로 돌아가기
            if (scrollPosition >= scrollWidth - clientWidth) {
                setTimeout(() => {
                    if (ref.current) {
                        ref.current.scrollLeft = 0;
                        scrollPosition = 0;
                    }
                }, 2000); // 2초 대기 후 처음으로 리셋
            }
        };

        // 일정 간격으로 스크롤 실행
        const interval = setInterval(scroll, delay);
        return interval;
    };

    /**
     * 여러 섹션에 자동 스크롤을 시작하는 함수
     * @param isActive 자동 스크롤 활성화 여부 (홈 탭일 때만 동작)
     */
    const startAutoScroll = (isActive: boolean) => {
        if (!isActive) return;

        const intervals: NodeJS.Timeout[] = [];

        // 각 섹션별로 다른 시간에 시작 (자연스러운 효과)
        setTimeout(() => {
            const interval = autoScroll(communityScrollRef);
            if (interval) intervals.push(interval);
        }, 1000); // 1초 후 커뮤니티 스크롤 시작

        setTimeout(() => {
            const interval = autoScroll(adoptionScrollRef);
            if (interval) intervals.push(interval);
        }, 2000); // 2초 후 입양 정보 스크롤 시작

        setTimeout(() => {
            const interval = autoScroll(petcareScrollRef);
            if (interval) intervals.push(interval);
        }, 3000); // 3초 후 펫케어 스크롤 시작

        setTimeout(() => {
            const interval = autoScroll(memorialScrollRef);
            if (interval) intervals.push(interval);
        }, 4000); // 4초 후 추모 스크롤 시작

        // cleanup 함수 반환 (컴포넌트 언마운트 시 interval 정리)
        return () => {
            intervals.forEach((interval) => clearInterval(interval));
        };
    };

    // 훅에서 반환할 값들
    return {
        // 각 섹션의 ref들 (JSX에서 사용)
        communityScrollRef,
        adoptionScrollRef,
        petcareScrollRef,
        memorialScrollRef,
        // 자동 스크롤 시작 함수
        startAutoScroll,
    };
}
