/**
 * useHomePage.ts
 * 홈페이지 데이터 페칭, 좋아요/댓글 인터랙션 로직
 *
 * 모든 데이터는 DB에서 가져옴 (목업 폴백 없음)
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getPublicMemorialPosts, MemorialPost } from "@/lib/memorialService";
import { API } from "@/config/apiEndpoints";
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
    const toggleLike = (postId: number) => {
        setLikedPosts((prev) => ({
            ...prev,
            [postId]: !prev[postId],
        }));
        setAnimatingHearts((prev) => ({ ...prev, [postId]: true }));
        // 이전 타이머 정리
        const prev = heartTimersRef.current.get(postId);
        if (prev) clearTimeout(prev);
        const timer = setTimeout(() => {
            setAnimatingHearts((p) => ({ ...p, [postId]: false }));
            heartTimersRef.current.delete(postId);
        }, 400);
        heartTimersRef.current.set(postId, timer);
    };

    const addComment = (postId: number, content: string) => {
        const newComment: Comment = {
            id: Date.now(),
            author: "나",
            content,
            time: "방금 전",
            likes: 0,
        };
        setPostComments((prev) => ({
            ...prev,
            [postId]: [...(prev[postId] || []), newComment],
        }));
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
            const res = await fetch(`${API.POSTS}?${params}`);
            if (res.ok) {
                const data = await res.json();
                const posts = (data.posts || []).map((p: Record<string, unknown>, idx: number) => ({
                    id: idx + 1,
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

    // 공개 추모글 가져오기
    const fetchPublicMemorialPosts = useCallback(async () => {
        setIsLoadingMemorial(true);
        try {
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
