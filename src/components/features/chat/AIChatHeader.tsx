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
    Sparkles,
    RotateCcw,
    MoreHorizontal,
    Brain,
    BarChart3,
    Bell,
    Heart,
    Star,
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
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
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
    onOpenMemoryPanel: () => void;
    onOpenEmotionTracker: () => void;
    onOpenReminderPanel: () => void;
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
    onOpenMemoryPanel,
    onOpenEmotionTracker,
    onOpenReminderPanel,
}: AIChatHeaderProps) {
    const activePets = pets.filter((p) => p.status === "active");
    const memorialPets = pets.filter((p) => p.status === "memorial");

    return (
        <div
            className={`flex-shrink-0 px-4 py-3 border-b relative z-10 transition-all duration-500 ${
                isMemorialMode
                    ? "bg-gradient-to-r from-amber-100/80 to-orange-100/80 border-amber-200/50"
                    : "bg-white/80 border-gray-200/50"
            } backdrop-blur-lg`}
        >
            <div className="max-w-2xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Sparkles
                        className={`w-5 h-5 ${
                            isMemorialMode
                                ? "text-amber-500"
                                : "text-[#05B2DC]"
                        }`}
                    />
                    <h1 className="font-semibold text-gray-800 dark:text-white">
                        AI 펫톡
                    </h1>
                    <button
                        onClick={onNewChat}
                        className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-colors ${
                            isMemorialMode
                                ? "hover:bg-amber-200/50 text-amber-600"
                                : "hover:bg-[#E0F7FF] text-[#05B2DC]"
                        }`}
                        title="새 대화 시작"
                        aria-label="새 대화 시작"
                    >
                        <RotateCcw className="w-5 h-5" />
                    </button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-colors ${
                                    isMemorialMode
                                        ? "hover:bg-amber-200/50 text-amber-600"
                                        : "hover:bg-[#E0F7FF] text-[#05B2DC]"
                                }`}
                                title="더보기"
                                aria-label="더보기 메뉴"
                            >
                                <MoreHorizontal className="w-5 h-5" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={onOpenMemoryPanel}>
                                <Brain className="w-4 h-4 mr-2" />
                                기억 보기
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={onOpenEmotionTracker}>
                                <BarChart3 className="w-4 h-4 mr-2" />
                                감정 분석
                            </DropdownMenuItem>
                            {!isMemorialMode && (
                                <DropdownMenuItem
                                    onClick={onOpenReminderPanel}
                                >
                                    <Bell className="w-4 h-4 mr-2" />
                                    케어 알림
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <Select
                    value={selectedPetId || ""}
                    onValueChange={(id) => selectPet(id)}
                >
                    <SelectTrigger className="w-auto min-w-[140px] border-0 bg-white/50 dark:bg-gray-800/50">
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
