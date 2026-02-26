/**
 * useAdoption.ts
 * 입양 정보 데이터 페칭, 필터링, 페이지네이션을 관리하는 커스텀 훅
 *
 * AdoptionPage에서 추출한 데이터/필터 로직
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { API } from "@/config/apiEndpoints";
import type { AdoptionAnimal } from "@/app/api/adoption/route";

const PAGE_SIZE = 12;

export function useAdoption() {
    // 데이터
    const [animals, setAnimals] = useState<AdoptionAnimal[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isMock, setIsMock] = useState(false);

    // 필터
    const [kindFilter, setKindFilter] = useState<"all" | "dog" | "cat" | "etc">("all");
    const [regionFilter, setRegionFilter] = useState("");
    const [stateFilter, setStateFilter] = useState<"all" | "notice" | "protect">("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchInput, setSearchInput] = useState("");

    // 뷰 & 페이지
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [page, setPage] = useState(1);
    const [showFilters, setShowFilters] = useState(false);

    // 상세 모달
    const [selectedAnimal, setSelectedAnimal] = useState<AdoptionAnimal | null>(null);

    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

    // 데이터 가져오기
    const fetchAnimals = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                page: page.toString(),
                size: PAGE_SIZE.toString(),
                kind: kindFilter,
                state: stateFilter,
            });

            if (regionFilter) params.set("region", regionFilter);
            if (searchQuery) params.set("search", searchQuery);

            const res = await fetch(`${API.ADOPTION}?${params.toString()}`);
            if (!res.ok) throw new Error("데이터를 불러오지 못했습니다");

            const data = await res.json();
            setAnimals(data.animals || []);
            setTotalCount(data.totalCount || 0);
            setIsMock(data.isMock || false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "오류가 발생했습니다");
        } finally {
            setIsLoading(false);
        }
    }, [page, kindFilter, regionFilter, stateFilter, searchQuery]);

    useEffect(() => {
        fetchAnimals();
    }, [fetchAnimals]);

    // 검색 실행
    const handleSearch = () => {
        setSearchQuery(searchInput.trim());
        setPage(1);
    };

    // 필터 변경 시 페이지 리셋
    const handleKindChange = (kind: typeof kindFilter) => {
        setKindFilter(kind);
        setPage(1);
    };
    const handleRegionChange = (region: string) => {
        setRegionFilter(region);
        setPage(1);
    };
    const handleStateChange = (state: typeof stateFilter) => {
        setStateFilter(state);
        setPage(1);
    };

    return {
        // 데이터
        animals,
        totalCount,
        isLoading,
        error,
        isMock,

        // 필터
        kindFilter,
        regionFilter,
        stateFilter,
        searchInput,
        setSearchInput,
        showFilters,
        setShowFilters,

        // 뷰 & 페이지
        viewMode,
        setViewMode,
        page,
        setPage,
        totalPages,

        // 상세 모달
        selectedAnimal,
        setSelectedAnimal,

        // 액션
        fetchAnimals,
        handleSearch,
        handleKindChange,
        handleRegionChange,
        handleStateChange,
    };
}
