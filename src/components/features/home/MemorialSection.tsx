/**
 * MemorialSection.tsx
 * 홈페이지 추모 섹션 (스켈레톤 + 실제 카드)
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
    Heart,
    MessageCircle,
    Cloud,
    ArrowRight,
} from "lucide-react";
import { safeStringSrc, getPetIcon } from "./homeUtils";
import type { LightboxItem } from "./types";
import { TabType } from "@/types";

interface MemorialDataItem {
    id: string;
    name: string;
    pet: string;
    years: string;
    message: string;
    content: string;
    image?: string;
    likesCount: number;
    commentsCount: number;
    isFromDB: boolean;
}

interface MemorialSectionProps {
    isLoadingMemorial: boolean;
    displayMemorialData: MemorialDataItem[];
    onLightboxOpen: (item: LightboxItem) => void;
    scrollRef: React.RefObject<HTMLDivElement>;
    setSelectedTab: (tab: TabType) => void;
}

export default function MemorialSection({
    isLoadingMemorial,
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
                        <Cloud className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-lg sm:text-xl md:text-2xl font-display font-bold bg-gradient-to-r from-amber-500 to-orange-500 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent leading-tight">
                            마음속에 영원히
                        </h2>
                        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 hidden sm:block">
                            영원히 마음속에 함께해요
                        </p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    onClick={() => setSelectedTab("community")}
                    className="text-amber-500 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-gray-700/20 rounded-xl flex-shrink-0 px-2 sm:px-4 min-h-[44px] active:scale-95 transition-transform"
                >
                    <span className="hidden sm:inline">더 많은 이야기</span>
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
                            className="w-[260px] max-w-[260px] sm:w-72 sm:max-w-72 flex-shrink-0 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-800/50 dark:to-gray-800/30 border-amber-100 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-sm animate-pulse"
                        >
                            <CardHeader className="p-0 relative">
                                <div className="w-full aspect-[4/3] bg-amber-200 dark:bg-gray-700" />
                                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                                    <div className="h-5 w-12 bg-amber-300/60 dark:bg-gray-600/60 rounded-full" />
                                </div>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <div className="h-5 bg-amber-200 dark:bg-gray-600 rounded w-20 mb-1" />
                                        <div className="h-3 bg-amber-100 dark:bg-gray-700 rounded w-24" />
                                    </div>
                                </div>
                                <div className="h-4 bg-amber-100 dark:bg-gray-700 rounded w-full mb-1" />
                                <div className="h-4 bg-amber-100 dark:bg-gray-700 rounded w-3/4 mb-3" />
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-4 w-10 bg-amber-100 dark:bg-gray-700 rounded" />
                                        <div className="h-4 w-10 bg-amber-100 dark:bg-gray-700 rounded" />
                                    </div>
                                    <div className="h-3 w-16 bg-amber-100 dark:bg-gray-700 rounded" />
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    displayMemorialData.map((m) => {
                        const src = safeStringSrc(m.image);
                        return (
                            <Card
                                key={m.id}
                                className="w-[260px] max-w-[260px] sm:w-72 sm:max-w-72 flex-shrink-0 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-800/50 dark:to-gray-800/30 border-amber-100 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-sm will-change-transform"
                            >
                                <CardHeader className="p-0 relative overflow-hidden">
                                    {src ? (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onLightboxOpen({
                                                    title: m.name,
                                                    subtitle: `${m.pet} · ${m.years}`,
                                                    meta: m.message,
                                                    src,
                                                })
                                            }
                                            className="w-full overflow-hidden"
                                        >
                                            <img
                                                src={src}
                                                alt={m.name}
                                                className="block w-full max-w-full aspect-[4/3] object-cover"
                                                loading="lazy"
                                                referrerPolicy="no-referrer"
                                            />
                                        </button>
                                    ) : (
                                        <div className="w-full aspect-[4/3] bg-gradient-to-br from-amber-200 to-orange-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
                                            {(() => {
                                                const PetIcon = getPetIcon(m.pet);
                                                return <PetIcon className="w-16 h-16 text-amber-500/60" />;
                                            })()}
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                                    <div className="absolute bottom-3 left-3 flex items-center gap-2">
                                        <Badge className="bg-white/90 text-amber-700 font-medium">
                                            {m.pet}
                                        </Badge>
                                        {m.isFromDB && (
                                            <Badge className="bg-amber-500/90 text-white text-xs">
                                                공개
                                            </Badge>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <h4 className="font-bold text-gray-800 dark:text-white">
                                                {m.name}
                                            </h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {m.years}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">
                                        &ldquo;{m.message}&rdquo;
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 text-sm text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <Heart className="w-4 h-4 text-pink-400" />
                                                {m.likesCount}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <MessageCircle className="w-4 h-4" />
                                                {m.commentsCount}
                                            </span>
                                        </div>
                                        <span className="text-xs text-amber-500">함께 기억해요</span>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>
        </section>
    );
}
