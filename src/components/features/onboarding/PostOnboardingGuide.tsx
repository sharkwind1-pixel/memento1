/**
 * PostOnboardingGuide.tsx
 * 온보딩 완료 후 planning 유저 환영 팝업
 * (current/memorial 유저는 page.tsx에서 직접 Record 페이지로 이동)
 */

"use client";

import { Button } from "@/components/ui/button";
import { Heart, ArrowRight } from "lucide-react";
import type { OnboardingUserType } from "@/types";
import { useEscapeClose } from "@/hooks/useEscapeClose";

interface PostOnboardingGuideProps {
    isOpen: boolean;
    userType: OnboardingUserType | null;
    onClose: () => void;
    onGoToHome: () => void;
    onGoToRecord?: () => void;
    onGoToAIChat?: () => void;
}

export default function PostOnboardingGuide({
    isOpen,
    userType,
    onClose,
    onGoToHome,
}: PostOnboardingGuideProps) {
    useEscapeClose(isOpen && userType === "planning", onClose);
    // planning 유저만 이 컴포넌트 사용 (current/memorial은 page.tsx에서 직접 처리)
    if (!isOpen || userType !== "planning") return null;

    // 키울 예정인 유저 - 환영 팝업 (로그인 상태 유지!)
    return (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-8 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-sky-400 to-violet-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <Heart className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-2xl font-display font-bold text-gray-800 dark:text-white mb-3">
                        환영해요!<br/>함께 준비해요
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                        커뮤니티에서 다른 반려인들의 경험을 들어보고,<br/>
                        매거진에서 유용한 정보도 확인해보세요.<br/>
                        새 가족을 맞이할 준비를 도와드릴게요!
                    </p>
                    <Button
                        onClick={() => {
                            onClose();
                            onGoToHome();
                        }}
                        className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 py-6 text-lg"
                    >
                        시작하기
                        <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
