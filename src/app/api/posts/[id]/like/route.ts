/**
 * 게시글 좋아요 API
 * POST: 좋아요 토글
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

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = getSupabase();
        const { id: postId } = await params;
        const body = await request.json();
        const { userId } = body;

        if (!userId) {
            return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
        }

        // 이미 좋아요 했는지 확인
        const { data: existing } = await supabase
            .from("post_likes")
            .select("id")
            .eq("post_id", postId)
            .eq("user_id", userId)
            .single();

        let liked: boolean;

        if (existing) {
            // 좋아요 취소
            await supabase
                .from("post_likes")
                .delete()
                .eq("post_id", postId)
                .eq("user_id", userId);

            // 카운트 감소
            await supabase
                .from("community_posts")
                .update({ likes: supabase.rpc("decrement_like", { x: 1 }) })
                .eq("id", postId);

            // 직접 업데이트 (RPC 없을 경우)
            const { data: post } = await supabase
                .from("community_posts")
                .select("likes")
                .eq("id", postId)
                .single();

            if (post) {
                await supabase
                    .from("community_posts")
                    .update({ likes: Math.max(0, (post.likes || 1) - 1) })
                    .eq("id", postId);
            }

            liked = false;
        } else {
            // 좋아요 추가
            await supabase
                .from("post_likes")
                .insert([{ post_id: postId, user_id: userId }]);

            // 카운트 증가
            const { data: post } = await supabase
                .from("community_posts")
                .select("likes")
                .eq("id", postId)
                .single();

            if (post) {
                await supabase
                    .from("community_posts")
                    .update({ likes: (post.likes || 0) + 1 })
                    .eq("id", postId);
            }

            liked = true;
        }

        // 현재 좋아요 수 가져오기
        const { data: updatedPost } = await supabase
            .from("community_posts")
            .select("likes")
            .eq("id", postId)
            .single();

        return NextResponse.json({
            liked,
            likes: updatedPost?.likes || 0,
        });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
