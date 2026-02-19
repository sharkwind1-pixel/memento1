/**
 * useEscapeClose - ESC 키로 모달/패널 닫기
 * 접근성 향상을 위한 키보드 이벤트 훅
 */
import { useEffect } from "react";

export function useEscapeClose(isOpen: boolean, onClose: () => void) {
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                onClose();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);
}
