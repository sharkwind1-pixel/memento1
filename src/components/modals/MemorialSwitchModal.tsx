/**
 * MemorialSwitchModal.tsx
 * 추모 전환 세레모니 - 5단계 의식
 *
 * Step 1: 마음의 준비 (확인)
 * Step 2: 날짜 선택
 * Step 3: 추억 슬라이드쇼
 * Step 4: 작별 인사 (선택)
 * Step 5: 별이 되다 (완료 애니메이션)
 *
 * 스크롤 전략:
 * - body 스타일 아무것도 안 건드림 (overflow, position 모두)
 * - backdrop(fixed inset-0)이 overflowY:auto 스크롤 컨테이너
 * - 내부 래퍼가 flex center로 모달 중앙 배치
 * - 모달이 화면보다 크면 backdrop 스크롤로 접근
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pet } from "@/contexts/PetContext";
import { Star, Heart, Calendar, ArrowRight, ArrowLeft, X, PenLine } from "lucide-react";

interface MemorialSwitchModalProps {
    pet: Pet;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (memorialDate: string, farewellMessage?: string) => void;
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
    const [farewellMessage, setFarewellMessage] = useState("");
    const [slideIndex, setSlideIndex] = useState(0);
    const [starReady, setStarReady] = useState(false);
    const slideTimer = useRef<ReturnType<typeof setInterval>>();
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // step 변경 시 스크롤 컨테이너 맨 위로
    useEffect(() => {
        if (isOpen && scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
        }
    }, [isOpen, step]);

    // 사진 목록 (최대 5장)
    const photos = (pet.photos || [])
        .filter((p) => p.type === "image" && p.url)
        .slice(0, 5);

    // 슬라이드쇼 자동 재생
    const startSlideshow = useCallback(() => {
        if (slideTimer.current) clearInterval(slideTimer.current);
        if (photos.length <= 1) return;
        slideTimer.current = setInterval(() => {
            setSlideIndex((prev) => (prev + 1) % photos.length);
        }, 3500);
    }, [photos.length]);

    useEffect(() => {
        if (step === 3 && photos.length > 0) {
            setSlideIndex(0);
            startSlideshow();
        }
        return () => {
            if (slideTimer.current) clearInterval(slideTimer.current);
        };
    }, [step, photos.length, startSlideshow]);

    // Step 5 별 애니메이션 후 버튼 활성화
    useEffect(() => {
        if (step === 5) {
            setStarReady(false);
            const timer = setTimeout(() => setStarReady(true), 2500);
            return () => clearTimeout(timer);
        }
    }, [step]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm(memorialDate, farewellMessage || undefined);
        setStep(1);
        setFarewellMessage("");
        onClose();
    };

    const handleClose = () => {
        setStep(1);
        setFarewellMessage("");
        onClose();
    };

    return (
        /* 최외곽: fixed 전체 화면, 이 자체가 스크롤 컨테이너 */
        <div
            ref={scrollContainerRef}
            className="fixed inset-0 z-[9999] bg-black/60"
            style={{
                overflowY: 'auto',
                overflowX: 'hidden',
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain',
            } as React.CSSProperties}
            onClick={(e) => {
                if (e.target === e.currentTarget) handleClose();
            }}
        >
            {/* 내부 래퍼: 최소 높이 100% + 패딩으로 모달을 중앙으로 밀어냄 */}
            <div
                style={{
                    minHeight: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '40px 16px',
                }}
                onClick={(e) => {
                    if (e.target === e.currentTarget) handleClose();
                }}
            >
                {/* 모달 본체 */}
                <div
                    className="bg-white dark:bg-gray-900 w-full rounded-3xl shadow-2xl"
                    style={{ maxWidth: 448, flexShrink: 0 }}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="memorial-switch-title"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* 진행 표시 (5단계) */}
                    <div className="flex items-center justify-center gap-2 py-3 px-6">
                        {[1, 2, 3, 4, 5].map((s) => (
                            <div
                                key={s}
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                    s === step
                                        ? "w-6 bg-amber-500"
                                        : s < step
                                          ? "w-3 bg-amber-300"
                                          : "w-3 bg-gray-200 dark:bg-gray-700"
                                }`}
                            />
                        ))}
                    </div>

                    {/* Step 1: 마음의 준비 */}
                    {step === 1 && (
                        <>
                            <div className="bg-gradient-to-br from-amber-100 via-orange-100 to-yellow-100 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 p-6 text-center relative">
                                <button
                                    onClick={handleClose}
                                    className="absolute top-3 right-3 p-2 rounded-full hover:bg-white/50 transition-colors"
                                    aria-label="닫기"
                                >
                                    <X className="w-5 h-5 text-gray-600" />
                                </button>
                                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-amber-200 to-orange-200 flex items-center justify-center">
                                    <Star className="w-8 h-8 text-amber-600" />
                                </div>
                                <h2
                                    id="memorial-switch-title"
                                    className="text-lg font-bold text-gray-800 dark:text-white mb-1"
                                >
                                    소중한 기억으로
                                </h2>
                                <p className="text-gray-600 dark:text-gray-300 text-sm">
                                    {pet.name}와의 일상을 추억으로 전환합니다
                                </p>
                            </div>
                            <div className="p-4">
                                <div className="space-y-3 mb-4">
                                    <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                                        <Heart className="w-5 h-5 text-blue-500 flex-shrink-0" />
                                        <p className="text-sm text-gray-700 dark:text-gray-300">
                                            함께한 모든 사진과 기록이{" "}
                                            <strong>추모 공간</strong>으로 이어집니다
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-400/10 rounded-xl">
                                        <Star className="w-5 h-5 text-amber-500 flex-shrink-0" />
                                        <p className="text-sm text-gray-700 dark:text-gray-300">
                                            AI 펫톡이{" "}
                                            <strong>{pet.name}의 목소리</strong>로
                                            따뜻한 위로를 전합니다
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4">
                                    <p className="text-center text-gray-600 dark:text-gray-400 text-sm">
                                        준비가 되셨을 때 진행해 주세요.
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <Button variant="outline" onClick={handleClose} className="flex-1">
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

                    {/* Step 2: 날짜 선택 */}
                    {step === 2 && (
                        <>
                            <div className="bg-gradient-to-br from-amber-100 via-orange-100 to-yellow-100 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 p-6 text-center relative">
                                <button
                                    onClick={handleClose}
                                    className="absolute top-3 right-3 p-2 rounded-full hover:bg-white/50 transition-colors"
                                    aria-label="닫기"
                                >
                                    <X className="w-5 h-5 text-gray-600" />
                                </button>
                                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-amber-200 to-orange-200 flex items-center justify-center">
                                    <Calendar className="w-8 h-8 text-amber-600" />
                                </div>
                                <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-1">
                                    {pet.name}가 떠난 날
                                </h2>
                                <p className="text-gray-600 dark:text-gray-300 text-sm">
                                    소중한 날을 기억합니다
                                </p>
                            </div>
                            <div className="p-4">
                                <div className="mb-4">
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
                                <div className="bg-amber-50 dark:bg-amber-400/10 rounded-xl p-4 mb-4">
                                    <p className="text-center text-amber-700 dark:text-amber-300 text-sm">
                                        {pet.name}는 이제 따뜻한 햇살이 비치는
                                        <br />
                                        평화로운 곳에서 편안히 지내고 있어요.
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        이전으로
                                    </Button>
                                    <Button
                                        onClick={() => photos.length > 0 ? setStep(3) : setStep(4)}
                                        className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                                    >
                                        계속하기
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Step 3: 추억 슬라이드쇼 */}
                    {step === 3 && (
                        <>
                            <div className="bg-gradient-to-br from-amber-100 via-orange-100 to-yellow-100 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 p-4 text-center relative">
                                <button
                                    onClick={handleClose}
                                    className="absolute top-3 right-3 p-2 rounded-full hover:bg-white/50 transition-colors z-10"
                                    aria-label="닫기"
                                >
                                    <X className="w-5 h-5 text-gray-600" />
                                </button>
                                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                                    {pet.name}와 함께한 순간들
                                </p>
                            </div>
                            <div className="relative h-[250px] bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                {photos.map((photo, i) => (
                                    <div
                                        key={photo.id}
                                        className="absolute inset-0 transition-opacity duration-1000"
                                        style={{ opacity: i === slideIndex ? 1 : 0 }}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={photo.url}
                                            alt={photo.caption || `${pet.name} 사진`}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                                            {photo.caption && (
                                                <p className="text-white text-sm text-center">{photo.caption}</p>
                                            )}
                                            {photo.date && (
                                                <p className="text-white/70 text-xs text-center mt-1">{photo.date}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {photos.length > 1 && (
                                    <div className="absolute bottom-16 left-0 right-0 flex justify-center gap-1.5">
                                        {photos.map((_, i) => (
                                            <button
                                                key={i}
                                                onClick={() => { setSlideIndex(i); startSlideshow(); }}
                                                className={`w-2 h-2 rounded-full transition-all ${
                                                    i === slideIndex ? "bg-white w-4" : "bg-white/50"
                                                }`}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="p-4">
                                <div className="flex gap-3">
                                    <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        이전으로
                                    </Button>
                                    <Button
                                        onClick={() => setStep(4)}
                                        className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                                    >
                                        계속하기
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Step 4: 작별 인사 */}
                    {step === 4 && (
                        <>
                            <div className="bg-gradient-to-br from-amber-100 via-orange-100 to-yellow-100 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 p-6 text-center relative">
                                <button
                                    onClick={handleClose}
                                    className="absolute top-3 right-3 p-2 rounded-full hover:bg-white/50 transition-colors"
                                    aria-label="닫기"
                                >
                                    <X className="w-5 h-5 text-gray-600" />
                                </button>
                                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-amber-200 to-orange-200 flex items-center justify-center">
                                    <PenLine className="w-8 h-8 text-amber-600" />
                                </div>
                                <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-1">
                                    {pet.name}에게
                                </h2>
                                <p className="text-gray-600 dark:text-gray-300 text-sm">
                                    마지막으로 전하고 싶은 말이 있다면
                                </p>
                            </div>
                            <div className="p-4">
                                <textarea
                                    value={farewellMessage}
                                    onChange={(e) => setFarewellMessage(e.target.value)}
                                    placeholder={`${pet.name}에게 하고 싶은 말을 적어주세요...`}
                                    className="w-full h-28 p-4 rounded-xl border border-amber-200 dark:border-gray-700 bg-amber-50/50 dark:bg-gray-700/20 text-gray-700 dark:text-gray-300 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm leading-relaxed"
                                    maxLength={500}
                                />
                                <p className="text-right text-xs text-gray-400 mt-1">
                                    {farewellMessage.length}/500
                                </p>
                                <div className="flex gap-3 mt-3">
                                    <Button
                                        variant="outline"
                                        onClick={() => photos.length > 0 ? setStep(3) : setStep(2)}
                                        className="flex-1"
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        이전으로
                                    </Button>
                                    <Button
                                        onClick={() => setStep(5)}
                                        className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                                    >
                                        {farewellMessage ? "다음으로" : "건너뛰기"}
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Step 5: 별이 되다 */}
                    {step === 5 && (
                        <>
                            <div className="relative overflow-hidden bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-t-3xl">
                                <button
                                    onClick={handleClose}
                                    className="absolute top-3 right-3 p-2 rounded-full hover:bg-white/20 transition-colors z-10"
                                    aria-label="닫기"
                                >
                                    <X className="w-5 h-5 text-white/60" />
                                </button>
                                <div className="relative h-48 flex items-center justify-center">
                                    {Array.from({ length: 30 }).map((_, i) => {
                                        const seed = (i * 7 + 13) % 100;
                                        const size = (seed % 3) + 1;
                                        const left = ((i * 37 + 11) % 100);
                                        const top = ((i * 53 + 7) % 100);
                                        const dur = 1.5 + (seed % 20) / 10;
                                        const delay = (i * 17 % 20) / 10;
                                        return (
                                            <div
                                                key={i}
                                                className="absolute rounded-full"
                                                style={{
                                                    width: size, height: size,
                                                    left: `${left}%`, top: `${top}%`,
                                                    backgroundColor: i % 3 === 0 ? "#fde68a" : i % 3 === 1 ? "#ffffff" : "#fbbf24",
                                                    animation: `memorialTwinkle ${dur}s ease-in-out infinite`,
                                                    animationDelay: `${delay}s`,
                                                }}
                                            />
                                        );
                                    })}
                                    <div className="text-center z-10" style={{ animation: "memorialFadeIn 1.5s ease-out" }}>
                                        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gradient-to-br from-amber-300/80 to-yellow-200/80 flex items-center justify-center shadow-lg shadow-amber-500/30">
                                            <Star className="w-7 h-7 text-amber-600" />
                                        </div>
                                        <h2 className="text-lg font-bold text-white mb-1">{pet.name}</h2>
                                        <p className="text-amber-200/80 text-sm">밤하늘의 별이 되었어요</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 text-center">
                                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-4">
                                    {pet.name}는 이제 따뜻한 빛이 되어<br />항상 곁에 있을 거예요.
                                </p>
                                <Button
                                    onClick={handleConfirm}
                                    disabled={!starReady}
                                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                                >
                                    <Star className="w-4 h-4 mr-2" />
                                    {starReady ? "추모 모드로 전환" : "잠시만 기다려주세요..."}
                                </Button>
                            </div>
                            <style>{`
                                @keyframes memorialTwinkle {
                                    0%, 100% { opacity: 0.3; transform: scale(1); }
                                    50% { opacity: 1; transform: scale(1.5); }
                                }
                                @keyframes memorialFadeIn {
                                    from { opacity: 0; transform: translateY(20px); }
                                    to { opacity: 1; transform: translateY(0); }
                                }
                            `}</style>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
