/**
 * HeroSection.tsx
 * B안 기반 리디자인: 따뜻한 그라데이션 배경 + 일러스트 + 감성 카피 + CTA
 */

"use client";

import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { TabType } from "@/types";
import type { User } from "@supabase/supabase-js";

interface HeroSectionProps {
    setSelectedTab: (tab: TabType) => void;
    user: User | null;
    isMemorial?: boolean;
}

export default function HeroSection({ setSelectedTab, user, isMemorial = false }: HeroSectionProps) {
    const handleCtaClick = () => {
        if (!user) {
            window.dispatchEvent(new CustomEvent("openAuthModal"));
        } else {
            setSelectedTab("ai-chat");
        }
    };

    return (
        <section className="px-4 pt-4 sm:pt-6" data-tutorial-id="home-hero">
            <div className={`relative overflow-hidden rounded-3xl ${
                isMemorial
                    ? "bg-gradient-to-b from-[#091A2E] via-[#1A2A3E] to-[#3D2A1A] dark:from-gray-800 dark:via-gray-800 dark:to-gray-700"
                    : "bg-gradient-to-br from-[#CBEBF0] via-[#E0F3F6] to-[#FFF8F6] dark:from-gray-800 dark:via-gray-800 dark:to-gray-700"
            }`}>
                {/* 배경 장식 */}
                <div className={`absolute -top-10 -right-10 w-40 h-40 ${isMemorial ? "bg-amber-200/30" : "bg-memento-200/30"} rounded-full blur-2xl`} />
                <div className={`absolute -bottom-10 -left-10 w-32 h-32 ${isMemorial ? "bg-orange-200/20" : "bg-rose-200/20"} rounded-full blur-2xl`} />

                <div className="relative z-10 p-6 sm:p-8 md:p-10 lg:p-12">
                    <div className="md:grid md:grid-cols-2 md:gap-8 lg:gap-12 items-center">
                        {/* 일러스트 */}
                        <div className="flex justify-center mb-6 md:mb-0 md:order-last">
                            <div
                                className="relative w-[240px] h-[240px] sm:w-[300px] sm:h-[300px] md:w-[380px] md:h-[380px] lg:w-[440px] lg:h-[440px]"
                                style={{ mask: "radial-gradient(ellipse 80% 80% at center, black 60%, transparent 100%)", WebkitMask: "radial-gradient(ellipse 80% 80% at center, black 60%, transparent 100%)" }}
                            >
                                {isMemorial ? (
                                    <Image
                                        src="/images/hero-illustration-memorial.png"
                                        alt="별빛 강아지와 함께 밤하늘을 바라보는 아이"
                                        fill
                                        className="object-contain drop-shadow-lg"
                                        priority
                                        sizes="(max-width: 768px) 240px, 440px"
                                    />
                                ) : (
                                    <>
                                        {/* 라이트: 수채화 / 다크: 밤하늘 */}
                                        <Image
                                            src="/images/hero-illustration.png"
                                            alt="강아지와 함께 걸어가는 아이"
                                            fill
                                            className="object-contain drop-shadow-lg dark:hidden"
                                            priority
                                            sizes="(max-width: 768px) 240px, 440px"
                                        />
                                        <Image
                                            src="/images/hero-illustration-memorial.png"
                                            alt="별빛 강아지와 함께 밤하늘을 바라보는 아이"
                                            fill
                                            className="object-contain drop-shadow-lg hidden dark:block"
                                            sizes="(max-width: 768px) 240px, 440px"
                                        />
                                    </>
                                )}
                            </div>
                        </div>

                        {/* 텍스트 + CTA */}
                        <div className="text-center md:text-left space-y-4 sm:space-y-5">
                            <div className="space-y-2">
                                <h1 className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-bold leading-tight ${isMemorial ? "text-amber-50" : "text-gray-800 dark:text-white"}`}>
                                    특별한 매일을 함께
                                </h1>
                                <p className={`text-sm sm:text-base md:text-lg leading-relaxed ${isMemorial ? "text-amber-200/80" : "text-gray-600 dark:text-gray-300"}`}>
                                    반려동물과의 소중한 순간을 기록하고,
                                    <br className="hidden sm:block" />
                                    따뜻한 추억으로 간직하세요
                                </p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start pt-1">
                                <Button
                                    size="lg"
                                    onClick={handleCtaClick}
                                    className={`text-white border-0 rounded-2xl px-8 py-3.5 min-h-[48px] hover:scale-105 active:scale-95 transition-all font-semibold ${
                                        isMemorial
                                            ? "bg-gradient-to-r from-amber-500 to-orange-400 hover:from-amber-600 hover:to-orange-500 shadow-[0_4px_20px_-4px_rgba(245,158,11,0.4)] hover:shadow-[0_6px_24px_-4px_rgba(245,158,11,0.5)]"
                                            : "bg-gradient-to-r from-memento-500 to-memento-400 hover:from-memento-600 hover:to-sky-600 shadow-[0_4px_20px_-4px_rgba(5,178,220,0.4)] hover:shadow-[0_6px_24px_-4px_rgba(5,178,220,0.5)]"
                                    }`}
                                >
                                    {user ? "지금 만나러 가기" : "시작하기"}
                                </Button>
                                <Button
                                    size="lg"
                                    variant="ghost"
                                    onClick={() => setSelectedTab("community")}
                                    className={`rounded-2xl px-6 py-3.5 min-h-[48px] active:scale-95 transition-all ${isMemorial ? "text-amber-200 hover:text-amber-100 hover:bg-white/10" : "text-gray-600 dark:text-gray-300 hover:text-memento-600 hover:bg-white/50 dark:hover:bg-gray-700/50"}`}
                                >
                                    둘러보기
                                    <ArrowRight className="w-4 h-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
