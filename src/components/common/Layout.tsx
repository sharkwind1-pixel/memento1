/**
 * ============================================================================
 * Layout.tsx
 * ============================================================================
 *
 * 메인 레이아웃 컴포넌트
 *
 * 컬러 시스템:
 * - Primary: #05B2DC (하늘색)
 * - Background: 뭉게구름 화이트 그라데이션
 *
 * 레이아웃 구조:
 * - 헤더: 로고, 데스크톱 네비게이션, 사용자 메뉴
 * - 사이드바: 데스크톱에서 고정, 모바일에서 오버레이
 * - 메인 콘텐츠: 반응형 중앙 정렬
 * - 하단 네비게이션: 모바일 전용 (5개 탭 + 메뉴)
 *
 * 반응형:
 * - xl (1280px+): 사이드바 고정 표시
 * - xl 미만: 하단 네비게이션 + 햄버거 메뉴
 *
 * ============================================================================
 */

"use client";

// ============================================================================
// 임포트
// ============================================================================
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { TabType, MainCategory, CommunitySubcategory } from "@/types";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "@/components/Auth/AuthModal";
import AccountSettingsModal from "@/components/Auth/AccountSettingsModal";
import Sidebar from "@/components/common/Sidebar";
import SupportModal from "@/components/features/support/SupportModal";
import {
    Home,
    Users,
    MessageCircle,
    BookOpen,
    Camera,
    Menu,
    Moon,
    Sun,
    LogIn,
    LogOut,
    User,
    ChevronDown,
    UserPlus,
    Shield,
    Settings,
} from "lucide-react";

// ============================================================================
// 타입 정의
// ============================================================================

interface LayoutProps {
    children: React.ReactNode;
    selectedTab: TabType;
    setSelectedTab: (tab: TabType) => void;
    subcategory?: CommunitySubcategory;
    onSubcategoryChange?: (sub: CommunitySubcategory) => void;
}

// ============================================================================
// 상수 정의
// ============================================================================

/** 메인 카테고리 (5개) - 데스크탑 상단 네비게이션 */
const MAIN_TABS: { id: MainCategory; label: string; icon: React.ElementType }[] = [
    { id: "home", label: "홈", icon: Home },
    { id: "record", label: "우리의 기록", icon: Camera },
    { id: "community", label: "커뮤니티", icon: Users },
    { id: "ai-chat", label: "AI 펫톡", icon: MessageCircle },
    { id: "magazine", label: "펫매거진", icon: BookOpen },
];

/** 관리자 탭 (별도) - 관리자 권한 있는 사용자만 표시 */
const ADMIN_TAB = { id: "admin" as TabType, label: "관리자", icon: Shield, adminOnly: true };

/** 하단 네비게이션용 탭 - 홈이 가운데 배치 (UX 최적화) */
const BOTTOM_NAV_TABS: { id: MainCategory; label: string; icon: React.ElementType }[] = [
    { id: "record", label: "기록", icon: Camera },
    { id: "community", label: "커뮤니티", icon: Users },
    { id: "home", label: "홈", icon: Home },
    { id: "ai-chat", label: "AI펫톡", icon: MessageCircle },
    { id: "magazine", label: "매거진", icon: BookOpen },
];

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function Layout({
    children,
    selectedTab,
    setSelectedTab,
    subcategory = "free",
    onSubcategoryChange,
}: LayoutProps) {
    // ========================================================================
    // Context & State
    // ========================================================================
    const { user, loading, signOut, isAdminUser } = useAuth();

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authModalMode, setAuthModalMode] = useState<"login" | "signup">(
        "login",
    );
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [supportModalType, setSupportModalType] = useState<"inquiry" | "suggestion" | null>(null);
    const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);

    // 메인 카테고리인지 확인
    const isMainCategory = (tab: TabType): tab is MainCategory => {
        return ["home", "record", "community", "ai-chat", "magazine"].includes(tab);
    };

    // 현재 탭이 커뮤니티 관련인지 확인
    const isCommunityRelated = (tab: TabType) => {
        return tab === "community" || tab === "adoption" || tab === "local" || tab === "lost";
    };

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
        <div className="min-h-screen bg-gradient-to-b from-[#F0F9FF] via-[#FAFCFF] to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pb-safe flex flex-col xl:block">
            {/* 인증 모달 */}
            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                initialMode={authModalMode}
            />

            {/* 질문/신고 & 건의사항 모달 */}
            <SupportModal
                isOpen={supportModalType !== null}
                onClose={() => setSupportModalType(null)}
                type={supportModalType || "inquiry"}
            />

            {/* 내 정보(계정 설정) 모달 */}
            {user && (
                <AccountSettingsModal
                    isOpen={isAccountSettingsOpen}
                    onClose={() => setIsAccountSettingsOpen(false)}
                />
            )}

            {/* 헤더 - 모바일은 완전 불투명 (성능), 데스크톱은 반투명 */}
            {/* GPU 가속으로 리페인트 최소화 */}
            <header
                className="sticky top-0 z-50 bg-white dark:bg-gray-900 xl:bg-white/90 xl:dark:bg-gray-900/90 xl:backdrop-blur-sm border-b border-gray-200 dark:border-gray-700"
                style={{
                    transform: 'translateZ(0)',
                    backfaceVisibility: 'hidden'
                }}
            >
                <div className="max-w-7xl mx-auto px-3 sm:px-4">
                    <div className="flex items-center justify-between h-14 sm:h-16">
                        {/* 로고 */}
                        <button
                            onClick={() => setSelectedTab("home")}
                            className="flex-shrink-0"
                        >
                            <Image
                                src="/logo.png"
                                alt="메멘토애니"
                                width={160}
                                height={48}
                                className="h-10 sm:h-12 w-auto object-contain dark:bg-white dark:p-1 dark:rounded-lg"
                                priority
                            />
                        </button>

                        {/* 데스크톱 네비게이션 - 5개 메인 카테고리 */}
                        <nav className="hidden xl:flex items-center gap-1">
                            {MAIN_TABS.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = tab.id === "community"
                                    ? isCommunityRelated(selectedTab)
                                    : selectedTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        data-tutorial-id={tab.id}
                                        onClick={() => setSelectedTab(tab.id)}
                                        className={`
                                            flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
                                            ${
                                                isActive
                                                    ? "bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] text-white shadow-md"
                                                    : "text-gray-600 dark:text-gray-300 hover:bg-[#E0F7FF] dark:hover:bg-gray-800"
                                            }
                                        `}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
                            {/* 관리자 탭 (조건부) */}
                            {isAdminUser && (
                                <button
                                    data-tutorial-id="admin"
                                    onClick={() => setSelectedTab("admin")}
                                    className={`
                                        flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                                        ${
                                            selectedTab === "admin"
                                                ? "bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-md"
                                                : "text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30"
                                        }
                                    `}
                                >
                                    <Shield className="w-4 h-4" />
                                    <span>관리자</span>
                                </button>
                            )}
                        </nav>

                        {/* 우측 버튼들 */}
                        <div className="flex items-center gap-1 sm:gap-2">
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
                                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-full" />
                            ) : user ? (
                                <div className="relative">
                                    <button
                                        onClick={() =>
                                            setIsUserMenuOpen(!isUserMenuOpen)
                                        }
                                        className="flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-2 rounded-full sm:rounded-xl bg-[#E0F7FF] dark:bg-gray-800 hover:bg-[#BAE6FD] dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] rounded-full flex items-center justify-center flex-shrink-0">
                                            <User className="w-4 h-4 text-white" />
                                        </div>
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden sm:block max-w-[80px] truncate">
                                            {displayName}
                                        </span>
                                        <ChevronDown className="w-4 h-4 text-gray-500 hidden sm:block" />
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
                                                    onClick={() => {
                                                        setIsAccountSettingsOpen(true);
                                                        setIsUserMenuOpen(false);
                                                    }}
                                                    className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-[#E0F7FF] dark:hover:bg-gray-700 flex items-center gap-2"
                                                >
                                                    <Settings className="w-4 h-4" />
                                                    내 정보
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
                                <div className="flex items-center gap-0.5 sm:gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={openLoginModal}
                                        className="rounded-md border-[#05B2DC] text-[#05B2DC] hover:bg-[#E0F7FF] px-1.5 sm:px-3 py-1 text-[11px] sm:text-sm h-auto"
                                    >
                                        <LogIn className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
                                        로그인
                                    </Button>
                                    <Button
                                        onClick={openSignupModal}
                                        className="bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] hover:from-[#0891B2] hover:to-[#05B2DC] rounded-md shadow-sm shadow-[#05B2DC]/25 px-1.5 sm:px-3 py-1 text-[11px] sm:text-sm h-auto"
                                    >
                                        <UserPlus className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
                                        회원가입
                                    </Button>
                                </div>
                            )}

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                className="xl:hidden rounded-xl"
                            >
                                <Menu className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </div>

            </header>

            {/* 모바일 사이드바 (오버레이) */}
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                selectedTab={selectedTab}
                onTabChange={(tab) => {
                    setSelectedTab(tab);
                }}
                subcategory={subcategory}
                onSubcategoryChange={onSubcategoryChange}
                isMobile={true}
                onOpenInquiry={() => setSupportModalType("inquiry")}
                onOpenSuggestion={() => setSupportModalType("suggestion")}
            />

            {/* 데스크톱 사이드바 (xl 이상에서만 표시) */}
            <aside className="hidden xl:block fixed left-0 top-20 h-[calc(100vh-80px)] z-40">
                <Sidebar
                    isOpen={true}
                    onClose={() => {}}
                    selectedTab={selectedTab}
                    onTabChange={(tab) => {
                        setSelectedTab(tab);
                    }}
                    subcategory={subcategory}
                    onSubcategoryChange={onSubcategoryChange}
                    isMobile={false}
                    onOpenInquiry={() => setSupportModalType("inquiry")}
                    onOpenSuggestion={() => setSupportModalType("suggestion")}
                />
            </aside>

            {/* 메인 컨텐츠 영역 */}
            <div id="main-content" className="xl:ml-56 pb-20 xl:pb-0 flex-1">
                <main className="max-w-6xl mx-auto px-4 py-6">
                    {children}
                </main>
            </div>

            {/* 모바일 하단 네비게이션 - 5개 메인 카테고리 */}
            {/* backdrop-blur 제거 - 모바일 성능 최적화 */}
            {/* GPU 가속 및 contain으로 리페인트 격리 */}
            <nav
                className="xl:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-50 pb-safe"
            >
                <div className="flex justify-around items-center h-16 px-1">
                    {BOTTOM_NAV_TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = tab.id === "community"
                            ? isCommunityRelated(selectedTab)
                            : selectedTab === tab.id;
                        const isHome = tab.id === "home";
                        return (
                            <button
                                key={tab.id}
                                data-tutorial-id={tab.id}
                                onClick={() => setSelectedTab(tab.id)}
                                className={`
                                    flex flex-col items-center justify-center flex-1 py-2 min-h-[56px]
                                    ${isActive ? "text-[#05B2DC]" : "text-gray-400 dark:text-gray-500"}
                                `}
                            >
                                <div className={`p-1.5 rounded-xl ${
                                    isHome && isActive
                                        ? "bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] text-white"
                                        : isActive
                                            ? "bg-[#E0F7FF] dark:bg-[#05B2DC]/20"
                                            : ""
                                }`}>
                                    <Icon className={`w-5 h-5 ${isHome && isActive ? "text-white" : ""}`} />
                                </div>
                                <span className="text-[10px] mt-0.5 font-medium">
                                    {tab.label}
                                </span>
                            </button>
                        );
                    })}
                    {/* 메뉴 버튼 - 사이드바 토글 */}
                    <button
                        data-tutorial-id="more"
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="flex flex-col items-center justify-center flex-1 py-2 min-h-[56px] text-gray-400 dark:text-gray-500"
                    >
                        <div className={`p-1.5 rounded-xl ${isSidebarOpen ? "bg-gray-100 dark:bg-gray-800" : ""}`}>
                            <Menu className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] mt-0.5 font-medium">
                            메뉴
                        </span>
                    </button>
                </div>
            </nav>

            {/* 하단 네비게이션 높이 확보 */}
            <div className="xl:hidden h-20" />
        </div>
    );
}
