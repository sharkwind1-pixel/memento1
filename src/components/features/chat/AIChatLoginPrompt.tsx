/**
 * AIChatLoginPrompt.tsx
 * 비로그인 사용자에게 AI 펫톡 기능을 소개하고 로그인을 유도하는 화면
 *
 * 표시 조건: user가 null일 때
 * 이벤트: window.dispatchEvent(CustomEvent("openAuthModal"))로 로그인 모달 열기
 */

"use client";

import { Button } from "@/components/ui/button";
import { Heart, Sparkles, Syringe, Moon } from "lucide-react";

export default function AIChatLoginPrompt() {
    /** 로그인 모달을 여는 공통 핸들러 */
    const openAuthModal = () => {
        window.dispatchEvent(new CustomEvent("openAuthModal"));
    };

    return (
        <div className="min-h-screen relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-memento-50 via-memento-75 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />
            <div className="relative z-10 flex flex-col items-center justify-center min-h-[60vh] px-4 max-w-md mx-auto">
                {/* 아이콘 */}
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-memento-200 to-violet-100 flex items-center justify-center mb-6 shadow-lg">
                    <Sparkles className="w-12 h-12 text-violet-500" />
                </div>

                {/* 타이틀 */}
                <h2 className="text-2xl font-display font-bold text-memento-900 dark:text-white mb-2 text-center">
                    AI 펫톡으로 대화해보세요
                </h2>
                <p className="text-memento-600 dark:text-gray-400 text-center mb-6">
                    반려동물의 시점에서 대화하고,
                    <br />
                    건강 관리 정보도 받아보세요
                </p>

                {/* 기능 미리보기 */}
                <div className="w-full bg-white/80 dark:bg-gray-800/80 rounded-2xl p-4 mb-6 space-y-3">
                    <div className="flex items-center gap-3 text-sm text-memento-700 dark:text-gray-300">
                        <div className="w-8 h-8 bg-memento-200 rounded-lg flex items-center justify-center">
                            <Heart className="w-4 h-4 text-memento-500" />
                        </div>
                        <span>우리 아이 성격 맞춤 대화</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-memento-700 dark:text-gray-300">
                        <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                            <Syringe className="w-4 h-4 text-violet-500" />
                        </div>
                        <span>예방접종, 건강 체크 알림</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-memento-700 dark:text-gray-300">
                        <div className="w-8 h-8 bg-memorial-100 rounded-lg flex items-center justify-center">
                            <Moon className="w-4 h-4 text-memorial-500" />
                        </div>
                        <span>메모리얼 모드 지원</span>
                    </div>
                </div>

                {/* 무료 안내 */}
                <p className="text-sm text-memento-500 mb-4">
                    무료로 하루 10회 대화할 수 있어요
                </p>

                {/* CTA 버튼 */}
                <div className="flex flex-col gap-3 w-full">
                    <Button
                        onClick={openAuthModal}
                        className="w-full bg-gradient-to-r from-memento-500 to-violet-500 hover:from-memento-600 hover:to-violet-600 text-white py-6 rounded-xl font-bold"
                    >
                        무료로 시작하기
                    </Button>
                    <button
                        onClick={openAuthModal}
                        className="text-memento-400 text-sm hover:text-memento-600 transition-colors"
                    >
                        이미 계정이 있어요
                    </button>
                </div>
            </div>
        </div>
    );
}
