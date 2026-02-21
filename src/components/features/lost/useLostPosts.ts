/**
 * useLostPosts.ts
 * 분실동물 게시글 목록 조회, 필터링, 검색, 페이지네이션을 관리하는 커스텀 훅
 *
 * LostPage에서 추출한 데이터 패칭 및 필터 로직
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { API } from "@/config/apiEndpoints";
import { toast } from "sonner";
import type { LostPetPost } from "@/components/features/lost/lostTypes";
import { REGIONS } from "@/components/features/lost/lostTypes";

export function useLostPosts() {
    // 목록 상태
    const [posts, setPosts] = useState<LostPetPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalPages, setTotalPages] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);

    // 필터 상태
    const [selectedType, setSelectedType] = useState<string>("all");
    const [selectedRegion, setSelectedRegion] = useState<string>("전체");
    const [selectedDistrict, setSelectedDistrict] = useState<string>("");
    const [selectedPetType, setSelectedPetType] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [searchInput, setSearchInput] = useState<string>("");

    // 통계
    const [lostCount, setLostCount] = useState(0);
    const [foundCount, setFoundCount] = useState(0);

    // 구/군 목록 (필터용)
    const districts =
        selectedRegion && selectedRegion !== "전체"
            ? REGIONS[selectedRegion] || []
            : [];

    // 게시글 목록 조회
    const fetchPosts = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set("page", page.toString());
            params.set("size", "20");
            if (selectedType !== "all") params.set("type", selectedType);
            if (selectedPetType !== "all") params.set("petType", selectedPetType);
            if (selectedRegion !== "전체") params.set("region", selectedRegion);
            if (searchQuery) params.set("search", searchQuery);

            const res = await fetch(`${API.LOST_PETS}?${params.toString()}`);
            if (!res.ok) throw new Error("게시글 목록 조회 실패");

            const data = await res.json();
            setPosts(data.posts || []);
            setTotalPages(data.totalPages || 0);
            setTotalCount(data.total || 0);
        } catch {
            toast.error("게시글을 불러오지 못했습니다.");
            setPosts([]);
        } finally {
            setLoading(false);
        }
    }, [page, selectedType, selectedPetType, selectedRegion, searchQuery]);

    // 통계 가져오기 (전체 실종/발견 수)
    const fetchStats = useCallback(async () => {
        try {
            const [lostRes, foundRes] = await Promise.all([
                fetch(`${API.LOST_PETS}?type=lost&size=1`),
                fetch(`${API.LOST_PETS}?type=found&size=1`),
            ]);
            if (lostRes.ok) {
                const d = await lostRes.json();
                setLostCount(d.total || 0);
            }
            if (foundRes.ok) {
                const d = await foundRes.json();
                setFoundCount(d.total || 0);
            }
        } catch {
            // 통계 실패는 무시
        }
    }, []);

    // 초기 데이터 로드
    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    // 검색 debounce
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // 검색 실행 (Enter 키 또는 버튼)
    const handleSearch = () => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        setSearchQuery(searchInput.trim());
        setPage(1);
    };

    // 검색어 debounce: 타이핑 후 300ms 후 자동 검색
    useEffect(() => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
            const trimmed = searchInput.trim();
            // handleSearch에서 이미 설정된 같은 값이면 skip (이중 실행 방지)
            setSearchQuery((prev) => {
                if (prev === trimmed) return prev;
                setPage(1);
                return trimmed;
            });
        }, 300);
        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        };
    }, [searchInput]);

    // 필터 변경 시 페이지 리셋
    useEffect(() => {
        setPage(1);
    }, [selectedType, selectedPetType, selectedRegion]);

    // 필터 초기화
    const resetFilters = () => {
        setSelectedType("all");
        setSelectedPetType("all");
        setSelectedRegion("전체");
        setSelectedDistrict("");
        setSearchQuery("");
        setSearchInput("");
        setPage(1);
    };

    return {
        // 목록 데이터
        posts,
        loading,
        totalPages,
        totalCount,
        page,
        setPage,

        // 필터
        selectedType,
        setSelectedType,
        selectedRegion,
        setSelectedRegion,
        selectedDistrict,
        setSelectedDistrict,
        selectedPetType,
        setSelectedPetType,
        searchInput,
        setSearchInput,

        // 통계
        lostCount,
        foundCount,

        // 파생 데이터
        districts,

        // 액션
        handleSearch,
        fetchPosts,
        fetchStats,
        resetFilters,
    };
}
