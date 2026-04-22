/**
 * 해시태그 API
 * GET /api/hashtags?type=trending — 인기 해시태그 (최근 100개 게시글에서 추출)
 * GET /api/hashtags?tag=골든리트리버 — 특정 태그가 포함된 게시글 목록
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { extractHashtags, aggregateHashtags } from "@/lib/hashtag";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get("type");
        const tag = searchParams.get("tag");
        const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
        const offset = parseInt(searchParams.get("offset") || "0");

        const supabase = await createServerSupabase();

        // 인기 해시태그
        if (type === "trending") {
            const { data: recentPosts } = await supabase
                .from("community_posts")
                .select("content, title")
                .eq("is_hidden", false)
                .order("created_at", { ascending: false })
                .limit(200);

            if (!recentPosts) {
                return NextResponse.json({ tags: [] });
            }

            const contents = recentPosts.map((p) =>
                `${p.title || ""} ${p.content || ""}`
            );
            const trending = aggregateHashtags(contents, limit);

            return NextResponse.json({ tags: trending });
        }

        // 태그별 게시글 검색
        if (tag) {
            const searchTag = tag.toLowerCase().replace(/^#/, "");
            if (searchTag.length < 2) {
                return NextResponse.json({ error: "태그는 2자 이상" }, { status: 400 });
            }

            // content 또는 title에 #태그 포함된 게시글 검색
            const { data: posts, count } = await supabase
                .from("community_posts")
                .select("id, user_id, board_type, animal_type, badge, title, content, author_name, image_urls, likes, dislikes, comments, created_at, is_hidden", { count: "exact" })
                .eq("is_hidden", false)
                .or(`content.ilike.%#${searchTag}%,title.ilike.%#${searchTag}%`)
                .order("created_at", { ascending: false })
                .range(offset, offset + limit - 1);

            const mapped = (posts || []).map((p) => ({
                id: p.id,
                userId: p.user_id,
                subcategory: p.board_type,
                tag: p.animal_type,
                badge: p.badge || "",
                title: p.title,
                content: p.content,
                authorName: p.author_name,
                imageUrls: p.image_urls || [],
                likes: p.likes || 0,
                dislikes: p.dislikes || 0,
                comments: p.comments || 0,
                createdAt: p.created_at,
                // 본문에서 해시태그 추출
                hashtags: extractHashtags(`${p.title || ""} ${p.content || ""}`),
            }));

            return NextResponse.json({
                tag: searchTag,
                posts: mapped,
                total: count || 0,
            });
        }

        return NextResponse.json({ error: "type=trending 또는 tag=태그명 필수" }, { status: 400 });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
