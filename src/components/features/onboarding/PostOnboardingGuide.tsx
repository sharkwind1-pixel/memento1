/**
 * PostOnboardingGuide.tsx
 * 온보딩 완료 후 planning 유저 환영 팝업
 * (current/memorial 유저는 page.tsx에서 직접 RecordPageTutorial로 이동)
 */

"use client";

import { Button } from "@/components/ui/button";
import { Heart, ArrowRight } from "lucide-react";

type UserType = "planning" | "current" | "memorial";

interface PostOnboardingGuideProps {
    isOpen: boolean;
    userType: UserType | null;
    onClose: () => void;
    onGoToHome: () => void;
    // 아래 props는 page.tsx와의 호환성을 위해 유지 (실제로는 사용 안 함)
    onGoToRecord?: () => void;
    onGoToAIChat?: () => void;
    onStartRecordTutorial?: (type: "current" | "memorial") => void;
}

export default function PostOnboardingGuide({
    isOpen,
    userType,
    onClose,
    onGoToHome,
}: PostOnboardingGuideProps) {
    // planning 유저만 이 컴포넌트 사용 (current/memorial은 page.tsx에서 직접 처리)
    if (!isOpen || userType !== "planning") return null;

    // 키울 예정인 유저 - 환영 팝업 (로그인 상태 유지!)
    return (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-8 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-sky-400 to-violet-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <Heart className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-3">
                        환영해요!<br/>함께 준비해요
                    </h2>
                    <p className="text-gray-600 leading-relaxed mb-6">
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
