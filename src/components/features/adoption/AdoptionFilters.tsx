/**
 * AdoptionFilters.tsx
 * 입양 정보 검색바 + 종류 필터 탭 + 확장 필터 (지역/상태)
 */

"use client";

import React from "react";
import useHorizontalScroll from "@/hooks/useHorizontalScroll";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Dog, Cat, RefreshCw } from "lucide-react";
import { REGIONS } from "./adoptionTypes";

interface AdoptionFiltersProps {
    searchInput: string;
    onSearchInputChange: (value: string) => void;
    onSearch: () => void;
    onRefresh: () => void;
    kindFilter: "all" | "dog" | "cat" | "etc";
    onKindChange: (kind: "all" | "dog" | "cat" | "etc") => void;
    showFilters: boolean;
    regionFilter: string;
    onRegionChange: (region: string) => void;
    stateFilter: "all" | "notice" | "protect";
    onStateChange: (state: "all" | "notice" | "protect") => void;
}

export function AdoptionFilters({
    searchInput,
    onSearchInputChange,
    onSearch,
    onRefresh,
    kindFilter,
    onKindChange,
    showFilters,
    regionFilter,
    onRegionChange,
    stateFilter,
    onStateChange,
}: AdoptionFiltersProps) {
    const filterScrollRef = useHorizontalScroll();

    return (
        <>
            {/* 검색바 */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="품종, 지역, 보호소로 검색..."
                        value={searchInput}
                        onChange={(e) => onSearchInputChange(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && onSearch()}
                        className="pl-10 rounded-xl bg-white/80 dark:bg-gray-800/80 border-white/50 dark:border-gray-700/50"
                    />
                </div>
                <Button
                    onClick={onSearch}
                    className="bg-memento-500 hover:bg-memento-600 rounded-xl"
                >
                    검색
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={onRefresh}
                    aria-label="새로고침"
                    className="rounded-xl flex-shrink-0"
                >
                    <RefreshCw className="w-4 h-4" />
                </Button>
            </div>

            {/* 종류 필터 탭 */}
            <div ref={filterScrollRef} className="flex gap-2 overflow-x-auto pb-1">
                {[
                    { value: "all" as const, label: "전체", icon: null },
                    { value: "dog" as const, label: "강아지", icon: Dog },
                    { value: "cat" as const, label: "고양이", icon: Cat },
                    { value: "etc" as const, label: "기타", icon: null },
                ].map(({ value, label, icon: Icon }) => (
                    <Button
                        key={value}
                        variant={kindFilter === value ? "default" : "outline"}
                        size="sm"
                        onClick={() => onKindChange(value)}
                        className={`rounded-xl flex-shrink-0 ${
                            kindFilter === value
                                ? "bg-memento-500 hover:bg-memento-600"
                                : "bg-white/60 dark:bg-gray-800/60"
                        }`}
                    >
                        {Icon && <Icon className="w-4 h-4 mr-1" />}
                        {label}
                    </Button>
                ))}
            </div>

            {/* 확장 필터 */}
            {showFilters && (
                <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 border border-white/50 dark:border-gray-700/50 space-y-3">
                    <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                            지역
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            {REGIONS.map((r) => (
                                <button
                                    key={r.code}
                                    onClick={() => onRegionChange(r.code)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                                        regionFilter === r.code
                                            ? "bg-memento-500 text-white"
                                            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                                    }`}
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                            상태
                        </label>
                        <div className="flex gap-2">
                            {[
                                { value: "all" as const, label: "전체" },
                                { value: "notice" as const, label: "공고중" },
                                { value: "protect" as const, label: "보호중" },
                            ].map(({ value, label }) => (
                                <button
                                    key={value}
                                    onClick={() => onStateChange(value)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                        stateFilter === value
                                            ? "bg-memento-500 text-white"
                                            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
