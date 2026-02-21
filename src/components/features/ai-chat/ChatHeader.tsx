/**
 * ChatHeader
 * ==========
 * AI 펫톡 헤더 컴포넌트
 * - 타이틀, 새 대화 버튼, 펫 선택 드롭다운
 */

"use client";

import { Sparkles, RotateCcw, Heart, Star } from "lucide-react";
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

interface ChatHeaderProps {
    /** 모든 반려동물 목록 */
    pets: Pet[];
    /** 현재 선택된 펫 ID */
    selectedPetId: string | null;
    /** 추모 모드 여부 */
    isMemorialMode: boolean;
    /** 펫 선택 핸들러 */
    onSelectPet: (id: string) => void;
    /** 새 대화 시작 핸들러 */
    onNewChat: () => void;
}

/**
 * AI 펫톡 헤더 컴포넌트
 */
export function ChatHeader({
    pets,
    selectedPetId,
    isMemorialMode,
    onSelectPet,
    onNewChat,
}: ChatHeaderProps) {
    const activePets = pets.filter((p) => p.status === "active");
    const memorialPets = pets.filter((p) => p.status === "memorial");

    return (
        <div
            className={`flex-shrink-0 px-4 py-3 border-b transition-all duration-700 ease-in-out ${
                isMemorialMode
                    ? "bg-gradient-to-r from-amber-100/80 to-orange-100/80 border-amber-200/50"
                    : "bg-white/80 border-gray-200/50"
            } backdrop-blur-lg`}
        >
            <div className="max-w-2xl mx-auto flex items-center justify-between">
                {/* 타이틀 & 새 대화 버튼 */}
                <div className="flex items-center gap-3">
                    <Sparkles
                        className={`w-5 h-5 transition-colors duration-700 ${
                            isMemorialMode ? "text-amber-500" : "text-[#05B2DC]"
                        }`}
                    />
                    <h1 className="font-semibold text-gray-800 dark:text-white">
                        AI 펫톡
                    </h1>
                    <button
                        onClick={onNewChat}
                        className={`p-1.5 rounded-full transition-colors duration-500 ${
                            isMemorialMode
                                ? "hover:bg-amber-200/50 text-amber-600"
                                : "hover:bg-[#E0F7FF] text-[#05B2DC]"
                        }`}
                        title="새 대화 시작"
                        aria-label="새 대화 시작"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>
                </div>

                {/* 펫 선택 드롭다운 */}
                <Select
                    value={selectedPetId || ""}
                    onValueChange={onSelectPet}
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
