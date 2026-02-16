/**
 * PremiumModal.tsx
 * 프리미엄 기능 유도 모달
 * - 부드럽고 친근한 톤
 * - 커피 한 잔 값으로 설득
 */

"use client";

import { Button } from "@/components/ui/button";
import {
    X,
    Sparkles,
    MessageCircle,
    Camera,
    Heart,
    Coffee,
    Check,
    Crown,
} from "lucide-react";
import { toast } from "sonner";

export type PremiumFeature =
    | "ai-chat-limit"      // AI 펫톡 무제한
    | "pet-limit"          // 반려동물 등록 무제한
    | "photo-limit"        // 사진 저장 무제한
    | "memorial-chat"      // 메모리얼 펫톡
    | "priority-support";  // 우선 고객지원

interface PremiumModalProps {
    isOpen: boolean;
    onClose: () => void;
    feature?: PremiumFeature;
    onLogin?: () => void;      // 비로그인 시 로그인 유도
    isLoggedIn?: boolean;
}

// 기능별 설명
const featureInfo: Record<PremiumFeature, {
    icon: typeof MessageCircle;
    title: string;
    description: string;
    benefit: string;
}> = {
    "ai-chat-limit": {
        icon: MessageCircle,
        title: "AI 펫톡 무제한",
        description: "오늘의 무료 대화를 다 사용했어요",
        benefit: "프리미엄이면 하루 종일 우리 아이와 대화할 수 있어요",
    },
    "pet-limit": {
        icon: Heart,
        title: "반려동물 등록 무제한",
        description: "무료는 1마리만 등록할 수 있어요",
        benefit: "여러 아이를 키우신다면 모두 등록하고 기록해보세요",
    },
    "photo-limit": {
        icon: Camera,
        title: "사진 저장 무제한",
        description: "무료 저장 공간이 가득 찼어요",
        benefit: "소중한 순간들을 제한 없이 간직하세요",
    },
    "memorial-chat": {
        icon: Sparkles,
        title: "메모리얼 펫톡",
        description: "무지개 다리를 건넌 아이와의 특별한 대화",
        benefit: "아이의 기억을 바탕으로 따뜻한 대화를 나눌 수 있어요",
    },
    "priority-support": {
        icon: Crown,
        title: "우선 고객 지원",
        description: "빠른 응대가 필요하신가요?",
        benefit: "프리미엄 회원은 우선적으로 도움을 받을 수 있어요",
    },
};

export default function PremiumModal({
    isOpen,
    onClose,
    feature = "ai-chat-limit",
    onLogin,
    isLoggedIn = true,
}: PremiumModalProps) {
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
            <div className="relative bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* 상단 그라데이션 */}
                <div className="bg-gradient-to-br from-violet-500 via-purple-500 to-sky-500 p-8 text-white">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                            <Icon className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">{info.title}</h2>
                            <p className="text-white/80 text-sm mt-1">{info.description}</p>
                        </div>
                    </div>
                </div>

                {/* 본문 */}
                <div className="p-6">
                    {/* 혜택 설명 */}
                    <div className="bg-violet-50 rounded-2xl p-4 mb-6">
                        <p className="text-gray-700 leading-relaxed">
                            {info.benefit}
                        </p>
                    </div>

                    {/* 가격 및 설득 */}
                    <div className="text-center mb-6">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <Coffee className="w-5 h-5 text-amber-500" />
                            <span className="text-gray-500 text-sm">커피 한 잔 값으로</span>
                        </div>
                        <div className="flex items-baseline justify-center gap-1">
                            <span className="text-4xl font-bold text-gray-800">7,900</span>
                            <span className="text-gray-500">원/월</span>
                        </div>
                        <p className="text-sm text-gray-400 mt-2">
                            하루에 약 260원, 부담 없이 시작해보세요
                        </p>
                    </div>

                    {/* 프리미엄 혜택 리스트 */}
                    <div className="space-y-2 mb-6">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Check className="w-4 h-4 text-green-500" />
                            AI 펫톡 무제한
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Check className="w-4 h-4 text-green-500" />
                            반려동물 & 사진 무제한
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Check className="w-4 h-4 text-green-500" />
                            메모리얼 펫톡 지원
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Check className="w-4 h-4 text-green-500" />
                            언제든 해지 가능
                        </div>
                    </div>

                    {/* CTA 버튼 */}
                    {isLoggedIn ? (
                        <div className="space-y-3">
                            <Button
                                className="w-full bg-gradient-to-r from-violet-500 to-sky-500 hover:from-violet-600 hover:to-sky-600 text-white rounded-xl py-6 font-bold"
                                onClick={() => {
                                    // TODO: 결제 페이지로 이동
                                    toast.info("결제 기능은 도메인 설정 후 활성화됩니다!");
                                    onClose();
                                }}
                            >
                                <Crown className="w-5 h-5 mr-2" />
                                프리미엄 시작하기
                            </Button>
                            <button
                                onClick={onClose}
                                className="w-full text-gray-400 text-sm hover:text-gray-600 transition-colors py-2"
                            >
                                나중에 할게요
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <Button
                                className="w-full bg-gradient-to-r from-violet-500 to-sky-500 hover:from-violet-600 hover:to-sky-600 text-white rounded-xl py-6 font-bold"
                                onClick={onLogin}
                            >
                                로그인하고 시작하기
                            </Button>
                            <p className="text-center text-gray-400 text-sm">
                                무료로 시작하고, 마음에 들면 프리미엄으로
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
