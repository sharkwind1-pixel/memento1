/**
 * ChatEmptyState
 * ==============
 * AI 펫톡 빈 상태 컴포넌트
 * - 로딩 중
 * - 로그인 필요
 * - 펫 등록 필요
 */

"use client";

import { PawPrint, LogIn, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TabType } from "@/types";

type EmptyStateType = "loading" | "login-required" | "no-pets";

interface ChatEmptyStateProps {
    /** 상태 타입 */
    type: EmptyStateType;
    /** 탭 이동 핸들러 */
    setSelectedTab?: (tab: TabType) => void;
}

/**
 * 로딩 상태
 */
function LoadingState() {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-4">
                    <PawPrint className="w-16 h-16 text-[#05B2DC]/20" />
                    <Loader2 className="w-16 h-16 text-[#05B2DC] animate-spin absolute inset-0" />
                </div>
                <p className="text-gray-500">불러오는 중...</p>
            </div>
        </div>
    );
}

/**
 * 로그인 필요 상태
 */
function LoginRequiredState() {
    const handleOpenAuthModal = () => {
        window.dispatchEvent(new CustomEvent("openAuthModal"));
    };

    return (
        <div className="min-h-screen relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-[#F0F9FF] via-[#FAFCFF] to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />
            <div className="relative z-10 flex flex-col items-center justify-center min-h-[60vh] px-4">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#E0F7FF] to-[#BAE6FD] flex items-center justify-center mb-6">
                    <LogIn className="w-12 h-12 text-[#05B2DC]" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                    로그인이 필요해요
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-center mb-6">
                    AI 펫톡을 이용하려면
                    <br />
                    먼저 로그인해주세요
                </p>
                <Button
                    onClick={handleOpenAuthModal}
                    className="bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] hover:from-[#0891B2] hover:to-[#05B2DC] text-white px-8"
                >
                    <LogIn className="w-4 h-4 mr-2" />
                    로그인하기
                </Button>
            </div>
        </div>
    );
}

/**
 * 펫 없음 상태
 */
function NoPetsState({
    setSelectedTab,
}: {
    setSelectedTab?: (tab: TabType) => void;
}) {
    return (
        <div className="min-h-screen relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-[#F0F9FF] via-[#FAFCFF] to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />
            <div className="relative z-10 flex flex-col items-center justify-center min-h-[60vh] px-4">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#E0F7FF] to-[#BAE6FD] flex items-center justify-center mb-6">
                    <PawPrint className="w-12 h-12 text-[#05B2DC]" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                    반려동물을 등록해주세요
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-center mb-6">
                    AI 펫톡을 시작하려면
                    <br />
                    먼저 반려동물을 등록해야 해요
                </p>
                <Button
                    onClick={() => setSelectedTab?.("record")}
                    className="bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] hover:from-[#0891B2] hover:to-[#05B2DC] text-white px-8"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    반려동물 등록하기
                </Button>
            </div>
        </div>
    );
}

/**
 * 빈 상태 컴포넌트
 */
export function ChatEmptyState({ type, setSelectedTab }: ChatEmptyStateProps) {
    switch (type) {
        case "loading":
            return <LoadingState />;
        case "login-required":
            return <LoginRequiredState />;
        case "no-pets":
            return <NoPetsState setSelectedTab={setSelectedTab} />;
        default:
            return null;
    }
}
