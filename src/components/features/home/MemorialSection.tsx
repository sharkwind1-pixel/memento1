/**
 * MemorialSection.tsx
 * 홈페이지 "오늘의 기일" 섹션
 * 오늘(또는 이번 주) 기일인 반려동물 카드를 보여줌
 */

"use client";

/* eslint-disable @next/next/no-img-element */

import React from "react";
import {
    Card,
    CardContent,
    CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Cloud,
    ArrowRight,
    Flower2,
} from "lucide-react";
import { safeStringSrc, getPetIcon } from "./homeUtils";
import type { LightboxItem } from "./types";
import { TabType } from "@/types";

interface MemorialPetItem {
    id: string;
    name: string;
    type: string;
    breed: string;
    profileImage: string | null;
    yearsAgo: number | null;
    yearsLabel: string;
    memorialDate: string;
}

interface MemorialSectionProps {
    isLoadingMemorial: boolean;
    isMemorialExactToday: boolean;
    displayMemorialData: MemorialPetItem[];
    onLightboxOpen: (item: LightboxItem) => void;
    scrollRef: React.RefObject<HTMLDivElement>;
    setSelectedTab: (tab: TabType) => void;
}

export default function MemorialSection({
    isLoadingMemorial,
    isMemorialExactToday,
    displayMemorialData,
    onLightboxOpen,
    scrollRef,
    setSelectedTab,
}: MemorialSectionProps) {
    return (
        <section className="space-y-6 px-4">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 flex-shrink-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                        <Flower2 className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-base sm:text-xl md:text-2xl font-display font-bold bg-gradient-to-r from-amber-500 to-orange-500 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent leading-tight">
                            {isMemorialExactToday ? "오늘의 기일" : "이번 주 기일"}
                        </h2>
                        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 hidden sm:block">
                            {isMemorialExactToday
                                ? "오늘 무지개다리를 건넌 아이들을 기억해요"
                                : "이번 주 무지개다리를 건넌 아이들을 기억해요"}
                        </p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    onClick={() => setSelectedTab("community")}
                    className="text-amber-500 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-gray-700/20 rounded-xl flex-shrink-0 px-2 sm:px-4 min-h-[44px] active:scale-95 transition-transform"
                >
                    <span className="hidden sm:inline">추모 게시판</span>
                    <span className="sm:hidden">더보기</span>
                    <ArrowRight className="w-4 h-4 ml-1 sm:ml-2" />
                </Button>
            </div>

            <div
                ref={scrollRef}
                className="flex gap-4 overflow-x-auto pb-4 px-4 -mx-4 scrollbar-hide carousel-touch"
            >
                {isLoadingMemorial ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <Card
                            key={`skeleton-${i}`}
                            className="w-[200px] max-w-[200px] sm:w-56 sm:max-w-56 flex-shrink-0 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-800/50 dark:to-gray-800/30 border-amber-100 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-sm animate-pulse"
                        >
                            <CardHeader className="p-0">
                                <div className="w-full aspect-square bg-amber-200 dark:bg-gray-700" />
                            </CardHeader>
                            <CardContent className="p-4 text-center">
                                <div className="h-5 bg-amber-200 dark:bg-gray-600 rounded w-16 mx-auto mb-2" />
                                <div className="h-3 bg-amber-100 dark:bg-gray-700 rounded w-20 mx-auto mb-1" />
                                <div className="h-4 bg-amber-100 dark:bg-gray-700 rounded w-12 mx-auto" />
                            </CardContent>
                        </Card>
                    ))
                ) : displayMemorialData.length === 0 ? (
                    <div className="w-full flex flex-col items-center justify-center py-12 text-center">
                        <Cloud className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                            오늘 기일인 아이가 없어요
                        </p>
                        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                            무지개다리 건너편에서 모두 편히 쉬고 있을 거예요
                        </p>
                    </div>
                ) : (
                    displayMemorialData.map((pet) => {
                        const src = safeStringSrc(pet.profileImage);
                        return (
                            <Card
                                key={pet.id}
                                className="w-[200px] max-w-[200px] sm:w-56 sm:max-w-56 flex-shrink-0 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-800/50 dark:to-gray-800/30 border-amber-100 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-sm will-change-transform"
                            >
                                <CardHeader className="p-0 relative overflow-hidden">
                                    {src ? (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onLightboxOpen({
                                                    title: pet.name,
                                                    subtitle: `${pet.type}${pet.breed ? ` / ${pet.breed}` : ""}`,
                                                    meta: pet.yearsLabel,
                                                    src,
                                                })
                                            }
                                            className="w-full overflow-hidden"
                                        >
                                            <img
                                                src={src}
                                                alt={pet.name}
                                                className="block w-full max-w-full aspect-square object-cover"
                                                loading="lazy"
                                                referrerPolicy="no-referrer"
                                            />
                                        </button>
                                    ) : (
                                        <div className="w-full aspect-square bg-gradient-to-br from-amber-200 to-orange-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
                                            {(() => {
                                                const PetIcon = getPetIcon(pet.type);
                                                return <PetIcon className="w-16 h-16 text-amber-500/60" />;
                                            })()}
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                                    {pet.yearsLabel && (
                                        <div className="absolute bottom-3 left-3">
                                            <Badge className="bg-amber-500/90 text-white text-xs font-medium">
                                                {pet.yearsLabel}
                                            </Badge>
                                        </div>
                                    )}
                                </CardHeader>
                                <CardContent className="p-4 text-center">
                                    <h4 className="font-bold text-gray-800 dark:text-white text-base">
                                        {pet.name}
                                    </h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {pet.type}{pet.breed ? ` / ${pet.breed}` : ""}
                                    </p>
                                    <p className="text-xs text-amber-500 dark:text-amber-400 mt-2 font-medium">
                                        영원히 기억할게
                                    </p>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>
        </section>
    );
}
