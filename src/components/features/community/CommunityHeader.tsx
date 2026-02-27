/**
 * CommunityHeader.tsx
 * 커뮤니티 헤더 - 서브카테고리 탭, 말머리 필터, 검색, 정렬
 *
 * CommunityPage에서 추출한 UI 컴포넌트
 */

"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Users,
    PenSquare,
    Search,
    Clock,
    TrendingUp,
    MessageCircle,
} from "lucide-react";
import type { CommunitySubcategory, PostTag } from "@/types";
import {
    SUBCATEGORIES,
    POST_TAGS,
    FREE_BADGES,
    getTagColor,
    getCategoryColor,
} from "./communityTypes";

interface CommunityHeaderProps {
    currentSubcategory: CommunitySubcategory;
    visibleSubcategories: typeof SUBCATEGORIES;
    selectedTag: PostTag | "all";
    selectedBadge: string;
    searchInput: string;
    sortBy: string;
    currentColor: ReturnType<typeof getCategoryColor>;
    onSubcategoryChange: (subId: CommunitySubcategory) => void;
    onTagChange: (tag: PostTag | "all") => void;
    onBadgeChange: (badge: string) => void;
    onSearchInputChange: (value: string) => void;
    onSearchSubmit: () => void;
    onSortChange: (sort: string) => void;
    onWriteClick: () => void;
}

export default function CommunityHeader({
    currentSubcategory,
    visibleSubcategories,
    selectedTag,
    selectedBadge,
    searchInput,
    sortBy,
    currentColor,
    onSubcategoryChange,
    onTagChange,
    onBadgeChange,
    onSearchInputChange,
    onSearchSubmit,
    onSortChange,
    onWriteClick,
}: CommunityHeaderProps) {
    return (
        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-white/50 dark:border-gray-700/50 rounded-3xl p-6">
            <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-memento-500 to-memento-400 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl font-display font-bold text-gray-800 dark:text-gray-100">
                            커뮤니티
                        </h1>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            함께 나누는 이야기
                        </p>
                    </div>
                </div>
                <Button
                    onClick={onWriteClick}
                    className={`bg-gradient-to-r ${currentColor.bg} hover:opacity-90 rounded-xl flex-shrink-0 px-3 sm:px-4 min-h-[44px] active:scale-95 transition-transform`}
                >
                    <PenSquare className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">글쓰기</span>
                </Button>
            </div>

            {/* 서브카테고리 탭 */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 mb-4" data-tutorial-id="community-boards">
                {visibleSubcategories.map((sub) => {
                    const Icon = sub.icon;
                    const isActive = currentSubcategory === sub.id;
                    const color = getCategoryColor(sub.color);
                    return (
                        <button
                            key={sub.id}
                            onClick={() => onSubcategoryChange(sub.id)}
                            className={`p-2.5 sm:p-3 min-h-[44px] rounded-xl sm:rounded-2xl border-2 transition-all active:scale-95 ${
                                isActive
                                    ? `bg-gradient-to-r ${color.bg} text-white border-transparent shadow-lg`
                                    : `bg-white/50 dark:bg-gray-700/50 ${color.border} hover:shadow-md`
                            }`}
                        >
                            <div className="flex items-center justify-center sm:justify-start gap-1.5">
                                <Icon
                                    className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-white" : color.text}`}
                                />
                                <span
                                    className={`font-bold text-xs sm:text-sm whitespace-nowrap ${isActive ? "text-white" : "text-gray-800 dark:text-gray-100"}`}
                                >
                                    {sub.label}
                                </span>
                            </div>
                            <p
                                className={`text-xs mt-1 hidden sm:block truncate ${isActive ? "text-white/80" : "text-gray-500 dark:text-gray-400"}`}
                            >
                                {sub.description}
                            </p>
                        </button>
                    );
                })}
            </div>

            {/* 뱃지(게시글 유형) 필터 - 자유게시판일 때만 */}
            {currentSubcategory === "free" && (
                <div className="flex flex-wrap gap-2 mb-3 p-3 bg-memento-50/50 dark:bg-memento-900/20 rounded-xl border border-memento-200/50 dark:border-memento-700/30">
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-full mb-1 font-medium">게시글 유형</span>
                    <button
                        onClick={() => onBadgeChange("all")}
                        className={`px-3 py-1.5 min-h-[44px] rounded-full text-sm font-medium transition-all active:scale-95 ${
                            selectedBadge === "all"
                                ? "bg-memento-500 text-white shadow-md"
                                : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-memento-100 dark:hover:bg-memento-800/30 border border-memento-200 dark:border-memento-700/50"
                        }`}
                    >
                        전체
                    </button>
                    {FREE_BADGES.map((b) => {
                        const isActive = selectedBadge === b.id;
                        return (
                            <button
                                key={b.id}
                                onClick={() => onBadgeChange(b.id)}
                                className={`px-3 py-1.5 min-h-[44px] rounded-full text-sm font-medium transition-all active:scale-95 border ${
                                    isActive
                                        ? getTagColor(b.color).replace("border-", "border-transparent bg-").split(" ").slice(0, 2).join(" ") + " text-white shadow-md"
                                        : getTagColor(b.color)
                                }`}
                            >
                                {b.label}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* 말머리 필터 - 자유게시판일 때만 */}
            {currentSubcategory === "free" && (
                <div className="flex flex-wrap gap-2 mb-4 p-3 bg-blue-50/50 dark:bg-blue-900/20 rounded-xl border border-blue-200/50 dark:border-blue-700/30">
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-full mb-1 font-medium">말머리</span>
                    <button
                        onClick={() => onTagChange("all")}
                        className={`px-3 py-1.5 min-h-[44px] rounded-full text-sm font-medium transition-all active:scale-95 ${
                            selectedTag === "all"
                                ? "bg-memento-500 text-white shadow-md"
                                : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-800/30 border border-blue-200 dark:border-blue-700/50"
                        }`}
                    >
                        전체
                    </button>
                    {POST_TAGS.map((tag) => {
                        const isActive = selectedTag === tag.id;
                        return (
                            <button
                                key={tag.id}
                                onClick={() => onTagChange(tag.id)}
                                className={`px-3 py-1.5 min-h-[44px] rounded-full text-sm font-medium transition-all active:scale-95 border ${
                                    isActive
                                        ? getTagColor(tag.color).replace("border-", "border-transparent bg-").split(" ").slice(0, 2).join(" ") + " text-white shadow-md"
                                        : getTagColor(tag.color)
                                }`}
                            >
                                {tag.label}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* 검색 & 정렬 */}
            <div className="space-y-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="검색어를 입력하세요"
                        value={searchInput}
                        onChange={(e) => onSearchInputChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") onSearchSubmit();
                        }}
                        maxLength={100}
                        className="pl-10 rounded-xl bg-white/70 dark:bg-gray-700/70"
                    />
                </div>
                <div className="flex justify-center sm:justify-end">
                    <div className="inline-flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                        {[
                            { id: "latest", label: "최신", icon: Clock },
                            { id: "popular", label: "인기", icon: TrendingUp },
                            { id: "comments", label: "댓글", icon: MessageCircle },
                        ].map((sort) => {
                            const Icon = sort.icon;
                            return (
                                <Button
                                    key={sort.id}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onSortChange(sort.id)}
                                    className={`rounded-lg px-2 sm:px-3 min-h-[44px] active:scale-95 transition-transform ${sortBy === sort.id ? "bg-white dark:bg-gray-700 shadow-sm" : ""}`}
                                >
                                    <Icon className="w-4 h-4 sm:mr-1" />
                                    <span className="hidden sm:inline">{sort.label}</span>
                                </Button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
