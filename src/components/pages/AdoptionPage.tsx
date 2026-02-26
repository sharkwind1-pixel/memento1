/**
 * AdoptionPage.tsx
 * 입양 정보 페이지
 * - 공공데이터포털 유기동물 API 연동 (API 키 없으면 목업 데이터)
 * - 종류/지역/상태 필터 + 검색
 * - 그리드/리스트 뷰 + 상세 모달
 * - 페이지네이션
 */

"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    ArrowLeft,
    Users,
    Filter,
    Grid3X3,
    List,
    Info,
    AlertCircle,
    RefreshCw,
    Dog,
} from "lucide-react";

import { TabType } from "@/types";
import {
    useAdoption,
    AnimalDetailModal,
    AnimalGridCard,
    AnimalListCard,
    AdoptionFilters,
    AdoptionPagination,
} from "@/components/features/adoption";

interface AdoptionPageProps {
    setSelectedTab: (tab: TabType) => void;
}

function AdoptionPage({ setSelectedTab }: AdoptionPageProps) {
    const {
        animals,
        totalCount,
        isLoading,
        error,
        isMock,
        kindFilter,
        regionFilter,
        stateFilter,
        searchInput,
        setSearchInput,
        showFilters,
        setShowFilters,
        viewMode,
        setViewMode,
        page,
        setPage,
        totalPages,
        selectedAnimal,
        setSelectedAnimal,
        fetchAnimals,
        handleSearch,
        handleKindChange,
        handleRegionChange,
        handleStateChange,
    } = useAdoption();

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* 배경 */}
            <div className="absolute inset-0 bg-gradient-to-br from-sky-100 via-blue-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-200/30 to-sky-200/30 dark:from-blue-800/20 dark:to-sky-800/20 rounded-full blur-3xl animate-pulse" />
            </div>

            {/* 상세 모달 */}
            <AnimalDetailModal
                animal={selectedAnimal}
                onClose={() => setSelectedAnimal(null)}
            />

            <div className="relative z-10 space-y-4 pb-8">
                {/* 헤더 */}
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedTab("home")}
                        aria-label="뒤로 가기"
                        className="rounded-xl flex-shrink-0"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-gradient-to-r from-sky-500 to-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Users className="w-5 h-5 text-white" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 truncate">
                                입양 정보
                            </h1>
                            <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                                {isMock ? "샘플 데이터" : "공공데이터포털 연동"} ·{" "}
                                {totalCount}건
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowFilters(!showFilters)}
                            aria-label="필터 열기/닫기"
                            className="rounded-xl"
                        >
                            <Filter className="w-4 h-4" />
                        </Button>
                        <Button
                            variant={viewMode === "grid" ? "default" : "ghost"}
                            size="icon"
                            onClick={() => setViewMode("grid")}
                            aria-label="그리드 보기"
                            className="rounded-xl"
                        >
                            <Grid3X3 className="w-4 h-4" />
                        </Button>
                        <Button
                            variant={viewMode === "list" ? "default" : "ghost"}
                            size="icon"
                            onClick={() => setViewMode("list")}
                            aria-label="리스트 보기"
                            className="rounded-xl"
                        >
                            <List className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* 목업 안내 배너 */}
                {isMock && !isLoading && (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-gray-700/20 border border-amber-200 dark:border-gray-700/50 rounded-xl text-sm text-amber-700 dark:text-amber-300">
                        <Info className="w-4 h-4 flex-shrink-0" />
                        <span>
                            공공데이터 API 키 미설정 - 샘플 데이터를 표시합니다.
                            실제 데이터 연동은 .env.local에 OPENDATA_API_KEY를 추가하세요.
                        </span>
                    </div>
                )}

                {/* 검색 + 필터 */}
                <AdoptionFilters
                    searchInput={searchInput}
                    onSearchInputChange={setSearchInput}
                    onSearch={handleSearch}
                    onRefresh={fetchAnimals}
                    kindFilter={kindFilter}
                    onKindChange={handleKindChange}
                    showFilters={showFilters}
                    regionFilter={regionFilter}
                    onRegionChange={handleRegionChange}
                    stateFilter={stateFilter}
                    onStateChange={handleStateChange}
                />

                {/* 메인 컨텐츠 */}
                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="rounded-2xl overflow-hidden bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/50 dark:border-gray-700/50">
                                <Skeleton className="h-48 w-full" />
                                <div className="p-4 space-y-2">
                                    <Skeleton className="h-5 w-1/2" />
                                    <Skeleton className="h-4 w-3/4" />
                                    <div className="flex gap-2 pt-1">
                                        <Skeleton className="h-6 w-14 rounded-full" />
                                        <Skeleton className="h-6 w-14 rounded-full" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
                        <AlertCircle className="w-12 h-12 mb-3 text-gray-300 dark:text-gray-600" />
                        <p>{error}</p>
                        <Button
                            variant="outline"
                            className="mt-4 rounded-xl"
                            onClick={fetchAnimals}
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            다시 시도
                        </Button>
                    </div>
                ) : animals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
                        <Dog className="w-12 h-12 mb-3 text-gray-300 dark:text-gray-600" />
                        <p>조건에 맞는 동물이 없습니다</p>
                        <p className="text-sm mt-1">필터를 변경해보세요</p>
                    </div>
                ) : viewMode === "grid" ? (
                    <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-lg rounded-3xl p-4 sm:p-6 border border-white/50 dark:border-gray-700/50">
                        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                            {animals.map((animal) => (
                                <AnimalGridCard
                                    key={animal.id}
                                    animal={animal}
                                    onClick={() => setSelectedAnimal(animal)}
                                />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {animals.map((animal) => (
                            <AnimalListCard
                                key={animal.id}
                                animal={animal}
                                onClick={() => setSelectedAnimal(animal)}
                            />
                        ))}
                    </div>
                )}

                {/* 페이지네이션 */}
                {!isLoading && animals.length > 0 && (
                    <AdoptionPagination
                        page={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                    />
                )}
            </div>
        </div>
    );
}

export default React.memo(AdoptionPage);
