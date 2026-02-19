/**
 * OnboardingModal.tsx
 * 신규 사용자를 위한 온보딩 - 회원 유형별 맞춤 질문
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
    PawPrint,
    Heart,
    Rainbow,
    ArrowRight,
    ArrowLeft,
    Sparkles,
    X,
    Dog,
    Cat,
    Bird,
    Clock,
    Home,
    Building2,
    Users,
    HelpCircle,
    Calendar,
    Check,
} from "lucide-react";

interface OnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGoToRecord: () => void;
    onGoToHome: () => void;
    onGoToAIChat: () => void;
    onShowPostGuide: (userType: UserType) => void;
}

const ONBOARDING_STORAGE_KEY = "memento-ani-onboarding-complete";

// 온보딩 완료 여부 확인 (localStorage 캐시 + DB 동기화)
export function hasCompletedOnboarding(): boolean {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
}

// DB에서 온보딩 상태 확인 (비동기)
export async function checkOnboardingFromDB(userId: string): Promise<boolean> {
    try {
        const { data } = await supabase
            .from("profiles")
            .select("onboarding_completed_at")
            .eq("id", userId)
            .single();

        if (data?.onboarding_completed_at) {
            // DB에 완료 기록이 있으면 localStorage도 동기화
            localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

// 온보딩 완료 표시 (localStorage 캐시)
export function markOnboardingComplete(): void {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
}

// 회원 유형
type UserType = "planning" | "current" | "memorial" | null;

// 반려동물 종류
type PetType = "dog" | "cat" | "other" | null;

// 입양 예정 시기
type AdoptionTiming = "undecided" | "1month" | "3months" | "6months" | null;

// 이전 경험
type PreviousExperience = "first" | "experienced" | null;

// 입양 경로
type AdoptionRoute = "breeder" | "friend" | "shelter" | "undecided" | null;

// 함께한 기간
type TogetherPeriod = "under1" | "1to5" | "5to10" | "over10" | null;

// 떠난 기간
type PassedPeriod = "under1month" | "1to6months" | "6to12months" | "over1year" | null;

// 수집할 데이터
interface OnboardingData {
    userType: UserType;
    petType: PetType;
    // 키우려는 회원용
    adoptionTiming?: AdoptionTiming;
    previousExperience?: PreviousExperience;
    adoptionRoute?: AdoptionRoute;
    // 떠나보낸 회원용
    petName?: string;
    togetherPeriod?: TogetherPeriod;
    passedPeriod?: PassedPeriod;
}

export default function OnboardingModal({
    isOpen,
    onClose,
    onGoToRecord,
    onGoToHome,
    onGoToAIChat,
    onShowPostGuide,
}: OnboardingModalProps) {
    const { user } = useAuth();
    const [step, setStep] = useState(0);
    const [data, setData] = useState<OnboardingData>({
        userType: null,
        petType: null,
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
            setStep(0);
            setData({ userType: null, petType: null });
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    if (!isOpen) return null;

    // 데이터 저장
    const saveOnboardingData = async () => {
        if (!user) return;

        setSaving(true);
        try {
            const { error } = await supabase
                .from("profiles")
                .update({
                    user_type: data.userType,
                    onboarding_data: data,
                    onboarding_completed_at: new Date().toISOString(),
                })
                .eq("id", user.id);

        } catch {}
 finally {
            setSaving(false);
        }
    };

    // 완료 처리 - 유저 타입에 따라 다른 안내 표시
    const handleComplete = async () => {
        await saveOnboardingData();
        markOnboardingComplete();
        onClose();

        // 유저 타입별 PostOnboardingGuide 표시
        if (data.userType) {
            onShowPostGuide(data.userType);
        }
    };

    // 건너뛰기
    const handleSkip = () => {
        markOnboardingComplete();
        onClose();
    };

    // 다음 단계 결정
    const getNextStep = () => {
        if (step === 0) return 1; // 환영 -> 유형 선택
        if (step === 1) return 2; // 유형 선택 -> 반려동물 종류

        // 유형별 분기
        if (data.userType === "planning") {
            if (step === 2) return 3; // 종류 -> 입양 시기
            if (step === 3) return 4; // 입양 시기 -> 경험 여부
            if (step === 4) return 5; // 경험 여부 -> 입양 경로
            if (step === 5) return 100; // 완료
        }
        if (data.userType === "current") {
            if (step === 2) return 100; // 종류 선택 후 바로 완료 (반려동물 등록으로)
        }
        if (data.userType === "memorial") {
            if (step === 2) return 6; // 종류 -> 이름
            if (step === 6) return 7; // 이름 -> 함께한 기간
            if (step === 7) return 8; // 함께한 기간 -> 떠난 기간
            if (step === 8) return 100; // 완료
        }
        return 100;
    };

    // 이전 단계 결정
    const getPrevStep = () => {
        if (step === 1) return 0;
        if (step === 2) return 1;
        if (step === 3) return 2;
        if (step === 4) return 3;
        if (step === 5) return 4;
        if (step === 6) return 2;
        if (step === 7) return 6;
        if (step === 8) return 7;
        return 0;
    };

    const handleNext = () => {
        const next = getNextStep();
        if (next === 100) {
            handleComplete();
        } else {
            setStep(next);
        }
    };

    const handleBack = () => {
        setStep(getPrevStep());
    };

    // 선택 가능 여부
    const canProceed = () => {
        if (step === 0) return true;
        if (step === 1) return data.userType !== null;
        if (step === 2) return data.petType !== null;
        if (step === 3) return data.adoptionTiming !== null;
        if (step === 4) return data.previousExperience !== null;
        if (step === 5) return data.adoptionRoute !== null;
        if (step === 6) return data.petName && data.petName.trim().length > 0;
        if (step === 7) return data.togetherPeriod !== null;
        if (step === 8) return data.passedPeriod !== null;
        return false;
    };

    // 진행률 계산
    const getProgress = () => {
        if (data.userType === "planning") {
            const steps = [0, 1, 2, 3, 4, 5];
            return ((steps.indexOf(step) + 1) / 6) * 100;
        }
        if (data.userType === "current") {
            const steps = [0, 1, 2];
            return ((steps.indexOf(step) + 1) / 3) * 100;
        }
        if (data.userType === "memorial") {
            const steps = [0, 1, 2, 6, 7, 8];
            return ((steps.indexOf(step) + 1) / 6) * 100;
        }
        return ((step + 1) / 3) * 100;
    };

    // 렌더링
    return (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl">
                {/* 헤더 */}
                <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <PawPrint className="w-5 h-5 text-sky-500" />
                        <span className="font-medium text-gray-700 dark:text-gray-200">메멘토애니</span>
                    </div>
                    <button
                        onClick={handleSkip}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* 진행 바 */}
                <div className="h-1 bg-gray-100 dark:bg-gray-800">
                    <div
                        className="h-full bg-gradient-to-r from-sky-400 to-violet-500 transition-all duration-500"
                        style={{ width: `${getProgress()}%` }}
                    />
                </div>

                {/* 콘텐츠 */}
                <div className="p-6">
                    {/* Step 0: 환영 */}
                    {step === 0 && (
                        <div className="text-center py-4">
                            <div className="w-20 h-20 bg-gradient-to-br from-sky-400 to-violet-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                                <Sparkles className="w-10 h-10 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">
                                환영해요!
                            </h2>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                메멘토애니에 오신 걸 환영해요.<br/>
                                몇 가지 질문에 답해주시면<br/>
                                맞춤 서비스를 제공해드릴게요.
                            </p>
                        </div>
                    )}

                    {/* Step 1: 회원 유형 선택 */}
                    {step === 1 && (
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2 text-center">
                                어떤 상황이신가요?
                            </h2>
                            <p className="text-gray-500 text-sm text-center mb-6">
                                맞춤 서비스를 위해 알려주세요
                            </p>
                            <div className="space-y-3">
                                <button
                                    onClick={() => setData({ ...data, userType: "planning" })}
                                    className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${
                                        data.userType === "planning"
                                            ? "border-sky-500 bg-sky-50 dark:bg-sky-900/20"
                                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                                    }`}
                                >
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                        data.userType === "planning" ? "bg-sky-500" : "bg-gray-100 dark:bg-gray-700"
                                    }`}>
                                        <Heart className={`w-6 h-6 ${data.userType === "planning" ? "text-white" : "text-gray-400"}`} />
                                    </div>
                                    <div className="text-left flex-1">
                                        <p className={`font-semibold ${data.userType === "planning" ? "text-sky-700 dark:text-sky-300" : "text-gray-800 dark:text-white"}`}>
                                            반려동물을 맞이할 예정이에요
                                        </p>
                                        <p className="text-sm text-gray-500">입양/분양을 준비 중이에요</p>
                                    </div>
                                    {data.userType === "planning" && <Check className="w-5 h-5 text-sky-500" />}
                                </button>

                                <button
                                    onClick={() => setData({ ...data, userType: "current" })}
                                    className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${
                                        data.userType === "current"
                                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                                    }`}
                                >
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                        data.userType === "current" ? "bg-emerald-500" : "bg-gray-100 dark:bg-gray-700"
                                    }`}>
                                        <PawPrint className={`w-6 h-6 ${data.userType === "current" ? "text-white" : "text-gray-400"}`} />
                                    </div>
                                    <div className="text-left flex-1">
                                        <p className={`font-semibold ${data.userType === "current" ? "text-emerald-700 dark:text-emerald-300" : "text-gray-800 dark:text-white"}`}>
                                            반려동물과 함께 살고 있어요
                                        </p>
                                        <p className="text-sm text-gray-500">현재 반려동물이 있어요</p>
                                    </div>
                                    {data.userType === "current" && <Check className="w-5 h-5 text-emerald-500" />}
                                </button>

                                <button
                                    onClick={() => setData({ ...data, userType: "memorial" })}
                                    className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${
                                        data.userType === "memorial"
                                            ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
                                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                                    }`}
                                >
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                        data.userType === "memorial" ? "bg-amber-500" : "bg-gray-100 dark:bg-gray-700"
                                    }`}>
                                        <Rainbow className={`w-6 h-6 ${data.userType === "memorial" ? "text-white" : "text-gray-400"}`} />
                                    </div>
                                    <div className="text-left flex-1">
                                        <p className={`font-semibold ${data.userType === "memorial" ? "text-amber-700 dark:text-amber-300" : "text-gray-800 dark:text-white"}`}>
                                            소중한 아이를 떠나보냈어요
                                        </p>
                                        <p className="text-sm text-gray-500">추억을 간직하고 싶어요</p>
                                    </div>
                                    {data.userType === "memorial" && <Check className="w-5 h-5 text-amber-500" />}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: 반려동물 종류 */}
                    {step === 2 && (
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2 text-center">
                                {data.userType === "planning" && "어떤 아이를 생각하고 있나요?"}
                                {data.userType === "current" && "어떤 아이와 함께하고 있나요?"}
                                {data.userType === "memorial" && "어떤 아이였나요?"}
                            </h2>
                            <p className="text-gray-500 text-sm text-center mb-6">
                                반려동물 종류를 선택해주세요
                            </p>
                            <div className="grid grid-cols-3 gap-3">
                                <button
                                    onClick={() => setData({ ...data, petType: "dog" })}
                                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                                        data.petType === "dog"
                                            ? "border-sky-500 bg-sky-50 dark:bg-sky-900/20"
                                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                                    }`}
                                >
                                    <Dog className={`w-8 h-8 ${data.petType === "dog" ? "text-sky-500" : "text-gray-400"}`} />
                                    <span className={`font-medium ${data.petType === "dog" ? "text-sky-700 dark:text-sky-300" : "text-gray-600 dark:text-gray-300"}`}>
                                        강아지
                                    </span>
                                </button>
                                <button
                                    onClick={() => setData({ ...data, petType: "cat" })}
                                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                                        data.petType === "cat"
                                            ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                                    }`}
                                >
                                    <Cat className={`w-8 h-8 ${data.petType === "cat" ? "text-violet-500" : "text-gray-400"}`} />
                                    <span className={`font-medium ${data.petType === "cat" ? "text-violet-700 dark:text-violet-300" : "text-gray-600 dark:text-gray-300"}`}>
                                        고양이
                                    </span>
                                </button>
                                <button
                                    onClick={() => setData({ ...data, petType: "other" })}
                                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                                        data.petType === "other"
                                            ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
                                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                                    }`}
                                >
                                    <Bird className={`w-8 h-8 ${data.petType === "other" ? "text-amber-500" : "text-gray-400"}`} />
                                    <span className={`font-medium ${data.petType === "other" ? "text-amber-700 dark:text-amber-300" : "text-gray-600 dark:text-gray-300"}`}>
                                        기타
                                    </span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: 입양 시기 (키우려는 회원) */}
                    {step === 3 && data.userType === "planning" && (
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2 text-center">
                                언제쯤 맞이할 예정인가요?
                            </h2>
                            <p className="text-gray-500 text-sm text-center mb-6">
                                예상 시기를 알려주세요
                            </p>
                            <div className="space-y-3">
                                {[
                                    { value: "undecided", label: "아직 정하지 못했어요", icon: HelpCircle },
                                    { value: "1month", label: "1개월 내", icon: Clock },
                                    { value: "3months", label: "3개월 내", icon: Calendar },
                                    { value: "6months", label: "6개월 내", icon: Calendar },
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => setData({ ...data, adoptionTiming: option.value as AdoptionTiming })}
                                        className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                                            data.adoptionTiming === option.value
                                                ? "border-sky-500 bg-sky-50 dark:bg-sky-900/20"
                                                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                                        }`}
                                    >
                                        <option.icon className={`w-5 h-5 ${data.adoptionTiming === option.value ? "text-sky-500" : "text-gray-400"}`} />
                                        <span className={data.adoptionTiming === option.value ? "text-sky-700 dark:text-sky-300 font-medium" : "text-gray-600 dark:text-gray-300"}>
                                            {option.label}
                                        </span>
                                        {data.adoptionTiming === option.value && <Check className="w-5 h-5 text-sky-500 ml-auto" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 4: 경험 여부 (키우려는 회원) */}
                    {step === 4 && data.userType === "planning" && (
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2 text-center">
                                반려동물 경험이 있으신가요?
                            </h2>
                            <p className="text-gray-500 text-sm text-center mb-6">
                                이전 경험을 알려주세요
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setData({ ...data, previousExperience: "first" })}
                                    className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${
                                        data.previousExperience === "first"
                                            ? "border-sky-500 bg-sky-50 dark:bg-sky-900/20"
                                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                                    }`}
                                >
                                    <Sparkles className={`w-8 h-8 ${data.previousExperience === "first" ? "text-sky-500" : "text-gray-400"}`} />
                                    <span className={`font-medium text-center ${data.previousExperience === "first" ? "text-sky-700 dark:text-sky-300" : "text-gray-600 dark:text-gray-300"}`}>
                                        처음이에요
                                    </span>
                                </button>
                                <button
                                    onClick={() => setData({ ...data, previousExperience: "experienced" })}
                                    className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${
                                        data.previousExperience === "experienced"
                                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                                    }`}
                                >
                                    <Heart className={`w-8 h-8 ${data.previousExperience === "experienced" ? "text-emerald-500" : "text-gray-400"}`} />
                                    <span className={`font-medium text-center ${data.previousExperience === "experienced" ? "text-emerald-700 dark:text-emerald-300" : "text-gray-600 dark:text-gray-300"}`}>
                                        키워본 적 있어요
                                    </span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 5: 입양 경로 (키우려는 회원) */}
                    {step === 5 && data.userType === "planning" && (
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2 text-center">
                                어떻게 맞이할 예정인가요?
                            </h2>
                            <p className="text-gray-500 text-sm text-center mb-6">
                                입양 경로를 선택해주세요
                            </p>
                            <div className="space-y-3">
                                {[
                                    { value: "breeder", label: "브리더/펫샵", icon: Building2 },
                                    { value: "friend", label: "지인 분양", icon: Users },
                                    { value: "shelter", label: "유기동물 보호소", icon: Home },
                                    { value: "undecided", label: "아직 정하지 못했어요", icon: HelpCircle },
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => setData({ ...data, adoptionRoute: option.value as AdoptionRoute })}
                                        className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                                            data.adoptionRoute === option.value
                                                ? "border-sky-500 bg-sky-50 dark:bg-sky-900/20"
                                                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                                        }`}
                                    >
                                        <option.icon className={`w-5 h-5 ${data.adoptionRoute === option.value ? "text-sky-500" : "text-gray-400"}`} />
                                        <span className={data.adoptionRoute === option.value ? "text-sky-700 dark:text-sky-300 font-medium" : "text-gray-600 dark:text-gray-300"}>
                                            {option.label}
                                        </span>
                                        {data.adoptionRoute === option.value && <Check className="w-5 h-5 text-sky-500 ml-auto" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 6: 이름 (떠나보낸 회원) */}
                    {step === 6 && data.userType === "memorial" && (
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2 text-center">
                                아이의 이름을 알려주세요
                            </h2>
                            <p className="text-gray-500 text-sm text-center mb-6">
                                소중한 아이의 이름이 뭐였나요?
                            </p>
                            <input
                                type="text"
                                value={data.petName || ""}
                                onChange={(e) => setData({ ...data, petName: e.target.value })}
                                placeholder="이름을 입력해주세요"
                                className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none text-center text-lg"
                                autoFocus
                            />
                        </div>
                    )}

                    {/* Step 7: 함께한 기간 (떠나보낸 회원) */}
                    {step === 7 && data.userType === "memorial" && (
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2 text-center">
                                {data.petName}와(과) 얼마나 함께했나요?
                            </h2>
                            <p className="text-gray-500 text-sm text-center mb-6">
                                함께한 시간을 알려주세요
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { value: "under1", label: "1년 미만" },
                                    { value: "1to5", label: "1-5년" },
                                    { value: "5to10", label: "5-10년" },
                                    { value: "over10", label: "10년 이상" },
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => setData({ ...data, togetherPeriod: option.value as TogetherPeriod })}
                                        className={`p-4 rounded-xl border-2 transition-all ${
                                            data.togetherPeriod === option.value
                                                ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
                                                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                                        }`}
                                    >
                                        <span className={`font-medium ${data.togetherPeriod === option.value ? "text-amber-700 dark:text-amber-300" : "text-gray-600 dark:text-gray-300"}`}>
                                            {option.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 8: 떠난 기간 (떠나보낸 회원) */}
                    {step === 8 && data.userType === "memorial" && (
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2 text-center">
                                {data.petName}가(이) 떠난 지 얼마나 됐나요?
                            </h2>
                            <p className="text-gray-500 text-sm text-center mb-6">
                                편하게 알려주세요
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { value: "under1month", label: "1개월 미만" },
                                    { value: "1to6months", label: "1-6개월" },
                                    { value: "6to12months", label: "6개월-1년" },
                                    { value: "over1year", label: "1년 이상" },
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => setData({ ...data, passedPeriod: option.value as PassedPeriod })}
                                        className={`p-4 rounded-xl border-2 transition-all ${
                                            data.passedPeriod === option.value
                                                ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
                                                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                                        }`}
                                    >
                                        <span className={`font-medium ${data.passedPeriod === option.value ? "text-amber-700 dark:text-amber-300" : "text-gray-600 dark:text-gray-300"}`}>
                                            {option.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* 버튼 영역 */}
                <div className="p-6 pt-0">
                    <div className="flex gap-3">
                        {step > 0 && (
                            <Button
                                variant="outline"
                                onClick={handleBack}
                                className="flex-1 rounded-xl"
                            >
                                <ArrowLeft className="w-4 h-4 mr-1" />
                                이전
                            </Button>
                        )}
                        <Button
                            onClick={handleNext}
                            disabled={!canProceed() || saving}
                            className={`flex-1 rounded-xl ${
                                data.userType === "memorial"
                                    ? "bg-gradient-to-r from-amber-500 to-orange-500"
                                    : data.userType === "current"
                                        ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                                        : "bg-gradient-to-r from-sky-500 to-violet-500"
                            }`}
                        >
                            {saving ? (
                                "저장 중..."
                            ) : getNextStep() === 100 ? (
                                <>
                                    <Sparkles className="w-4 h-4 mr-1" />
                                    시작하기
                                </>
                            ) : (
                                <>
                                    다음
                                    <ArrowRight className="w-4 h-4 ml-1" />
                                </>
                            )}
                        </Button>
                    </div>

                    {step === 0 && (
                        <button
                            onClick={handleSkip}
                            className="w-full mt-4 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        >
                            나중에 하기
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
