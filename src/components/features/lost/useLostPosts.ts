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
    const [page, setPage] = useState<number>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("memento-lost-page");
            return saved ? Math.max(1, parseInt(saved, 10) || 1) : 1;
        }
        return 1;
    });

    // 필터 상태 — localStorage로 새로고침 시 복원
    const [selectedType, setSelectedType] = useState<string>(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("memento-lost-type") || "all";
        }
        return "all";
    });
    const [selectedRegion, setSelectedRegion] = useState<string>(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("memento-lost-region") || "전체";
        }
        return "전체";
    });
    const [selectedDistrict, setSelectedDistrict] = useState<string>(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("memento-lost-district") || "";
        }
        return "";
    });
    const [selectedPetType, setSelectedPetType] = useState<string>(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("memento-lost-pettype") || "all";
        }
        return "all";
    });
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

    // 필터 변경 시 localStorage에 저장
    useEffect(() => { localStorage.setItem("memento-lost-type", selectedType); }, [selectedType]);
    useEffect(() => { localStorage.setItem("memento-lost-region", selectedRegion); }, [selectedRegion]);
    useEffect(() => { localStorage.setItem("memento-lost-district", selectedDistrict); }, [selectedDistrict]);
    useEffect(() => { localStorage.setItem("memento-lost-pettype", selectedPetType); }, [selectedPetType]);
    useEffect(() => { localStorage.setItem("memento-lost-page", String(page)); }, [page]);

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
            if (selectedDistrict) params.set("district", selectedDistrict);
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
    }, [page, selectedType, selectedPetType, selectedRegion, selectedDistrict, searchQuery]);

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
    const prevSearchRef = useRef<string>("");
    useEffect(() => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
            const trimmed = searchInput.trim();
            if (prevSearchRef.current !== trimmed) {
                prevSearchRef.current = trimmed;
                setSearchQuery(trimmed);
                setPage(1);
            }
        }, 300);
        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        };
    }, [searchInput]);

    // 필터 변경 시 페이지 리셋
    useEffect(() => {
        setPage(1);
    }, [selectedType, selectedPetType, selectedRegion, selectedDistrict]);

    // 필터 초기화
    const resetFilters = () => {
        setSelectedType("all");
        setSelectedPetType("all");
        setSelectedRegion("전체");
        setSelectedDistrict("");
        setSearchQuery("");
        setSearchInput("");
        setPage(1);
        // localStorage도 초기화 (useEffect에서 자동 저장되지만 명시적으로)
        localStorage.removeItem("memento-lost-type");
        localStorage.removeItem("memento-lost-region");
        localStorage.removeItem("memento-lost-district");
        localStorage.removeItem("memento-lost-pettype");
        localStorage.removeItem("memento-lost-page");
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
