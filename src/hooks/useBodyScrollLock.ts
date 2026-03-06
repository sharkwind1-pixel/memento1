/**
 * 모달 오픈 시 body 스크롤을 잠그는 커스텀 훅
 * iOS Safari의 bounce scroll 방지 포함
 */
import { useEffect } from "react";

export function useBodyScrollLock(isOpen: boolean) {
    useEffect(() => {
        if (!isOpen) return;

        const originalOverflow = document.body.style.overflow;
        const originalPosition = document.body.style.position;
        const originalWidth = document.body.style.width;
        const scrollY = window.scrollY;

        document.body.style.overflow = "hidden";
        document.body.style.position = "fixed";
        document.body.style.width = "100%";
        document.body.style.top = `-${scrollY}px`;

        return () => {
            document.body.style.overflow = originalOverflow;
            document.body.style.position = originalPosition;
            document.body.style.width = originalWidth;
            document.body.style.top = "";
            window.scrollTo(0, scrollY);
        };
    }, [isOpen]);
}
