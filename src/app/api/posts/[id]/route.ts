/**
 * 개별 게시글 API
 * GET: 게시글 상세 조회 (조회수 증가)
 * PATCH: 게시글 수정
 * DELETE: 게시글 삭제
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

// 게시글 상세 조회
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = getSupabase();
        const { id } = await params;

        // 조회수 증가 (직접 업데이트)
        const { data: currentPost } = await supabase
            .from("community_posts")
            .select("views")
            .eq("id", id)
            .single();

        if (currentPost) {
            await supabase
                .from("community_posts")
                .update({ views: (currentPost.views || 0) + 1 })
                .eq("id", id);
        }

        // 게시글 조회
        const { data: post, error } = await supabase
            .from("community_posts")
            .select("*")
            .eq("id", id)
            .single();

        if (error) {
            return NextResponse.json({ error: "게시글을 찾을 수 없습니다" }, { status: 404 });
        }

        // 댓글 조회
        const { data: comments } = await supabase
            .from("post_comments")
            .select("*")
            .eq("post_id", id)
            .order("created_at", { ascending: true });

        return NextResponse.json({
            post: {
                ...post,
                comments: comments || [],
            },
        });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

// 게시글 수정
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = getSupabase();
        const { id } = await params;
        const body = await request.json();

        const { title, content, badge, userId } = body;

        // 본인 글인지 확인
        const { data: existing } = await supabase
            .from("community_posts")
            .select("user_id")
            .eq("id", id)
            .single();

        if (!existing || existing.user_id !== userId) {
            return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
        }

        const updateData: Record<string, string> = { updated_at: new Date().toISOString() };
        if (title) updateData.title = title;
        if (content) updateData.content = content;
        if (badge) updateData.badge = badge;

        const { data, error } = await supabase
            .from("community_posts")
            .update(updateData)
            .eq("id", id)
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

// 게시글 삭제
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = getSupabase();
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");

        if (!userId) {
            return NextResponse.json({ error: "인증 필요" }, { status: 401 });
        }

        // 본인 글인지 확인
        const { data: existing } = await supabase
            .from("community_posts")
            .select("user_id")
            .eq("id", id)
            .single();

        if (!existing || existing.user_id !== userId) {
            return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
        }

        const { error } = await supabase
            .from("community_posts")
            .delete()
            .eq("id", id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
