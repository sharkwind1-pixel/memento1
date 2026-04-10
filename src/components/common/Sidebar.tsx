/**
 * 사이드바 네비게이션 컴포넌트
 * - 5개 메인 카테고리 + 커뮤니티 하위 펼침
 * - 반응형: 데스크탑(고정), 모바일(오버레이)
 */

"use client";

import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
    Home,
    Camera,
    Users,
    MessageCircle,
    BookOpen,
    ChevronDown,
    ChevronRight,
    X,
    HandHeart,
    MapPin,
    AlertCircle,
    Sparkles,
    MessageSquare,
    HelpCircle,
    Lightbulb,
    Shield,
    Moon,
    Sun,
    LogIn,
    LogOut,
    Settings,
    Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { usePets } from "@/contexts/PetContext";
import { supabase } from "@/lib/supabase";
import PointsBadge from "@/components/features/points/PointsBadge";
import type { MainCategory, CommunitySubcategory, TabType } from "@/types";
import { safeSetItem } from "@/lib/safe-storage";

// 메인 카테고리 정의
const MAIN_CATEGORIES: {
    id: MainCategory;
    label: string;
    icon: React.ElementType;
    hasSubcategories?: boolean;
}[] = [
    { id: "home", label: "홈", icon: Home },
    { id: "record", label: "내 기록", icon: Camera },
    { id: "community", label: "커뮤니티", icon: Users, hasSubcategories: true },
    { id: "ai-chat", label: "AI 펫톡", icon: MessageCircle },
    { id: "magazine", label: "매거진", icon: BookOpen },
];

// 커뮤니티 서브카테고리 정의
const COMMUNITY_SUBCATEGORIES: {
    id: CommunitySubcategory;
    label: string;
    icon: React.ElementType;
    color: string;
}[] = [
    { id: "free", label: "자유게시판", icon: MessageSquare, color: "text-memento-500" },
    { id: "memorial", label: "기억게시판", icon: Sparkles, color: "text-violet-500" },
    { id: "adoption", label: "입양정보", icon: HandHeart, color: "text-rose-500" },
    { id: "local", label: "지역정보", icon: MapPin, color: "text-emerald-500" },
    { id: "lost", label: "분실동물", icon: AlertCircle, color: "text-memorial-500" },
];

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    selectedTab: TabType;
    onTabChange: (tab: TabType) => void;
    subcategory?: CommunitySubcategory;
    onSubcategoryChange?: (sub: CommunitySubcategory) => void;
    isMobile?: boolean;
    onOpenInquiry?: () => void;
    onOpenSuggestion?: () => void;
    isDarkMode?: boolean;
    onToggleDarkMode?: () => void;
    onOpenLogin?: () => void;
    onSignOut?: () => void;
    onOpenAccountSettings?: () => void;
    authLoading?: boolean;
}

export default function Sidebar({
    isOpen,
    onClose,
    selectedTab,
    onTabChange,
    subcategory = "free",
    onSubcategoryChange,
    isMobile = false,
    onOpenInquiry,
    onOpenSuggestion,
    isDarkMode,
    onToggleDarkMode,
    onOpenLogin,
    onSignOut,
    onOpenAccountSettings,
    authLoading,
}: SidebarProps) {
    const { user, isAdminUser, isSimpleMode, toggleSimpleMode } = useAuth();
    const { selectedPet } = usePets();
    const isMemorialMode = selectedPet?.status === "memorial";
    const [expandedCategory, setExpandedCategory] = useState<MainCategory | null>(
        selectedTab === "community" ? "community" : null
    );
    const [hasModalOpen, setHasModalOpen] = useState(false);
    const [hasPendingAdmin, setHasPendingAdmin] = useState(false);
    const adminQueryFailedRef = useRef(false);

    // 관리자일 때 미처리 신고/문의 건수 체크
    // selectedTab이 바뀔 때도 재조회 (관리자 탭에서 처리 후 다른 탭 갔다 오면 갱신)
    useEffect(() => {
        if (!isAdminUser) return;

        let failCount = 0;

        const checkPending = async () => {
            // 연속 3회 실패 시 자동 쿼리 중단 (RLS 미적용 등 서버 문제)
            if (failCount >= 3) return;

            try {
                const [reportsRes, inquiriesRes] = await Promise.all([
                    supabase
                        .from("reports")
                        .select("id", { count: "exact" })
                        .eq("status", "pending")
                        .limit(1),
                    supabase
                        .from("support_inquiries")
                        .select("id", { count: "exact" })
                        .eq("status", "pending")
                        .limit(1),
                ]);

                // Supabase 에러 응답 체크 (CORS/502는 error 객체로 돌아옴)
                if (reportsRes.error || inquiriesRes.error) {
                    failCount++;
                    if (failCount >= 3) adminQueryFailedRef.current = true;
                    return;
                }

                failCount = 0; // 성공 시 리셋
                const total = (reportsRes.count || 0) + (inquiriesRes.count || 0);
                setHasPendingAdmin(total > 0);
            } catch {
                failCount++;
                if (failCount >= 3) adminQueryFailedRef.current = true;
            }
        };

        checkPending();
        // 60초마다 갱신 (30초 → 60초로 완화)
        const interval = setInterval(checkPending, 60000);

        // 관리자 탭에서 상태 변경 시 즉시 재조회 (커스텀 이벤트)
        const handleAdminUpdate = () => {
            failCount = 0; // 수동 트리거 시 리셋
            adminQueryFailedRef.current = false;
            checkPending();
        };
        window.addEventListener("adminDataUpdated", handleAdminUpdate);

        return () => {
            clearInterval(interval);
            window.removeEventListener("adminDataUpdated", handleAdminUpdate);
        };
    }, [isAdminUser, selectedTab]);

    // 탭이 변경되면 커뮤니티 확장 상태 업데이트
    useEffect(() => {
        if (selectedTab === "community") {
            setExpandedCategory("community");
        }
    }, [selectedTab]);

    // 모바일 사이드바 열릴 때 body 스크롤 잠금
    useEffect(() => {
        if (isMobile && isOpen) {
            const scrollY = window.scrollY;
            document.body.style.overflow = "hidden";
            document.body.style.position = "fixed";
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = "100%";

            return () => {
                document.body.style.overflow = "";
                document.body.style.position = "";
                document.body.style.top = "";
                document.body.style.width = "";
                window.scrollTo(0, scrollY);
            };
        }
    }, [isMobile, isOpen]);

    const handleMainCategoryClick = (category: MainCategory) => {
        if (category === "community") {
            // 커뮤니티는 펼침/접힘 토글
            setExpandedCategory(prev => prev === "community" ? null : "community");
            // 커뮤니티 탭으로 이동 (기본 서브카테고리: free)
            onTabChange("community");
            if (onSubcategoryChange && !subcategory) {
                onSubcategoryChange("free");
            }
            // 모바일에서 사이드바 닫기
            if (isMobile) {
                onClose();
            }
        } else {
            // 다른 카테고리는 바로 이동
            onTabChange(category as TabType);
            if (isMobile) {
                onClose();
            }
        }
    };

    const handleSubcategoryClick = (sub: CommunitySubcategory) => {
        // onSubcategoryChange가 있으면 그것만 호출 (page.tsx handleSubcategoryChange)
        // → 내부에서 setSelectedTab("community") + setSelectedSubcategory(sub) + resetKey++ 모두 처리
        // → onTabChange("community")를 따로 호출하면 startTransition이 subcategory를 undefined로 덮어쓸 수 있음
        if (onSubcategoryChange) {
            onSubcategoryChange(sub);
        } else {
            // fallback: onSubcategoryChange가 없으면 기존 방식
            if (selectedTab !== "community") {
                onTabChange("community");
            }
        }
        if (isMobile) {
            onClose();
        }
    };

    const isMainCategoryActive = (category: MainCategory) => {
        if (category === "community") {
            return selectedTab === "community" ||
                   selectedTab === "adoption" ||
                   selectedTab === "local" ||
                   selectedTab === "lost";
        }
        return selectedTab === category;
    };

    const sidebarContent = (
        <div className="flex flex-col min-h-full">
            {/* 모바일 헤더 - sticky로 항상 접근 가능 */}
            {isMobile && (
                <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                    <span className="text-lg font-bold text-gray-800 dark:text-white">메뉴</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="p-2"
                        aria-label="메뉴 닫기"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>
            )}

            {/* 비로그인 시 시작하기 - 데스크톱 사이드바 최상단 */}
            {!isMobile && !user && !authLoading && onOpenLogin && (
                <div className="px-3 py-3 border-b border-gray-200 dark:border-gray-700">
                    <button
                        onClick={onOpenLogin}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-memento-500 to-memento-400 text-white hover:opacity-90 transition-all text-sm font-medium"
                    >
                        <LogIn className="w-4 h-4" />
                        시작하기
                    </button>
                </div>
            )}

            {/* 포인트 배지 */}
            {user && (
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <PointsBadge onModalChange={isMobile ? setHasModalOpen : undefined} />
                </div>
            )}

            {/* 다크모드 토글 - 데스크톱 사이드바 전용 */}
            {!isMobile && onToggleDarkMode && (
                <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <button
                        onClick={onToggleDarkMode}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-gray-700 dark:text-gray-300"
                    >
                        <div className="flex items-center gap-3">
                            {isDarkMode ? <Sun className="w-5 h-5 text-memorial-500" /> : <Moon className="w-5 h-5 text-gray-500" />}
                            <span className="text-sm">{isDarkMode ? "라이트 모드" : "다크 모드"}</span>
                        </div>
                    </button>
                </div>
            )}

            {/* 간편모드(크게 보기) 토글 */}
            {user && (
                <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => { toggleSimpleMode(); if (isMobile) onClose(); }}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-gray-700 dark:text-gray-300"
                    >
                        <div className="flex items-center gap-3">
                            <Eye className="w-5 h-5 text-memento-500" />
                            <span className="text-sm">크게 보기</span>
                        </div>
                        <div className={`relative w-10 h-5 rounded-full transition-colors ${isSimpleMode ? "bg-memento-500" : "bg-gray-300 dark:bg-gray-600"}`}>
                            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isSimpleMode ? "translate-x-5" : ""}`} />
                        </div>
                    </button>
                </div>
            )}

            {/* 네비게이션 목록 */}
            <nav className="flex-1 p-4 space-y-1">
                {MAIN_CATEGORIES.map((category) => (
                    <div key={category.id}>
                        {/* 메인 카테고리 버튼 */}
                        <button
                            data-tutorial-id={category.id}
                            onClick={() => handleMainCategoryClick(category.id)}
                            aria-expanded={category.hasSubcategories ? expandedCategory === "community" : undefined}
                            className={cn(
                                "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-500",
                                "hover:bg-gray-100 dark:hover:bg-gray-800",
                                isMainCategoryActive(category.id)
                                    ? isMemorialMode
                                        ? "bg-memorial-50 dark:bg-memorial-400/10 text-memorial-600 dark:text-memorial-400 font-medium"
                                        : "bg-memento-200 dark:bg-memento-900/30 text-memento-600 dark:text-memento-400 font-medium"
                                    : "text-gray-700 dark:text-gray-300"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <category.icon className="w-5 h-5" />
                                <span>{category.label}</span>
                            </div>
                            {category.hasSubcategories && (
                                expandedCategory === "community"
                                    ? <ChevronDown className="w-4 h-4" />
                                    : <ChevronRight className="w-4 h-4" />
                            )}
                        </button>

                        {/* 커뮤니티 서브카테고리 */}
                        {category.id === "community" && expandedCategory === "community" && (
                            <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-gray-200 dark:border-gray-700 pl-3">
                                {COMMUNITY_SUBCATEGORIES.filter((sub) => sub.id !== "memorial" || isMemorialMode).map((sub) => (
                                    <button
                                        key={sub.id}
                                        onClick={() => handleSubcategoryClick(sub.id)}
                                        className={cn(
                                            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-sm",
                                            "hover:bg-gray-100 dark:hover:bg-gray-800",
                                            subcategory === sub.id && selectedTab === "community"
                                                ? "bg-gray-100 dark:bg-gray-800 font-medium"
                                                : "text-gray-600 dark:text-gray-400"
                                        )}
                                    >
                                        <sub.icon className={cn("w-4 h-4", sub.color)} />
                                        <span>{sub.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}

                {/* 관리자 탭 (관리자만 표시) */}
                {isAdminUser && (
                    <button
                        onClick={() => {
                            onTabChange("admin");
                            if (isMobile) onClose();
                        }}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all mt-2",
                            "hover:bg-violet-100 dark:hover:bg-violet-900/30",
                            selectedTab === "admin"
                                ? "bg-gradient-to-r from-violet-500 to-purple-500 text-white font-medium"
                                : "text-violet-600 dark:text-violet-400"
                        )}
                    >
                        <div className="relative">
                            <Shield className="w-5 h-5" />
                            {hasPendingAdmin && (
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                            )}
                        </div>
                        <span>관리자</span>
                        {hasPendingAdmin && (
                            <span className="ml-auto text-xs bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold">
                                !
                            </span>
                        )}
                    </button>
                )}
            </nav>

            {/* 유저 정보 영역 - 로그인 시 표시 (데스크톱+모바일) */}
            {user && (
                <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-700">
                    {authLoading ? (
                        <div className="w-full h-10 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-xl" />
                    ) : (
                        <div className="space-y-1">
                            <div className="px-3 py-2">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                    {user.user_metadata?.nickname || user.email?.split("@")[0]}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                            </div>
                            <button
                                onClick={() => {
                                    onOpenAccountSettings?.();
                                    if (isMobile) onClose();
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                            >
                                <Settings className="w-4 h-4" />
                                <span>내 정보</span>
                            </button>
                            <button
                                onClick={() => {
                                    onTabChange("record");
                                    // RecordPage에 미니홈피 서브탭으로 이동 이벤트 전달
                                    setTimeout(() => {
                                        window.dispatchEvent(new CustomEvent("navigateRecordSubTab", { detail: "minihompy" }));
                                    }, 50);
                                    if (isMobile) onClose();
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-memento-600 dark:text-memento-400 hover:bg-memento-50 dark:hover:bg-memento-900/20 transition-all"
                            >
                                <Home className="w-4 h-4" />
                                <span>내 미니홈피</span>
                            </button>
                            <button
                                onClick={() => {
                                    onSignOut?.();
                                    if (isMobile) onClose();
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                            >
                                <LogOut className="w-4 h-4" />
                                <span>로그아웃</span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* 하단 링크 - pb-20으로 모바일 하단 네비(68px) 겹침 방지 */}
            <div className="p-3 pb-20 border-t border-gray-200 dark:border-gray-700 space-y-1">
                <button
                    data-tutorial-id="sidebar-inquiry"
                    onClick={() => {
                        onOpenInquiry?.();
                        if (isMobile) onClose();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                >
                    <HelpCircle className="w-4 h-4" />
                    <span>질문/신고</span>
                </button>
                <button
                    data-tutorial-id="sidebar-suggestion"
                    onClick={() => {
                        onOpenSuggestion?.();
                        if (isMobile) onClose();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                >
                    <Lightbulb className="w-4 h-4" />
                    <span>건의사항</span>
                </button>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center pt-2">
                    메멘토애니 v1.0
                </p>
            </div>
        </div>
    );

    // 모바일: 오버레이 사이드바
    // transition 제거 - 모바일 깜빡임 방지
    if (isMobile) {
        if (!isOpen) return null; // 닫혀있으면 아예 렌더링 안 함

        return (
            <>
                {/* 백드롭 — z-[65]로 헤더(z-[60])보다 위에 표시 */}
                <div
                    className="fixed inset-0 bg-black/50 z-[65]"
                    onClick={onClose}
                />

                {/* 사이드바 패널 — z-[70]으로 헤더(z-[60])보다 위에 표시 */}
                <div
                    className={cn(
                        "fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-900 z-[70] shadow-xl overscroll-contain",
                        hasModalOpen ? "overflow-hidden" : "overflow-y-auto"
                    )}
                    style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
                >
                    {sidebarContent}
                </div>
            </>
        );
    }

    // 데스크탑: 고정 사이드바
    return (
        <aside
            className={cn(
                "flex flex-col w-[420px] h-full overflow-y-auto",
                isMemorialMode
                    ? "bg-memorial-50/80 dark:bg-gray-900/80"
                    : "bg-white/80 dark:bg-gray-900/80",
                "backdrop-blur-lg",
                isMemorialMode
                    ? "border-r border-memorial-200/50 dark:border-gray-700/50"
                    : "border-r border-gray-200/50 dark:border-gray-700/50",
                "transition-all duration-700 ease-in-out"
            )}
        >
            {sidebarContent}
        </aside>
    );
}

// 서브카테고리 목록 export (다른 컴포넌트에서 사용)
export { COMMUNITY_SUBCATEGORIES, MAIN_CATEGORIES };
