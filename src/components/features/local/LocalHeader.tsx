/**
 * LocalHeader.tsx
 * 지역정보 헤더 - 지역 선택, 검색, 카테고리 필터
 *
 * LocalPage에서 추출한 UI 컴포넌트
 */

"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { MapPin, Search, PenSquare, X } from "lucide-react";
import { REGIONS, CATEGORIES } from "./localTypes";

interface LocalHeaderProps {
    selectedRegion: string;
    selectedDistrict: string;
    selectedCategory: string;
    searchInput: string;
    onRegionChange: (region: string) => void;
    onDistrictChange: (district: string) => void;
    onCategoryChange: (category: string) => void;
    onSearchInputChange: (value: string) => void;
    onSearchSubmit: () => void;
    onClearRegion: () => void;
    onWriteClick: () => void;
}

export default function LocalHeader({
    selectedRegion,
    selectedDistrict,
    selectedCategory,
    searchInput,
    onRegionChange,
    onDistrictChange,
    onCategoryChange,
    onSearchInputChange,
    onSearchSubmit,
    onClearRegion,
    onWriteClick,
}: LocalHeaderProps) {
    const districts = selectedRegion ? REGIONS[selectedRegion] || [] : [];

    return (
        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-white/50 dark:border-gray-700/50 rounded-3xl p-6">
            <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-memento-500 to-memento-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl font-display font-bold text-gray-800 dark:text-gray-100">
                            지역정보
                        </h1>
                        <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                            우리 동네 반려동물 이야기
                        </p>
                    </div>
                </div>
                <Button
                    onClick={onWriteClick}
                    className="bg-gradient-to-r from-memento-500 to-memento-500 hover:from-memento-600 hover:to-memento-600 rounded-xl flex-shrink-0 px-3 sm:px-4"
                >
                    <PenSquare className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">글쓰기</span>
                </Button>
            </div>

            {/* 지역 선택 */}
            <div className="space-y-3 mb-4">
                <div className="flex gap-2">
                    <Select
                        value={selectedRegion}
                        onValueChange={(v) => {
                            onRegionChange(v);
                            onDistrictChange("");
                        }}
                    >
                        <SelectTrigger className="flex-1 rounded-xl bg-white/70 dark:bg-gray-700/70 dark:border-gray-600">
                            <SelectValue placeholder="시/도" />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.keys(REGIONS).map((region) => (
                                <SelectItem key={region} value={region}>
                                    {region}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={selectedDistrict}
                        onValueChange={onDistrictChange}
                        disabled={!selectedRegion}
                    >
                        <SelectTrigger className="flex-1 rounded-xl bg-white/70 dark:bg-gray-700/70 dark:border-gray-600">
                            <SelectValue placeholder="구/군" />
                        </SelectTrigger>
                        <SelectContent>
                            {districts.map((district) => (
                                <SelectItem key={district} value={district}>
                                    {district}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {selectedRegion && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onClearRegion}
                            aria-label="지역 선택 초기화"
                            className="rounded-xl dark:border-gray-600 px-3"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    )}
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="검색어를 입력하세요"
                        value={searchInput}
                        onChange={(e) => onSearchInputChange(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && onSearchSubmit()}
                        className="pl-10 rounded-xl bg-white/70 dark:bg-gray-700/70 dark:border-gray-600"
                    />
                </div>
            </div>

            {/* 카테고리 필터 */}
            <div className="grid grid-cols-4 sm:flex sm:flex-wrap gap-1.5 sm:gap-2">
                {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isActive = selectedCategory === cat.id;
                    return (
                        <Button
                            key={cat.id}
                            variant={isActive ? "default" : "outline"}
                            size="sm"
                            onClick={() => onCategoryChange(cat.id)}
                            className={`rounded-xl flex-col sm:flex-row h-auto py-2 sm:py-1.5 px-1 sm:px-3 ${
                                isActive
                                    ? "bg-gradient-to-r from-memento-500 to-memento-500 text-white border-0"
                                    : "bg-white/50 dark:bg-gray-700/50 border-memento-200 dark:border-memento-700 dark:text-gray-300"
                            }`}
                        >
                            <Icon className="w-4 h-4 sm:mr-1" />
                            <span className="text-[11px] sm:text-sm mt-0.5 sm:mt-0 leading-tight">{cat.label}</span>
                        </Button>
                    );
                })}
            </div>
        </div>
    );
}
