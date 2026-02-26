/**
 * AdoptionSection.tsx
 * 홈페이지 입양정보 카드 캐러셀 섹션
 */

"use client";

/* eslint-disable @next/next/no-img-element */

import React from "react";
import {
    Card,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, MapPin, ArrowRight } from "lucide-react";
import { bestPosts } from "@/data/posts";
import { safeStringSrc } from "./homeUtils";
import type { LightboxItem } from "./types";
import { TabType } from "@/types";

interface AdoptionSectionProps {
    adoptionImages: unknown;
    onLightboxOpen: (item: LightboxItem) => void;
    scrollRef: React.RefObject<HTMLDivElement>;
    setSelectedTab: (tab: TabType) => void;
}

export default function AdoptionSection({
    adoptionImages,
    onLightboxOpen,
    scrollRef,
    setSelectedTab,
}: AdoptionSectionProps) {
    return (
        <section className="space-y-6 px-4">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 flex-shrink-0 bg-gradient-to-r from-[#38BDF8] to-[#05B2DC] rounded-xl flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100 leading-tight">
                            새 가족을 기다려요
                        </h2>
                        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 hidden sm:block">
                            따뜻한 손길을 기다리는 친구들
                        </p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    onClick={() => setSelectedTab("adoption")}
                    className="text-[#0891B2] dark:text-[#38BDF8] hover:bg-[#E0F7FF] dark:hover:bg-gray-700 rounded-xl flex-shrink-0 px-2 sm:px-4 min-h-[44px] active:scale-95 transition-transform"
                >
                    <span className="hidden sm:inline">전체 보기</span>
                    <span className="sm:hidden">더보기</span>
                    <ArrowRight className="w-4 h-4 ml-1 sm:ml-2" />
                </Button>
            </div>

            <div
                ref={scrollRef}
                className="flex gap-4 overflow-x-auto pb-4 px-4 -mx-4 scrollbar-hide carousel-touch"
            >
                {bestPosts.adoption.map((pet, i) => {
                    const src = safeStringSrc(
                        (adoptionImages as unknown[] | undefined)?.[i],
                    );
                    return (
                        <Card
                            key={i}
                            className="w-[260px] max-w-[260px] sm:w-72 sm:max-w-72 flex-shrink-0 bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm will-change-transform"
                        >
                            <CardHeader className="p-0 overflow-hidden">
                                {src ? (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            onLightboxOpen({
                                                title: pet.title,
                                                subtitle: `${pet.location} · ${pet.age}`,
                                                meta: pet.badge,
                                                src,
                                            })
                                        }
                                        className="w-full overflow-hidden"
                                    >
                                        <img
                                            src={src}
                                            alt={pet.title}
                                            className="block w-full max-w-full aspect-[4/3] object-cover"
                                            loading="lazy"
                                            referrerPolicy="no-referrer"
                                        />
                                    </button>
                                ) : (
                                    <div className="w-full aspect-[4/3] bg-gradient-to-br from-[#E0F7FF] to-[#BAE6FD] dark:from-sky-900 dark:to-blue-900 flex items-center justify-center">
                                        <Users className="w-16 h-16 text-sky-400 opacity-50" />
                                    </div>
                                )}
                            </CardHeader>
                            <CardFooter className="flex-col items-start gap-2 p-4">
                                <div className="flex justify-between items-start w-full">
                                    <Badge
                                        variant="outline"
                                        className="bg-[#E0F7FF] dark:bg-sky-900/50 border-sky-200 dark:border-[#0369A1] text-[#0369A1] dark:text-sky-300 rounded-lg"
                                    >
                                        {pet.badge}
                                    </Badge>
                                    <span className="text-xs text-gray-500 flex items-center gap-1 min-w-0">
                                        <MapPin className="w-3 h-3 flex-shrink-0" />
                                        <span className="truncate">{pet.location}</span>
                                    </span>
                                </div>
                                <CardTitle className="text-base text-gray-800 dark:text-gray-100">
                                    {pet.title}
                                </CardTitle>
                                <CardDescription className="text-gray-600 dark:text-gray-300">
                                    {pet.age}
                                </CardDescription>
                                <Button
                                    variant="outline"
                                    className="w-full mt-2 border-sky-200 dark:border-sky-600 text-[#0369A1] dark:text-sky-300 hover:bg-[#E0F7FF] dark:hover:bg-sky-900/50 rounded-xl min-h-[44px] active:scale-95 transition-transform"
                                >
                                    만나러 가기
                                </Button>
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>
        </section>
    );
}
