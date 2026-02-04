/**
 * 커뮤니티 게시글 API
 * GET: 게시글 목록 조회
 * POST: 게시글 작성
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Supabase 환경변수 없음");
    return createClient(url, key);
}

// 게시글 목록 조회
export async function GET(request: NextRequest) {
    try {
        const supabase = getSupabase();
        const { searchParams } = new URL(request.url);

        const boardType = searchParams.get("board") || "free";
        const animalType = searchParams.get("animal");
        const sortBy = searchParams.get("sort") || "latest";
        const search = searchParams.get("search");
        const limit = parseInt(searchParams.get("limit") || "20");
        const offset = parseInt(searchParams.get("offset") || "0");

        let query = supabase
            .from("community_posts")
            .select("*, post_comments(count)", { count: "exact" })
            .eq("board_type", boardType);

        // 동물 종류 필터
        if (animalType && animalType !== "all") {
            query = query.eq("animal_type", animalType);
        }

        // 검색어 필터
        if (search) {
            query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
        }

        // 정렬
        if (sortBy === "popular") {
            query = query.order("likes", { ascending: false });
        } else if (sortBy === "comments") {
            query = query.order("created_at", { ascending: false }); // TODO: 댓글 수 정렬
        } else {
            query = query.order("created_at", { ascending: false });
        }

        // 페이지네이션
        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // 댓글 수 계산
        const posts = (data || []).map(post => ({
            id: post.id,
            userId: post.user_id,
            boardType: post.board_type,
            animalType: post.animal_type,
            badge: post.badge,
            title: post.title,
            content: post.content,
            authorName: post.author_name,
            likes: post.likes,
            views: post.views,
            comments: post.post_comments?.[0]?.count || 0,
            createdAt: post.created_at,
        }));

        return NextResponse.json({ posts, total: count });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

// 게시글 작성
export async function POST(request: NextRequest) {
    try {
        const supabase = getSupabase();
        const body = await request.json();

        const { userId, boardType, animalType, badge, title, content, authorName } = body;

        if (!userId || !boardType || !badge || !title || !content || !authorName) {
            return NextResponse.json({ error: "필수 필드 누락" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("community_posts")
            .insert([{
                user_id: userId,
                board_type: boardType,
                animal_type: animalType || null,
                badge,
                title,
                content,
                author_name: authorName,
            }])
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ post: data });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
