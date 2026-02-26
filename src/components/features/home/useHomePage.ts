/**
 * useHomePage.ts
 * 홈페이지 데이터 페칭, 좋아요/댓글 인터랙션 로직
 *
 * HomePage에서 추출한 커스텀 훅
 */

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { bestPosts, memorialCards } from "@/data/posts";
import { usePetImages } from "@/hooks/usePetImages";
import { getPublicMemorialPosts, MemorialPost } from "@/lib/memorialService";
import { safeStringSrc } from "./homeUtils";
import type { LightboxItem, CommunityPost, Comment } from "./types";

export function useHomePage() {
    const { petImages, adoptionImages } = usePetImages();

    const [lightboxItem, setLightboxItem] = useState<LightboxItem | null>(null);

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

    // 커뮤니티 포스트 데이터
    const communityPosts: CommunityPost[] = useMemo(() => {
        return bestPosts.community.map((post, idx) => ({
            id: idx + 1,
            title: post.title,
            content:
                post.badge === "인기"
                    ? "정말 많은 분들이 공감해주신 이야기예요. 반려동물과 함께하는 일상의 소소한 행복들을 나누고 싶었어요. 여러분도 비슷한 경험 있으시죠? 댓글로 여러분의 이야기도 들려주세요!"
                    : post.badge === "꿀팁"
                      ? "오랜 경험을 통해 알게 된 꿀팁을 공유합니다. 처음에는 저도 많이 헤맸는데, 이 방법을 알고 나서 정말 편해졌어요. 도움이 되셨으면 좋겠습니다!"
                      : "직접 경험해보고 작성하는 솔직한 후기입니다. 장단점을 모두 적었으니 참고해주세요. 궁금한 점 있으시면 댓글 남겨주세요!",
            author: post.author,
            badge: post.badge,
            likes: post.likes,
            comments: post.comments,
            time: "방금 전",
        }));
    }, []);

    const toggleLike = (postId: number) => {
        setLikedPosts((prev) => ({
            ...prev,
            [postId]: !prev[postId],
        }));
        setAnimatingHearts((prev) => ({ ...prev, [postId]: true }));
        setTimeout(() => {
            setAnimatingHearts((prev) => ({ ...prev, [postId]: false }));
        }, 400);
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
        fetchPublicMemorialPosts();
    }, [fetchPublicMemorialPosts]);

    // 입양 타일 아이템
    const adoptionTileItems = useMemo<LightboxItem[]>(() => {
        return bestPosts.adoption
            .map((pet, index) => {
                const src = safeStringSrc(
                    (adoptionImages as unknown[] | undefined)?.[index],
                );
                if (!src) return null;
                return {
                    title: pet.title,
                    subtitle: `${pet.location} · ${pet.age}`,
                    meta: pet.badge,
                    src,
                };
            })
            .filter(Boolean) as LightboxItem[];
    }, [adoptionImages]);

    // 추모 타일 아이템
    const memorialTileItems = useMemo<LightboxItem[]>(() => {
        return memorialCards
            .map((m) => {
                const src = safeStringSrc(
                    (petImages as Record<string, unknown>)[m.name],
                );
                if (!src) return null;
                return {
                    title: m.name,
                    subtitle: `${m.pet} · ${m.years}`,
                    meta: m.message,
                    src,
                };
            })
            .filter(Boolean) as LightboxItem[];
    }, [petImages]);

    // 추모 섹션 표시 데이터
    const displayMemorialData = useMemo(() => {
        if (publicMemorialPosts.length > 0) {
            return publicMemorialPosts.map((post) => ({
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
        }
        return memorialCards.map((m, idx) => ({
            id: `mock-${idx}`,
            name: m.name,
            pet: m.pet,
            years: m.years,
            message: m.message,
            content: "",
            image: (petImages as Record<string, unknown>)[m.name] as string | undefined,
            likesCount: (idx * 13 + 24) % 50 + 15,
            commentsCount: (idx * 7 + 5) % 20 + 3,
            isFromDB: false,
        }));
    }, [publicMemorialPosts, petImages]);

    return {
        // 이미지
        petImages,
        adoptionImages,

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

        // 추모
        isLoadingMemorial,
        displayMemorialData,

        // 타일
        adoptionTileItems,
        memorialTileItems,
    };
}
