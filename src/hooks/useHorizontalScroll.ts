/**
 * useHorizontalScroll - 가로 스크롤 영역에서 마우스 휠로 좌우 스크롤
 *
 * 마우스 휠을 아래로 굴리면 오른쪽으로, 위로 굴리면 왼쪽으로 스크롤.
 * 터치 디바이스에서는 기본 터치 스크롤을 유지한다.
 */
import { useRef, useEffect, useCallback } from "react";

export default function useHorizontalScroll<T extends HTMLElement = HTMLDivElement>() {
    const scrollRef = useRef<T>(null);

    const handleWheel = useCallback((e: WheelEvent) => {
        const el = scrollRef.current;
        if (!el) return;

        // 세로 스크롤이 있는 컨테이너는 무시 (세로 콘텐츠가 넘치는 경우)
        if (el.scrollHeight > el.clientHeight + 1) return;

        // 가로로 스크롤 가능한 여유가 있을 때만 가로 변환
        const canScrollLeft = el.scrollLeft > 0;
        const canScrollRight = el.scrollLeft < el.scrollWidth - el.clientWidth - 1;

        // 휠 방향과 스크롤 가능 여부 체크
        if ((e.deltaY > 0 && !canScrollRight) || (e.deltaY < 0 && !canScrollLeft)) {
            return; // 끝에 도달하면 기본 세로 스크롤 허용
        }

        // 수직 휠 이벤트만 가로로 변환 (trackpad 가로 스크롤은 그대로)
        if (e.deltaY !== 0) {
            e.preventDefault();
            el.scrollLeft += e.deltaY;
        }
    }, []);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        el.addEventListener("wheel", handleWheel, { passive: false });
        return () => el.removeEventListener("wheel", handleWheel);
    }, [handleWheel]);

    return scrollRef;
}
