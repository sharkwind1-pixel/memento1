/**
 * HeroSection.tsx
 * 3가지 모드:
 *  1. 비로그인: 기존 히어로 (일러스트 + "특별한 매일을 함께" + CTA)
 *  2. 로그인 + 꼬미 없음: 쇼케이스 이미지 + "나만의 펫홈" CTA → 펫홈 탭
 *  3. 로그인 + 꼬미 있음: 개인 펫홈 프리뷰(배경+배치+인사말) → 펫홈 탭
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight, Home, ChevronRight, X, PawPrint, Star, Palette, Users, Info, MessageCircle, Film } from "lucide-react";
import { TabType, MinihompySettings, PlacedMinimi } from "@/types";
import type { User } from "@supabase/supabase-js";
import { authFetch } from "@/lib/auth-fetch";
import { API } from "@/config/apiEndpoints";
import { CHARACTER_CATALOG } from "@/data/minimiPixels";
import { findBackgroundOrDefault } from "@/data/minihompyBackgrounds";
import { setPendingRecordSub } from "@/lib/record-nav";

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
        // pending 플래그(record 탭 lazy 마운트 레이스 무관) + 이벤트(이미 활성 시 즉시 전환) 병행
        setPendingRecordSub("minihompy");
        setSelectedTab("record");
        window.dispatchEvent(new CustomEvent("navigateRecordSubTab", { detail: "minihompy" }));
    }, [setSelectedTab]);

    // 허브 카드 핵심 액션 — AI 펫톡 / AI 영상 (펫홈은 톤, 핵심 가치는 이 둘)
    const goAIChat = useCallback(() => setSelectedTab("ai-chat"), [setSelectedTab]);
    const goAIVideo = useCallback(() => {
        setPendingRecordSub("pets");
        setSelectedTab("record");
        window.dispatchEvent(new CustomEvent("navigateRecordSubTab", { detail: "pets" }));
        // 섹션 마운트(데이터 로딩 스켈레톤 포함) 후 스크롤
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent("scrollToVideoSection"));
        }, 450);
    }, [setSelectedTab]);

    const [guideOpen, setGuideOpen] = useState(false);

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

    // --- 추모 모드: 펫홈/꼬미를 히어로에 노출하지 않음 (추모 정서 보호) ---
    // 꼬미·펫홈은 일상(꾸미기) 요소라 추모 모드에선 추모 전용 히어로만 보여준다.
    if (isMemorial) {
        return <OriginalHero setSelectedTab={setSelectedTab} user={user} isMemorial />;
    }

    // --- 로그인 + 꼬미 있음: 개인 펫홈 프리뷰 + 핵심 액션 허브 ---
    if (hasMinimi && hasPlacedMinimi) {
        const bg = findBackgroundOrDefault(settings?.backgroundSlug ?? "default_sky");
        return (
            <section className="px-4 pt-4 sm:pt-6" data-tutorial-id="home-hero">
                <div className="max-w-md mx-auto space-y-3">
                <button
                    onClick={goMinihompy}
                    className="relative block w-full aspect-[4/3] overflow-hidden rounded-3xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer group text-left"
                >
                    {/* 배경 */}
                    {bg.imageUrl ? (
                        <Image src={bg.imageUrl} alt={bg.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 800px" />
                    ) : (
                        <div className="absolute inset-0" style={{ background: bg.cssBackground }} />
                    )}
                    {/* 배치된 꼬미들 */}
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
                        <span className="text-sm font-semibold text-white/90 flex-1">내 펫홈</span>
                        <ChevronRight className="w-4 h-4 text-white/70 group-hover:translate-x-1 transition-transform" />
                    </div>
                </button>

                {/* 핵심 액션 허브 — 펫홈은 톤, 핵심 가치는 AI펫톡 + AI영상 */}
                <HubActions onChat={goAIChat} onVideo={goAIVideo} onDecorate={goMinihompy} />
                </div>
            </section>
        );
    }

    // --- 로그인 + 꼬미 없음: 쇼케이스 히어로 + 핵심 액션 허브 ---
    return (
        <section className="px-4 pt-4 sm:pt-6 space-y-3" data-tutorial-id="home-hero">
            <button
                onClick={() => setGuideOpen(true)}
                className="relative w-full overflow-hidden rounded-3xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer group text-left"
                style={{ minHeight: 260 }}
            >
                <Image
                    src="/icons/minimi/hero-showcase.jpg"
                    alt="펫홈 쇼케이스"
                    fill
                    className="object-cover"
                    priority
                    sizes="(max-width: 768px) 100vw, 800px"
                />
                {/* 하단 그라데이션 오버레이 */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/65 to-transparent px-5 pb-4 pt-10 rounded-b-3xl z-10">
                    <div className="flex items-center gap-3">
                        <div className="flex-1">
                            <p className="text-[17px] font-extrabold text-white tracking-tight">나만의 펫홈</p>
                            <p className="text-xs text-white/80 mt-0.5">꼬미를 모으고, 내 공간을 꾸며보세요</p>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                            <ArrowRight className="w-4 h-4 text-white" />
                        </div>
                    </div>
                </div>
            </button>

            {/* 핵심 액션 허브 — AI펫톡/AI영상은 꼬미 없이도 핵심 가치.
                펫홈 꾸미기 → 빈 펫홈의 시작 온보딩(PethomeStartGuideModal)이 이어받음 */}
            <HubActions onChat={goAIChat} onVideo={goAIVideo} onDecorate={goMinihompy} />

            {/* 펫홈 안내 가이드 */}
            <MinihompyGuideModal
                open={guideOpen}
                onClose={() => setGuideOpen(false)}
                onStart={() => { setGuideOpen(false); goMinihompy(); }}
            />
        </section>
    );
}

// ============================================================================
// 허브 핵심 액션 — [우리 아이와 대화하기(AI펫톡)] + [AI 영상 만들기][펫홈 꾸미기]
// ============================================================================

function HubActions({ onChat, onVideo, onDecorate }: {
    onChat: () => void; onVideo: () => void; onDecorate: () => void;
}) {
    return (
        <div className="space-y-2.5">
            <button
                onClick={onChat}
                className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl bg-gradient-to-r from-memento-500 to-memento-400 hover:from-memento-600 hover:to-memento-500 text-white shadow-[0_4px_16px_-4px_rgba(5,178,220,0.4)] hover:shadow-[0_6px_20px_-4px_rgba(5,178,220,0.5)] active:scale-[0.99] transition-all"
            >
                <MessageCircle className="w-6 h-6" />
                <span className="flex-1 text-left">
                    <span className="block text-[15px] font-bold">펫톡 시작</span>
                    <span className="block text-xs text-white/80">AI 펫톡</span>
                </span>
                <ChevronRight className="w-4 h-4 text-white/70" />
            </button>
            <div className="grid grid-cols-2 gap-2.5">
                <button
                    onClick={onVideo}
                    className="flex items-center justify-center gap-2 px-3 py-3.5 rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-gray-200/70 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 active:scale-[0.98] transition-all"
                >
                    <Film className="w-[18px] h-[18px] text-memento-500" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">AI 영상 만들기</span>
                </button>
                <button
                    onClick={onDecorate}
                    className="flex items-center justify-center gap-2 px-3 py-3.5 rounded-2xl bg-white/80 dark:bg-gray-800/80 border border-gray-200/70 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 active:scale-[0.98] transition-all"
                >
                    <Palette className="w-[18px] h-[18px] text-memento-500" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">펫홈 꾸미기</span>
                </button>
            </div>
        </div>
    );
}

// ============================================================================
// 펫홈 안내 가이드 모달
// ============================================================================

const GUIDE_STEPS = [
    { Icon: PawPrint, title: "꼬미 캐릭터", desc: "강아지, 고양이, 햄스터 등 17종의 귀여운 꼬미를 수집할 수 있어요." },
    { Icon: Star, title: "포인트로 구매", desc: "출석(10P), 게시글(10P), 댓글(3P), AI 펫톡(1P) 등 활동하면 포인트가 쌓여요." },
    { Icon: Palette, title: "내 공간 꾸미기", desc: "배경 테마를 바꾸고, 꼬미를 배치하고, 인사말을 설정해보세요." },
    { Icon: Users, title: "친구 방문 & 방명록", desc: "다른 유저의 펫홈을 방문하고, 방명록도 남길 수 있어요." },
] as const;

function MinihompyGuideModal({ open, onClose, onStart }: {
    open: boolean; onClose: () => void; onStart: () => void;
}) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
            {/* 배경 딤 */}
            <div className="absolute inset-0 bg-black/45 animate-in fade-in" />
            {/* 시트 */}
            <div
                className="relative bg-white dark:bg-gray-800 w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl px-6 pb-8 pt-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 핸들바 (모바일) */}
                <div className="flex justify-center mb-2 sm:hidden">
                    <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-600" />
                </div>
                {/* 닫기 (데스크탑) */}
                <button onClick={onClose} className="hidden sm:flex absolute top-4 right-4 w-8 h-8 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <X className="w-4 h-4 text-gray-400" />
                </button>

                <h2 className="text-xl font-extrabold text-gray-800 dark:text-white text-center mt-2 tracking-tight">
                    펫홈이 뭔가요?
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2 mb-5 leading-relaxed">
                    포인트를 모아 꼬미를 수집하고,<br/>나만의 공간을 꾸밀 수 있어요!
                </p>

                <div className="space-y-3">
                    {GUIDE_STEPS.map((step, i) => (
                        <div key={i} className="flex items-start gap-3.5 bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4">
                            <div className="w-10 h-10 rounded-xl bg-memento-50 dark:bg-memento-900/30 flex items-center justify-center flex-shrink-0">
                                <step.Icon className="w-5 h-5 text-memento-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-800 dark:text-white">{step.title}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{step.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex items-center justify-center gap-1.5 mt-4 mb-5">
                    <Info className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-400">꼬미 1마리 = 200P, 배경 테마 = 200P</span>
                </div>

                <button
                    onClick={onStart}
                    className="w-full bg-gradient-to-r from-memento-500 to-memento-400 hover:from-memento-600 hover:to-memento-500 text-white font-bold text-[15px] py-4 rounded-2xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-[0_4px_16px_-4px_rgba(5,178,220,0.4)]"
                >
                    펫홈 시작하기
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
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
                                    우리 아이와 대화해보세요
                                </h1>
                                <p className={`text-sm sm:text-base md:text-lg leading-relaxed ${isMemorial ? "text-memorial-200/80" : "text-gray-600 dark:text-gray-300"}`}>
                                    AI 펫톡으로 성격 그대로 이야기하고,
                                    <br className="hidden sm:block" />
                                    펫홈에 우리 아이의 매일을 담아요
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
                                    {user ? "지금 만나러 가기" : "무료로 시작하기"}
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
