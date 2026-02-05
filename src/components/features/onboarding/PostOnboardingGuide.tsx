/**
 * PostOnboardingGuide.tsx
 * 온보딩 완료 후 유저 타입별 맞춤 안내
 * - 키울 예정: 환영 팝업 + 자유롭게 둘러보기
 * - 키우고 있다: Record 페이지로 이동 + 스포트라이트 튜토리얼
 * - 이별했다: Record 페이지로 이동 + 추모용 스포트라이트 튜토리얼
 */

"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Heart, ArrowRight } from "lucide-react";

type UserType = "planning" | "current" | "memorial";

interface PostOnboardingGuideProps {
    isOpen: boolean;
    userType: UserType | null;
    onClose: () => void;
    onGoToHome: () => void;
    onGoToRecord: () => void;
    onGoToAIChat: () => void;
    onStartRecordTutorial: (type: "current" | "memorial") => void;
}

export default function PostOnboardingGuide({
    isOpen,
    userType,
    onClose,
    onGoToHome,
    onGoToRecord,
    onGoToAIChat,
    onStartRecordTutorial,
}: PostOnboardingGuideProps) {
    // current/memorial 유저는 바로 Record 페이지 + 튜토리얼 시작
    useEffect(() => {
        if (!isOpen || !userType) return;

        if (userType === "current" || userType === "memorial") {
            onClose();
            onGoToRecord();
            // 페이지 전환 후 튜토리얼 시작 (약간의 딜레이)
            setTimeout(() => {
                onStartRecordTutorial(userType);
            }, 500);
        }
    }, [isOpen, userType, onClose, onGoToRecord, onStartRecordTutorial]);

    if (!isOpen || !userType) return null;

    // current/memorial은 useEffect에서 처리하므로 여기서는 planning만
    if (userType !== "planning") return null;

    // 키울 예정인 유저 - 환영 팝업
    return (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-8 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-sky-400 to-violet-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <Heart className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-3">
                        새로운 가족을 기다리는 마음,<br/>응원할게요
                    </h2>
                    <p className="text-gray-600 leading-relaxed mb-6">
                        메멘토애니에서 입양 정보도 확인하고,<br/>
                        다른 반려인들의 이야기도 들어보세요.<br/>
                        준비가 되면 언제든 돌아와 주세요.
                    </p>
                    <Button
                        onClick={() => {
                            onClose();
                            onGoToHome();
                        }}
                        className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 py-6 text-lg"
                    >
                        둘러볼게요
                        <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
