/**
 * 사이드바 네비게이션 컴포넌트
 * - 5개 메인 카테고리 + 커뮤니티 하위 펼침
 * - 반응형: 데스크탑(고정), 모바일(오버레이)
 */

"use client";

import React, { useState, useEffect } from "react";
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
    Heart,
    MapPin,
    Search,
    Cloud,
    Coffee,
    HelpCircle,
    Lightbulb,
    Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import type { MainCategory, CommunitySubcategory, TabType } from "@/types";
import { isAdmin } from "@/types";

// 메인 카테고리 정의
const MAIN_CATEGORIES: {
    id: MainCategory;
    label: string;
    icon: React.ElementType;
    hasSubcategories?: boolean;
}[] = [
    { id: "home", label: "홈", icon: Home },
    { id: "record", label: "우리의 기록", icon: Camera },
    { id: "community", label: "커뮤니티", icon: Users, hasSubcategories: true },
    { id: "ai-chat", label: "AI 펫톡", icon: MessageCircle },
    { id: "magazine", label: "펫매거진", icon: BookOpen },
];

// 커뮤니티 서브카테고리 정의
const COMMUNITY_SUBCATEGORIES: {
    id: CommunitySubcategory;
    label: string;
    icon: React.ElementType;
    color: string;
}[] = [
    { id: "free", label: "자유게시판", icon: Coffee, color: "text-blue-500" },
    { id: "memorial", label: "추모게시판", icon: Cloud, color: "text-violet-500" },
    { id: "adoption", label: "입양정보", icon: Heart, color: "text-rose-500" },
    { id: "local", label: "지역정보", icon: MapPin, color: "text-emerald-500" },
    { id: "lost", label: "분실동물", icon: Search, color: "text-amber-500" },
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
}: SidebarProps) {
    const { user } = useAuth();
    const [expandedCategory, setExpandedCategory] = useState<MainCategory | null>(
        selectedTab === "community" ? "community" : null
    );

    // 관리자 여부 확인
    const isAdminUser = isAdmin(user?.email);

    // 탭이 변경되면 커뮤니티 확장 상태 업데이트
    useEffect(() => {
        if (selectedTab === "community") {
            setExpandedCategory("community");
        }
    }, [selectedTab]);

    const handleMainCategoryClick = (category: MainCategory) => {
        if (category === "community") {
            // 커뮤니티는 펼침/접힘 토글
            setExpandedCategory(prev => prev === "community" ? null : "community");
            // 커뮤니티 탭으로 이동 (기본 서브카테고리: free)
            onTabChange("community");
            if (onSubcategoryChange && !subcategory) {
                onSubcategoryChange("free");
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
        onSubcategoryChange?.(sub);
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
        <div className="flex flex-col h-full">
            {/* 모바일 헤더 */}
            {isMobile && (
                <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-lg font-bold text-gray-800 dark:text-white">메뉴</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="p-2"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>
            )}

            {/* 네비게이션 목록 - 스크롤 영역 */}
            <nav className="flex-1 min-h-0 p-4 space-y-1 overflow-y-auto">
                {MAIN_CATEGORIES.map((category) => (
                    <div key={category.id}>
                        {/* 메인 카테고리 버튼 */}
                        <button
                            onClick={() => handleMainCategoryClick(category.id)}
                            className={cn(
                                "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all",
                                "hover:bg-gray-100 dark:hover:bg-gray-800",
                                isMainCategoryActive(category.id)
                                    ? "bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 font-medium"
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
                                {COMMUNITY_SUBCATEGORIES.map((sub) => (
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
                        <Shield className="w-5 h-5" />
                        <span>관리자</span>
                    </button>
                )}
            </nav>

            {/* 하단 링크 - 항상 고정 */}
            <div className="flex-shrink-0 p-3 border-t border-gray-200 dark:border-gray-700 space-y-1 bg-white dark:bg-gray-900">
                <button
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
    if (isMobile) {
        return (
            <>
                {/* 백드롭 */}
                {isOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
                        onClick={onClose}
                    />
                )}

                {/* 사이드바 패널 */}
                <div
                    className={cn(
                        "fixed top-0 left-0 h-full w-72 bg-white dark:bg-gray-900 z-50",
                        "transform transition-transform duration-300 ease-in-out",
                        "shadow-xl",
                        isOpen ? "translate-x-0" : "-translate-x-full"
                    )}
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
                "flex flex-col w-56 h-full overflow-y-auto",
                "bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg",
                "border-r border-gray-200/50 dark:border-gray-700/50",
                "transition-all duration-300"
            )}
        >
            {sidebarContent}
        </aside>
    );
}

// 서브카테고리 목록 export (다른 컴포넌트에서 사용)
export { COMMUNITY_SUBCATEGORIES, MAIN_CATEGORIES };
