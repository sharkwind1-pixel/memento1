/**
 * QuizSection.tsx
 * 홈 화면 자가진단/퀴즈 섹션
 *
 * 비만도 체크, 분리불안 테스트 등 인터랙티브 퀴즈 카드 표시.
 * 클릭 시 QuizModal 열림.
 */

"use client";

import React, { useState } from "react";
import { Scale, HeartCrack, ChevronRight } from "lucide-react";
import { PET_QUIZZES, type PetQuiz } from "@/data/petQuizzes";
import { usePets } from "@/contexts/PetContext";
import dynamic from "next/dynamic";

const QuizModal = dynamic(() => import("@/components/features/quiz/QuizModal"), {
    ssr: false,
});

const QUIZ_ICONS: Record<string, typeof Scale> = {
    Scale: Scale,
    HeartCrack: HeartCrack,
};

export default function QuizSection() {
    const [activeQuiz, setActiveQuiz] = useState<PetQuiz | null>(null);
    const { selectedPet } = usePets();

    // 펫 종류에 맞는 퀴즈만 필터 (dog 전용 퀴즈는 고양이 유저에게 안 보임)
    const availableQuizzes = PET_QUIZZES.filter((q) => {
        if (q.petType === "all") return true;
        if (!selectedPet) return true; // 펫 없으면 모두 표시
        if (q.petType === "dog" && selectedPet.type === "강아지") return true;
        if (q.petType === "cat" && selectedPet.type === "고양이") return true;
        return false;
    });

    if (availableQuizzes.length === 0) return null;

    return (
        <>
            <section className="px-4">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">
                        자가진단
                    </h2>
                    <span className="text-[11px] text-gray-400">우리 아이 건강 체크</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {availableQuizzes.map((quiz) => {
                        const Icon = QUIZ_ICONS[quiz.icon] || Scale;
                        return (
                            <button
                                key={quiz.id}
                                onClick={() => setActiveQuiz(quiz)}
                                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 text-left hover:border-memento-300 hover:shadow-md transition-all group"
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 rounded-xl bg-memento-100 dark:bg-memento-900/30 flex items-center justify-center">
                                        <Icon className="w-4 h-4 text-memento-500" />
                                    </div>
                                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 ml-auto group-hover:text-memento-500 transition-colors" />
                                </div>
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-tight">
                                    {quiz.title}
                                </p>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                                    {quiz.subtitle}
                                </p>
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* 퀴즈 모달 */}
            {activeQuiz && (
                <QuizModal
                    quiz={activeQuiz}
                    petName={selectedPet?.name}
                    onClose={() => setActiveQuiz(null)}
                />
            )}
        </>
    );
}
