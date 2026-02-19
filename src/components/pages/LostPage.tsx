/**
 * LostPage.tsx
 * 분실동물 찾기 페이지
 * 실종 / 발견 신고 및 검색 (DB 연동)
 *
 * 기능:
 * - API 기반 게시글 목록 조회 (필터, 페이지네이션)
 * - 실종/발견 신고 작성 (이미지 업로드 포함)
 * - 게시글 상세 보기 모달
 * - 본인 글 수정/삭제, 해결 표시
 * - 다크모드 지원
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { API } from "@/config/apiEndpoints";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Search,
    AlertTriangle,
    MapPin,
    Clock,
    Eye,
    Calendar,
    Dog,
    Cat,
    Gift,
    Share2,
    X,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Plus,
    ImagePlus,
    Phone,
    Trash2,
    CheckCircle2,
    PawPrint,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { uploadLostPetImage } from "@/lib/storage";
import { TabType } from "@/types";

interface LostPageProps {
    setSelectedTab?: (tab: TabType) => void;
}

/** API 응답의 분실동물 게시글 타입 (camelCase) */
interface LostPetPost {
    id: string;
    userId: string;
    type: "lost" | "found";
    title: string;
    petType: string;
    breed: string;
    color: string;
    gender: string;
    age: string;
    region: string;
    district: string;
    locationDetail: string;
    date: string;
    description: string;
    contact: string;
    reward: string | null;
    imageUrl: string | null;
    imageStoragePath: string | null;
    views: number;
    status: string;
    createdAt: string;
    updatedAt: string;
}

/** 게시글 작성 폼 데이터 */
interface PostFormData {
    type: "lost" | "found";
    title: string;
    petType: string;
    breed: string;
    color: string;
    gender: string;
    age: string;
    region: string;
    district: string;
    locationDetail: string;
    date: string;
    description: string;
    contact: string;
    reward: string;
}

// 시/도 데이터
const REGIONS: Record<string, string[]> = {
    전체: [],
    서울: [
        "강남구", "강동구", "강북구", "강서구", "관악구", "광진구",
        "구로구", "금천구", "노원구", "도봉구", "동대문구", "동작구",
        "마포구", "서대문구", "서초구", "성동구", "성북구", "송파구",
        "양천구", "영등포구", "용산구", "은평구", "종로구", "중구", "중랑구",
    ],
    경기: [
        "고양시", "과천시", "광명시", "광주시", "구리시", "군포시",
        "김포시", "남양주시", "부천시", "성남시", "수원시", "안산시",
        "안양시", "용인시", "의정부시", "파주시", "평택시", "화성시",
    ],
    부산: [
        "강서구", "금정구", "남구", "동구", "동래구", "부산진구",
        "북구", "사상구", "사하구", "서구", "수영구", "연제구",
        "영도구", "중구", "해운대구",
    ],
    대구: ["남구", "달서구", "동구", "북구", "서구", "수성구", "중구"],
    인천: ["계양구", "남동구", "동구", "미추홀구", "부평구", "서구", "연수구", "중구"],
    광주: ["광산구", "남구", "동구", "북구", "서구"],
    대전: ["대덕구", "동구", "서구", "유성구", "중구"],
    울산: ["남구", "동구", "북구", "울주군", "중구"],
    세종: ["세종시"],
    강원: ["강릉시", "동해시", "속초시", "원주시", "춘천시"],
    충북: ["청주시", "충주시", "제천시"],
    충남: ["천안시", "아산시", "서산시", "당진시"],
    전북: ["전주시", "군산시", "익산시"],
    전남: ["목포시", "여수시", "순천시"],
    경북: ["포항시", "경주시", "구미시", "안동시"],
    경남: ["창원시", "진주시", "김해시", "양산시"],
    제주: ["제주시", "서귀포시"],
};

const INITIAL_FORM: PostFormData = {
    type: "lost",
    title: "",
    petType: "강아지",
    breed: "",
    color: "",
    gender: "",
    age: "",
    region: "",
    district: "",
    locationDetail: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    contact: "",
    reward: "",
};

/** 시간 포맷 */
function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "방금 전";
    if (minutes < 60) return `${minutes}분 전`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}일 전`;
    return date.toLocaleDateString("ko-KR");
}

/** 위치 표시 */
function formatLocation(region: string, district: string, detail: string): string {
    const parts = [region, district, detail].filter(Boolean);
    return parts.join(" ") || "미지정";
}

export default function LostPage({ setSelectedTab }: LostPageProps) {
    const { user } = useAuth();

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

    // 모달 상태
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedPost, setSelectedPost] = useState<LostPetPost | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    // 작성 폼 상태
    const [form, setForm] = useState<PostFormData>(INITIAL_FORM);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // 구/군 목록
    const districts =
        selectedRegion && selectedRegion !== "전체"
            ? REGIONS[selectedRegion] || []
            : [];

    const formDistricts =
        form.region ? REGIONS[form.region] || [] : [];

    // ==========================================
    // API 호출
    // ==========================================

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

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    // 검색 debounce
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // 검색 실행
    const handleSearch = () => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        setSearchQuery(searchInput.trim());
        setPage(1);
    };

    // 검색어 debounce: 타이핑 후 300ms 후 자동 검색
    useEffect(() => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
            setSearchQuery(searchInput.trim());
            setPage(1);
        }, 300);
        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        };
    }, [searchInput]);

    // 필터 변경 시 페이지 리셋
    useEffect(() => {
        setPage(1);
    }, [selectedType, selectedPetType, selectedRegion]);

    // ==========================================
    // 게시글 상세 조회
    // ==========================================

    const openDetail = async (post: LostPetPost) => {
        setSelectedPost(post);
        setShowDetailModal(true);
        setDetailLoading(true);
        try {
            const res = await fetch(API.LOST_PET_DETAIL(post.id));
            if (res.ok) {
                const data = await res.json();
                setSelectedPost(data.post);
            }
        } catch {
            toast.error("상세 정보를 불러오지 못했습니다. 기본 정보로 표시합니다.");
        } finally {
            setDetailLoading(false);
        }
    };

    // ==========================================
    // 게시글 작성
    // ==========================================

    const openCreateModal = (type: "lost" | "found") => {
        if (!user) {
            toast.error("로그인이 필요합니다.");
            return;
        }
        setForm({ ...INITIAL_FORM, type });
        setImageFile(null);
        setImagePreview(null);
        setShowCreateModal(true);
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            toast.error("이미지는 10MB 이하만 가능합니다.");
            return;
        }

        setImageFile(file);
        const reader = new FileReader();
        reader.onload = (ev) => setImagePreview(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    const handleSubmit = async () => {
        if (!user) {
            toast.error("로그인이 필요합니다.");
            return;
        }
        if (!form.title.trim()) {
            toast.error("제목을 입력해주세요.");
            return;
        }
        if (!form.date) {
            toast.error("날짜를 입력해주세요.");
            return;
        }

        setSubmitting(true);
        try {
            let imageUrl: string | null = null;
            let imageStoragePath: string | null = null;

            // 이미지 업로드
            if (imageFile) {
                const uploadResult = await uploadLostPetImage(imageFile, user.id);
                if (uploadResult.success && uploadResult.url) {
                    imageUrl = uploadResult.url;
                    imageStoragePath = uploadResult.path || null;
                } else {
                    toast.error(uploadResult.error || "이미지 업로드 실패");
                }
            }

            const res = await fetch(API.LOST_PETS, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: form.type,
                    title: form.title.trim(),
                    petType: form.petType,
                    breed: form.breed.trim(),
                    color: form.color.trim(),
                    gender: form.gender,
                    age: form.age.trim(),
                    region: form.region,
                    district: form.district,
                    locationDetail: form.locationDetail.trim(),
                    date: form.date,
                    description: form.description.trim(),
                    contact: form.contact.trim(),
                    reward: form.reward.trim() || null,
                    imageUrl,
                    imageStoragePath,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "게시글 작성 실패");
            }

            toast.success(form.type === "lost" ? "실종 신고가 등록되었습니다." : "발견 신고가 등록되었습니다.");
            setShowCreateModal(false);
            setPage(1);
            fetchPosts();
            fetchStats();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "게시글 작성에 실패했습니다.");
        } finally {
            setSubmitting(false);
        }
    };

    // ==========================================
    // 게시글 삭제
    // ==========================================

    const handleDelete = async (postId: string) => {
        if (!confirm("정말 삭제하시겠습니까?")) return;

        try {
            const res = await fetch(API.LOST_PET_DETAIL(postId), { method: "DELETE" });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "삭제 실패");
            }
            toast.success("게시글이 삭제되었습니다.");
            setShowDetailModal(false);
            setSelectedPost(null);
            fetchPosts();
            fetchStats();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "삭제에 실패했습니다.");
        }
    };

    // ==========================================
    // 해결 표시
    // ==========================================

    const handleResolve = async (postId: string) => {
        if (!confirm("찾았어요! 해결 완료로 표시하시겠습니까?")) return;

        try {
            const res = await fetch(API.LOST_PET_DETAIL(postId), {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "resolved" }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "상태 변경 실패");
            }
            toast.success("해결 완료로 표시되었습니다!");
            setShowDetailModal(false);
            setSelectedPost(null);
            fetchPosts();
            fetchStats();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "상태 변경에 실패했습니다.");
        }
    };

    // ==========================================
    // 렌더링
    // ==========================================

    return (
        <div className="min-h-screen relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-red-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-orange-200/30 to-red-200/30 dark:from-orange-800/20 dark:to-red-800/20 rounded-full blur-3xl animate-pulse" />
            </div>

            <div className="relative z-10 space-y-6 pb-8">
                {/* 헤더 */}
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
                                onClick={() => openCreateModal("lost")}
                            >
                                <AlertTriangle className="w-4 h-4 mr-1 sm:mr-2" />
                                <span className="text-sm">실종 신고</span>
                            </Button>
                            <Button
                                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-xl"
                                onClick={() => openCreateModal("found")}
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
                                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                    className="pl-10 rounded-xl bg-white/70 dark:bg-gray-700/70 dark:border-gray-600"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 로딩 */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                        <span className="ml-3 text-gray-500 dark:text-gray-400">게시글을 불러오는 중...</span>
                    </div>
                ) : (
                    <>
                        {/* 결과 수 */}
                        {totalCount > 0 && (
                            <div className="text-sm text-gray-500 dark:text-gray-400 px-1">
                                총 {totalCount}건의 게시글
                            </div>
                        )}

                        {/* 게시글 목록 */}
                        <div className="grid gap-4 md:grid-cols-2">
                            {posts.map((post) => (
                                <PostCard key={post.id} post={post} onClick={() => openDetail(post)} />
                            ))}
                        </div>

                        {/* 빈 상태 */}
                        {posts.length === 0 && (
                            <div className="text-center py-16">
                                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <PawPrint className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                                </div>
                                <p className="text-gray-500 dark:text-gray-400">
                                    해당 조건의 게시글이 없습니다
                                </p>
                                <Button
                                    variant="outline"
                                    className="mt-4 rounded-xl dark:border-gray-600"
                                    onClick={() => {
                                        setSelectedType("all");
                                        setSelectedPetType("all");
                                        setSelectedRegion("전체");
                                        setSearchQuery("");
                                        setSearchInput("");
                                        setPage(1);
                                    }}
                                >
                                    필터 초기화
                                </Button>
                            </div>
                        )}

                        {/* 페이지네이션 */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 pt-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page <= 1}
                                    aria-label="이전 페이지"
                                    className="rounded-xl dark:border-gray-600"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
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
                                            variant={pageNum === page ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setPage(pageNum)}
                                            className={`rounded-xl min-w-[36px] ${
                                                pageNum === page
                                                    ? "bg-gradient-to-r from-orange-500 to-red-500 border-0"
                                                    : "dark:border-gray-600"
                                            }`}
                                        >
                                            {pageNum}
                                        </Button>
                                    );
                                })}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages}
                                    aria-label="다음 페이지"
                                    className="rounded-xl dark:border-gray-600"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* 상세 모달 */}
            {showDetailModal && selectedPost && (
                <DetailModal
                    post={selectedPost}
                    loading={detailLoading}
                    isOwner={user?.id === selectedPost.userId}
                    onClose={() => {
                        setShowDetailModal(false);
                        setSelectedPost(null);
                    }}
                    onDelete={handleDelete}
                    onResolve={handleResolve}
                />
            )}

            {/* 작성 모달 */}
            {showCreateModal && (
                <CreateModal
                    form={form}
                    setForm={setForm}
                    imagePreview={imagePreview}
                    formDistricts={formDistricts}
                    submitting={submitting}
                    fileInputRef={fileInputRef}
                    onImageSelect={handleImageSelect}
                    onRemoveImage={() => {
                        setImageFile(null);
                        setImagePreview(null);
                    }}
                    onSubmit={handleSubmit}
                    onClose={() => setShowCreateModal(false)}
                />
            )}
        </div>
    );
}

// ============================================
// 서브 컴포넌트: 게시글 카드
// ============================================

function PostCard({ post, onClick }: { post: LostPetPost; onClick: () => void }) {
    return (
        <Card
            onClick={onClick}
            className={`bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-2 hover:shadow-lg transition-all duration-300 rounded-2xl cursor-pointer overflow-hidden ${
                post.type === "lost"
                    ? "border-orange-200 dark:border-orange-700/50 hover:border-orange-300 dark:hover:border-orange-600"
                    : "border-green-200 dark:border-green-700/50 hover:border-green-300 dark:hover:border-green-600"
            }`}
        >
            <div className="flex">
                {/* 이미지 */}
                <div className="w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0 bg-gray-100 dark:bg-gray-700 relative">
                    {post.imageUrl ? (
                        <img
                            src={post.imageUrl}
                            alt={post.title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <PawPrint className="w-10 h-10 text-gray-300 dark:text-gray-500" />
                        </div>
                    )}
                    <Badge
                        className={`absolute top-2 left-2 ${
                            post.type === "lost"
                                ? "bg-orange-500"
                                : "bg-green-500"
                        } text-white`}
                    >
                        {post.type === "lost" ? "실종" : "발견"}
                    </Badge>
                    {post.reward && (
                        <Badge className="absolute bottom-2 left-2 bg-yellow-500 text-white">
                            <Gift className="w-3 h-3 mr-1" />
                            {post.reward}
                        </Badge>
                    )}
                </div>

                {/* 정보 */}
                <div className="flex-1 p-4">
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 line-clamp-1 mb-2">
                        {post.title}
                    </h3>

                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300 mb-3">
                        <div className="flex items-center gap-2">
                            {post.petType === "강아지" ? (
                                <Dog className="w-4 h-4 flex-shrink-0" />
                            ) : post.petType === "고양이" ? (
                                <Cat className="w-4 h-4 flex-shrink-0" />
                            ) : (
                                <PawPrint className="w-4 h-4 flex-shrink-0" />
                            )}
                            <span className="line-clamp-1">
                                {[post.breed, post.color, post.gender].filter(Boolean).join(" / ") || post.petType}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 flex-shrink-0" />
                            <span className="line-clamp-1">
                                {formatLocation(post.region, post.district, post.locationDetail)}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 flex-shrink-0" />
                            <span>
                                {post.type === "lost" ? "실종일" : "발견일"}: {post.date}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {post.views}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {timeAgo(post.createdAt)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
}

// ============================================
// 서브 컴포넌트: 상세 모달
// ============================================

function DetailModal({
    post,
    loading,
    isOwner,
    onClose,
    onDelete,
    onResolve,
}: {
    post: LostPetPost;
    loading: boolean;
    isOwner: boolean;
    onClose: () => void;
    onDelete: (id: string) => void;
    onResolve: (id: string) => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div
                className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
                role="dialog"
                aria-modal="true"
                aria-labelledby="lost-detail-title"
            >
                {/* 닫기 */}
                <button
                    onClick={onClose}
                    aria-label="닫기"
                    className="absolute top-4 right-4 z-10 w-8 h-8 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* 이미지 */}
                {post.imageUrl ? (
                    <div className="relative w-full aspect-video bg-gray-100 dark:bg-gray-700 rounded-t-3xl overflow-hidden">
                        <img
                            src={post.imageUrl}
                            alt={post.title}
                            className="w-full h-full object-cover"
                        />
                        <Badge
                            className={`absolute top-4 left-4 text-sm ${
                                post.type === "lost" ? "bg-orange-500" : "bg-green-500"
                            } text-white`}
                        >
                            {post.type === "lost" ? "실종" : "발견"}
                        </Badge>
                    </div>
                ) : (
                    <div className="relative w-full h-40 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-t-3xl flex items-center justify-center">
                        <PawPrint className="w-16 h-16 text-gray-300 dark:text-gray-500" />
                        <Badge
                            className={`absolute top-4 left-4 text-sm ${
                                post.type === "lost" ? "bg-orange-500" : "bg-green-500"
                            } text-white`}
                        >
                            {post.type === "lost" ? "실종" : "발견"}
                        </Badge>
                    </div>
                )}

                {/* 콘텐츠 */}
                <div className="p-6 space-y-4">
                    {loading && (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                        </div>
                    )}

                    {/* 제목 & 사례금 */}
                    <div>
                        <h2 id="lost-detail-title" className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">
                            {post.title}
                        </h2>
                        {post.reward && (
                            <Badge className="bg-yellow-500 text-white">
                                <Gift className="w-3 h-3 mr-1" />
                                사례금 {post.reward}
                            </Badge>
                        )}
                    </div>

                    {/* 동물 정보 */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4 space-y-2">
                        <DetailRow
                            icon={post.petType === "강아지" ? <Dog className="w-4 h-4" /> : post.petType === "고양이" ? <Cat className="w-4 h-4" /> : <PawPrint className="w-4 h-4" />}
                            label="종류"
                            value={post.petType}
                        />
                        {post.breed && <DetailRow icon={<PawPrint className="w-4 h-4" />} label="품종" value={post.breed} />}
                        {post.color && <DetailRow icon={null} label="색상" value={post.color} />}
                        {post.gender && <DetailRow icon={null} label="성별" value={post.gender} />}
                        {post.age && <DetailRow icon={null} label="나이" value={post.age} />}
                    </div>

                    {/* 위치 & 날짜 */}
                    <div className="space-y-2">
                        <DetailRow
                            icon={<MapPin className="w-4 h-4 text-orange-500" />}
                            label={post.type === "lost" ? "실종 장소" : "발견 장소"}
                            value={formatLocation(post.region, post.district, post.locationDetail)}
                        />
                        <DetailRow
                            icon={<Calendar className="w-4 h-4 text-orange-500" />}
                            label={post.type === "lost" ? "실종일" : "발견일"}
                            value={post.date}
                        />
                    </div>

                    {/* 설명 */}
                    {post.description && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">상세 설명</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
                                {post.description}
                            </p>
                        </div>
                    )}

                    {/* 연락처 */}
                    {post.contact && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 flex items-center gap-3">
                            <Phone className="w-5 h-5 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                            <div>
                                <span className="text-xs text-blue-600 dark:text-blue-400">연락처</span>
                                <p className="font-medium text-blue-700 dark:text-blue-300">{post.contact}</p>
                            </div>
                        </div>
                    )}

                    {/* 메타 정보 */}
                    <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 pt-2 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                조회 {post.views}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {timeAgo(post.createdAt)}
                            </span>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 rounded-lg"
                            onClick={() => {
                                navigator.clipboard.writeText(window.location.href);
                                toast.success("링크가 복사되었습니다.");
                            }}
                        >
                            <Share2 className="w-3 h-3 mr-1" />
                            공유
                        </Button>
                    </div>

                    {/* 본인 액션 */}
                    {isOwner && (
                        <div className="flex gap-2 pt-2">
                            <Button
                                variant="outline"
                                className="flex-1 rounded-xl text-green-600 border-green-300 dark:border-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30"
                                onClick={() => onResolve(post.id)}
                            >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                찾았어요!
                            </Button>
                            <Button
                                variant="outline"
                                className="rounded-xl text-red-600 border-red-300 dark:border-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                                onClick={() => onDelete(post.id)}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/** 상세 모달 내 행 */
function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-center gap-2 text-sm">
            {icon && <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">{icon}</span>}
            {!icon && <span className="w-4" />}
            <span className="text-gray-500 dark:text-gray-400 min-w-[60px]">{label}</span>
            <span className="text-gray-800 dark:text-gray-200 font-medium">{value}</span>
        </div>
    );
}

// ============================================
// 서브 컴포넌트: 작성 모달
// ============================================

function CreateModal({
    form,
    setForm,
    imagePreview,
    formDistricts,
    submitting,
    fileInputRef,
    onImageSelect,
    onRemoveImage,
    onSubmit,
    onClose,
}: {
    form: PostFormData;
    setForm: React.Dispatch<React.SetStateAction<PostFormData>>;
    imagePreview: string | null;
    formDistricts: string[];
    submitting: boolean;
    fileInputRef: React.RefObject<HTMLInputElement>;
    onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveImage: () => void;
    onSubmit: () => void;
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div
                className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
                role="dialog"
                aria-modal="true"
                aria-labelledby="lost-create-title"
            >
                {/* 헤더 */}
                <div className={`sticky top-0 z-10 px-6 py-4 rounded-t-3xl flex items-center justify-between ${
                    form.type === "lost"
                        ? "bg-gradient-to-r from-orange-500 to-red-500"
                        : "bg-gradient-to-r from-green-500 to-emerald-500"
                }`}>
                    <h2 id="lost-create-title" className="text-lg font-bold text-white">
                        {form.type === "lost" ? "실종 신고" : "발견 신고"}
                    </h2>
                    <button onClick={onClose} aria-label="닫기" className="text-white/80 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* 유형 토글 */}
                    <div className="flex gap-2">
                        <Button
                            variant={form.type === "lost" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setForm((f) => ({ ...f, type: "lost" }))}
                            className={`rounded-xl flex-1 ${form.type === "lost" ? "bg-orange-500 border-0" : "border-orange-300 text-orange-600 dark:border-orange-600 dark:text-orange-400"}`}
                        >
                            <AlertTriangle className="w-4 h-4 mr-1" />
                            실종
                        </Button>
                        <Button
                            variant={form.type === "found" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setForm((f) => ({ ...f, type: "found" }))}
                            className={`rounded-xl flex-1 ${form.type === "found" ? "bg-green-500 border-0" : "border-green-300 text-green-600 dark:border-green-600 dark:text-green-400"}`}
                        >
                            <Eye className="w-4 h-4 mr-1" />
                            발견
                        </Button>
                    </div>

                    {/* 제목 */}
                    <div>
                        <Label className="text-gray-700 dark:text-gray-300">제목 *</Label>
                        <Input
                            placeholder="예: 포메라니안 찾습니다"
                            value={form.title}
                            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                            className="mt-1 rounded-xl dark:bg-gray-700 dark:border-gray-600"
                            maxLength={200}
                        />
                    </div>

                    {/* 동물 정보 */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-gray-700 dark:text-gray-300">동물 종류 *</Label>
                            <Select
                                value={form.petType}
                                onValueChange={(v) => setForm((f) => ({ ...f, petType: v }))}
                            >
                                <SelectTrigger className="mt-1 rounded-xl dark:bg-gray-700 dark:border-gray-600">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="강아지">강아지</SelectItem>
                                    <SelectItem value="고양이">고양이</SelectItem>
                                    <SelectItem value="기타">기타</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-gray-700 dark:text-gray-300">품종</Label>
                            <Input
                                placeholder="예: 포메라니안"
                                value={form.breed}
                                onChange={(e) => setForm((f) => ({ ...f, breed: e.target.value }))}
                                className="mt-1 rounded-xl dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                        <div>
                            <Label className="text-gray-700 dark:text-gray-300">색상</Label>
                            <Input
                                placeholder="예: 크림색"
                                value={form.color}
                                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                                className="mt-1 rounded-xl dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                        <div>
                            <Label className="text-gray-700 dark:text-gray-300">성별</Label>
                            <Select
                                value={form.gender}
                                onValueChange={(v) => setForm((f) => ({ ...f, gender: v }))}
                            >
                                <SelectTrigger className="mt-1 rounded-xl dark:bg-gray-700 dark:border-gray-600">
                                    <SelectValue placeholder="선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="수컷">수컷</SelectItem>
                                    <SelectItem value="암컷">암컷</SelectItem>
                                    <SelectItem value="미상">미상</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-gray-700 dark:text-gray-300">나이</Label>
                            <Input
                                placeholder="예: 3살"
                                value={form.age}
                                onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
                                className="mt-1 rounded-xl dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                        <div>
                            <Label className="text-gray-700 dark:text-gray-300">
                                {form.type === "lost" ? "실종일" : "발견일"} *
                            </Label>
                            <Input
                                type="date"
                                value={form.date}
                                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                                className="mt-1 rounded-xl dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                    </div>

                    {/* 위치 */}
                    <div className="space-y-3">
                        <Label className="text-gray-700 dark:text-gray-300">
                            {form.type === "lost" ? "실종 장소" : "발견 장소"}
                        </Label>
                        <div className="grid grid-cols-2 gap-3">
                            <Select
                                value={form.region}
                                onValueChange={(v) => setForm((f) => ({ ...f, region: v, district: "" }))}
                            >
                                <SelectTrigger className="rounded-xl dark:bg-gray-700 dark:border-gray-600">
                                    <SelectValue placeholder="시/도" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.keys(REGIONS).filter(r => r !== "전체").map((region) => (
                                        <SelectItem key={region} value={region}>
                                            {region}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {formDistricts.length > 0 && (
                                <Select
                                    value={form.district}
                                    onValueChange={(v) => setForm((f) => ({ ...f, district: v }))}
                                >
                                    <SelectTrigger className="rounded-xl dark:bg-gray-700 dark:border-gray-600">
                                        <SelectValue placeholder="구/군" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {formDistricts.map((d) => (
                                            <SelectItem key={d} value={d}>{d}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                        <Input
                            placeholder="상세 위치 (예: 역삼역 2번 출구 근처)"
                            value={form.locationDetail}
                            onChange={(e) => setForm((f) => ({ ...f, locationDetail: e.target.value }))}
                            className="rounded-xl dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>

                    {/* 상세 설명 */}
                    <div>
                        <Label className="text-gray-700 dark:text-gray-300">상세 설명</Label>
                        <Textarea
                            placeholder="특징, 입고 있는 옷, 목줄 색상 등 자세히 적어주세요."
                            value={form.description}
                            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                            className="mt-1 rounded-xl min-h-[100px] dark:bg-gray-700 dark:border-gray-600"
                            maxLength={5000}
                        />
                    </div>

                    {/* 연락처 & 사례금 */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-gray-700 dark:text-gray-300">연락처</Label>
                            <Input
                                placeholder="010-0000-0000"
                                value={form.contact}
                                onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
                                className="mt-1 rounded-xl dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                        {form.type === "lost" && (
                            <div>
                                <Label className="text-gray-700 dark:text-gray-300">사례금</Label>
                                <Input
                                    placeholder="예: 100만원"
                                    value={form.reward}
                                    onChange={(e) => setForm((f) => ({ ...f, reward: e.target.value }))}
                                    className="mt-1 rounded-xl dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                        )}
                    </div>

                    {/* 이미지 업로드 */}
                    <div>
                        <Label className="text-gray-700 dark:text-gray-300">사진</Label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={onImageSelect}
                            className="hidden"
                        />
                        {imagePreview ? (
                            <div className="mt-2 relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600">
                                <img
                                    src={imagePreview}
                                    alt="미리보기"
                                    className="w-full h-48 object-cover"
                                />
                                <button
                                    onClick={onRemoveImage}
                                    aria-label="이미지 제거"
                                    className="absolute top-2 right-2 w-7 h-7 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="mt-2 w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500 hover:border-orange-400 hover:text-orange-400 dark:hover:border-orange-500 dark:hover:text-orange-500 transition-colors"
                            >
                                <ImagePlus className="w-8 h-8" />
                                <span className="text-sm">사진 추가</span>
                            </button>
                        )}
                    </div>

                    {/* 제출 버튼 */}
                    <Button
                        onClick={onSubmit}
                        disabled={submitting || !form.title.trim()}
                        className={`w-full rounded-xl text-white py-3 ${
                            form.type === "lost"
                                ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                                : "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                        }`}
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                등록 중...
                            </>
                        ) : (
                            <>
                                <Plus className="w-4 h-4 mr-2" />
                                {form.type === "lost" ? "실종 신고 등록" : "발견 신고 등록"}
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
