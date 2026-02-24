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
 * - 하단 네비게이션: 모바일 전용 (5개 탭)
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
import { useMemorialMode, usePets } from "@/contexts/PetContext";
import AuthModal from "@/components/Auth/AuthModal";
import AccountSettingsModal from "@/components/Auth/AccountSettingsModal";
import Sidebar from "@/components/common/Sidebar";
import SupportModal from "@/components/features/support/SupportModal";
import LevelBadge from "@/components/features/points/LevelBadge";
import MagazineBanner from "@/components/features/magazine/MagazineBanner";
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

/** 하단 네비게이션용 탭 - 홈이 가운데 배치 (UX 최적화) */
const BOTTOM_NAV_TABS: {
    id: MainCategory;
    label: string;
    icon: React.ElementType;
}[] = [
    { id: "record", label: "내 기록", icon: Camera },
    { id: "community", label: "커뮤니티", icon: Users },
    { id: "home", label: "홈", icon: Home },
    { id: "ai-chat", label: "AI펫톡", icon: MessageCircle },
    { id: "magazine", label: "매거진", icon: BookOpen },
];

// ============================================================================
// 헤더 Auth 영역 (별도 컴포넌트) - points/minimiEquip 변경이 Layout 본체를 리렌더하지 않도록
// ============================================================================

function HeaderAuthArea({
    setSelectedTab,
}: {
    setSelectedTab: (tab: TabType) => void;
}) {
    const { user, loading, signOut, isAdminUser, points, userPetType, minimiEquip } = useAuth();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    const displayName = user?.user_metadata?.nickname || user?.email?.split("@")[0] || "사용자";

    const handleSignOut = async () => {
        await signOut();
        setIsUserMenuOpen(false);
    };

    const openLoginModal = () => {
        window.dispatchEvent(new CustomEvent("openAuthModal"));
    };

    const openSignupModal = () => {
        window.dispatchEvent(new CustomEvent("openAuthModalSignup"));
    };

    return (
        <div className="xl:hidden flex items-center min-w-[40px]" data-auth-area>
            {/* 로딩 스켈레톤 */}
            <div
                className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"
                style={{ display: loading ? 'block' : 'none' }}
            />

            {/* 로그인 유저 메뉴 */}
            <div
                className="relative"
                style={{ display: !loading && user ? 'block' : 'none' }}
            >
                <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-1.5 p-1.5 min-w-[44px] min-h-[44px] sm:px-3 sm:py-2 rounded-full sm:rounded-xl hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 active:scale-95 transition-transform"
                >
                    <LevelBadge
                        points={points}
                        petType={userPetType}
                        isAdmin={isAdminUser}
                        size="md"
                        showTooltip={false}
                    />
                    {minimiEquip.imageUrl && (
                        <Image
                            src={minimiEquip.imageUrl}
                            alt="미니미"
                            width={16}
                            height={16}
                            className="object-contain hidden sm:block"
                            style={{ imageRendering: "pixelated" }}
                        />
                    )}
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden sm:block max-w-[80px] truncate">
                        {displayName}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-500 hidden sm:block" />
                </button>

                {isUserMenuOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsUserMenuOpen(false)}
                        />
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-2">
                                    {minimiEquip.imageUrl && (
                                        <Image
                                            src={minimiEquip.imageUrl}
                                            alt="미니미"
                                            width={24}
                                            height={24}
                                            className="object-contain"
                                            style={{ imageRendering: "pixelated" }}
                                        />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                            {displayName}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate">
                                            {user?.email}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedTab("record");
                                    setIsUserMenuOpen(false);
                                }}
                                className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-[#E0F7FF] dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                                <User className="w-4 h-4" />
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

            {/* 비로그인 버튼 */}
            <div
                className="flex items-center gap-0.5 sm:gap-2"
                style={{ display: !loading && !user ? 'flex' : 'none' }}
            >
                <Button
                    variant="outline"
                    onClick={openLoginModal}
                    className="rounded-md border-[#05B2DC] text-[#05B2DC] hover:bg-[#E0F7FF] px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm h-auto min-h-[44px] active:scale-95 transition-transform"
                >
                    <LogIn className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
                    로그인
                </Button>
                <Button
                    onClick={openSignupModal}
                    className="bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] hover:from-[#0891B2] hover:to-[#05B2DC] rounded-md shadow-sm shadow-[#05B2DC]/25 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm h-auto min-h-[44px] active:scale-95 transition-transform"
                >
                    <UserPlus className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
                    회원가입
                </Button>
            </div>
        </div>
    );
}

// ============================================================================
// 하단 네비게이션 (별도 컴포넌트) - isMemorialMode 변경이 Layout 본체를 리렌더하지 않도록
// ============================================================================

function BottomNav({
    selectedTab,
    setSelectedTab,
}: {
    selectedTab: TabType;
    setSelectedTab: (tab: TabType) => void;
}) {
    const { isMemorialMode } = useMemorialMode();

    const isCommunityRelated = (tab: TabType) => {
        return tab === "community" || tab === "adoption" || tab === "local" || tab === "lost";
    };

    return (
        <nav
            className={`xl:hidden fixed bottom-0 left-0 right-0 border-t z-50 pb-safe ${
                isMemorialMode
                    ? "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800"
                    : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
            }`}
            style={{
                boxShadow: '0 -1px 12px rgba(0, 0, 0, 0.04)',
                transform: 'translateZ(0)',
            }}
        >
            <div className="flex justify-around items-center h-[68px] px-2 max-w-lg mx-auto">
                {BOTTOM_NAV_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive =
                        tab.id === "community"
                            ? isCommunityRelated(selectedTab)
                            : selectedTab === tab.id;
                    const isHome = tab.id === "home";
                    return (
                        <button
                            key={tab.id}
                            data-tutorial-id={tab.id}
                            onClick={() => setSelectedTab(tab.id)}
                            className={`
                                relative flex flex-col items-center justify-center flex-1 py-1.5
                                min-h-[60px] min-w-[56px] active:scale-95 transition-transform
                                ${isActive
                                    ? isMemorialMode
                                        ? "text-amber-500 dark:text-amber-400"
                                        : "text-[#05B2DC] dark:text-[#38BDF8]"
                                    : "text-gray-400 dark:text-gray-500"}
                            `}
                        >
                            <div
                                className={`
                                    relative flex items-center justify-center rounded-2xl
                                    ${isHome
                                        ? isActive
                                            ? isMemorialMode
                                                ? "w-12 h-8 bg-gradient-to-r from-amber-500 to-orange-500 shadow-md shadow-amber-500/25"
                                                : "w-12 h-8 bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] shadow-md shadow-[#05B2DC]/25"
                                            : "w-12 h-8"
                                        : isActive
                                            ? isMemorialMode
                                                ? "w-10 h-8 bg-amber-100 dark:bg-amber-500/15"
                                                : "w-10 h-8 bg-[#E0F7FF] dark:bg-[#05B2DC]/15"
                                            : "w-10 h-8"
                                    }
                                `}
                            >
                                <Icon
                                    className={`
                                        ${isHome
                                            ? isActive
                                                ? "w-6 h-6 text-white"
                                                : "w-6 h-6"
                                            : isActive
                                                ? "w-[22px] h-[22px]"
                                                : "w-5 h-5"
                                        }
                                    `}
                                />
                            </div>
                            <span className={`text-xs mt-1 leading-tight whitespace-nowrap ${isActive ? 'font-semibold' : 'font-medium'}`}>
                                {tab.label}
                            </span>
                            {isActive && !isHome && (
                                <div className={`absolute bottom-1 w-1 h-1 rounded-full ${
                                    isMemorialMode ? "bg-amber-500 dark:bg-amber-400" : "bg-[#05B2DC] dark:bg-[#38BDF8]"
                                }`} />
                            )}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

function Layout({
    children,
    selectedTab,
    setSelectedTab,
    subcategory = "free",
    onSubcategoryChange,
}: LayoutProps) {
    // ========================================================================
    // Context & State
    // Layout에서는 최소한의 context만 구독:
    // - useAuth(): user/loading/signOut (초기 로딩 시 1번만 변경)
    // - useMemorialMode(): isMemorialMode만 (status 변경 시만 리렌더)
    // - usePets(): isLoading만 (FOUC 방지용, 초기 1회만 변경되므로 리렌더 영향 미미)
    // ========================================================================
    const { user, loading, signOut, profileLoaded } = useAuth();
    const { isMemorialMode } = useMemorialMode();
    const { isLoading: isPetsLoading } = usePets();

    // FOUC 방지: auth + profile + pets 모두 로딩 완료 후 js-loading 클래스 제거
    // 비로그인: loading=false 즉시 해제 (pets 로딩도 비로그인 시 즉시 false)
    // 로그인: profileLoaded=true + isPetsLoading=false 후 해제
    useEffect(() => {
        if (!loading && (!user || profileLoaded) && !isPetsLoading) {
            document.documentElement.classList.remove("js-loading");
        }
    }, [loading, user, profileLoaded, isPetsLoading]);

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    // blocking script가 이미 'dark' 클래스를 적용했으므로, DOM에서 초기값 읽기
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof document !== "undefined") {
            return document.documentElement.classList.contains("dark");
        }
        return false;
    });
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authModalMode, setAuthModalMode] = useState<"login" | "signup">(
        "login",
    );
    const [supportModalType, setSupportModalType] = useState<
        "inquiry" | "suggestion" | null
    >(null);
    const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);

    // 다크모드 동기화: blocking script가 이미 클래스를 적용했으므로
    // React state만 동기화 (DOM 조작 불필요)
    useEffect(() => {
        const hasDark = document.documentElement.classList.contains("dark");
        if (hasDark !== isDarkMode) {
            setIsDarkMode(hasDark);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const handleOpenAuthModal = () => {
            setAuthModalMode("login");
            setIsAuthModalOpen(true);
        };
        const handleOpenAuthModalSignup = () => {
            setAuthModalMode("signup");
            setIsAuthModalOpen(true);
        };
        window.addEventListener("openAuthModal", handleOpenAuthModal);
        window.addEventListener("openAuthModalSignup", handleOpenAuthModalSignup);
        return () => {
            window.removeEventListener("openAuthModal", handleOpenAuthModal);
            window.removeEventListener("openAuthModalSignup", handleOpenAuthModalSignup);
        };
    }, []);

    // RecordPage에서 "계정 설정" 버튼 클릭 시 AccountSettingsModal 열기
    useEffect(() => {
        const handleOpenAccountSettings = () => {
            setIsAccountSettingsOpen(true);
        };
        window.addEventListener("openAccountSettings", handleOpenAccountSettings);
        return () =>
            window.removeEventListener("openAccountSettings", handleOpenAccountSettings);
    }, []);

    const toggleDarkMode = () => {
        const newDarkMode = !isDarkMode;
        setIsDarkMode(newDarkMode);
        document.documentElement.classList.toggle("dark");
        localStorage.setItem("darkMode", String(newDarkMode));
    };

    const handleSignOut = async () => {
        await signOut();
    };

    const openLoginModal = () => {
        setAuthModalMode("login");
        setIsAuthModalOpen(true);
    };

    const openSignupModal = () => {
        setAuthModalMode("signup");
        setIsAuthModalOpen(true);
    };

    return (
        <div className={`min-h-screen pb-safe flex flex-col xl:block ${
            isMemorialMode
                ? "bg-gradient-to-b from-amber-50/80 via-orange-50/40 to-white dark:from-amber-950 dark:via-orange-950 dark:to-gray-900"
                : "bg-gradient-to-b from-[#F0F9FF] via-[#FAFCFF] to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"
        }`}>

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
                className={`sticky top-0 z-[60] xl:backdrop-blur-sm border-b ${
                    isMemorialMode
                        ? "bg-amber-50 dark:bg-amber-950 xl:bg-amber-50/90 xl:dark:bg-amber-950/90 border-amber-200 dark:border-amber-800"
                        : "bg-white dark:bg-gray-900 xl:bg-white/90 xl:dark:bg-gray-900/90 border-gray-200 dark:border-gray-700"
                }`}
                style={{
                    transform: "translateZ(0)",
                    backfaceVisibility: "hidden",
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
                                className="h-8 sm:h-10 md:h-12 w-auto object-contain dark:bg-white dark:p-1 dark:rounded-lg"
                                priority
                            />
                        </button>

                        {/* 데스크톱 매거진 배너 */}
                        <MagazineBanner onNavigateToMagazine={() => setSelectedTab("magazine")} />

                        {/* 우측 버튼들 */}
                        <div className="flex items-center gap-1 sm:gap-2">
                            {/* 모바일 햄버거 메뉴 - auth 버튼과 분리 */}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                className="xl:hidden rounded-xl"
                                aria-label="메뉴 열기"
                            >
                                <Menu className="w-5 h-5" />
                            </Button>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleDarkMode}
                                className="rounded-xl xl:hidden"
                                aria-label={isDarkMode ? "라이트 모드로 전환" : "다크 모드로 전환"}
                            >
                                {isDarkMode ? (
                                    <Sun className="w-5 h-5" />
                                ) : (
                                    <Moon className="w-5 h-5" />
                                )}
                            </Button>

                            {/* 모바일 auth 영역 - 별도 컴포넌트로 분리하여 points/minimiEquip 변경이 Layout을 리렌더하지 않음 */}
                            <HeaderAuthArea setSelectedTab={setSelectedTab} />
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
                    isDarkMode={isDarkMode}
                    onToggleDarkMode={toggleDarkMode}
                    onOpenLogin={openLoginModal}
                    onOpenSignup={openSignupModal}
                    onSignOut={handleSignOut}
                    onOpenAccountSettings={() => setSelectedTab("record")}
                    authLoading={loading}
                />
            </aside>

            {/* 메인 컨텐츠 영역 */}
            <div id="main-content" className="xl:ml-[420px] flex-1">
                <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
            </div>

            {/* 모바일 하단 네비게이션 - 별도 컴포넌트로 분리 (isMemorialMode 변경이 Layout 본체 리렌더 안 함) */}
            <BottomNav selectedTab={selectedTab} setSelectedTab={setSelectedTab} />

        </div>
    );
}

export default React.memo(Layout);
