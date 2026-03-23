/**
 * useHomePage.ts
 * 홈페이지 데이터 페칭, 좋아요/댓글 인터랙션 로직
 *
 * 모든 데이터는 DB에서 가져옴 (목업 폴백 없음)
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getPublicMemorialPosts, MemorialPost } from "@/lib/memorialService";
import { authFetch } from "@/lib/auth-fetch";
import { supabase } from "@/lib/supabase";
import { API } from "@/config/apiEndpoints";
import { toast } from "sonner";
import type { LightboxItem, CommunityPost, Comment, ShowcasePost } from "./types";

export function useHomePage() {
    const [lightboxItem, setLightboxItem] = useState<LightboxItem | null>(null);

    // 커뮤니티 인기글 상태 (DB에서 가져옴)
    const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
    const [isLoadingCommunity, setIsLoadingCommunity] = useState(true);

    // 자랑하기 게시글 상태
    const [showcasePosts, setShowcasePosts] = useState<ShowcasePost[]>([]);
    const [isLoadingShowcase, setIsLoadingShowcase] = useState(true);

    // 공개 추모글 상태
    const [publicMemorialPosts, setPublicMemorialPosts] = useState<MemorialPost[]>([]);
    const [isLoadingMemorial, setIsLoadingMemorial] = useState(true);

    // 좋아요 상태 관리
    const [likedPosts, setLikedPosts] = useState<Record<number, boolean>>({});
    const [animatingHearts, setAnimatingHearts] = useState<Record<number, boolean>>({});

    // 댓글 상태 관리
    const [postComments, setPostComments] = useState<Record<number, Comment[]>>({});

    // 선택된 포스트 (모달용)
    const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);

    const heartTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
    const likingRef = useRef<Set<number>>(new Set());

    const toggleLike = async (postId: number) => {
        // 중복 클릭 방지
        if (likingRef.current.has(postId)) return;

        // 로그인 체크
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            window.dispatchEvent(new CustomEvent("openAuthModal"));
            return;
        }

        // 자기 글 좋아요 방지
        const post = communityPosts.find(p => p.id === postId);
        if (!post) return;

        // 자기 글이면 차단
        if (post.userId && post.userId === session.user.id) {
            toast.info("자신의 글에는 좋아요를 누를 수 없습니다");
            return;
        }

        // DB에서 좋아요 토글
        const dbId = post.dbId;
        if (!dbId) {
            // dbId가 없으면 기존 방식(클라이언트만)으로 폴백
            setLikedPosts((prev) => ({ ...prev, [postId]: !prev[postId] }));
            return;
        }

        likingRef.current.add(postId);

        // 낙관적 UI 업데이트
        const wasLiked = likedPosts[postId] || false;
        setLikedPosts((prev) => ({ ...prev, [postId]: !wasLiked }));
        setCommunityPosts((prev) => prev.map(p =>
            p.id === postId ? { ...p, likes: wasLiked ? p.likes - 1 : p.likes + 1 } : p
        ));

        // 하트 애니메이션
        setAnimatingHearts((prev) => ({ ...prev, [postId]: true }));
        const prevTimer = heartTimersRef.current.get(postId);
        if (prevTimer) clearTimeout(prevTimer);
        const timer = setTimeout(() => {
            setAnimatingHearts((p) => ({ ...p, [postId]: false }));
            heartTimersRef.current.delete(postId);
        }, 400);
        heartTimersRef.current.set(postId, timer);

        try {
            const response = await authFetch(API.POST_LIKE(dbId), { method: "POST" });
            if (!response.ok) throw new Error("좋아요 실패");
            const data = await response.json();
            // 서버 응답으로 정확한 값 반영
            setLikedPosts((prev) => ({ ...prev, [postId]: data.liked }));
            setCommunityPosts((prev) => prev.map(p =>
                p.id === postId ? { ...p, likes: data.likes } : p
            ));
        } catch {
            // 롤백
            setLikedPosts((prev) => ({ ...prev, [postId]: wasLiked }));
            setCommunityPosts((prev) => prev.map(p =>
                p.id === postId ? { ...p, likes: wasLiked ? p.likes : p.likes - 1 } : p
            ));
            toast.error("좋아요 처리에 실패했습니다");
        } finally {
            likingRef.current.delete(postId);
        }
    };

    const addComment = async (postId: number, content: string) => {
        // 로그인 체크
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            window.dispatchEvent(new CustomEvent("openAuthModal"));
            return;
        }

        const post = communityPosts.find(p => p.id === postId);
        const dbId = post?.dbId;

        // 낙관적 UI 업데이트
        const tempComment: Comment = {
            id: Date.now(),
            author: "나",
            content,
            time: "방금 전",
            likes: 0,
        };
        setPostComments((prev) => ({
            ...prev,
            [postId]: [...(prev[postId] || []), tempComment],
        }));

        if (dbId) {
            try {
                const response = await authFetch(API.POST_COMMENTS(dbId), {
                    method: "POST",
                    body: JSON.stringify({ content: content.trim() }),
                });
                if (!response.ok) throw new Error("댓글 작성 실패");
                // 성공 시 댓글 수 업데이트
                setCommunityPosts((prev) => prev.map(p =>
                    p.id === postId ? { ...p, comments: p.comments + 1 } : p
                ));
            } catch {
                // 롤백
                setPostComments((prev) => ({
                    ...prev,
                    [postId]: (prev[postId] || []).filter(c => c.id !== tempComment.id),
                }));
                toast.error("댓글 작성에 실패했습니다");
            }
        }
    };

    // 커뮤니티 인기글 가져오기 (DB)
    const fetchCommunityPosts = useCallback(async () => {
        setIsLoadingCommunity(true);
        try {
            const params = new URLSearchParams({
                board: "free",
                sort: "popular",
                limit: "10",
                exclude_badge: "자랑",
            });
            // authFetch 사용: 로그인 유저면 userLiked 등 개인화 데이터 포함
            const res = await authFetch(`${API.POSTS}?${params}`);
            if (res.ok) {
                const data = await res.json();
                const rawPosts = data.posts || [];
                const posts = rawPosts.map((p: Record<string, unknown>, idx: number) => ({
                    id: idx + 1,
                    dbId: (p.id as string) || undefined,
                    userId: (p.userId as string) || undefined,
                    title: p.title as string,
                    content: (p.content as string) || "",
                    author: (p.authorName as string) || "익명",
                    badge: (p.badge as string) || "",
                    likes: (p.likes as number) || 0,
                    comments: (p.comments as number) || 0,
                    time: formatRelativeTime(p.createdAt as string),
                    authorPoints: (p.authorPoints as number) || 0,
                    authorIsAdmin: (p.authorIsAdmin as boolean) || false,
                }));
                setCommunityPosts(posts);
                // DB에서 가져온 좋아요 상태 반영
                const likedMap: Record<number, boolean> = {};
                rawPosts.forEach((p: Record<string, unknown>, idx: number) => {
                    if (p.userLiked) likedMap[idx + 1] = true;
                });
                setLikedPosts(likedMap);
            } else {
                setCommunityPosts([]);
            }
        } catch {
            setCommunityPosts([]);
        } finally {
            setIsLoadingCommunity(false);
        }
    }, []);

    // AI 영상 게시글 가져오기 (함께보기 = AI 영상 전용)
    const fetchShowcasePosts = useCallback(async () => {
        setIsLoadingShowcase(true);
        try {
            const params = new URLSearchParams({
                board: "free",
                badge: "자랑",
                sort: "popular",
                limit: "20",
            });
            const res = await fetch(`${API.POSTS}?${params}`);
            if (res.ok) {
                const data = await res.json();
                // AI 영상이 있는 글만 필터링 (함께보기 = AI 영상 전용 섹션)
                const videoOnly = (data.posts || []).filter(
                    (p: ShowcasePost) => !!p.videoUrl
                );
                setShowcasePosts(videoOnly.length > 0 ? videoOnly.slice(0, 8) : []);
            } else {
                setShowcasePosts([]);
            }
        } catch {
            setShowcasePosts([]);
        } finally {
            setIsLoadingShowcase(false);
        }
    }, []);

    // 공개 추모글 가져오기 (커뮤니티 기억게시판에서 인기글)
    const fetchPublicMemorialPosts = useCallback(async () => {
        setIsLoadingMemorial(true);
        try {
            // 1차: 커뮤니티 기억게시판(posts 테이블, board=memorial)에서 인기글 조회
            const params = new URLSearchParams({
                board: "memorial",
                sort: "popular",
                limit: "10",
            });
            const res = await fetch(`${API.POSTS}?${params}`);
            if (res.ok) {
                const data = await res.json();
                const rawPosts = data.posts || [];
                if (rawPosts.length > 0) {
                    // 커뮤니티 기억게시판 글을 MemorialPost 형태로 변환
                    const mapped = rawPosts.map((p: Record<string, unknown>) => ({
                        id: (p.id as string) || "",
                        userId: (p.userId as string) || "",
                        petId: "",
                        title: (p.title as string) || "",
                        content: (p.content as string) || "",
                        petName: (p.authorName as string) || "익명",
                        petType: (p.badge as string) || "",
                        petBreed: undefined,
                        petYears: "",
                        petImage: ((p.imageUrls as string[]) || [])[0] || undefined,
                        isPublic: true,
                        likesCount: (p.likes as number) || 0,
                        commentsCount: (p.comments as number) || 0,
                        createdAt: (p.createdAt as string) || "",
                        updatedAt: "",
                    }));
                    setPublicMemorialPosts(mapped);
                    return;
                }
            }
            // 2차 폴백: 기존 memorial_posts 테이블에서 조회
            const posts = await getPublicMemorialPosts(10);
            setPublicMemorialPosts(posts);
        } catch {
            // 실패 시 빈 배열 유지
        } finally {
            setIsLoadingMemorial(false);
        }
    }, []);

    useEffect(() => {
        fetchCommunityPosts();
        fetchShowcasePosts();
        fetchPublicMemorialPosts();
    }, [fetchCommunityPosts, fetchShowcasePosts, fetchPublicMemorialPosts]);

    // 추모 섹션 표시 데이터 (DB만 사용, 없으면 빈 배열)
    const displayMemorialData = publicMemorialPosts.map((post) => ({
        id: post.id,
        name: post.petName,
        pet: post.petType,
        years: post.petYears || "",
        message: post.title,
        content: post.content,
        image: post.petImage,
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        isFromDB: true,
    }));

    return {
        // 라이트박스
        lightboxItem,
        setLightboxItem,

        // 포스트 모달
        selectedPost,
        setSelectedPost,

        // 좋아요/댓글
        likedPosts,
        animatingHearts,
        postComments,
        toggleLike,
        addComment,

        // 커뮤니티
        communityPosts,
        isLoadingCommunity,

        // 자랑하기
        showcasePosts,
        isLoadingShowcase,

        // 추모
        isLoadingMemorial,
        displayMemorialData,
    };
}

/** 상대 시간 포맷 */
function formatRelativeTime(dateStr: string): string {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "방금 전";
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}일 전`;
    return new Date(dateStr).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}
