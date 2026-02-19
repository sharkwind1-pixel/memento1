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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    Eye,
    Dog,
    Cat,
    ChevronLeft,
    ChevronRight,
    Plus,
    PawPrint,
    Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { uploadLostPetImage } from "@/lib/storage";
import { TabType } from "@/types";
import LostPetPostCard from "@/components/features/lost/LostPetPostCard";
import LostPetDetailModal from "@/components/features/lost/LostPetDetailModal";
import LostPetCreateModal from "@/components/features/lost/LostPetCreateModal";
import type { LostPetPost, PostFormData } from "@/components/features/lost/lostTypes";
import { REGIONS, INITIAL_FORM } from "@/components/features/lost/lostTypes";

interface LostPageProps {
    setSelectedTab?: (tab: TabType) => void;
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
                                <LostPetPostCard key={post.id} post={post} onClick={() => openDetail(post)} />
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
                <LostPetDetailModal
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
                <LostPetCreateModal
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
