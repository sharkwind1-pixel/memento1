/**
 * MemorialSwitchModal.tsx
 * 추모 전환 모달 - 일상 모드 → 추모 모드
 * 사업계획서: "준비되었을 때 사용자가 직접 전환, 심리적 부담 최소화"
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pet } from "@/contexts/PetContext";
import { Star, Heart, Calendar, ArrowRight, X } from "lucide-react";

interface MemorialSwitchModalProps {
    pet: Pet;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (memorialDate: string) => void;
}

export default function MemorialSwitchModal({
    pet,
    isOpen,
    onClose,
    onConfirm,
}: MemorialSwitchModalProps) {
    const [step, setStep] = useState(1);
    const [memorialDate, setMemorialDate] = useState(
        new Date().toISOString().split("T")[0]
    );

    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm(memorialDate);
        setStep(1);
        onClose();
    };

    const handleClose = () => {
        setStep(1);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="memorial-switch-title">
                {/* Step 1: 확인 */}
                {step === 1 && (
                    <>
                        {/* 헤더 - 감성적인 그라데이션 */}
                        <div className="bg-gradient-to-br from-amber-100 via-orange-100 to-yellow-100 dark:from-amber-900/50 dark:via-orange-900/50 dark:to-yellow-900/50 p-8 text-center relative">
                            <button
                                onClick={handleClose}
                                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/50 transition-colors"
                                aria-label="닫기"
                            >
                                <X className="w-5 h-5 text-gray-600" />
                            </button>

                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-200 to-orange-200 flex items-center justify-center">
                                <Star className="w-10 h-10 text-amber-600" />
                            </div>

                            <h2 id="memorial-switch-title" className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                                소중한 기억으로
                            </h2>
                            <p className="text-gray-600 dark:text-gray-300 text-sm">
                                {pet.name}와의 일상을 추억으로 전환합니다
                            </p>
                        </div>

                        {/* 본문 */}
                        <div className="p-6">
                            <div className="space-y-4 mb-6">
                                <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                                    <Heart className="w-5 h-5 text-blue-500 flex-shrink-0" />
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        함께한 모든 사진과 기록이 <strong>추모 공간</strong>으로 이어집니다
                                    </p>
                                </div>

                                <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
                                    <Star className="w-5 h-5 text-amber-500 flex-shrink-0" />
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        AI 펫톡이 <strong>{pet.name}의 목소리</strong>로 따뜻한 위로를 전합니다
                                    </p>
                                </div>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-6">
                                <p className="text-center text-gray-600 dark:text-gray-400 text-sm">
                                    이 결정은 나중에 되돌릴 수 있습니다.
                                    <br />
                                    준비가 되셨을 때 진행해 주세요.
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    onClick={handleClose}
                                    className="flex-1"
                                >
                                    아직 준비가 안 됐어요
                                </Button>
                                <Button
                                    onClick={() => setStep(2)}
                                    className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                                >
                                    계속하기
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </div>
                    </>
                )}

                {/* Step 2: 날짜 입력 */}
                {step === 2 && (
                    <>
                        <div className="bg-gradient-to-br from-amber-100 via-orange-100 to-yellow-100 dark:from-amber-900/50 dark:via-orange-900/50 dark:to-yellow-900/50 p-8 text-center relative">
                            <button
                                onClick={handleClose}
                                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/50 transition-colors"
                                aria-label="닫기"
                            >
                                <X className="w-5 h-5 text-gray-600" />
                            </button>

                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-200 to-orange-200 flex items-center justify-center">
                                <Calendar className="w-10 h-10 text-amber-600" />
                            </div>

                            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                                {pet.name}가 무지개다리를 건넌 날
                            </h2>
                            <p className="text-gray-600 dark:text-gray-300 text-sm">
                                소중한 날을 기억합니다
                            </p>
                        </div>

                        <div className="p-6">
                            <div className="mb-6">
                                <Label htmlFor="memorialDate" className="text-gray-700 dark:text-gray-300">
                                    날짜 선택
                                </Label>
                                <Input
                                    id="memorialDate"
                                    type="date"
                                    value={memorialDate}
                                    onChange={(e) => setMemorialDate(e.target.value)}
                                    max={new Date().toISOString().split("T")[0]}
                                    className="mt-2 text-center text-lg"
                                />
                            </div>

                            <div className="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-4 mb-6">
                                <p className="text-center text-amber-700 dark:text-amber-300 text-sm">
                                    {pet.name}는 이제 따뜻한 햇살이 비치는
                                    <br />
                                    평화로운 곳에서 편안히 지내고 있어요.
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => setStep(1)}
                                    className="flex-1"
                                >
                                    이전으로
                                </Button>
                                <Button
                                    onClick={handleConfirm}
                                    className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                                >
                                    <Star className="w-4 h-4 mr-2" />
                                    추모 모드로 전환
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
