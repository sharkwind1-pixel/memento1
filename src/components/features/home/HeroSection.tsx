/**
 * HeroSection.tsx
 * 3가지 모드:
 *  1. 비로그인: 기존 히어로 (일러스트 + "특별한 매일을 함께" + CTA)
 *  2. 로그인 + 꼬미 없음: 쇼케이스 이미지 + "나만의 펫홈" CTA → 펫홈 탭
 *  3. 로그인 + 꼬미 있음: 개인 펫홈 프리뷰(배경+배치+인사말) → 펫홈 탭
 */

"use client";

import React, { useState, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight, Home, ChevronRight, X, PawPrint, Star, Palette, Users, Info, MessageCircle, Film } from "lucide-react";
import { TabType } from "@/types";
import type { User } from "@supabase/supabase-js";
import { setPendingRecordSub } from "@/lib/record-nav";

interface HeroSectionProps {
    setSelectedTab: (tab: TabType) => void;
    user: User | null;
    isMemorial?: boolean;
}

export default function HeroSection({ setSelectedTab, user, isMemorial = false }: HeroSectionProps) {
    // (강등 후 정리) 펫홈 프리뷰용 settings/inventory fetch 제거 — 컴팩트 바는 데이터 불필요.
    // 매 홈 렌더마다 API 2회 낭비되던 죽은 fetch였음.

    const goMinihompy = useCallback(() => {
        // 내 펫홈을 팝업(창)으로 — 싸이월드 미니홈피 감성 (인라인 진입 폐기)
        window.dispatchEvent(new CustomEvent("openMyPethome"));
    }, []);

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

    // --- 비로그인: 기존 히어로 ---
    if (!user) {
        return <OriginalHero setSelectedTab={setSelectedTab} user={user} isMemorial={isMemorial} />;
    }

    // 깜빡임 제거: 컴팩트 바는 settings/inventory가 필요 없으므로 loaded를 기다리지 않는다.
    // (이전엔 !loaded 동안 옛 마케팅 히어로를 보여줘 로그인 직후 큰 히어로가 깜빡였다 컴팩트 바로 바뀜)

    // --- 로그인(일상+추모 공통): 홈 상단에 펫홈 진입 바를 항상 노출 → 로그인하면 펫홈이 바로 보인다.
    //     추모 계정도 추모 공간(=펫홈)이 핵심이므로 진입을 숨기지 않고 추모 톤(amber)으로 보여준다.
    //     큰 펫홈 화면은 MyPethomeModal(창)으로 분리. 비운 자리는 아래 커뮤니티/AI영상/매거진/추모 피드가 메인.
    const nick = (user?.user_metadata?.nickname as string) || user?.email?.split("@")[0] || "나";
    return (
        <>
            <CompactPethomeBar nickname={nick} isMemorial={isMemorial} onPethome={goMinihompy} onChat={goAIChat} onVideo={goAIVideo} />
            {/* 펫홈 안내 가이드(꼬미 처음인 유저용 — 컴팩트 바 진입 시 펫홈 창의 온보딩이 이어받음) */}
            <MinihompyGuideModal
                open={guideOpen}
                onClose={() => setGuideOpen(false)}
                onStart={() => { setGuideOpen(false); goMinihompy(); }}
            />
        </>
    );
}

// ============================================================================
// 컴팩트 펫홈 진입 바 — 홈(광장) 상단의 작은 진입점.
// 큰 펫홈 화면은 가벼운 작은 창(MyPethomeModal)으로 분리. [펫톡][영상]은 핵심 가치라 한 줄에 노출.
// ============================================================================

function CompactPethomeBar({ nickname, isMemorial, onPethome, onChat, onVideo }: {
    nickname: string; isMemorial: boolean; onPethome: () => void; onChat: () => void; onVideo: () => void;
}) {
    // 추모 계정은 amber 톤, 일상은 memento 하늘색 톤 (전체 className을 리터럴로 둬 Tailwind purge 안전)
    const accent = isMemorial ? "text-memorial-500" : "text-memento-500";
    const iconBg = isMemorial ? "bg-memorial-100 dark:bg-memorial-900/30" : "bg-memento-100 dark:bg-memento-900/30";
    const ring = isMemorial ? "border-memorial-100 dark:border-gray-700" : "border-memento-100 dark:border-gray-700";
    const chatGrad = isMemorial
        ? "from-memorial-500 to-orange-400 hover:from-memorial-600 hover:to-orange-500"
        : "from-memento-500 to-memento-400 hover:from-memento-600 hover:to-memento-500";
    return (
        <section className="px-4 pt-4 sm:pt-5" data-tutorial-id="home-hero">
            <div className="max-w-md mx-auto sm:max-w-2xl flex items-center gap-2">
                <button
                    onClick={onPethome}
                    aria-label="내 펫홈 열기"
                    data-tutorial-id="home-pethome"
                    className={`flex items-center gap-2.5 flex-1 min-w-0 px-3.5 py-2.5 rounded-2xl bg-white/85 dark:bg-gray-800/85 backdrop-blur-sm border shadow-sm hover:shadow transition active:scale-[0.99] ${ring}`}
                >
                    <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                        <Home className={`w-[18px] h-[18px] ${accent}`} />
                    </span>
                    <span className="flex-1 min-w-0 text-left">
                        <span className="block text-sm font-bold text-gray-800 dark:text-white truncate">{nickname}네 펫홈</span>
                        <span className="block text-[11px] text-gray-400 truncate">{isMemorial ? "추억 · 기록 · 방명록" : "꾸미기 · 기록 · 방명록"}</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </button>
                <button
                    onClick={onChat}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-3 rounded-2xl bg-gradient-to-r text-white shadow-sm active:scale-95 transition ${chatGrad}`}
                >
                    <MessageCircle className="w-[18px] h-[18px]" />
                    <span className="text-sm font-semibold hidden sm:inline">펫톡</span>
                </button>
                <button
                    onClick={onVideo}
                    aria-label="AI 영상 만들기"
                    className={`flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-2xl bg-white/85 dark:bg-gray-800/85 border shadow-sm active:scale-95 transition ${ring} ${accent}`}
                >
                    <Film className="w-[18px] h-[18px]" />
                </button>
            </div>
        </section>
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
