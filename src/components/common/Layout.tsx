/**
 * Layout.tsx
 * 메인 레이아웃 - 뭉게구름 & 하늘색 컬러 시스템
 * Primary: #05B2DC / Background: 뭉게구름 화이트
 */

"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { TabType, isAdmin } from "@/types";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "@/components/Auth/AuthModal";
import {
    Home,
    Users,
    MessageCircle,
    Heart,
    MapPin,
    Search,
    BookOpen,
    Camera,
    Menu,
    X,
    Moon,
    Sun,
    LogIn,
    LogOut,
    User,
    ChevronDown,
    UserPlus,
    Shield,
} from "lucide-react";
import { useState } from "react";

interface LayoutProps {
    children: React.ReactNode;
    selectedTab: TabType;
    setSelectedTab: (tab: TabType) => void;
}

// 탭 정보 - 순서: 홈 → 우리의 기록 → AI펫톡 → 펫매거진 → 나머지
const TABS: { id: TabType; label: string; icon: React.ElementType; adminOnly?: boolean }[] = [
    { id: "home", label: "홈", icon: Home },
    { id: "record", label: "우리의 기록", icon: Camera },
    { id: "community", label: "커뮤니티", icon: Users },
    { id: "ai-chat", label: "AI 펫톡", icon: MessageCircle },
    { id: "magazine", label: "펫매거진", icon: BookOpen },
    { id: "adoption", label: "입양정보", icon: Heart },
    { id: "local", label: "지역정보", icon: MapPin },
    { id: "lost", label: "분실동물", icon: Search },
    { id: "admin", label: "관리자", icon: Shield, adminOnly: true },
];

export default function Layout({
    children,
    selectedTab,
    setSelectedTab,
}: LayoutProps) {
    const { user, loading, signOut } = useAuth();

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authModalMode, setAuthModalMode] = useState<"login" | "signup">(
        "login",
    );
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    // 다크모드 초기화 (localStorage에서 읽기)
    useEffect(() => {
        const savedDarkMode = localStorage.getItem("darkMode");
        if (savedDarkMode === "true") {
            setIsDarkMode(true);
            document.documentElement.classList.add("dark");
        }
    }, []);

    useEffect(() => {
        const handleOpenAuthModal = () => {
            setAuthModalMode("login");
            setIsAuthModalOpen(true);
        };
        window.addEventListener("openAuthModal", handleOpenAuthModal);
        return () =>
            window.removeEventListener("openAuthModal", handleOpenAuthModal);
    }, []);

    const toggleDarkMode = () => {
        const newDarkMode = !isDarkMode;
        setIsDarkMode(newDarkMode);
        document.documentElement.classList.toggle("dark");
        // localStorage에 저장
        localStorage.setItem("darkMode", String(newDarkMode));
    };

    const handleSignOut = async () => {
        await signOut();
        setIsUserMenuOpen(false);
    };

    const openLoginModal = () => {
        setAuthModalMode("login");
        setIsAuthModalOpen(true);
    };

    const openSignupModal = () => {
        setAuthModalMode("signup");
        setIsAuthModalOpen(true);
    };

    const displayName =
        user?.user_metadata?.nickname || user?.email?.split("@")[0] || "사용자";

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#F0F9FF] via-[#FAFCFF] to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pb-safe">
            {/* 인증 모달 */}
            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                initialMode={authModalMode}
            />

            {/* 헤더 */}
            <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-700/50">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center justify-between h-20 sm:h-24">
                        {/* 로고 */}
                        <button
                            onClick={() => setSelectedTab("home")}
                            className="flex-shrink-0"
                        >
                            <Image
                                src="/logo.png"
                                alt="메멘토애니"
                                width={200}
                                height={80}
                                className="h-16 sm:h-20 w-auto object-contain rounded-2xl dark:bg-white dark:p-1.5 dark:rounded-2xl"
                                priority
                            />
                        </button>

                        {/* 데스크톱 네비게이션 */}
                        <nav className="hidden lg:flex items-center space-x-1">
                            {TABS.filter(tab => !tab.adminOnly || isAdmin(user?.email)).map((tab) => {
                                const Icon = tab.icon;
                                const isActive = selectedTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setSelectedTab(tab.id)}
                                        className={`
                                            flex items-center space-x-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all
                                            ${
                                                isActive
                                                    ? "bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] text-white shadow-lg shadow-[#05B2DC]/25"
                                                    : tab.adminOnly
                                                        ? "text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30"
                                                        : "text-gray-600 dark:text-gray-300 hover:bg-[#E0F7FF] dark:hover:bg-gray-800"
                                            }
                                        `}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
                        </nav>

                        {/* 우측 버튼들 */}
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleDarkMode}
                                className="rounded-xl"
                            >
                                {isDarkMode ? (
                                    <Sun className="w-5 h-5" />
                                ) : (
                                    <Moon className="w-5 h-5" />
                                )}
                            </Button>

                            {loading ? (
                                <div className="w-24 h-10 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-xl" />
                            ) : user ? (
                                <div className="relative">
                                    <button
                                        onClick={() =>
                                            setIsUserMenuOpen(!isUserMenuOpen)
                                        }
                                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#E0F7FF] dark:bg-gray-800 hover:bg-[#BAE6FD] dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <div className="w-8 h-8 bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] rounded-full flex items-center justify-center">
                                            <User className="w-4 h-4 text-white" />
                                        </div>
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden sm:block max-w-[100px] truncate">
                                            {displayName}
                                        </span>
                                        <ChevronDown className="w-4 h-4 text-gray-500" />
                                    </button>

                                    {isUserMenuOpen && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-40"
                                                onClick={() =>
                                                    setIsUserMenuOpen(false)
                                                }
                                            />
                                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                                                <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                                        {displayName}
                                                    </p>
                                                    <p className="text-xs text-gray-500 truncate">
                                                        {user.email}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setSelectedTab(
                                                            "record",
                                                        );
                                                        setIsUserMenuOpen(
                                                            false,
                                                        );
                                                    }}
                                                    className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-[#E0F7FF] dark:hover:bg-gray-700 flex items-center gap-2"
                                                >
                                                    <Camera className="w-4 h-4" />
                                                    우리의 기록
                                                </button>
                                                <button
                                                    onClick={handleSignOut}
                                                    className="w-full px-4 py-3 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                                >
                                                    <LogOut className="w-4 h-4" />
                                                    로그아웃
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center gap-1 sm:gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={openLoginModal}
                                        className="rounded-xl border-[#05B2DC] text-[#05B2DC] hover:bg-[#E0F7FF] px-2 sm:px-4"
                                    >
                                        <LogIn className="w-4 h-4 sm:mr-2" />
                                        <span className="hidden sm:inline">로그인</span>
                                    </Button>
                                    <Button
                                        onClick={openSignupModal}
                                        className="bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] hover:from-[#0891B2] hover:to-[#05B2DC] rounded-xl shadow-lg shadow-[#05B2DC]/25 px-2 sm:px-4"
                                    >
                                        <UserPlus className="w-4 h-4 sm:mr-2" />
                                        <span className="hidden sm:inline">회원가입</span>
                                    </Button>
                                </div>
                            )}

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                    setIsMobileMenuOpen(!isMobileMenuOpen)
                                }
                                className="lg:hidden rounded-xl"
                            >
                                {isMobileMenuOpen ? (
                                    <X className="w-5 h-5" />
                                ) : (
                                    <Menu className="w-5 h-5" />
                                )}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* 모바일 메뉴 */}
                {isMobileMenuOpen && (
                    <div className="lg:hidden border-t border-gray-200/50 dark:border-gray-700/50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg">
                        <nav className="max-w-7xl mx-auto px-4 py-4 grid grid-cols-4 gap-2">
                            {TABS.filter(tab => !tab.adminOnly || isAdmin(user?.email)).map((tab) => {
                                const Icon = tab.icon;
                                const isActive = selectedTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            setSelectedTab(tab.id);
                                            setIsMobileMenuOpen(false);
                                        }}
                                        className={`
                                            flex flex-col items-center justify-center p-3 rounded-xl text-xs font-medium transition-all
                                            ${
                                                isActive
                                                    ? "bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] text-white shadow-lg"
                                                    : tab.adminOnly
                                                        ? "text-violet-600 dark:text-violet-400 hover:bg-violet-100"
                                                        : "text-gray-600 dark:text-gray-300 hover:bg-[#E0F7FF] dark:hover:bg-gray-800"
                                            }
                                        `}
                                    >
                                        <Icon className="w-5 h-5 mb-1" />
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                )}
            </header>

            {/* 메인 컨텐츠 */}
            <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>

            {/* 모바일 하단 네비게이션 */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-t border-gray-200/50 dark:border-gray-700/50 z-50 pb-safe">
                <div className="flex justify-around items-center h-16 px-1">
                    {TABS.slice(0, 5).map((tab) => {
                        const Icon = tab.icon;
                        const isActive = selectedTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setSelectedTab(tab.id)}
                                className={`
                                    flex flex-col items-center justify-center flex-1 py-2 min-h-[56px] active:scale-95 transition-all
                                    ${isActive ? "text-[#05B2DC]" : "text-gray-400 dark:text-gray-500"}
                                `}
                            >
                                <div className={`p-1.5 rounded-xl transition-colors ${isActive ? "bg-[#E0F7FF] dark:bg-[#05B2DC]/20" : ""}`}>
                                    <Icon className={`w-5 h-5 ${isActive ? "scale-110" : ""} transition-transform`} />
                                </div>
                                <span className="text-[10px] mt-0.5 font-medium">
                                    {tab.label}
                                </span>
                            </button>
                        );
                    })}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="flex flex-col items-center justify-center flex-1 py-2 min-h-[56px] text-gray-400 dark:text-gray-500 active:scale-95 transition-all"
                    >
                        <div className={`p-1.5 rounded-xl ${isMobileMenuOpen ? "bg-gray-100 dark:bg-gray-800" : ""}`}>
                            <Menu className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] mt-0.5 font-medium">
                            더보기
                        </span>
                    </button>
                </div>
            </nav>

            {/* 하단 네비게이션 높이 확보 */}
            <div className="lg:hidden h-20" />
        </div>
    );
}
