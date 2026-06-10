/**
 * PethomePublicView — /u/[nickname] 공개 펫홈 페이지의 클라이언트 뷰 (펫홈 Phase 1)
 *
 * MinihompyVisitModal을 풀스크린으로 재사용(로직 복붙 0 — §16 재활용지도 원칙).
 * 독립 페이지라 메인 SPA의 Layout(openAuthModal 리스너)이 없으므로,
 * 여기서 AuthModal을 직접 마운트하고 detail.message 패턴(맥락 가입후크 ①)을 동일하게 처리.
 * 닫기(X) → 메인 홈으로 이동 (게스트는 첫 화면 히어로 = 가입 퍼널 연결).
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MinihompyVisitModal from "./MinihompyVisitModal";
import AuthModal from "@/components/Auth/AuthModal";

interface PethomePublicViewProps {
    userId: string;
    nickname: string;
}

export default function PethomePublicView({ userId }: PethomePublicViewProps) {
    const router = useRouter();
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authModalMessage, setAuthModalMessage] = useState<string | undefined>(undefined);

    // 독립 페이지용 openAuthModal 리스너 (Layout.tsx와 동일 패턴 — detail.message = 맥락 가입후크)
    useEffect(() => {
        const handleOpenAuthModal = (e: Event) => {
            const detail = (e as CustomEvent<{ message?: string } | undefined>).detail;
            setAuthModalMessage(detail?.message);
            setIsAuthModalOpen(true);
        };
        window.addEventListener("openAuthModal", handleOpenAuthModal);
        window.addEventListener("openAuthModalSignup", handleOpenAuthModal);
        return () => {
            window.removeEventListener("openAuthModal", handleOpenAuthModal);
            window.removeEventListener("openAuthModalSignup", handleOpenAuthModal);
        };
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-b from-memento-50 via-memento-75 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
            <MinihompyVisitModal
                isOpen
                onClose={() => router.push("/")}
                userId={userId}
            />
            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                contextMessage={authModalMessage}
            />
        </div>
    );
}
