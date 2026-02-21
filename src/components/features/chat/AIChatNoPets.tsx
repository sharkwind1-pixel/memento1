/**
 * AIChatNoPets.tsx
 * 반려동물 미등록 사용자에게 등록을 유도하는 화면
 *
 * 표시 조건: 로그인했지만 pets.length === 0일 때
 * 동작: "반려동물 등록하기" 버튼 클릭 시 ?tab=record 페이지로 이동
 */

"use client";

import { PawPrint, Plus } from "lucide-react";

export default function AIChatNoPets() {
    return (
        <div className="flex flex-col items-center justify-center px-4 py-20">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#E0F7FF] to-[#BAE6FD] flex items-center justify-center mb-6">
                <PawPrint className="w-12 h-12 text-[#05B2DC]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2 text-center">
                반려동물을 등록해주세요
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-center mb-6">
                AI 펫톡을 시작하려면
                <br />
                먼저 반려동물을 등록해야 해요
            </p>
            <button
                type="button"
                onClick={() => {
                    window.location.href = "/?tab=record";
                }}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] text-white px-8 py-4 rounded-xl font-medium text-base active:scale-95 transition-transform touch-manipulation"
            >
                <Plus className="w-5 h-5" />
                반려동물 등록하기
            </button>
        </div>
    );
}
