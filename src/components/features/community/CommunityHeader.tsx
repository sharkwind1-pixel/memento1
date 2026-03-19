/**
 * CommunityHeader.tsx
 * 커뮤니티 헤더 - 서브카테고리 탭, 말머리 필터, 검색, 정렬
 *
 * CommunityPage에서 추출한 UI 컴포넌트
 */

"use client";

import React from "react";
import { Button } from "@/components/ui/button";
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
    LOST_BADGES,
    LOCAL_REGIONS,
    getTagColor,
    getCategoryColor,
} from "./communityTypes";

interface CommunityHeaderProps {
    currentSubcategory: CommunitySubcategory;
    visibleSubcategories: typeof SUBCATEGORIES;
    selectedTag: PostTag | "all";
    selectedBadge: string;
    selectedRegion: string;
    searchInput: string;
    sortBy: string;
    currentColor: ReturnType<typeof getCategoryColor>;
    onSubcategoryChange: (subId: CommunitySubcategory) => void;
    onTagChange: (tag: PostTag | "all") => void;
    onBadgeChange: (badge: string) => void;
    onRegionChange: (region: string) => void;
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
    selectedRegion,
    searchInput,
    sortBy,
    currentColor,
    onSubcategoryChange,
    onTagChange,
    onBadgeChange,
    onRegionChange,
    onSearchInputChange,
    onSearchSubmit,
    onSortChange,
    onWriteClick,
}: CommunityHeaderProps) {
    return (
        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-white/50 dark:border-gray-700/50 rounded-3xl p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
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
                <div className="relative mb-2">
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium flex-shrink-0">유형</span>
                        <button
                            onClick={() => onBadgeChange("all")}
                            className={`px-3 py-2 rounded-full text-xs font-medium transition-all active:scale-95 flex-shrink-0 min-h-[36px] ${
                                selectedBadge === "all"
                                    ? "bg-memento-500 text-white shadow-sm"
                                    : "bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600/50"
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
                                    className={`px-3 py-2 rounded-full text-xs font-medium transition-all active:scale-95 flex-shrink-0 min-h-[36px] ${
                                        isActive
                                            ? getTagColor(b.color).replace("border-", "border-transparent bg-").split(" ").slice(0, 2).join(" ") + " text-white shadow-sm"
                                            : "bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600/50"
                                    }`}
                                >
                                    {b.label}
                                </button>
                            );
                        })}
                    </div>
                    <div className="absolute right-0 top-0 bottom-1 w-6 bg-gradient-to-l from-white/80 dark:from-gray-800/80 to-transparent pointer-events-none sm:hidden" />
                </div>
            )}

            {/* 말머리 필터 - 자유게시판일 때만 */}
            {currentSubcategory === "free" && (
                <div className="relative mb-3">
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium flex-shrink-0">말머리</span>
                        <button
                            onClick={() => onTagChange("all")}
                            className={`px-3 py-2 rounded-full text-xs font-medium transition-all active:scale-95 flex-shrink-0 min-h-[36px] ${
                                selectedTag === "all"
                                    ? "bg-memento-500 text-white shadow-sm"
                                    : "bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600/50"
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
                                    className={`px-3 py-2 rounded-full text-xs font-medium transition-all active:scale-95 flex-shrink-0 min-h-[36px] ${
                                        isActive
                                            ? getTagColor(tag.color).replace("border-", "border-transparent bg-").split(" ").slice(0, 2).join(" ") + " text-white shadow-sm"
                                            : "bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600/50"
                                    }`}
                                >
                                    {tag.label}
                                </button>
                            );
                        })}
                    </div>
                    <div className="absolute right-0 top-0 bottom-1 w-6 bg-gradient-to-l from-white/80 dark:from-gray-800/80 to-transparent pointer-events-none sm:hidden" />
                </div>
            )}

            {/* 지역 필터 - 지역정보 게시판일 때만 */}
            {currentSubcategory === "local" && (
                <div className="relative mb-3">
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium flex-shrink-0">지역</span>
                        <button
                            onClick={() => onRegionChange("all")}
                            className={`px-3 py-2 rounded-full text-xs font-medium transition-all active:scale-95 flex-shrink-0 min-h-[36px] ${
                                selectedRegion === "all"
                                    ? "bg-emerald-500 text-white shadow-sm"
                                    : "bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600/50"
                            }`}
                        >
                            전체
                        </button>
                        {LOCAL_REGIONS.map((r) => (
                            <button
                                key={r.id}
                                onClick={() => onRegionChange(r.id)}
                                className={`px-3 py-2 rounded-full text-xs font-medium transition-all active:scale-95 flex-shrink-0 min-h-[36px] ${
                                    selectedRegion === r.id
                                        ? "bg-emerald-500 text-white shadow-sm"
                                        : "bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600/50"
                                }`}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                    <div className="absolute right-0 top-0 bottom-1 w-6 bg-gradient-to-l from-white/80 dark:from-gray-800/80 to-transparent pointer-events-none sm:hidden" />
                </div>
            )}

            {/* 분실/발견 필터 - 분실동물 게시판일 때만 */}
            {currentSubcategory === "lost" && (
                <div className="relative mb-3">
                    <div className="flex items-center gap-2 pb-1">
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium flex-shrink-0">유형</span>
                        <button
                            onClick={() => onBadgeChange("all")}
                            className={`px-3 py-2 rounded-full text-xs font-medium transition-all active:scale-95 flex-shrink-0 min-h-[36px] ${
                                selectedBadge === "all"
                                    ? "bg-amber-500 text-white shadow-sm"
                                    : "bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600/50"
                            }`}
                        >
                            전체
                        </button>
                        {LOST_BADGES.map((b) => {
                            const isActive = selectedBadge === b.id;
                            return (
                                <button
                                    key={b.id}
                                    onClick={() => onBadgeChange(b.id)}
                                    className={`px-3 py-2 rounded-full text-xs font-medium transition-all active:scale-95 flex-shrink-0 min-h-[36px] ${
                                        isActive
                                            ? b.color === "red"
                                                ? "bg-red-500 text-white shadow-sm"
                                                : "bg-emerald-500 text-white shadow-sm"
                                            : "bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600/50"
                                    }`}
                                >
                                    {b.label}
                                </button>
                            );
                        })}
                    </div>
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
