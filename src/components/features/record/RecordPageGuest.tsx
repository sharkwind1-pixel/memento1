/**
 * RecordPageGuest.tsx
 * 비로그인 상태에서 보여주는 RecordPage UI
 *
 * RecordPage에서 추출한 UI 컴포넌트
 */

"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Camera, BookOpen, Bell } from "lucide-react";

export default function RecordPageGuest() {
    const openAuth = () => {
        window.dispatchEvent(new CustomEvent("openAuthModal"));
    };

    return (
        <div className="min-h-screen relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-memento-50 via-memento-75 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />
            <div className="relative z-10 flex flex-col items-center justify-center min-h-[60vh] px-4 max-w-md mx-auto">
                {/* 아이콘 */}
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-100 to-memorial-100 flex items-center justify-center mb-6 shadow-lg">
                    <Camera className="w-12 h-12 text-violet-500" />
                </div>

                {/* 타이틀 */}
                <h2 className="text-2xl font-display font-bold text-gray-800 dark:text-white mb-2 text-center">
                    소중한 순간을 기록해보세요
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-center mb-6">
                    사진, 일상, 건강 기록을
                    <br />
                    한 곳에서 관리할 수 있어요
                </p>

                {/* 기능 미리보기 */}
                <div className="w-full bg-white/80 dark:bg-gray-800/80 rounded-2xl p-4 mb-6 space-y-3">
                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                        <div className="w-8 h-8 bg-violet-100 dark:bg-violet-400/15 rounded-lg flex items-center justify-center">
                            <Camera className="w-4 h-4 text-violet-500" />
                        </div>
                        <span>사진 갤러리로 추억 모아보기</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                        <div className="w-8 h-8 bg-memento-200 dark:bg-memento-400/15 rounded-lg flex items-center justify-center">
                            <BookOpen className="w-4 h-4 text-memento-500" />
                        </div>
                        <span>타임라인으로 일상 기록하기</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                        <div className="w-8 h-8 bg-memorial-100 dark:bg-memorial-400/15 rounded-lg flex items-center justify-center">
                            <Bell className="w-4 h-4 text-memorial-500" />
                        </div>
                        <span>예방접종, 미용 리마인더</span>
                    </div>
                </div>

                {/* 무료 안내 */}
                <p className="text-sm text-gray-400 mb-4">
                    무료로 시작할 수 있어요
                </p>

                {/* CTA 버튼 */}
                <div className="flex flex-col gap-3 w-full">
                    <Button
                        onClick={openAuth}
                        className="w-full bg-gradient-to-r from-violet-500 to-memento-500 hover:from-violet-600 hover:to-memento-600 text-white py-6 rounded-xl font-bold"
                    >
                        무료로 시작하기
                    </Button>
                    <button
                        onClick={openAuth}
                        className="text-gray-400 text-sm hover:text-gray-600 transition-colors"
                    >
                        이미 계정이 있어요
                    </button>
                </div>
            </div>
        </div>
    );
}
