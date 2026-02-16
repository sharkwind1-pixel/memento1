/**
 * LoginPromptModal.tsx
 * 로그인 유도 모달
 * - 부드럽고 친근한 톤
 * - 기능별 맞춤 메시지
 */

"use client";

import { Button } from "@/components/ui/button";
import {
    X,
    MessageCircle,
    Camera,
    Heart,
    LogIn,
    UserPlus,
    Sparkles,
    PawPrint,
} from "lucide-react";

export type LoginFeature =
    | "ai-chat"      // AI 펫톡
    | "record"       // 우리의 기록
    | "community"    // 커뮤니티 글쓰기
    | "like"         // 좋아요
    | "comment"      // 댓글
    | "general";     // 일반

interface LoginPromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    feature?: LoginFeature;
    onLogin: () => void;
    onSignup: () => void;
}

// 기능별 설명
const featureInfo: Record<LoginFeature, {
    icon: typeof MessageCircle;
    title: string;
    description: string;
    encouragement: string;
}> = {
    "ai-chat": {
        icon: MessageCircle,
        title: "AI 펫톡",
        description: "우리 아이와 대화하고 싶으신가요?",
        encouragement: "로그인하면 반려동물을 등록하고 AI와 대화할 수 있어요",
    },
    "record": {
        icon: Camera,
        title: "우리의 기록",
        description: "소중한 순간을 기록하고 싶으신가요?",
        encouragement: "로그인하면 사진과 일상을 안전하게 저장할 수 있어요",
    },
    "community": {
        icon: Heart,
        title: "커뮤니티",
        description: "다른 반려인들과 소통하고 싶으신가요?",
        encouragement: "로그인하면 글을 쓰고 댓글을 남길 수 있어요",
    },
    "like": {
        icon: Heart,
        title: "좋아요",
        description: "이 글이 마음에 드셨나요?",
        encouragement: "로그인하면 좋아요를 누르고 저장할 수 있어요",
    },
    "comment": {
        icon: MessageCircle,
        title: "댓글",
        description: "의견을 남기고 싶으신가요?",
        encouragement: "로그인하면 댓글로 소통할 수 있어요",
    },
    "general": {
        icon: PawPrint,
        title: "메멘토애니",
        description: "더 많은 기능을 이용하고 싶으신가요?",
        encouragement: "로그인하면 모든 기능을 사용할 수 있어요",
    },
};

export default function LoginPromptModal({
    isOpen,
    onClose,
    feature = "general",
    onLogin,
    onSignup,
}: LoginPromptModalProps) {
    if (!isOpen) return null;

    const info = featureInfo[feature];
    const Icon = info.icon;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* 배경 오버레이 */}
            <div
                className="absolute inset-0 bg-black/40"
                onClick={onClose}
            />

            {/* 모달 */}
            <div className="relative bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* 닫기 버튼 */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors z-10"
                >
                    <X className="w-5 h-5 text-gray-400" />
                </button>

                {/* 상단 아이콘 영역 */}
                <div className="pt-8 pb-4 px-6 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-sky-100 to-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icon className="w-10 h-10 text-violet-500" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">
                        {info.title}
                    </h2>
                    <p className="text-gray-600">
                        {info.description}
                    </p>
                </div>

                {/* 본문 */}
                <div className="px-6 pb-8">
                    {/* 설명 */}
                    <div className="bg-gradient-to-r from-sky-50 to-violet-50 rounded-2xl p-4 mb-6 text-center">
                        <Sparkles className="w-5 h-5 text-amber-500 mx-auto mb-2" />
                        <p className="text-gray-700 text-sm leading-relaxed">
                            {info.encouragement}
                        </p>
                    </div>

                    {/* 혜택 안내 */}
                    <div className="text-center mb-6">
                        <p className="text-sm text-gray-400">
                            무료로 가입하고 바로 시작해보세요
                        </p>
                    </div>

                    {/* CTA 버튼 */}
                    <div className="space-y-3">
                        <Button
                            className="w-full bg-gradient-to-r from-sky-500 to-violet-500 hover:from-sky-600 hover:to-violet-600 text-white rounded-xl py-6 font-bold"
                            onClick={() => {
                                onClose();
                                onSignup();
                            }}
                        >
                            <UserPlus className="w-5 h-5 mr-2" />
                            무료로 시작하기
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full rounded-xl py-5 border-gray-200"
                            onClick={() => {
                                onClose();
                                onLogin();
                            }}
                        >
                            <LogIn className="w-4 h-4 mr-2" />
                            이미 계정이 있어요
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
