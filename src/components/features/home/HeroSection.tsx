/**
 * HeroSection.tsx
 * 홈페이지 HERO 배너 섹션
 * 비로그인: "시작하기" CTA -> 로그인 모달
 * 로그인: "지금 만나러 가기" CTA -> AI 펫톡
 * 데스크톱: 텍스트 좌 + 일러스트 우 2컬럼
 * 모바일: 일러스트 위 + 텍스트 아래
 */

"use client";

import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { EmotionalTrueFocus } from "@/components/ui/TrueFocus";
import { HERO_CONTENT } from "./homeUtils";
import { TabType } from "@/types";
import type { User } from "@supabase/supabase-js";

interface HeroSectionProps {
    setSelectedTab: (tab: TabType) => void;
    user: User | null;
}

export default function HeroSection({ setSelectedTab, user }: HeroSectionProps) {
    const handleCtaClick = () => {
        if (!user) {
            window.dispatchEvent(new CustomEvent("openAuthModal"));
        } else {
            setSelectedTab(HERO_CONTENT.ctaTab);
        }
    };

    return (
        <section className="px-4 pt-6 sm:pt-8" data-tutorial-id="home-hero">
            <div className="bg-white/60 dark:bg-gray-800/50 backdrop-blur-xl border border-white/60 dark:border-gray-700/50 rounded-3xl p-6 sm:p-8 md:p-12 shadow-[0_8px_40px_-12px_rgba(5,178,220,0.15)]">
                <div className="md:grid md:grid-cols-5 md:gap-8 items-center">
                    {/* 일러스트 (모바일: 상단, 데스크톱: 우측) */}
                    <div className="flex justify-center mb-6 md:mb-0 md:order-last md:col-span-2">
                        <div className="relative w-[180px] h-[180px] sm:w-[220px] sm:h-[220px] md:w-full md:h-auto md:aspect-square md:max-w-[320px]">
                            <Image
                                src="/images/hero-illustration.png"
                                alt="강아지와 고양이가 초원에서 함께하는 일러스트"
                                fill
                                className="object-contain drop-shadow-[0_4px_16px_rgba(5,178,220,0.12)]"
                                priority
                                sizes="(max-width: 768px) 220px, 320px"
                            />
                        </div>
                    </div>
                    {/* 텍스트 + CTA */}
                    <div className="md:col-span-3 text-center md:text-left space-y-4 md:space-y-6">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-bold leading-tight">
                            <EmotionalTrueFocus
                                text={HERO_CONTENT.title}
                                variant="gentle"
                                delay={250}
                            />
                        </h1>
                        <p className="text-base sm:text-lg md:text-xl font-bold text-gray-700 dark:text-gray-200 leading-relaxed">
                            <EmotionalTrueFocus
                                text={HERO_CONTENT.subtitle}
                                variant="warm"
                                delay={1100}
                                duration={0.6}
                                staggerDelay={0.02}
                            />
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center md:justify-start items-center pt-2">
                            <Button
                                size="lg"
                                onClick={handleCtaClick}
                                className="w-full sm:w-auto bg-gradient-to-r from-memento-500 to-memento-400 hover:from-memento-600 hover:to-sky-600 text-white border-0 rounded-2xl px-8 sm:px-10 py-3.5 min-h-[48px] shadow-[0_4px_20px_-4px_rgba(5,178,220,0.4)] hover:shadow-[0_6px_24px_-4px_rgba(5,178,220,0.5)] hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
                            >
                                {user ? HERO_CONTENT.ctaLabel : "시작하기"}
                            </Button>
                            <Button
                                size="lg"
                                variant="outline"
                                onClick={() => setSelectedTab("community")}
                                className="w-full sm:w-auto bg-white/50 dark:bg-gray-700/50 border-memento-300 dark:border-memento-600 text-memento-700 dark:text-blue-300 hover:bg-memento-100 dark:hover:bg-gray-600 rounded-2xl px-8 sm:px-10 py-3.5 min-h-[48px] active:scale-95 transition-all whitespace-nowrap"
                            >
                                둘러보기
                                <ArrowRight className="w-5 h-5 ml-1" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
