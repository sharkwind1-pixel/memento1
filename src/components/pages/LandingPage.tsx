/**
 * LandingPage.tsx
 * 비로그인 사용자를 위한 감성적인 랜딩 페이지
 * My Little Puppy 게임 감성 - 밝고 따뜻한 분위기
 */

"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
    Heart,
    MessageCircle,
    Camera,
    Star,
    Sparkles,
    ArrowRight,
    PawPrint,
} from "lucide-react";
import AuthModal from "@/components/Auth/AuthModal";

export default function LandingPage() {
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const featuresRef = useRef<HTMLElement>(null);

    const handleOpenAuth = () => {
        setIsAuthModalOpen(true);
    };

    const scrollToFeatures = () => {
        featuresRef.current?.scrollIntoView({ behavior: "smooth" });
    };
    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* 배경 그라데이션 */}
            <div className="absolute inset-0 bg-gradient-to-b from-sky-100 via-violet-50 to-amber-50">
                {/* 떠다니는 구름들 */}
                <div className="absolute top-20 left-[10%] w-32 h-16 bg-white/60 rounded-full blur-xl animate-pulse" />
                <div className="absolute top-40 right-[15%] w-48 h-20 bg-white/50 rounded-full blur-xl animate-pulse delay-1000" />
                <div className="absolute top-60 left-[60%] w-24 h-12 bg-white/40 rounded-full blur-xl animate-pulse delay-500" />

                {/* 반짝이는 별들 */}
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute animate-pulse"
                        style={{
                            left: `${5 + (i * 17) % 90}%`,
                            top: `${10 + (i * 23) % 80}%`,
                            animationDelay: `${i * 0.2}s`,
                            animationDuration: `${2 + (i % 3)}s`,
                        }}
                    >
                        <Star
                            className="text-amber-300/50"
                            size={8 + (i % 3) * 4}
                            fill="currentColor"
                        />
                    </div>
                ))}
            </div>

            <div className="relative z-10">
                {/* 히어로 섹션 */}
                <section className="min-h-[90vh] flex flex-col items-center justify-center px-4 py-16">
                    <div className="text-center max-w-3xl mx-auto space-y-8">
                        {/* 로고/아이콘 */}
                        <div className="flex justify-center mb-6">
                            <div className="relative">
                                <div className="w-24 h-24 bg-gradient-to-br from-sky-200 to-violet-200 rounded-full flex items-center justify-center shadow-xl shadow-violet-200/50">
                                    <PawPrint className="w-12 h-12 text-violet-500" />
                                </div>
                                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-amber-200 to-amber-300 rounded-full flex items-center justify-center">
                                    <Sparkles className="w-4 h-4 text-amber-600" />
                                </div>
                            </div>
                        </div>

                        {/* 메인 타이틀 */}
                        <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                            <span className="text-gray-800">소중한 시간을</span>
                            <br />
                            <span className="bg-gradient-to-r from-sky-500 via-violet-500 to-amber-500 bg-clip-text text-transparent">
                                영원히 간직하는 곳
                            </span>
                        </h1>

                        {/* 서브 타이틀 */}
                        <p className="text-xl md:text-2xl text-gray-600 leading-relaxed">
                            반려동물과 함께한 모든 순간을 기록하고,
                            <br className="hidden md:block" />
                            언제든 다시 만날 수 있어요
                        </p>

                        {/* CTA 버튼 */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                            <Button
                                size="lg"
                                onClick={handleOpenAuth}
                                className="bg-gradient-to-r from-sky-500 to-violet-500 hover:from-sky-600 hover:to-violet-600 text-white rounded-full px-8 py-6 text-lg shadow-xl shadow-violet-200/50 hover:shadow-violet-300/50 transition-all hover:scale-105"
                            >
                                <Heart className="w-5 h-5 mr-2" />
                                시작하기
                            </Button>
                            <Button
                                size="lg"
                                variant="outline"
                                onClick={scrollToFeatures}
                                className="bg-white/70 border-violet-200 text-violet-600 hover:bg-violet-50 rounded-full px-8 py-6 text-lg"
                            >
                                서비스 둘러보기
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </Button>
                        </div>

                        {/* 신뢰 지표 */}
                        <div className="flex items-center justify-center gap-6 pt-8 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                                <Heart className="w-4 h-4 text-pink-400" fill="currentColor" />
                                1,000+ 가족
                            </span>
                            <span className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-amber-400" fill="currentColor" />
                                4.9점 만족도
                            </span>
                        </div>
                    </div>

                    {/* 스크롤 안내 */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
                        <div className="w-6 h-10 border-2 border-violet-300 rounded-full flex justify-center">
                            <div className="w-1.5 h-3 bg-violet-400 rounded-full mt-2 animate-pulse" />
                        </div>
                    </div>
                </section>

                {/* 핵심 기능 섹션 */}
                <section ref={featuresRef} className="py-24 px-4">
                    <div className="max-w-5xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
                                함께하는 모든 순간을 특별하게
                            </h2>
                            <p className="text-lg text-gray-600">
                                일상의 기록부터 소중한 추억까지, 모두 담을 수 있어요
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            {/* AI 펫톡 */}
                            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl shadow-sky-100/50 hover:shadow-sky-200/50 transition-all hover:-translate-y-2">
                                <div className="w-16 h-16 bg-gradient-to-br from-sky-100 to-sky-200 rounded-2xl flex items-center justify-center mb-6">
                                    <MessageCircle className="w-8 h-8 text-sky-500" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-800 mb-3">
                                    AI 펫톡
                                </h3>
                                <p className="text-gray-600 leading-relaxed">
                                    반려동물의 시점에서 채팅해요.
                                    예방접종 일정, 건강 체크, 산책 시간 등
                                    케어에 필요한 정보를 알려드려요.
                                </p>
                            </div>

                            {/* 우리의 기록 */}
                            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl shadow-violet-100/50 hover:shadow-violet-200/50 transition-all hover:-translate-y-2">
                                <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-violet-200 rounded-2xl flex items-center justify-center mb-6">
                                    <Camera className="w-8 h-8 text-violet-500" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-800 mb-3">
                                    우리의 기록
                                </h3>
                                <p className="text-gray-600 leading-relaxed">
                                    사진, 타임라인, 특별한 날들을 기록해요.
                                    시간이 지나도 그 순간의 감정이
                                    그대로 남아있어요.
                                </p>
                            </div>

                            {/* 커뮤니티 */}
                            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl shadow-amber-100/50 hover:shadow-amber-200/50 transition-all hover:-translate-y-2">
                                <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-amber-200 rounded-2xl flex items-center justify-center mb-6">
                                    <Heart className="w-8 h-8 text-amber-500" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-800 mb-3">
                                    반려인 커뮤니티
                                </h3>
                                <p className="text-gray-600 leading-relaxed">
                                    같은 마음을 가진 보호자들과 소통해요.
                                    일상 이야기부터 케어 노하우까지
                                    함께 나눌 수 있어요.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 감성 섹션 */}
                <section className="py-24 px-4 bg-gradient-to-b from-transparent via-violet-50/50 to-transparent">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="bg-white/60 backdrop-blur-lg rounded-3xl p-12 shadow-xl">
                            <div className="flex justify-center mb-8">
                                {[...Array(5)].map((_, i) => (
                                    <Star
                                        key={i}
                                        className="w-6 h-6 text-amber-400 mx-1"
                                        fill="currentColor"
                                    />
                                ))}
                            </div>
                            <blockquote className="text-2xl md:text-3xl text-gray-700 leading-relaxed mb-8 font-medium">
                                &ldquo;매일 기록하다 보니 우리 강아지랑
                                <br className="hidden md:block" />
                                더 많은 추억을 쌓게 됐어요&rdquo;
                            </blockquote>
                            <p className="text-gray-500">
                                - 초코 보호자님
                            </p>
                        </div>
                    </div>
                </section>

                {/* 마지막 CTA 섹션 */}
                <section className="py-24 px-4">
                    <div className="max-w-3xl mx-auto text-center">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6">
                            소중한 시간, 함께 기록해요
                        </h2>
                        <p className="text-lg text-gray-600 mb-8">
                            무료로 시작하고, 더 많은 대화가 필요하면 프리미엄으로
                        </p>
                        <Button
                            size="lg"
                            onClick={handleOpenAuth}
                            className="bg-gradient-to-r from-sky-500 via-violet-500 to-amber-500 hover:from-sky-600 hover:via-violet-600 hover:to-amber-600 text-white rounded-full px-12 py-6 text-lg shadow-xl hover:shadow-2xl transition-all hover:scale-105"
                        >
                            <PawPrint className="w-5 h-5 mr-2" />
                            무료로 시작하기
                        </Button>
                        <p className="text-sm text-gray-400 mt-4">
                            AI 펫톡 하루 15회 무료 / 프리미엄 월 7,900원
                        </p>
                    </div>
                </section>

                {/* 푸터 */}
                <footer className="py-12 px-4 border-t border-violet-100">
                    <div className="max-w-5xl mx-auto">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-2">
                                <PawPrint className="w-6 h-6 text-violet-500" />
                                <span className="font-bold text-gray-800">메멘토애니</span>
                            </div>
                            <div className="flex gap-6 text-sm text-gray-500">
                                <a href="#" className="hover:text-violet-500 transition-colors">이용약관</a>
                                <a href="#" className="hover:text-violet-500 transition-colors">개인정보처리방침</a>
                                <a href="#" className="hover:text-violet-500 transition-colors">문의하기</a>
                            </div>
                            <p className="text-sm text-gray-400">
                                2026 Memento Ani. All rights reserved.
                            </p>
                        </div>
                    </div>
                </footer>
            </div>

            {/* 로그인/회원가입 모달 */}
            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                initialMode="login"
            />
        </div>
    );
}
