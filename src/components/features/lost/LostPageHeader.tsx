/**
 * LostPageHeader.tsx
 * 분실동물 페이지 헤더 영역
 * 통계 표시, 실종/발견 신고 버튼, 필터(타입/지역/동물종류/검색)를 포함
 */

"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Search, AlertTriangle, Eye } from "lucide-react";
import { REGIONS } from "@/components/features/lost/lostTypes";

interface LostPageHeaderProps {
    lostCount: number;
    foundCount: number;
    selectedType: string;
    setSelectedType: (v: string) => void;
    selectedRegion: string;
    setSelectedRegion: (v: string) => void;
    selectedDistrict: string;
    setSelectedDistrict: (v: string) => void;
    districts: string[];
    selectedPetType: string;
    setSelectedPetType: (v: string) => void;
    searchInput: string;
    setSearchInput: (v: string) => void;
    onSearch: () => void;
    onCreateLost: () => void;
    onCreateFound: () => void;
}

export default function LostPageHeader({
    lostCount,
    foundCount,
    selectedType,
    setSelectedType,
    selectedRegion,
    setSelectedRegion,
    selectedDistrict,
    setSelectedDistrict,
    districts,
    selectedPetType,
    setSelectedPetType,
    searchInput,
    setSearchInput,
    onSearch,
    onCreateLost,
    onCreateFound,
}: LostPageHeaderProps) {
    return (
        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-white/50 dark:border-gray-700/50 rounded-3xl p-6">
            <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Search className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
                            분실동물 찾기
                        </h1>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            잃어버린 가족을 찾아요
                        </p>
                    </div>
                </div>
                {/* 신고 버튼 */}
                <div className="grid grid-cols-2 gap-2">
                    <Button
                        variant="outline"
                        className="rounded-xl border-orange-300 dark:border-orange-600 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30"
                        onClick={onCreateLost}
                    >
                        <AlertTriangle className="w-4 h-4 mr-1 sm:mr-2" />
                        <span className="text-sm">실종 신고</span>
                    </Button>
                    <Button
                        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-xl"
                        onClick={onCreateFound}
                    >
                        <Eye className="w-4 h-4 mr-1 sm:mr-2" />
                        <span className="text-sm">발견 신고</span>
                    </Button>
                </div>
            </div>

            {/* 통계 */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-orange-100/50 dark:bg-orange-900/20 rounded-2xl p-4 text-center">
                    <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                        {lostCount}
                    </div>
                    <div className="text-sm text-orange-700 dark:text-orange-300">
                        실종 신고
                    </div>
                </div>
                <div className="bg-green-100/50 dark:bg-green-900/20 rounded-2xl p-4 text-center">
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                        {foundCount}
                    </div>
                    <div className="text-sm text-green-700 dark:text-green-300">
                        발견 신고
                    </div>
                </div>
            </div>

            {/* 필터 */}
            <div className="space-y-4">
                {/* 실종/발견 타입 */}
                <div className="flex gap-2">
                    <Button
                        variant={selectedType === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedType("all")}
                        className={`rounded-xl ${selectedType === "all" ? "bg-gradient-to-r from-orange-500 to-red-500 border-0" : "dark:border-gray-600 dark:text-gray-300"}`}
                    >
                        전체
                    </Button>
                    <Button
                        variant={selectedType === "lost" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedType("lost")}
                        className={`rounded-xl ${selectedType === "lost" ? "bg-orange-500 border-0" : "border-orange-300 text-orange-600 dark:border-orange-600 dark:text-orange-400"}`}
                    >
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        실종
                    </Button>
                    <Button
                        variant={selectedType === "found" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedType("found")}
                        className={`rounded-xl ${selectedType === "found" ? "bg-green-500 border-0" : "border-green-300 text-green-600 dark:border-green-600 dark:text-green-400"}`}
                    >
                        <Eye className="w-4 h-4 mr-1" />
                        발견
                    </Button>
                </div>

                {/* 지역 & 동물 종류 */}
                <div className="flex flex-wrap gap-3">
                    <Select
                        value={selectedRegion}
                        onValueChange={(v) => {
                            setSelectedRegion(v);
                            setSelectedDistrict("");
                        }}
                    >
                        <SelectTrigger className="w-32 rounded-xl bg-white/70 dark:bg-gray-700/70 dark:border-gray-600">
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

                    {districts.length > 0 && (
                        <Select
                            value={selectedDistrict}
                            onValueChange={setSelectedDistrict}
                        >
                            <SelectTrigger className="w-32 rounded-xl bg-white/70 dark:bg-gray-700/70 dark:border-gray-600">
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
                    )}

                    <Select
                        value={selectedPetType}
                        onValueChange={setSelectedPetType}
                    >
                        <SelectTrigger className="w-32 rounded-xl bg-white/70 dark:bg-gray-700/70 dark:border-gray-600">
                            <SelectValue placeholder="동물 종류" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">전체</SelectItem>
                            <SelectItem value="강아지">강아지</SelectItem>
                            <SelectItem value="고양이">고양이</SelectItem>
                            <SelectItem value="기타">기타</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="flex-1 min-w-[200px] relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="품종, 특징 등 검색"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && onSearch()}
                            className="pl-10 rounded-xl bg-white/70 dark:bg-gray-700/70 dark:border-gray-600"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
