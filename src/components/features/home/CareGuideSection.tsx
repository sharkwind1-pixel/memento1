/**
 * CareGuideSection.tsx
 * 홈페이지 케어 가이드 카드 캐러셀 섹션
 */

"use client";

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
import { Stethoscope, ArrowRight } from "lucide-react";
import { bestPosts } from "@/data/posts";
import { TabType } from "@/types";

interface CareGuideSectionProps {
    scrollRef: React.RefObject<HTMLDivElement>;
    setSelectedTab: (tab: TabType) => void;
}

export default function CareGuideSection({
    scrollRef,
    setSelectedTab,
}: CareGuideSectionProps) {
    return (
        <section className="space-y-6 px-4">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 flex-shrink-0 bg-gradient-to-r from-memento-500 to-memento-400 rounded-xl flex items-center justify-center">
                        <Stethoscope className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-lg sm:text-xl md:text-2xl font-display font-bold text-gray-800 dark:text-gray-100 leading-tight">
                            케어 가이드
                        </h2>
                        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 hidden sm:block">
                            건강하고 행복한 일상을 위한 맞춤 정보
                        </p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    onClick={() => setSelectedTab("magazine")}
                    className="text-memento-600 dark:text-memento-400 hover:bg-memento-100 dark:hover:bg-gray-700 rounded-xl flex-shrink-0 px-2 sm:px-4 min-h-[44px] active:scale-95 transition-transform"
                >
                    <span className="hidden sm:inline">전체 가이드</span>
                    <span className="sm:hidden">더보기</span>
                    <ArrowRight className="w-4 h-4 ml-1 sm:ml-2" />
                </Button>
            </div>

            <div
                ref={scrollRef}
                className="flex gap-4 overflow-x-auto pb-4 px-4 -mx-4 scrollbar-hide carousel-touch"
            >
                {bestPosts.petcare.map((guide, i) => (
                    <Card
                        key={i}
                        className="w-[260px] max-w-[260px] sm:w-64 sm:max-w-64 flex-shrink-0 overflow-hidden bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm will-change-transform"
                    >
                        <CardHeader>
                            <div className="w-full h-40 bg-gradient-to-br from-memento-100 to-memento-100 dark:from-blue-900 dark:to-sky-900 rounded-xl mb-3 flex items-center justify-center border border-memento-200 dark:border-memento-700">
                                <Stethoscope className="w-16 h-16 text-memento-600 dark:text-memento-400 opacity-70" />
                            </div>
                            <div className="flex justify-between items-start">
                                <Badge
                                    variant="outline"
                                    className="bg-memento-100 dark:bg-blue-900/50 border-memento-300 dark:border-memento-700 text-memento-700 dark:text-blue-300 rounded-lg"
                                >
                                    {guide.badge}
                                </Badge>
                                <Badge
                                    variant="secondary"
                                    className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg"
                                >
                                    {guide.difficulty}
                                </Badge>
                            </div>
                            <CardTitle className="text-sm leading-snug text-gray-800 dark:text-gray-100">
                                {guide.title}
                            </CardTitle>
                            <CardDescription className="text-gray-600 dark:text-gray-300">
                                {guide.category}
                            </CardDescription>
                        </CardHeader>
                        <CardFooter>
                            <Button
                                variant="outline"
                                className="w-full border-memento-300 dark:border-memento-600 text-memento-700 dark:text-blue-300 hover:bg-memento-100 dark:hover:bg-blue-900/50 rounded-xl min-h-[44px] active:scale-95 transition-transform"
                            >
                                가이드 보기
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </section>
    );
}
