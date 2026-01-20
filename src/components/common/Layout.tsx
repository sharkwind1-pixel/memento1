/**
 * Layout.tsx
 * 메인 레이아웃 - 헤더, 네비게이션, 푸터 포함
 * 로그인/로그아웃 기능 추가
 */

"use client";

import React, { useEffect } from "react";
import { TabType } from "@/types";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "@/components/auth/AuthModal";
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
} from "lucide-react";
import { useState } from "react";

interface LayoutProps {
    children: React.ReactNode;
    selectedTab: TabType;
    setSelectedTab: (tab: TabType) => void;
}

// 탭 정보
const TABS: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: "home", label: "홈", icon: Home },
    { id: "community", label: "커뮤니티", icon: Users },
    { id: "ai-chat", label: "AI 펫톡", icon: MessageCircle },
    { id: "adoption", label: "입양정보", icon: Heart },
    { id: "local", label: "지역정보", icon: MapPin },
    { id: "lost", label: "분실동물", icon: Search },
    { id: "magazine", label: "펫매거진", icon: BookOpen },
    { id: "record", label: "우리의 기록", icon: Camera },
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
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    // openAuthModal 이벤트 리스닝 (RecordPage에서 발생)
    useEffect(() => {
        const handleOpenAuthModal = () => {
            setIsAuthModalOpen(true);
        };

        window.addEventListener("openAuthModal", handleOpenAuthModal);
        return () => {
            window.removeEventListener("openAuthModal", handleOpenAuthModal);
        };
    }, []);

    const toggleDarkMode = () => {
        setIsDarkMode(!isDarkMode);
        document.documentElement.classList.toggle("dark");
    };

    const handleSignOut = async () => {
        await signOut();
        setIsUserMenuOpen(false);
    };

    // 사용자 닉네임 또는 이메일 앞부분
    const displayName =
        user?.user_metadata?.nickname || user?.email?.split("@")[0] || "사용자";

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
            {/* 인증 모달 */}
            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
            />

            {/* 헤더 */}
            <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-700/50">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center justify-between h-16">
                        {/* 로고 */}
                        <button
                            onClick={() => setSelectedTab("home")}
                            className="flex items-center space-x-2"
                        >
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-sky-500 rounded-xl flex items-center justify-center">
                                <span className="text-white font-bold text-lg">
                                    M
                                </span>
                            </div>
                            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-sky-600 bg-clip-text text-transparent hidden sm:block">
                                메멘토애니
                            </span>
                        </button>

                        {/* 데스크톱 네비게이션 */}
                        <nav className="hidden lg:flex items-center space-x-1">
                            {TABS.map((tab) => {
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
                                                    ? "bg-gradient-to-r from-blue-500 to-sky-500 text-white shadow-lg"
                                                    : "text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-800"
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
                            {/* 다크모드 토글 */}
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

                            {/* 로그인/사용자 메뉴 */}
                            {loading ? (
                                <div className="w-24 h-10 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-xl" />
                            ) : user ? (
                                <div className="relative">
                                    <button
                                        onClick={() =>
                                            setIsUserMenuOpen(!isUserMenuOpen)
                                        }
                                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-sky-500 rounded-full flex items-center justify-center">
                                            <User className="w-4 h-4 text-white" />
                                        </div>
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden sm:block max-w-[100px] truncate">
                                            {displayName}
                                        </span>
                                        <ChevronDown className="w-4 h-4 text-gray-500" />
                                    </button>

                                    {/* 드롭다운 메뉴 */}
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
                                                    className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
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
                                <Button
                                    onClick={() => setIsAuthModalOpen(true)}
                                    className="bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 rounded-xl"
                                >
                                    <LogIn className="w-4 h-4 mr-2" />
                                    로그인
                                </Button>
                            )}

                            {/* 모바일 메뉴 버튼 */}
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
                            {TABS.map((tab) => {
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
                                                    ? "bg-gradient-to-r from-blue-500 to-sky-500 text-white shadow-lg"
                                                    : "text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-800"
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
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-t border-gray-200/50 dark:border-gray-700/50 z-50">
                <div className="flex justify-around items-center h-16 px-2">
                    {TABS.slice(0, 5).map((tab) => {
                        const Icon = tab.icon;
                        const isActive = selectedTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setSelectedTab(tab.id)}
                                className={`
                                    flex flex-col items-center justify-center flex-1 py-2 transition-all
                                    ${
                                        isActive
                                            ? "text-blue-500"
                                            : "text-gray-400 dark:text-gray-500"
                                    }
                                `}
                            >
                                <Icon
                                    className={`w-5 h-5 ${isActive ? "scale-110" : ""}`}
                                />
                                <span className="text-[10px] mt-1 font-medium">
                                    {tab.label}
                                </span>
                            </button>
                        );
                    })}
                    {/* 더보기 버튼 */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="flex flex-col items-center justify-center flex-1 py-2 text-gray-400 dark:text-gray-500"
                    >
                        <Menu className="w-5 h-5" />
                        <span className="text-[10px] mt-1 font-medium">
                            더보기
                        </span>
                    </button>
                </div>
            </nav>

            {/* 모바일 하단 여백 */}
            <div className="lg:hidden h-16" />
        </div>
    );
}
