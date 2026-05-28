/**
 * HeroSection.tsx
 * 3가지 모드:
 *  1. 비로그인: 기존 히어로 (일러스트 + "특별한 매일을 함께" + CTA)
 *  2. 로그인 + 미니미 없음: 쇼케이스 이미지 + "나만의 미니홈피" CTA → 미니홈피 탭
 *  3. 로그인 + 미니미 있음: 개인 미니홈피 프리뷰(배경+배치+인사말) → 미니홈피 탭
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight, Home, ChevronRight } from "lucide-react";
import { TabType, MinihompySettings, PlacedMinimi } from "@/types";
import type { User } from "@supabase/supabase-js";
import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";
import { CHARACTER_CATALOG } from "@/data/minimiPixels";
import { findBackgroundOrDefault } from "@/data/minihompyBackgrounds";

interface HeroSectionProps {
    setSelectedTab: (tab: TabType) => void;
    user: User | null;
    isMemorial?: boolean;
}

interface OwnedChar { slug: string; name: string; imageUrl: string; }

export default function HeroSection({ setSelectedTab, user, isMemorial = false }: HeroSectionProps) {
    const [settings, setSettings] = useState<MinihompySettings | null>(null);
    const [ownedMinimis, setOwnedMinimis] = useState<OwnedChar[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (!user) { setLoaded(true); return; }
        let cancelled = false;
        (async () => {
            try {
                const [settingsRes, invRes] = await Promise.all([
                    authFetch(API.MINIHOMPY_SETTINGS).catch(() => null),
                    authFetch(API.MINIMI_INVENTORY).catch(() => null),
                ]);
                if (cancelled) return;
                if (settingsRes?.ok) {
                    const data = await settingsRes.json();
                    setSettings(data.settings ?? null);
                }
                if (invRes?.ok) {
                    const data = await invRes.json();
                    const chars: OwnedChar[] = (data.characters || [])
                        .map((c: { minimi_id: string }) => {
                            const cat = CHARACTER_CATALOG.find(x => x.slug === c.minimi_id);
                            if (!cat) return null;
                            return { slug: cat.slug, name: cat.name, imageUrl: cat.imageUrl };
                        })
                        .filter(Boolean) as OwnedChar[];
                    setOwnedMinimis(chars);
                }
            } finally {
                if (!cancelled) setLoaded(true);
            }
        })();
        return () => { cancelled = true; };
    }, [user]);

    const goMinihompy = useCallback(() => {
        setSelectedTab("record");
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent("navigateRecordSubTab", { detail: "minihompy" }));
        }, 100);
    }, [setSelectedTab]);

    const hasMinimi = ownedMinimis.length > 0;
    const hasPlacedMinimi = (settings?.placedMinimi?.length ?? 0) > 0;

    // --- 비로그인: 기존 히어로 ---
    if (!user) {
        return <OriginalHero setSelectedTab={setSelectedTab} user={user} isMemorial={isMemorial} />;
    }

    // 로딩 중이면 기존 히어로 잠깐 보여줌 (깜빡임 방지)
    if (!loaded) {
        return <OriginalHero setSelectedTab={setSelectedTab} user={user} isMemorial={isMemorial} />;
    }

    // --- 로그인 + 미니미 있음: 개인 미니홈피 프리뷰 ---
    if (hasMinimi && hasPlacedMinimi) {
        const bg = findBackgroundOrDefault(settings?.backgroundSlug ?? "default_sky");
        return (
            <section className="px-4 pt-4 sm:pt-6" data-tutorial-id="home-hero">
                <button
                    onClick={goMinihompy}
                    className="relative w-full overflow-hidden rounded-3xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer group text-left"
                    style={{ minHeight: 260 }}
                >
                    {/* 배경 */}
                    {bg.imageUrl ? (
                        <Image src={bg.imageUrl} alt={bg.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 800px" />
                    ) : (
                        <div className="absolute inset-0" style={{ background: bg.cssBackground }} />
                    )}
                    {/* 배치된 미니미들 */}
                    {(settings?.placedMinimi ?? []).map((p: PlacedMinimi, i: number) => {
                        const cat = CHARACTER_CATALOG.find(c => c.slug === p.slug);
                        if (!cat) return null;
                        return (
                            <div
                                key={`${p.slug}-${i}`}
                                className="absolute w-10 h-10 sm:w-12 sm:h-12"
                                style={{ left: `${p.x}%`, top: `${p.y}%`, zIndex: p.zIndex ?? i, transform: "translate(-50%, -50%)" }}
                            >
                                <Image src={cat.imageUrl} alt={cat.name} fill className="object-contain" sizes="48px" />
                            </div>
                        );
                    })}
                    {/* 인사말 말풍선 */}
                    {settings?.greeting && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-white/92 backdrop-blur-sm px-4 py-2 rounded-xl shadow-md max-w-[70%]">
                            <p className="text-sm font-semibold text-gray-800 text-center">{settings.greeting}</p>
                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white/92 rotate-45" />
                        </div>
                    )}
                    {/* 하단 바 */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 to-transparent px-5 pb-4 pt-8 rounded-b-3xl flex items-center gap-2 z-10">
                        <Home className="w-4 h-4 text-white/90" />
                        <span className="text-sm font-semibold text-white/90 flex-1">내 미니홈피</span>
                        <ChevronRight className="w-4 h-4 text-white/70 group-hover:translate-x-1 transition-transform" />
                    </div>
                </button>
            </section>
        );
    }

    // --- 로그인 + 미니미 없음: 쇼케이스 히어로 ---
    return (
        <section className="px-4 pt-4 sm:pt-6" data-tutorial-id="home-hero">
            <button
                onClick={goMinihompy}
                className="relative w-full overflow-hidden rounded-3xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer group text-left"
                style={{ minHeight: 260 }}
            >
                <Image
                    src="/icons/minimi/hero-showcase.jpg"
                    alt="미니홈피 쇼케이스"
                    fill
                    className="object-cover"
                    priority
                    sizes="(max-width: 768px) 100vw, 800px"
                />
                {/* 하단 그라데이션 오버레이 */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/65 to-transparent px-5 pb-4 pt-10 rounded-b-3xl z-10">
                    <div className="flex items-center gap-3">
                        <div className="flex-1">
                            <p className="text-[17px] font-extrabold text-white tracking-tight">나만의 미니홈피</p>
                            <p className="text-xs text-white/80 mt-0.5">미니미를 모으고, 내 공간을 꾸며보세요</p>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                            <ArrowRight className="w-4 h-4 text-white" />
                        </div>
                    </div>
                </div>
            </button>
        </section>
    );
}

// ============================================================================
// 기존 히어로 (비로그인 / 로딩 중 폴백)
// ============================================================================

function OriginalHero({ setSelectedTab, user, isMemorial = false }: HeroSectionProps) {
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
                <div className={`absolute -top-10 -right-10 w-40 h-40 ${isMemorial ? "bg-memorial-200/30" : "bg-memento-200/30"} rounded-full blur-2xl`} />
                <div className={`absolute -bottom-10 -left-10 w-32 h-32 ${isMemorial ? "bg-orange-200/20" : "bg-rose-200/20"} rounded-full blur-2xl`} />

                <div className="relative z-10 p-6 sm:p-8 md:p-10 lg:p-12">
                    <div className="md:grid md:grid-cols-2 md:gap-8 lg:gap-12 items-center">
                        {/* 일러스트 */}
                        <div className="flex justify-center mb-6 md:mb-0 md:order-last">
                            <div className="relative w-[240px] h-[240px] sm:w-[300px] sm:h-[300px] md:w-[380px] md:h-[380px] lg:w-[440px] lg:h-[440px] rounded-3xl overflow-hidden shadow-lg">
                                <Image
                                    src={isMemorial ? "/images/hero-illustration-memorial.webp" : "/images/hero-illustration.webp"}
                                    alt={isMemorial ? "별빛 강아지와 함께 밤하늘을 바라보는 아이" : "강아지와 함께 걸어가는 아이"}
                                    fill
                                    className="object-cover"
                                    priority
                                    sizes="(max-width: 768px) 240px, 440px"
                                />
                            </div>
                        </div>

                        {/* 텍스트 + CTA */}
                        <div className="text-center md:text-left space-y-4 sm:space-y-5">
                            <div className="space-y-2">
                                <h1 className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-bold leading-tight ${isMemorial ? "text-memorial-50" : "text-gray-800 dark:text-white"}`}>
                                    특별한 매일을 함께
                                </h1>
                                <p className={`text-sm sm:text-base md:text-lg leading-relaxed ${isMemorial ? "text-memorial-200/80" : "text-gray-600 dark:text-gray-300"}`}>
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
                                            ? "bg-gradient-to-r from-memorial-500 to-orange-400 hover:from-memorial-600 hover:to-orange-500 shadow-[0_4px_20px_-4px_rgba(245,158,11,0.4)] hover:shadow-[0_6px_24px_-4px_rgba(245,158,11,0.5)]"
                                            : "bg-gradient-to-r from-memento-500 to-memento-400 hover:from-memento-600 hover:to-memento-600 shadow-[0_4px_20px_-4px_rgba(5,178,220,0.4)] hover:shadow-[0_6px_24px_-4px_rgba(5,178,220,0.5)]"
                                    }`}
                                >
                                    {user ? "지금 만나러 가기" : "시작하기"}
                                </Button>
                                <Button
                                    size="lg"
                                    variant="ghost"
                                    onClick={() => setSelectedTab("community")}
                                    className={`rounded-2xl px-6 py-3.5 min-h-[48px] active:scale-95 transition-all ${isMemorial ? "text-memorial-200 hover:text-memorial-100 hover:bg-white/10" : "text-gray-600 dark:text-gray-300 hover:text-memento-600 hover:bg-white/50 dark:hover:bg-gray-700/50"}`}
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
