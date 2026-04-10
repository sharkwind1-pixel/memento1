/**
 * MemorialSection.tsx
 * 홈페이지 "마음속에 영원히" 섹션
 * 오늘 추모로 등록된 펫 + 오늘이 기억의 날인 펫을 카드로 표시
 */

"use client";

import React from "react";
import {
    Card,
    CardContent,
    CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Cloud,
    Heart,
    Sparkles,
} from "lucide-react";
import { safeStringSrc, getPetIcon } from "./homeUtils";
import type { LightboxItem } from "./types";
import { OptimizedImage } from "@/components/ui/optimized-image";

interface MemorialPetItem {
    id: string;
    name: string;
    type: string;
    breed: string;
    profileImage: string | null;
    isNewlyRegistered: boolean;
    yearsAgo: number | null;
    yearsLabel: string;
    condolenceCount: number;
}

interface MemorialSectionProps {
    isLoadingMemorial: boolean;
    displayMemorialData: MemorialPetItem[];
    onLightboxOpen: (item: LightboxItem) => void;
    scrollRef: React.RefObject<HTMLDivElement>;
    condoledPets?: Record<string, boolean>;
    onToggleCondolence?: (petId: string) => void;
    onCardClick?: (pet: MemorialPetItem) => void;
}

/** 발자국 데코 (CSS-only) */
const PAW_DECORATIONS = [
    { left: "5%", bottom: "10%", size: 14, duration: 16, delay: 2 },
    { left: "30%", bottom: "20%", size: 12, duration: 20, delay: 8 },
    { left: "65%", bottom: "5%", size: 16, duration: 18, delay: 5 },
    { left: "85%", bottom: "15%", size: 10, duration: 22, delay: 12 },
] as const;

/** 별 float-up 파티클 (CSS-only, 고정 위치/크기/속도) */
const MEMORIAL_STARS = [
    { left: "8%", bottom: "-4px", size: 3, duration: 12, delay: 0 },
    { left: "22%", bottom: "-4px", size: 2, duration: 18, delay: 3 },
    { left: "40%", bottom: "-4px", size: 4, duration: 14, delay: 7 },
    { left: "58%", bottom: "-4px", size: 2, duration: 20, delay: 1 },
    { left: "75%", bottom: "-4px", size: 3, duration: 16, delay: 5 },
    { left: "90%", bottom: "-4px", size: 2, duration: 22, delay: 10 },
] as const;

export default function MemorialSection({
    isLoadingMemorial,
    displayMemorialData,
    onLightboxOpen,
    scrollRef,
    condoledPets = {},
    onToggleCondolence,
    onCardClick,
}: MemorialSectionProps) {
    return (
        <section className="relative overflow-hidden space-y-6 px-4 py-8 -mx-4 bg-gradient-to-b from-memorial-50/30 via-memorial-50/10 to-transparent dark:from-memorial-900/10 dark:via-transparent dark:to-transparent rounded-3xl flex-1">
            {/* 떠오르는 별 파티클 */}
            {MEMORIAL_STARS.map((star, i) => (
                <span
                    key={`star-${i}`}
                    className="memorial-star"
                    style={{
                        left: star.left,
                        bottom: star.bottom,
                        width: star.size,
                        height: star.size,
                        animationDuration: `${star.duration}s`,
                        animationDelay: `${star.delay}s`,
                    }}
                />
            ))}
            {/* 발자국 데코 */}
            {PAW_DECORATIONS.map((paw, i) => (
                <span
                    key={`paw-${i}`}
                    className="paw-decoration"
                    style={{
                        left: paw.left,
                        bottom: paw.bottom,
                        ["--paw-size" as string]: `${paw.size}px`,
                        animationDuration: `${paw.duration}s`,
                        animationDelay: `${paw.delay}s`,
                    }}
                />
            ))}
            <div className="flex items-center space-x-3 min-w-0">
                <div className="w-10 h-10 flex-shrink-0 bg-gradient-to-br from-memorial-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-sm shadow-memorial-500/20">
                    <Cloud className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                    <h2 className="text-base sm:text-xl md:text-2xl font-display font-bold bg-gradient-to-r from-memorial-500 to-orange-500 dark:from-memorial-400 dark:to-orange-400 bg-clip-text text-transparent leading-tight">
                        마음속에 영원히
                    </h2>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 hidden sm:block">
                        영원히 마음속에 함께해요
                    </p>
                </div>
            </div>

            <div
                ref={scrollRef}
                className="flex gap-4 overflow-x-auto pb-4 px-4 -mx-4 scrollbar-hide carousel-touch"
            >
                {isLoadingMemorial ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <Card
                            key={`skeleton-${i}`}
                            className="w-[200px] max-w-[200px] sm:w-56 sm:max-w-56 flex-shrink-0 bg-gradient-to-br from-memorial-50 to-orange-50 dark:from-gray-800/50 dark:to-gray-800/30 border-memorial-100 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-sm animate-pulse"
                        >
                            <CardHeader className="p-0">
                                <div className="w-full aspect-square bg-memorial-200 dark:bg-gray-700" />
                            </CardHeader>
                            <CardContent className="p-4 text-center">
                                <div className="h-5 bg-memorial-200 dark:bg-gray-600 rounded w-16 mx-auto mb-2" />
                                <div className="h-3 bg-memorial-100 dark:bg-gray-700 rounded w-20 mx-auto mb-1" />
                                <div className="h-4 bg-memorial-100 dark:bg-gray-700 rounded w-12 mx-auto" />
                            </CardContent>
                        </Card>
                    ))
                ) : displayMemorialData.length === 0 ? (
                    <div className="w-full flex flex-col items-center justify-center py-10 text-center bg-gradient-to-b from-memorial-50/50 to-transparent dark:from-memorial-900/10 rounded-2xl">
                        <div className="w-16 h-16 rounded-full bg-memorial-100 dark:bg-memorial-900/30 flex items-center justify-center mb-4">
                            <Cloud className="w-8 h-8 text-memorial-400 dark:text-memorial-500" />
                        </div>
                        <p className="text-memorial-700 dark:text-memorial-300 text-sm font-medium">
                            무지개다리 건너편에서
                        </p>
                        <p className="text-memorial-700 dark:text-memorial-300 text-sm font-medium">
                            모두 편히 쉬고 있을 거예요
                        </p>
                        <p className="text-memorial-500/70 dark:text-memorial-400/50 text-xs mt-3">
                            추모 모드로 등록하면 이곳에서 함께 기억해요
                        </p>
                    </div>
                ) : (
                    displayMemorialData.map((pet, idx) => {
                        const src = safeStringSrc(pet.profileImage);
                        return (
                            <Card
                                key={`${pet.id}-${idx}`}
                                className="w-[220px] max-w-[220px] sm:w-64 sm:max-w-64 flex-shrink-0 bg-gradient-to-br from-memorial-50 to-orange-50/80 dark:from-gray-800/50 dark:to-gray-800/30 border-memorial-100/50 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 will-change-transform cursor-pointer"
                                onClick={() => onCardClick?.(pet)}
                            >
                                <CardHeader className="p-0 relative overflow-hidden">
                                    {src ? (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onLightboxOpen({
                                                    title: pet.name,
                                                    subtitle: `${pet.type}${pet.breed ? ` / ${pet.breed}` : ""}`,
                                                    meta: pet.yearsLabel,
                                                    src,
                                                });
                                            }}
                                            className="w-full overflow-hidden"
                                        >
                                            <OptimizedImage
                                                src={src}
                                                alt={pet.name}
                                                fill
                                                className="w-full aspect-square"
                                            />
                                        </button>
                                    ) : (
                                        <div className="w-full aspect-square bg-gradient-to-br from-memorial-200 to-orange-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
                                            {(() => {
                                                const PetIcon = getPetIcon(pet.type);
                                                return <PetIcon className="w-16 h-16 text-memorial-500/60" />;
                                            })()}
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                                    {pet.isNewlyRegistered ? (
                                        <div className="absolute top-3 right-3">
                                            <Badge className="bg-memorial-500/90 text-white text-xs font-medium gap-1">
                                                <Sparkles className="w-3 h-3" />
                                                새로운 기억
                                            </Badge>
                                        </div>
                                    ) : pet.yearsLabel ? (
                                        <div className="absolute bottom-3 left-3">
                                            <Badge className="bg-memorial-500/90 text-white text-xs font-medium">
                                                {pet.yearsLabel}
                                            </Badge>
                                        </div>
                                    ) : null}
                                </CardHeader>
                                <CardContent className="p-5 text-center space-y-1.5">
                                    <h4 className="font-bold text-gray-800 dark:text-white text-base">
                                        {pet.name}
                                    </h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {pet.type}{pet.breed ? ` / ${pet.breed}` : ""}
                                    </p>
                                    <div className="w-8 h-px bg-memorial-300/60 mx-auto" />
                                    {onToggleCondolence ? (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onToggleCondolence(pet.id);
                                            }}
                                            className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors mx-auto pt-1"
                                        >
                                            <Heart
                                                className={`w-4 h-4 transition-all duration-300 ${
                                                    condoledPets[pet.id]
                                                        ? "fill-memorial-500 text-memorial-500 scale-110"
                                                        : "text-memorial-400 hover:text-memorial-500"
                                                }`}
                                            />
                                            <span className={condoledPets[pet.id] ? "text-memorial-500" : "text-memorial-400"}>
                                                {pet.condolenceCount > 0 ? `위로 ${pet.condolenceCount}` : "위로하기"}
                                            </span>
                                        </button>
                                    ) : (
                                        <p className="text-xs text-memorial-500 dark:text-memorial-400 font-medium">
                                            영원히 기억할게
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>
        </section>
    );
}
