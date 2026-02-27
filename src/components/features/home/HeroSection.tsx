/**
 * HeroSection.tsx
 * 홈페이지 HERO 배너 섹션
 */

"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { EmotionalTrueFocus } from "@/components/ui/TrueFocus";
import { HERO_CONTENT } from "./homeUtils";
import { TabType } from "@/types";

interface HeroSectionProps {
    setSelectedTab: (tab: TabType) => void;
}

export default function HeroSection({ setSelectedTab }: HeroSectionProps) {
    return (
        <section className="px-4 pt-8" data-tutorial-id="home-hero">
            <div className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-lg border border-white/40 dark:border-gray-700/40 rounded-3xl p-8 md:p-12 shadow-2xl">
                <div className="text-center space-y-4 md:space-y-6">
                    <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold leading-tight">
                        <EmotionalTrueFocus
                            text={HERO_CONTENT.title}
                            variant="gentle"
                            delay={250}
                        />
                    </h1>
                    <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-700 dark:text-gray-200 leading-relaxed px-2">
                        <EmotionalTrueFocus
                            text={HERO_CONTENT.subtitle}
                            variant="warm"
                            delay={1100}
                            duration={0.6}
                            staggerDelay={0.02}
                        />
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center pt-3 px-4 sm:px-0">
                        <Button
                            size="lg"
                            onClick={() => setSelectedTab(HERO_CONTENT.ctaTab)}
                            className="w-full sm:w-auto bg-gradient-to-r from-memento-500 to-memento-400 hover:from-memento-600 hover:to-sky-600 text-white border-0 rounded-xl px-8 py-3 min-h-[48px] shadow-lg hover:scale-105 active:scale-95 transition-all"
                        >
                            {HERO_CONTENT.ctaLabel}
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            onClick={() => setSelectedTab("community")}
                            className="w-full sm:w-auto bg-white/50 dark:bg-gray-700/50 border-memento-300 dark:border-memento-600 text-memento-700 dark:text-blue-300 hover:bg-memento-100 dark:hover:bg-gray-600 rounded-xl px-8 py-3 min-h-[48px] active:scale-95 transition-all"
                        >
                            서비스 둘러보기
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
}
