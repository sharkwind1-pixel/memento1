/**
 * CommunityPage.tsx
 * 커뮤니티 - 5개 서브카테고리 (자유/추모/입양/지역/분실)
 * v2: 말머리 시스템 추가, 서브카테고리 통합
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Users,
    Heart,
    MessageCircle,
    Clock,
    PenSquare,
    Search,
    TrendingUp,
    Eye,
    MoreHorizontal,
    Flag,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ReportModal from "@/components/modals/ReportModal";
import PawLoading from "@/components/ui/PawLoading";
import { toast } from "sonner";
import { usePets } from "@/contexts/PetContext";
import { ImageIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import WritePostModal from "@/components/features/community/WritePostModal";
import PostDetailView from "@/components/features/community/PostDetailView";
import type { CommunitySubcategory, PostTag, CommunityPageProps } from "@/types";
import { API } from "@/config/apiEndpoints";
import type { Post } from "@/components/features/community/communityTypes";
import {
    SUBCATEGORIES,
    POST_TAGS,
    MOCK_POSTS,
    getBadgeStyle,
    getTagColor,
    getCategoryColor,
    formatTime,
} from "@/components/features/community/communityTypes";





export default function CommunityPage({ subcategory, onSubcategoryChange }: CommunityPageProps) {
    const { selectedPet } = usePets();
    const { user } = useAuth();

    // 서브카테고리 상태 (props 또는 내부 상태)
    const [internalSubcategory, setInternalSubcategory] = useState<CommunitySubcategory>(subcategory || "free");
    const currentSubcategory = subcategory || internalSubcategory;

    // 말머리 필터 (자유게시판용)
    const [selectedTag, setSelectedTag] = useState<PostTag | "all">("all");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [sortBy, setSortBy] = useState<string>("latest");

    // 실제 데이터 상태
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showWriteModal, setShowWriteModal] = useState(false);
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

    // 신고 모달 상태
    const [reportTarget, setReportTarget] = useState<{
        id: string;
        type: "post" | "comment" | "user";
        title?: string;
    } | null>(null);

    // 추모 모드 여부 확인
    const isMemorialMode = selectedPet?.status === "memorial";

    // 모드에 따라 서브카테고리 필터링 (일상 모드에서는 추모게시판 숨김)
    const visibleSubcategories = SUBCATEGORIES.filter(
        (sub) => !sub.memorialOnly || isMemorialMode
    );

    const currentSubcategoryInfo = visibleSubcategories.find((s) => s.id === currentSubcategory) || visibleSubcategories[0];
    const currentColor = getCategoryColor(currentSubcategoryInfo.color);

    // 서브카테고리 변경 핸들러
    const handleSubcategoryChange = (subId: CommunitySubcategory) => {
        if (onSubcategoryChange) {
            onSubcategoryChange(subId);
        } else {
            setInternalSubcategory(subId);
        }
        setSelectedTag("all"); // 말머리 필터 초기화
    };

    // 게시글 불러오기
    const fetchPosts = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                board: currentSubcategory,
                sort: sortBy,
            });
            if (selectedTag !== "all") {
                params.append("tag", selectedTag);
            }
            if (searchQuery) {
                params.append("search", searchQuery);
            }

            const response = await fetch(`${API.POSTS}?${params}`);
            if (!response.ok) {
                throw new Error("게시글을 불러오는데 실패했습니다");
            }
            const data = await response.json();

            if (data.posts && data.posts.length > 0) {
                setPosts(data.posts.map((p: Post & { boardType?: string; animalType?: string }) => ({
                    ...p,
                    subcategory: p.subcategory || p.boardType || currentSubcategory,
                    tag: p.tag || p.animalType,
                })));
            } else if (data.posts) {
                setPosts([]);
            } else {
                throw new Error("API 응답 없음");
            }
        } catch {
            // 에러 시 목업 데이터로 폴백 + 사용자 알림
            toast.error("게시글을 불러오지 못했습니다. 샘플 데이터를 표시합니다.");
            const mockPosts = MOCK_POSTS[currentSubcategory] || [];
            let filteredPosts = mockPosts;

            // 자유게시판 말머리 필터링
            if (currentSubcategory === "free" && selectedTag !== "all") {
                filteredPosts = mockPosts.filter(p => p.tag === selectedTag);
            }

            setPosts(filteredPosts.map((p) => ({
                id: String(p.id),
                userId: "",
                subcategory: currentSubcategory,
                tag: p.tag,
                badge: p.badge,
                title: p.title,
                content: p.content,
                authorName: p.author,
                likes: p.likes,
                views: p.views,
                comments: p.comments,
                createdAt: new Date().toISOString(),
            })));
        } finally {
            setIsLoading(false);
        }
    }, [currentSubcategory, sortBy, selectedTag, searchQuery]);

    // 서브카테고리/정렬/필터 변경 시 다시 로드
    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    // 글쓰기 버튼 클릭
    const handleWriteClick = () => {
        if (!user) {
            window.dispatchEvent(new CustomEvent("openAuthModal"));
            return;
        }
        setShowWriteModal(true);
    };

    // 상세보기 모드
    if (selectedPostId) {
        return (
            <div
                className="min-h-screen relative overflow-hidden"
                style={{ contain: 'layout style', transform: 'translateZ(0)' }}
            >
                <div className="absolute inset-0 bg-gradient-to-br from-[#F0F9FF] via-[#FAFCFF] to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-[#7DD3FC]/30 to-sky-200/30 dark:from-blue-800/20 dark:to-sky-800/20 rounded-full blur-3xl animate-pulse" />
                </div>
                <div className="relative z-10 pb-8">
                    <PostDetailView
                        postId={selectedPostId}
                        subcategory={currentSubcategory}
                        onBack={() => setSelectedPostId(null)}
                        onPostDeleted={fetchPosts}
                    />
                </div>
            </div>
        );
    }

    return (
        <div
            className="min-h-screen relative overflow-hidden"
            style={{ contain: 'layout style', transform: 'translateZ(0)' }}
        >
            {/* 배경 */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#F0F9FF] via-[#FAFCFF] to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-[#7DD3FC]/30 to-sky-200/30 dark:from-blue-800/20 dark:to-sky-800/20 rounded-full blur-3xl animate-pulse" />
            </div>

            <div className="relative z-10 space-y-6 pb-8">
                {/* 헤더 */}
                <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-white/50 dark:border-gray-700/50 rounded-3xl p-6">
                    <div className="flex items-center justify-between gap-3 mb-6">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-[#05B2DC] to-[#38BDF8] rounded-xl flex items-center justify-center flex-shrink-0">
                                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
                                    커뮤니티
                                </h1>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    함께 나누는 이야기
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={handleWriteClick}
                            className={`bg-gradient-to-r ${currentColor.bg} hover:opacity-90 rounded-xl flex-shrink-0 px-3 sm:px-4`}
                        >
                            <PenSquare className="w-4 h-4 sm:mr-2" />
                            <span className="hidden sm:inline">글쓰기</span>
                        </Button>
                    </div>

                    {/* 서브카테고리 탭 - 모바일 최적화 (5개) */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 mb-4">
                        {visibleSubcategories.map((sub) => {
                            const Icon = sub.icon;
                            const isActive = currentSubcategory === sub.id;
                            const color = getCategoryColor(sub.color);
                            return (
                                <button
                                    key={sub.id}
                                    onClick={() => handleSubcategoryChange(sub.id)}
                                    className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border-2 transition-all ${
                                        isActive
                                            ? `bg-gradient-to-r ${color.bg} text-white border-transparent shadow-lg`
                                            : `bg-white/50 dark:bg-gray-700/50 ${color.border} hover:shadow-md`
                                    }`}
                                >
                                    <div className="flex items-center justify-center sm:justify-start gap-1.5">
                                        <Icon
                                            className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-white" : color.text}`}
                                        />
                                        <span
                                            className={`font-bold text-xs sm:text-sm whitespace-nowrap ${isActive ? "text-white" : "text-gray-800 dark:text-gray-100"}`}
                                        >
                                            {sub.label}
                                        </span>
                                    </div>
                                    <p
                                        className={`text-xs mt-1 hidden sm:block truncate ${isActive ? "text-white/80" : "text-gray-500 dark:text-gray-400"}`}
                                    >
                                        {sub.description}
                                    </p>
                                </button>
                            );
                        })}
                    </div>

                    {/* 말머리 필터 - 자유게시판일 때만 표시 */}
                    {currentSubcategory === "free" && (
                        <div className="flex flex-wrap gap-2 mb-4 p-3 bg-blue-50/50 dark:bg-blue-900/20 rounded-xl border border-blue-200/50 dark:border-blue-700/30">
                            <button
                                onClick={() => setSelectedTag("all")}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                                    selectedTag === "all"
                                        ? "bg-[#05B2DC] text-white shadow-md"
                                        : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-800/30 border border-blue-200 dark:border-blue-700/50"
                                }`}
                            >
                                전체
                            </button>
                            {POST_TAGS.map((tag) => {
                                const isActive = selectedTag === tag.id;
                                return (
                                    <button
                                        key={tag.id}
                                        onClick={() => setSelectedTag(tag.id)}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                                            isActive
                                                ? getTagColor(tag.color).replace("border-", "border-transparent bg-").split(" ").slice(0, 2).join(" ") + " text-white shadow-md"
                                                : getTagColor(tag.color)
                                        }`}
                                    >
                                        {tag.label}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* 검색 & 정렬 - 모바일 최적화 */}
                    <div className="space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="검색어를 입력하세요"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                maxLength={100}
                                className="pl-10 rounded-xl bg-white/70 dark:bg-gray-700/70"
                            />
                        </div>
                        <div className="flex justify-center sm:justify-end">
                            <div className="inline-flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                                {[
                                    { id: "latest", label: "최신", icon: Clock },
                                    { id: "popular", label: "인기", icon: TrendingUp },
                                    { id: "comments", label: "댓글", icon: MessageCircle },
                                ].map((sort) => {
                                    const Icon = sort.icon;
                                    return (
                                        <Button
                                            key={sort.id}
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setSortBy(sort.id)}
                                            className={`rounded-lg px-2 sm:px-3 ${sortBy === sort.id ? "bg-white dark:bg-gray-700 shadow-sm" : ""}`}
                                        >
                                            <Icon className="w-4 h-4 sm:mr-1" />
                                            <span className="hidden sm:inline">{sort.label}</span>
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 게시글 목록 */}
                <div className="space-y-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <PawLoading size="lg" />
                        </div>
                    ) : (
                        posts.map((post) => (
                            <Card
                                key={post.id}
                                onClick={() => setSelectedPostId(post.id)}
                                className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-white/50 dark:border-gray-700/50 hover:bg-white/80 dark:hover:bg-gray-700/60 transition-all duration-300 rounded-2xl cursor-pointer"
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                className={`${getBadgeStyle(post.badge, currentSubcategory)} rounded-lg`}
                                            >
                                                {post.badge}
                                            </Badge>
                                            {/* 자유게시판 말머리 표시 */}
                                            {currentSubcategory === "free" && post.tag && (
                                                <Badge variant="outline" className="rounded-lg text-xs">
                                                    {post.tag}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-400 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatTime(post.createdAt)}
                                            </span>
                                            {/* 더보기 메뉴 (신고) */}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button
                                                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                                                        onClick={(e) => e.stopPropagation()}
                                                        aria-label="더보기"
                                                    >
                                                        <MoreHorizontal className="w-4 h-4 text-gray-400" />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (!user) {
                                                                window.dispatchEvent(new CustomEvent("openAuthModal"));
                                                                return;
                                                            }
                                                            setReportTarget({
                                                                id: post.id,
                                                                type: "post",
                                                                title: post.title,
                                                            });
                                                        }}
                                                        className="text-red-500 focus:text-red-600"
                                                    >
                                                        <Flag className="w-4 h-4 mr-2" />
                                                        신고하기
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                    <CardTitle className="text-lg text-gray-800 dark:text-gray-100 mt-2 line-clamp-1">
                                        {post.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pb-2">
                                    <p className="text-gray-600 dark:text-gray-300 line-clamp-2">
                                        {post.content}
                                    </p>
                                    {post.imageUrls && post.imageUrls.length > 0 && (
                                        <div className="flex items-center gap-1 mt-2 text-xs text-sky-500">
                                            <ImageIcon className="w-3.5 h-3.5" />
                                            <span>이미지 {post.imageUrls.length}장</span>
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="flex items-center justify-between pt-2">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        {post.authorName}
                                    </span>
                                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                        <span className="flex items-center gap-1">
                                            <Eye className="w-4 h-4" />
                                            {post.views.toLocaleString()}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Heart className="w-4 h-4" />
                                            {post.likes}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <MessageCircle className="w-4 h-4" />
                                            {post.comments}
                                        </span>
                                    </div>
                                </CardFooter>
                            </Card>
                        ))
                    )}
                </div>

                {/* 게시글 없을 때 */}
                {!isLoading && posts.length === 0 && (
                    <div className="text-center py-16">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="w-10 h-10 text-gray-400" />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400">
                            {searchQuery ? "검색 결과가 없습니다" : "아직 게시글이 없습니다"}
                        </p>
                        {searchQuery ? (
                            <Button
                                variant="outline"
                                className="mt-4 rounded-xl"
                                onClick={() => setSearchQuery("")}
                            >
                                전체 보기
                            </Button>
                        ) : (
                            <Button
                                onClick={handleWriteClick}
                                className={`mt-4 bg-gradient-to-r ${currentColor.bg} rounded-xl`}
                            >
                                <PenSquare className="w-4 h-4 mr-2" />
                                첫 글 작성하기
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* 글쓰기 모달 */}
            <WritePostModal
                isOpen={showWriteModal}
                onClose={() => setShowWriteModal(false)}
                boardType={currentSubcategory}
                onSuccess={fetchPosts}
            />

            {/* 신고 모달 */}
            {reportTarget && (
                <ReportModal
                    isOpen={true}
                    onClose={() => setReportTarget(null)}
                    targetType={reportTarget.type}
                    targetId={reportTarget.id}
                    targetTitle={reportTarget.title}
                />
            )}
        </div>
    );
}
