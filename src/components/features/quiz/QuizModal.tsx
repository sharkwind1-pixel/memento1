/**
 * QuizModal.tsx
 * 반려동물 자가진단/퀴즈 모달
 *
 * 기능:
 * - 문항별 선택지 → 점수 합산 → 결과 표시
 * - 결과 공유 (Web Share API)
 * - 진행률 프로그레스 바
 * - 다시 하기
 *
 * 사용처: HomePage 또는 RecordPage에서 "자가진단" 버튼 클릭 시 열림
 */

"use client";

import React, { useState, useCallback } from "react";
import { X, ChevronRight, ChevronLeft, Share2, RotateCcw, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { PetQuiz } from "@/data/petQuizzes";
import { getQuizResult } from "@/data/petQuizzes";

interface QuizModalProps {
    quiz: PetQuiz;
    petName?: string;
    onClose: () => void;
}

export default function QuizModal({ quiz, petName, onClose }: QuizModalProps) {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<number[]>(new Array(quiz.questions.length).fill(-1));
    const [showResult, setShowResult] = useState(false);

    const totalQuestions = quiz.questions.length;
    const progress = ((currentQuestion + 1) / totalQuestions) * 100;
    const allAnswered = answers.every((a) => a >= 0);

    const handleSelect = useCallback((questionIdx: number, score: number) => {
        setAnswers((prev) => {
            const next = [...prev];
            next[questionIdx] = score;
            return next;
        });
        // 자동 다음 문항 (마지막이 아니면)
        if (questionIdx < totalQuestions - 1) {
            setTimeout(() => setCurrentQuestion(questionIdx + 1), 300);
        }
    }, [totalQuestions]);

    const handleSubmit = useCallback(() => {
        if (!allAnswered) {
            toast.error("모든 문항에 답해주세요");
            return;
        }
        setShowResult(true);
    }, [allAnswered]);

    const handleReset = useCallback(() => {
        setAnswers(new Array(quiz.questions.length).fill(-1));
        setCurrentQuestion(0);
        setShowResult(false);
    }, [quiz.questions.length]);

    const handleShare = useCallback(async () => {
        const totalScore = answers.reduce((sum, s) => sum + s, 0);
        const result = getQuizResult(quiz, totalScore);
        const text = quiz.shareText(result, petName);

        if (navigator.share) {
            try {
                await navigator.share({ text, url: "https://mementoani.com" });
            } catch {
                // 공유 취소
            }
        } else {
            await navigator.clipboard.writeText(text);
            toast.success("결과가 복사되었습니다");
        }
    }, [answers, quiz, petName]);

    const totalScore = answers.reduce((sum, s) => sum + Math.max(0, s), 0);
    const result = showResult ? getQuizResult(quiz, totalScore) : null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* 헤더 */}
                <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-5 py-4 flex items-center justify-between z-10 rounded-t-3xl">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                            {quiz.title}
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{quiz.subtitle}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {!showResult ? (
                    <>
                        {/* 프로그레스 바 */}
                        <div className="px-5 pt-4">
                            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                                <span>{currentQuestion + 1} / {totalQuestions}</span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-memento-500 to-memento-400 rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>

                        {/* 문항 */}
                        <div className="px-5 py-6">
                            <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 leading-relaxed">
                                {quiz.questions[currentQuestion].text}
                            </p>
                            <div className="space-y-2.5">
                                {quiz.questions[currentQuestion].options.map((opt, i) => {
                                    const isSelected = answers[currentQuestion] === opt.score;
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => handleSelect(currentQuestion, opt.score)}
                                            className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm ${
                                                isSelected
                                                    ? "border-memento-500 bg-memento-50 dark:bg-memento-900/30 text-memento-700 dark:text-memento-200 font-medium"
                                                    : "border-gray-200 dark:border-gray-600 hover:border-memento-300 text-gray-700 dark:text-gray-300"
                                            }`}
                                        >
                                            {isSelected && <CheckCircle className="w-4 h-4 inline mr-2 text-memento-500" />}
                                            {opt.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 네비게이션 */}
                        <div className="px-5 pb-5 flex items-center justify-between">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentQuestion((p) => Math.max(0, p - 1))}
                                disabled={currentQuestion === 0}
                                className="rounded-xl"
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                이전
                            </Button>

                            {currentQuestion < totalQuestions - 1 ? (
                                <Button
                                    size="sm"
                                    onClick={() => setCurrentQuestion((p) => Math.min(totalQuestions - 1, p + 1))}
                                    disabled={answers[currentQuestion] < 0}
                                    className="rounded-xl bg-memento-500 hover:bg-memento-600 text-white"
                                >
                                    다음
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            ) : (
                                <Button
                                    size="sm"
                                    onClick={handleSubmit}
                                    disabled={!allAnswered}
                                    className="rounded-xl bg-memento-500 hover:bg-memento-600 text-white"
                                >
                                    결과 보기
                                </Button>
                            )}
                        </div>
                    </>
                ) : result ? (
                    /* 결과 화면 */
                    <div className="px-5 py-6 text-center">
                        <div className={`text-4xl font-bold mb-2 ${result.color}`}>
                            {result.title}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            총점: {totalScore} / {totalQuestions * 3}
                        </p>

                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-5 text-left mb-4">
                            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed mb-3">
                                {result.description}
                            </p>
                            <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    권장 사항
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                    {result.advice}
                                </p>
                            </div>
                        </div>

                        <p className="text-[10px] text-gray-400 mb-4">
                            이 결과는 참고용이며 수의사 진료를 대체하지 않습니다.
                        </p>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleReset}
                                className="flex-1 rounded-xl"
                            >
                                <RotateCcw className="w-4 h-4 mr-1" />
                                다시 하기
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleShare}
                                className="flex-1 rounded-xl bg-memento-500 hover:bg-memento-600 text-white"
                            >
                                <Share2 className="w-4 h-4 mr-1" />
                                결과 공유
                            </Button>
                        </div>

                        <p className="text-[11px] text-gray-400 mt-4">
                            메멘토애니(mementoani.com)에서 더 많은 진단을 해보세요
                        </p>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
