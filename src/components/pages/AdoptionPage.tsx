/**
 * AdoptionPage.tsx
 * 입양 정보 페이지
 * - 공공데이터포털 유기동물 API 연동 (API 키 없으면 목업 데이터)
 * - 종류/지역/상태 필터 + 검색
 * - 그리드/리스트 뷰 + 상세 모달
 * - 페이지네이션
 */

"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    ArrowLeft,
    Search,
    MapPin,
    Phone,
    Users,
    X,
    Dog,
    Cat,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Filter,
    Grid3X3,
    List,
    Info,
    AlertCircle,
} from "lucide-react";
import PawLoading from "@/components/ui/PawLoading";

import { TabType } from "@/types";
import type { AdoptionAnimal } from "@/app/api/adoption/route";
import { API } from "@/config/apiEndpoints";

interface AdoptionPageProps {
    setSelectedTab: (tab: TabType) => void;
}

// 성별 라벨
function genderLabel(g: string): string {
    if (g === "M") return "수컷";
    if (g === "F") return "암컷";
    return "미상";
}

// 중성화 라벨
function neuterLabel(n: string): string {
    if (n === "Y") return "완료";
    if (n === "N") return "미완료";
    return "미상";
}

// 날짜 포맷
function formatDate(d: string): string {
    if (!d || d.length !== 8) return d;
    return `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6, 8)}`;
}

// 지역 목록
const REGIONS = [
    { code: "", label: "전체 지역" },
    { code: "6110000", label: "서울" },
    { code: "6260000", label: "부산" },
    { code: "6270000", label: "대구" },
    { code: "6280000", label: "인천" },
    { code: "6290000", label: "광주" },
    { code: "6300000", label: "대전" },
    { code: "6310000", label: "울산" },
    { code: "5690000", label: "세종" },
    { code: "6410000", label: "경기" },
    { code: "6530000", label: "강원" },
    { code: "6430000", label: "충북" },
    { code: "6440000", label: "충남" },
    { code: "6540000", label: "전북" },
    { code: "6460000", label: "전남" },
    { code: "6470000", label: "경북" },
    { code: "6480000", label: "경남" },
    { code: "6500000", label: "제주" },
];

/* ================================================================ */
/* 상세 모달 */
/* ================================================================ */
function AnimalDetailModal({
    animal,
    onClose,
}: {
    animal: AdoptionAnimal | null;
    onClose: () => void;
}) {
    useEffect(() => {
        if (!animal) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [animal, onClose]);

    if (!animal) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="adoption-detail-title"
        >
            <div className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col">
                {/* 헤더 */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/70 dark:border-gray-800 flex-shrink-0">
                    <div className="min-w-0">
                        <div id="adoption-detail-title" className="font-bold text-gray-900 dark:text-gray-100 truncate">
                            {animal.breed} ({animal.kind})
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            {animal.noticeNo}
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl flex-shrink-0"
                        onClick={onClose}
                        aria-label="닫기"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* 본문 - 스크롤 */}
                <div className="flex-1 overflow-y-auto">
                    {/* 이미지 */}
                    {animal.imageUrl && (
                        <div className="relative w-full bg-gray-100 dark:bg-gray-800">
                            <img
                                src={animal.imageUrl}
                                alt={animal.breed}
                                className="w-full max-h-[50vh] object-contain"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                            />
                        </div>
                    )}

                    {/* 정보 */}
                    <div className="p-4 space-y-4">
                        {/* 상태 배지 */}
                        <div className="flex flex-wrap gap-2">
                            <Badge className={
                                animal.status.includes("공고")
                                    ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                                    : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                            }>
                                {animal.status || "보호중"}
                            </Badge>
                            <Badge variant="outline">
                                {genderLabel(animal.gender)}
                            </Badge>
                            <Badge variant="outline">
                                중성화 {neuterLabel(animal.neutered)}
                            </Badge>
                        </div>

                        {/* 기본 정보 */}
                        <div className="grid grid-cols-2 gap-3">
                            <InfoItem label="품종" value={animal.breed} />
                            <InfoItem label="나이" value={animal.age} />
                            <InfoItem label="색상" value={animal.color} />
                            <InfoItem label="체중" value={animal.weight} />
                        </div>

                        {/* 특이사항 */}
                        {animal.specialMark && (
                            <div className="p-3 bg-sky-50 dark:bg-sky-900/20 rounded-xl">
                                <p className="text-sm font-medium text-sky-700 dark:text-sky-300 mb-1">
                                    특이사항
                                </p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                    {animal.specialMark}
                                </p>
                            </div>
                        )}

                        {/* 발견 정보 */}
                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                발견 정보
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                <div className="flex items-start gap-2">
                                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <span className="text-gray-600 dark:text-gray-300">
                                        {animal.foundPlace}
                                    </span>
                                </div>
                                {animal.foundDate && (
                                    <div className="text-gray-500 dark:text-gray-400">
                                        발견일: {formatDate(animal.foundDate)}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 공고 기간 */}
                        {animal.noticeStart && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                공고기간: {formatDate(animal.noticeStart)} ~ {formatDate(animal.noticeEnd)}
                            </div>
                        )}

                        {/* 보호소 정보 */}
                        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl space-y-2">
                            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                보호소 정보
                            </h4>
                            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                                {animal.shelterName}
                            </p>
                            {animal.shelterAddr && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-start gap-1">
                                    <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                    {animal.shelterAddr}
                                </p>
                            )}
                            {animal.shelterTel && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                    <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                                    {animal.shelterTel}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* 하단 버튼 */}
                <div className="p-4 border-t border-gray-200/70 dark:border-gray-800 flex-shrink-0">
                    <div className="flex gap-3">
                        {animal.shelterTel && (
                            <Button
                                className="flex-1 bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 rounded-xl"
                                onClick={() => {
                                    window.open(`tel:${animal.shelterTel}`);
                                }}
                            >
                                <Phone className="w-4 h-4 mr-2" />
                                보호소 전화하기
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            className="rounded-xl"
                            onClick={onClose}
                        >
                            닫기
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoItem({ label, value }: { label: string; value: string }) {
    if (!value) return null;
    return (
        <div>
            <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{value}</p>
        </div>
    );
}

/* ================================================================ */
/* 메인 AdoptionPage */
/* ================================================================ */
export default function AdoptionPage({ setSelectedTab }: AdoptionPageProps) {
    // 상태
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
    const pageSize = 12;

    // 상세 모달
    const [selectedAnimal, setSelectedAnimal] = useState<AdoptionAnimal | null>(null);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    // 데이터 가져오기
    const fetchAnimals = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                page: page.toString(),
                size: pageSize.toString(),
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
    }, [page, kindFilter, regionFilter, stateFilter, searchQuery, pageSize]);

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
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl text-sm text-amber-700 dark:text-amber-300">
                        <Info className="w-4 h-4 flex-shrink-0" />
                        <span>
                            공공데이터 API 키 미설정 - 샘플 데이터를 표시합니다.
                            실제 데이터 연동은 .env.local에 OPENDATA_API_KEY를 추가하세요.
                        </span>
                    </div>
                )}

                {/* 검색바 */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="품종, 지역, 보호소로 검색..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            className="pl-10 rounded-xl bg-white/80 dark:bg-gray-800/80 border-white/50 dark:border-gray-700/50"
                        />
                    </div>
                    <Button
                        onClick={handleSearch}
                        className="bg-sky-500 hover:bg-sky-600 rounded-xl"
                    >
                        검색
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={fetchAnimals}
                        aria-label="새로고침"
                        className="rounded-xl flex-shrink-0"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                </div>

                {/* 종류 필터 탭 */}
                <div className="flex gap-2 overflow-x-auto pb-1">
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
                            onClick={() => handleKindChange(value)}
                            className={`rounded-xl flex-shrink-0 ${
                                kindFilter === value
                                    ? "bg-sky-500 hover:bg-sky-600"
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
                                        onClick={() => handleRegionChange(r.code)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                                            regionFilter === r.code
                                                ? "bg-sky-500 text-white"
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
                                        onClick={() => handleStateChange(value)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                            stateFilter === value
                                                ? "bg-sky-500 text-white"
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

                {/* 메인 컨텐츠 */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <PawLoading size="lg" text="입양 정보를 불러오는 중..." />
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
                {!isLoading && animals.length > 0 && totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page <= 1}
                            aria-label="이전 페이지"
                            className="rounded-xl"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum: number;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (page <= 3) {
                                    pageNum = i + 1;
                                } else if (page >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = page - 2 + i;
                                }
                                return (
                                    <Button
                                        key={pageNum}
                                        variant={page === pageNum ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setPage(pageNum)}
                                        className={`rounded-xl w-9 h-9 p-0 ${
                                            page === pageNum ? "bg-sky-500" : ""
                                        }`}
                                    >
                                        {pageNum}
                                    </Button>
                                );
                            })}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(Math.min(totalPages, page + 1))}
                            disabled={page >= totalPages}
                            aria-label="다음 페이지"
                            className="rounded-xl"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ================================================================ */
/* 그리드 카드 */
/* ================================================================ */
function AnimalGridCard({
    animal,
    onClick,
}: {
    animal: AdoptionAnimal;
    onClick: () => void;
}) {
    const [imgError, setImgError] = useState(false);

    return (
        <button onClick={onClick} className="group text-left" type="button">
            <div className="rounded-2xl overflow-hidden bg-white/60 dark:bg-gray-800/60 border border-white/50 dark:border-gray-700/60 shadow-sm hover:shadow-lg transition-all">
                {/* 이미지 */}
                <div className="relative aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 overflow-hidden">
                    {animal.imageUrl && !imgError ? (
                        <img
                            src={animal.imageUrl}
                            alt={animal.breed}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            {animal.kind === "고양이" ? (
                                <Cat className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                            ) : (
                                <Dog className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                            )}
                        </div>
                    )}
                    {/* 상태 배지 */}
                    <div className="absolute top-2 left-2 flex gap-1">
                        <Badge
                            className={
                                animal.status.includes("공고")
                                    ? "bg-orange-500/90 text-white text-[10px]"
                                    : "bg-green-500/90 text-white text-[10px]"
                            }
                        >
                            {animal.status.includes("공고") ? "공고중" : "보호중"}
                        </Badge>
                    </div>
                    {/* 종류 배지 */}
                    <div className="absolute top-2 right-2">
                        <Badge className="bg-white/90 dark:bg-gray-800/90 text-[10px]">
                            {animal.kind}
                        </Badge>
                    </div>
                </div>

                {/* 정보 */}
                <div className="p-3">
                    <div className="font-semibold text-gray-900 dark:text-gray-100 truncate text-sm">
                        {animal.breed}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {genderLabel(animal.gender)} · {animal.age}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        {animal.region || animal.shelterName}
                    </div>
                </div>
            </div>
        </button>
    );
}

/* ================================================================ */
/* 리스트 카드 */
/* ================================================================ */
function AnimalListCard({
    animal,
    onClick,
}: {
    animal: AdoptionAnimal;
    onClick: () => void;
}) {
    const [imgError, setImgError] = useState(false);

    return (
        <button
            onClick={onClick}
            className="w-full text-left bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/50 dark:border-gray-700/50 rounded-2xl overflow-hidden hover:shadow-lg transition-all"
            type="button"
        >
            <div className="flex">
                {/* 이미지 */}
                <div className="w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 overflow-hidden">
                    {animal.imageUrl && !imgError ? (
                        <img
                            src={animal.imageUrl}
                            alt={animal.breed}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            {animal.kind === "고양이" ? (
                                <Cat className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                            ) : (
                                <Dog className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                            )}
                        </div>
                    )}
                </div>

                {/* 정보 */}
                <div className="flex-1 p-4 min-w-0">
                    <div className="flex items-start justify-between mb-1 gap-2">
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 truncate">
                            {animal.breed}
                        </h3>
                        <Badge
                            className={`flex-shrink-0 text-[10px] ${
                                animal.status.includes("공고")
                                    ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                                    : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                            }`}
                        >
                            {animal.status.includes("공고") ? "공고중" : "보호중"}
                        </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                        <Badge variant="outline" className="text-[10px]">
                            {animal.kind}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                            {genderLabel(animal.gender)}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                            {animal.age}
                        </Badge>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1 truncate">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        {animal.region || animal.shelterName}
                    </div>
                    {animal.specialMark && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                            {animal.specialMark}
                        </p>
                    )}
                </div>
            </div>
        </button>
    );
}
