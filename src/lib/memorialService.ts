/**
 * 추모 게시글 서비스
 * 추모 게시글 CRUD 및 상호작용 (좋아요, 댓글)
 */

import { supabase } from "./supabase";

// 타입 정의
export interface MemorialPost {
    id: string;
    userId: string;
    petId: string;
    title: string;
    content: string;
    petName: string;
    petType: string;
    petBreed?: string;
    petYears?: string;
    petImage?: string;
    isPublic: boolean;
    likesCount: number;
    commentsCount: number;
    createdAt: string;
    updatedAt: string;
    // 조회 시 추가 정보
    isLiked?: boolean;
    authorNickname?: string;
}

export interface MemorialComment {
    id: string;
    postId: string;
    userId: string;
    content: string;
    createdAt: string;
    authorNickname?: string;
}

export interface CreateMemorialPostData {
    petId: string;
    title: string;
    content: string;
    petName: string;
    petType: string;
    petBreed?: string;
    petYears?: string;
    petImage?: string;
    isPublic?: boolean;
}

// DB 응답을 MemorialPost 타입으로 변환
function mapPost(row: Record<string, unknown>): MemorialPost {
    return {
        id: row.id as string,
        userId: row.user_id as string,
        petId: row.pet_id as string,
        title: row.title as string,
        content: row.content as string,
        petName: row.pet_name as string,
        petType: row.pet_type as string,
        petBreed: row.pet_breed as string | undefined,
        petYears: row.pet_years as string | undefined,
        petImage: row.pet_image as string | undefined,
        isPublic: row.is_public as boolean,
        likesCount: row.likes_count as number,
        commentsCount: row.comments_count as number,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
    };
}

/**
 * 공개 추모 게시글 목록 조회 (홈페이지용)
 */
export async function getPublicMemorialPosts(limit = 10): Promise<MemorialPost[]> {
    const { data, error } = await supabase
        .from("memorial_posts")
        .select("*")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) {
        return [];
    }

    return (data || []).map(mapPost);
}

/**
 * 내 추모 게시글 목록 조회
 */
export async function getMyMemorialPosts(userId: string): Promise<MemorialPost[]> {
    const { data, error } = await supabase
        .from("memorial_posts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (error) {
        return [];
    }

    return (data || []).map(mapPost);
}

/**
 * 특정 펫의 추모 게시글 조회
 */
export async function getPetMemorialPosts(petId: string): Promise<MemorialPost[]> {
    const { data, error } = await supabase
        .from("memorial_posts")
        .select("*")
        .eq("pet_id", petId)
        .order("created_at", { ascending: false });

    if (error) {
        return [];
    }

    return (data || []).map(mapPost);
}

/**
 * 추모 게시글 상세 조회
 */
export async function getMemorialPost(postId: string): Promise<MemorialPost | null> {
    const { data, error } = await supabase
        .from("memorial_posts")
        .select("*")
        .eq("id", postId)
        .single();

    if (error) {
        return null;
    }

    return mapPost(data);
}

/**
 * 추모 게시글 작성
 */
export async function createMemorialPost(
    userId: string,
    data: CreateMemorialPostData
): Promise<MemorialPost | null> {
    const { data: post, error } = await supabase
        .from("memorial_posts")
        .insert([
            {
                user_id: userId,
                pet_id: data.petId,
                title: data.title,
                content: data.content,
                pet_name: data.petName,
                pet_type: data.petType,
                pet_breed: data.petBreed || null,
                pet_years: data.petYears || null,
                pet_image: data.petImage || null,
                is_public: data.isPublic ?? true,
            },
        ])
        .select()
        .single();

    if (error) {
        return null;
    }

    return mapPost(post);
}

/**
 * 추모 게시글 수정
 */
export async function updateMemorialPost(
    postId: string,
    data: Partial<Pick<MemorialPost, "title" | "content" | "isPublic">>
): Promise<boolean> {
    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.isPublic !== undefined) updateData.is_public = data.isPublic;
    updateData.updated_at = new Date().toISOString();

    const { error } = await supabase
        .from("memorial_posts")
        .update(updateData)
        .eq("id", postId);

    if (error) {
        return false;
    }

    return true;
}

/**
 * 추모 게시글 삭제
 */
export async function deleteMemorialPost(postId: string): Promise<boolean> {
    const { error } = await supabase
        .from("memorial_posts")
        .delete()
        .eq("id", postId);

    if (error) {
        return false;
    }

    return true;
}

/**
 * 좋아요 토글
 */
export async function toggleMemorialLike(
    postId: string,
    userId: string
): Promise<{ liked: boolean; likesCount: number } | null> {
    // 기존 좋아요 확인
    const { data: existing } = await supabase
        .from("memorial_likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", userId)
        .single();

    if (existing) {
        // 좋아요 취소
        const { error } = await supabase
            .from("memorial_likes")
            .delete()
            .eq("id", existing.id);

        if (error) {
            return null;
        }

        // 업데이트된 카운트 조회
        const { data: post } = await supabase
            .from("memorial_posts")
            .select("likes_count")
            .eq("id", postId)
            .single();

        return { liked: false, likesCount: post?.likes_count || 0 };
    } else {
        // 좋아요 추가
        const { error } = await supabase.from("memorial_likes").insert([
            {
                post_id: postId,
                user_id: userId,
            },
        ]);

        if (error) {
            return null;
        }

        // 업데이트된 카운트 조회
        const { data: post } = await supabase
            .from("memorial_posts")
            .select("likes_count")
            .eq("id", postId)
            .single();

        return { liked: true, likesCount: post?.likes_count || 0 };
    }
}

/**
 * 좋아요 여부 확인
 */
export async function checkMemorialLike(postId: string, userId: string): Promise<boolean> {
    const { data } = await supabase
        .from("memorial_likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", userId)
        .single();

    return !!data;
}

/**
 * 댓글 목록 조회
 */
export async function getMemorialComments(postId: string): Promise<MemorialComment[]> {
    const { data, error } = await supabase
        .from("memorial_comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

    if (error) {
        return [];
    }

    return (data || []).map((row) => ({
        id: row.id,
        postId: row.post_id,
        userId: row.user_id,
        content: row.content,
        createdAt: row.created_at,
    }));
}

/**
 * 댓글 작성
 */
export async function createMemorialComment(
    postId: string,
    userId: string,
    content: string
): Promise<MemorialComment | null> {
    const { data, error } = await supabase
        .from("memorial_comments")
        .insert([
            {
                post_id: postId,
                user_id: userId,
                content,
            },
        ])
        .select()
        .single();

    if (error) {
        return null;
    }

    return {
        id: data.id,
        postId: data.post_id,
        userId: data.user_id,
        content: data.content,
        createdAt: data.created_at,
    };
}

/**
 * 댓글 삭제
 */
export async function deleteMemorialComment(commentId: string): Promise<boolean> {
    const { error } = await supabase
        .from("memorial_comments")
        .delete()
        .eq("id", commentId);

    if (error) {
        return false;
    }

    return true;
}
