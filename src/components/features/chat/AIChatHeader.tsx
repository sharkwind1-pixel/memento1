/**
 * AIChatHeader.tsx
 * AI 펫톡 상단 헤더바
 *
 * 포함 요소:
 * - AI 펫톡 타이틀 + 아이콘
 * - 새 대화 시작 버튼
 * - 더보기 메뉴 (기억 보기, 감정 분석, 케어 알림)
 * - 반려동물 선택 드롭다운 (일상/추모 그룹)
 */

"use client";

import {
    RotateCcw,
    Heart,
    Star,
    Share2,
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { Pet } from "@/types";

// ============================================================================
// 타입 정의
// ============================================================================

interface AIChatHeaderProps {
    isMemorialMode: boolean;
    pets: Pet[];
    selectedPetId: string | null;
    selectPet: (id: string) => void;
    onNewChat: () => void;
    onExport?: () => void;
    hasMessages?: boolean;
    messageCount?: number;
}

// ============================================================================
// 컴포넌트
// ============================================================================

export default function AIChatHeader({
    isMemorialMode,
    pets,
    selectedPetId,
    selectPet,
    onNewChat,
    onExport,
    hasMessages = false,
    messageCount = 0,
}: AIChatHeaderProps) {
    const activePets = pets.filter((p) => p.status === "active");
    const memorialPets = pets.filter((p) => p.status === "memorial");

    /** 새 대화 시작 - 대화 2개 이상이면 확인 후 시작 */
    const handleNewChatClick = () => {
        if (messageCount > 1) {
            const confirmed = window.confirm(
                "현재 대화가 초기화됩니다. 새 대화를 시작할까요?"
            );
            if (!confirmed) return;
        }
        onNewChat();
    };

    return (
        <div
            className={`flex-shrink-0 px-4 py-3 border-b relative z-20 transition-all duration-700 ease-in-out ${
                isMemorialMode
                    ? "bg-gradient-to-r from-amber-100/80 to-orange-100/80 dark:from-amber-900/40 dark:to-amber-800/40 border-amber-200/50 dark:border-amber-700/50"
                    : "bg-white/80 dark:bg-gray-900/80 border-sky-200/50 dark:border-sky-700/50"
            } backdrop-blur-lg`}
        >
            <div className="max-w-2xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleNewChatClick}
                        className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-all duration-500 active:scale-95 ${
                            isMemorialMode
                                ? "hover:bg-amber-200/50 text-amber-600"
                                : "hover:bg-[#E0F7FF] text-[#05B2DC]"
                        }`}
                        title="새 대화 시작"
                        aria-label="새 대화 시작"
                    >
                        <RotateCcw className="w-5 h-5" />
                    </button>
                    {hasMessages && onExport && (
                        <button
                            onClick={onExport}
                            className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-all duration-500 active:scale-95 ${
                                isMemorialMode
                                    ? "hover:bg-amber-200/50 text-amber-600"
                                    : "hover:bg-[#E0F7FF] text-[#05B2DC]"
                            }`}
                            title="대화 내보내기"
                            aria-label="대화 내보내기"
                        >
                            <Share2 className="w-5 h-5" />
                        </button>
                    )}
                </div>
                <Select
                    value={selectedPetId || ""}
                    onValueChange={(id) => selectPet(id)}
                >
                    <SelectTrigger className={`w-auto min-w-[140px] border-0 ${
                        isMemorialMode ? "bg-amber-50/50 dark:bg-amber-900/30" : "bg-sky-50/50 dark:bg-sky-900/30"
                    }`}>
                        <SelectValue placeholder="반려동물 선택" />
                    </SelectTrigger>
                    <SelectContent>
                        {/* 일상 모드 펫 */}
                        {activePets.length > 0 && (
                            <SelectGroup>
                                <SelectLabel className="flex items-center gap-2 text-[#05B2DC]">
                                    <Heart className="w-3 h-3" />
                                    일상 모드
                                </SelectLabel>
                                {activePets.map((pet) => (
                                    <SelectItem key={pet.id} value={pet.id}>
                                        <span className="flex items-center gap-2">
                                            <Heart className="w-4 h-4 text-pink-500" />
                                            {pet.name}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        )}
                        {/* 추모 모드 펫 */}
                        {memorialPets.length > 0 && (
                            <SelectGroup>
                                <SelectLabel className="flex items-center gap-2 text-amber-500">
                                    <Star className="w-3 h-3" />
                                    추모 모드
                                </SelectLabel>
                                {memorialPets.map((pet) => (
                                    <SelectItem key={pet.id} value={pet.id}>
                                        <span className="flex items-center gap-2">
                                            <Star className="w-4 h-4 text-amber-500" />
                                            {pet.name}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        )}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
